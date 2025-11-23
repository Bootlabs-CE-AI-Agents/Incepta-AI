"""
Worker monitoring service.

Integrates with Celery inspect API, Kubernetes, and Prometheus for comprehensive
worker health monitoring, log retrieval, metrics tracking, and restart operations.

Story: nextjs-story-17-workers-api-backend
"""

from typing import List, Optional
from datetime import datetime

from celery import Celery  # type: ignore[import-untyped]
from kubernetes import client, config  # type: ignore[import-untyped]
from kubernetes.client.rest import ApiException  # type: ignore[import-untyped]

from src.config import settings
from src.schemas.worker import (
    WorkerStatus,
    WorkerStatusEnum,
    LogEntryDTO,
    WorkerMetricsDTO,
    CurrentMetricsDTO,
)
from src.services.worker_metrics_helper import (
    parse_worker_logs,
    fetch_prometheus_current_metrics,
    fetch_prometheus_throughput_history,
)
from src.utils.logger import logger


class WorkerService:
    """
    Service for managing and monitoring Celery workers.

    Provides methods for:
    - Listing workers with status and basic metrics (AC-1)
    - Fetching worker logs from Kubernetes pods (AC-2)
    - Restarting workers via Kubernetes API (AC-3)
    - Fetching detailed metrics from Prometheus (AC-4)
    """

    def __init__(self) -> None:
        """Initialize service with Celery, Kubernetes, and Prometheus clients."""
        self.celery_app = self._init_celery()
        self.k8s_core_api, self.k8s_apps_api = self._init_kubernetes()
        self.prometheus_url = settings.prometheus_url
        self.k8s_namespace = settings.kubernetes_namespace

    def _init_celery(self) -> Optional[Celery]:
        """Initialize Celery app connection."""
        try:
            broker_url = settings.celery_broker_url
            return Celery("worker_service", broker=broker_url)
        except Exception as e:
            logger.error(f"Failed to initialize Celery app: {e}")
            return None

    def _init_kubernetes(self) -> tuple[Optional[client.CoreV1Api], Optional[client.AppsV1Api]]:
        """Initialize Kubernetes API clients."""
        try:
            if settings.kubernetes_in_cluster:
                config.load_incluster_config()
            else:
                config.load_kube_config()

            return client.CoreV1Api(), client.AppsV1Api()
        except Exception as e:
            logger.error(f"Failed to initialize K8s API: {e}")
            return None, None

    async def get_workers_status(self) -> List[WorkerStatus]:
        """
        Get status of all workers with metrics (AC-1).

        Returns:
            List of WorkerStatus DTOs with hostname, status, tasks, uptime, and metrics

        Raises:
            Exception: If Celery inspect fails (handled in API layer → 503)
        """
        if not self.celery_app:
            raise Exception("Celery unavailable")

        try:
            inspector = self.celery_app.control.inspect()

            # Fetch worker stats (AC-1: active, stats, ping)
            active_tasks_map = inspector.active() or {}
            stats_map = inspector.stats() or {}
            ping_map = inspector.ping() or {}

            workers = []
            all_hosts = set(active_tasks_map.keys()) | set(stats_map.keys()) | set(ping_map.keys())

            for hostname in all_hosts:
                worker_stats = stats_map.get(hostname, {})
                active_tasks = active_tasks_map.get(hostname, [])
                is_alive = ping_map.get(hostname) is not None

                # Determine status (AC-1 spec)
                if is_alive and len(active_tasks) > 0:
                    status = WorkerStatusEnum.ACTIVE
                elif is_alive:
                    status = WorkerStatusEnum.IDLE
                else:
                    status = WorkerStatusEnum.UNRESPONSIVE

                # Fetch metrics from Prometheus (AC-1: CPU, memory, throughput)
                try:
                    metrics = await fetch_prometheus_current_metrics(
                        self.prometheus_url, hostname, detailed=False
                    )
                except Exception as e:
                    logger.warning(f"Prometheus metrics unavailable for {hostname}: {e}")
                    metrics = {
                        "cpu_percent": 0.0,
                        "memory_percent": 0.0,
                        "throughput_per_minute": 0.0,
                    }

                workers.append(
                    WorkerStatus(
                        hostname=hostname,
                        status=status,
                        uptime_seconds=int(worker_stats.get("uptime", 0)),
                        active_tasks=len(active_tasks),
                        completed_tasks=worker_stats.get("total", {}).get("celery", 0),
                        cpu_percent=metrics["cpu_percent"],
                        memory_percent=metrics["memory_percent"],
                        throughput_per_minute=metrics["throughput_per_minute"],
                    )
                )

            return workers

        except Exception as e:
            logger.error(f"Error fetching worker status: {e}")
            raise

    async def get_worker_logs(
        self,
        hostname: str,
        lines: int = 100,
        since: Optional[datetime] = None,
    ) -> List[LogEntryDTO]:
        """
        Fetch logs from Kubernetes pod (AC-2).

        Args:
            hostname: Worker hostname (Celery format: celery@pod-name)
            lines: Number of log lines to fetch (max 1000)
            since: Optional timestamp filter

        Returns:
            List of structured log entries with timestamp, level, message, task_id

        Raises:
            ValueError: If worker pod not found (handled in API layer → 404)
            Exception: If K8s API fails (handled in API layer → 503)
        """
        if not self.k8s_core_api:
            raise Exception("Kubernetes API unavailable")

        try:
            # Extract pod name from Celery hostname (format: celery@pod-name)
            pod_name = hostname.split("@")[-1] if "@" in hostname else hostname

            # Fetch pod logs via K8s API
            logs_raw = self.k8s_core_api.read_namespaced_pod_log(
                name=pod_name,
                namespace=self.k8s_namespace,
                tail_lines=lines,
                timestamps=True,
            )

            # Parse logs into structured format (AC-2: LogEntryDTO)
            return parse_worker_logs(logs_raw, since)

        except ApiException as e:
            if e.status == 404:
                raise ValueError(f"Worker {hostname} not found")
            logger.error(f"K8s API error fetching logs for {hostname}: {e}")
            raise Exception("Kubernetes API error")
        except Exception as e:
            logger.error(f"Error fetching logs for {hostname}: {e}")
            raise

    async def restart_worker(self, hostname: str) -> dict[str, str]:
        """
        Restart worker pod via Kubernetes rollout restart (AC-3).

        Note: This triggers a rolling restart of the worker deployment,
        not a direct pod deletion. Safer for production.

        Args:
            hostname: Worker hostname

        Returns:
            Dict with restart_initiated_at timestamp

        Raises:
            Exception: If K8s API fails
        """
        if not self.k8s_apps_api:
            raise Exception("Kubernetes API unavailable")

        try:
            deployment_name = "ai-agents-worker"  # AC-3 spec
            now = datetime.utcnow()

            # Trigger rollout restart by patching deployment annotation (AC-3)
            body = {
                "spec": {
                    "template": {
                        "metadata": {
                            "annotations": {"kubectl.kubernetes.io/restartedAt": now.isoformat()}
                        }
                    }
                }
            }

            self.k8s_apps_api.patch_namespaced_deployment(
                name=deployment_name,
                namespace=self.k8s_namespace,
                body=body,
            )

            return {"restart_initiated_at": now.isoformat()}

        except Exception as e:
            logger.error(f"Error restarting worker {hostname}: {e}")
            raise

    async def get_worker_metrics(self, hostname: str) -> WorkerMetricsDTO:
        """
        Fetch detailed metrics from Prometheus + Celery (AC-4).

        Args:
            hostname: Worker hostname

        Returns:
            WorkerMetricsDTO with current metrics, 7-day throughput history, metadata

        Raises:
            ValueError: If worker not found
            Exception: If Prometheus unavailable (graceful degradation in API layer)
        """
        # Fetch current metrics from Prometheus (AC-4: detailed = network I/O included)
        current_metrics_dict = await fetch_prometheus_current_metrics(
            self.prometheus_url, hostname, detailed=True
        )
        current = CurrentMetricsDTO(**current_metrics_dict)

        # Fetch 7-day throughput history (AC-4: hourly granularity)
        history = await fetch_prometheus_throughput_history(self.prometheus_url, hostname)

        # Fetch metadata from Celery inspect (AC-4: versions, uptime)
        try:
            if not self.celery_app:
                raise ValueError(f"Worker {hostname} not found - Celery unavailable")

            inspector = self.celery_app.control.inspect()
            stats = inspector.stats() or {}
            worker_stats = stats.get(hostname, {})

            if not worker_stats:
                raise ValueError(f"Worker {hostname} not found")

            celery_version = worker_stats.get("software_sys_version", "unknown")
            python_version = worker_stats.get("software_version", "unknown")
            uptime_seconds = int(worker_stats.get("uptime", 0))

        except Exception as e:
            logger.warning(f"Celery metadata unavailable for {hostname}: {e}")
            celery_version = "unknown"
            python_version = "unknown"
            uptime_seconds = 0

        return WorkerMetricsDTO(
            hostname=hostname,
            current_metrics=current,
            throughput_history=history,
            uptime_seconds=uptime_seconds,
            celery_version=celery_version,
            python_version=python_version,
        )


# Singleton instance for dependency injection
_worker_service = None


def get_worker_service() -> WorkerService:
    """Dependency injection factory for WorkerService."""
    global _worker_service
    if _worker_service is None:
        _worker_service = WorkerService()
    return _worker_service

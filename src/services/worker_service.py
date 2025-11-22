from typing import List, Dict, Any, Optional
import os
from datetime import datetime
import logging

# Try to import celery, handle if not installed (though it should be)
try:
    from celery import Celery
    from celery.app.control import Inspect
except ImportError:
    Celery = None
    Inspect = None

# Try to import kubernetes, handle if not installed
try:
    from kubernetes import client, config
except ImportError:
    client = None
    config = None

from src.utils.logger import logger

class WorkerService:
    """
    Service for managing and monitoring Celery workers.
    Interacts with Celery Control API and Kubernetes API.
    """

    def __init__(self):
        self.celery_app = self._get_celery_app()
        self.k8s_api = self._get_k8s_api()

    def _get_celery_app(self) -> Optional[Celery]:
        """Initialize Celery app connection."""
        try:
            # Assuming standard env vars or config
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            return Celery("worker_service", broker=redis_url)
        except Exception as e:
            logger.error(f"Failed to initialize Celery app: {e}")
            return None

    def _get_k8s_api(self) -> Optional[Any]:
        """Initialize Kubernetes API client."""
        try:
            if os.getenv("KUBERNETES_SERVICE_HOST"):
                config.load_incluster_config()
            else:
                # Fallback for local dev - might need kubeconfig
                try:
                    config.load_kube_config()
                except Exception:
                    logger.warning("Could not load kube config, K8s features disabled")
                    return None
            return client.CoreV1Api()
        except Exception as e:
            logger.error(f"Failed to initialize K8s API: {e}")
            return None

    async def get_workers_status(self) -> List[Dict[str, Any]]:
        """
        Get status of all workers from Celery Control API.
        """
        if not self.celery_app:
            return []

        try:
            inspector = self.celery_app.control.inspect()
            
            # Fetch various stats
            active = inspector.active() or {}
            stats = inspector.stats() or {}
            ping = inspector.ping() or {}

            workers = []
            all_hosts = set(active.keys()) | set(stats.keys()) | set(ping.keys())

            for host in all_hosts:
                worker_stats = stats.get(host, {})
                worker_active = active.get(host, [])
                is_alive = ping.get(host) is not None

                workers.append({
                    "hostname": host,
                    "status": "active" if is_alive else "unresponsive",
                    "active_tasks_count": len(worker_active),
                    "completed_tasks_count": worker_stats.get("total", {}).get("celery", 0),
                    "concurrency": worker_stats.get("pool", {}).get("max-concurrency", 0),
                    "uptime": worker_stats.get("uptime", 0),
                    # Mocking CPU/Mem for now as Celery doesn't provide this directly without extra libs
                    # In a real K8s setup, we'd query metrics-server here
                    "cpu_usage_percent": 0.0, 
                    "memory_usage_percent": 0.0,
                })
            
            return workers

        except Exception as e:
            logger.error(f"Error fetching worker status: {e}")
            return []

    async def get_worker_logs(self, hostname: str, lines: int = 100) -> List[str]:
        """
        Get logs for a specific worker pod from Kubernetes.
        Note: Hostname in Celery usually contains the pod name in K8s.
        """
        if not self.k8s_api:
            return ["Kubernetes API not available"]

        try:
            # Extract pod name from celery hostname (usually user@pod-name)
            pod_name = hostname.split("@")[-1] if "@" in hostname else hostname
            namespace = os.getenv("K8S_NAMESPACE", "default")

            logs = self.k8s_api.read_namespaced_pod_log(
                name=pod_name,
                namespace=namespace,
                tail_lines=lines
            )
            return logs.split("\n")
        except Exception as e:
            logger.error(f"Error fetching logs for {hostname}: {e}")
            return [f"Failed to fetch logs: {str(e)}"]

    async def restart_worker(self, hostname: str) -> bool:
        """
        Restart a worker by deleting its pod (K8s will recreate it).
        """
        if not self.k8s_api:
            return False

        try:
            pod_name = hostname.split("@")[-1] if "@" in hostname else hostname
            namespace = os.getenv("K8S_NAMESPACE", "default")

            self.k8s_api.delete_namespaced_pod(
                name=pod_name,
                namespace=namespace
            )
            return True
        except Exception as e:
            logger.error(f"Error restarting worker {hostname}: {e}")
            return False

# Singleton instance
worker_service = WorkerService()
def get_worker_service() -> WorkerService:
    return worker_service

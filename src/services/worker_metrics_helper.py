"""
Helper functions for worker metrics and log parsing.

Extracted from worker_service.py to comply with 500-line constraint (C1).

Story: nextjs-story-17-workers-api-backend
"""

from typing import Any, List, Optional
import json
import re
from datetime import datetime, timedelta, timezone

import httpx

from src.schemas.worker import (
    LogEntryDTO,
    CurrentMetricsDTO,
    ThroughputDataPoint,
    CpuMemoryDataPoint,
    WorkerConfigDTO,
)
from src.utils.logger import logger


def parse_worker_logs(raw_logs: str, since: Optional[datetime]) -> List[LogEntryDTO]:
    """
    Parse Docker container logs into structured LogEntryDTO format (AC-2).

    Docker logs (native format) contain application-generated timestamps from Loguru/Celery:
    - Loguru format: "2025-11-23 12:02:33.573 | INFO | src.module:function:123 - Message"
    - Celery format: "[2025-11-23 12:02:33,573: INFO/Worker] Message"

    Industry best practice: Do NOT use --timestamps flag when app already logs with timestamps.

    Args:
        raw_logs: Raw log string from Docker container
        since: Optional timestamp filter

    Returns:
        List of structured log entries
    """
    logs = []
    log_lines = raw_logs.strip().split("\n")

    # Regex patterns for application log formats
    # Loguru format: "2025-11-23 12:02:33.573 | INFO | ..."
    loguru_regex = r"^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+)\s+\|\s+(\w+)\s+\|\s+(.*)$"
    # Celery format: "[2025-11-23 12:02:33,573: INFO/Worker] ..."
    celery_regex = r"^\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}),\d+:\s+(\w+)\/\w+\]\s+(.*)$"

    for line in log_lines:
        if not line.strip():
            continue

        # Try Loguru format first (most common)
        loguru_match = re.match(loguru_regex, line)
        if loguru_match:
            timestamp_str, level, message = loguru_match.groups()
            timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S.%f").replace(tzinfo=timezone.utc)

            # Filter by since parameter
            if since and timestamp < since:
                continue

            # Extract task_id if present
            task_id_match = re.search(r"task_id=([a-f0-9\-]+)", message, re.IGNORECASE)

            logs.append(
                LogEntryDTO(
                    timestamp=timestamp,
                    level=level.upper(),
                    message=message.strip(),
                    task_id=task_id_match.group(1) if task_id_match else None,
                )
            )
            continue

        # Try Celery format
        celery_match = re.match(celery_regex, line)
        if celery_match:
            timestamp_str, level, message = celery_match.groups()
            timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)

            # Filter by since parameter
            if since and timestamp < since:
                continue

            # Extract task_id if present
            task_id_match = re.search(r"task_id=([a-f0-9\-]+)", message, re.IGNORECASE)

            logs.append(
                LogEntryDTO(
                    timestamp=timestamp,
                    level=level.upper(),
                    message=message.strip(),
                    task_id=task_id_match.group(1) if task_id_match else None,
                )
            )
            continue

        # Fallback for unrecognized format
        logs.append(
            LogEntryDTO(
                timestamp=datetime.now(timezone.utc),
                level="INFO",
                message=line.strip(),
                task_id=None,
            )
        )

    return logs


async def fetch_prometheus_current_metrics(
    prometheus_url: str,
    hostname: str,
    detailed: bool = False,
) -> dict[str, Any]:
    """
    Fetch current metrics from Prometheus (AC-1, AC-4).

    Args:
        prometheus_url: Prometheus server URL
        hostname: Worker hostname
        detailed: If True, include network metrics (AC-4), else basic (AC-1)

    Returns:
        dict with cpu_percent, memory_percent, throughput_per_minute (basic)
        or CurrentMetricsDTO dict (detailed)
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as http_client:
            # Query Prometheus for CPU
            cpu_query = f'rate(process_cpu_seconds_total{{job="ai-agents-worker",pod=~".*{hostname}.*"}}[5m]) * 100'
            cpu_response = await http_client.get(
                f"{prometheus_url}/api/v1/query",
                params={"query": cpu_query},
            )
            cpu_data = cpu_response.json()
            cpu_percent = (
                float(cpu_data["data"]["result"][0]["value"][1])
                if cpu_data.get("data", {}).get("result")
                else 0.0
            )

            # Query Prometheus for memory
            mem_query = f'process_resident_memory_bytes{{job="ai-agents-worker",pod=~".*{hostname}.*"}} / node_memory_MemTotal_bytes * 100'
            mem_response = await http_client.get(
                f"{prometheus_url}/api/v1/query",
                params={"query": mem_query},
            )
            mem_data = mem_response.json()
            memory_percent = (
                float(mem_data["data"]["result"][0]["value"][1])
                if mem_data.get("data", {}).get("result")
                else 0.0
            )

            if detailed:
                # Network bytes in (AC-4)
                net_in_query = f'process_network_receive_bytes_total{{job="ai-agents-worker",pod=~".*{hostname}.*"}}'
                net_in_response = await http_client.get(
                    f"{prometheus_url}/api/v1/query",
                    params={"query": net_in_query},
                )
                net_in_data = net_in_response.json()
                network_bytes_in = (
                    int(float(net_in_data["data"]["result"][0]["value"][1]))
                    if net_in_data.get("data", {}).get("result")
                    else 0
                )

                # Network bytes out (AC-4)
                net_out_query = f'process_network_transmit_bytes_total{{job="ai-agents-worker",pod=~".*{hostname}.*"}}'
                net_out_response = await http_client.get(
                    f"{prometheus_url}/api/v1/query",
                    params={"query": net_out_query},
                )
                net_out_data = net_out_response.json()
                network_bytes_out = (
                    int(float(net_out_data["data"]["result"][0]["value"][1]))
                    if net_out_data.get("data", {}).get("result")
                    else 0
                )

                return {
                    "cpu_percent": round(cpu_percent, 2),
                    "memory_percent": round(memory_percent, 2),
                    "network_bytes_in": network_bytes_in,
                    "network_bytes_out": network_bytes_out,
                }
            else:
                # Query Prometheus for throughput (AC-1: tasks/min in last 60s)
                throughput_query = f'rate(celery_task_sent_total{{worker="{hostname}"}}[1m]) * 60'
                throughput_response = await http_client.get(
                    f"{prometheus_url}/api/v1/query",
                    params={"query": throughput_query},
                )
                throughput_data = throughput_response.json()
                throughput_per_minute = (
                    float(throughput_data["data"]["result"][0]["value"][1])
                    if throughput_data.get("data", {}).get("result")
                    else 0.0
                )

                return {
                    "cpu_percent": round(cpu_percent, 2),
                    "memory_percent": round(memory_percent, 2),
                    "throughput_per_minute": round(throughput_per_minute, 2),
                }

    except Exception as e:
        logger.warning(f"Prometheus query failed for {hostname}: {e}")
        if detailed:
            return {
                "cpu_percent": 0.0,
                "memory_percent": 0.0,
                "network_bytes_in": 0,
                "network_bytes_out": 0,
            }
        else:
            return {"cpu_percent": 0.0, "memory_percent": 0.0, "throughput_per_minute": 0.0}


async def fetch_prometheus_throughput_history(
    prometheus_url: str,
    hostname: str,
) -> List[ThroughputDataPoint]:
    """
    Fetch 7-day hourly throughput history from Prometheus (AC-4).

    Uses /api/v1/query_range with 1-hour step.

    Args:
        prometheus_url: Prometheus server URL
        hostname: Worker hostname

    Returns:
        List of ThroughputDataPoint with timestamp and tasks_completed
    """
    try:
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=7)

        query = f'increase(celery_task_sent_total{{worker="{hostname}"}}[1h])'

        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.get(
                f"{prometheus_url}/api/v1/query_range",
                params={
                    "query": query,
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                    "step": "1h",
                },
            )
            data = response.json()

            if data.get("status") != "success" or not data.get("data", {}).get("result"):
                logger.warning(f"No throughput history for {hostname}")
                return []

            # Parse result into ThroughputDataPoint list (AC-4)
            result = data["data"]["result"][0]["values"]
            history = []

            for timestamp, value in result:
                history.append(
                    ThroughputDataPoint(
                        timestamp=datetime.fromtimestamp(timestamp, tz=timezone.utc),
                        tasks_completed=int(float(value)),
                        avg_task_duration_seconds=0.0,  # TODO: Add duration metric if available
                    )
                )

            return history

    except Exception as e:
        logger.warning(f"Throughput history fetch failed for {hostname}: {e}")
        return []  # Graceful degradation (AC-4, C10)


async def fetch_prometheus_cpu_history(
    prometheus_url: str,
    hostname: str,
) -> List[CpuMemoryDataPoint]:
    """
    Fetch 7-day hourly CPU% history from Prometheus (Story 21 AC-2, AC-5).

    Uses /api/v1/query_range with 1-hour step for dual-axis chart.

    Args:
        prometheus_url: Prometheus server URL
        hostname: Worker hostname

    Returns:
        List of CpuMemoryDataPoint with timestamp and CPU percent
    """
    try:
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=7)

        # Rate of CPU seconds over 5m window, converted to percentage
        query = f'rate(process_cpu_seconds_total{{job="ai-agents-worker",pod=~".*{hostname}.*"}}[5m]) * 100'

        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.get(
                f"{prometheus_url}/api/v1/query_range",
                params={
                    "query": query,
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                    "step": "1h",  # Hourly granularity for 7 days (168 data points)
                },
            )
            data = response.json()

            if data.get("status") != "success" or not data.get("data", {}).get("result"):
                logger.warning(f"No CPU history for {hostname}")
                return []

            # Parse result into CpuMemoryDataPoint list
            result = data["data"]["result"][0]["values"]
            history = []

            for timestamp, value in result:
                history.append(
                    CpuMemoryDataPoint(
                        timestamp=datetime.fromtimestamp(timestamp, tz=timezone.utc),
                        percent=round(float(value), 2),  # Round to 2 decimals
                    )
                )

            return history

    except Exception as e:
        logger.warning(f"CPU history fetch failed for {hostname}: {e}")
        return []  # Graceful degradation


async def fetch_prometheus_memory_history(
    prometheus_url: str,
    hostname: str,
) -> List[CpuMemoryDataPoint]:
    """
    Fetch 7-day hourly Memory% history from Prometheus (Story 21 AC-2, AC-5).

    Uses /api/v1/query_range with 1-hour step for dual-axis chart.

    Args:
        prometheus_url: Prometheus server URL
        hostname: Worker hostname

    Returns:
        List of CpuMemoryDataPoint with timestamp and Memory percent
    """
    try:
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=7)

        # Memory usage as percentage of total node memory
        query = f'process_resident_memory_bytes{{job="ai-agents-worker",pod=~".*{hostname}.*"}} / node_memory_MemTotal_bytes * 100'

        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.get(
                f"{prometheus_url}/api/v1/query_range",
                params={
                    "query": query,
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                    "step": "1h",
                },
            )
            data = response.json()

            if data.get("status") != "success" or not data.get("data", {}).get("result"):
                logger.warning(f"No Memory history for {hostname}")
                return []

            # Parse result into CpuMemoryDataPoint list
            result = data["data"]["result"][0]["values"]
            history = []

            for timestamp, value in result:
                history.append(
                    CpuMemoryDataPoint(
                        timestamp=datetime.fromtimestamp(timestamp, tz=timezone.utc),
                        percent=round(float(value), 2),
                    )
                )

            return history

    except Exception as e:
        logger.warning(f"Memory history fetch failed for {hostname}: {e}")
        return []  # Graceful degradation


def extract_worker_config(celery_stats: dict[str, Any]) -> WorkerConfigDTO:
    """
    Extract worker configuration from Celery inspect stats (Story 21 AC-4).

    Args:
        celery_stats: Output from celery.control.inspect().stats() for a worker

    Returns:
        WorkerConfigDTO with OS, Python, Celery versions, queues, concurrency, etc.
    """
    try:
        # Celery stats structure (example):
        # {
        #   "hostname@worker-pod-id": {
        #     "pool": {"max-concurrency": 4, "implementation": "prefork"},
        #     "broker": {"hostname": "redis", ...},
        #     "rusage": {...},
        #     "total": {...},
        #     "clock": "...",
        #     "pid": 123,
        #   }
        # }
        # First key is the worker hostname
        worker_key = list(celery_stats.keys())[0]
        stats = celery_stats[worker_key]

        # Extract pool info
        pool = stats.get("pool", {})
        concurrency = pool.get("max-concurrency", 1)
        pool_type = pool.get("implementation", "prefork")

        # Extract queues from broker (or default to ["celery"])
        # Note: Celery stats don't always include queue names directly.
        # Queues are configured at startup, not runtime-queryable via stats().
        # For now, default to ["default"] or extract from environment if needed.
        queues = ["default"]  # TODO: Get from worker startup config if available

        # Max tasks per child (Celery worker --max-tasks-per-child config)
        # Not available in stats(), typically set via env var CELERYD_MAX_TASKS_PER_CHILD
        max_tasks_per_child = None  # None = unlimited

        # OS name (not in stats, would need platform module or K8s metadata)
        os_name = "Linux"  # Default assumption for Kubernetes workers

        # Python version (available in stats under "python-version" in some Celery versions)
        python_version = "3.11"  # TODO: Extract from stats if available

        # Celery version (available in stats)
        celery_version = stats.get("clock", "5.3")  # Celery version often in "clock" field

        return WorkerConfigDTO(
            os_name=os_name,
            python_version=python_version,
            celery_version=celery_version,
            queues=queues,
            max_tasks_per_child=max_tasks_per_child,
            concurrency=concurrency,
            pool_type=pool_type,
        )

    except Exception as e:
        logger.warning(f"Failed to extract worker config: {e}")
        # Return default config on error
        return WorkerConfigDTO(
            os_name="Unknown",
            python_version="Unknown",
            celery_version="Unknown",
            queues=["default"],
            max_tasks_per_child=None,
            concurrency=1,
            pool_type="prefork",
        )

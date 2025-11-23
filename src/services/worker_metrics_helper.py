"""
Helper functions for worker metrics and log parsing.

Extracted from worker_service.py to comply with 500-line constraint (C1).

Story: nextjs-story-17-workers-api-backend
"""

from typing import Any, List, Optional
import json
import re
from datetime import datetime, timedelta

import httpx

from src.schemas.worker import (
    LogEntryDTO,
    CurrentMetricsDTO,
    ThroughputDataPoint,
)
from src.utils.logger import logger


def parse_worker_logs(raw_logs: str, since: Optional[datetime]) -> List[LogEntryDTO]:
    """
    Parse Kubernetes pod logs into structured LogEntryDTO format (AC-2).

    Kubernetes log format: "2025-11-22T10:30:15.123456Z [INFO] Task completed: task_id=abc123"

    Args:
        raw_logs: Raw log string from K8s API
        since: Optional timestamp filter

    Returns:
        List of structured log entries
    """
    logs = []
    log_lines = raw_logs.strip().split("\n")

    # Regex for K8s timestamped logs with Loguru-style JSON or plaintext
    timestamp_regex = r"^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)$"

    for line in log_lines:
        if not line.strip():
            continue

        match = re.match(timestamp_regex, line)
        if not match:
            # Fallback for non-timestamped logs
            logs.append(
                LogEntryDTO(
                    timestamp=datetime.utcnow(),
                    level="INFO",
                    message=line.strip(),
                    task_id=None,
                )
            )
            continue

        timestamp_str, log_content = match.groups()
        timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))

        # Filter by since parameter
        if since and timestamp < since:
            continue

        # Try parsing JSON logs (Loguru format)
        try:
            log_data = json.loads(log_content)
            logs.append(
                LogEntryDTO(
                    timestamp=timestamp,
                    level=log_data.get("level", "INFO"),
                    message=log_data.get("message", log_content),
                    task_id=log_data.get("task_id"),
                )
            )
        except json.JSONDecodeError:
            # Plaintext log - extract level and task_id if present
            level_match = re.search(r"\[(DEBUG|INFO|WARN|WARNING|ERROR|CRITICAL)\]", log_content)
            task_id_match = re.search(r"task_id=([a-f0-9\-]+)", log_content, re.IGNORECASE)

            logs.append(
                LogEntryDTO(
                    timestamp=timestamp,
                    level=level_match.group(1) if level_match else "INFO",
                    message=log_content.strip(),
                    task_id=task_id_match.group(1) if task_id_match else None,
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
        end = datetime.utcnow()
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
                        timestamp=datetime.utcfromtimestamp(timestamp),
                        tasks_completed=int(float(value)),
                        avg_task_duration_seconds=0.0,  # TODO: Add duration metric if available
                    )
                )

            return history

    except Exception as e:
        logger.warning(f"Throughput history fetch failed for {hostname}: {e}")
        return []  # Graceful degradation (AC-4, C10)

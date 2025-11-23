"""
Unit tests for WorkerService class.

Tests service layer business logic with fully mocked dependencies.

Story: nextjs-story-17-workers-api-backend
Coverage target: ≥80%
"""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.schemas.worker import WorkerStatus
from src.services.worker_service import WorkerService


@pytest.fixture
def worker_service():
    """Create WorkerService instance with mocked dependencies."""
    with patch("src.services.worker_service.Celery"), patch(
        "src.services.worker_service.config.load_incluster_config"
    ), patch("src.services.worker_service.client.CoreV1Api"), patch(
        "src.services.worker_service.client.AppsV1Api"
    ):
        service = WorkerService()
        return service


@pytest.fixture
def mock_celery_stats():
    """Sample Celery worker stats."""
    return {
        "worker1@hostname": {
            "uptime": 7200,
            "total": {"tasks": 250},
            "software_sys_version": "5.3.0",
            "software_version": "3.11.0",
        },
        "worker2@hostname": {
            "uptime": 3600,
            "total": {"tasks": 100},
            "software_sys_version": "5.3.0",
            "software_version": "3.11.0",
        },
    }


@pytest.fixture
def mock_prometheus_response():
    """Sample Prometheus query response."""
    return {"data": {"result": [{"value": [1732356000, "35.2"]}]}}


@pytest.mark.asyncio
async def test_list_workers_all_idle(worker_service, mock_celery_stats):
    """Test listing workers when all are idle (no active tasks)."""
    # Mock Celery inspect
    mock_inspect = MagicMock()
    mock_inspect.stats.return_value = mock_celery_stats
    mock_inspect.active.return_value = {"worker1@hostname": [], "worker2@hostname": []}
    mock_inspect.ping.return_value = {"worker1@hostname": {"ok": "pong"}, "worker2@hostname": {"ok": "pong"}}
    worker_service.celery_app.control.inspect.return_value = mock_inspect

    # Mock Prometheus metrics
    with patch(
        "src.services.worker_metrics_helper.fetch_prometheus_current_metrics",
        return_value={
            "cpu_percent": 15.0,
            "memory_percent": 35.0,
            "throughput_per_minute": 5.0,
        },
    ):
        workers = await worker_service.get_workers_status()

    assert len(workers) == 2
    assert all(w.status == WorkerStatus.IDLE for w in workers)
    assert workers[0].hostname == "worker1@hostname"
    assert workers[0].uptime_seconds == 7200
    assert workers[0].completed_tasks == 250


@pytest.mark.asyncio
async def test_list_workers_with_active_tasks(worker_service, mock_celery_stats):
    """Test listing workers with active tasks."""
    mock_inspect = MagicMock()
    mock_inspect.stats.return_value = mock_celery_stats
    mock_inspect.active.return_value = {
        "worker1@hostname": [{"id": "task1"}, {"id": "task2"}],
        "worker2@hostname": [],
    }
    mock_inspect.ping.return_value = {"worker1@hostname": {"ok": "pong"}, "worker2@hostname": {"ok": "pong"}}
    worker_service.celery_app.control.inspect.return_value = mock_inspect

    with patch(
        "src.services.worker_metrics_helper.fetch_prometheus_current_metrics",
        return_value={
            "cpu_percent": 80.0,
            "memory_percent": 60.0,
            "throughput_per_minute": 12.0,
        },
    ):
        workers = await worker_service.get_workers_status()

    worker1 = next(w for w in workers if w.hostname == "worker1@hostname")
    assert worker1.status == WorkerStatus.ACTIVE
    assert worker1.active_tasks == 2

    worker2 = next(w for w in workers if w.hostname == "worker2@hostname")
    assert worker2.status == WorkerStatus.IDLE
    assert worker2.active_tasks == 0


@pytest.mark.asyncio
async def test_list_workers_celery_unavailable(worker_service):
    """Test listing workers when Celery is unavailable."""
    worker_service.celery_app = None

    with pytest.raises(Exception, match="Celery unavailable"):
        await worker_service.get_workers_status()


@pytest.mark.asyncio
async def test_get_worker_logs_success(worker_service):
    """Test fetching worker logs successfully."""
    # Mock K8s pod listing
    mock_pod = MagicMock()
    mock_pod.metadata.name = "ai-agents-worker-abc123"
    worker_service.k8s_core_api.list_namespaced_pod.return_value.items = [mock_pod]

    # Mock pod logs
    worker_service.k8s_core_api.read_namespaced_pod_log.return_value = (
        '2025-11-23T10:00:00Z INFO Processing task task_id=abc-123\n'
        '2025-11-23T10:00:01Z DEBUG Task data loaded\n'
        '2025-11-23T10:00:02Z ERROR Task failed task_id=abc-123'
    )

    with patch(
        "src.services.worker_service.parse_worker_logs"
    ) as mock_parse:
        mock_parse.return_value = [
            {
                "timestamp": datetime(2025, 11, 23, 10, 0, 0),
                "level": "INFO",
                "message": "Processing task",
                "task_id": "abc-123",
            }
        ]

        logs = await worker_service.get_worker_logs("worker1@hostname", lines=100)

    assert len(logs) >= 1
    assert logs[0]["level"] == "INFO"
    worker_service.k8s_core_api.read_namespaced_pod_log.assert_called_once()


@pytest.mark.asyncio
async def test_get_worker_logs_worker_not_found(worker_service):
    """Test fetching logs for non-existent worker."""
    worker_service.k8s_core_api.list_namespaced_pod.return_value.items = []

    with pytest.raises(ValueError, match="Worker .* not found"):
        await worker_service.get_worker_logs("nonexistent", lines=50)


@pytest.mark.asyncio
async def test_get_worker_logs_with_since_filter(worker_service):
    """Test fetching logs with 'since' timestamp filter."""
    mock_pod = MagicMock()
    mock_pod.metadata.name = "ai-agents-worker-abc123"
    worker_service.k8s_core_api.list_namespaced_pod.return_value.items = [mock_pod]

    worker_service.k8s_core_api.read_namespaced_pod_log.return_value = (
        '2025-11-23T10:00:00Z INFO Old log\n'
        '2025-11-23T11:00:00Z INFO New log'
    )

    since = datetime(2025, 11, 23, 10, 30, 0)

    with patch(
        "src.services.worker_service.parse_worker_logs"
    ) as mock_parse:
        mock_parse.return_value = [
            {
                "timestamp": datetime(2025, 11, 23, 11, 0, 0),
                "level": "INFO",
                "message": "New log",
                "task_id": None,
            }
        ]

        logs = await worker_service.get_worker_logs("worker1", lines=100, since=since)

    assert len(logs) == 1
    assert logs[0]["message"] == "New log"


@pytest.mark.asyncio
async def test_restart_worker_success(worker_service):
    """Test restarting worker successfully."""
    worker_service.k8s_apps_api.patch_namespaced_deployment.return_value = None

    result = await worker_service.restart_worker("worker1@hostname")

    assert "restart_initiated_at" in result
    # Verify timestamp is ISO format string
    datetime.fromisoformat(result["restart_initiated_at"])

    worker_service.k8s_apps_api.patch_namespaced_deployment.assert_called_once()
    call_args = worker_service.k8s_apps_api.patch_namespaced_deployment.call_args
    assert call_args.kwargs["name"] == "ai-agents-worker"
    assert "kubectl.kubernetes.io/restartedAt" in str(call_args.kwargs["body"])


@pytest.mark.asyncio
async def test_restart_worker_k8s_failure(worker_service):
    """Test restart_worker when Kubernetes API fails."""
    worker_service.k8s_apps_api.patch_namespaced_deployment.side_effect = Exception(
        "K8s API error"
    )

    with pytest.raises(Exception, match="K8s API error"):
        await worker_service.restart_worker("worker1")


@pytest.mark.asyncio
async def test_get_worker_metrics_success(worker_service, mock_celery_stats):
    """Test fetching detailed worker metrics."""
    # Mock Celery stats
    mock_inspect = MagicMock()
    mock_inspect.stats.return_value = mock_celery_stats
    worker_service.celery_app.control.inspect.return_value = mock_inspect

    # Mock Prometheus current metrics
    with patch(
        "src.services.worker_service.fetch_prometheus_current_metrics",
        return_value={
            "cpu_percent": 45.0,
            "memory_percent": 55.0,
            "network_bytes_in": 1024000,
            "network_bytes_out": 512000,
        },
    ), patch(
        "src.services.worker_service.fetch_prometheus_throughput_history",
        return_value=[
            {
                "timestamp": datetime(2025, 11, 23, 10, 0, 0),
                "tasks_completed": 50,
                "avg_task_duration_seconds": 2.5,
            }
        ],
    ):
        metrics = await worker_service.get_worker_metrics("worker1@hostname")

    assert metrics.hostname == "worker1@hostname"
    assert metrics.current_metrics["cpu_percent"] == 45.0
    assert metrics.uptime_seconds == 7200
    assert metrics.celery_version == "5.3.0"
    assert len(metrics.throughput_history) == 1


@pytest.mark.asyncio
async def test_get_worker_metrics_worker_not_found(worker_service):
    """Test fetching metrics for non-existent worker."""
    mock_inspect = MagicMock()
    mock_inspect.stats.return_value = {}  # No workers
    worker_service.celery_app.control.inspect.return_value = mock_inspect

    with patch(
        "src.services.worker_service.fetch_prometheus_current_metrics",
        return_value={},
    ), patch(
        "src.services.worker_service.fetch_prometheus_throughput_history",
        return_value=[],
    ):
        with pytest.raises(ValueError, match="Worker .* not found"):
            await worker_service.get_worker_metrics("nonexistent")


@pytest.mark.asyncio
async def test_get_worker_metrics_celery_none(worker_service):
    """Test get_worker_metrics when Celery app is None."""
    worker_service.celery_app = None

    with patch(
        "src.services.worker_service.fetch_prometheus_current_metrics",
        return_value={},
    ), patch(
        "src.services.worker_service.fetch_prometheus_throughput_history",
        return_value=[],
    ):
        with pytest.raises(ValueError, match="Celery unavailable"):
            await worker_service.get_worker_metrics("worker1")


@pytest.mark.asyncio
async def test_get_worker_metrics_prometheus_partial_failure(
    worker_service, mock_celery_stats
):
    """Test graceful degradation when Prometheus partially fails."""
    mock_inspect = MagicMock()
    mock_inspect.stats.return_value = mock_celery_stats
    worker_service.celery_app.control.inspect.return_value = mock_inspect

    # Prometheus current metrics fails, but history succeeds
    with patch(
        "src.services.worker_service.fetch_prometheus_current_metrics",
        side_effect=Exception("Prometheus timeout"),
    ), patch(
        "src.services.worker_service.fetch_prometheus_throughput_history",
        return_value=[],
    ):
        metrics = await worker_service.get_worker_metrics("worker1@hostname")

    # Should still return metrics with Celery data
    assert metrics.hostname == "worker1@hostname"
    assert metrics.uptime_seconds == 7200
    assert metrics.celery_version == "5.3.0"

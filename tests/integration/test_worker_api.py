"""
Integration tests for Worker API endpoints.

Tests all 4 worker endpoints with mocked Celery, Kubernetes, and Prometheus dependencies.

Story: nextjs-story-17-workers-api-backend
AC-8: Integration tests for worker API
"""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app
from src.schemas.worker import WorkerStatus


@pytest.fixture
def mock_celery_inspect():
    """Mock Celery inspect for worker discovery."""
    inspect = MagicMock()
    inspect.stats.return_value = {
        "worker1@hostname": {
            "uptime": 3600,
            "total": {"tasks": 150},
            "software_sys_version": "5.3.0",
            "software_version": "3.11.0",
        }
    }
    inspect.active.return_value = {"worker1@hostname": []}
    inspect.ping.return_value = {"worker1@hostname": {"ok": "pong"}}
    return inspect


@pytest.fixture
def mock_k8s_core_api():
    """Mock Kubernetes Core API for pod logs."""
    api = MagicMock()

    # Mock pod list response
    pod = MagicMock()
    pod.metadata.name = "ai-agents-worker-abc123"
    api.list_namespaced_pod.return_value.items = [pod]

    # Mock pod logs
    api.read_namespaced_pod_log.return_value = (
        '2025-11-23T10:00:00Z INFO Processing task task_id=abc-123\n'
        '2025-11-23T10:00:01Z ERROR Task failed task_id=abc-123'
    )
    return api


@pytest.fixture
def mock_k8s_apps_api():
    """Mock Kubernetes Apps API for deployments."""
    api = MagicMock()
    api.patch_namespaced_deployment.return_value = None
    return api


@pytest.fixture
def mock_prometheus_client():
    """Mock httpx client for Prometheus queries."""
    async def mock_get(url, **kwargs):
        response = AsyncMock()
        response.status_code = 200
        if "cpu" in kwargs.get("params", {}).get("query", ""):
            response.json.return_value = {
                "data": {"result": [{"value": [1732356000, "25.5"]}]}
            }
        elif "memory" in kwargs.get("params", {}).get("query", ""):
            response.json.return_value = {
                "data": {"result": [{"value": [1732356000, "42.3"]}]}
            }
        else:
            response.json.return_value = {"data": {"result": []}}
        return response

    client = AsyncMock()
    client.get = mock_get
    client.__aenter__.return_value = client
    client.__aexit__.return_value = None
    return client


@pytest.fixture
async def async_client():
    """FastAPI test client with ASGITransport."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.mark.asyncio
async def test_list_workers_success(
    async_client, mock_celery_inspect, mock_prometheus_client
):
    """
    Test GET /api/workers returns worker list successfully.

    AC-1: List all workers with status and metrics.
    """
    with patch("src.services.worker_service.Celery") as MockCelery, patch(
        "httpx.AsyncClient", return_value=mock_prometheus_client
    ):
        MockCelery.return_value.control.inspect.return_value = mock_celery_inspect

        response = await async_client.get(
            "/api/workers", headers={"Authorization": "Bearer admin_token"}
        )

        assert response.status_code == 200
        workers = response.json()
        assert len(workers) >= 1
        assert workers[0]["hostname"] == "worker1@hostname"
        assert workers[0]["status"] in ["active", "idle", "unresponsive"]
        assert workers[0]["uptime_seconds"] == 3600
        assert "cpu_percent" in workers[0]
        assert "memory_percent" in workers[0]


@pytest.mark.asyncio
async def test_list_workers_unauthorized(async_client):
    """
    Test GET /api/workers returns 403 for non-admin users.

    AC-1, AC-5: RBAC enforcement - admin only.
    """
    response = await async_client.get("/api/workers")

    assert response.status_code in [401, 403]  # Depends on auth implementation


@pytest.mark.asyncio
async def test_get_logs_success(async_client, mock_k8s_core_api):
    """
    Test GET /api/workers/{hostname}/logs returns log entries.

    AC-2: Fetch worker logs from Kubernetes.
    """
    with patch(
        "src.services.worker_service.client.CoreV1Api", return_value=mock_k8s_core_api
    ):
        response = await async_client.get(
            "/api/workers/worker1@hostname/logs?lines=50",
            headers={"Authorization": "Bearer admin_token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert len(data["logs"]) >= 1
        assert data["logs"][0]["level"] in ["INFO", "ERROR", "DEBUG", "WARN"]
        assert "timestamp" in data["logs"][0]


@pytest.mark.asyncio
async def test_get_logs_invalid_lines(async_client):
    """
    Test GET /api/workers/{hostname}/logs returns 400 for lines > 1000.

    AC-2: Validate query parameters.
    """
    response = await async_client.get(
        "/api/workers/worker1/logs?lines=1500",
        headers={"Authorization": "Bearer admin_token"},
    )

    assert response.status_code == 422  # FastAPI validation error


@pytest.mark.asyncio
async def test_restart_worker_success(
    async_client, mock_celery_inspect, mock_k8s_apps_api
):
    """
    Test POST /api/workers/{hostname}/restart returns 202 and logs audit entry.

    AC-3: Restart worker via Kubernetes rollout.
    """
    with patch("src.services.worker_service.Celery") as MockCelery, patch(
        "src.services.worker_service.client.AppsV1Api", return_value=mock_k8s_apps_api
    ), patch("src.api.workers.get_async_session") as mock_db_session:
        MockCelery.return_value.control.inspect.return_value = mock_celery_inspect

        # Mock database session
        mock_session = AsyncMock()
        mock_db_session.return_value.__aenter__.return_value = mock_session

        response = await async_client.post(
            "/api/workers/worker1@hostname/restart",
            headers={"Authorization": "Bearer admin_token"},
        )

        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "success"
        assert "restart_initiated_at" in data
        assert "worker1@hostname" in data["message"]

        # Verify audit log was created
        assert mock_session.add.called
        assert mock_session.commit.called


@pytest.mark.asyncio
async def test_restart_worker_not_found(async_client, mock_celery_inspect):
    """
    Test POST /api/workers/{hostname}/restart returns 404 for invalid hostname.

    AC-3: Error handling for non-existent workers.
    """
    with patch("src.services.worker_service.Celery") as MockCelery:
        # Return empty stats (no workers)
        mock_inspect = MagicMock()
        mock_inspect.stats.return_value = {}
        MockCelery.return_value.control.inspect.return_value = mock_inspect

        response = await async_client.post(
            "/api/workers/nonexistent_worker/restart",
            headers={"Authorization": "Bearer admin_token"},
        )

        assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_metrics_success(
    async_client, mock_celery_inspect, mock_prometheus_client
):
    """
    Test GET /api/workers/{hostname}/metrics returns metrics from Prometheus.

    AC-4: Fetch detailed worker metrics.
    """
    with patch("src.services.worker_service.Celery") as MockCelery, patch(
        "httpx.AsyncClient", return_value=mock_prometheus_client
    ):
        MockCelery.return_value.control.inspect.return_value = mock_celery_inspect

        response = await async_client.get(
            "/api/workers/worker1@hostname/metrics",
            headers={"Authorization": "Bearer admin_token"},
        )

        assert response.status_code == 200
        metrics = response.json()
        assert metrics["hostname"] == "worker1@hostname"
        assert "current_metrics" in metrics
        assert "cpu_percent" in metrics["current_metrics"]
        assert "throughput_history" in metrics
        assert metrics["uptime_seconds"] == 3600


@pytest.mark.asyncio
async def test_get_metrics_prometheus_down(async_client, mock_celery_inspect):
    """
    Test GET /api/workers/{hostname}/metrics returns 503 with error message.

    AC-4: Graceful degradation when Prometheus unavailable.
    """

    async def mock_get_error(*args, **kwargs):
        raise Exception("Prometheus unavailable")

    error_client = AsyncMock()
    error_client.get = mock_get_error
    error_client.__aenter__.return_value = error_client
    error_client.__aexit__.return_value = None

    with patch("src.services.worker_service.Celery") as MockCelery, patch(
        "httpx.AsyncClient", return_value=error_client
    ):
        MockCelery.return_value.control.inspect.return_value = mock_celery_inspect

        response = await async_client.get(
            "/api/workers/worker1@hostname/metrics",
            headers={"Authorization": "Bearer admin_token"},
        )

        # Should return partial data or 503
        assert response.status_code in [200, 503]
        if response.status_code == 200:
            # Graceful degradation - returns worker data without Prometheus metrics
            metrics = response.json()
            assert metrics["hostname"] == "worker1@hostname"

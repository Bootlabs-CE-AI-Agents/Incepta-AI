"""
Unified Tools API - GET endpoint for unified tool discovery.

Provides a single API endpoint to discover tools from multiple sources
(OpenAPI tools and MCP servers) in a consistent format.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_tenant_db, get_tenant_id
from src.schemas.unified_tool import UnifiedTool
from src.schemas.openapi_tool import TestConnectionRequest, TestConnectionResponse
from src.services.unified_tool_service import UnifiedToolService
from src.services.openapi_parser_service import detect_spec_version, parse_openapi_spec, extract_tool_metadata
from src.services.mcp_tool_generator import validate_openapi_connection

router = APIRouter(prefix="/api/v1", tags=["unified-tools"])
logger = logging.getLogger(__name__)


@router.get("/unified-tools/", response_model=list[UnifiedTool])
async def list_unified_tools(
    tenant_id: Annotated[str, Depends(get_tenant_id)],
    db: Annotated[AsyncSession, Depends(get_tenant_db)],
) -> list[UnifiedTool]:
    """
    List all available tools for a tenant from all sources.

    Queries both OpenAPI tools and MCP servers, transforms them to unified format,
    handles deduplication (OpenAPI tools take precedence), and returns cached
    results when available.

    Args:
        tenant_id: Tenant ID from X-Tenant-ID header (extracted by dependency)
        db: Database session with tenant context (provided by dependency)

    Returns:
        List of UnifiedTool instances from all sources (deduplicated)

    Performance:
        - First call: <500ms (p95) - database queries
        - Cached calls: <10ms (p95) - in-memory cache hit
        - Cache TTL: 60 seconds

    Example:
        GET /api/v1/unified-tools/
        Headers: X-Tenant-ID: test-tenant

        Response:
        [
            {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "get_weather",
                "description": "Get current weather information",
                "source_type": "openapi",
                "mcp_server_id": null,
                "mcp_primitive_type": null,
                "mcp_server_name": null,
                "input_schema": {...},
                "enabled": true
            }
        ]
    """
    logger.info(f"Fetching unified tools for tenant: {tenant_id}")

    # Initialize service and fetch tools
    service = UnifiedToolService(db)
    tools = await service.list_tools(tenant_id)

    logger.info(f"Returning {len(tools)} unified tools for tenant {tenant_id}")
    return tools


@router.post("/tools/test-connection", response_model=TestConnectionResponse)
async def test_connection(
    request: TestConnectionRequest,
    tenant_id: Annotated[str, Depends(get_tenant_id)],
) -> TestConnectionResponse:
    """
    Test API connection with provided credentials.

    Makes an actual HTTP request to the target API using configured auth to validate:
    - Network connectivity
    - API availability
    - Credential validity

    Strategy:
    1. Find first GET endpoint in spec (preferring health/status endpoints)
    2. Make test request with configured auth
    3. Return success/failure with details (status, response time, headers, body)

    Args:
        request: TestConnectionRequest with spec and auth_config
        tenant_id: Tenant ID from X-Tenant-ID header (for audit logging)

    Returns:
        TestConnectionResponse with test results

    Example:
        POST /api/v1/tools/test-connection
        Headers: X-Tenant-ID: test-tenant
        Body:
        {
            "spec": {...},  # OpenAPI spec
            "auth_config": {
                "type": "bearer",
                "bearer_token": "token123"
            }
        }

        Response:
        {
            "success": true,
            "status_code": 200,
            "response_time_ms": 245,
            "headers": {...},
            "body": "...",
            "tested_endpoint": "GET /api/health"
        }
    """
    try:
        logger.info(f"Testing connection for tenant: {tenant_id}")

        # Parse spec to extract base URL
        spec_version = detect_spec_version(request.spec)
        openapi = parse_openapi_spec(request.spec)
        metadata = extract_tool_metadata(openapi, spec_version)
        base_url = metadata.get("base_url", "")

        # Validate connection
        result = await validate_openapi_connection(request.spec, request.auth_config, base_url)

        # Map result to response schema
        response = TestConnectionResponse(
            success=result.get("success", False),
            status_code=result.get("status_code"),
            response_time_ms=result.get("response_time_ms", 0),
            headers=result.get("headers"),
            body=result.get("response_preview"),
            error=result.get("error_message"),
            tested_endpoint=result.get("test_endpoint"),
            error_type=_map_error_type(result.get("error_type", "unknown")),
        )

        logger.info(f"Connection test result for tenant {tenant_id}: success={response.success}")
        return response

    except Exception as e:
        logger.error(f"Connection test failed for tenant {tenant_id}: {str(e)}")
        raise HTTPException(400, str(e))


def _map_error_type(backend_error_type: str) -> str:
    """Map backend error types to frontend error types."""
    error_type_map = {
        "Timeout": "timeout",
        "ConnectError": "network",
        "HTTPStatusError": "server",
        "AuthError": "auth",
        "NoTestEndpoint": "unknown",
    }
    return error_type_map.get(backend_error_type, "unknown")

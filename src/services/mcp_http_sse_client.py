"""
MCP Streamable HTTP Transport Client

This module implements a client for the Model Context Protocol (MCP) using Streamable HTTP transport.
It connects to remote MCP servers via HTTP POST with dual response modes: single JSON or SSE streaming.

Implements MCP Specification 2025-03-26 Streamable HTTP transport.
"""

import asyncio
from typing import Any, Self, cast

import httpx
from loguru import logger

# Reuse exception hierarchy from stdio client
from src.services.mcp_stdio_client import (
    MCPError,
    InitializationError,
    ToolExecutionError,
    InvalidJSONError,
    TimeoutError as MCPTimeoutError,
)

# HTTP-specific exceptions and handlers
from src.services._mcp_http_response_handlers import (
    MCPConnectionError,
    MCPClientError,
    MCPServerError,
    handle_sse_stream,
    handle_json_response,
    post_request,
    redact_sensitive_headers,
    build_mcp_headers,
)


class MCPStreamableHTTPClient:
    """
    MCP Streamable HTTP transport client for remote MCP servers.

    Implements JSON-RPC 2.0 over HTTP POST with dual response modes per MCP Specification 2025-03-26.
    Supports async context manager for automatic cleanup.

    Example usage:
        async with MCPStreamableHTTPClient(url, headers) as client:
            await client.initialize()
            tools = await client.list_tools()
            result = await client.call_tool("tool_name", {"arg": "value"})
    """

    def __init__(self, url: str, headers: dict[str, str] | None = None):
        """
        Initialize MCP Streamable HTTP client.

        Args:
            url: Base URL of MCP server endpoint (e.g., "https://api.example.com/mcp").
            headers: Optional HTTP headers for authentication (e.g., {"Authorization": "Bearer token"}).

        Raises:
            ValueError: If URL is invalid.
        """
        if not url or not url.startswith(("http://", "https://")):
            raise ValueError(f"Invalid URL: {url}")

        self.url = url
        self.headers = headers or {}

        # HTTP client (created in __aenter__)
        self.client: httpx.AsyncClient | None = None
        self._closed = False

        # JSON-RPC state
        self._request_id = 0

        # SSE resumability (per WHATWG SSE spec)
        self.last_event_id: str | None = None
        self._reconnection_time_ms: int = 3000  # Default 3 seconds per spec recommendation

        # MCP session management (set after initialize)
        self.session_id: str | None = None
        self.protocol_version: str = "2025-03-26"

        # Server capabilities (set after initialize)
        self.server_capabilities: dict[str, Any] = {}

    async def __aenter__(self) -> Self:
        """
        Async context manager entry: create HTTP client.

        Returns:
            Self for use in async with statement.
        """
        # Configure granular timeouts (2025 best practice)
        timeout = httpx.Timeout(
            connect=10.0,  # TCP connection establishment
            read=60.0,  # Response reading
            write=10.0,  # Request writing
            pool=5.0,  # Connection pool acquisition
        )

        # Configure connection pooling
        limits = httpx.Limits(
            max_connections=100,  # Total concurrent connections
            max_keepalive_connections=20,  # Reusable persistent connections
        )

        # Create async HTTP client with HTTP/2 support
        self.client = httpx.AsyncClient(
            timeout=timeout,
            limits=limits,
            http2=True,  # Enable HTTP/2 with automatic fallback to HTTP/1.1
            headers=self.headers,
            follow_redirects=True,
        )

        logger.info(
            "MCP HTTP client initialized",
            url=self.url,
            http2=True,
            max_connections=100,
        )

        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """
        Async context manager exit: close HTTP client.

        Args:
            exc_type: Exception type (if any).
            exc_val: Exception value (if any).
            exc_tb: Exception traceback (if any).
        """
        await self.close()

    async def close(self) -> None:
        """
        Close HTTP client and release all connections.

        Idempotent: safe to call multiple times.
        """
        if self._closed:
            return

        if self.client:
            await self.client.aclose()
            logger.info("MCP HTTP client closed")

        self._closed = True

    async def _make_request_with_retry(
        self,
        method: str,
        params: dict[str, Any],
        max_retries: int = 3,
    ) -> dict[str, Any]:
        """
        Make JSON-RPC request with automatic retry and exponential backoff.

        Per WHATWG SSE spec, reconnection should use:
        - Last-Event-ID header to resume from disconnection point
        - Exponential backoff to avoid overloading server
        - Server-provided retry time (via `retry:` field)

        Args:
            method: JSON-RPC method name.
            params: Method parameters.
            max_retries: Maximum number of retry attempts (default: 3).

        Returns:
            JSON-RPC result dict.

        Raises:
            MCPError: If all retries exhausted or non-retryable error.
        """
        last_error: Exception | None = None
        retry_delay_ms = self._reconnection_time_ms

        for attempt in range(max_retries + 1):
            try:
                return await self._make_request(method, params)

            except MCPConnectionError as e:
                # Connection errors are retryable
                last_error = e
                if attempt < max_retries:
                    # Exponential backoff with jitter
                    import random

                    jitter = random.uniform(0.5, 1.5)
                    wait_time = (retry_delay_ms / 1000) * jitter

                    logger.warning(
                        f"Connection error on attempt {attempt + 1}/{max_retries + 1}, "
                        f"retrying in {wait_time:.1f}s with Last-Event-ID={self.last_event_id}",
                        error=str(e),
                    )

                    await asyncio.sleep(wait_time)

                    # Exponential backoff: double the delay for next retry
                    retry_delay_ms = min(retry_delay_ms * 2, 30000)  # Cap at 30 seconds

            except MCPError:
                # Non-retryable MCP errors (JSON-RPC errors, etc.)
                raise

        # All retries exhausted
        raise MCPConnectionError(
            f"Request failed after {max_retries + 1} attempts: {last_error}"
        ) from last_error

    def _next_request_id(self) -> int:
        """
        Generate next JSON-RPC request ID.

        Returns:
            Incremental request ID.
        """
        self._request_id += 1
        return self._request_id

    def _build_jsonrpc_request(
        self, method: str, params: dict[str, Any], request_id: int
    ) -> dict[str, Any]:
        """
        Build JSON-RPC 2.0 request payload.

        Args:
            method: JSON-RPC method name (e.g., "tools/list").
            params: Method parameters.
            request_id: Unique request ID.

        Returns:
            JSON-RPC request dict.
        """
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
            "params": params,
        }

    def _redact_sensitive_headers(self, headers: dict[str, str]) -> dict[str, str]:
        """
        Redact sensitive header values for logging (wrapper for handler function).

        Args:
            headers: Original headers dict.

        Returns:
            Headers dict with sensitive values redacted.
        """
        return redact_sensitive_headers(headers)

    async def _post_request(self, jsonrpc_payload: dict[str, Any]) -> httpx.Response:
        """
        Send HTTP POST request to MCP server (wrapper for handler function).

        Args:
            jsonrpc_payload: JSON-RPC request payload.

        Returns:
            httpx.Response object.

        Raises:
            MCPConnectionError: On connection failures or timeouts.
            MCPClientError: On HTTP 4xx errors.
            MCPServerError: On HTTP 5xx errors.
        """
        if not self.client:
            raise MCPError("Client not initialized (use async with)")

        return await post_request(
            self.client, self.url, jsonrpc_payload, self.headers, redact_sensitive_headers
        )

    def _handle_json_response(self, response: httpx.Response) -> dict[str, Any]:
        """
        Handle single JSON response mode (wrapper for handler function).

        Args:
            response: httpx.Response with application/json Content-Type.

        Returns:
            JSON-RPC result dict.

        Raises:
            InvalidJSONError: If response is not valid JSON-RPC.
            MCPError: If JSON-RPC error response.
        """
        return handle_json_response(response)

    async def _make_request(self, method: str, params: dict[str, Any]) -> dict[str, Any]:
        """
        Make JSON-RPC request with dual response mode handling.

        Uses httpx.stream directly instead of httpx-sse's aconnect_sse because
        aconnect_sse overwrites the Accept header, causing HTTP 406 errors with
        MCP servers that strictly enforce the spec requirement for
        "Accept: application/json, text/event-stream".

        Args:
            method: JSON-RPC method name.
            params: Method parameters.

        Returns:
            JSON-RPC result dict.

        Raises:
            MCPError: On any error during request/response.
        """
        if self._closed:
            raise MCPError("Client is closed")

        if not self.client:
            raise MCPError("Client not initialized (use async with)")

        request_id = self._next_request_id()
        jsonrpc_payload = self._build_jsonrpc_request(method, params, request_id)

        # Build MCP-compliant headers (IMPORTANT: must include both content types)
        # Include Last-Event-ID for SSE reconnection support
        request_headers = build_mcp_headers(
            custom_headers=self.headers,
            session_id=self.session_id,
            protocol_version=self.protocol_version,
            last_event_id=self.last_event_id,
        )

        logger.debug(
            "MCP HTTP request",
            method=method,
            request_id=request_id,
            url=self.url,
        )

        import json

        # Use httpx.stream directly to preserve MCP-compliant Accept headers
        async with self.client.stream(
            "POST",
            self.url,
            json=jsonrpc_payload,
            headers=request_headers,
        ) as response:
            # Check for HTTP errors
            if response.status_code >= 400:
                body = await response.aread()
                raise MCPError(f"HTTP {response.status_code}: {body.decode()[:500]}")

            # Determine response mode based on Content-Type
            content_type = response.headers.get("content-type", "")

            if "application/json" in content_type:
                # Single JSON response mode
                body = await response.aread()
                data = json.loads(body)

                # Validate JSON-RPC structure
                if "jsonrpc" not in data or data["jsonrpc"] != "2.0":
                    raise InvalidJSONError(f"Invalid JSON-RPC response: {data}")

                # Check for JSON-RPC error
                if "error" in data:
                    error = data["error"]
                    raise MCPError(
                        f"JSON-RPC error: {error.get('message', 'Unknown error')}"
                    )

                return cast(dict[str, Any], data.get("result", {}))

            elif "text/event-stream" in content_type:
                # SSE stream response mode - parse manually
                return await self._parse_sse_response(response, request_id)

            else:
                raise MCPError(f"Unexpected Content-Type: {content_type}")

    async def _parse_sse_response(
        self, response: httpx.Response, request_id: int
    ) -> dict[str, Any]:
        """
        Parse SSE stream response per WHATWG HTML Living Standard.

        Implements the SSE parsing algorithm from:
        https://html.spec.whatwg.org/multipage/server-sent-events.html

        Key features:
        - Multi-line data: Multiple `data:` lines are concatenated with newlines
        - Event ID tracking: `id:` field updates last_event_id for reconnection
        - Retry handling: `retry:` field updates reconnection time
        - Comment ignoring: Lines starting with `:` are ignored (keep-alive)

        This is needed because httpx-sse's aconnect_sse overwrites the Accept header
        to just "text/event-stream", but MCP spec requires "application/json, text/event-stream"
        and some servers (like Exa) enforce this with HTTP 406.

        Args:
            response: httpx.Response with text/event-stream Content-Type.
            request_id: JSON-RPC request ID to match.

        Returns:
            JSON-RPC result dict from matching response.

        Raises:
            MCPError: If no matching response found or JSON-RPC error.
        """
        import json

        # SSE event buffers (per WHATWG spec)
        data_buffer: list[str] = []  # Accumulates data: lines
        event_type_buffer = "message"  # Default event type
        last_event_id_buffer: str | None = None  # Tracks event ID for reconnection

        event_count = 0

        async for line in response.aiter_lines():
            # Per spec: Lines can end with CRLF, LF, or CR
            # aiter_lines() handles line splitting, we just need to process

            # Empty line = dispatch event
            if line == "":
                if data_buffer:
                    # Join multi-line data with newlines, remove trailing newline per spec
                    event_data = "\n".join(data_buffer)
                    if event_data.endswith("\n"):
                        event_data = event_data[:-1]

                    event_count += 1

                    # Update last_event_id if we received one
                    if last_event_id_buffer is not None:
                        self.last_event_id = last_event_id_buffer

                    logger.debug(
                        "SSE event dispatched",
                        event_count=event_count,
                        event_type=event_type_buffer,
                        event_id=last_event_id_buffer,
                        data_size=len(event_data),
                    )

                    # Parse event data as JSON-RPC
                    try:
                        data = json.loads(event_data)
                    except json.JSONDecodeError as e:
                        logger.warning(f"Skipping non-JSON SSE event: {e}")
                        # Reset buffers for next event
                        data_buffer = []
                        event_type_buffer = "message"
                        continue

                    # Check if this is the matching response
                    if data.get("id") == request_id:
                        # Check for JSON-RPC error
                        if "error" in data:
                            error = data["error"]
                            raise MCPError(
                                f"JSON-RPC error: {error.get('message', 'Unknown error')}"
                            )

                        return cast(dict[str, Any], data.get("result", {}))

                # Reset buffers for next event (keep last_event_id_buffer per spec)
                data_buffer = []
                event_type_buffer = "message"
                continue

            # Comment line (starts with colon) - ignore but useful for keep-alive
            if line.startswith(":"):
                continue

            # Parse field name and value
            if ":" in line:
                colon_idx = line.index(":")
                field_name = line[:colon_idx]
                field_value = line[colon_idx + 1 :]
                # Per spec: "If value starts with a U+0020 SPACE character, remove it"
                if field_value.startswith(" "):
                    field_value = field_value[1:]
            else:
                # Line with no colon: field name is entire line, value is empty
                field_name = line
                field_value = ""

            # Process field based on name
            if field_name == "data":
                # Append to data buffer (multi-line support)
                data_buffer.append(field_value)

            elif field_name == "event":
                # Set event type
                event_type_buffer = field_value

            elif field_name == "id":
                # Per spec: "If the field value does not contain U+0000 NULL"
                if "\x00" not in field_value:
                    last_event_id_buffer = field_value

            elif field_name == "retry":
                # Per spec: "If the field value consists of only ASCII digits"
                if field_value.isdigit():
                    self._reconnection_time_ms = int(field_value)
                    logger.debug(f"SSE retry time set to {self._reconnection_time_ms}ms")

            # Unknown fields are ignored per spec

        raise MCPError(f"No response found for request ID {request_id} in SSE stream")

    # ========== MCP Interface Methods (Match stdio client) ==========

    async def initialize(self) -> dict[str, Any]:
        """
        Perform MCP initialize handshake per MCP Specification 2025-03-26.

        Sends initialize request with protocol version 2025-03-26.
        Validates server response, stores capabilities, and captures session ID.

        Per MCP spec, if server returns Mcp-Session-Id header, client MUST
        include it in all subsequent requests.

        Returns:
            Server capabilities dict.

        Raises:
            InitializationError: If server returns error or incompatible version.
            MCPError: If handshake fails.
        """
        if self._closed:
            raise MCPError("Client is closed")

        if not self.client:
            raise MCPError("Client not initialized (use async with)")

        params = {
            "protocolVersion": self.protocol_version,
            "capabilities": {},
            "clientInfo": {"name": "ai-ops-platform", "version": "1.0.0"},
        }

        logger.info("Initializing MCP HTTP connection", url=self.url)

        # Build JSON-RPC request
        request_id = self._next_request_id()
        jsonrpc_payload = self._build_jsonrpc_request("initialize", params, request_id)

        try:
            # Build MCP-compliant headers per specification 2025-03-26
            # IMPORTANT: We cannot use httpx-sse's aconnect_sse because it
            # overwrites our Accept header to just "text/event-stream".
            # MCP spec requires "Accept: application/json, text/event-stream"
            # and some servers (like Exa) strictly enforce this with HTTP 406.
            request_headers = build_mcp_headers(
                custom_headers=self.headers,
                session_id=None,  # No session yet
                protocol_version=self.protocol_version,
            )

            logger.info(
                "MCP HTTP POST request (initialize)",
                url=self.url,
                headers=redact_sensitive_headers(request_headers),
            )

            # Use httpx.stream directly to preserve our MCP-compliant headers
            import json

            async with self.client.stream(
                "POST",
                self.url,
                json=jsonrpc_payload,
                headers=request_headers,
            ) as response:
                # Check for HTTP errors
                if response.status_code >= 400:
                    body = await response.aread()
                    raise MCPError(f"HTTP {response.status_code}: {body.decode()[:500]}")

                # Capture session ID from response headers (per MCP spec)
                session_id_header = response.headers.get(
                    "mcp-session-id"
                ) or response.headers.get("Mcp-Session-Id")
                if session_id_header:
                    self.session_id = session_id_header
                    logger.info(f"MCP session established: {session_id_header[:8]}...")

                # Determine response type from Content-Type header
                content_type = response.headers.get("content-type", "")

                if "text/event-stream" in content_type:
                    # Parse SSE stream manually to find the initialize response
                    result = await self._parse_sse_response(response, request_id)
                elif "application/json" in content_type:
                    # Single JSON response mode
                    body = await response.aread()
                    data = json.loads(body)
                    if "error" in data:
                        error = data["error"]
                        raise MCPError(
                            f"JSON-RPC error: {error.get('message', 'Unknown error')}"
                        )
                    result = data.get("result", {})
                else:
                    raise MCPError(f"Unexpected Content-Type: {content_type}")

        except Exception as e:
            raise InitializationError(f"Initialize handshake failed: {e}") from e

        # Validate protocol version (be flexible - accept compatible versions)
        server_version = result.get("protocolVersion", "")
        compatible_versions = ["2025-03-26", "2025-06-18", "2024-11-05"]
        if server_version and server_version not in compatible_versions:
            logger.warning(
                f"Server protocol version {server_version} may not be fully compatible"
            )

        # Store server capabilities
        self.server_capabilities = result.get("capabilities", {})

        server_info = result.get("serverInfo", {})
        logger.info(
            f"MCP HTTP initialized - Server: {server_info.get('name')} v{server_info.get('version')}"
        )

        return self.server_capabilities

    async def list_tools(self) -> list[dict[str, Any]]:
        """
        List available tools from MCP server.

        Returns:
            List of tool dicts with name, description (optional), inputSchema.

        Raises:
            MCPError: If server returns error.
        """
        if self._closed:
            raise MCPError("Client is closed")

        result = await self._make_request("tools/list", {})
        tools = result.get("tools", [])

        logger.debug(f"Listed {len(tools)} tools via HTTP")
        return cast(list[dict[str, Any]], tools)

    async def list_resources(self) -> list[dict[str, Any]]:
        """
        List available resources from MCP server.

        Returns:
            List of resource dicts with uri, name, description (optional), mimeType (optional).

        Raises:
            MCPError: If server returns error.
        """
        if self._closed:
            raise MCPError("Client is closed")

        result = await self._make_request("resources/list", {})
        resources = result.get("resources", [])

        logger.debug(f"Listed {len(resources)} resources via HTTP")
        return cast(list[dict[str, Any]], resources)

    async def list_prompts(self) -> list[dict[str, Any]]:
        """
        List available prompts from MCP server.

        Returns:
            List of prompt dicts with name, description (optional), arguments.

        Raises:
            MCPError: If server returns error.
        """
        if self._closed:
            raise MCPError("Client is closed")

        result = await self._make_request("prompts/list", {})
        prompts = result.get("prompts", [])

        logger.debug(f"Listed {len(prompts)} prompts via HTTP")
        return cast(list[dict[str, Any]], prompts)

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """
        Call a tool on the MCP server.

        Args:
            name: Tool name (from list_tools).
            arguments: Tool arguments matching inputSchema.

        Returns:
            Dict with "content" (list of content blocks) and "is_error" (bool).

        Raises:
            ToolExecutionError: If tool execution fails (isError: true).
            MCPError: If server returns error.
        """
        if self._closed:
            raise MCPError("Client is closed")

        params = {"name": name, "arguments": arguments}

        result = await self._make_request("tools/call", params)

        # Check for tool execution error
        is_error = result.get("isError", False)
        if is_error:
            raise ToolExecutionError(f"Tool '{name}' execution failed")

        return {
            "content": result.get("content", []),
            "is_error": is_error,
        }

    async def read_resource(self, uri: str) -> dict[str, Any]:
        """
        Read a resource from the MCP server.

        Args:
            uri: Resource URI (from list_resources).

        Returns:
            Dict with "contents" (list of content blocks).

        Raises:
            MCPError: If server returns error.
        """
        if self._closed:
            raise MCPError("Client is closed")

        params = {"uri": uri}

        result = await self._make_request("resources/read", params)

        return {"contents": result.get("contents", [])}

    async def get_prompt(
        self, name: str, arguments: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """
        Get a prompt from the MCP server.

        Args:
            name: Prompt name (from list_prompts).
            arguments: Optional prompt arguments.

        Returns:
            Dict with "messages" (list of message templates).

        Raises:
            MCPError: If server returns error.
        """
        if self._closed:
            raise MCPError("Client is closed")

        params = {"name": name, "arguments": arguments or {}}

        result = await self._make_request("prompts/get", params)

        return {"messages": result.get("messages", [])}


__all__ = [
    "MCPStreamableHTTPClient",
    "MCPError",
    "MCPConnectionError",
    "MCPClientError",
    "MCPServerError",
    "InitializationError",
    "ToolExecutionError",
    "InvalidJSONError",
    "MCPTimeoutError",
]

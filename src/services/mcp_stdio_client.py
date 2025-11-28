"""
MCP stdio Transport Client

This module implements a client for the Model Context Protocol (MCP) using stdio transport.
It spawns MCP server subprocesses and communicates via JSON-RPC 2.0 over stdin/stdout.

Implements MCP Specification 2025-03-26/2025-06-18 with full compliance:
- Single persistent reader task (no race conditions)
- Server-initiated request handling (bidirectional communication)
- JSON-RPC batch message support
- Proper shutdown sequence (stdin close → SIGTERM → SIGKILL)
- Ping/keepalive support
- Capability-based method validation
- Embedded newline validation

References:
- MCP Transports: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
- MCP Lifecycle: https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle
- JSON-RPC 2.0: https://www.jsonrpc.org/specification
"""

import asyncio
import json
import logging
import os
from typing import Any, Callable, Self, cast

from src.schemas.mcp_server import MCPServerResponse

logger = logging.getLogger(__name__)


# =============================================================================
# Custom Exceptions
# =============================================================================


class MCPError(Exception):
    """Base exception for MCP client errors."""

    pass


class InitializationError(MCPError):
    """Raised when MCP server initialization fails."""

    pass


class ToolExecutionError(MCPError):
    """Raised when tool execution fails."""

    pass


class ProcessError(MCPError):
    """Raised when subprocess crashes or exits unexpectedly."""

    pass


class InvalidJSONError(MCPError):
    """Raised when JSON-RPC message parsing fails."""

    pass


class TimeoutError(MCPError):
    """Raised when an operation times out."""

    pass


class CapabilityError(MCPError):
    """Raised when calling a method the server doesn't support."""

    pass


# =============================================================================
# JSON-RPC Error Codes (per JSON-RPC 2.0 Specification)
# =============================================================================


class JSONRPCErrorCode:
    """Standard JSON-RPC 2.0 error codes."""

    PARSE_ERROR = -32700  # Invalid JSON
    INVALID_REQUEST = -32600  # Not a valid Request object
    METHOD_NOT_FOUND = -32601  # Method doesn't exist
    INVALID_PARAMS = -32602  # Invalid method parameters
    INTERNAL_ERROR = -32603  # Internal JSON-RPC error
    # Server-defined errors: -32000 to -32099


# =============================================================================
# Type Aliases
# =============================================================================

NotificationHandler = Callable[[str, dict[str, Any] | None], None]
RequestHandler = Callable[[str, dict[str, Any] | None], dict[str, Any] | None]


# =============================================================================
# MCPStdioClient Implementation
# =============================================================================


class MCPStdioClient:
    """
    MCP stdio transport client for spawning and communicating with local MCP servers.

    Implements JSON-RPC 2.0 over stdin/stdout per MCP Specification 2025-03-26/2025-06-18.
    Supports async context manager for automatic cleanup.

    Features:
    - Single persistent reader task (thread-safe for concurrent requests)
    - Server-initiated request/notification handling
    - JSON-RPC batch message support
    - Proper MCP shutdown sequence
    - Ping/keepalive for connection health checks
    - Capability-based method validation

    Example usage:
        async with MCPStdioClient(config) as client:
            await client.initialize()
            tools = await client.list_tools()
            result = await client.call_tool("tool_name", {"arg": "value"})
    """

    def __init__(self, config: MCPServerResponse):
        """
        Initialize MCP stdio client.

        Args:
            config: MCPServerResponse schema containing transport configuration.

        Raises:
            ValueError: If transport_type is not "stdio" or command is missing.
        """
        if config.transport_type != "stdio":
            raise ValueError(f"Expected stdio transport, got {config.transport_type}")

        if not config.command:
            raise ValueError("Command is required for stdio transport")

        self.command = config.command
        self.args = config.args or []
        self.env = config.env or {}

        # Process management
        self.process: asyncio.subprocess.Process | None = None
        self._closed = False
        self._initialized = False

        # JSON-RPC state
        # Reason: Use positive IDs for client requests, server uses negative IDs
        self._request_id = 0
        self._pending_requests: dict[int, asyncio.Future[dict[str, Any]]] = {}

        # Server capabilities (set after initialize)
        self.server_capabilities: dict[str, Any] = {}
        self.server_info: dict[str, Any] = {}
        self.protocol_version: str | None = None

        # Background tasks
        self._reader_task: asyncio.Task[None] | None = None
        self._stderr_task: asyncio.Task[None] | None = None

        # Handlers for server-initiated messages
        self._notification_handlers: dict[str, NotificationHandler] = {}
        self._request_handler: RequestHandler | None = None

        # Default notification handlers
        self._register_default_handlers()

    def _register_default_handlers(self) -> None:
        """Register default handlers for common MCP notifications."""
        # Progress notifications
        self.on_notification(
            "notifications/progress",
            lambda method, params: logger.debug(
                f"Progress: {params.get('progressToken')} - {params.get('progress')}/{params.get('total')}"
            ),
        )
        # Resource updates
        self.on_notification(
            "notifications/resources/updated",
            lambda method, params: logger.info(f"Resource updated: {params.get('uri')}"),
        )
        # Tool list changes
        self.on_notification(
            "notifications/tools/list_changed",
            lambda method, params: logger.info("Tool list changed"),
        )
        # Cancelled notifications
        self.on_notification(
            "notifications/cancelled",
            lambda method, params: logger.warning(
                f"Request cancelled: {params.get('requestId')} - {params.get('reason')}"
            ),
        )

    def _next_id(self) -> int:
        """
        Generate next unique request ID.

        Returns:
            Incrementing positive integer ID.

        Note:
            Client uses positive IDs; servers typically use negative IDs
            for server-initiated requests to avoid conflicts.
        """
        self._request_id += 1
        return self._request_id

    def _validate_message(self, message: str) -> None:
        """
        Validate outgoing message per MCP specification.

        Args:
            message: JSON string to validate.

        Raises:
            InvalidJSONError: If message contains embedded newlines.

        Note:
            Per MCP spec: "Messages MUST NOT contain embedded newlines"
            JSON serialization escapes newlines in string values, but we
            validate the final message to be safe.
        """
        # Check for raw newlines in the JSON string (not escaped \n)
        if "\n" in message or "\r" in message:
            raise InvalidJSONError(
                "Message contains embedded newlines, which violates MCP specification"
            )

    def _create_request(
        self, method: str, params: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """
        Construct JSON-RPC 2.0 request message.

        Args:
            method: JSON-RPC method name (e.g., "initialize", "tools/list").
            params: Optional method parameters.

        Returns:
            JSON-RPC 2.0 request dict.
        """
        request: dict[str, Any] = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": method,
        }

        if params is not None:
            request["params"] = params

        return request

    def _create_response(
        self,
        request_id: int | str | None,
        result: dict[str, Any] | None = None,
        error: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Construct JSON-RPC 2.0 response message.

        Args:
            request_id: ID from the original request.
            result: Success result (mutually exclusive with error).
            error: Error object (mutually exclusive with result).

        Returns:
            JSON-RPC 2.0 response dict.
        """
        response: dict[str, Any] = {
            "jsonrpc": "2.0",
            "id": request_id,
        }

        if error is not None:
            response["error"] = error
        else:
            response["result"] = result or {}

        return response

    async def _send_message(self, message: dict[str, Any]) -> None:
        """
        Send JSON-RPC message to MCP server via stdin.

        Args:
            message: JSON-RPC 2.0 message dict (request, response, or notification).

        Raises:
            ProcessError: If subprocess stdin is unavailable.
            InvalidJSONError: If message contains embedded newlines.
        """
        if not self.process or not self.process.stdin:
            raise ProcessError("Process stdin is not available")

        # Serialize to JSON (no pretty printing to avoid newlines)
        json_str = json.dumps(message, separators=(",", ":"))

        # Validate no embedded newlines
        self._validate_message(json_str)

        # Append newline delimiter and encode UTF-8
        message_line = json_str + "\n"
        message_bytes = message_line.encode("utf-8")

        logger.debug(f"Sending: {message}")
        self.process.stdin.write(message_bytes)
        await self.process.stdin.drain()

    async def _send_request(self, request: dict[str, Any]) -> None:
        """
        Send JSON-RPC request to MCP server via stdin.

        Args:
            request: JSON-RPC 2.0 request dict.

        Raises:
            ProcessError: If subprocess stdin is unavailable.
        """
        await self._send_message(request)

    async def _send_notification(
        self, method: str, params: dict[str, Any] | None = None
    ) -> None:
        """
        Send JSON-RPC notification to MCP server (no response expected).

        Args:
            method: JSON-RPC method name (e.g., "notifications/initialized").
            params: Optional method parameters.

        Raises:
            ProcessError: If subprocess stdin is unavailable.
        """
        # Create notification (no id field per JSON-RPC 2.0 spec)
        notification: dict[str, Any] = {
            "jsonrpc": "2.0",
            "method": method,
        }

        if params is not None:
            notification["params"] = params

        logger.debug(f"Sending notification: {method}")
        await self._send_message(notification)

    async def _send_response(
        self,
        request_id: int | str | None,
        result: dict[str, Any] | None = None,
        error: dict[str, Any] | None = None,
    ) -> None:
        """
        Send JSON-RPC response to server (for server-initiated requests).

        Args:
            request_id: ID from the server's request.
            result: Success result.
            error: Error object.
        """
        response = self._create_response(request_id, result, error)
        logger.debug(f"Sending response to request {request_id}")
        await self._send_message(response)

    # =========================================================================
    # Message Type Detection (per JSON-RPC 2.0 spec)
    # =========================================================================

    @staticmethod
    def _is_response(msg: dict[str, Any]) -> bool:
        """
        Check if message is a JSON-RPC response.

        A response has 'id' and either 'result' or 'error', but no 'method'.
        """
        return (
            "id" in msg
            and ("result" in msg or "error" in msg)
            and "method" not in msg
        )

    @staticmethod
    def _is_request(msg: dict[str, Any]) -> bool:
        """
        Check if message is a JSON-RPC request.

        A request has both 'id' and 'method' (expects a response).
        """
        return "id" in msg and "method" in msg

    @staticmethod
    def _is_notification(msg: dict[str, Any]) -> bool:
        """
        Check if message is a JSON-RPC notification.

        A notification has 'method' but no 'id' (no response expected).
        """
        return "method" in msg and "id" not in msg

    # =========================================================================
    # Reader Task (Single Persistent Reader - No Race Conditions)
    # =========================================================================

    async def _reader_loop(self) -> None:
        """
        Single persistent reader task that processes all incoming messages.

        This task runs for the lifetime of the connection and routes messages
        to appropriate handlers based on message type:
        - Response → resolve pending request future
        - Request → handle server-initiated request
        - Notification → handle server notification
        - Batch → process each message in array

        Note:
            This design eliminates race conditions by having only one task
            reading from stdout. Previous implementation created a new task
            per request, causing potential message corruption.
        """
        if not self.process or not self.process.stdout:
            logger.error("Reader loop started without valid stdout")
            return

        logger.debug("Reader loop started")

        try:
            while not self._closed:
                # Read one line from stdout (newline-delimited)
                line = await self.process.stdout.readline()

                if not line:
                    # EOF - server closed stdout
                    logger.info("Server closed stdout (EOF)")
                    break

                # Decode UTF-8 and parse JSON
                try:
                    message_str = line.decode("utf-8").strip()
                    if not message_str:
                        continue  # Skip empty lines

                    message = json.loads(message_str)
                except UnicodeDecodeError as e:
                    logger.error(f"UTF-8 decode error: {e}")
                    continue
                except json.JSONDecodeError as e:
                    logger.error(f"JSON parse error: {e} - raw: {line[:100]}")
                    continue

                # Route message based on type
                await self._process_message(message)

        except asyncio.CancelledError:
            logger.debug("Reader loop cancelled")
            raise
        except Exception as e:
            logger.error(f"Reader loop error: {e}", exc_info=True)
            # Propagate error to all pending requests
            self._fail_all_pending_requests(e)
        finally:
            logger.debug("Reader loop exited")

    async def _process_message(self, message: dict[str, Any] | list[Any]) -> None:
        """
        Route incoming message to appropriate handler.

        Args:
            message: Parsed JSON message (single object or batch array).
        """
        # Handle batch messages (JSON-RPC 2.0 spec allows arrays)
        if isinstance(message, list):
            await self._process_batch(message)
            return

        # Validate JSON-RPC 2.0 version
        if message.get("jsonrpc") != "2.0":
            logger.warning(f"Invalid JSON-RPC version: {message.get('jsonrpc')}")
            return

        # Route based on message type
        if self._is_response(message):
            self._handle_response(message)
        elif self._is_request(message):
            await self._handle_server_request(message)
        elif self._is_notification(message):
            self._handle_server_notification(message)
        else:
            logger.warning(f"Unknown message type: {message}")

    async def _process_batch(self, batch: list[Any]) -> None:
        """
        Process JSON-RPC batch message (array of messages).

        Args:
            batch: Array of JSON-RPC messages.
        """
        logger.debug(f"Processing batch of {len(batch)} messages")

        for item in batch:
            if not isinstance(item, dict):
                logger.warning(f"Invalid batch item (not object): {item}")
                continue

            await self._process_message(item)

    def _handle_response(self, response: dict[str, Any]) -> None:
        """
        Handle JSON-RPC response (resolve pending request future).

        Args:
            response: JSON-RPC response with id and result/error.
        """
        response_id = response.get("id")

        if response_id is None:
            logger.warning("Response missing 'id' field")
            return

        # Find matching pending request
        future = self._pending_requests.get(response_id)
        if future is None:
            logger.warning(f"No pending request for response ID: {response_id}")
            return

        if future.done():
            logger.warning(f"Future already done for response ID: {response_id}")
            return

        # Resolve the future
        future.set_result(response)
        logger.debug(f"Resolved response for request ID: {response_id}")

    async def _handle_server_request(self, request: dict[str, Any]) -> None:
        """
        Handle server-initiated request (bidirectional communication).

        Server can send requests for:
        - sampling/createMessage: Request LLM sampling
        - roots/list: Request available roots

        Args:
            request: JSON-RPC request with id and method.
        """
        request_id = request.get("id")
        method = request.get("method", "")
        params = request.get("params")

        logger.info(f"Server request: {method} (id={request_id})")

        # Use custom handler if registered
        if self._request_handler:
            try:
                result = self._request_handler(method, params)
                await self._send_response(request_id, result=result)
            except Exception as e:
                logger.error(f"Request handler error: {e}")
                await self._send_response(
                    request_id,
                    error={
                        "code": JSONRPCErrorCode.INTERNAL_ERROR,
                        "message": str(e),
                    },
                )
        else:
            # No handler registered - return method not found
            logger.warning(f"No handler for server request: {method}")
            await self._send_response(
                request_id,
                error={
                    "code": JSONRPCErrorCode.METHOD_NOT_FOUND,
                    "message": f"Method not supported: {method}",
                },
            )

    def _handle_server_notification(self, notification: dict[str, Any]) -> None:
        """
        Handle server-initiated notification.

        Common notifications:
        - notifications/progress: Progress updates during operations
        - notifications/resources/updated: Resource content changed
        - notifications/tools/list_changed: Available tools changed
        - notifications/cancelled: Request was cancelled

        Args:
            notification: JSON-RPC notification with method (no id).
        """
        method = notification.get("method", "")
        params = notification.get("params")

        logger.debug(f"Server notification: {method}")

        # Use registered handler if available
        handler = self._notification_handlers.get(method)
        if handler:
            try:
                handler(method, params)
            except Exception as e:
                logger.error(f"Notification handler error for {method}: {e}")
        else:
            # Log unhandled notifications
            logger.debug(f"Unhandled notification: {method} - {params}")

    def _fail_all_pending_requests(self, error: Exception) -> None:
        """
        Fail all pending requests with an error.

        Called when the reader loop encounters an unrecoverable error.

        Args:
            error: Exception to propagate to all pending requests.
        """
        for request_id, future in list(self._pending_requests.items()):
            if not future.done():
                future.set_exception(error)
                logger.debug(f"Failed pending request {request_id}: {error}")

    # =========================================================================
    # Notification Handler Registration
    # =========================================================================

    def on_notification(self, method: str, handler: NotificationHandler) -> None:
        """
        Register a handler for server notifications.

        Args:
            method: Notification method name (e.g., "notifications/progress").
            handler: Callback function(method, params).

        Example:
            client.on_notification(
                "notifications/progress",
                lambda m, p: print(f"Progress: {p}")
            )
        """
        self._notification_handlers[method] = handler

    def on_request(self, handler: RequestHandler) -> None:
        """
        Register a handler for server-initiated requests.

        Args:
            handler: Callback function(method, params) -> result dict or None.

        Example:
            def handle_sampling(method, params):
                if method == "sampling/createMessage":
                    return {"content": "response"}
                return None

            client.on_request(handle_sampling)
        """
        self._request_handler = handler

    # =========================================================================
    # Stderr Monitoring
    # =========================================================================

    async def _monitor_stderr(self) -> None:
        """
        Monitor stderr output from MCP server process.

        Per MCP spec: "Server MAY write UTF-8 strings to stderr for logging"
        We capture and log these at WARNING level for debugging.
        """
        if not self.process or not self.process.stderr:
            return

        try:
            while not self._closed:
                line = await self.process.stderr.readline()
                if not line:
                    break

                stderr_msg = line.decode("utf-8", errors="replace").strip()
                if stderr_msg:
                    logger.warning(f"MCP server stderr: {stderr_msg}")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error monitoring stderr: {e}")

    # =========================================================================
    # Request/Response Pattern
    # =========================================================================

    async def _send_and_wait(
        self,
        method: str,
        params: dict[str, Any] | None = None,
        timeout: float = 30.0,
    ) -> dict[str, Any]:
        """
        Send JSON-RPC request and wait for matching response.

        Args:
            method: JSON-RPC method name.
            params: Optional method parameters.
            timeout: Timeout in seconds (default: 30s).

        Returns:
            Response result dict.

        Raises:
            TimeoutError: If no response received within timeout.
            MCPError: If server returns error response.
            ProcessError: If subprocess exits unexpectedly.
        """
        if self._closed:
            raise MCPError("Client is closed")

        request = self._create_request(method, params)
        request_id = request["id"]

        # Create future for this request
        future: asyncio.Future[dict[str, Any]] = asyncio.get_event_loop().create_future()
        self._pending_requests[request_id] = future

        try:
            # Send request
            await self._send_request(request)

            # Wait for response with timeout
            try:
                response = await asyncio.wait_for(future, timeout=timeout)
            except asyncio.TimeoutError:
                raise TimeoutError(
                    f"No response received for method '{method}' within {timeout}s"
                )

            # Check for JSON-RPC error
            if "error" in response:
                error = response["error"]
                error_code = error.get("code", 0)
                error_msg = error.get("message", "Unknown error")

                # Classify error for better debugging
                if error_code == JSONRPCErrorCode.METHOD_NOT_FOUND:
                    raise MCPError(f"Method not found: {method}")
                elif error_code == JSONRPCErrorCode.INVALID_PARAMS:
                    raise MCPError(f"Invalid parameters for {method}: {error_msg}")
                else:
                    raise MCPError(f"Server error: {error_msg} (code: {error_code})")

            # Return result
            return cast(dict[str, Any], response.get("result", {}))

        finally:
            # Clean up pending request
            self._pending_requests.pop(request_id, None)

    # =========================================================================
    # Async Context Manager
    # =========================================================================

    async def __aenter__(self) -> Self:
        """
        Async context manager entry - spawn subprocess and start reader.

        Returns:
            self

        Raises:
            ProcessError: If subprocess spawning fails.
        """
        # BUGFIX: Docker-specific environment variable handling
        # Reason: When command is "docker", environment variables must be passed
        # as -e flags to the container, not to the docker CLI process.
        # For non-Docker commands (npx, python, node), merge with os.environ.
        if self.command == "docker" and self.env:
            # Convert environment variables to Docker -e flags
            env_args = []
            for key, value in self.env.items():
                env_args.extend(["-e", f"{key}={value}"])

            # Find the image name (last non-flag argument in args)
            # Typically: ["run", "--rm", "-i", "image:tag"]
            image_index = len(self.args) - 1
            for i in range(len(self.args) - 1, -1, -1):
                if not self.args[i].startswith("-"):
                    image_index = i
                    break

            # Insert -e flags before the image name
            final_args = (
                list(self.args[:image_index]) + env_args + [self.args[image_index]]
            )
            process_env = dict(os.environ)  # Convert to dict for docker CLI

            logger.info(
                f"Docker command detected: injecting {len(self.env)} env vars as -e flags"
            )
        else:
            # Non-Docker command: merge env with os.environ
            final_args = self.args
            process_env = {**dict(os.environ), **self.env}

        logger.info(f"Spawning MCP server: {self.command} {' '.join(final_args)}")

        try:
            # BUGFIX: Celery wraps sys.stdout/sys.stderr in LoggingProxy objects
            # which don't have fileno() method needed by asyncio subprocess.
            # Temporarily restore real file descriptors if in Celery environment.
            # Reason: asyncio.create_subprocess_exec needs fileno() for pipe setup
            import sys

            # Check if we're in Celery environment (stdout/stderr are LoggingProxy)
            has_fileno = hasattr(sys.stdout, "fileno")
            is_celery = not has_fileno

            logger.debug(
                f"Subprocess spawn check: has_fileno={has_fileno}, is_celery={is_celery}"
            )

            if is_celery:
                # Save Celery's LoggingProxy wrappers
                original_stdout = sys.stdout
                original_stderr = sys.stderr

                # Restore real file descriptors temporarily
                sys.stdout = sys.__stdout__
                sys.stderr = sys.__stderr__

                logger.debug("Detected Celery environment, using real stdout/stderr")

            try:
                self.process = await asyncio.create_subprocess_exec(
                    self.command,
                    *final_args,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env=process_env,
                )
            finally:
                # Restore LoggingProxy wrappers if we changed them
                if is_celery:
                    sys.stdout = original_stdout
                    sys.stderr = original_stderr

        except Exception as e:
            logger.error(
                f"Failed to spawn subprocess: {e}",
                exc_info=True,
                extra={
                    "command": self.command,
                    "command_args": self.args,
                    "error_type": type(e).__name__,
                },
            )
            raise ProcessError(f"Failed to spawn subprocess: {e}")

        logger.info(f"MCP server process started (PID: {self.process.pid})")

        # Start background tasks
        # Reason: Single persistent reader task eliminates race conditions
        self._reader_task = asyncio.create_task(self._reader_loop())
        self._stderr_task = asyncio.create_task(self._monitor_stderr())

        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: Any,
    ) -> None:
        """
        Async context manager exit - cleanup subprocess.

        Args:
            exc_type: Exception type (if any).
            exc_val: Exception value (if any).
            exc_tb: Exception traceback (if any).
        """
        await self.close()

    async def close(self) -> None:
        """
        Gracefully terminate MCP server process.

        Per MCP Specification 2025-06-18, the shutdown sequence is:
        1. Close stdin to signal server to shut down
        2. Wait for server to exit gracefully
        3. Send SIGTERM if server doesn't exit within reasonable time
        4. Send SIGKILL if server doesn't respond to SIGTERM
        """
        if self._closed:
            return

        self._closed = True

        if not self.process:
            return

        logger.info(f"Closing MCP server process (PID: {self.process.pid})")

        # Cancel background tasks first
        if self._reader_task and not self._reader_task.done():
            self._reader_task.cancel()
            try:
                await self._reader_task
            except asyncio.CancelledError:
                pass

        if self._stderr_task and not self._stderr_task.done():
            self._stderr_task.cancel()
            try:
                await self._stderr_task
            except asyncio.CancelledError:
                pass

        # Fail any remaining pending requests
        self._fail_all_pending_requests(
            ProcessError("Client closed while requests pending")
        )

        # Check if already terminated
        if self.process.returncode is not None:
            logger.info(f"Process already terminated (code: {self.process.returncode})")
            return

        # STEP 1: Close stdin to signal server shutdown (per MCP spec)
        # Reason: Per MCP lifecycle spec, client should close stdin first
        if self.process.stdin:
            logger.debug("Closing stdin to signal server shutdown")
            self.process.stdin.close()
            try:
                await self.process.stdin.wait_closed()
            except Exception:
                pass  # Ignore errors closing stdin

        # STEP 2: Wait for graceful exit after stdin close
        try:
            await asyncio.wait_for(self.process.wait(), timeout=3.0)
            logger.info("Process terminated gracefully after stdin close")
            return
        except asyncio.TimeoutError:
            logger.debug("Process didn't exit after stdin close, sending SIGTERM")

        # STEP 3: Send SIGTERM
        try:
            self.process.terminate()
        except ProcessLookupError:
            logger.info("Process already terminated")
            return

        try:
            await asyncio.wait_for(self.process.wait(), timeout=5.0)
            logger.info("Process terminated after SIGTERM")
            return
        except asyncio.TimeoutError:
            logger.warning("Process didn't respond to SIGTERM, sending SIGKILL")

        # STEP 4: Send SIGKILL
        try:
            self.process.kill()
            await self.process.wait()
            logger.info("Process killed with SIGKILL")
        except ProcessLookupError:
            logger.info("Process already terminated")

        logger.info("MCP server process closed")

    # =========================================================================
    # Capability Checking
    # =========================================================================

    def _check_capability(self, capability: str, sub_capability: str | None = None) -> None:
        """
        Check if server supports a capability.

        Args:
            capability: Top-level capability name (e.g., "tools", "resources").
            sub_capability: Optional sub-capability (e.g., "listChanged").

        Raises:
            CapabilityError: If capability not supported.
        """
        if not self._initialized:
            # Allow calls before init (like ping)
            return

        if capability not in self.server_capabilities:
            raise CapabilityError(
                f"Server does not support '{capability}' capability. "
                f"Available: {list(self.server_capabilities.keys())}"
            )

        if sub_capability:
            cap_config = self.server_capabilities.get(capability, {})
            if isinstance(cap_config, dict) and not cap_config.get(sub_capability):
                raise CapabilityError(
                    f"Server does not support '{capability}.{sub_capability}'"
                )

    # =========================================================================
    # MCP Protocol Methods
    # =========================================================================

    async def ping(self, timeout: float = 5.0) -> bool:
        """
        Send ping to check if server is responsive.

        Per MCP spec, ping can be used:
        - Before full initialization to check if server is up
        - Periodically during inactivity to maintain connection
        - To prevent connections from being dropped

        Args:
            timeout: Ping timeout in seconds (default: 5s).

        Returns:
            True if server responded, False on timeout.
        """
        try:
            await self._send_and_wait("ping", {}, timeout=timeout)
            return True
        except TimeoutError:
            return False
        except MCPError as e:
            # Some servers may not implement ping - treat as success
            logger.debug(f"Ping returned error (server may not implement): {e}")
            return True

    async def initialize(self) -> dict[str, Any]:
        """
        Perform MCP initialize handshake.

        Sends initialize request with protocol version 2025-03-26.
        Validates server response and stores capabilities.

        Returns:
            Server capabilities dict.

        Raises:
            InitializationError: If server returns error or incompatible version.
            MCPError: If handshake fails.
        """
        if self._closed:
            raise MCPError("Client is closed")

        if self._initialized:
            return self.server_capabilities

        params = {
            "protocolVersion": "2025-03-26",
            "capabilities": {
                # Advertise client capabilities
                "roots": {"listChanged": True},
                "sampling": {},
            },
            "clientInfo": {"name": "ai-ops-platform", "version": "1.0.0"},
        }

        logger.info("Initializing MCP connection")

        try:
            result = await self._send_and_wait("initialize", params, timeout=30.0)
        except Exception as e:
            raise InitializationError(f"Initialize handshake failed: {e}")

        # Validate protocol version
        # Accept 2024-11-05, 2025-03-26, and 2025-06-18 for compatibility
        server_version = result.get("protocolVersion")
        supported_versions = ["2024-11-05", "2025-03-26", "2025-06-18"]
        if server_version not in supported_versions:
            raise InitializationError(
                f"Incompatible protocol version: {server_version} "
                f"(expected one of: {supported_versions})"
            )

        # Store server info
        self.protocol_version = server_version
        self.server_capabilities = result.get("capabilities", {})
        self.server_info = result.get("serverInfo", {})

        logger.info(
            f"MCP initialized - Server: {self.server_info.get('name')} "
            f"v{self.server_info.get('version')} (protocol: {server_version})"
        )

        # Send initialized notification to complete handshake (per MCP spec)
        # This MUST be sent after successful init response
        await self._send_notification("notifications/initialized", {})
        logger.debug("Sent initialized notification")

        self._initialized = True
        return self.server_capabilities

    async def list_tools(self) -> list[dict[str, Any]]:
        """
        List available tools from MCP server.

        Returns:
            List of tool dicts with name, description (optional), inputSchema.

        Raises:
            CapabilityError: If server doesn't support tools.
            MCPError: If server returns error.
        """
        self._check_capability("tools")

        result = await self._send_and_wait("tools/list", {})
        tools = result.get("tools", [])

        logger.debug(f"Listed {len(tools)} tools")
        return cast(list[dict[str, Any]], tools)

    async def list_resources(self) -> list[dict[str, Any]]:
        """
        List available resources from MCP server.

        Returns:
            List of resource dicts with uri, name, description (optional), mimeType.

        Raises:
            CapabilityError: If server doesn't support resources.
            MCPError: If server returns error.
        """
        self._check_capability("resources")

        result = await self._send_and_wait("resources/list", {})
        resources = result.get("resources", [])

        logger.debug(f"Listed {len(resources)} resources")
        return cast(list[dict[str, Any]], resources)

    async def list_prompts(self) -> list[dict[str, Any]]:
        """
        List available prompts from MCP server.

        Returns:
            List of prompt dicts with name, description (optional), arguments.

        Raises:
            CapabilityError: If server doesn't support prompts.
            MCPError: If server returns error.
        """
        self._check_capability("prompts")

        result = await self._send_and_wait("prompts/list", {})
        prompts = result.get("prompts", [])

        logger.debug(f"Listed {len(prompts)} prompts")
        return cast(list[dict[str, Any]], prompts)

    async def call_tool(
        self, name: str, arguments: dict[str, Any], timeout: float = 60.0
    ) -> dict[str, Any]:
        """
        Call a tool on the MCP server.

        Args:
            name: Tool name (from list_tools).
            arguments: Tool arguments matching inputSchema.
            timeout: Tool execution timeout in seconds (default: 60s).

        Returns:
            Dict with "content" (list of content blocks) and "is_error" (bool).

        Raises:
            CapabilityError: If server doesn't support tools.
            ToolExecutionError: If tool execution fails (isError: true).
            MCPError: If server returns error.
        """
        self._check_capability("tools")

        params = {"name": name, "arguments": arguments}

        result = await self._send_and_wait("tools/call", params, timeout=timeout)

        # Check for tool execution error
        is_error = result.get("isError", False)
        if is_error:
            content = result.get("content", [])
            error_text = ""
            for c in content:
                if c.get("type") == "text":
                    error_text = c.get("text", "")
                    break
            raise ToolExecutionError(
                f"Tool '{name}' execution failed: {error_text or 'Unknown error'}"
            )

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
            CapabilityError: If server doesn't support resources.
            MCPError: If server returns error.
        """
        self._check_capability("resources")

        params = {"uri": uri}

        result = await self._send_and_wait("resources/read", params)

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
            CapabilityError: If server doesn't support prompts.
            MCPError: If server returns error.
        """
        self._check_capability("prompts")

        params = {"name": name, "arguments": arguments or {}}

        result = await self._send_and_wait("prompts/get", params)

        return {"messages": result.get("messages", [])}


__all__ = [
    "MCPStdioClient",
    "MCPError",
    "InitializationError",
    "ToolExecutionError",
    "ProcessError",
    "InvalidJSONError",
    "TimeoutError",
    "CapabilityError",
    "JSONRPCErrorCode",
]

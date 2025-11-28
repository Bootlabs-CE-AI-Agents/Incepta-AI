"""Helper functions for MCP Server form rendering (all network transports).

Supports all langchain-mcp-adapters transport types:
- streamable_http: Modern HTTP MCP for /mcp endpoints
- sse: Server-Sent Events for /sse endpoints
- websocket: WebSocket transport for ws:// or wss:// endpoints
- http_sse: Deprecated alias for backward compatibility
"""

from typing import Any

import streamlit as st

from src.admin.utils.mcp_ui_helpers import is_sensitive_header, test_mcp_connection

# Transport types that use HTTP/HTTPS URLs
HTTP_TRANSPORT_TYPES = ("streamable_http", "sse", "http_sse")

# Transport types that use WebSocket URLs
WEBSOCKET_TRANSPORT_TYPES = ("websocket",)


def validate_url(url: str, transport_type: str = "streamable_http") -> tuple[bool, str]:
    """
    Validate URL format based on transport type.

    Args:
        url: URL string to validate
        transport_type: Transport type (streamable_http, sse, websocket, http_sse)

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not url:
        if transport_type in WEBSOCKET_TRANSPORT_TYPES:
            return False, "URL is required for WebSocket transport"
        return False, "URL is required for HTTP-based transport"

    url_lower = url.lower()

    if transport_type in WEBSOCKET_TRANSPORT_TYPES:
        # WebSocket transport requires ws:// or wss://
        if not (url_lower.startswith("ws://") or url_lower.startswith("wss://")):
            return False, "WebSocket URL must start with ws:// or wss://"
    else:
        # HTTP-based transports require http:// or https://
        if not (url_lower.startswith("http://") or url_lower.startswith("https://")):
            return False, "URL must start with http:// or https://"

    return True, ""


def get_url_placeholder(transport_type: str) -> str:
    """
    Get URL placeholder text based on transport type.

    Args:
        transport_type: Transport type

    Returns:
        Appropriate placeholder URL
    """
    placeholders = {
        "streamable_http": "https://api.example.com/mcp",
        "sse": "https://api.example.com/sse",
        "websocket": "wss://api.example.com/ws",
        "http_sse": "https://api.example.com/sse",
    }
    return placeholders.get(transport_type, "https://your-mcp-server.com/mcp")


def get_url_help_text(transport_type: str) -> str:
    """
    Get URL help text based on transport type.

    Args:
        transport_type: Transport type

    Returns:
        Help text for the URL field
    """
    help_texts = {
        "streamable_http": "Modern HTTP MCP endpoint (typically /mcp path)",
        "sse": "Server-Sent Events endpoint (typically /sse path)",
        "websocket": "WebSocket endpoint (must use ws:// or wss://)",
        "http_sse": "⚠️ Deprecated - SSE endpoint (consider using Streamable HTTP)",
    }
    return help_texts.get(transport_type, "MCP server endpoint URL")


def render_http_sse_url_field(
    server_data: dict[str, Any] | None = None,
    transport_type: str = "streamable_http",
) -> str:
    """
    Render URL input field with transport-specific validation.

    Args:
        server_data: Optional existing server data for edit mode
        transport_type: Transport type for validation and placeholders

    Returns:
        The URL value entered by the user
    """
    url = st.text_input(
        "URL *",
        value=server_data.get("url", "") if server_data else "",
        placeholder=get_url_placeholder(transport_type),
        help=get_url_help_text(transport_type),
    )

    # Real-time URL validation indicator
    if url:
        is_valid, error_msg = validate_url(url, transport_type)
        if is_valid:
            st.success("✓ Valid URL format")
        else:
            st.error(f"✗ {error_msg}")

    return url


def render_http_headers_editor() -> None:
    """
    Render dynamic HTTP headers key-value editor.

    Uses st.session_state.http_headers for state management.
    Headers with sensitive keywords are automatically rendered as password inputs.
    """
    st.subheader("HTTP Headers (Optional)")
    st.caption(
        "Add HTTP headers for authentication or other purposes. Common headers: "
        "Authorization, X-API-Key, Content-Type."
    )

    # Number input to control how many header rows to show (BEFORE rendering rows)
    num_headers = st.number_input(
        "Number of HTTP headers",
        min_value=0,
        max_value=20,
        value=len(st.session_state.http_headers),
        step=1,
        help="Use +/- buttons to add or remove HTTP header rows"
    )

    # Adjust http_headers list based on the number input
    current_count = len(st.session_state.http_headers)
    if num_headers > current_count:
        # Add new empty rows
        for _ in range(num_headers - current_count):
            st.session_state.http_headers.append({"key": "", "value": ""})
    elif num_headers < current_count:
        # Remove rows from the end
        st.session_state.http_headers = st.session_state.http_headers[:num_headers]

    # Render header rows (AFTER adjusting the list)
    if st.session_state.http_headers:
        for i, header in enumerate(st.session_state.http_headers):
            col1, col2 = st.columns([2, 2])
            header["key"] = col1.text_input(
                "Header Name",
                value=header.get("key", ""),
                key=f"header_key_{i}",
                label_visibility="collapsed",
                placeholder="Authorization",
            )

            # Use password input for sensitive headers
            input_type = "password" if is_sensitive_header(header.get("key", "")) else "default"
            header["value"] = col2.text_input(
                "Header Value",
                value=header.get("value", ""),
                type=input_type,
                key=f"header_val_{i}",
                label_visibility="collapsed",
                placeholder="Bearer your-token-here",
            )


def render_http_sse_test_section(
    name: str, description: str, transport_type: str, url: str
) -> None:
    """
    Render HTTP+SSE test connection button and results display.

    Args:
        name: Server name
        description: Server description
        transport_type: Transport type (should be 'http_sse')
        url: Server URL
    """
    col1, col2 = st.columns([1, 1])
    with col1:
        if st.button("➕ Add HTTP Header"):
            st.session_state.http_headers.append({"key": "", "value": ""})
            st.rerun()
    with col2:
        if st.button("🧪 Test Connection", type="primary"):
            # Build test payload
            test_payload: dict[str, Any] = {
                "name": name,
                "description": description or None,
                "transport_type": transport_type,
            }

            url_valid, url_error = validate_url(url)
            if not url_valid:
                st.error(f"Cannot test connection: {url_error}")
            else:
                test_payload["url"] = url
                headers_dict = {
                    h["key"]: h["value"] for h in st.session_state.http_headers if h["key"]
                }
                if headers_dict:
                    test_payload["headers"] = headers_dict

                # Execute test
                with st.spinner(f"Testing connection to {url}..."):
                    try:
                        test_result = test_mcp_connection(test_payload)
                        st.session_state.test_results = test_result
                        st.rerun()
                    except Exception as e:
                        st.session_state.test_results = {
                            "success": False,
                            "error": str(e),
                        }
                        st.rerun()

    # Display test results if available
    if st.session_state.test_results:
        st.divider()
        result = st.session_state.test_results
        if result.get("success"):
            st.success("✅ Connection Successful")

            with st.expander("📊 Server Information", expanded=True):
                server_info = result.get("server_info", {})
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("Protocol Version", server_info.get("protocol_version", "N/A"))
                with col2:
                    st.metric("Server Name", server_info.get("server_name", "N/A"))
                with col3:
                    caps = server_info.get("capabilities", [])
                    st.metric("Capabilities", ", ".join(caps) if caps else "None")

            # Display discovered tools
            tools = result.get("discovered_tools", [])
            if tools:
                with st.expander(f"🔧 Discovered Tools ({len(tools)})", expanded=False):
                    for tool in tools:
                        st.markdown(f"**{tool.get('name', 'Unnamed')}**")
                        if tool.get("description"):
                            st.caption(tool["description"])
                        st.divider()

            # Display discovered resources
            resources = result.get("discovered_resources", [])
            if resources:
                with st.expander(f"📁 Discovered Resources ({len(resources)})", expanded=False):
                    for resource in resources:
                        st.markdown(f"- {resource.get('uri', 'N/A')}")
                        if resource.get("description"):
                            st.caption(resource["description"])

            # Display discovered prompts
            prompts = result.get("discovered_prompts", [])
            if prompts:
                with st.expander(f"💬 Discovered Prompts ({len(prompts)})", expanded=False):
                    for prompt in prompts:
                        st.markdown(f"**{prompt.get('name', 'Unnamed')}**")
                        if prompt.get("description"):
                            st.caption(prompt["description"])
        else:
            st.error("❌ Connection Failed")
            error_msg = result.get("error", "Unknown error")
            error_details = result.get("error_details", "")

            st.markdown(f"**Error:** {error_msg}")
            if error_details:
                with st.expander("Error Details"):
                    st.code(error_details)

            # Troubleshooting tips
            with st.expander("🔍 Troubleshooting"):
                st.markdown(
                    """
                **Common Issues:**
                - Verify the URL is correct and accessible from this network
                - Check if the server requires authentication headers
                - Ensure the MCP server is running and responding
                - Verify firewall allows outbound connections to the server
                - Check server logs for errors
                """
                )

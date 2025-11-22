#!/usr/bin/env python3
"""
Test script to verify MCP server creation with Jira MCP server
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get credentials from .env
JIRA_BASE_URL = os.getenv("JIRA_BASE_URL")
JIRA_EMAIL = os.getenv("JIRA_EMAIL")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN")

# API endpoint
API_URL = "http://localhost/api/v1/mcp-servers"

# MCP Server configuration (flat structure matching backend)
mcp_server_data = {
    "name": "Jira Cloud MCP Server",
    "transport_type": "stdio",
    "description": "MCP server for Jira Cloud integration using official @fkesheh/jira-mcp-server",

    # stdio transport fields
    "command": "npx",
    "args": ["-y", "@fkesheh/jira-mcp-server@latest"],
    "env": [
        {"key": "JIRA_URL", "value": JIRA_BASE_URL},
        {"key": "JIRA_USERNAME", "value": JIRA_EMAIL},
        {"key": "JIRA_API_TOKEN", "value": JIRA_API_TOKEN},
        {"key": "JIRA_API_VERSION", "value": "3"}
    ],
    "cwd": None,

    # Optional fields
    "health_check_enabled": True,
    "is_active": True
}

print("=" * 80)
print("Testing MCP Server Creation - Jira Cloud")
print("=" * 80)
print("\nRequest Payload:")
print(json.dumps(mcp_server_data, indent=2))
print("\n" + "=" * 80)

# Make request
try:
    response = requests.post(
        API_URL,
        json=mcp_server_data,
        headers={"Content-Type": "application/json"},
        allow_redirects=False
    )

    print(f"\nHTTP Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")

    if response.status_code == 307:
        print("\n⚠️  Received 307 redirect - Authentication required")
        print(f"Redirect Location: {response.headers.get('Location', 'N/A')}")
        print("\nNote: This is expected. The API requires authentication.")
        print("To test through the UI, please login first at http://localhost/login")

    elif response.status_code == 201:
        print("\n✅ MCP Server created successfully!")
        print("\nResponse:")
        print(json.dumps(response.json(), indent=2))

    elif response.status_code == 422:
        print("\n❌ Validation Error (422)")
        print("\nResponse:")
        print(json.dumps(response.json(), indent=2))

    else:
        print(f"\n❓ Unexpected status code: {response.status_code}")
        print("\nResponse:")
        try:
            print(json.dumps(response.json(), indent=2))
        except:
            print(response.text)

except Exception as e:
    print(f"\n❌ Error: {e}")

print("\n" + "=" * 80)

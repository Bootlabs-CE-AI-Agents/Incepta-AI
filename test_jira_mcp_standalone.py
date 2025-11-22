#!/usr/bin/env python3
"""
Standalone test for Jira MCP Server to verify environment variables work.
This bypasses the database entirely and tests the MCP server directly.
"""
import asyncio
import json
import os
import subprocess
from typing import Dict, Any

# Jira credentials from .env
JIRA_URL = "https://aiopstest1.atlassian.net"
JIRA_USERNAME = "effect-datum8k@icloud.com"
# Read from .env file
with open(".env") as f:
    for line in f:
        if line.startswith("JIRA_API_TOKEN"):
            JIRA_API_TOKEN = line.split("=", 1)[1].strip()
            break

async def test_jira_mcp_server():
    """Test Jira MCP server with environment variables."""
    print("=" * 80)
    print("Testing Jira MCP Server Configuration")
    print("=" * 80)
    print(f"\nJIRA_URL: {JIRA_URL}")
    print(f"JIRA_USERNAME: {JIRA_USERNAME}")
    print(f"JIRA_API_TOKEN: {'*' * 20}... (masked)\n")

    # Prepare environment variables
    env = os.environ.copy()
    env["JIRA_URL"] = JIRA_URL
    env["JIRA_USERNAME"] = JIRA_USERNAME
    env["JIRA_API_TOKEN"] = JIRA_API_TOKEN

    # MCP initialization request
    init_request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "test-client",
                "version": "1.0.0"
            }
        }
    }

    # List tools request
    list_tools_request = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list",
        "params": {}
    }

    print("Starting Jira MCP Server...")
    print("Command: docker run --rm -i ghcr.io/sooperset/mcp-atlassian:latest\n")

    try:
        # Start the MCP server process
        process = await asyncio.create_subprocess_exec(
            "docker", "run", "--rm", "-i",
            "ghcr.io/sooperset/mcp-atlassian:latest",
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env
        )

        # Send initialize request
        init_json = json.dumps(init_request) + "\n"
        print(f"Sending initialize request...")
        process.stdin.write(init_json.encode())
        await process.stdin.drain()

        # Read initialize response
        init_response = await asyncio.wait_for(
            process.stdout.readline(),
            timeout=10.0
        )
        init_data = json.loads(init_response)
        print(f"✅ Initialize response received:")
        print(json.dumps(init_data, indent=2)[:500] + "...\n")

        # Send tools/list request
        list_tools_json = json.dumps(list_tools_request) + "\n"
        print(f"Sending tools/list request...")
        process.stdin.write(list_tools_json.encode())
        await process.stdin.drain()

        # Read tools/list response
        tools_response = await asyncio.wait_for(
            process.stdout.readline(),
            timeout=10.0
        )
        tools_data = json.loads(tools_response)

        if "result" in tools_data and "tools" in tools_data["result"]:
            tools = tools_data["result"]["tools"]
            print(f"\n✅ SUCCESS! Discovered {len(tools)} Jira tools:")
            print("=" * 80)
            for i, tool in enumerate(tools[:10], 1):  # Show first 10
                print(f"{i}. {tool['name']}: {tool.get('description', 'No description')[:60]}...")
            if len(tools) > 10:
                print(f"... and {len(tools) - 10} more tools")
            print("=" * 80)
        else:
            print(f"\n❌ FAILED: No tools discovered")
            print(json.dumps(tools_data, indent=2))

        # Close process
        process.stdin.close()
        await process.wait()

    except asyncio.TimeoutError:
        print("\n❌ ERROR: Request timed out (10 seconds)")
        print("This may indicate the MCP server is not responding or credentials are invalid")
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {e}")
    finally:
        if process.returncode is None:
            process.kill()
            await process.wait()

if __name__ == "__main__":
    asyncio.run(test_jira_mcp_server())

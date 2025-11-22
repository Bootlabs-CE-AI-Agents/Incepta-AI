# MCP Server Environment Variables Issue

**Date:** November 22, 2025
**Status:** 🔍 ROOT CAUSE IDENTIFIED
**Priority:** HIGH

---

## Problem Summary

The Jira MCP Server is showing **0 tools discovered** even though:
- ✅ Server initializes successfully (status: "active")
- ✅ Environment variables are correctly stored in database
- ✅ Arguments are properly formatted
- ✅ Manual testing with Docker shows 26 tools discovered

## Root Cause Analysis

### The Issue

When the MCP server command is `docker`, the environment variables from the database are being passed to the **Docker CLI process**, not to the **container that Docker spawns**.

### Current Behavior

```python
# In MCPStdioClient.__aenter__() (mcp_stdio_client.py:329)
full_env = {**os.environ, **self.env}

self.process = await asyncio.create_subprocess_exec(
    self.command,      # "docker"
    *self.args,        # ["run", "--rm", "-i", "ghcr.io/sooperset/mcp-atlassian:latest"]
    stdin=asyncio.subprocess.PIPE,
    stdout=asyncio.subprocess.PIPE,
    stderr=asyncio.subprocess.PIPE,
    env=full_env,      # ❌ PROBLEM: Envvars set for docker CLI, not the container!
)
```

This executes:
```bash
# Environment variables are set for the Docker CLI process:
JIRA_URL=... JIRA_USERNAME=... JIRA_API_TOKEN=... docker run --rm -i ghcr.io/sooperset/mcp-atlassian:latest
```

But the Jira MCP server **inside the container** never receives these variables!

### What Should Happen

For Docker commands, environment variables need to be passed as `-e` flags:

```bash
docker run --rm -i \
  -e JIRA_URL="https://aiopstest1.atlassian.net" \
  -e JIRA_USERNAME="effect-datum8k@icloud.com" \
  -e JIRA_API_TOKEN="ATATT..." \
  ghcr.io/sooperset/mcp-atlassian:latest
```

---

## Evidence

### Manual Test (SUCCESS) ✅

```bash
$ docker run --rm -i \
  -e JIRA_URL="https://aiopstest1.atlassian.net" \
  -e JIRA_USERNAME="effect-datum8k@icloud.com" \
  -e JIRA_API_TOKEN="ATATT..." \
  ghcr.io/sooperset/mcp-atlassian:latest <<'EOF'
{"jsonrpc":"2.0","id":1,"method":"initialize",...}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
EOF

Response: {"tools":[...]} # 26 tools discovered! ✅
```

### Automatic Discovery (FAILURE) ❌

```json
{
  "discovered_tools": [],  // Empty!
  "status": "active"
}
```

Server starts successfully but discovers 0 tools because it has no Jira credentials.

---

## Proposed Solutions

### Option A: Smart Environment Variable Handling (RECOMMENDED)

Detect when `command == "docker"` and automatically convert environment variables to `-e` flags:

```python
# In MCPStdioClient.__aenter__()
if self.command == "docker" and self.env:
    # For Docker commands, inject env vars as -e flags
    env_args = []
    for key, value in self.env.items():
        env_args.extend(["-e", f"{key}={value}"])

    # Insert env args after "run" but before image name
    # Find index of image (last non-flag arg)
    modified_args = list(self.args)
    # Insert -e flags before the image name (usually the last arg)
    image_index = len(modified_args) - 1
    for i in range(len(modified_args) - 1, -1, -1):
        if not modified_args[i].startswith("-"):
            image_index = i
            break

    # Insert env_args before the image
    final_args = modified_args[:image_index] + env_args + [modified_args[image_index]]

    self.process = await asyncio.create_subprocess_exec(
        self.command,
        *final_args,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=os.environ,  # Only system env, not our custom env
    )
else:
    # For non-Docker commands, use original behavior
    full_env = {**os.environ, **self.env}
    self.process = await asyncio.create_subprocess_exec(
        self.command,
        *self.args,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=full_env,
    )
```

**Pros:**
- Minimal changes to existing code
- Automatically handles Docker-specific requirements
- Backward compatible with non-Docker commands (npx, python, node)

**Cons:**
- Adds complexity to client code
- Assumes a specific Docker args format

### Option B: Store Docker Env Flags in Args Field

Change how Docker MCP servers are stored - include `-e` flags in the `args` field:

```json
{
  "command": "docker",
  "args": [
    "run", "--rm", "-i",
    "-e", "JIRA_URL=https://aiopstest1.atlassian.net",
    "-e", "JIRA_USERNAME=effect-datum8k@icloud.com",
    "-e", "JIRA_API_TOKEN=ATATT...",
    "ghcr.io/sooperset/mcp-atlassian:latest"
  ],
  "env": {}  // Empty for Docker commands
}
```

**Pros:**
- No changes to MCPStdioClient code
- Explicit and clear what's being executed
- Works with current implementation

**Cons:**
- Exposes sensitive tokens in `args` field (less semantic separation)
- UI would need to handle this differently for Docker vs non-Docker
- Harder to update environment variables (need to parse args array)

### Option C: New Transport Type for Docker

Create a separate `docker_stdio` transport type with custom handling:

```python
class MCPDockerClient(MCPStdioClient):
    def _build_docker_args(self) -> list[str]:
        args = list(self.args)
        env_args = []
        for key, value in self.env.items():
            env_args.extend(["-e", f"{key}={value}"])
        # Insert env args before image
        ...
        return final_args
```

**Pros:**
- Clean separation of concerns
- Most semantically correct
- Easy to extend with Docker-specific features (volumes, ports, etc.)

**Cons:**
- More code changes
- Requires database migration for transport_type enum
- More complex architecture

---

## Recommendation

**Implement Option A** as an immediate fix. It's:
- ✅ Minimal code changes
- ✅ Backward compatible
- ✅ Solves the immediate problem
- ✅ Can be refactored to Option C later if needed

---

## Implementation Plan

### Step 1: Update MCPStdioClient

File: `src/services/mcp_stdio_client.py`

Add Docker detection logic in `__aenter__()` method around line 329.

### Step 2: Add Tests

Create test cases:
1. Test Docker command with environment variables
2. Test non-Docker command with environment variables (npx, python)
3. Test Docker command without environment variables

### Step 3: Update Documentation

Document the Docker-specific behavior in:
- `src/services/mcp_stdio_client.py` docstrings
- Story 11.1.4 implementation notes

### Step 4: Verify Fix

1. Restart API container
2. Click "Run Test" on Jira MCP Server
3. Verify tools are discovered
4. Check discovered_tools in database

---

## Related Files

- `src/services/mcp_stdio_client.py:318-399` - Process spawning logic
- `src/services/mcp_server_service.py:253-400` - Discovery workflow
- `src/database/models.py` - MCPServer model with env field
- `docs/MCP-SERVER-ARGS-FIX.md` - Previous args formatting fix

---

## Current MCP Server Configuration

```sql
SELECT id, command, args, env::text
FROM mcp_servers
WHERE name = 'Jira MCP Server';

command: "docker"
args: ["run", "--rm", "-i", "ghcr.io/sooperset/mcp-atlassian:latest"]
env: {
  "JIRA_URL": "https://aiopstest1.atlassian.net",
  "JIRA_USERNAME": "effect-datum8k@icloud.com",
  "JIRA_API_TOKEN": "ATATT3xFfGF0Zw5Pd-TuPE1qwinlC7pSKwL_..."
}
```

---

**This fix will enable proper tool discovery for all Docker-based MCP servers.**

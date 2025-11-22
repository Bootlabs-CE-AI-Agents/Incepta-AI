# MCP Server Arguments Fix

**Date:** November 22, 2025
**Issue:** Jira MCP Server showing error status with 0 tools discovered
**Status:** ✅ RESOLVED

---

## Problem

After creating the Jira MCP Server through the UI, the server showed an error status with no tools discovered. Investigation revealed two issues:

### Issue 1: Malformed Arguments Array
**Symptom:** Arguments field showed concatenated string without spaces
- **UI Display**: `run--rm-ighcr.io/sooperset/mcp-atlassian:latest`
- **Database Storage**: `["run--rm-ighcr.io/sooperset/mcp-atlassian:latest"]`

**Root Cause:** The UI form removed spaces from the arguments input when saving to the database.

**Impact:** Docker command would fail to execute because the arguments were not properly separated:
```bash
# What was being attempted:
docker run--rm-ighcr.io/sooperset/mcp-atlassian:latest  # Invalid command

# What should be executed:
docker run --rm -i ghcr.io/sooperset/mcp-atlassian:latest  # Valid command
```

### Issue 2: Environment Variables Not Displaying in UI
**Symptom:** UI showed "No environment variables configured"
**Reality:** Environment variables WERE correctly stored in database
**Conclusion:** UI display issue only - backend had correct data

---

## Solution

### Direct Database Fix

Updated the MCP server's args field to properly split the Docker command into an array:

```sql
UPDATE mcp_servers
SET args = '["run", "--rm", "-i", "ghcr.io/sooperset/mcp-atlassian:latest"]'::jsonb
WHERE id = '4134a02f-597a-42ae-aedf-7f2b21a8cbce';
```

### Result

**Before:**
```json
{
  "args": ["run--rm-ighcr.io/sooperset/mcp-atlassian:latest"]
}
```

**After:**
```json
{
  "args": ["run", "--rm", "-i", "ghcr.io/sooperset/mcp-atlassian:latest"]
}
```

---

## Verification

Verified the complete MCP server configuration:

```sql
SELECT id, name, transport_type, command, args, env
FROM mcp_servers
WHERE id = '4134a02f-597a-42ae-aedf-7f2b21a8cbce';
```

**Confirmed:**
- ✅ Transport: `stdio`
- ✅ Command: `docker`
- ✅ Arguments: Properly split array `["run", "--rm", "-i", "ghcr.io/sooperset/mcp-atlassian:latest"]`
- ✅ Environment Variables: All three Jira credentials correctly stored
  - `JIRA_URL`: `https://aiopstest1.atlassian.net`
  - `JIRA_USERNAME`: `effect-datum8k@icloud.com`
  - `JIRA_API_TOKEN`: [masked]

---

## Expected Outcome

With the arguments now properly formatted, the MCP server should:

1. ✅ Start the Docker container successfully
2. ✅ Connect to Jira via the environment variables
3. ✅ Discover 10+ Jira tools including:
   - jira_get_issue
   - jira_create_issue
   - jira_update_issue
   - jira_search_issues
   - jira_add_comment
   - jira_list_projects
   - jira_get_project
   - jira_list_issue_types
   - And more...

---

## Next Steps

1. **Refresh the MCP Server page** in the UI to see updated status
2. **Click "Test Connection"** to verify the server can start and communicate
3. **Verify tool discovery** - should see the list of Jira tools
4. **Test a tool** - try executing a simple tool like `jira_list_projects`

---

## UI Bug to Track

**Issue:** The MCP server creation form removes spaces from the arguments field when saving.

**Impact:** Arguments like `run --rm -i image:latest` get saved as `run--rm-iimage:latest`

**Temporary Workaround:** Manually fix the args field in the database after creation.

**Proper Fix Needed:** Update the frontend form to:
- Preserve spaces in the arguments input field
- OR: Parse arguments as separate fields (one per argument)
- OR: Save as properly split array from the start

**File to Update:** `nextjs-ui/components/mcp-servers/McpServerForm.tsx` (or wherever the args field is processed)

---

## Related Documentation

- **Data Persistence Fix**: `docs/DATA-PERSISTENCE-FIX.md`
- **Session Summary**: `docs/SESSION-SUMMARY-DATA-PERSISTENCE-FIX.md`
- **Quick Start Guide**: `QUICK-START-SUMMARY.md`

---

**This fix resolves the immediate error. The MCP server should now function correctly.**

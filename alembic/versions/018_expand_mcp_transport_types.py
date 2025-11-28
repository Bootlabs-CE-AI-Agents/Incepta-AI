"""expand_mcp_transport_types

Revision ID: 018
Revises: 017
Create Date: 2025-11-28

Story: MCP Transport Type Enhancement
Description: Expand MCP server transport_type CHECK constraint to support all
langchain-mcp-adapters transport types:
- stdio: Local subprocess (unchanged)
- streamable_http: Modern HTTP MCP for /mcp endpoints (e.g., Exa AI)
- sse: Server-Sent Events for /sse endpoints (legacy)
- websocket: WebSocket transport
- http_sse: Deprecated alias for backward compatibility

This migration:
1. Drops the old CHECK constraint
2. Creates new CHECK constraint with expanded transport types
3. Migrates existing 'http_sse' values to 'streamable_http' for clarity
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '018'
down_revision: Union[str, Sequence[str], None] = '017'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Expand transport_type CHECK constraint and migrate http_sse to streamable_http.

    Steps:
    1. Drop the old CHECK constraint
    2. Migrate existing 'http_sse' values to 'streamable_http'
    3. Create new CHECK constraint with all transport types
    """

    # Step 1: Drop the old CHECK constraint
    op.drop_constraint('ck_mcp_servers_transport_type', 'mcp_servers', type_='check')

    # Step 2: Migrate existing 'http_sse' values to 'streamable_http'
    # This provides a cleaner migration path and aligns with langchain-mcp-adapters naming
    op.execute(
        """
        UPDATE mcp_servers
        SET transport_type = 'streamable_http'
        WHERE transport_type = 'http_sse'
        """
    )

    # Step 3: Create new CHECK constraint with all transport types
    # Including 'http_sse' for backward compatibility with any external integrations
    op.create_check_constraint(
        'ck_mcp_servers_transport_type',
        'mcp_servers',
        "transport_type IN ('stdio', 'streamable_http', 'sse', 'websocket', 'http_sse')"
    )

    # Update the column comment to reflect new transport types
    op.alter_column(
        'mcp_servers',
        'transport_type',
        comment='Transport protocol: stdio, streamable_http, sse, websocket (http_sse deprecated)'
    )


def downgrade() -> None:
    """
    Revert to original transport_type CHECK constraint.

    Steps:
    1. Drop the expanded CHECK constraint
    2. Migrate 'streamable_http' values back to 'http_sse'
    3. Remove any invalid transport types (sse, websocket) by setting to http_sse
    4. Recreate original CHECK constraint

    WARNING: This may cause data loss if servers use new transport types.
    """

    # Step 1: Drop the expanded CHECK constraint
    op.drop_constraint('ck_mcp_servers_transport_type', 'mcp_servers', type_='check')

    # Step 2: Migrate 'streamable_http' back to 'http_sse'
    op.execute(
        """
        UPDATE mcp_servers
        SET transport_type = 'http_sse'
        WHERE transport_type = 'streamable_http'
        """
    )

    # Step 3: Migrate 'sse' to 'http_sse' (closest equivalent)
    op.execute(
        """
        UPDATE mcp_servers
        SET transport_type = 'http_sse'
        WHERE transport_type = 'sse'
        """
    )

    # Step 4: Migrate 'websocket' to 'http_sse' (may not work, but preserves record)
    op.execute(
        """
        UPDATE mcp_servers
        SET transport_type = 'http_sse'
        WHERE transport_type = 'websocket'
        """
    )

    # Step 5: Recreate original CHECK constraint
    op.create_check_constraint(
        'ck_mcp_servers_transport_type',
        'mcp_servers',
        "transport_type IN ('stdio', 'http_sse')"
    )

    # Revert column comment
    op.alter_column(
        'mcp_servers',
        'transport_type',
        comment='Transport protocol: stdio or http_sse'
    )

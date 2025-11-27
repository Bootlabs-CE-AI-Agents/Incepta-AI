"""add_agent_type_to_agents

Revision ID: 017
Revises: 016
Create Date: 2025-11-27

Story: Agent Type System
Description: Add type column to agents table to support different agent types
(tool_based, conversational, langgraph, custom). This enables flexible agent
initialization and system prompt customization based on agent purpose.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '017'
down_revision: Union[str, Sequence[str], None] = 'a71b1cebc0e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add type column to agents table.

    Default value is 'tool_based' to maintain backward compatibility.
    This field determines how the agent is initialized and how tools are presented.
    """
    op.add_column(
        'agents',
        sa.Column(
            'type',
            sa.String(length=50),
            nullable=False,
            server_default='tool_based',
            comment='Agent type: tool_based, conversational, langgraph, custom'
        )
    )

    # Add index for agent type queries
    op.create_index(
        'idx_agents_type',
        'agents',
        ['type'],
        mysql_length={'type': None}
    )


def downgrade() -> None:
    """
    Remove type column and index from agents table.
    """
    op.drop_index('idx_agents_type', table_name='agents')
    op.drop_column('agents', 'type')

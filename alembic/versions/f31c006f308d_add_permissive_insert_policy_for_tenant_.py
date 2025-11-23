"""add_permissive_insert_policy_for_tenant_configs

Revision ID: f31c006f308d
Revises: f031ea488d6d
Create Date: 2025-11-23 09:31:32.665090

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f31c006f308d'
down_revision: Union[str, Sequence[str], None] = 'f031ea488d6d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add permissive INSERT policy for tenant_configs to allow admin operations.

    This policy allows INSERT operations when the tenant context is NOT set
    (i.e., when current_setting('app.current_tenant_id', true) IS NULL).

    This enables admin operations like tenant creation to bypass the tenant
    isolation policy, which requires tenant_id to match the current context.

    Multiple permissive policies are combined with OR logic, so:
    - If context IS NULL → this policy allows INSERT
    - If context IS SET → existing tenant_isolation_policy checks tenant_id match
    """
    op.execute("""
        CREATE POLICY tenant_configs_admin_insert_policy
        ON tenant_configs
        FOR INSERT
        WITH CHECK (current_setting('app.current_tenant_id', true) IS NULL)
    """)


def downgrade() -> None:
    """Remove the permissive INSERT policy for tenant_configs."""
    op.execute("""
        DROP POLICY IF EXISTS tenant_configs_admin_insert_policy ON tenant_configs
    """)

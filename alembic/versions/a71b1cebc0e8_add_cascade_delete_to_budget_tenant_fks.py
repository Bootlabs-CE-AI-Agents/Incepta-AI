"""add_cascade_delete_to_budget_tenant_fks

Revision ID: a71b1cebc0e8
Revises: 8d35e254eac5
Create Date: 2025-11-24 16:54:41.566364

Description: Add CASCADE delete to budget_overrides and budget_alert_history
foreign key constraints to allow tenant deletion without constraint violations.

When a tenant is deleted, all related budget records are automatically deleted.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a71b1cebc0e8'
down_revision: Union[str, Sequence[str], None] = '8d35e254eac5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add CASCADE delete to budget table foreign keys."""

    # 1. Drop existing FK constraint on budget_overrides
    op.drop_constraint(
        'fk_budget_overrides_tenant',
        'budget_overrides',
        type_='foreignkey'
    )

    # 2. Recreate FK with CASCADE delete
    op.create_foreign_key(
        'fk_budget_overrides_tenant',
        'budget_overrides',
        'tenant_configs',
        ['tenant_id'],
        ['tenant_id'],
        ondelete='CASCADE'
    )

    # 3. Drop existing FK constraint on budget_alert_history
    op.drop_constraint(
        'fk_budget_alert_history_tenant',
        'budget_alert_history',
        type_='foreignkey'
    )

    # 4. Recreate FK with CASCADE delete
    op.create_foreign_key(
        'fk_budget_alert_history_tenant',
        'budget_alert_history',
        'tenant_configs',
        ['tenant_id'],
        ['tenant_id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    """Revert to FK constraints without CASCADE."""

    # Revert budget_alert_history
    op.drop_constraint(
        'fk_budget_alert_history_tenant',
        'budget_alert_history',
        type_='foreignkey'
    )

    op.create_foreign_key(
        'fk_budget_alert_history_tenant',
        'budget_alert_history',
        'tenant_configs',
        ['tenant_id'],
        ['tenant_id']
        # No ondelete - defaults to RESTRICT
    )

    # Revert budget_overrides
    op.drop_constraint(
        'fk_budget_overrides_tenant',
        'budget_overrides',
        type_='foreignkey'
    )

    op.create_foreign_key(
        'fk_budget_overrides_tenant',
        'budget_overrides',
        'tenant_configs',
        ['tenant_id'],
        ['tenant_id']
        # No ondelete - defaults to RESTRICT
    )

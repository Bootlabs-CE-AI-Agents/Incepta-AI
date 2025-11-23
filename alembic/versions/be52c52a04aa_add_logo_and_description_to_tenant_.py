"""add_logo_and_description_to_tenant_configs

Revision ID: be52c52a04aa
Revises: f31c006f308d
Create Date: 2025-11-23 11:50:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be52c52a04aa'
down_revision: Union[str, Sequence[str], None] = 'f31c006f308d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add logo and description columns to tenant_configs."""
    op.add_column('tenant_configs', sa.Column('description', sa.Text(), nullable=True, comment='Optional description of the tenant\'s purpose'))
    op.add_column('tenant_configs', sa.Column('logo', sa.Text(), nullable=True, comment='URL or base64-encoded image for tenant logo'))


def downgrade() -> None:
    """Remove logo and description columns from tenant_configs."""
    op.drop_column('tenant_configs', 'logo')
    op.drop_column('tenant_configs', 'description')

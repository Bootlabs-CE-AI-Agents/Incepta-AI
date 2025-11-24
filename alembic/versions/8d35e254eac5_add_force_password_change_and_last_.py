"""add_force_password_change_and_last_login_to_users

Revision ID: 8d35e254eac5
Revises: be52c52a04aa
Create Date: 2025-11-23 23:03:19.664323

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d35e254eac5'
down_revision: Union[str, Sequence[str], None] = 'be52c52a04aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add force_password_change and last_login_at columns to users table.

    - force_password_change: Boolean flag for temporary password enforcement (AC-5)
    - last_login_at: Timestamp of last successful login (AC-1 response field)
    """
    # Add force_password_change column (default False)
    op.add_column(
        'users',
        sa.Column(
            'force_password_change',
            sa.Boolean(),
            nullable=False,
            server_default='false',
            doc='Require password change on next login (for admin resets)',
        )
    )

    # Add last_login_at column (nullable, updated on successful login)
    op.add_column(
        'users',
        sa.Column(
            'last_login_at',
            sa.DateTime(timezone=True),
            nullable=True,
            doc='Timestamp of last successful login',
        )
    )


def downgrade() -> None:
    """Remove force_password_change and last_login_at columns from users table."""
    op.drop_column('users', 'last_login_at')
    op.drop_column('users', 'force_password_change')

"""
Script to set/reset the admin user password.
Usage: python scripts/set_admin_password.py
"""
import asyncio
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from passlib.context import CryptContext
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from src.database.models import User

# Use same password context as AuthService
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=10,
)


async def set_admin_password():
    """Set admin user password to 'admin123' (or from env)."""
    # Get database URL from environment
    database_url = os.getenv(
        "AI_AGENTS_DATABASE_URL",
        "postgresql+asyncpg://aiagents:password@localhost:5432/ai_agents"
    )

    # Default password
    new_password = os.getenv("ADMIN_PASSWORD", "admin123")
    admin_email = "admin@example.com"

    print(f"🔐 Setting password for user: {admin_email}")
    print(f"🔑 Password will be: {new_password}")

    # Create async engine
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        # Check if user exists
        result = await session.execute(
            select(User).where(User.email == admin_email)
        )
        user = result.scalar_one_or_none()

        if not user:
            print(f"❌ User {admin_email} not found in database")
            print("   Creating new admin user...")

            # Get default tenant ID
            default_tenant_id = os.getenv(
                "AI_AGENTS_DEFAULT_TENANT_ID",
                "00000000-0000-0000-0000-000000000000"
            )

            from uuid import UUID
            new_user = User(
                email=admin_email,
                password_hash=pwd_context.hash(new_password),
                default_tenant_id=UUID(default_tenant_id),
                is_active=True,
            )
            session.add(new_user)
            await session.commit()
            print(f"✅ Created new admin user: {admin_email}")
        else:
            # Hash the new password
            password_hash = pwd_context.hash(new_password)

            # Update user password
            await session.execute(
                update(User)
                .where(User.email == admin_email)
                .values(
                    password_hash=password_hash,
                    failed_login_attempts=0,  # Reset login attempts
                    locked_until=None,  # Unlock account
                    is_active=True,  # Ensure active
                )
            )
            await session.commit()
            print(f"✅ Password updated for user: {admin_email}")

    await engine.dispose()

    print("\n" + "="*60)
    print("Admin credentials:")
    print(f"  Email: {admin_email}")
    print(f"  Password: {new_password}")
    print("="*60)
    print("\nYou can now login with these credentials!")


if __name__ == "__main__":
    asyncio.run(set_admin_password())

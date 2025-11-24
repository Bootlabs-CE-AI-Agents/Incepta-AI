#!/usr/bin/env python3
"""
Create admin user for AI Ops platform.

This script creates an admin user with super_admin role for both default and production tenants.
"""
import asyncio
import sys
from datetime import datetime, timedelta, UTC
from uuid import UUID

import bcrypt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker


# Database configuration
DATABASE_URL = "postgresql+asyncpg://aiagents:password@localhost:5433/ai_agents"

# Admin user configuration
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "Admin123!@#"  # Strong password meeting requirements
DEFAULT_TENANT_UUID = UUID("9ceb3797-714b-456a-8a01-abeacca4f525")
PRODUCTION_TENANT_UUID = UUID("fca1dbb2-adb9-4f4e-b613-0fae99b15268")


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


async def create_admin_user():
    """Create admin user with super_admin role."""
    # Create async engine
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        try:
            # Check if user already exists
            result = await session.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": ADMIN_EMAIL},
            )
            existing_user = result.scalar_one_or_none()

            if existing_user:
                print(f"✓ User {ADMIN_EMAIL} already exists with ID: {existing_user}")
                user_id = existing_user
            else:
                # Hash password
                password_hash = hash_password(ADMIN_PASSWORD)
                password_expires_at = datetime.now(UTC) + timedelta(days=90)

                # Insert user
                result = await session.execute(
                    text("""
                        INSERT INTO users (
                            email,
                            password_hash,
                            default_tenant_id,
                            password_expires_at,
                            failed_login_attempts,
                            password_history,
                            is_active
                        )
                        VALUES (
                            :email,
                            :password_hash,
                            :default_tenant_id,
                            :password_expires_at,
                            0,
                            '[]'::json,
                            true
                        )
                        RETURNING id
                    """),
                    {
                        "email": ADMIN_EMAIL,
                        "password_hash": password_hash,
                        "default_tenant_id": DEFAULT_TENANT_UUID,
                        "password_expires_at": password_expires_at,
                    },
                )
                user_id = result.scalar_one()
                print(f"✓ Created user {ADMIN_EMAIL} with ID: {user_id}")

            # Assign super_admin role for default tenant
            result = await session.execute(
                text("""
                    SELECT id FROM user_tenant_roles
                    WHERE user_id = :user_id AND tenant_id = :tenant_id
                """),
                {"user_id": user_id, "tenant_id": "default"},
            )
            existing_default_role = result.scalar_one_or_none()

            if not existing_default_role:
                await session.execute(
                    text("""
                        INSERT INTO user_tenant_roles (user_id, tenant_id, role)
                        VALUES (:user_id, :tenant_id, :role)
                    """),
                    {
                        "user_id": user_id,
                        "tenant_id": "default",
                        "role": "super_admin",
                    },
                )
                print(f"✓ Assigned super_admin role for 'default' tenant")
            else:
                print(f"✓ User already has role for 'default' tenant")

            # Assign super_admin role for production tenant
            result = await session.execute(
                text("""
                    SELECT id FROM user_tenant_roles
                    WHERE user_id = :user_id AND tenant_id = :tenant_id
                """),
                {"user_id": user_id, "tenant_id": "production"},
            )
            existing_prod_role = result.scalar_one_or_none()

            if not existing_prod_role:
                await session.execute(
                    text("""
                        INSERT INTO user_tenant_roles (user_id, tenant_id, role)
                        VALUES (:user_id, :tenant_id, :role)
                    """),
                    {
                        "user_id": user_id,
                        "tenant_id": "production",
                        "role": "super_admin",
                    },
                )
                print(f"✓ Assigned super_admin role for 'production' tenant")
            else:
                print(f"✓ User already has role for 'production' tenant")

            # Commit transaction
            await session.commit()

            print("\n" + "=" * 60)
            print("Admin user created successfully!")
            print("=" * 60)
            print(f"Email: {ADMIN_EMAIL}")
            print(f"Password: {ADMIN_PASSWORD}")
            print(f"User ID: {user_id}")
            print(f"Default Tenant: default ({DEFAULT_TENANT_UUID})")
            print(f"Roles: super_admin (default, production)")
            print("=" * 60)

        except Exception as e:
            await session.rollback()
            print(f"✗ Error creating admin user: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_admin_user())

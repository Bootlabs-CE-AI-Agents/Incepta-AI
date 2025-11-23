"""Create admin user for AI Agents Platform."""
import asyncio
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.database.session import get_async_session
from src.services.user_service import UserService
from src.schemas.user import UserCreate


async def create_admin_user():
    """Create the default admin user."""
    async for db in get_async_session():
        user_service = UserService()

        try:
            # Create admin user
            admin_data = UserCreate(
                email="admin@example.com",
                password="adminadminadmin",
                is_active=True
            )

            user = await user_service.create_user(admin_data, db)
            print(f"✓ Created admin user: {user.email}")
            print(f"  User ID: {user.id}")
            print(f"  Active: {user.is_active}")

        except Exception as e:
            print(f"✗ Error creating admin user: {e}")
            raise
        finally:
            await db.close()


if __name__ == "__main__":
    asyncio.run(create_admin_user())

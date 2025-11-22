import asyncio
import os
import sys
from pathlib import Path
import bcrypt
from datetime import datetime, timedelta

print("Starting direct admin creation...", flush=True)

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker
from src.database.models import User, UserTenantRole, RoleEnum

async def main():
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")
    default_tenant_id = os.getenv("DEFAULT_TENANT_ID")
    database_url = os.getenv("AI_AGENTS_DATABASE_URL")

    print(f"Creating user {email} for tenant {default_tenant_id}", flush=True)
    
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("Checking for existing user...", flush=True)
        result = await session.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"User already exists with ID: {existing_user.id}", flush=True)
            return

        print("Hashing password...", flush=True)
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt(rounds=10)
        hashed = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
        print("Password hashed.", flush=True)

        user = User(
            email=email,
            password_hash=hashed,
            default_tenant_id=default_tenant_id,
            failed_login_attempts=0,
            password_expires_at=datetime.utcnow() + timedelta(days=90),
            password_history=[],
        )
        session.add(user)
        await session.flush()
        print(f"User inserted with ID: {user.id}", flush=True)

        role = UserTenantRole(
            user_id=user.id,
            tenant_id=default_tenant_id,
            role=RoleEnum.SUPER_ADMIN.value,
        )
        session.add(role)
        await session.commit()
        print("User and role committed successfully.", flush=True)

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())

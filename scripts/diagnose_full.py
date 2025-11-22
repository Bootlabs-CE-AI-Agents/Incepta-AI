import asyncio
import os
import sys
from pathlib import Path
import bcrypt
from datetime import datetime, timedelta

print("Starting full diagnosis...", flush=True)

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from src.database.models import User, UserTenantRole, RoleEnum

async def main():
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")
    default_tenant_id = os.getenv("DEFAULT_TENANT_ID")
    database_url = os.getenv("AI_AGENTS_DATABASE_URL")

    print("Step 1: Hashing password...", flush=True)
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
    print("Step 1: Password hashed.", flush=True)

    print("Step 2: Creating Engine...", flush=True)
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    print("Step 2: Engine created.", flush=True)

    print("Step 3: Opening Session...", flush=True)
    async with async_session() as session:
        print("Step 3: Session opened.", flush=True)
        
        print("Step 4: Creating User Object...", flush=True)
        user = User(
            email=email,
            password_hash=hashed,
            default_tenant_id=default_tenant_id,
            failed_login_attempts=0,
            password_expires_at=datetime.utcnow() + timedelta(days=90),
            password_history=[],
        )
        print("Step 4: User object created.", flush=True)

        print("Step 5: Adding to session...", flush=True)
        session.add(user)
        print("Step 5: Added to session.", flush=True)

        print("Step 6: Flushing...", flush=True)
        await session.flush()
        print(f"Step 6: Flushed. User ID: {user.id}", flush=True)

        print("Step 7: Creating Role...", flush=True)
        role = UserTenantRole(
            user_id=user.id,
            tenant_id=default_tenant_id,
            role=RoleEnum.SUPER_ADMIN.value,
        )
        session.add(role)
        print("Step 7: Role added.", flush=True)

        print("Step 8: Committing...", flush=True)
        await session.commit()
        print("Step 8: Committed.", flush=True)

    await engine.dispose()
    print("Done.", flush=True)

if __name__ == "__main__":
    asyncio.run(main())

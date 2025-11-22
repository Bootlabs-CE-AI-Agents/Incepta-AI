import sys
import os
from pathlib import Path

print("Starting full import debug...", flush=True)

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

print("Importing bcrypt...", flush=True)
import bcrypt
print("Bcrypt imported.", flush=True)

print("Importing sqlalchemy...", flush=True)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
print("Sqlalchemy imported.", flush=True)

print("Importing src.database.models...", flush=True)
from src.database.models import User, UserTenantRole, RoleEnum
print("src.database.models imported.", flush=True)

print("All imports successful.", flush=True)

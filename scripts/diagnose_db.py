import asyncio
import os
import sys
from pathlib import Path

print("Starting diagnosis script...", flush=True)

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    database_url = os.getenv("AI_AGENTS_DATABASE_URL")
    print(f"DB URL: {database_url.split('@')[1] if '@' in database_url else 'NOT SET'}", flush=True)
    
    try:
        engine = create_async_engine(database_url, echo=False)
        async with engine.connect() as conn:
            print("Attempting connection...", flush=True)
            result = await conn.execute(text("SELECT 1"))
            print(f"Connection successful! Result: {result.scalar()}", flush=True)
        await engine.dispose()
    except Exception as e:
        print(f"Connection failed: {e}", flush=True)

if __name__ == "__main__":
    asyncio.run(main())

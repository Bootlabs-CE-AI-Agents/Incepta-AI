"""Reset admin password script"""
import asyncio
from sqlalchemy import select
from src.database.session import get_async_session_maker
from src.database.models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

async def reset_password():
    session_maker = get_async_session_maker()
    async with session_maker() as db:
        stmt = select(User).where(User.email == 'admin@example.com')
        result = await db.execute(stmt)
        user = result.scalar_one()

        # Hash the password properly
        user.password_hash = pwd_context.hash('adminadminadmin')
        user.failed_login_attempts = 0
        user.locked_until = None

        await db.commit()
        print(f'Password reset successfully for {user.email}')
        print(f'Hash starts with: {user.password_hash[:20]}')

if __name__ == '__main__':
    asyncio.run(reset_password())

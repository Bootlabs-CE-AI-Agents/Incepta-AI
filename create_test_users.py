"""Create test users for comprehensive testing of Users Management Page"""
import asyncio
from datetime import datetime, timedelta
from uuid import UUID
from sqlalchemy import select
from src.database.session import get_async_session_maker
from src.database.models import User, UserTenantRole
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

# Tenant IDs from database
DEFAULT_TENANT_ID = UUID('0fa2eaaf-b84f-4898-9b74-690cfb7055f3')
PRODUCTION_TENANT_ID = UUID('71d03764-94e0-48c7-9d4d-2771d502ccb7')

# Test users with different characteristics
TEST_USERS = [
    {
        'email': 'jane.developer@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': DEFAULT_TENANT_ID,
        'last_login_days_ago': 2,
        'roles': [
            {'tenant_id': DEFAULT_TENANT_ID, 'role': 'developer'},
        ]
    },
    {
        'email': 'john.operator@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': DEFAULT_TENANT_ID,
        'last_login_days_ago': 5,
        'roles': [
            {'tenant_id': DEFAULT_TENANT_ID, 'role': 'operator'},
        ]
    },
    {
        'email': 'alice.viewer@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': DEFAULT_TENANT_ID,
        'last_login_days_ago': 10,
        'roles': [
            {'tenant_id': DEFAULT_TENANT_ID, 'role': 'viewer'},
        ]
    },
    {
        'email': 'bob.inactive@example.com',
        'password': 'password123',
        'is_active': False,
        'default_tenant_id': DEFAULT_TENANT_ID,
        'last_login_days_ago': 30,
        'roles': [
            {'tenant_id': DEFAULT_TENANT_ID, 'role': 'developer'},
        ]
    },
    {
        'email': 'carol.admin@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': PRODUCTION_TENANT_ID,
        'last_login_days_ago': 1,
        'roles': [
            {'tenant_id': PRODUCTION_TENANT_ID, 'role': 'tenant_admin'},
        ]
    },
    {
        'email': 'david.prod@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': PRODUCTION_TENANT_ID,
        'last_login_days_ago': 3,
        'roles': [
            {'tenant_id': PRODUCTION_TENANT_ID, 'role': 'developer'},
        ]
    },
    {
        'email': 'emma.multi@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': DEFAULT_TENANT_ID,
        'last_login_days_ago': 7,
        'roles': [
            {'tenant_id': DEFAULT_TENANT_ID, 'role': 'developer'},
            {'tenant_id': PRODUCTION_TENANT_ID, 'role': 'viewer'},
        ]
    },
    {
        'email': 'frank.nologin@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': DEFAULT_TENANT_ID,
        'last_login_days_ago': None,  # Never logged in
        'roles': [
            {'tenant_id': DEFAULT_TENANT_ID, 'role': 'operator'},
        ]
    },
    {
        'email': 'grace.inactive.prod@example.com',
        'password': 'password123',
        'is_active': False,
        'default_tenant_id': PRODUCTION_TENANT_ID,
        'last_login_days_ago': 60,
        'roles': [
            {'tenant_id': PRODUCTION_TENANT_ID, 'role': 'viewer'},
        ]
    },
    # Add more users to test pagination (need 20+ users)
    {
        'email': 'user01@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': DEFAULT_TENANT_ID,
        'last_login_days_ago': 15,
        'roles': [{'tenant_id': DEFAULT_TENANT_ID, 'role': 'viewer'}]
    },
    {
        'email': 'user02@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': DEFAULT_TENANT_ID,
        'last_login_days_ago': 20,
        'roles': [{'tenant_id': DEFAULT_TENANT_ID, 'role': 'viewer'}]
    },
    {
        'email': 'user03@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': PRODUCTION_TENANT_ID,
        'last_login_days_ago': 8,
        'roles': [{'tenant_id': PRODUCTION_TENANT_ID, 'role': 'operator'}]
    },
    {
        'email': 'user04@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': PRODUCTION_TENANT_ID,
        'last_login_days_ago': 12,
        'roles': [{'tenant_id': PRODUCTION_TENANT_ID, 'role': 'developer'}]
    },
    {
        'email': 'user05@example.com',
        'password': 'password123',
        'is_active': False,
        'default_tenant_id': DEFAULT_TENANT_ID,
        'last_login_days_ago': 45,
        'roles': [{'tenant_id': DEFAULT_TENANT_ID, 'role': 'viewer'}]
    },
    {
        'email': 'user06@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': DEFAULT_TENANT_ID,
        'last_login_days_ago': 4,
        'roles': [{'tenant_id': DEFAULT_TENANT_ID, 'role': 'developer'}]
    },
    {
        'email': 'user07@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': PRODUCTION_TENANT_ID,
        'last_login_days_ago': 6,
        'roles': [{'tenant_id': PRODUCTION_TENANT_ID, 'role': 'viewer'}]
    },
    {
        'email': 'user08@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': DEFAULT_TENANT_ID,
        'last_login_days_ago': 11,
        'roles': [{'tenant_id': DEFAULT_TENANT_ID, 'role': 'operator'}]
    },
    {
        'email': 'user09@example.com',
        'password': 'password123',
        'is_active': False,
        'default_tenant_id': PRODUCTION_TENANT_ID,
        'last_login_days_ago': 50,
        'roles': [{'tenant_id': PRODUCTION_TENANT_ID, 'role': 'viewer'}]
    },
    {
        'email': 'user10@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': DEFAULT_TENANT_ID,
        'last_login_days_ago': 9,
        'roles': [{'tenant_id': DEFAULT_TENANT_ID, 'role': 'developer'}]
    },
    {
        'email': 'user11@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': PRODUCTION_TENANT_ID,
        'last_login_days_ago': None,
        'roles': [{'tenant_id': PRODUCTION_TENANT_ID, 'role': 'operator'}]
    },
    {
        'email': 'user12@example.com',
        'password': 'password123',
        'is_active': True,
        'default_tenant_id': DEFAULT_TENANT_ID,
        'last_login_days_ago': 14,
        'roles': [{'tenant_id': DEFAULT_TENANT_ID, 'role': 'viewer'}]
    },
]

async def create_test_users():
    """Create test users with roles"""
    session_maker = get_async_session_maker()
    async with session_maker() as db:
        created_count = 0
        skipped_count = 0

        for user_data in TEST_USERS:
            # Check if user already exists
            stmt = select(User).where(User.email == user_data['email'])
            result = await db.execute(stmt)
            existing_user = result.scalar_one_or_none()

            if existing_user:
                print(f"⏭️  Skipped {user_data['email']} (already exists)")
                skipped_count += 1
                continue

            # Create user
            last_login_at = None
            if user_data['last_login_days_ago'] is not None:
                last_login_at = datetime.utcnow() - timedelta(days=user_data['last_login_days_ago'])

            user = User(
                email=user_data['email'],
                password_hash=pwd_context.hash(user_data['password']),
                is_active=user_data['is_active'],
                default_tenant_id=user_data['default_tenant_id'],
                last_login_at=last_login_at,
                failed_login_attempts=0,
                locked_until=None,
            )
            db.add(user)
            await db.flush()  # Flush to get user ID

            # Create user roles
            for role_data in user_data['roles']:
                user_role = UserTenantRole(
                    user_id=user.id,
                    tenant_id=role_data['tenant_id'],
                    role=role_data['role'],
                )
                db.add(user_role)

            await db.commit()
            print(f"✅ Created {user_data['email']} ({', '.join([r['role'] for r in user_data['roles']])})")
            created_count += 1

        print(f"\n📊 Summary:")
        print(f"   Created: {created_count} users")
        print(f"   Skipped: {skipped_count} users (already exist)")
        print(f"   Total in database: {created_count + skipped_count + 1} users (including admin)")

if __name__ == '__main__':
    asyncio.run(create_test_users())

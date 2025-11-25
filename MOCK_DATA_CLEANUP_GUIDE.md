# Mock Data Cleanup Guide

## Overview
The application currently contains test/mock user data that was created for development and testing purposes. This guide explains where this data is located and how to remove it.

## Mock User Data Found

### Location: Users Table (Database)
**Total:** 22 test users with @example.com emails

**Test Users:**
1. jane.developer@example.com
2. john.operator@example.com
3. alice.viewer@example.com
4. bob.inactive@example.com
5. carol.admin@example.com
6. david.prod@example.com
7. emma.multi@example.com
8. frank.nologin@example.com
9. grace.inactive.prod@example.com
10. user10@example.com through user19@example.com

**Created By:**
- `/create_test_users.sql` - SQL script
- `/create_test_users.py` - Python script

Both scripts create the same test users with:
- Password: `password123` (bcrypt hashed)
- Various roles: developer, operator, viewer, tenant_admin
- Different tenants: Default Tenant and Production Tenant
- Mixed active/inactive status for testing

## How to Remove Mock Data

### Option 1: SQL Command (Recommended)
```sql
-- Delete all test users with @example.com emails
DELETE FROM user_tenant_roles
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@example.com'
);

DELETE FROM users WHERE email LIKE '%@example.com';
```

### Option 2: Python Script
Create a cleanup script (`cleanup_test_users.py`):
```python
import asyncio
from sqlalchemy import select, delete
from src.database.session import get_async_session_maker
from src.database.models import User, UserTenantRole

async def cleanup_test_users():
    session_maker = get_async_session_maker()
    async with session_maker() as db:
        # Get all test users
        stmt = select(User).where(User.email.like('%@example.com'))
        result = await db.execute(stmt)
        test_users = result.scalars().all()

        # Delete roles first (foreign key constraint)
        for user in test_users:
            await db.execute(
                delete(UserTenantRole).where(UserTenantRole.user_id == user.id)
            )

        # Delete users
        await db.execute(delete(User).where(User.email.like('%@example.com')))
        await db.commit()

        print(f"✅ Removed {len(test_users)} test users")

if __name__ == '__main__':
    asyncio.run(cleanup_test_users())
```

### Option 3: Database Command Line
```bash
# Connect to the database
docker exec -it ai-agents-postgres psql -U aiagents -d ai_agents

# Run the delete commands
DELETE FROM user_tenant_roles
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@example.com'
);

DELETE FROM users WHERE email LIKE '%@example.com';

# Verify deletion
SELECT COUNT(*) FROM users WHERE email LIKE '%@example.com';
-- Should return 0
```

## Prevent Re-creation

To prevent these test users from being recreated:

1. **Delete or rename the test scripts:**
   ```bash
   mv create_test_users.sql create_test_users.sql.backup
   mv create_test_users.py create_test_users.py.backup
   ```

2. **Update any seed scripts** that might reference these files

3. **Update documentation** to note that test users should only be created in development environments

## Production Checklist

Before deploying to production:

- [ ] Run cleanup script to remove all @example.com users
- [ ] Verify no test data exists: `SELECT * FROM users WHERE email LIKE '%@example.com';`
- [ ] Backup or remove test user creation scripts
- [ ] Create real admin users with proper credentials
- [ ] Update environment variables for production
- [ ] Test user authentication with real accounts

## Notes

- The admin user (admin@example.com) should also be replaced with a real admin account in production
- Test data is useful for development but must be removed before production deployment
- Consider using environment-specific seeding (dev/staging/production) to avoid this issue

## Related Files

- `/create_test_users.sql` - SQL test user creation script
- `/create_test_users.py` - Python test user creation script
- `/tests/cleanup_test_users.py` - Existing cleanup script for test environment
- `/scripts/create_admin_user.py` - Script to create proper admin users

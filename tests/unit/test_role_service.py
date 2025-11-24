"""
Unit tests for role management service layer.

Tests:
- assign_role: Success, duplicate assignment, invalid user/tenant
- revoke_role: Success, last super_admin protection, not found
- get_user_roles: Fetch with tenant names
- count_super_admin_roles: Count validation

Story: nextjs-story-25-role-assignment-api
Epic: Sprint 3 - User & Role Management
"""

import pytest
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import AuditLog, RoleEnum, TenantConfig, User, UserTenantRole
from src.services import role_service


@pytest.mark.asyncio
async def test_assign_role_success(db_session: AsyncSession):
    """Test successful role assignment (AC-1)."""
    # Create test user
    user = User(
        id=uuid4(),
        email=f"test-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add(user)

    # Create test tenant
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Test Tenant",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    db_session.add(tenant)

    # Create admin user
    admin = User(
        id=uuid4(),
        email=f"admin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add(admin)
    await db_session.commit()

    # Assign role
    role_assignment = await role_service.assign_role(
        db=db_session,
        user_id=user.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.DEVELOPER,
        assigned_by=admin.id,
    )

    # Verify role assignment created
    assert role_assignment.user_id == user.id
    assert role_assignment.tenant_id == tenant.tenant_id
    assert role_assignment.role == RoleEnum.DEVELOPER.value
    assert role_assignment.id is not None

    # Verify audit log created
    stmt = select(AuditLog).where(
        AuditLog.action == "role_assigned",
        AuditLog.entity_id == role_assignment.id
    )
    result = await db_session.execute(stmt)
    audit = result.scalar_one_or_none()

    assert audit is not None
    assert audit.entity_type == "user_tenant_role"
    assert audit.entity_id == role_assignment.id
    assert audit.new_value["target_user_id"] == str(user.id)
    assert audit.new_value["role"] == "developer"
    assert audit.new_value["assigned_by"] == str(admin.id)


@pytest.mark.asyncio
async def test_assign_role_duplicate_raises_error(db_session: AsyncSession):
    """Test duplicate role assignment raises error (AC-1)."""
    # Create test data
    user = User(
        id=uuid4(),
        email=f"test-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Test Tenant",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    admin = User(
        id=uuid4(),
        email=f"admin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add_all([user, tenant, admin])
    await db_session.commit()

    # Assign role first time
    await role_service.assign_role(
        db=db_session,
        user_id=user.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.DEVELOPER,
        assigned_by=admin.id,
    )

    # Try to assign same role again
    with pytest.raises(ValueError, match="User already has role"):
        await role_service.assign_role(
            db=db_session,
            user_id=user.id,
            tenant_id=tenant.tenant_id,
            role=RoleEnum.DEVELOPER,
            assigned_by=admin.id,
        )


@pytest.mark.asyncio
async def test_assign_role_invalid_user_raises_error(db_session: AsyncSession):
    """Test assigning role to non-existent user raises error (AC-1)."""
    # Create tenant but no user
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Test Tenant",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    admin = User(
        id=uuid4(),
        email=f"admin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add_all([tenant, admin])
    await db_session.commit()

    # Try to assign role to non-existent user
    with pytest.raises(ValueError, match="User not found"):
        await role_service.assign_role(
            db=db_session,
            user_id=uuid4(),  # Random UUID that doesn't exist
            tenant_id=tenant.tenant_id,
            role=RoleEnum.DEVELOPER,
            assigned_by=admin.id,
        )


@pytest.mark.asyncio
async def test_assign_role_invalid_tenant_raises_error(db_session: AsyncSession):
    """Test assigning role for non-existent tenant raises error (AC-1)."""
    # Create user but no tenant
    user = User(
        id=uuid4(),
        email=f"test-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    admin = User(
        id=uuid4(),
        email=f"admin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add_all([user, admin])
    await db_session.commit()

    # Try to assign role for non-existent tenant
    with pytest.raises(ValueError, match="Tenant not found"):
        await role_service.assign_role(
            db=db_session,
            user_id=user.id,
            tenant_id=f"non-existent-{uuid4()}",
            role=RoleEnum.DEVELOPER,
            assigned_by=admin.id,
        )


@pytest.mark.asyncio
async def test_revoke_role_success(db_session: AsyncSession):
    """Test successful role revocation (AC-2)."""
    # Create test data
    user = User(
        id=uuid4(),
        email=f"test-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Test Tenant",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    admin = User(
        id=uuid4(),
        email=f"admin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add_all([user, tenant, admin])
    await db_session.commit()

    # Create role assignment
    role_assignment = await role_service.assign_role(
        db=db_session,
        user_id=user.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.DEVELOPER,
        assigned_by=admin.id,
    )

    # Store role_assignment ID before deletion
    role_assignment_id = role_assignment.id

    # Revoke role
    await role_service.revoke_role(
        db=db_session,
        role_id=role_assignment_id,
        revoked_by=admin.id,
    )

    # Verify role assignment deleted
    stmt = select(UserTenantRole).where(UserTenantRole.id == role_assignment_id)
    result = await db_session.execute(stmt)
    deleted_role = result.scalar_one_or_none()

    assert deleted_role is None

    # Verify audit log created
    stmt = select(AuditLog).where(
        AuditLog.action == "role_revoked",
        AuditLog.entity_id == role_assignment_id
    )
    result = await db_session.execute(stmt)
    audit = result.scalar_one_or_none()

    assert audit is not None
    assert audit.entity_type == "user_tenant_role"
    assert audit.old_value["target_user_id"] == str(user.id)
    assert audit.old_value["role"] == "developer"
    assert audit.old_value["revoked_by"] == str(admin.id)


@pytest.mark.asyncio
async def test_revoke_last_super_admin_raises_error(db_session: AsyncSession):
    """Test cannot revoke last super_admin role (AC-6)."""
    # Create test data with only 1 super_admin
    user = User(
        id=uuid4(),
        email=f"admin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Test Tenant",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    db_session.add_all([user, tenant])
    await db_session.commit()

    # Assign super_admin role (only one in system)
    role_assignment = await role_service.assign_role(
        db=db_session,
        user_id=user.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.SUPER_ADMIN,
        assigned_by=user.id,
    )

    # Try to revoke last super_admin
    with pytest.raises(ValueError, match="Cannot remove the last super_admin"):
        await role_service.revoke_role(
            db=db_session,
            role_id=role_assignment.id,
            revoked_by=user.id,
        )


@pytest.mark.asyncio
async def test_revoke_role_not_found_raises_error(db_session: AsyncSession):
    """Test revoking non-existent role raises error (AC-2)."""
    admin = User(
        id=uuid4(),
        email=f"admin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add(admin)
    await db_session.commit()

    # Try to revoke non-existent role
    with pytest.raises(ValueError, match="Role assignment not found"):
        await role_service.revoke_role(
            db=db_session,
            role_id=uuid4(),  # Random UUID that doesn't exist
            revoked_by=admin.id,
        )


@pytest.mark.asyncio
async def test_get_user_roles(db_session: AsyncSession):
    """Test fetching user roles with tenant names (AC-3)."""
    # Create test data
    user = User(
        id=uuid4(),
        email=f"test-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    tenant1 = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Tenant A",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    tenant2 = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Tenant B",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    admin = User(
        id=uuid4(),
        email=f"admin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add_all([user, tenant1, tenant2, admin])
    await db_session.commit()

    # Assign 2 roles to user
    await role_service.assign_role(
        db=db_session,
        user_id=user.id,
        tenant_id=tenant1.tenant_id,
        role=RoleEnum.TENANT_ADMIN,
        assigned_by=admin.id,
    )
    await role_service.assign_role(
        db=db_session,
        user_id=user.id,
        tenant_id=tenant2.tenant_id,
        role=RoleEnum.VIEWER,
        assigned_by=admin.id,
    )

    # Fetch user roles
    roles = await role_service.get_user_roles(db=db_session, user_id=user.id)

    # Verify 2 roles returned with tenant names
    assert len(roles) == 2
    assert any(r["tenant_name"] == "Tenant A" and r["role"] == "tenant_admin" for r in roles)
    assert any(r["tenant_name"] == "Tenant B" and r["role"] == "viewer" for r in roles)


@pytest.mark.asyncio
async def test_count_super_admin_roles(db_session: AsyncSession):
    """Test counting super_admin roles (AC-6)."""
    # Create test data
    user1 = User(
        id=uuid4(),
        email=f"admin1-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    user2 = User(
        id=uuid4(),
        email=f"admin2-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Test Tenant",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    db_session.add_all([user1, user2, tenant])
    await db_session.commit()

    # Initially 0 super_admins
    count = await role_service.count_super_admin_roles(db=db_session)
    assert count == 0

    # Add 1 super_admin
    await role_service.assign_role(
        db=db_session,
        user_id=user1.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.SUPER_ADMIN,
        assigned_by=user1.id,
    )

    count = await role_service.count_super_admin_roles(db=db_session)
    assert count == 1

    # Add 2nd super_admin
    await role_service.assign_role(
        db=db_session,
        user_id=user2.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.SUPER_ADMIN,
        assigned_by=user1.id,
    )

    count = await role_service.count_super_admin_roles(db=db_session)
    assert count == 2

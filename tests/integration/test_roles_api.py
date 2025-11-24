"""
Integration tests for role assignment API endpoints.

Tests all 4 endpoints:
- POST /api/v1/users/{user_id}/roles - Assign role (AC-1, AC-5, AC-7)
- DELETE /api/v1/users/{user_id}/roles/{role_id} - Revoke role (AC-2, AC-6, AC-7)
- GET /api/v1/users/{user_id}/roles - List user roles (AC-3)
- GET /api/v1/roles - List available roles (AC-4)

Covers:
- Authentication (401)
- Authorization RBAC (403)
- Tenant scoping for tenant_admin (AC-5)
- Last super_admin protection (AC-6)
- Audit logging verification (AC-7)
- Error handling (400, 404)

Story: nextjs-story-25-role-assignment-api
Epic: Sprint 3 - User & Role Management
"""

import pytest
from uuid import uuid4

from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.models import AuditLog, RoleEnum, TenantConfig, User, UserTenantRole
from src.services.auth_service import create_access_token


@pytest.mark.asyncio
async def test_assign_role_as_super_admin_success(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Test super_admin can assign role for any tenant (AC-1, AC-5)."""
    # Create super_admin user
    super_admin = User(
        id=uuid4(),
        email=f"superadmin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Acme Corp",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    # Create target user
    target_user = User(
        id=uuid4(),
        email=f"user-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add_all([super_admin, tenant, target_user])
    await db_session.commit()

    # Assign super_admin role to admin user
    super_admin_role = UserTenantRole(
        user_id=super_admin.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.SUPER_ADMIN.value,
    )
    db_session.add(super_admin_role)
    await db_session.commit()

    # Generate JWT token for super_admin
    token = create_access_token(data={"sub": str(super_admin.id)})

    # Assign developer role to target user
    response = await async_client.post(
        f"/api/v1/users/{target_user.id}/roles",
        json={
            "tenant_id": str(tenant.id),
            "role": "developer",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    # Verify 201 Created
    assert response.status_code == 201
    data = response.json()

    assert data["user_id"] == str(target_user.id)
    assert data["role"] == "developer"
    assert data["tenant_name"] == "Acme Corp"


@pytest.mark.asyncio
async def test_assign_role_as_tenant_admin_own_tenant_success(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Test tenant_admin can assign role for own tenant (AC-1, AC-5)."""
    # Create tenant_admin user
    tenant_admin = User(
        id=uuid4(),
        email=f"tenantadmin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Acme Corp",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    target_user = User(
        id=uuid4(),
        email=f"user-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add_all([tenant_admin, tenant, target_user])
    await db_session.commit()

    # Assign tenant_admin role
    admin_role = UserTenantRole(
        user_id=tenant_admin.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.TENANT_ADMIN.value,
    )
    db_session.add(admin_role)
    await db_session.commit()

    # Generate JWT token
    token = create_access_token(data={"sub": str(tenant_admin.id)})

    # Assign developer role to target user (same tenant)
    response = await async_client.post(
        f"/api/v1/users/{target_user.id}/roles",
        json={
            "tenant_id": str(tenant.id),
            "role": "developer",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    # Verify 201 Created
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_assign_role_as_tenant_admin_other_tenant_forbidden(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Test tenant_admin cannot assign role for other tenant (AC-5)."""
    # Create tenant_admin for tenant-123
    tenant_admin = User(
        id=uuid4(),
        email=f"tenantadmin-{uuid4()}@example.com",
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
        tenant_id=f"tenant-{uuid4()}",  # Different tenant
        name="Tenant B",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    target_user = User(
        id=uuid4(),
        email=f"user-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add_all([tenant_admin, tenant1, tenant2, target_user])
    await db_session.commit()

    # Assign tenant_admin role for tenant1
    # Set default_tenant_id to match tenant1.id (UUID) for RBAC check
    tenant_admin.default_tenant_id = tenant1.id  # UUID type
    admin_role = UserTenantRole(
        user_id=tenant_admin.id,
        tenant_id=tenant1.tenant_id,  # VARCHAR type
        role=RoleEnum.TENANT_ADMIN.value,
    )
    db_session.add(admin_role)
    await db_session.commit()

    # Generate JWT token
    token = create_access_token(data={"sub": str(tenant_admin.id)})

    # Try to assign role for tenant2 (forbidden)
    response = await async_client.post(
        f"/api/v1/users/{target_user.id}/roles",
        json={
            "tenant_id": str(tenant2.id),
            "role": "developer",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    # Verify 403 Forbidden
    assert response.status_code == 403
    assert "Cannot assign roles for other tenants" in response.json()["detail"]


@pytest.mark.asyncio
async def test_assign_role_duplicate_returns_400(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Test duplicate role assignment returns 400 (AC-1)."""
    # Create super_admin and target user
    super_admin = User(
        id=uuid4(),
        email=f"superadmin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Acme Corp",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    target_user = User(
        id=uuid4(),
        email=f"user-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add_all([super_admin, tenant, target_user])
    await db_session.commit()

    # Assign super_admin role
    admin_role = UserTenantRole(
        user_id=super_admin.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.SUPER_ADMIN.value,
    )
    # Assign developer role to target user (first time)
    existing_role = UserTenantRole(
        user_id=target_user.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.DEVELOPER.value,
    )
    db_session.add_all([admin_role, existing_role])
    await db_session.commit()

    # Generate JWT token
    token = create_access_token(data={"sub": str(super_admin.id)})

    # Try to assign same role again
    response = await async_client.post(
        f"/api/v1/users/{target_user.id}/roles",
        json={
            "tenant_id": str(tenant.id),
            "role": "developer",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    # Verify 400 Bad Request
    assert response.status_code == 400
    assert "already has role" in response.json()["detail"]


@pytest.mark.asyncio
async def test_assign_role_without_auth_returns_401(async_client: AsyncClient):
    """Test unauthorized request returns 401 (AC-1)."""
    response = await async_client.post(
        f"/api/v1/users/{uuid4()}/roles",
        json={
            "tenant_id": str(uuid4()),
            "role": "developer",
        },
    )

    # Verify 401 Unauthorized
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_revoke_role_success_returns_204(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Test successful role revocation returns 204 (AC-2)."""
    # Create super_admin and target user
    super_admin = User(
        id=uuid4(),
        email=f"superadmin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Acme Corp",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    target_user = User(
        id=uuid4(),
        email=f"user-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add_all([super_admin, tenant, target_user])
    await db_session.commit()

    # Assign super_admin role
    admin_role = UserTenantRole(
        user_id=super_admin.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.SUPER_ADMIN.value,
    )
    # Assign developer role to target user
    target_role = UserTenantRole(
        user_id=target_user.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.DEVELOPER.value,
    )
    db_session.add_all([admin_role, target_role])
    await db_session.commit()

    # Generate JWT token
    token = create_access_token(data={"sub": str(super_admin.id)})

    # Revoke developer role
    response = await async_client.delete(
        f"/api/v1/users/{target_user.id}/roles/{target_role.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Verify 204 No Content
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_revoke_last_super_admin_returns_400(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Test cannot revoke last super_admin role (AC-6)."""
    # Create super_admin (only one in system)
    super_admin = User(
        id=uuid4(),
        email=f"superadmin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Acme Corp",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    db_session.add_all([super_admin, tenant])
    await db_session.commit()

    # Assign super_admin role (only one)
    admin_role = UserTenantRole(
        user_id=super_admin.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.SUPER_ADMIN.value,
    )
    db_session.add(admin_role)
    await db_session.commit()

    # Generate JWT token
    token = create_access_token(data={"sub": str(super_admin.id)})

    # Try to revoke last super_admin role
    response = await async_client.delete(
        f"/api/v1/users/{super_admin.id}/roles/{admin_role.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Verify 400 Bad Request
    assert response.status_code == 400
    assert "Cannot remove the last super_admin" in response.json()["detail"]


@pytest.mark.asyncio
async def test_list_user_roles_as_super_admin_returns_all(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Test super_admin can view any user's roles (AC-3)."""
    # Create super_admin
    super_admin = User(
        id=uuid4(),
        email=f"superadmin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Acme Corp",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    target_user = User(
        id=uuid4(),
        email=f"user-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add_all([super_admin, tenant, target_user])
    await db_session.commit()

    # Assign roles
    admin_role = UserTenantRole(
        user_id=super_admin.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.SUPER_ADMIN.value,
    )
    target_role = UserTenantRole(
        user_id=target_user.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.DEVELOPER.value,
    )
    db_session.add_all([admin_role, target_role])
    await db_session.commit()

    # Generate JWT token
    token = create_access_token(data={"sub": str(super_admin.id)})

    # Fetch target user's roles
    response = await async_client.get(
        f"/api/v1/users/{target_user.id}/roles",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Verify 200 OK
    assert response.status_code == 200
    roles = response.json()

    assert len(roles) == 1
    assert roles[0]["role"] == "developer"
    assert roles[0]["tenant_name"] == "Acme Corp"


@pytest.mark.asyncio
async def test_list_user_roles_as_regular_user_viewing_self_success(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Test regular user can view own roles (AC-3)."""
    # Create regular user
    user = User(
        id=uuid4(),
        email=f"user-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Acme Corp",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    db_session.add_all([user, tenant])
    await db_session.commit()

    # Assign developer role
    user_role = UserTenantRole(
        user_id=user.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.DEVELOPER.value,
    )
    db_session.add(user_role)
    await db_session.commit()

    # Generate JWT token
    token = create_access_token(data={"sub": str(user.id)})

    # Fetch own roles
    response = await async_client.get(
        f"/api/v1/users/{user.id}/roles",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Verify 200 OK
    assert response.status_code == 200
    roles = response.json()

    assert len(roles) == 1
    assert roles[0]["role"] == "developer"


@pytest.mark.asyncio
async def test_list_user_roles_as_regular_user_viewing_others_forbidden(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Test regular user cannot view other users' roles (AC-3)."""
    # Create 2 users
    user1 = User(
        id=uuid4(),
        email=f"user1-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    user2 = User(
        id=uuid4(),
        email=f"user2-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Acme Corp",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    db_session.add_all([user1, user2, tenant])
    await db_session.commit()

    # Assign developer role to user1
    user1_role = UserTenantRole(
        user_id=user1.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.DEVELOPER.value,
    )
    db_session.add(user1_role)
    await db_session.commit()

    # Generate JWT token for user1
    token = create_access_token(data={"sub": str(user1.id)})

    # Try to fetch user2's roles
    response = await async_client.get(
        f"/api/v1/users/{user2.id}/roles",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Verify 403 Forbidden
    assert response.status_code == 403
    assert "Cannot view roles for other users" in response.json()["detail"]


@pytest.mark.asyncio
async def test_list_available_roles_returns_5_roles(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Test GET /roles returns all 5 roles (AC-4)."""
    # Create any authenticated user
    user = User(
        id=uuid4(),
        email=f"user-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    # Generate JWT token
    token = create_access_token(data={"sub": str(user.id)})

    # Fetch available roles
    response = await async_client.get(
        "/api/v1/roles",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Verify 200 OK
    assert response.status_code == 200
    roles = response.json()

    # Verify 5 roles returned
    assert len(roles) == 5

    # Verify roles ordered by level
    assert roles[0]["role"] == "super_admin"
    assert roles[0]["level"] == 1
    assert roles[4]["role"] == "viewer"
    assert roles[4]["level"] == 5

    # Verify all roles have required fields
    for role in roles:
        assert "role" in role
        assert "display_name" in role
        assert "description" in role
        assert "level" in role


@pytest.mark.asyncio
async def test_audit_logging_for_assign_role(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Test audit log created for role assignment (AC-7)."""
    # Create super_admin and target user
    super_admin = User(
        id=uuid4(),
        email=f"superadmin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Acme Corp",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    target_user = User(
        id=uuid4(),
        email=f"user-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add_all([super_admin, tenant, target_user])
    await db_session.commit()

    # Assign super_admin role
    admin_role = UserTenantRole(
        user_id=super_admin.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.SUPER_ADMIN.value,
    )
    db_session.add(admin_role)
    await db_session.commit()

    # Generate JWT token
    token = create_access_token(data={"sub": str(super_admin.id)})

    # Assign developer role
    response = await async_client.post(
        f"/api/v1/users/{target_user.id}/roles",
        json={
            "tenant_id": str(tenant.id),
            "role": "developer",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201

    # Query audit log
    stmt = select(AuditLog).where(AuditLog.action == "role_assigned")
    result = await db_session.execute(stmt)
    audit = result.scalar_one_or_none()

    # Verify audit log entry
    assert audit is not None
    assert audit.details["target_user_id"] == str(target_user.id)
    assert audit.details["role"] == "developer"
    assert audit.details["assigned_by"] == str(super_admin.id)
    assert audit.tenant_id == "tenant-123"


@pytest.mark.asyncio
async def test_audit_logging_for_revoke_role(
    async_client: AsyncClient,
    db_session: AsyncSession,
):
    """Test audit log created for role revocation (AC-7)."""
    # Create super_admin and target user
    super_admin = User(
        id=uuid4(),
        email=f"superadmin-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    tenant = TenantConfig(
        id=uuid4(),
        tenant_id=f"tenant-{uuid4()}",
        name="Acme Corp",
        servicedesk_url="https://example.com",
        servicedesk_api_key_encrypted="encrypted_key",
        webhook_signing_secret_encrypted="encrypted_secret",
    )
    target_user = User(
        id=uuid4(),
        email=f"user-{uuid4()}@example.com",
        password_hash="hashed",
        default_tenant_id=uuid4(),
        is_active=True,
    )
    db_session.add_all([super_admin, tenant, target_user])
    await db_session.commit()

    # Assign roles
    admin_role = UserTenantRole(
        user_id=super_admin.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.SUPER_ADMIN.value,
    )
    target_role = UserTenantRole(
        user_id=target_user.id,
        tenant_id=tenant.tenant_id,
        role=RoleEnum.DEVELOPER.value,
    )
    db_session.add_all([admin_role, target_role])
    await db_session.commit()

    # Generate JWT token
    token = create_access_token(data={"sub": str(super_admin.id)})

    # Revoke developer role
    response = await async_client.delete(
        f"/api/v1/users/{target_user.id}/roles/{target_role.id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 204

    # Query audit log
    stmt = select(AuditLog).where(AuditLog.action == "role_revoked")
    result = await db_session.execute(stmt)
    audit = result.scalar_one_or_none()

    # Verify audit log entry
    assert audit is not None
    assert audit.details["target_user_id"] == str(target_user.id)
    assert audit.details["role"] == "developer"
    assert audit.details["revoked_by"] == str(super_admin.id)
    assert audit.tenant_id == "tenant-123"

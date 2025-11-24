"""
Role management service layer for user role assignments.

This module provides business logic for assigning/revoking user roles across tenants:
- assign_role: Create UserTenantRole record with validation
- revoke_role: Delete role assignment with last super_admin protection
- get_user_roles: Fetch all roles for a user with tenant names
- count_super_admin_roles: Helper for last admin protection

Story: nextjs-story-25-role-assignment-api
Epic: Sprint 3 - User & Role Management
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.database.models import AuditLog, RoleEnum, TenantConfig, User, UserTenantRole


async def assign_role(
    db: AsyncSession,
    user_id: UUID,
    tenant_id: str,  # VARCHAR tenant_id, NOT UUID
    role: RoleEnum,
    assigned_by: UUID,
) -> UserTenantRole:
    """
    Assign a role to a user for a specific tenant (AC-1, AC-7).

    Validates:
    - User exists
    - Tenant exists
    - No duplicate assignment (user_id + tenant_id + role unique)

    Side effects:
    - Creates UserTenantRole record
    - Logs to AuditLog table

    Args:
        db: Database session
        user_id: User UUID to assign role to
        tenant_id: Tenant identifier (VARCHAR, matches TenantConfig.tenant_id)
        role: Role to assign
        assigned_by: Admin user UUID assigning the role

    Returns:
        Created UserTenantRole record

    Raises:
        ValueError: If user doesn't exist, tenant doesn't exist, or duplicate assignment

    Example:
        role_assignment = await assign_role(
            db=session,
            user_id=UUID("user-123"),
            tenant_id="acme-corp",
            role=RoleEnum.DEVELOPER,
            assigned_by=UUID("admin-456")
        )
    """
    # 1. Validate user exists
    user_stmt = select(User).where(User.id == user_id)
    user_result = await db.execute(user_stmt)
    user = user_result.scalar_one_or_none()
    if not user:
        raise ValueError("User not found")

    # 2. Validate tenant exists (use VARCHAR tenant_id)
    tenant_stmt = select(TenantConfig).where(TenantConfig.tenant_id == tenant_id)
    tenant_result = await db.execute(tenant_stmt)
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise ValueError("Tenant not found")

    # 3. Check for duplicate assignment
    # (user_id + tenant_id + role) unique constraint will also catch this at DB level
    duplicate_stmt = (
        select(UserTenantRole)
        .where(UserTenantRole.user_id == user_id)
        .where(UserTenantRole.tenant_id == tenant_id)
        .where(UserTenantRole.role == role.value)
    )
    duplicate_result = await db.execute(duplicate_stmt)
    if duplicate_result.scalar_one_or_none():
        raise ValueError(
            f"User already has role {role.value} for tenant {tenant_id}"
        )

    # 4. Create UserTenantRole record
    # NOTE: UserTenantRole doesn't have assigned_by column - we'll log it in audit instead
    try:
        role_assignment = UserTenantRole(
            user_id=user_id,
            tenant_id=tenant_id,
            role=role.value,
        )
        db.add(role_assignment)
        await db.flush()  # Flush to get ID before audit log

        # 5. Log to audit log (AC-7)
        audit_entry = AuditLog(
            action="role_assigned",
            user_id=assigned_by,  # Admin performing the action
            tenant_id=tenant_id,
            entity_type="user_tenant_role",
            entity_id=role_assignment.id,
            old_value=None,  # No previous value for create
            new_value={
                "target_user_id": str(user_id),
                "role": role.value,
                "assigned_by": str(assigned_by),
            },
        )
        db.add(audit_entry)

        await db.commit()
        await db.refresh(role_assignment)

        return role_assignment

    except IntegrityError as e:
        await db.rollback()
        # Unique constraint violation
        raise ValueError(
            f"User already has role {role.value} for tenant {tenant_id}"
        ) from e


async def revoke_role(
    db: AsyncSession,
    role_id: UUID,
    revoked_by: UUID,
) -> None:
    """
    Revoke a role assignment (AC-2, AC-6, AC-7).

    Validates:
    - Role assignment exists
    - Not last super_admin role (AC-6)

    Side effects:
    - Deletes UserTenantRole record
    - Logs to AuditLog table

    Args:
        db: Database session
        role_id: UserTenantRole UUID to delete
        revoked_by: Admin user UUID revoking the role

    Returns:
        None

    Raises:
        ValueError: If role not found or attempting to remove last super_admin

    Example:
        await revoke_role(
            db=session,
            role_id=UUID("role-assignment-123"),
            revoked_by=UUID("admin-456")
        )
    """
    # 1. Validate role assignment exists
    role_stmt = select(UserTenantRole).where(UserTenantRole.id == role_id)
    role_result = await db.execute(role_stmt)
    role_assignment = role_result.scalar_one_or_none()
    if not role_assignment:
        raise ValueError("Role assignment not found")

    # 2. Last super_admin protection (AC-6)
    if role_assignment.role == RoleEnum.SUPER_ADMIN.value:
        super_admin_count = await count_super_admin_roles(db)
        if super_admin_count <= 1:
            raise ValueError("Cannot remove the last super_admin role from the system")

    # Store data for audit log before deletion
    user_id = role_assignment.user_id
    tenant_id = role_assignment.tenant_id
    role = role_assignment.role
    role_assignment_id = role_assignment.id

    # 3. Delete UserTenantRole record
    await db.delete(role_assignment)

    # 4. Log to audit log (AC-7)
    audit_entry = AuditLog(
        action="role_revoked",
        user_id=revoked_by,  # Admin performing the action
        tenant_id=tenant_id,
        entity_type="user_tenant_role",
        entity_id=role_assignment_id,
        old_value={
            "target_user_id": str(user_id),
            "role": role,
            "revoked_by": str(revoked_by),
        },
        new_value=None,  # No new value for delete
    )
    db.add(audit_entry)

    await db.commit()


async def get_user_roles(
    db: AsyncSession,
    user_id: UUID,
) -> List[dict]:
    """
    Get all role assignments for a user with tenant names (AC-3).

    Joins UserTenantRole with TenantConfig to get tenant display names.

    Args:
        db: Database session
        user_id: User UUID to fetch roles for

    Returns:
        List of dicts with role assignment data including tenant_name

    Example:
        roles = await get_user_roles(db, UUID("user-123"))
        # [
        #     {
        #         "id": UUID("..."),
        #         "user_id": UUID("user-123"),
        #         "tenant_id": "acme-corp",
        #         "tenant_name": "Acme Corporation",
        #         "role": "developer",
        #         "created_at": datetime(...),
        #         "created_by": None  # Not tracked in UserTenantRole model
        #     }
        # ]
    """
    stmt = (
        select(
            UserTenantRole.id,
            UserTenantRole.user_id,
            UserTenantRole.tenant_id,
            TenantConfig.name.label("tenant_name"),
            UserTenantRole.role,
            UserTenantRole.created_at,
        )
        .join(
            TenantConfig,
            UserTenantRole.tenant_id == TenantConfig.tenant_id,
            isouter=True,  # LEFT JOIN in case tenant deleted
        )
        .where(UserTenantRole.user_id == user_id)
        .order_by(UserTenantRole.created_at.desc())
    )

    result = await db.execute(stmt)
    rows = result.all()

    # Convert to list of dicts for easier serialization
    return [
        {
            "id": row.id,
            "user_id": row.user_id,
            "tenant_id": row.tenant_id,
            "tenant_name": row.tenant_name or "Unknown Tenant",  # Fallback if tenant deleted
            "role": row.role,
            "created_at": row.created_at,
            "created_by": None,  # Not tracked in current schema
        }
        for row in rows
    ]


async def count_super_admin_roles(db: AsyncSession) -> int:
    """
    Count total super_admin role assignments in the system (AC-6).

    Used for last super_admin protection validation.

    Args:
        db: Database session

    Returns:
        Count of super_admin role assignments

    Example:
        count = await count_super_admin_roles(db)
        if count <= 1:
            # Cannot delete this super_admin role
    """
    stmt = select(func.count()).where(
        UserTenantRole.role == RoleEnum.SUPER_ADMIN.value
    )
    result = await db.execute(stmt)
    return result.scalar() or 0

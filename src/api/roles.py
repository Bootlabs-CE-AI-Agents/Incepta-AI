"""
Role assignment API endpoints for managing user permissions across tenants.

This module provides endpoints for role management:
- POST /api/v1/users/{user_id}/roles - Assign role to user (AC-1)
- DELETE /api/v1/users/{user_id}/roles/{role_id} - Revoke role (AC-2)
- GET /api/v1/users/{user_id}/roles - List user's roles (AC-3)
- GET /api/v1/roles - List available roles (AC-4)

Authorization:
- All endpoints require authentication
- Assign/revoke require super_admin or tenant_admin role
- tenant_admin can only manage roles for their own tenant (AC-5)

Story: nextjs-story-25-role-assignment-api
Epic: Sprint 3 - User & Role Management
"""

from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_active_user
from src.database.models import RoleEnum, User
from src.database.session import get_async_session
from src.schemas.user import RoleAssignmentCreate, RoleAssignmentResponse, RoleInfo
from src.services import role_service

# Create router with /api/v1 prefix (will be /api/v1/users/{id}/roles and /api/v1/roles)
router = APIRouter(
    prefix="/api/v1",
    tags=["Roles"],
    responses={
        401: {"description": "Unauthorized - Invalid or missing JWT token"},
        403: {"description": "Forbidden - Insufficient permissions"},
    },
)


# Static list of available roles with metadata (AC-4)
ROLES_METADATA: List[dict] = [
    {
        "role": RoleEnum.SUPER_ADMIN,
        "display_name": "Super Admin",
        "description": "Full system access across all tenants",
        "level": 1,
    },
    {
        "role": RoleEnum.TENANT_ADMIN,
        "display_name": "Tenant Admin",
        "description": "Full access within assigned tenant",
        "level": 2,
    },
    {
        "role": RoleEnum.DEVELOPER,
        "display_name": "Developer",
        "description": "Can create and manage agents, prompts, tools",
        "level": 3,
    },
    {
        "role": RoleEnum.OPERATOR,
        "display_name": "Operator",
        "description": "Can view metrics, execute agents, view history",
        "level": 4,
    },
    {
        "role": RoleEnum.VIEWER,
        "display_name": "Viewer",
        "description": "Read-only access to assigned tenant resources",
        "level": 5,
    },
]


async def _check_tenant_admin_permissions(
    current_user: User,
    tenant_id: str,
    db: AsyncSession,
) -> None:
    """
    Validate tenant_admin can only manage roles for their own tenant (AC-5).

    Args:
        current_user: Authenticated user making the request
        tenant_id: Tenant ID (VARCHAR) from request body/path
        db: Database session

    Raises:
        HTTPException: 403 if tenant_admin trying to manage other tenant

    Note:
        - super_admin bypasses this check
        - tenant_admin must match their default_tenant_id (UUID)
        - Compares TenantConfig.id (UUID) with User.default_tenant_id (UUID)
    """
    # Get user's roles to check if they're super_admin
    user_roles = await role_service.get_user_roles(db, current_user.id)

    is_super_admin = any(
        role["role"] == RoleEnum.SUPER_ADMIN.value for role in user_roles
    )

    # super_admin can manage any tenant
    if is_super_admin:
        return

    # tenant_admin can only manage their own tenant
    is_tenant_admin = any(
        role["role"] == RoleEnum.TENANT_ADMIN.value for role in user_roles
    )

    if is_tenant_admin:
        # Look up TenantConfig to get UUID (TenantConfig.id) from VARCHAR (tenant_id)
        from sqlalchemy import select
        from src.database.models import TenantConfig

        stmt = select(TenantConfig).where(TenantConfig.tenant_id == tenant_id)
        result = await db.execute(stmt)
        tenant_config = result.scalar_one_or_none()

        if not tenant_config:
            # Tenant doesn't exist - will be caught by service layer
            return

        # Compare UUIDs: TenantConfig.id (UUID) vs User.default_tenant_id (UUID)
        if current_user.default_tenant_id != tenant_config.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot assign roles for other tenants",
            )
    else:
        # User has neither super_admin nor tenant_admin role
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Requires super_admin or tenant_admin role",
        )


@router.post(
    "/users/{user_id}/roles",
    response_model=RoleAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign role to user",
    description="Assign a role to a user for a specific tenant. Requires super_admin or tenant_admin role. tenant_admin can only assign roles for their own tenant.",
    responses={
        201: {
            "description": "Role assigned successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "550e8400-e29b-41d4-a716-446655440000",
                        "user_id": "660e8400-e29b-41d4-a716-446655440000",
                        "tenant_id": "abc-123-def-456",
                        "tenant_name": "Acme Corporation",
                        "role": "developer",
                        "created_at": "2025-11-24T12:00:00Z",
                        "created_by": "770e8400-e29b-41d4-a716-446655440000",
                    }
                }
            },
        },
        400: {
            "description": "Bad Request - User/tenant not found or duplicate assignment",
            "content": {
                "application/json": {
                    "examples": {
                        "user_not_found": {"value": {"detail": "User not found"}},
                        "tenant_not_found": {"value": {"detail": "Tenant not found"}},
                        "duplicate": {
                            "value": {
                                "detail": "User already has role developer for tenant abc-123"
                            }
                        },
                    }
                }
            },
        },
        403: {
            "description": "Forbidden - tenant_admin trying to assign for other tenant",
            "content": {
                "application/json": {
                    "example": {"detail": "Cannot assign roles for other tenants"}
                }
            },
        },
    },
)
async def assign_role(
    user_id: UUID,
    data: RoleAssignmentCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> RoleAssignmentResponse:
    """
    Assign a role to a user for a specific tenant (AC-1, AC-5, AC-7).

    Authorization:
    - Requires super_admin or tenant_admin role
    - tenant_admin can only assign roles for their own tenant

    Validation:
    - User must exist
    - Tenant must exist
    - No duplicate assignments (user + tenant + role unique)

    Side effects:
    - Creates UserTenantRole record
    - Logs to AuditLog table
    - User must re-login to get new permissions (JWT invalidation)
    """
    # Look up tenant by UUID to get VARCHAR tenant_id for service layer
    from src.database.models import TenantConfig

    tenant_stmt = select(TenantConfig).where(TenantConfig.id == data.tenant_id)
    tenant_result = await db.execute(tenant_stmt)
    tenant = tenant_result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant not found"
        )

    # Use VARCHAR tenant_id for service layer (UserTenantRole stores VARCHAR)
    tenant_id_str = tenant.tenant_id

    # Check tenant scoping (AC-5)
    await _check_tenant_admin_permissions(current_user, tenant_id_str, db)

    try:
        # Call service layer to assign role
        role_assignment = await role_service.assign_role(
            db=db,
            user_id=user_id,
            tenant_id=tenant_id_str,
            role=data.role,
            assigned_by=current_user.id,
        )

        # Fetch tenant name for response
        user_roles = await role_service.get_user_roles(db, user_id)
        matching_role = next(
            (
                r
                for r in user_roles
                if r["id"] == role_assignment.id
            ),
            None,
        )

        # Return response with tenant_name
        return RoleAssignmentResponse(
            id=role_assignment.id,
            user_id=role_assignment.user_id,
            tenant_id=role_assignment.tenant_id,
            tenant_name=matching_role["tenant_name"] if matching_role else None,
            role=RoleEnum(role_assignment.role),
            created_at=role_assignment.created_at,
            created_by=current_user.id,
        )

    except ValueError as e:
        # Service layer validation errors (user not found, tenant not found, duplicate)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete(
    "/users/{user_id}/roles/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke role from user",
    description="Revoke a role assignment. Requires super_admin or tenant_admin role. Cannot remove last super_admin role.",
    responses={
        204: {"description": "Role revoked successfully"},
        400: {
            "description": "Bad Request - Cannot remove last super_admin",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Cannot remove the last super_admin role from the system"
                    }
                }
            },
        },
        403: {
            "description": "Forbidden - tenant_admin trying to revoke for other tenant",
        },
        404: {
            "description": "Not Found - Role assignment does not exist",
            "content": {
                "application/json": {
                    "example": {"detail": "Role assignment not found"}
                }
            },
        },
    },
)
async def revoke_role(
    user_id: UUID,
    role_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> None:
    """
    Revoke a role assignment (AC-2, AC-5, AC-6, AC-7).

    Authorization:
    - Requires super_admin or tenant_admin role
    - tenant_admin can only revoke roles for their own tenant

    Validation:
    - Role assignment must exist
    - Cannot remove last super_admin role (AC-6)

    Side effects:
    - Deletes UserTenantRole record
    - Logs to AuditLog table
    - User must re-login to remove permissions (JWT invalidation)
    """
    # Fetch role assignment to check tenant_id for scoping
    from sqlalchemy import select
    from src.database.models import UserTenantRole

    stmt = select(UserTenantRole).where(UserTenantRole.id == role_id)
    result = await db.execute(stmt)
    role_assignment = result.scalar_one_or_none()

    if not role_assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role assignment not found",
        )

    # Check tenant scoping (AC-5)
    await _check_tenant_admin_permissions(current_user, role_assignment.tenant_id, db)

    try:
        # Call service layer to revoke role
        await role_service.revoke_role(
            db=db,
            role_id=role_id,
            revoked_by=current_user.id,
        )

    except ValueError as e:
        # Service layer validation errors (last super_admin protection)
        if "last super_admin" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )


@router.get(
    "/users/{user_id}/roles",
    response_model=List[RoleAssignmentResponse],
    summary="List user's roles",
    description="Get all role assignments for a user. RBAC: super_admin sees all, tenant_admin sees own tenant only, regular user sees self only.",
    responses={
        200: {
            "description": "List of role assignments",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "id": "550e8400-e29b-41d4-a716-446655440000",
                            "user_id": "660e8400-e29b-41d4-a716-446655440000",
                            "tenant_id": "abc-123",
                            "tenant_name": "Acme Corporation",
                            "role": "tenant_admin",
                            "created_at": "2025-11-01T10:00:00Z",
                            "created_by": "770e8400-e29b-41d4-a716-446655440000",
                        }
                    ]
                }
            },
        },
        403: {
            "description": "Forbidden - Trying to view other user's roles without permission",
            "content": {
                "application/json": {
                    "example": {"detail": "Cannot view roles for other users"}
                }
            },
        },
        404: {
            "description": "Not Found - User does not exist",
            "content": {
                "application/json": {"example": {"detail": "User not found"}}
            },
        },
    },
)
async def get_user_roles_endpoint(
    user_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> List[RoleAssignmentResponse]:
    """
    Get all role assignments for a user (AC-3).

    RBAC Authorization:
    - super_admin: Can view any user's roles
    - tenant_admin: Can view roles for users in their tenant only
    - Regular user: Can only view their own roles (user_id must match JWT sub)

    Returns:
    - List of role assignments with tenant names (joined from TenantConfig)
    """
    # Get current user's roles to determine permissions
    current_user_roles = await role_service.get_user_roles(db, current_user.id)

    is_super_admin = any(
        role["role"] == RoleEnum.SUPER_ADMIN.value for role in current_user_roles
    )
    is_tenant_admin = any(
        role["role"] == RoleEnum.TENANT_ADMIN.value for role in current_user_roles
    )

    # RBAC: super_admin can view any user
    # tenant_admin can view users in their tenant (checked below)
    # Regular user can only view self
    if not is_super_admin and not is_tenant_admin and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot view roles for other users",
        )

    # Verify target user exists
    from sqlalchemy import select
    from src.database.models import User

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    target_user = result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Fetch user's roles
    user_roles = await role_service.get_user_roles(db, user_id)

    # tenant_admin: Filter to only show roles for their tenant
    if is_tenant_admin and not is_super_admin:
        user_roles = [
            role
            for role in user_roles
            if role["tenant_id"] == current_user.default_tenant_id
        ]

    # Convert to Pydantic models
    return [
        RoleAssignmentResponse(
            id=role["id"],
            user_id=role["user_id"],
            tenant_id=role["tenant_id"],
            tenant_name=role["tenant_name"],
            role=RoleEnum(role["role"]),
            created_at=role["created_at"],
            created_by=role["created_by"],
        )
        for role in user_roles
    ]


@router.get(
    "/roles",
    response_model=List[RoleInfo],
    summary="List available roles",
    description="Get list of all available roles in the system with metadata. Any authenticated user can access this endpoint.",
    responses={
        200: {
            "description": "List of available roles ordered by level (highest privilege first)",
            "content": {
                "application/json": {
                    "example": [
                        {
                            "role": "super_admin",
                            "display_name": "Super Admin",
                            "description": "Full system access across all tenants",
                            "level": 1,
                        },
                        {
                            "role": "tenant_admin",
                            "display_name": "Tenant Admin",
                            "description": "Full access within assigned tenant",
                            "level": 2,
                        },
                    ]
                }
            },
        }
    },
)
async def get_available_roles(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> List[RoleInfo]:
    """
    Get list of all available roles in the system (AC-4).

    Authorization:
    - Any authenticated user can view available roles (used for UI dropdowns)

    Returns:
    - List of roles with display_name, description, and level
    - Ordered by level (1=highest privilege, 5=lowest)
    """
    # Return static list of roles with metadata
    return [
        RoleInfo(
            role=role_meta["role"],
            display_name=role_meta["display_name"],
            description=role_meta["description"],
            level=role_meta["level"],
        )
        for role_meta in ROLES_METADATA
    ]

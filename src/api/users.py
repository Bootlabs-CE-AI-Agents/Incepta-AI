"""
User management API endpoints for profile and password operations.

This module provides protected endpoints for authenticated users:
- GET /api/v1/users/me - Get current user profile with roles
- GET /api/v1/users/me/role - Get user role for specific tenant
- PUT /api/v1/users/me/password - Change password with validation

Story: 1C - API Endpoints & Middleware
Epic: 2 (Authentication & Authorization Foundation)
"""

from datetime import datetime, UTC
from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import (
    get_auth_service,
    get_current_active_user,
    get_user_service,
    require_admin_role,
)
from src.database.models import AuthAuditLog, User, UserTenantRole, RoleEnum, TenantConfig
from src.database.session import get_async_session
from src.services.auth_service import (
    AuthService,
    hash_password,
    verify_password,
    validate_password_strength,
)
from src.services.user_service import UserService
from src.schemas.user import (
    PaginatedUsersResponse,
    UserCreateRequest,
    UserUpdateRequest,
    UserDetailDTO,
    UserRoleDTO,
    PasswordResetResponse,
    UserListQueryParams,
)

# Create router with /api/v1/users prefix
router = APIRouter(
    prefix="/api/v1/users",
    tags=["Users"],
)


# ==============================================================================
# Request/Response Schemas
# ==============================================================================


class RoleAssignment(BaseModel):
    """User role assignment for a tenant."""

    tenant_id: str  # VARCHAR tenant_id (e.g., "default", "production"), not UUID
    tenant_name: str | None = None  # Human-readable tenant name from TenantConfig
    role: RoleEnum

    model_config = {"from_attributes": True}


class UserDetailResponse(BaseModel):
    """Detailed user profile with roles."""

    id: UUID
    email: EmailStr
    default_tenant_id: UUID
    roles: List[RoleAssignment]
    created_at: datetime
    last_login_at: datetime | None
    is_active: bool

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "user@example.com",
                "default_tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "roles": [
                    {
                        "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                        "role": "admin",
                    },
                    {
                        "tenant_id": "987e6543-e21b-12d3-a456-426614174000",
                        "role": "viewer",
                    },
                ],
                "created_at": "2025-11-18T10:00:00Z",
                "last_login_at": "2025-11-18T14:30:00Z",
                "is_active": True,
            }
        },
    }


class ChangePasswordRequest(BaseModel):
    """Password change request."""

    current_password: str
    new_password: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "current_password": "OldPass123!",
                "new_password": "NewSecurePass456!",
            }
        }
    }


# ==============================================================================
# Endpoints
# ==============================================================================


@router.get(
    "/me",
    response_model=UserDetailResponse,
    summary="Get current user profile",
    response_description="Current authenticated user details",
)
async def get_current_user_profile(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_async_session),
) -> UserDetailResponse:
    """
    Get authenticated user's profile with roles.

    Args:
        current_user: User from JWT token
        db: Database session

    Returns:
        UserDetailResponse with user details and roles

    Security:
        Requires valid JWT access token

    Example:
        GET /api/users/me
        Headers: Authorization: Bearer <access_token>
    """
    # Fetch user's roles for all tenants with tenant names
    # Join with TenantConfig to get tenant names
    stmt = (
        select(UserTenantRole, TenantConfig.name)
        .outerjoin(TenantConfig, UserTenantRole.tenant_id == TenantConfig.tenant_id)
        .where(UserTenantRole.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    role_rows = result.all()

    # Build response with roles and tenant names
    role_assignments = [
        RoleAssignment(
            tenant_id=role.tenant_id,
            tenant_name=tenant_name,
            role=role.role
        )
        for role, tenant_name in role_rows
    ]

    return UserDetailResponse(
        id=current_user.id,
        email=current_user.email,
        default_tenant_id=current_user.default_tenant_id,
        roles=role_assignments,
        created_at=current_user.created_at,
        last_login_at=current_user.last_login_at,
        is_active=current_user.is_active,
    )


@router.get(
    "/me/role",
    response_model=RoleAssignment,
    summary="Get user role for specific tenant",
    response_description="User's role for the requested tenant",
)
async def get_user_role_for_tenant(
    tenant_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_async_session),
) -> RoleAssignment:
    """
    Get authenticated user's role for a specific tenant.

    Args:
        tenant_id: Tenant ID (VARCHAR) to check role for (e.g., "default", "production")
        current_user: User from JWT token
        db: Database session

    Returns:
        RoleAssignment with tenant_id and role (defaults to 'viewer' if no role exists)

    Security:
        Requires valid JWT access token

    Example:
        GET /api/users/me/role?tenant_id=default
        Headers: Authorization: Bearer <access_token>
    """
    # Fetch user's role for the specified tenant
    # tenant_id is VARCHAR in database
    stmt = select(UserTenantRole).where(
        UserTenantRole.user_id == current_user.id, UserTenantRole.tenant_id == tenant_id
    )
    result = await db.execute(stmt)
    user_role = result.scalar_one_or_none()

    # If no role exists, return default 'viewer' role instead of 404
    # This allows the UI to load while maintaining least-privilege principle
    if not user_role:
        return RoleAssignment(tenant_id=tenant_id, role=RoleEnum.VIEWER)

    return RoleAssignment(tenant_id=user_role.tenant_id, role=user_role.role)


@router.put(
    "/me/password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change password",
    response_description="Password successfully changed",
)
async def change_password(
    current_user: Annotated[User, Depends(get_current_active_user)],
    request_data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_async_session),
    auth_service: AuthService = Depends(get_auth_service),
) -> None:
    """
    Change user password with validation.

    Args:
        current_user: Authenticated user
        request_data: ChangePasswordRequest with old and new passwords
        db: Database session
        auth_service: Authentication service

    Returns:
        204 No Content

    Raises:
        400: Current password incorrect
        422: New password fails strength validation
        422: New password matches recent password (password history)

    Side Effects:
        - Updates password_hash
        - Appends to password_history
        - Revokes all existing tokens (force re-login)

    Security:
        - Current password verified before changing
        - New password validated for strength
        - New password checked against password history (prevent reuse)
        - All tokens revoked to force re-authentication
        - Password change logged to auth_audit_log
    """
    # Verify current password
    if not verify_password(request_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Validate new password strength
    is_valid, error_msg = validate_password_strength(request_data.new_password)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=error_msg)

    # Check password history (prevent reuse of last 5 passwords)
    password_history = current_user.password_history or []
    for old_hash in password_history[-5:]:  # Check last 5 passwords
        if verify_password(request_data.new_password, old_hash):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="New password cannot match any of your last 5 passwords",
            )

    # Update password
    new_hash = hash_password(request_data.new_password)

    # Append current password to history
    updated_history = password_history + [current_user.password_hash]
    current_user.password_history = updated_history[-10:]  # Keep last 10

    current_user.password_hash = new_hash
    current_user.password_changed_at = datetime.now(UTC)

    # Revoke all existing tokens (force re-login across all devices)
    # Implementation: Increment user's token version in Redis
    # All tokens issued before this version increment will be rejected during verification
    if auth_service.redis:
        user_token_key = f"user:token_version:{str(current_user.id)}"
        current_version = await auth_service.redis.get(user_token_key)

        if current_version is None:
            # First password change - set version to 1
            new_version = 1
        else:
            # Increment existing version
            new_version = int(current_version) + 1

        # Store new version in Redis (no TTL - persists until next password change)
        await auth_service.redis.set(user_token_key, str(new_version))

        # This invalidates ALL tokens issued before this moment by incrementing the version
        # Tokens contain the version they were issued with, and will be rejected if version doesn't match

    # Log password change event
    audit_entry = AuthAuditLog(
        user_id=current_user.id,
        event_type="password_change",
        success=True,
        ip_address="Unknown",
        user_agent="Unknown",
    )
    db.add(audit_entry)

    await db.commit()

    # 204 No Content (no response body)
    return None


# ==============================================================================
# NEW ENDPOINTS: Story nextjs-story-22-users-api-crud
# ==============================================================================


@router.get(
    "",
    response_model=PaginatedUsersResponse,
    summary="List users with pagination and filtering",
    response_description="Paginated list of users",
)
async def list_users(
    params: Annotated[UserListQueryParams, Depends()],
    current_user: Annotated[User, Depends(require_admin_role)],
    db: AsyncSession = Depends(get_async_session),
    user_service: UserService = Depends(get_user_service),
) -> PaginatedUsersResponse:
    """
    List users with pagination and filtering (AC-1).

    Supports:
    - Pagination (limit, offset)
    - Filtering by tenant_id, is_active, role
    - Tenant scoping (super_admin sees all, tenant_admin sees their tenant only)

    Args:
        params: Query parameters (tenant_id, is_active, role, limit, offset)
        current_user: Admin user from JWT token
        db: Database session
        user_service: User service instance

    Returns:
        PaginatedUsersResponse with users and total count

    Security:
        - Requires admin role (super_admin or tenant_admin)
        - Tenant scoping applied based on user's role

    Story: nextjs-story-22-users-api-crud (AC-1)
    """
    # Call service method with tenant scoping
    users, total = await user_service.list_users(
        search=params.search,
        tenant_id=params.tenant_id,
        is_active=params.is_active,
        role=params.role,
        limit=params.limit,
        offset=params.offset,
        current_user=current_user,
        db=db,
    )

    # Convert User models to UserDetailDTO with roles
    user_dtos = []
    for user in users:
        # Fetch roles for each user with tenant names (LEFT JOIN with TenantConfig)
        stmt = (
            select(UserTenantRole, TenantConfig.name)
            .outerjoin(TenantConfig, UserTenantRole.tenant_id == TenantConfig.tenant_id)
            .where(UserTenantRole.user_id == user.id)
        )
        result = await db.execute(stmt)
        role_rows = result.all()

        # Convert to UserRoleDTO with tenant names
        role_dtos = [
            UserRoleDTO(
                role=role.role,
                tenant_id=role.tenant_id,
                tenant_name=tenant_name
            )
            for role, tenant_name in role_rows
        ]

        # Fetch default tenant name
        default_tenant_name = None
        if user.default_tenant_id:
            stmt_tenant = select(TenantConfig.name).where(
                TenantConfig.id == user.default_tenant_id
            )
            result_tenant = await db.execute(stmt_tenant)
            default_tenant_name = result_tenant.scalar_one_or_none()

        # Create UserDetailDTO
        user_dto = UserDetailDTO(
            id=user.id,
            email=user.email,
            is_active=user.is_active,
            default_tenant_id=user.default_tenant_id,
            default_tenant_name=default_tenant_name,
            roles=role_dtos,
            last_login_at=user.last_login_at,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
        user_dtos.append(user_dto)

    return PaginatedUsersResponse(
        items=user_dtos,
        total=total,
        limit=params.limit,
        offset=params.offset,
    )


@router.post(
    "",
    response_model=UserDetailDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Create new user with initial role",
    response_description="Created user details",
)
async def create_user(
    request_data: UserCreateRequest,
    current_user: Annotated[User, Depends(require_admin_role)],
    db: AsyncSession = Depends(get_async_session),
    user_service: UserService = Depends(get_user_service),
) -> UserDetailDTO:
    """
    Create new user with initial role assignment (AC-2).

    Steps:
    1. Validate password strength (5 rules)
    2. Create user account
    3. Assign initial role
    4. Log to AuditLog
    5. Queue welcome email (if send_welcome_email=True)

    Args:
        request_data: UserCreateRequest with email, password, default_tenant_id, initial_role
        current_user: Admin user performing the creation
        db: Database session
        user_service: User service instance

    Returns:
        UserDetailDTO with created user details

    Raises:
        422: Password validation fails or email exists

    Security:
        - Requires admin role
        - Password validated with 5 security rules
        - Email normalized to lowercase

    Story: nextjs-story-22-users-api-crud (AC-2)
    """
    # Create user with role
    user = await user_service.create_user_with_role(
        email=request_data.email,
        password=request_data.password,
        default_tenant_id=request_data.default_tenant_id,
        initial_role=request_data.initial_role,
        send_welcome_email=request_data.send_welcome_email,
        current_user=current_user,
        db=db,
    )

    # Fetch roles for response
    stmt = select(UserTenantRole).where(UserTenantRole.user_id == user.id)
    result = await db.execute(stmt)
    roles = result.scalars().all()

    # Convert to UserRoleDTO
    role_dtos = [UserRoleDTO(role=r.role, tenant_id=r.tenant_id) for r in roles]

    return UserDetailDTO(
        id=user.id,
        email=user.email,
        is_active=user.is_active,
        default_tenant_id=user.default_tenant_id,
        roles=role_dtos,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.put(
    "/{user_id}",
    response_model=UserDetailDTO,
    summary="Update user profile",
    response_description="Updated user details",
)
async def update_user(
    user_id: UUID,
    request_data: UserUpdateRequest,
    current_user: Annotated[User, Depends(require_admin_role)],
    db: AsyncSession = Depends(get_async_session),
    user_service: UserService = Depends(get_user_service),
) -> UserDetailDTO:
    """
    Update user profile with audit logging (AC-3).

    Steps:
    1. Verify user exists
    2. Check if disabling last super_admin (prevent)
    3. Update user fields
    4. Log to AuditLog with changed_fields

    Args:
        user_id: User UUID to update
        request_data: UserUpdateRequest with optional email, is_active, default_tenant_id
        current_user: Admin user performing the update
        db: Database session
        user_service: User service instance

    Returns:
        UserDetailDTO with updated user details

    Raises:
        404: User not found
        400: Cannot disable last super_admin

    Security:
        - Requires admin role
        - Cannot disable last super_admin
        - Email uniqueness enforced

    Story: nextjs-story-22-users-api-crud (AC-3)
    """
    # Update user with audit logging
    user = await user_service.update_user_with_audit(
        user_id=user_id,
        email=request_data.email,
        is_active=request_data.is_active,
        default_tenant_id=request_data.default_tenant_id,
        current_user=current_user,
        db=db,
    )

    # Fetch roles for response
    stmt = select(UserTenantRole).where(UserTenantRole.user_id == user.id)
    result = await db.execute(stmt)
    roles = result.scalars().all()

    # Convert to UserRoleDTO
    role_dtos = [UserRoleDTO(role=r.role, tenant_id=r.tenant_id) for r in roles]

    return UserDetailDTO(
        id=user.id,
        email=user.email,
        is_active=user.is_active,
        default_tenant_id=user.default_tenant_id,
        roles=role_dtos,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft delete user",
    response_description="User successfully deleted",
)
async def delete_user(
    user_id: UUID,
    current_user: Annotated[User, Depends(require_admin_role)],
    db: AsyncSession = Depends(get_async_session),
    user_service: UserService = Depends(get_user_service),
) -> None:
    """
    Soft delete user account (AC-4).

    Steps:
    1. Verify user exists
    2. Check if last super_admin (prevent deletion)
    3. Set is_active = False (soft delete)
    4. Remove all role assignments
    5. Revoke JWT tokens (via updated_at timestamp)
    6. Log to AuditLog

    Args:
        user_id: User UUID to delete
        current_user: Admin user performing the deletion
        db: Database session
        user_service: User service instance

    Returns:
        204 No Content

    Raises:
        404: User not found
        400: Cannot delete last super_admin

    Security:
        - Requires admin role
        - Soft delete preserves audit trail
        - Token revocation invalidates existing sessions

    Story: nextjs-story-22-users-api-crud (AC-4)
    """
    # Soft delete user
    await user_service.delete_user(
        user_id=user_id,
        current_user=current_user,
        db=db,
    )

    return None


@router.post(
    "/{user_id}/reset-password",
    response_model=PasswordResetResponse,
    summary="Admin password reset",
    response_description="Temporary password generated",
)
async def reset_password_admin(
    user_id: UUID,
    current_user: Annotated[User, Depends(require_admin_role)],
    db: AsyncSession = Depends(get_async_session),
    user_service: UserService = Depends(get_user_service),
) -> PasswordResetResponse:
    """
    Admin-initiated password reset with temporary password (AC-5).

    Steps:
    1. Verify user exists
    2. Generate secure 16-char temporary password
    3. Hash and set as user's password
    4. Set force_password_change = True
    5. Revoke JWT tokens (updated_at)
    6. Log to AuditLog and AuthAuditLog
    7. Queue password reset email

    Args:
        user_id: User UUID to reset
        current_user: Admin user performing the reset
        db: Database session
        user_service: User service instance

    Returns:
        PasswordResetResponse with temporary password (shown only once)

    Raises:
        404: User not found

    Security:
        - Requires admin role
        - Temp password: 16 chars with uppercase, lowercase, digits, special chars
        - force_password_change flag enforced on next login
        - JWT revocation invalidates existing sessions

    Story: nextjs-story-22-users-api-crud (AC-5)
    """
    # Reset password
    temp_password = await user_service.reset_password_admin(
        user_id=user_id,
        current_user=current_user,
        db=db,
    )

    return PasswordResetResponse(
        temporary_password=temp_password,
        message="Temporary password generated. User will be required to change password on next login.",
    )

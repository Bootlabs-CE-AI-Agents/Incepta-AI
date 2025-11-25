"""
User management Pydantic schemas for request/response validation.

This module provides data transfer objects (DTOs) for user CRUD operations:
- Request schemas: UserListQueryParams, UserCreateRequest, UserUpdateRequest
- Response schemas: UserDetailDTO, PaginatedUsersResponse, PasswordResetResponse
- Nested schemas: UserRoleDTO for role assignments
- Validators: Password strength (5 rules), email format

Story: nextjs-story-22-users-api-crud
Epic: Sprint 3 - User & Role Management
"""

import re
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing_extensions import Self

from src.database.models import RoleEnum


# ==============================================================================
# Password Validation Helpers
# ==============================================================================


def validate_password_strength(password: str) -> str:
    """
    Validate password meets security requirements (AC-2, AC-8).

    Requirements:
    - Min 8 characters
    - At least 1 uppercase letter (A-Z)
    - At least 1 lowercase letter (a-z)
    - At least 1 number (0-9)
    - At least 1 special character (!@#$%^&*)
    - No whitespace

    Args:
        password: Password to validate

    Returns:
        Password if valid

    Raises:
        ValueError: If password doesn't meet requirements

    Example:
        >>> validate_password_strength("SecurePass123!")
        'SecurePass123!'
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")

    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least 1 uppercase letter")

    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least 1 lowercase letter")

    if not re.search(r"[0-9]", password):
        raise ValueError("Password must contain at least 1 number")

    if not re.search(r"[!@#$%^&*]", password):
        raise ValueError("Password must contain at least 1 special character (!@#$%^&*)")

    if re.search(r"\s", password):
        raise ValueError("Password cannot contain whitespace")

    return password


# ==============================================================================
# Nested Schemas
# ==============================================================================


class UserRoleDTO(BaseModel):
    """
    User role assignment for a specific tenant.

    Represents a user's role within a tenant context.
    A user can have different roles across multiple tenants.

    Attributes:
        role: Role enum value (super_admin, tenant_admin, developer, operator, viewer)
        tenant_id: String identifier of the tenant for this role assignment
        tenant_name: Human-readable tenant name (optional, for display)
    """

    role: RoleEnum
    tenant_id: str
    tenant_name: Optional[str] = None

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "role": "tenant_admin",
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "tenant_name": "Tenant A",
            }
        },
    }


# ==============================================================================
# Request Schemas
# ==============================================================================


class UserListQueryParams(BaseModel):
    """
    Query parameters for GET /api/users endpoint (AC-1, AC-3).

    Supports pagination, filtering by tenant, status, and role, and email search.

    Attributes:
        search: Filter by email (case-insensitive substring match)
        tenant_id: Filter by tenant (optional, UUID)
        is_active: Filter by active status (optional, boolean)
        role: Filter by role enum value (optional, string)
        limit: Items per page (default 20, max 100)
        offset: Pagination offset (default 0)
    """

    search: Optional[str] = None
    tenant_id: Optional[UUID] = None
    is_active: Optional[bool] = None
    role: Optional[RoleEnum] = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)

    model_config = {
        "json_schema_extra": {
            "example": {
                "search": "admin",
                "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "is_active": True,
                "role": "developer",
                "limit": 20,
                "offset": 0,
            }
        }
    }


class UserCreateRequest(BaseModel):
    """
    Request body for POST /api/users endpoint (AC-2).

    Creates a new user with password validation and initial role assignment.

    Attributes:
        email: User email (RFC 5322 format, unique case-insensitive)
        password: User password (validated for strength)
        default_tenant_id: UUID of the user's default tenant (must exist)
        initial_role: Initial role to assign (RoleEnum value)
        send_welcome_email: Whether to send welcome email (default True)
    """

    email: EmailStr
    password: str = Field(min_length=8)
    default_tenant_id: UUID
    initial_role: RoleEnum
    send_welcome_email: bool = True

    @field_validator("password")
    @classmethod
    def validate_password_strength_field(cls, v: str) -> str:
        """
        Validate password strength using 5 security rules.

        Applies validate_password_strength() helper function.
        """
        return validate_password_strength(v)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        """
        Normalize email to lowercase for case-insensitive uniqueness.

        Example:
            'User@Example.COM' -> 'user@example.com'
        """
        return v.lower()

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "newuser@example.com",
                "password": "SecureP@ss123",
                "default_tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "initial_role": "developer",
                "send_welcome_email": True,
            }
        }
    }


class UserUpdateRequest(BaseModel):
    """
    Request body for PUT /api/users/{id} endpoint (AC-3).

    All fields are optional. Only provided fields will be updated.

    Attributes:
        email: New email (RFC 5322 format, unique case-insensitive, optional)
        is_active: New active status (optional, cannot disable last super_admin)
        default_tenant_id: New default tenant UUID (optional, must exist)
    """

    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    default_tenant_id: Optional[UUID] = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: Optional[str]) -> Optional[str]:
        """Normalize email to lowercase if provided."""
        return v.lower() if v else v

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "updated@example.com",
                "is_active": False,
                "default_tenant_id": "987e6543-e21b-12d3-a456-426614174000",
            }
        }
    }


# ==============================================================================
# Response Schemas
# ==============================================================================


class UserDetailDTO(BaseModel):
    """
    Detailed user profile response (AC-1, AC-2, AC-3).

    Returned by GET /api/users, POST /api/users, PUT /api/users/{id}.

    Attributes:
        id: User UUID (globally unique)
        email: User email (lowercase normalized)
        is_active: Account active status (False for soft-deleted)
        default_tenant_id: UUID of default tenant
        default_tenant_name: Name of default tenant (optional, for display)
        roles: List of role assignments across tenants
        last_login_at: Last successful login timestamp (nullable)
        created_at: Account creation timestamp
        updated_at: Last update timestamp
    """

    id: UUID
    email: str
    is_active: bool
    default_tenant_id: UUID
    default_tenant_name: Optional[str] = None
    roles: list[UserRoleDTO] = []
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "user@example.com",
                "is_active": True,
                "default_tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                "default_tenant_name": "Tenant A",
                "roles": [
                    {
                        "role": "tenant_admin",
                        "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                        "tenant_name": "Tenant A",
                    }
                ],
                "last_login_at": "2025-11-23T10:00:00Z",
                "created_at": "2025-10-01T08:30:00Z",
                "updated_at": "2025-11-20T14:15:00Z",
            }
        },
    }


class PaginatedUsersResponse(BaseModel):
    """
    Paginated list response for GET /api/users endpoint (AC-1).

    Attributes:
        items: List of user details (page of results)
        total: Total count of users matching filters
        limit: Items per page (from request)
        offset: Pagination offset (from request)
    """

    items: list[UserDetailDTO]
    total: int
    limit: int
    offset: int

    model_config = {
        "json_schema_extra": {
            "example": {
                "items": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174000",
                        "email": "user@example.com",
                        "is_active": True,
                        "default_tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                        "default_tenant_name": "Tenant A",
                        "roles": [
                            {
                                "role": "tenant_admin",
                                "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
                                "tenant_name": "Tenant A",
                            }
                        ],
                        "last_login_at": "2025-11-23T10:00:00Z",
                        "created_at": "2025-10-01T08:30:00Z",
                        "updated_at": "2025-11-20T14:15:00Z",
                    }
                ],
                "total": 45,
                "limit": 20,
                "offset": 0,
            }
        }
    }


class PasswordResetResponse(BaseModel):
    """
    Response for POST /api/users/{id}/reset-password endpoint (AC-5).

    Returns the temporary password (shown only once).

    Attributes:
        temporary_password: Generated secure 16-char password (shown once)
        message: Instruction message for user
    """

    temporary_password: str
    message: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "temporary_password": "Temp@Pass789Xy12",
                "message": "Temporary password generated. User will be required to change password on next login.",
            }
        }
    }


# ==============================================================================
# Role Assignment Schemas (Story nextjs-story-25)
# ==============================================================================


class RoleAssignmentCreate(BaseModel):
    """
    Request schema for assigning a role to a user (AC-1, AC-8).

    Attributes:
        tenant_id: Tenant ID for role assignment
        role: Role to assign (super_admin, tenant_admin, developer, operator, viewer)

    Validation:
        - tenant_id must be valid UUID
        - role must be one of RoleEnum values

    Example:
        {
            "tenant_id": "abc-123-def-456",
            "role": "developer"
        }
    """

    tenant_id: UUID = Field(..., description="Tenant ID for role assignment")
    role: RoleEnum = Field(..., description="Role to assign")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: RoleEnum) -> RoleEnum:
        """Validate role is a valid RoleEnum value."""
        if v not in RoleEnum:
            valid_roles = ", ".join([role.value for role in RoleEnum])
            raise ValueError(f"Invalid role. Must be one of: {valid_roles}")
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "tenant_id": "abc-123-def-456",
                "role": "developer",
            }
        }
    }


class RoleAssignmentResponse(BaseModel):
    """
    Response schema for role assignment operations (AC-1, AC-2, AC-3, AC-8).

    Attributes:
        id: Role assignment UUID
        user_id: User UUID
        tenant_id: Tenant ID (VARCHAR, matches TenantConfig.tenant_id)
        tenant_name: Tenant display name (joined from TenantConfig)
        role: Assigned role
        created_at: Assignment timestamp (UTC)
        created_by: Admin user who assigned the role (UUID)

    Example:
        {
            "id": "role-assignment-uuid",
            "user_id": "user-uuid",
            "tenant_id": "abc-123",
            "tenant_name": "Acme Corp",
            "role": "developer",
            "created_at": "2025-11-24T12:00:00Z",
            "created_by": "admin-user-uuid"
        }
    """

    id: UUID
    user_id: UUID
    tenant_id: str  # VARCHAR tenant_id from UserTenantRole/TenantConfig
    tenant_name: Optional[str] = Field(
        None, description="Tenant display name (joined from TenantConfig)"
    )
    role: RoleEnum
    created_at: datetime
    created_by: Optional[UUID] = Field(
        None, description="Admin user who assigned this role"
    )

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "user_id": "660e8400-e29b-41d4-a716-446655440000",
                "tenant_id": "abc-123-def-456",
                "tenant_name": "Acme Corporation",
                "role": "developer",
                "created_at": "2025-11-24T12:00:00Z",
                "created_by": "770e8400-e29b-41d4-a716-446655440000",
            }
        },
    }


class RoleInfo(BaseModel):
    """
    Metadata about available roles (AC-4).

    Attributes:
        role: Role enum value
        display_name: Human-readable label for UI
        description: Explanation of role capabilities
        level: Hierarchy level (1=highest privilege, 5=lowest)

    Example:
        {
            "role": "super_admin",
            "display_name": "Super Admin",
            "description": "Full system access across all tenants",
            "level": 1
        }
    """

    role: RoleEnum
    display_name: str
    description: str
    level: int = Field(..., ge=1, le=5, description="Role hierarchy level (1-5)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "role": "developer",
                "display_name": "Developer",
                "description": "Can create and manage agents, prompts, tools",
                "level": 3,
            }
        }
    }

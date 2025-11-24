"""
Public Tenants API Endpoints

Provides tenant management endpoints for authenticated users.
Unlike /admin/tenants which requires admin API key, these endpoints
use standard session authentication and return data based on user permissions.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import List

from src.database.session import get_async_session
from src.database.models import TenantConfig, User
from src.api.dependencies import get_current_active_user, get_tenant_id, get_tenant_db
from src.schemas.tenant import TenantConfigCreate, TenantConfigUpdate, TenantConfigResponse, EnhancementPreferences
from src.services.tenant_service import TenantService
from src.cache.redis_client import get_redis_client
from loguru import logger

router = APIRouter(prefix="/api/v1/tenants", tags=["tenants"])


# ============================================================================
# Response Schemas
# ============================================================================


class TenantResponse:
    """Public tenant response (minimal fields for frontend)."""

    def __init__(self, tenant: TenantConfig):
        self.id = tenant.id
        self.tenant_id = tenant.tenant_id
        self.name = tenant.name or tenant.tenant_id
        self.description = f"Tenant {tenant.tenant_id}"
        self.logo = None
        self.agent_count = 0  # TODO: Query actual agent count
        self.created_at = tenant.created_at.isoformat()
        self.updated_at = tenant.updated_at.isoformat() if tenant.updated_at else tenant.created_at.isoformat()

    def dict(self):
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "name": self.name,
            "description": self.description,
            "logo": self.logo,
            "agent_count": self.agent_count,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


# ============================================================================
# Endpoints
# ============================================================================


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_tenant(
    config: TenantConfigCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_session),
) -> dict:
    """
    Create a new tenant configuration.

    This endpoint uses get_async_session instead of get_tenant_db to avoid
    setting the tenant context, which would fail validation since the tenant
    doesn't exist yet. The permissive INSERT policy allows tenant creation
    when tenant context is not set.

    Args:
        config: Tenant configuration data from request body
        current_user: Authenticated user from session
        db: Database session (without tenant context for admin operation)

    Returns:
        Created tenant object with masked sensitive fields

    Raises:
        HTTPException(400): If tenant_id already exists or validation fails
        HTTPException(500): If tenant creation fails
    """
    try:
        # Auto-generate tenant_id from name if not provided
        if not config.tenant_id or config.tenant_id.strip() == "":
            # Generate tenant_id from name: lowercase, replace spaces with hyphens, remove special chars
            import re
            generated_id = re.sub(r'[^a-z0-9\-]', '', config.name.lower().replace(' ', '-'))
            config.tenant_id = generated_id[:100]  # Ensure max length
            logger.info(f"Auto-generated tenant_id: {config.tenant_id} from name: {config.name}")

        # Get Redis client for tenant service
        redis_client = await get_redis_client()

        # Initialize tenant service
        tenant_service = TenantService(db, redis_client)

        # Create tenant using service layer (handles encryption, LiteLLM key creation, etc.)
        tenant_internal = await tenant_service.create_tenant(config)

        # Commit the transaction
        await db.commit()

        # Convert to response format (masks sensitive fields)
        response = TenantConfigResponse(
            id=tenant_internal.id,
            tenant_id=tenant_internal.tenant_id,
            name=tenant_internal.name,
            tool_type=tenant_internal.tool_type,
            servicedesk_url=tenant_internal.servicedesk_url,
            servicedesk_api_key_encrypted="***encrypted***",
            jira_url=tenant_internal.jira_url,
            jira_api_token_encrypted="***encrypted***",
            jira_project_key=tenant_internal.jira_project_key,
            webhook_signing_secret_encrypted="***encrypted***",
            enhancement_preferences=tenant_internal.enhancement_preferences,
            is_active=tenant_internal.is_active,
            created_at=tenant_internal.created_at,
            updated_at=tenant_internal.updated_at,
        )

        logger.info(
            f"User {current_user.email} created tenant {tenant_internal.tenant_id}",
            extra={"user_id": current_user.id, "tenant_id": tenant_internal.tenant_id}
        )

        return response.model_dump()

    except ValueError as e:
        # Validation errors or business logic errors
        logger.warning(
            f"Tenant creation validation failed: {str(e)}",
            extra={"user_id": current_user.id, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        # Rollback on any error
        await db.rollback()

        logger.error(
            f"Failed to create tenant: {str(e)}",
            extra={"user_id": current_user.id, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tenant: {str(e)}",
        )


@router.get("")
async def list_tenants(
    current_user: User = Depends(get_current_active_user),
    current_tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_tenant_db),
) -> List[dict]:
    """
    List all tenants accessible to the authenticated user.

    For now, returns all tenants since we don't have granular
    tenant-level permissions implemented yet. In the future,
    this should filter based on user's tenant associations.

    Args:
        db: Database session
        current_user: Authenticated user from session

    Returns:
        List of tenant objects with basic information

    Raises:
        HTTPException(401): If user is not authenticated
    """
    try:
        # Query all tenant configs
        # TODO: Filter by user's tenant associations when RBAC is implemented
        stmt = select(TenantConfig).order_by(TenantConfig.created_at.desc())
        result = await db.execute(stmt)
        tenants = result.scalars().all()

        # Convert to response format
        tenant_list = [TenantResponse(t).dict() for t in tenants]

        logger.info(
            f"User {current_user.email} listed {len(tenant_list)} tenants",
            extra={"user_id": current_user.id, "tenant_count": len(tenant_list)}
        )

        return tenant_list

    except Exception as e:
        logger.error(
            f"Failed to list tenants: {str(e)}",
            extra={"user_id": current_user.id, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve tenant list",
        )


@router.get("/{tenant_identifier}")
async def get_tenant(
    tenant_identifier: str,
    current_user: User = Depends(get_current_active_user),
    current_tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_tenant_db),
) -> dict:
    """
    Get specific tenant by ID (UUID) or tenant_id (slug).

    Args:
        tenant_identifier: Tenant UUID or tenant_id slug
        db: Database session
        current_user: Authenticated user from session

    Returns:
        Tenant object with basic information

    Raises:
        HTTPException(404): If tenant not found
        HTTPException(403): If user doesn't have access to this tenant
    """
    try:
        # Try to parse as UUID first, if it fails, treat as tenant_id slug
        from uuid import UUID as UUIDType
        try:
            # If it's a valid UUID, query by id
            uuid_obj = UUIDType(tenant_identifier)
            stmt = select(TenantConfig).where(TenantConfig.id == uuid_obj)
        except ValueError:
            # If not a UUID, query by tenant_id (slug)
            stmt = select(TenantConfig).where(TenantConfig.tenant_id == tenant_identifier)

        result = await db.execute(stmt)
        tenant = result.scalar_one_or_none()

        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant '{tenant_identifier}' not found",
            )

        tenant_response = TenantResponse(tenant).dict()

        logger.info(
            f"User {current_user.email} accessed tenant {tenant_identifier}",
            extra={"user_id": current_user.id, "tenant_id": tenant_identifier}
        )

        return tenant_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to get tenant {tenant_identifier}: {str(e)}",
            extra={"user_id": current_user.id, "tenant_id": tenant_identifier, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tenant: {str(e)}",
        )


@router.put("/{tenant_identifier}")
async def update_tenant(
    tenant_identifier: str,
    updates: TenantConfigUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_session),
) -> dict:
    """
    Update tenant configuration by ID (UUID) or tenant_id (slug).

    This endpoint uses get_async_session instead of get_tenant_db to allow
    admins to update any tenant without tenant context restrictions.

    Args:
        tenant_identifier: Tenant UUID or tenant_id slug
        updates: Partial updates to apply (only provided fields are updated)
        current_user: Authenticated user from session
        db: Database session (without tenant context for admin operation)

    Returns:
        Updated tenant object with masked sensitive fields

    Raises:
        HTTPException(404): If tenant not found
        HTTPException(400): If validation fails
        HTTPException(500): If update fails
    """
    try:
        # Resolve tenant_identifier to tenant_id (slug)
        # The TenantService.update_tenant expects tenant_id (slug), not UUID
        from uuid import UUID as UUIDType
        try:
            # If it's a valid UUID, query by id to get tenant_id
            uuid_obj = UUIDType(tenant_identifier)
            stmt = select(TenantConfig).where(TenantConfig.id == uuid_obj)
        except ValueError:
            # If not a UUID, query by tenant_id (slug)
            stmt = select(TenantConfig).where(TenantConfig.tenant_id == tenant_identifier)

        result = await db.execute(stmt)
        tenant = result.scalar_one_or_none()

        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant '{tenant_identifier}' not found",
            )

        # Use the tenant_id (slug) for service layer operations
        tenant_id_slug = tenant.tenant_id

        # Get Redis client for tenant service
        redis_client = await get_redis_client()

        # Initialize tenant service
        tenant_service = TenantService(db, redis_client)

        # Update tenant using service layer (handles encryption, cache invalidation)
        tenant_internal = await tenant_service.update_tenant(tenant_id_slug, updates)

        # Commit the transaction
        await db.commit()

        # Convert to response format (masks sensitive fields)
        response = TenantConfigResponse(
            id=tenant_internal.id,
            tenant_id=tenant_internal.tenant_id,
            name=tenant_internal.name,
            description=tenant_internal.description,
            logo=tenant_internal.logo,
            tool_type=tenant_internal.tool_type or "servicedesk_plus",
            servicedesk_url=tenant_internal.servicedesk_url,
            servicedesk_api_key_encrypted="***encrypted***",
            jira_url=tenant_internal.jira_url,
            jira_api_token_encrypted="***encrypted***",
            jira_project_key=tenant_internal.jira_project_key,
            webhook_signing_secret_encrypted="***encrypted***",
            enhancement_preferences=tenant_internal.enhancement_preferences,
            is_active=tenant_internal.is_active,
            created_at=tenant_internal.created_at,
            updated_at=tenant_internal.updated_at,
        )

        logger.info(
            f"User {current_user.email} updated tenant {tenant_id_slug}",
            extra={"user_id": current_user.id, "tenant_id": tenant_id_slug}
        )

        return response.model_dump()

    except HTTPException:
        raise
    except ValueError as e:
        # Validation errors or business logic errors
        logger.warning(
            f"Tenant update validation failed: {str(e)}",
            extra={"user_id": current_user.id, "tenant_id": tenant_identifier, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        # Rollback on any error
        await db.rollback()

        logger.error(
            f"Failed to update tenant {tenant_identifier}: {str(e)}",
            extra={"user_id": current_user.id, "tenant_id": tenant_identifier, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tenant: {str(e)}",
        )



@router.delete("/{tenant_identifier}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    tenant_identifier: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_session),
) -> None:
    """
    Delete tenant configuration by ID (UUID) or tenant_id (slug).

    This endpoint uses get_async_session instead of get_tenant_db to allow
    admins to delete any tenant without tenant context restrictions.

    Args:
        tenant_identifier: Tenant UUID or tenant_id slug
        current_user: Authenticated user from session
        db: Database session (without tenant context for admin operation)

    Raises:
        HTTPException(404): If tenant not found
        HTTPException(500): If deletion fails
    """
    try:
        # Resolve tenant_identifier to tenant_id (slug)
        # The TenantService.delete_tenant expects tenant_id (slug), not UUID
        from uuid import UUID as UUIDType
        try:
            # If it's a valid UUID, query by id to get tenant_id
            uuid_obj = UUIDType(tenant_identifier)
            stmt = select(TenantConfig).where(TenantConfig.id == uuid_obj)
        except ValueError:
            # If not a UUID, query by tenant_id (slug)
            stmt = select(TenantConfig).where(TenantConfig.tenant_id == tenant_identifier)

        result = await db.execute(stmt)
        tenant = result.scalar_one_or_none()

        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant '{tenant_identifier}' not found",
            )

        # Use the tenant_id (slug) for service layer operations
        tenant_id_slug = tenant.tenant_id

        # Set tenant context for RLS policy to allow deletion
        await db.execute(text(f"SET app.current_tenant_id = '{tenant_id_slug}'"))

        # Get Redis client for tenant service
        redis_client = await get_redis_client()

        # Initialize tenant service
        tenant_service = TenantService(db, redis_client)

        # Delete tenant using service layer (handles cascade deletion of related records)
        await tenant_service.delete_tenant(tenant_id_slug)

        # Commit the transaction
        await db.commit()

        logger.info(
            f"User {current_user.email} deleted tenant {tenant_id_slug}",
            extra={"user_id": current_user.id, "tenant_id": tenant_id_slug}
        )

    except HTTPException:
        raise
    except Exception as e:
        # Rollback on any error
        await db.rollback()

        logger.error(
            f"Failed to delete tenant {tenant_identifier}: {str(e)}",
            extra={"user_id": current_user.id, "tenant_id": tenant_identifier, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete tenant: {str(e)}",
        )

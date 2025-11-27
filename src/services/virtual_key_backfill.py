"""
Virtual Key Backfill Service.

Story 8.9 Enhancement: Automatically create LiteLLM virtual keys for
tenants that don't have them. This handles:
- Tenants created before Story 8.9 was implemented
- Tenants created via direct DB insertion (seed script, migrations)
- Tenants created when LiteLLM was unavailable (degraded mode)

This service runs at application startup to ensure all tenants have
the virtual keys needed for LLM cost tracking and budget enforcement.
"""

import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy import select, text

from src.config import settings
from src.database.session import get_async_session
from src.database.models import TenantConfig
from src.utils.encryption import encrypt

logger = logging.getLogger(__name__)


async def create_virtual_key_for_tenant(tenant_id: str, max_budget: float = 100.0) -> str | None:
    """
    Create a LiteLLM virtual key for a tenant.

    Args:
        tenant_id: The tenant identifier
        max_budget: Maximum budget in USD for this key (default: 100)

    Returns:
        The virtual key string, or None if creation failed
    """
    litellm_proxy_url = getattr(settings, "litellm_proxy_url", None) or "http://litellm:4000"
    litellm_master_key = getattr(settings, "litellm_master_key", None)

    if not litellm_master_key:
        logger.warning("LITELLM_MASTER_KEY not configured, skipping virtual key creation")
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{litellm_proxy_url}/key/generate",
                headers={
                    "Authorization": f"Bearer {litellm_master_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "key_name": f"{tenant_id}-tenant-key",
                    "max_budget": max_budget,
                    "metadata": {"tenant_id": tenant_id},
                },
            )

            if response.status_code == 200:
                data = response.json()
                virtual_key = data.get("key")
                if virtual_key:
                    logger.info(f"Created LiteLLM virtual key for tenant '{tenant_id}'")
                    return virtual_key

            logger.warning(
                f"LiteLLM key creation failed for tenant '{tenant_id}': "
                f"{response.status_code} - {response.text[:200]}"
            )
            return None

    except httpx.ConnectError:
        logger.warning(
            f"Could not connect to LiteLLM at {litellm_proxy_url} - "
            f"skipping virtual key creation for tenant '{tenant_id}'"
        )
        return None
    except Exception as e:
        logger.warning(f"Error creating virtual key for tenant '{tenant_id}': {e}")
        return None


async def backfill_virtual_keys_on_startup() -> int:
    """
    Backfill LiteLLM virtual keys for tenants that don't have them.

    Called at application startup to ensure all tenants have virtual keys
    for cost tracking and budget enforcement.

    Returns:
        Number of tenants that were updated with new virtual keys
    """
    logger.info("Checking for tenants missing LiteLLM virtual keys...")

    updated = 0

    async for db in get_async_session():
        try:
            # Find tenants without virtual keys
            result = await db.execute(
                select(TenantConfig).where(
                    (TenantConfig.litellm_virtual_key.is_(None)) |
                    (TenantConfig.litellm_virtual_key == '')
                )
            )
            tenants_needing_keys = result.scalars().all()

            if not tenants_needing_keys:
                logger.info("All tenants have virtual keys configured")
                return 0

            logger.info(f"Found {len(tenants_needing_keys)} tenant(s) missing virtual keys")

            for tenant in tenants_needing_keys:
                virtual_key = await create_virtual_key_for_tenant(tenant.tenant_id)

                if virtual_key:
                    # Encrypt and store the key
                    encrypted_key = encrypt(virtual_key)
                    await db.execute(
                        text("""
                            UPDATE tenant_configs
                            SET litellm_virtual_key = :key,
                                litellm_key_created_at = :created_at
                            WHERE tenant_id = :tenant_id
                        """),
                        {
                            "key": encrypted_key,
                            "created_at": datetime.now(timezone.utc),
                            "tenant_id": tenant.tenant_id,
                        }
                    )
                    updated += 1
                    logger.info(f"Backfilled virtual key for tenant '{tenant.tenant_id}'")

            await db.commit()

            if updated > 0:
                logger.info(f"Virtual key backfill complete: {updated}/{len(tenants_needing_keys)} tenants updated")
            else:
                logger.warning(
                    f"Virtual key backfill: 0/{len(tenants_needing_keys)} tenants updated "
                    "(LiteLLM may be unavailable)"
                )

        except Exception as e:
            logger.error(f"Error during virtual key backfill: {e}")
            await db.rollback()
            raise
        finally:
            await db.close()
            break

    return updated

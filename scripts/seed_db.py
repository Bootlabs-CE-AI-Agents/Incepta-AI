"""
Database seeding script for AI Agents Platform.

Creates default tenant if it doesn't exist.
Also creates LiteLLM virtual keys for tenants that don't have them.
Safe to run multiple times - only creates missing data.
"""
import asyncio
import os
import sys
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone

import httpx

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.database.session import get_async_session
from sqlalchemy import select, text
from src.database.models import TenantConfig
from src.utils.encryption import encrypt


# LiteLLM configuration
LITELLM_PROXY_URL = os.getenv("LITELLM_PROXY_URL", "http://litellm:4000")
LITELLM_MASTER_KEY = os.getenv("AI_AGENTS_LITELLM_MASTER_KEY", os.getenv("LITELLM_MASTER_KEY", ""))


async def create_virtual_key_for_tenant(tenant_id: str, max_budget: float = 100.0) -> str | None:
    """
    Create a LiteLLM virtual key for a tenant.

    Args:
        tenant_id: The tenant identifier
        max_budget: Maximum budget in USD for this key (default: 100)

    Returns:
        The virtual key string, or None if creation failed
    """
    if not LITELLM_MASTER_KEY:
        print(f"  ⚠️  LITELLM_MASTER_KEY not set, skipping virtual key creation")
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{LITELLM_PROXY_URL}/key/generate",
                headers={
                    "Authorization": f"Bearer {LITELLM_MASTER_KEY}",
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
                    print(f"  ✓ Created LiteLLM virtual key for tenant '{tenant_id}'")
                    return virtual_key

            print(f"  ⚠️  LiteLLM key creation failed: {response.status_code} - {response.text[:100]}")
            return None

    except httpx.ConnectError:
        print(f"  ⚠️  Could not connect to LiteLLM at {LITELLM_PROXY_URL} - skipping virtual key")
        return None
    except Exception as e:
        print(f"  ⚠️  Error creating virtual key: {e}")
        return None


async def backfill_missing_virtual_keys(db) -> int:
    """
    Backfill virtual keys for tenants that don't have them.

    Args:
        db: Database session

    Returns:
        Number of tenants updated
    """
    print("\n🔑 Checking for tenants missing LiteLLM virtual keys...")

    # Find tenants without virtual keys
    result = await db.execute(
        select(TenantConfig).where(
            (TenantConfig.litellm_virtual_key.is_(None)) |
            (TenantConfig.litellm_virtual_key == '')
        )
    )
    tenants_needing_keys = result.scalars().all()

    if not tenants_needing_keys:
        print("✓ All tenants have virtual keys configured")
        return 0

    updated = 0
    for tenant in tenants_needing_keys:
        print(f"  → Tenant '{tenant.tenant_id}' needs virtual key...")
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

    await db.commit()
    print(f"✓ Updated {updated}/{len(tenants_needing_keys)} tenants with virtual keys")
    return updated


async def seed_database():
    """Seed the database with default data."""
    print("🌱 Starting database seed...")

    async for db in get_async_session():
        try:
            tenants_created = 0

            # Define default tenants to create
            default_tenants = [
                {
                    "tenant_id": "default",
                    "name": "Default Tenant",
                    "description": "Default tenant for development and testing",
                    "logo": None,
                },
                {
                    "tenant_id": "production",
                    "name": "Production Tenant",
                    "description": "Main production environment",
                    "logo": "https://upload.wikimedia.org/wikipedia/en/thumb/1/1e/Mahindra_Last_Mile_Mobility_Limited.svg/330px-Mahindra_Last_Mile_Mobility_Limited.svg.png",
                }
            ]

            # Check and create each tenant (bypassing service layer to avoid plugin dependency)
            for tenant_info in default_tenants:
                result = await db.execute(
                    select(TenantConfig).where(TenantConfig.tenant_id == tenant_info["tenant_id"])
                )
                existing_tenant = result.scalar_one_or_none()

                if not existing_tenant:
                    print(f"Creating '{tenant_info['tenant_id']}' tenant...")

                    # Direct database insert bypassing service layer
                    insert_stmt = text("""
                        INSERT INTO tenant_configs (
                            id, tenant_id, name, description, logo,
                            servicedesk_url, servicedesk_api_key_encrypted, webhook_signing_secret_encrypted,
                            enhancement_preferences, is_active, tool_type
                        ) VALUES (
                            :id, :tenant_id, :name, :description, :logo,
                            :servicedesk_url, :api_key, :webhook_secret,
                            :enhancement_prefs, :is_active, :tool_type
                        )
                    """)

                    await db.execute(insert_stmt, {
                        "id": str(uuid4()),
                        "tenant_id": tenant_info["tenant_id"],
                        "name": tenant_info["name"],
                        "description": tenant_info["description"],
                        "logo": tenant_info["logo"],
                        "servicedesk_url": "https://servicedesk.example.com",
                        "api_key": os.getenv("DEFAULT_SERVICEDESK_API_KEY", "change_this_api_key"),
                        "webhook_secret": os.getenv("DEFAULT_WEBHOOK_SECRET", "change_this_webhook_secret"),
                        "enhancement_prefs": '{"enabled": true}',
                        "is_active": True,
                        "tool_type": "servicedesk_plus"
                    })

                    print(f"✓ Created tenant: {tenant_info['name']} (ID: {tenant_info['tenant_id']})")
                    tenants_created += 1
                else:
                    print(f"✓ Tenant '{tenant_info['tenant_id']}' already exists")

            await db.commit()

            if tenants_created > 0:
                print(f"\n✅ Database seed completed successfully! Created {tenants_created} tenant(s).")
            else:
                print("\n✅ Database already seeded - all tenants exist.")

            # Backfill virtual keys for any tenants missing them
            await backfill_missing_virtual_keys(db)

            print("\nℹ️  To create admin user, run:")
            print("   docker exec ai-agents-api python3 create_admin.py")

        except Exception as e:
            print(f"\n❌ Error seeding database: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()
            raise
        finally:
            await db.close()
            break


if __name__ == "__main__":
    asyncio.run(seed_database())

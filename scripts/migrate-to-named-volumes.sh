#!/bin/bash
# Migration script to move data from bind mounts to Docker named volumes
# This preserves existing data while fixing the persistence issue

set -e  # Exit on error

echo "========================================="
echo "Migrating to Docker Named Volumes"
echo "========================================="
echo ""

# Step 1: Stop containers
echo "Step 1: Stopping containers..."
docker-compose down
echo "✅ Containers stopped"
echo ""

# Step 2: Create named volumes if they don't exist
echo "Step 2: Creating named volumes..."
docker volume create ai-ops_postgres_data || echo "postgres_data volume already exists"
docker volume create ai-ops_redis_data || echo "redis_data volume already exists"
echo "✅ Named volumes created"
echo ""

# Step 3: Start temporary containers to copy data
echo "Step 3: Copying data from bind mounts to named volumes..."

# Copy PostgreSQL data
if [ -d "./data/postgres" ] && [ "$(ls -A ./data/postgres)" ]; then
    echo "  - Migrating PostgreSQL data..."
    docker run --rm \
        -v "$(pwd)/data/postgres:/source:ro" \
        -v ai-ops_postgres_data:/target \
        alpine sh -c "cp -a /source/. /target/"
    echo "  ✅ PostgreSQL data migrated"
else
    echo "  ⚠️  No PostgreSQL data to migrate"
fi

# Copy Redis data
if [ -d "./data/redis" ] && [ "$(ls -A ./data/redis)" ]; then
    echo "  - Migrating Redis data..."
    docker run --rm \
        -v "$(pwd)/data/redis:/source:ro" \
        -v ai-ops_redis_data:/target \
        alpine sh -c "cp -a /source/. /target/"
    echo "  ✅ Redis data migrated"
else
    echo "  ⚠️  No Redis data to migrate"
fi

echo ""

# Step 4: Backup old data directory
echo "Step 4: Backing up old bind mount data..."
if [ -d "./data" ]; then
    BACKUP_DIR="./data_backup_$(date +%Y%m%d_%H%M%S)"
    mv ./data "$BACKUP_DIR"
    echo "  ✅ Old data backed up to: $BACKUP_DIR"
    echo "  💡 You can delete this backup after verifying everything works"
else
    echo "  ⚠️  No data directory to backup"
fi

echo ""

# Step 5: Start containers with new volumes
echo "Step 5: Starting containers with named volumes..."
docker-compose up -d
echo "✅ Containers started"
echo ""

# Step 6: Wait for health checks
echo "Step 6: Waiting for services to be healthy..."
sleep 5
docker-compose ps
echo ""

echo "========================================="
echo "✅ Migration Complete!"
echo "========================================="
echo ""
echo "What happened:"
echo "  1. Data copied from ./data/postgres → docker volume 'ai-ops_postgres_data'"
echo "  2. Data copied from ./data/redis → docker volume 'ai-ops_redis_data'"
echo "  3. Old ./data directory backed up"
echo "  4. Containers now using persistent named volumes"
echo ""
echo "Benefits:"
echo "  ✅ Data persists across Docker restarts"
echo "  ✅ Data NOT dependent on local file system"
echo "  ✅ Data managed by Docker (harder to accidentally delete)"
echo ""
echo "To verify:"
echo "  docker volume ls | grep ai-ops"
echo "  docker-compose ps"
echo ""

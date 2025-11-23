#!/bin/bash
set -e

# Create litellm_db database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE litellm_db'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'litellm_db')\gexec
EOSQL

echo "✓ Database 'litellm_db' created or already exists"

#!/bin/bash
set -e

# Wait for postgres to be ready
echo "Waiting for PostgreSQL to be ready..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U $POSTGRES_USER -d $POSTGRES_DB -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is up - running migrations..."
alembic upgrade head

echo "Seeding database with initial data..."
python3 scripts/seed_db.py || echo "Warning: Database seeding failed or skipped"

echo "Starting FastAPI application..."
# --forwarded-allow-ips '*' trusts X-Forwarded-Proto header from reverse proxies
# This ensures HTTPS scheme is preserved in redirects when behind Cloudflare Tunnel, nginx, etc.
# See: https://fastapi.tiangolo.com/advanced/behind-a-proxy/
exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --forwarded-allow-ips '*' "$@"

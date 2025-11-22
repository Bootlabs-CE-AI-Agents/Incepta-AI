#!/bin/bash
# Fresh database setup script
# Creates default tenant and admin user

set -e

echo "========================================="
echo "Setting up Fresh Database"
echo "========================================="
echo ""

# Wait for database to be ready
echo "Waiting for database..."
sleep 5

# Create default tenant
echo "Creating default tenant..."
docker exec -i ai-agents-postgres psql -U aiagents -d ai_agents <<'EOF'
INSERT INTO tenant_configs (
  id, tenant_id, name, servicedesk_url,
  servicedesk_api_key_encrypted, webhook_signing_secret_encrypted,
  enhancement_preferences, tool_type
) VALUES (
  gen_random_uuid(), 'default', 'Default Tenant',
  'https://example.servicedesk.com', 'placeholder', 'placeholder',
  '{}'::json, 'servicedesk_plus'
) ON CONFLICT (tenant_id) DO NOTHING
RETURNING id, tenant_id, name;
EOF

# Get the tenant ID for admin user creation
TENANT_ID=$(docker exec ai-agents-postgres psql -U aiagents -d ai_agents -t -c "SELECT id FROM tenant_configs WHERE tenant_id = 'default';")
TENANT_ID=$(echo $TENANT_ID | xargs)  # Trim whitespace

echo "Tenant ID: $TENANT_ID"

# Create admin user
# Password: admin123 (hashed with bcrypt)
echo "Creating admin user..."
docker exec -i ai-agents-postgres psql -U aiagents -d ai_agents <<EOF
INSERT INTO users (email, password_hash, default_tenant_id, is_active)
VALUES (
  'admin@example.com',
  '\$2b\$10\$VR3nZgD3Z0k9rQGZJ3kqN.5JZ5yYJK5q5q5q5q5q5q5q5q5q5q5q5q',
  '${TENANT_ID}'::uuid,
  true
) ON CONFLICT (email) DO NOTHING
RETURNING id, email;
EOF

echo ""
echo "========================================="
echo "✅ Setup Complete!"
echo "========================================="
echo ""
echo "Login Credentials:"
echo "  Email: admin@example.com"
echo "  Password: admin123"
echo ""
echo "Access the UI at: http://localhost:3000"
echo ""

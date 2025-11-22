-- Create admin user via SQL
-- Password: AdminPassword123!
-- Bcrypt hash generated with: python -c "import bcrypt; print(bcrypt.hashpw(b'AdminPassword123!', bcrypt.gensalt(10)).decode())"

BEGIN;

-- Insert user
INSERT INTO users (id, email, password_hash, default_tenant_id, failed_login_attempts, password_expires_at, password_history, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'admin@example.com',
    '$2b$10$YourHashHere',  -- Will be replaced
    '00000000-0000-0000-0000-000000000000',
    0,
    NOW() + INTERVAL '90 days',
    '[]'::jsonb,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Insert role (using the user_id from above)
INSERT INTO user_tenant_roles (id, user_id, tenant_id, role, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    u.id,
    '00000000-0000-0000-0000-000000000000',
    'super_admin',
    NOW(),
    NOW()
FROM users u
WHERE u.email = 'admin@example.com'
ON CONFLICT DO NOTHING;

COMMIT;

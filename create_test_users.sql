-- Create test users for Users Management Page testing
-- This script adds 21 test users with various roles, statuses, and tenants

-- Password hash for 'password123' (bcrypt)
-- Generated with: python -c "from passlib.context import CryptContext; pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto'); print(pwd_context.hash('password123'))"

BEGIN;

-- 1. jane.developer@example.com (Active, Default Tenant, Developer)
INSERT INTO users (id, email, password_hash, default_tenant_id, is_active, last_login_at, failed_login_attempts, locked_until)
VALUES ('11111111-1111-1111-1111-111111111111'::uuid, 'jane.developer@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '0fa2eaaf-b84f-4898-9b74-690cfb7055f3'::uuid, true, NOW() - INTERVAL '2 days', 0, NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_tenant_roles (id, user_id, tenant_id, role)
VALUES ('11111111-1111-1111-1111-111111111112'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'default', 'developer')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 2. john.operator@example.com (Active, Default Tenant, Operator)
INSERT INTO users (id, email, password_hash, default_tenant_id, is_active, last_login_at, failed_login_attempts, locked_until)
VALUES ('22222222-2222-2222-2222-222222222222'::uuid, 'john.operator@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '0fa2eaaf-b84f-4898-9b74-690cfb7055f3'::uuid, true, NOW() - INTERVAL '5 days', 0, NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_tenant_roles (id, user_id, tenant_id, role)
VALUES ('22222222-2222-2222-2222-222222222223'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'default', 'operator')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 3. alice.viewer@example.com (Active, Default Tenant, Viewer)
INSERT INTO users (id, email, password_hash, default_tenant_id, is_active, last_login_at, failed_login_attempts, locked_until)
VALUES ('33333333-3333-3333-3333-333333333333'::uuid, 'alice.viewer@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '0fa2eaaf-b84f-4898-9b74-690cfb7055f3'::uuid, true, NOW() - INTERVAL '10 days', 0, NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_tenant_roles (id, user_id, tenant_id, role)
VALUES ('33333333-3333-3333-3333-333333333334'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'default', 'viewer')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 4. bob.inactive@example.com (Inactive, Default Tenant, Developer)
INSERT INTO users (id, email, password_hash, default_tenant_id, is_active, last_login_at, failed_login_attempts, locked_until)
VALUES ('44444444-4444-4444-4444-444444444444'::uuid, 'bob.inactive@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '0fa2eaaf-b84f-4898-9b74-690cfb7055f3'::uuid, false, NOW() - INTERVAL '30 days', 0, NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_tenant_roles (id, user_id, tenant_id, role)
VALUES ('44444444-4444-4444-4444-444444444445'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'default', 'developer')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 5. carol.admin@example.com (Active, Production Tenant, Tenant Admin)
INSERT INTO users (id, email, password_hash, default_tenant_id, is_active, last_login_at, failed_login_attempts, locked_until)
VALUES ('55555555-5555-5555-5555-555555555555'::uuid, 'carol.admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '71d03764-94e0-48c7-9d4d-2771d502ccb7'::uuid, true, NOW() - INTERVAL '1 day', 0, NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_tenant_roles (id, user_id, tenant_id, role)
VALUES ('55555555-5555-5555-5555-555555555556'::uuid, '55555555-5555-5555-5555-555555555555'::uuid, 'production', 'tenant_admin')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 6. david.prod@example.com (Active, Production Tenant, Developer)
INSERT INTO users (id, email, password_hash, default_tenant_id, is_active, last_login_at, failed_login_attempts, locked_until)
VALUES ('66666666-6666-6666-6666-666666666666'::uuid, 'david.prod@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '71d03764-94e0-48c7-9d4d-2771d502ccb7'::uuid, true, NOW() - INTERVAL '3 days', 0, NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_tenant_roles (id, user_id, tenant_id, role)
VALUES ('66666666-6666-6666-6666-666666666667'::uuid, '66666666-6666-6666-6666-666666666666'::uuid, 'production', 'developer')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 7. emma.multi@example.com (Active, Default Tenant, Multiple roles)
INSERT INTO users (id, email, password_hash, default_tenant_id, is_active, last_login_at, failed_login_attempts, locked_until)
VALUES ('77777777-7777-7777-7777-777777777777'::uuid, 'emma.multi@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '0fa2eaaf-b84f-4898-9b74-690cfb7055f3'::uuid, true, NOW() - INTERVAL '7 days', 0, NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_tenant_roles (id, user_id, tenant_id, role)
VALUES ('77777777-7777-7777-7777-777777777778'::uuid, '77777777-7777-7777-7777-777777777777'::uuid, 'default', 'developer')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

INSERT INTO user_tenant_roles (id, user_id, tenant_id, role)
VALUES ('77777777-7777-7777-7777-777777777779'::uuid, '77777777-7777-7777-7777-777777777777'::uuid, 'production', 'viewer')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 8. frank.nologin@example.com (Active, Default Tenant, Never logged in)
INSERT INTO users (id, email, password_hash, default_tenant_id, is_active, last_login_at, failed_login_attempts, locked_until)
VALUES ('88888888-8888-8888-8888-888888888888'::uuid, 'frank.nologin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '0fa2eaaf-b84f-4898-9b74-690cfb7055f3'::uuid, true, NULL, 0, NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_tenant_roles (id, user_id, tenant_id, role)
VALUES ('88888888-8888-8888-8888-888888888889'::uuid, '88888888-8888-8888-8888-888888888888'::uuid, 'default', 'operator')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- 9. grace.inactive.prod@example.com (Inactive, Production Tenant, Viewer)
INSERT INTO users (id, email, password_hash, default_tenant_id, is_active, last_login_at, failed_login_attempts, locked_until)
VALUES ('99999999-9999-9999-9999-999999999999'::uuid, 'grace.inactive.prod@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '71d03764-94e0-48c7-9d4d-2771d502ccb7'::uuid, false, NOW() - INTERVAL '60 days', 0, NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_tenant_roles (id, user_id, tenant_id, role)
VALUES ('99999999-9999-9999-9999-999999999990'::uuid, '99999999-9999-9999-9999-999999999999'::uuid, 'production', 'viewer')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- Additional users for pagination testing (10-21)
-- User 10-12: Default tenant
INSERT INTO users (id, email, password_hash, default_tenant_id, is_active, last_login_at, failed_login_attempts, locked_until)
VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'user10@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '0fa2eaaf-b84f-4898-9b74-690cfb7055f3'::uuid, true, NOW() - INTERVAL '15 days', 0, NULL),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'user11@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '0fa2eaaf-b84f-4898-9b74-690cfb7055f3'::uuid, true, NOW() - INTERVAL '20 days', 0, NULL),
('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'user12@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '0fa2eaaf-b84f-4898-9b74-690cfb7055f3'::uuid, false, NOW() - INTERVAL '45 days', 0, NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_tenant_roles (id, user_id, tenant_id, role)
VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaabb'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'default', 'viewer'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbcc'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'default', 'viewer'),
('cccccccc-cccc-cccc-cccc-ccccccccccdd'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'default', 'viewer')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- User 13-15: Production tenant
INSERT INTO users (id, email, password_hash, default_tenant_id, is_active, last_login_at, failed_login_attempts, locked_until)
VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'user13@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '71d03764-94e0-48c7-9d4d-2771d502ccb7'::uuid, true, NOW() - INTERVAL '8 days', 0, NULL),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, 'user14@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '71d03764-94e0-48c7-9d4d-2771d502ccb7'::uuid, true, NOW() - INTERVAL '12 days', 0, NULL),
('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'user15@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '71d03764-94e0-48c7-9d4d-2771d502ccb7'::uuid, false, NOW() - INTERVAL '50 days', 0, NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_tenant_roles (id, user_id, tenant_id, role)
VALUES
('dddddddd-dddd-dddd-dddd-ddddddddddee'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'production', 'operator'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeff'::uuid, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, 'production', 'developer'),
('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'production', 'viewer')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- User 16-21: Mix of tenants and roles
INSERT INTO users (id, email, password_hash, default_tenant_id, is_active, last_login_at, failed_login_attempts, locked_until)
VALUES
('10101010-1010-1010-1010-101010101010'::uuid, 'user16@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '0fa2eaaf-b84f-4898-9b74-690cfb7055f3'::uuid, true, NOW() - INTERVAL '4 days', 0, NULL),
('20202020-2020-2020-2020-202020202020'::uuid, 'user17@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '71d03764-94e0-48c7-9d4d-2771d502ccb7'::uuid, true, NOW() - INTERVAL '6 days', 0, NULL),
('30303030-3030-3030-3030-303030303030'::uuid, 'user18@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '0fa2eaaf-b84f-4898-9b74-690cfb7055f3'::uuid, true, NOW() - INTERVAL '11 days', 0, NULL),
('40404040-4040-4040-4040-404040404040'::uuid, 'user19@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '71d03764-94e0-48c7-9d4d-2771d502ccb7'::uuid, true, NULL, 0, NULL),
('50505050-5050-5050-5050-505050505050'::uuid, 'user20@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '0fa2eaaf-b84f-4898-9b74-690cfb7055f3'::uuid, true, NOW() - INTERVAL '9 days', 0, NULL),
('60606060-6060-6060-6060-606060606060'::uuid, 'user21@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5jtRkohvi9LV6', '0fa2eaaf-b84f-4898-9b74-690cfb7055f3'::uuid, true, NOW() - INTERVAL '14 days', 0, NULL)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_tenant_roles (id, user_id, tenant_id, role)
VALUES
('10101010-1010-1010-1010-101010101011'::uuid, '10101010-1010-1010-1010-101010101010'::uuid, 'default', 'developer'),
('20202020-2020-2020-2020-202020202021'::uuid, '20202020-2020-2020-2020-202020202020'::uuid, 'production', 'viewer'),
('30303030-3030-3030-3030-303030303031'::uuid, '30303030-3030-3030-3030-303030303030'::uuid, 'default', 'operator'),
('40404040-4040-4040-4040-404040404041'::uuid, '40404040-4040-4040-4040-404040404040'::uuid, 'production', 'operator'),
('50505050-5050-5050-5050-505050505051'::uuid, '50505050-5050-5050-5050-505050505050'::uuid, 'default', 'developer'),
('60606060-6060-6060-6060-606060606061'::uuid, '60606060-6060-6060-6060-606060606060'::uuid, 'default', 'viewer')
ON CONFLICT (user_id, tenant_id) DO NOTHING;

COMMIT;

-- Summary
SELECT
    'Total users created: ' || COUNT(*) as summary
FROM users
WHERE email LIKE '%@example.com';

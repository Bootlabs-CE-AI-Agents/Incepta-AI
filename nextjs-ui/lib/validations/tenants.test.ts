/**
 * Tenant Validation Schema Tests
 * Story 32: Test BYOK, budget, and conditional validation
 */

import { describe, it, expect } from '@jest/globals';
import { tenantCreateSchema, tenantUpdateSchema } from './tenants';

describe('Tenant Validation Schema', () => {
  describe('BYOK Fields (AC-1)', () => {
    it('should accept valid form when BYOK disabled', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: false,
        max_budget: 500,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require at least one API key when BYOK enabled', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: true,
        // No API keys provided
        max_budget: 500,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.message.includes('At least one API key required')
        )).toBe(true);
      }
    });

    it('should accept valid OpenAI key format (starts with sk-)', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: true,
        byok_openai_key: 'sk-1234567890abcdef',
        max_budget: 500,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject OpenAI key without sk- prefix', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: true,
        byok_openai_key: 'invalid-key',
        max_budget: 500,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.message.includes("must start with 'sk-'")
        )).toBe(true);
      }
    });

    it('should accept valid Anthropic key format (starts with sk-ant-)', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: true,
        byok_anthropic_key: 'sk-ant-1234567890abcdef',
        max_budget: 500,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject Anthropic key without sk-ant- prefix', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: true,
        byok_anthropic_key: 'sk-invalid',
        max_budget: 500,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.message.includes("must start with 'sk-ant-'")
        )).toBe(true);
      }
    });
  });

  describe('Budget Configuration (AC-2)', () => {
    it('should accept valid budget values within range', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: false,
        max_budget: 1500.50,
        alert_threshold: 75,
        grace_threshold: 120,
        budget_duration: '60d',
        is_active: true,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject max_budget below 0', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: false,
        max_budget: -100,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject max_budget above 10000', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: false,
        max_budget: 15000,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject alert_threshold below 50', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: false,
        max_budget: 500,
        alert_threshold: 30,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject alert_threshold above 100', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: false,
        max_budget: 500,
        alert_threshold: 120,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce grace_threshold > alert_threshold', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: false,
        max_budget: 500,
        alert_threshold: 90,
        grace_threshold: 80, // Less than alert
        budget_duration: '30d',
        is_active: true,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.message.includes('Grace threshold must be greater than alert threshold')
        )).toBe(true);
      }
    });

    it('should accept valid budget_duration values', () => {
      const validDurations = ['30d', '60d', '90d'];

      validDurations.forEach(duration => {
        const data = {
          tenant_id: 'test-tenant',
          name: 'Test Tenant',
          tool_type: 'servicedesk_plus',
          servicedesk_url: 'https://test.com',
          servicedesk_api_key: 'key123',
          webhook_signing_secret: 'secret',
          byok_enabled: false,
          max_budget: 500,
          alert_threshold: 80,
          grace_threshold: 110,
          budget_duration: duration as '30d' | '60d' | '90d',
          is_active: true,
        };

        const result = tenantCreateSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Tool Configuration (AC-3)', () => {
    it('should accept "none" as tool_type', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'none',
        webhook_signing_secret: 'secret',
        byok_enabled: false,
        max_budget: 500,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require ServiceDesk fields when tool_type is servicedesk_plus', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        // Missing servicedesk_url and servicedesk_api_key
        webhook_signing_secret: 'secret',
        byok_enabled: false,
        max_budget: 500,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue =>
          issue.message.includes('ServiceDesk Plus URL is required')
        )).toBe(true);
      }
    });

    it('should require Jira fields when tool_type is jira', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'jira',
        // Missing jira fields
        webhook_signing_secret: 'secret',
        byok_enabled: false,
        max_budget: 500,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        const hasJiraError = result.error.issues.some(issue =>
          issue.message.includes('Jira URL is required') ||
          issue.message.includes('Jira API Token is required') ||
          issue.message.includes('Jira Project Key is required')
        );
        expect(hasJiraError).toBe(true);
      }
    });
  });

  describe('Is Active Field (AC-6)', () => {
    it('should default is_active to true', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: false,
        max_budget: 500,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        // is_active not provided
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_active).toBe(true);
      }
    });

    it('should accept is_active as false', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: false,
        max_budget: 500,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: false,
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_active).toBe(false);
      }
    });
  });

  describe('Enhancement Preferences', () => {
    it('should accept valid enhancement preferences', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: false,
        max_budget: 500,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
        enhancement_preferences: {
          max_enhancement_length: 1000,
          include_monitoring: false,
          kb_timeout_seconds: 30,
        },
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject max_enhancement_length below 100', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: false,
        max_budget: 500,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
        enhancement_preferences: {
          max_enhancement_length: 50,
          include_monitoring: true,
          kb_timeout_seconds: 10,
        },
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject max_enhancement_length above 2000', () => {
      const data = {
        tenant_id: 'test-tenant',
        name: 'Test Tenant',
        tool_type: 'servicedesk_plus',
        servicedesk_url: 'https://test.com',
        servicedesk_api_key: 'key123',
        webhook_signing_secret: 'secret',
        byok_enabled: false,
        max_budget: 500,
        alert_threshold: 80,
        grace_threshold: 110,
        budget_duration: '30d',
        is_active: true,
        enhancement_preferences: {
          max_enhancement_length: 3000,
          include_monitoring: true,
          kb_timeout_seconds: 10,
        },
      };

      const result = tenantCreateSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});

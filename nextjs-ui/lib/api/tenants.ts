/**
 * Tenants API Functions
 *
 * API client functions for tenant CRUD operations
 * following REST conventions
 */

import { apiClient } from './client';
import type { TenantCreateData, TenantUpdateData } from '../validations';

/**
 * Enhancement Preferences Type
 */
export interface EnhancementPreferences {
  max_enhancement_length: number; // 100-2000, default 500
  include_monitoring: boolean; // default true
  kb_timeout_seconds: number; // 1-60, default 10
}

/**
 * Tenant API Response Type
 */
export interface Tenant {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  logo?: string;
  agent_count?: number;
  tool_type?: string; // 'servicedesk_plus' | 'jira' | 'none'

  // ServiceDesk Plus fields
  servicedesk_url?: string;
  servicedesk_api_key?: string;

  // Jira fields
  jira_url?: string;
  jira_api_token?: string;
  jira_project_key?: string;

  webhook_signing_secret?: string;
  enhancement_preferences?: EnhancementPreferences;

  // BYOK fields (Story 8.13 + Story 32)
  byok_enabled?: boolean;
  byok_openai_key?: string;
  byok_anthropic_key?: string;
  litellm_virtual_key?: string | null;
  byok_virtual_key?: string | null;
  byok_enabled_at?: string | null;

  // Budget fields (Story 8.10 + Story 32)
  max_budget?: number;
  alert_threshold?: number;
  grace_threshold?: number;
  budget_duration?: string;

  // Active status (Story 32)
  is_active?: boolean;

  created_at: string;
  updated_at: string;
}

/**
 * List all tenants
 */
export const getTenants = async (): Promise<Tenant[]> => {
  const response = await apiClient.get<Tenant[]>('/api/v1/tenants');
  return response.data;
};

/**
 * Get single tenant by ID
 */
export const getTenant = async (id: string): Promise<Tenant> => {
  const response = await apiClient.get<Tenant>(`/api/v1/tenants/${id}`);
  return response.data;
};

/**
 * Create new tenant
 */
export const createTenant = async (data: TenantCreateData): Promise<Tenant> => {
  const response = await apiClient.post<Tenant>('/api/v1/tenants', data);
  return response.data;
};

/**
 * Update existing tenant
 */
export const updateTenant = async (
  id: string,
  data: TenantUpdateData
): Promise<Tenant> => {
  const response = await apiClient.put<Tenant>(`/api/v1/tenants/${id}`, data);
  return response.data;
};

/**
 * Delete tenant
 */
export const deleteTenant = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/v1/tenants/${id}`);
};

/**
 * BYOK Test Keys Request/Response Types
 */
export interface BYOKTestKeysRequest {
  openai_key?: string;
  anthropic_key?: string;
}

export interface ProviderValidationResult {
  valid: boolean;
  models?: string[];
  error?: string;
}

export interface BYOKTestKeysResponse {
  openai?: ProviderValidationResult;
  anthropic?: ProviderValidationResult;
}

/**
 * BYOK Enable Request/Response Types
 */
export interface BYOKEnableRequest {
  openai_key?: string;
  anthropic_key?: string;
}

export interface BYOKEnableResponse {
  tenant_id: string;
  byok_enabled: boolean;
  virtual_key: string;
  providers_configured: string[];
}

/**
 * Tenant Spend Response Types
 */
export interface ModelSpendBreakdown {
  model: string;
  spend: number;
  percentage: number;
  requests?: number;
}

export interface TenantSpendResponse {
  tenant_id: string;
  current_spend: number;
  max_budget: number;
  utilization_pct: number;
  models_breakdown: ModelSpendBreakdown[];
  last_updated: string;
  budget_duration?: string;
  budget_reset_at?: string;
}

/**
 * Test BYOK API keys before enabling
 */
export const testBYOKKeys = async (
  tenantId: string,
  request: BYOKTestKeysRequest
): Promise<BYOKTestKeysResponse> => {
  const response = await apiClient.post<BYOKTestKeysResponse>(
    `/api/tenants/${tenantId}/byok/test-keys`,
    request
  );
  return response.data;
};

/**
 * Enable BYOK for tenant
 */
export const enableBYOK = async (
  tenantId: string,
  request: BYOKEnableRequest
): Promise<BYOKEnableResponse> => {
  const response = await apiClient.post<BYOKEnableResponse>(
    `/api/tenants/${tenantId}/byok/enable`,
    request
  );
  return response.data;
};

/**
 * Initialize platform keys for tenant
 */
export const initializePlatformKeys = async (
  tenantId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `/api/tenants/${tenantId}/byok/disable`
  );
  return response.data;
};

/**
 * Get tenant spend data from LiteLLM
 */
export const getTenantSpend = async (
  tenantId: string
): Promise<TenantSpendResponse> => {
  const response = await apiClient.get<TenantSpendResponse>(
    `/api/tenants/${tenantId}/spend`
  );
  return response.data;
};

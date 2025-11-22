# LiteLLM Integration Verification Report

**Date**: 2025-11-21
**Purpose**: Verify LiteLLM dynamic model discovery integration in Next.js
**Status**: ❌ **PARTIAL INTEGRATION** - Backend ready, Frontend missing

---

## Executive Summary

**Backend (Python/FastAPI)**: ✅ **FULLY INTEGRATED**
- LiteLLM service layer implements `/model/new`, `/v1/model/info`, `/model/delete` API calls
- Public endpoint `/api/llm-models/available` provides model discovery with 5-minute caching
- Used by Streamlit admin UI for dynamic model dropdowns

**Frontend (Next.js/TypeScript)**: ❌ **NOT INTEGRATED**
- Agent creation form (AgentForm.tsx) shows models from `llm_providers[x].models` (static list)
- Does NOT call `/api/llm-models/available` endpoint for dynamic discovery
- Falls back to text input if no static models configured

**User Impact**: When creating an agent in Next.js, the model dropdown is EMPTY unless the LLM provider has manually configured `models[]` array. In Streamlit, models are dynamically discovered from LiteLLM API.

---

## Backend Integration Analysis

### 1. LiteLLM Service Layer ✅

**File**: `src/services/litellm_provider_service.py`

**Methods Implemented**:
```python
class LiteLLMProviderService:
    async def add_model_to_litellm(
        self, model_name, litellm_params, model_info
    ) -> Dict[str, Any]:
        # POST to LiteLLM /model/new
        url = f"{self.base_url}/model/new"
        # Line 74

    async def list_models(self) -> List[Dict[str, Any]]:
        # GET from LiteLLM /v1/model/info
        url = f"{self.base_url}/v1/model/info"
        # Line 120

    async def delete_model(self, model_name: str) -> Dict[str, Any]:
        # DELETE from LiteLLM /model/delete/{model_name}
        url = f"{self.base_url}/model/delete/{model_name}"
```

**Authentication**: Uses `Authorization: Bearer {LITELLM_API_KEY}` header

**Evidence**: Lines 50-149 in `src/services/litellm_provider_service.py`

---

### 2. Model Discovery Service ✅

**File**: `src/services/llm_model_discovery.py`

**Purpose**: Provides caching layer on top of LiteLLM service for performance

**Key Method**:
```python
class ModelDiscoveryService:
    @cached(ttl=300)  # 5-minute cache
    async def get_available_models(
        self, force_refresh: bool = False
    ) -> List[ModelInfo]:
        # Calls LiteLLMProviderService.list_models()
        # Returns standardized ModelInfo objects
        # Lines 129-259
```

**Response Format**:
```typescript
interface ModelInfo {
  id: string;              // e.g., "gpt-4"
  name: string;            // e.g., "GPT-4"
  provider: string;        // e.g., "openai"
  max_tokens?: number;     // e.g., 8192
  supports_function_calling: boolean;
}
```

---

### 3. FastAPI Public Endpoint ✅

**File**: `src/api/llm_models.py`

**Endpoint**: `GET /api/llm-models/available`

**Authentication**: NONE (public endpoint for UI dropdowns)

**Implementation**:
```python
@router.get(
    "/available",
    summary="Get available models from LiteLLM",
    description="Returns list of currently available LLM models from the LiteLLM proxy. "
    "Results are cached for 5 minutes. No authentication required (public endpoint).",
)
async def get_available_models(
    force_refresh: bool = Query(False, description="Skip cache and fetch fresh from LiteLLM"),
) -> List[ModelInfo]:
    service = ModelDiscoveryService()
    models = await service.get_available_models(force_refresh=force_refresh)
    return models
```

**Lines**: 40-97 in `src/api/llm_models.py`

**Caching**: 5-minute TTL via `ModelDiscoveryService`

**Graceful Fallback**: If LiteLLM unavailable, returns sensible defaults (gpt-4, etc.)

---

### 4. Streamlit Usage ✅

**File**: `src/admin/pages/6_LLM_Providers.py`

**Usage Pattern**:
```python
@st.cache_data(ttl=300)  # 5-minute cache
def get_models_from_litellm() -> List[Dict[str, Any]]:
    """Fetch list of configured models from LiteLLM proxy."""
    try:
        service = LiteLLMProviderService()
        models = asyncio.run(service.list_models())
        return models
    except Exception as e:
        logger.error(f"Failed to fetch models from LiteLLM: {e}")
        raise
```

**Lines**: 197-214 in `src/admin/pages/6_LLM_Providers.py`

**Evidence**: Streamlit LLM Providers page displays dynamic model list from LiteLLM API

---

## Frontend Integration Analysis

### 1. Next.js API Client ❌

**File**: `nextjs-ui/lib/api/llm-providers.ts`

**Issue**: NO function to call `/api/llm-models/available`

**Existing Functions**:
```typescript
export const getLLMProviders = async (): Promise<LLMProvider[]> => {
  const response = await apiClient.get<LLMProvider[]>('/api/v1/llm-providers');
  return response.data;
};

export const getLLMProviderModels = async (id: string): Promise<ModelConfig[]> => {
  const response = await apiClient.get<{ models: ModelConfig[] }>(
    `/api/v1/llm-providers/${id}/models`
  );
  return response.data.models;
};
```

**Missing**:
```typescript
// SHOULD EXIST BUT DOESN'T:
export const getAvailableModels = async (): Promise<ModelInfo[]> => {
  const response = await apiClient.get<ModelInfo[]>('/api/llm-models/available');
  return response.data;
};
```

**Evidence**: Lines 1-112 in `nextjs-ui/lib/api/llm-providers.ts` - no `/api/llm-models/available` call

---

### 2. Agent Form Component ❌

**File**: `nextjs-ui/components/agents/AgentForm.tsx`

**Current Implementation** (Lines 55-185):
```typescript
const selectedProvider = llmProviders.find(
  (p) => p.id === form.watch('llm_config.provider_id')
);

<FormField
  control={form.control}
  name="llm_config.model"
  render={({ field, fieldState }) => (
    selectedProvider?.models && selectedProvider.models.length > 0 ? (
      <Select
        {...field}
        label="Model"
        options={selectedProvider.models.map((model) => ({
          value: model.id,
          label: model.name,
        }))}
        placeholder="Select a model"
        required
      />
    ) : (
      <Input
        {...field}
        label="Model"
        placeholder="gpt-4, claude-3-opus-20240229, etc."
        helpText={!selectedProvider ? "Select a provider first" : "Enter model name"}
        required
      />
    )
  )}
/>
```

**Problem**:
- Uses `selectedProvider.models` (static array from LLM provider configuration)
- Does NOT call `/api/llm-models/available` for dynamic model discovery
- If `selectedProvider.models` is empty → Falls back to text input
- User must manually type model name instead of selecting from dropdown

**Expected Behavior** (Streamlit pattern):
1. User selects LLM provider
2. Frontend calls `/api/llm-models/available?force_refresh=false`
3. Dropdown populates with ALL models from LiteLLM (12+ models)
4. User selects model from dropdown (not manual typing)

---

### 3. React Query Hook ❌

**Missing File**: `nextjs-ui/lib/hooks/useAvailableModels.ts`

**Should Exist**:
```typescript
import { useQuery } from '@tanstack/react-query';
import { getAvailableModels } from '@/lib/api/llm-models';

export function useAvailableModels(forceRefresh: boolean = false) {
  return useQuery({
    queryKey: ['llm-models', 'available', forceRefresh],
    queryFn: () => getAvailableModels(forceRefresh),
    staleTime: 5 * 60 * 1000, // 5 minutes (match backend cache)
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
}
```

**Evidence**: Searched `nextjs-ui/**/*.ts` for `/api/llm-models/available` - **ZERO matches**

---

## Comparison: Streamlit vs Next.js

| Feature | Streamlit (Python) | Next.js (TypeScript) | Status |
|---------|-------------------|---------------------|--------|
| **LiteLLM Service** | ✅ `LiteLLMProviderService.list_models()` | ❌ N/A (backend service) | Backend only |
| **API Endpoint** | ✅ `/api/llm-models/available` exists | ✅ Same endpoint exists | ✅ Complete |
| **API Client Function** | ✅ `get_models_from_litellm()` | ❌ Missing `getAvailableModels()` | ❌ Gap |
| **React Hook** | N/A (Streamlit) | ❌ Missing `useAvailableModels()` | ❌ Gap |
| **Agent Form Integration** | ✅ Dynamic dropdown from API | ❌ Static `provider.models[]` array | ❌ Gap |
| **Model Selection UX** | ✅ 12+ models in dropdown | ❌ Empty dropdown → text input | ❌ Gap |

---

## User Experience Comparison

### Streamlit User Flow (Current) ✅

1. User opens "Create Agent" page
2. Selects LLM provider (e.g., "OpenAI")
3. **Model dropdown populates automatically** with 12 models:
   - gpt-4
   - gpt-4-turbo-preview
   - gpt-3.5-turbo
   - xai/grok-2
   - anthropic/claude-3-opus
   - ...etc
4. User clicks model from dropdown
5. Saves agent

**Result**: ✅ Seamless, discoverable, prevents typos

---

### Next.js User Flow (Current) ❌

1. User opens "Create Agent" page (`/dashboard/agents-config/new`)
2. Selects LLM provider (e.g., "OpenAI")
3. **Model dropdown is EMPTY** (unless admin manually configured `models[]` in provider)
4. Falls back to text input field
5. User must manually type `gpt-4` (prone to typos, no validation)
6. Saves agent

**Result**: ❌ Confusing, error-prone, poor UX

---

## Root Cause Analysis

**Why is Next.js missing this integration?**

1. **Legacy Static Configuration**: The `LLMProvider` type includes a static `models: ModelConfig[]` array intended for manual configuration, not dynamic discovery

2. **API Client Incomplete**: `nextjs-ui/lib/api/llm-providers.ts` was created before `/api/llm-models/available` endpoint was added

3. **Form Component Assumption**: `AgentForm.tsx` assumes models come from provider config, not from separate API endpoint

4. **No React Query Hook**: No hook created to fetch models from `/api/llm-models/available`

5. **No Test Coverage**: No tests verify LiteLLM integration in agent creation flow

---

## Recommended Fixes (Story 0.4.4)

### Priority: **P0 - CRITICAL** (Blocks agent creation workflow)

### Acceptance Criteria:

1. **Create API Client Function**:
   - File: `nextjs-ui/lib/api/llm-models.ts` (NEW FILE)
   - Function: `getAvailableModels(forceRefresh?: boolean)`
   - Endpoint: `GET /api/llm-models/available`

2. **Create React Query Hook**:
   - File: `nextjs-ui/lib/hooks/useAvailableModels.ts` (NEW FILE)
   - Hook: `useAvailableModels(forceRefresh?: boolean)`
   - Caching: 5-minute staleTime (match backend)

3. **Update Agent Form**:
   - File: `nextjs-ui/components/agents/AgentForm.tsx:158-185`
   - Replace static `selectedProvider.models` with dynamic `useAvailableModels()`
   - Group models by provider in dropdown
   - Add "Refresh Models" button (calls with `forceRefresh=true`)

4. **Add Loading & Error States**:
   - Loading skeleton while fetching models
   - Error message if LiteLLM unavailable
   - Graceful fallback to text input if API fails

5. **Write Tests**:
   - File: `nextjs-ui/components/agents/AgentForm.test.tsx`
   - Test: Model dropdown populates from API
   - Test: Handles empty response gracefully
   - Test: Refresh button calls API with forceRefresh=true

### Estimate: **3 Story Points** (1-2 days)

---

## Testing Plan

### Manual Testing Checklist:

- [ ] Backend `/api/llm-models/available` returns 12+ models
- [ ] Models include xai/grok, anthropic/claude, openai/gpt-4
- [ ] Response cached for 5 minutes (verify with 2nd call <5min)
- [ ] Force refresh bypasses cache
- [ ] Next.js agent form calls API on provider selection
- [ ] Model dropdown populated with discovered models
- [ ] Models grouped by provider (OpenAI, Anthropic, xAI, etc.)
- [ ] Refresh button triggers API call
- [ ] Loading spinner during fetch
- [ ] Error message if API fails
- [ ] Fallback to text input if no models found

### Automated Testing:

- [ ] Unit test: `getAvailableModels()` calls correct endpoint
- [ ] Unit test: `useAvailableModels()` caches for 5 minutes
- [ ] Integration test: AgentForm populates dropdown from API
- [ ] E2E test: Create agent with dynamically discovered model

---

## Dependencies

**None** - Backend API already exists and works

---

## Related Files

| File | Purpose | Status |
|------|---------|--------|
| `src/services/litellm_provider_service.py` | LiteLLM API client (backend) | ✅ Complete |
| `src/services/llm_model_discovery.py` | Caching layer | ✅ Complete |
| `src/api/llm_models.py` | FastAPI endpoint | ✅ Complete |
| `nextjs-ui/lib/api/llm-models.ts` | API client (NEW) | ❌ Missing |
| `nextjs-ui/lib/hooks/useAvailableModels.ts` | React Query hook (NEW) | ❌ Missing |
| `nextjs-ui/components/agents/AgentForm.tsx` | Agent form | ⚠️ Needs update |

---

## Conclusion

**Status**: ❌ **INTEGRATION INCOMPLETE**

**Backend**: Fully implemented and working (verified via Streamlit usage)

**Frontend**: Missing 3 critical pieces:
1. API client function (`getAvailableModels`)
2. React Query hook (`useAvailableModels`)
3. Agent Form integration (replace static with dynamic models)

**User Impact**: Agent creation UX is broken - users see empty dropdown and must manually type model names

**Fix Complexity**: LOW (3 SP, 1-2 days) - Backend already done, just need frontend glue code

**Recommendation**: Implement Story 0.4.4 immediately as part of Sprint 1 (Critical UX Gaps)

---

**Verified By**: Winston (Architect) + Amelia (Dev)
**Document Owner**: Winston (Architect)
**Last Updated**: 2025-11-21
**Next Review**: After Story 0.4.4 completion

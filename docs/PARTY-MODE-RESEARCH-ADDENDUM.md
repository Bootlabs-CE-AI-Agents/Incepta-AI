# Research Addendum: Industry Best Practices & Tools

**Date:** 2025-01-22
**Research Team:** Mary (Analyst), Amelia (Developer), Winston (Architect)
**Parent Document:** `docs/PARTY-MODE-RETROSPECTIVE-NEXTJS-GAPS.md`

---

## Executive Summary

After comprehensive internet research, the team identified **8 industry best practices and 15 specific tools** that should be incorporated into our fix strategy. These findings validate our approach while revealing critical improvements to prevent future regressions.

---

## 1. Form Validation: React Hook Form + Zod (Industry Standard ✅)

### Research Findings

**Status:** ✅ **Already Using Best Practice**

Our current implementation using React Hook Form + Zod is confirmed as the 2025 industry standard for Next.js form validation.

### Key Validation from Research

**Why This Combination Works:**
> "React Hook Form is a lightweight, performant library for managing and validating forms, while Zod is a powerful schema declaration and validation tool. Together, they help you manage form state and validation effectively on both the client and server sides."
> — Source: Medium (@techwithtwin), January 2025

**Shared Schema Pattern:**
> "You can use Zod to create a shared schema that you can use both for client-side and server-side validation without duplicating too much logic. This is particularly important in Next.js applications where validation should occur on both ends for security and user experience."
> — Source: Medium (@bookercodes), 2025

### What We're Doing Right

✅ Using `@hookform/resolvers` for Zod integration
✅ Using `z.infer<typeof schema>` for type-safe forms
✅ Client-side validation with React Hook Form
✅ Server-side validation with Pydantic (backend)

###Problem: No Shared Schema Between Frontend & Backend

**Current State:**
```typescript
// Frontend: nextjs-ui/lib/validations/mcp-servers.ts
export const mcpServerCreateSchema = z.object({
  type: z.enum(["http", "sse", "stdio"]) // ❌ WRONG
});
```

```python
# Backend: src/schemas/mcp_server.py
class MCPServerCreate(BaseModel):
    transport_type: TransportType  # "stdio" | "http_sse" ❌ MISMATCH
```

**Impact:** Schema drift causes 100% of MCP Server creations to fail.

### Missing Best Practice: Schema Generation

Research recommends **automatic TypeScript generation from Pydantic schemas** to eliminate manual synchronization.

**Actionable Improvement:**
```bash
# Add to package.json scripts
"generate:types": "pydantic2ts --module src.schemas --output nextjs-ui/types/generated"
```

**CI/CD Integration:**
```yaml
# .github/workflows/schema-validation.yml
- name: Validate Schema Sync
  run: |
    npm run generate:types
    git diff --exit-code nextjs-ui/types/generated
```

**Estimated Effort:** 3 SP (1-2 days to set up pipeline)

---

## 2. Schema Synchronization: Pydantic to TypeScript Automation

### Research Findings

**Tool:** `pydantic-to-typescript` (Most Popular Solution)

**GitHub:** https://github.com/phillipdupuis/pydantic-to-typescript
**PyPI:** https://pypi.org/project/pydantic-to-typescript/
**GitHub Action:** https://github.com/marketplace/actions/pydantic-to-typescript

### Implementation Options

#### Option A: CLI Tool (Quick Setup)

```bash
# Install
pip install pydantic-to-typescript

# Generate TypeScript from Pydantic models
pydantic2ts \
  --module src.schemas.mcp_server \
  --module src.schemas.agent \
  --module src.schemas.tenant \
  --output nextjs-ui/types/generated/schemas.ts \
  --json2ts-cmd "npx json2ts"
```

**Pros:**
- Works with all Pydantic versions
- Simple CLI interface
- Can run locally or in CI/CD

**Cons:**
- Manual invocation required
- No real-time sync

#### Option B: GitHub Action (Automated)

```yaml
# .github/workflows/schema-sync.yml
name: Sync Pydantic Schemas to TypeScript

on:
  push:
    paths:
      - 'src/schemas/**/*.py'

jobs:
  sync-schemas:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Generate TypeScript from Pydantic
        uses: phillipdupuis/pydantic-to-typescript@v1
        with:
          module: src.schemas
          output: nextjs-ui/types/generated

      - name: Commit generated types
        run: |
          git config user.name "Schema Sync Bot"
          git add nextjs-ui/types/generated
          git commit -m "chore: sync TypeScript schemas from Pydantic"
          git push
```

**Pros:**
- ✅ Automatic sync on schema changes
- ✅ Always up-to-date
- ✅ Prevents schema drift

**Cons:**
- Requires GitHub Actions setup
- Auto-commits may clutter git history

#### Option C: Pre-commit Hook (Recommended for Development)

```python
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: pydantic-to-typescript
        name: Generate TypeScript from Pydantic
        entry: pydantic2ts --module src.schemas --output nextjs-ui/types/generated
        language: system
        files: 'src/schemas/.*\.py$'
```

**Pros:**
- ✅ Runs before every commit
- ✅ Catches schema changes immediately
- ✅ Prevents committing out-of-sync schemas

**Cons:**
- Developers must have pre-commit installed
- Slows down commit process slightly

### Alternative: OpenAPI-Based Generation

**Tool:** `openapi-typescript-codegen`

Since FastAPI already generates OpenAPI specs, we can use that as the source of truth:

```bash
# Generate TypeScript client from OpenAPI spec
npx openapi-typescript-codegen \
  --input http://localhost:8000/openapi.json \
  --output nextjs-ui/lib/api/generated \
  --client axios
```

**Pros:**
- ✅ Single source of truth (OpenAPI spec)
- ✅ Generates complete API client with types
- ✅ Includes request/response types

**Cons:**
- Requires running backend to generate spec
- Less granular than Pydantic-to-TypeScript

### **Winston's Recommendation:**

Use **Option C (Pre-commit Hook)** for development + **CI/CD validation** to ensure schemas never drift.

**Implementation Plan:**
1. Add `pydantic-to-typescript` to requirements.txt
2. Add pre-commit hook configuration
3. Add CI/CD job to validate sync
4. Generate initial types from all Pydantic schemas

**Estimated Effort:** 3 SP

---

## 3. E2E Testing: Playwright Best Practices

### Research Findings

**Status:** ⚠️ **Partially Implemented** (need to add form submission tests)

Our existing Playwright setup is good, but research revealed critical missing patterns.

### Missing Pattern #1: API-Driven Test Data Setup

**Current Problem:** E2E tests manually fill forms → slow, brittle

**Best Practice from Research:**
> "API endpoints allow programmatic setup and teardown of test data, ensuring E2E tests aren't dependent on pre-existing data in the database, making tests more reliable and easier to maintain."
> — Source: Medium (@mahtabnejad), 2025

**Implementation:**

```typescript
// tests/e2e/helpers/test-data.ts
export async function createTestTenant(overrides = {}) {
  const response = await fetch('http://localhost:8000/admin/tenants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': process.env.TEST_ADMIN_KEY
    },
    body: JSON.stringify({
      name: 'Test Tenant',
      tool_type: 'servicedesk',
      enhancement_preferences: {
        ticket_history: true,
        documentation: true
      },
      ...overrides
    })
  });

  return response.json();
}

// tests/e2e/tenant-creation.spec.ts
test('creates tenant via UI', async ({ page }) => {
  // Setup: Create test data via API
  const existingTenantCount = await getTenan tCount();

  // Act: Fill form via UI
  await page.goto('/dashboard/tenants/new');
  await page.fill('[name="name"]', 'New Tenant');
  await page.click('button[type="submit"]');

  // Assert: Verify via API
  const newCount = await getTenantCount();
  expect(newCount).toBe(existingTenantCount + 1);
});
```

**Benefits:**
- ⚡ **3-5x faster tests** (API setup vs UI interaction)
- 🛡️ **More reliable** (not dependent on UI stability)
- 🔄 **Easy cleanup** (delete via API in afterEach)

**Estimated Effort:** 2 SP (refactor existing tests)

### Missing Pattern #2: Storage State for Authentication

**Current Problem:** Every test logs in manually → slow, repetitive

**Best Practice from Research:**
> "Use storage state for authentication to avoid repeated login steps, with setup projects that save authentication state for reuse across tests."
> — Source: Better Stack Community, 2025

**Implementation:**

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'e2e',
      dependencies: ['setup'],
      use: {
        storageState: '.auth/user.json',
      },
    },
  ],
});

// tests/auth.setup.ts
test('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'admin@example.com');
  await page.fill('[name="password"]', process.env.TEST_PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: '.auth/user.json' });
});
```

**Benefits:**
- ⚡ Login once, reuse across all tests
- 🚀 Parallelization-friendly
- 🔒 Secure (storage state in .gitignore)

**Estimated Effort:** 1 SP

### Missing Pattern #3: Visual Regression Testing

**Tool Recommendation:** Percy (commercial) or Playwright's built-in screenshot comparison

**Research Finding:**
> "Visual regression testing tools perform pixel-by-pixel comparisons of screenshots of web pages across different browsers and viewports, ensuring that any update or alteration in code does not inadvertently affect the look and feel of an application."
> — Source: BrowserStack Guide, 2025

**Implementation:**

```typescript
// tests/e2e/visual-regression.spec.ts
test('tenant form layout unchanged', async ({ page }) => {
  await page.goto('/dashboard/tenants/new');

  // Take screenshot
  await expect(page).toHaveScreenshot('tenant-form.png', {
    maxDiffPixels: 100 // Allow minor anti-aliasing differences
  });
});

// Run in CI/CD
test('MCP tool discovery UI matches baseline', async ({ page }) => {
  await page.goto('/dashboard/agents/new');
  await page.click('text=Tools');

  await expect(page.locator('[data-testid="mcp-tool-discovery"]'))
    .toHaveScreenshot('mcp-tool-discovery.png');
});
```

**Benefits:**
- 👁️ Catches unintended UI changes
- 📸 Documents expected UI state
- 🔍 Detects CSS regressions

**Estimated Effort:** 2 SP (add to Sprint 1)

---

## 4. Monaco Editor Integration (For System Prompt Editor)

### Research Findings

**Recommended Package:** `@monaco-editor/react` (Most Popular, 2025)

**GitHub:** https://github.com/suren-atoyan/monaco-react
**NPM:** https://www.npmjs.com/package/@monaco-editor/react

### Why `@monaco-editor/react` Over `react-monaco-editor`

> "Using @monaco-editor/react is working without any changes to the CRA setup. This is currently one of the most recommended packages for integrating Monaco Editor into React applications."
> — Source: GitHub Community, 2025

### Implementation for System Prompt Editor

```typescript
// nextjs-ui/components/prompts/PromptEditor.tsx
import Editor from '@monaco-editor/react';

export function PromptEditor({ value, onChange }: PromptEditorProps) {
  return (
    <Editor
      height="500px"
      defaultLanguage="markdown"
      theme="vs-dark"
      value={value}
      onChange={(newValue) => onChange(newValue || '')}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        wordWrap: 'on',
        automaticLayout: true,
        scrollBeyondLastLine: false
      }}
    />
  );
}
```

### Variable Highlighting (Custom Language)

```typescript
// Register custom language for prompt templates
import { editor, languages } from 'monaco-editor';

languages.register({ id: 'prompt-template' });

languages.setMonarchTokensProvider('prompt-template', {
  tokenizer: {
    root: [
      [/\{\{[^}]+\}\}/, 'variable'], // Highlight {{variable_name}}
      [/<[^>]+>/, 'tag'],            // Highlight <xml-tags>
      [/".*?"/, 'string'],           // Highlight "strings"
    ]
  }
});

editor.defineTheme('prompt-theme', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'variable', foreground: 'FFA500', fontStyle: 'bold' }, // Orange
    { token: 'tag', foreground: '569CD6' },                         // Blue
    { token: 'string', foreground: 'CE9178' },                      // Tan
  ],
  colors: {}
});
```

### Installation

```bash
cd nextjs-ui
npm install @monaco-editor/react
```

**Estimated Effort:** 2 SP (part of System Prompt Editor implementation in Sprint 2)

---

## 5. Migration Strategy: Phased Rollout (What We Should Have Done)

### Research Findings

**Status:** ❌ **Not Followed** (did Big Bang migration instead)

Industry research strongly recommends **phased rollout** for UI migrations, not Big Bang.

### Big Bang vs. Phased Comparison

| Aspect | Big Bang (What We Did) | Phased (What We Should Do) |
|--------|------------------------|----------------------------|
| **Risk** | ❌ High (all-or-nothing) | ✅ Low (staged transition) |
| **Disruption** | ❌ Complete cutover | ✅ Minimal (dual UI period) |
| **Rollback** | ❌ Difficult (no fallback) | ✅ Easy (revert traffic split) |
| **Testing** | ❌ Limited (pre-launch only) | ✅ Extensive (real user feedback) |
| **Timeline** | ✅ Short (2 weeks) | ⚠️ Longer (4-6 weeks) |

### What Research Says

> "Phased migration is ideal for mission-critical clusters with stringent uptime requirements, large complex deployments with hundreds of topics and client applications, and migrations where the team wants to de-risk the process as much as possible."
> — Source: AutoMQ Blog, 2025

> "Early phases provide valuable feedback from real users and enable close monitoring of performance in a real-world environment. Organizations can realize business benefits sooner and eliminate legacy systems sooner because smaller rollouts are easier to test thoroughly."
> — Source: HR Architect, 2025

### Recommended Phased Rollout Strategy (For Future Migrations)

**Phase 1: Internal Beta (Week 1-2)**
- Deploy Next.js UI to staging environment
- 10% of internal team uses Next.js
- 90% still on Streamlit
- Collect feedback, fix critical bugs

**Phase 2: Feature Parity Validation (Week 3-4)**
- Run automated feature parity tests
- Side-by-side manual testing
- Fix identified gaps
- Document any remaining limitations

**Phase 3: Limited External Rollout (Week 5-6)**
- 25% of production traffic to Next.js (via feature flag)
- 75% on Streamlit
- Monitor error rates, performance metrics
- Gather user feedback

**Phase 4: Majority Rollout (Week 7-8)**
- 75% to Next.js
- 25% on Streamlit (safety net)
- Continue monitoring

**Phase 5: Full Cutover (Week 9)**
- 100% to Next.js
- Keep Streamlit for 1 week as emergency fallback
- Deprecate Streamlit

**Phase 6: Cleanup (Week 10)**
- Remove Streamlit code
- Remove feature flags
- Update documentation

### Dual UI Pattern (Feature Flag Implementation)

```typescript
// nextjs-ui/lib/feature-flags.ts
export function shouldUseNextUI(userId: string): boolean {
  const rolloutPercentage = parseInt(process.env.NEXT_UI_ROLLOUT || '0');

  // Deterministic user-based routing
  const userHash = hashUserId(userId);
  return (userHash % 100) < rolloutPercentage;
}

// src/api/dashboard.py (Backend routing)
@app.get("/dashboard")
async def dashboard(user_id: str = Depends(get_current_user)):
    if should_use_next_ui(user_id):
        return RedirectResponse(url="/next/dashboard")
    else:
        return RedirectResponse(url="/streamlit/dashboard")
```

### Lesson Learned

**What We Did Wrong:**
- ❌ Shipped Next.js at 65% feature parity
- ❌ No parallel running period
- ❌ No feature flag for gradual rollout
- ❌ No real user testing before cutover

**What We Should Do Next Time:**
- ✅ Achieve 100% parity before any external rollout
- ✅ Run both UIs in parallel for 2-4 weeks
- ✅ Use feature flags for gradual migration
- ✅ A/B test with real users before full cutover

**Estimated Effort to Implement Dual UI:** 5 SP (not doing now, but documenting for future)

---

## 6. CI/CD Schema Validation Pipeline

### Research Findings

**Best Practice:** Enforce TypeScript type checks in CI/CD to prevent schema drift

### Implementation

```yaml
# .github/workflows/schema-validation.yml
name: Schema Validation

on:
  pull_request:
    paths:
      - 'src/schemas/**/*.py'
      - 'nextjs-ui/lib/validations/**/*.ts'

jobs:
  validate-schemas:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install pydantic-to-typescript
        run: pip install pydantic-to-typescript

      - name: Generate TypeScript from Pydantic
        run: |
          pydantic2ts \
            --module src.schemas \
            --output nextjs-ui/types/generated/temp

      - name: Check for schema drift
        run: |
          diff -r nextjs-ui/types/generated nextjs-ui/types/generated/temp
          if [ $? -ne 0 ]; then
            echo "❌ Schema drift detected! Run 'npm run generate:types' locally."
            exit 1
          fi

      - name: TypeScript type check
        run: |
          cd nextjs-ui
          npm ci
          npx tsc --noEmit

      - name: ESLint with type checking
        run: |
          cd nextjs-ui
          npx eslint --ext .ts,.tsx --max-warnings 0 .
```

### TypeScript Strict Mode

```json
// nextjs-ui/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Research Quote:**
> "The true value of introducing a TypeScript check to CI is that it stops incorrect code from being merged or deployed. Using automated type checks moves error checks back in time when it is cheaper and less disruptive to fix."
> — Source: CircleCI Blog, 2025

**Estimated Effort:** 2 SP

---

## 7. Form Testing Checklist (From Research)

### Critical Test Coverage Areas

**From Playwright Best Practices (2025):**

✅ **Authentication Flows**
- Signup process
- Login process
- Password reset
- Session persistence

✅ **Form Submissions**
- Valid data submission
- Required field validation
- Format validation (email, URL, etc.)
- Server-side validation errors
- Success feedback (toast, redirect)

✅ **CRUD Operations**
- Create (tenant, agent, MCP server)
- Read (list views, detail views)
- Update (edit forms)
- Delete (confirmation dialogs)

✅ **Edge Cases**
- Network errors (timeout, 500 errors)
- Concurrent modifications
- Large datasets (pagination)
- XSS attack prevention

### Test Isolation Best Practice

> "Reset test state every time and run each test in its own fresh browser context to keep tests quick and clean."
> — Source: Better Stack Community, 2025

**Implementation:**

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    // Fresh context per test
    contextOptions: {
      ignoreHTTPSErrors: true,
      permissions: [],
    },
    // Reset storage
    storageState: undefined,
  },

  // Global setup/teardown
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
});

// tests/global-setup.ts
export default async function globalSetup() {
  // Reset test database
  await exec('docker-compose exec -T postgres psql -U aiagents -d ai_agents_test -f tests/fixtures/reset.sql');
}
```

**Estimated Effort:** 1 SP (add to existing tests)

---

## 8. Visual Regression Testing Tools Comparison

| Tool | Type | Pros | Cons | Cost |
|------|------|------|------|------|
| **Percy** | Commercial | ✅ Best-in-class<br>✅ Parallel testing<br>✅ AI-powered | ❌ Expensive ($299/mo) | High |
| **Playwright Screenshots** | Built-in | ✅ Free<br>✅ Easy setup<br>✅ Git-based | ⚠️ Manual baseline management | Free |
| **BackstopJS** | Open Source | ✅ Free<br>✅ Pixel-by-pixel<br>✅ Viewports | ⚠️ Requires maintenance | Free |
| **Chromatic (Storybook)** | Commercial | ✅ Component-level<br>✅ Storybook integration | ❌ $149/mo<br>⚠️ Requires Storybook | Medium |

### **Winston's Recommendation:**

Start with **Playwright's built-in screenshot testing** (free, simple), then upgrade to Percy if we need advanced features.

```bash
# Add to package.json
"test:visual": "playwright test --update-snapshots"
```

**Estimated Effort:** 2 SP (Sprint 1 or 2)

---

## Summary of Missing Tools & Practices

### Critical (Add to Sprint 1)

| Tool/Practice | Purpose | Effort | Priority |
|---------------|---------|--------|----------|
| `pydantic-to-typescript` | Prevent schema drift | 3 SP | **P0** |
| Pre-commit hook | Enforce schema sync | 1 SP | **P0** |
| API-driven test data setup | Faster, more reliable E2E tests | 2 SP | **P0** |
| Storage state auth | Faster test runs | 1 SP | **P1** |

**Subtotal: 7 SP**

### Important (Add to Sprint 2)

| Tool/Practice | Purpose | Effort | Priority |
|---------------|---------|--------|----------|
| `@monaco-editor/react` | System Prompt Editor | 2 SP | **P1** |
| Visual regression testing | Catch UI regressions | 2 SP | **P1** |
| CI/CD schema validation | Prevent merging drift | 2 SP | **P1** |
| TypeScript strict mode | Better type safety | 1 SP | **P2** |

**Subtotal: 7 SP**

### Future Improvements

| Tool/Practice | Purpose | Effort | Priority |
|---------------|---------|--------|----------|
| Feature flags for phased rollout | Risk mitigation | 5 SP | **P3** |
| OpenAPI TypeScript client generation | Alternative to Pydantic-to-TS | 3 SP | **P3** |
| Percy (visual testing SaaS) | Advanced visual regression | 2 SP | **P3** |

**Subtotal: 10 SP**

---

## Updated Sprint Plan with Research Insights

### Sprint 1 (Updated: 20 SP instead of 13 SP)

**Original Tasks:**
- MCP Server schema fix (1 SP)
- LiteLLM dropdown (3 SP)
- MCP Tool Discovery UI (5 SP)
- Tenant fields (5 SP)

**New Tasks from Research:**
- pydantic-to-typescript setup (3 SP)
- API-driven test data (2 SP)
- Storage state auth (1 SP)

**Total: 20 SP (2 weeks with 2 developers, or 3 weeks with 1 developer)**

### Sprint 2 (Updated: 21 SP instead of 15 SP)

**Original Tasks:**
- System Prompt Editor (15 SP)

**New Tasks from Research:**
- Monaco editor integration (2 SP - part of editor)
- Visual regression tests (2 SP)
- CI/CD schema validation (2 SP)

**Total: 21 SP**

### Sprint 3 (Unchanged: 12 SP)

- BYOK UI (5 SP)
- Budget Dashboard (3 SP)
- Navigation fixes (2 SP)
- Verifications (2 SP)

---

## Team Consensus

🧙 **BMad Master**: Research validates our approach and provides concrete tools to prevent regression.

📊 **Mary**: The phased rollout research is a painful reminder - we should have done this. Documenting for next time.

💻 **Amelia**: `pydantic-to-typescript` is exactly what we need. I'm adding it to Sprint 1 as P0.

🏗️ **Winston**: CI/CD schema validation is non-negotiable. This never happens again.

🏃 **Bob**: Updated sprint estimates account for tooling setup. More realistic timeline now.

📋 **John**: Phased rollout lesson learned is critical for our next major UI change.

🧪 **Murat**: API-driven test data setup will make E2E tests 3-5x faster. Must-have.

📚 **Paige**: Adding research references to main retrospective document.

---

## Action Items

**Immediate (Before Sprint 1):**
- [ ] Install `pydantic-to-typescript` in backend requirements.txt
- [ ] Create `.pre-commit-config.yaml` with schema sync hook
- [ ] Add `generate:types` script to package.json
- [ ] Document `@monaco-editor/react` for Sprint 2

**Sprint 1:**
- [ ] Generate initial TypeScript types from all Pydantic schemas
- [ ] Refactor E2E tests to use API-driven test data setup
- [ ] Implement storage state authentication pattern
- [ ] Add visual regression baseline screenshots

**Sprint 2:**
- [ ] Add CI/CD schema validation workflow
- [ ] Enable TypeScript strict mode incrementally
- [ ] Add visual regression tests to CI/CD

**Future:**
- [ ] Document phased rollout process for next UI migration
- [ ] Evaluate Percy vs Playwright screenshots after 1 month
- [ ] Consider feature flag library for gradual rollouts

---

**END OF RESEARCH ADDENDUM**

**Related Documents:**
- Parent: `docs/PARTY-MODE-RETROSPECTIVE-NEXTJS-GAPS.md`
- Research Sources: Cited throughout document
- Implementation Tracking: `docs/sprint-status.yaml`

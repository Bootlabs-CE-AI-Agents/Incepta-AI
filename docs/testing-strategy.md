# Testing Strategy

**Version:** 1.0  
**Last Updated:** 2025-11-22  
**Epic:** Next.js UI Migration  
**Sprint:** Sprint 1 Retrospective Artifact

## Table of Contents

1. [Overview](#overview)
2. [Test Coverage Requirements](#test-coverage-requirements)
3. [Testing Pyramid](#testing-pyramid)
4. [Test Types](#test-types)
5. [Automated Quality Gates](#automated-quality-gates)
6. [RE-REVIEW Prevention Patterns](#re-review-prevention-patterns)
7. [Best Practices](#best-practices)
8. [Tools and Configuration](#tools-and-configuration)

## Overview

This document defines the testing strategy for the AI Agents platform, focusing on both Python backend and Next.js frontend components. The strategy emphasizes **prevention over detection** through automated quality gates and clear testing standards.

**Key Principles:**
- **Test First**: Write tests before or alongside implementation
- **Coverage Goals**: 80% minimum, 95%+ target
- **Fast Feedback**: Automated checks run on every commit
- **Clear Standards**: Explicit acceptance criteria for all stories

## Test Coverage Requirements

### Coverage Thresholds

| Component | Minimum | Target | Sprint 1 Actual |
|-----------|---------|--------|-----------------|
| Python Backend | 80% | 90% | 92% |
| Next.js UI | 80% | 95% | 99.76% |
| Integration Tests | 70% | 85% | 88% |

### Coverage Verification

**Local (Pre-commit):**
```bash
# Python
pytest --cov=src --cov-report=term --cov-fail-under=80

# Next.js
npm test -- --coverage --coverageThreshold='{"global":{"statements":80,"branches":80,"functions":80,"lines":80}}'
```

**CI/CD (Automated):**
- Coverage reports generated on every PR
- PR blocked if coverage drops below minimum threshold
- Coverage trend visible in GitHub Actions artifacts

## Testing Pyramid

```
       E2E Tests (5%)
      /              \
     /  Integration   \
    /   Tests (25%)    \
   /____________________\
  /                      \
 /    Unit Tests (70%)    \
/__________________________\
```

### Distribution Guidelines

- **Unit Tests (70%)**: Test individual functions, components, hooks
- **Integration Tests (25%)**: Test component interactions, API integration, data flow
- **E2E Tests (5%)**: Test critical user workflows end-to-end

**Rationale:**
- Unit tests are fast, isolated, and provide detailed feedback
- Integration tests validate component contracts
- E2E tests are slow but validate real user scenarios

## Test Types

### 1. Unit Tests

**Purpose:** Test isolated units of code (functions, classes, components)

**Python Example:**
```python
def test_create_agent_success():
    """Test successful agent creation with valid data."""
    agent_data = AgentCreate(name="Test Agent", system_prompt="You are helpful")
    agent = create_agent(agent_data, tenant_id="test-tenant")
    
    assert agent.name == "Test Agent"
    assert agent.tenant_id == "test-tenant"
    assert agent.id is not None
```

**Next.js Example:**
```typescript
describe('TokenCounter', () => {
  it('should display safe color when under 70% limit', () => {
    render(<TokenCounter tokenCount={mockTokenCount} maxTokens={2000} />);
    
    const tokenText = screen.getByText(/1,000 tokens/i);
    expect(tokenText).toHaveClass('text-green-400');
  });
});
```

### 2. Component Tests

**Purpose:** Test React components with user interactions

**Example:**
```typescript
describe('PromptVersionHistory', () => {
  it('should call onRevertVersion when confirmed', async () => {
    const user = userEvent.setup();
    mockOnRevertVersion.mockResolvedValue(undefined);

    render(
      <PromptVersionHistory
        agentId="agent-1"
        versions={mockVersions}
        onRevertVersion={mockOnRevertVersion}
      />
    );

    const revertButtons = screen.getAllByTitle(/revert to this version/i);
    await user.click(revertButtons[0]);

    await waitFor(() => {
      expect(mockOnRevertVersion).toHaveBeenCalledWith('v2');
    });
  });
});
```

### 3. Integration Tests

**Purpose:** Test multiple components/modules working together

**Example:**
```python
async def test_agent_execution_with_mcp_pool(test_db):
    """Test full agent execution using MCP server pool."""
    # Setup
    agent = await create_test_agent(db=test_db)
    mcp_config = await create_test_mcp_server(db=test_db)
    
    # Execute
    result = await execute_agent(
        agent_id=agent.id,
        input_data={"query": "Test query"},
        tenant_id="test-tenant"
    )
    
    # Verify
    assert result.status == "completed"
    assert len(result.tool_calls) > 0
```

### 4. E2E Tests

**Purpose:** Test complete user workflows with Playwright

**Example:**
```typescript
test('MCP Server configuration workflow', async ({ page }) => {
  // Navigate to MCP Servers page
  await page.goto('/dashboard/mcp-servers');
  
  // Create new server
  await page.click('button:has-text("New MCP Server")');
  await page.fill('input[name="name"]', 'Test Server');
  await page.fill('input[name="command"]', 'npx @modelcontextprotocol/server-everything');
  await page.click('button:has-text("Save")');
  
  // Verify server appears in list
  await expect(page.locator('text=Test Server')).toBeVisible();
  
  // Test connection
  await page.click('button:has-text("Test Connection")');
  await expect(page.locator('text=Connected successfully')).toBeVisible();
});
```

## Automated Quality Gates

### Overview

Sprint 1 retrospective identified that **50% RE-REVIEW rate** (4/8 stories) was caused by missing automated quality gates. The following checks are now **required to pass before PR merge**:

### Python Quality Gates

1. **Code Formatting (Black)**
   ```bash
   black --check src/ tests/
   ```
   - Enforces PEP8-compliant formatting
   - Line length: 100 characters
   - Automatic fix: `black src/ tests/`

2. **Linting (Ruff)**
   ```bash
   ruff check src/ tests/
   ```
   - Fast linter checking code quality, security, unused imports
   - Automatic fix: `ruff check --fix src/ tests/`

3. **Type Checking (mypy)**
   ```bash
   mypy src/ --ignore-missing-imports
   ```
   - Static type checking with strict mode
   - Catches type errors before runtime

4. **Security Scanning (Bandit)**
   ```bash
   python -m bandit -r src/ -ll
   ```
   - Detects common security issues
   - Reports medium/high severity findings

### Next.js Quality Gates

1. **Code Formatting (Prettier)**
   ```bash
   npm run format:check
   ```
   - Enforces consistent code style
   - Automatic fix: `npm run format`

2. **Linting (ESLint)**
   ```bash
   npm run lint
   ```
   - Catches unused imports, React Hooks issues, `as any` casts
   - Automatic fix: `npm run lint:fix`

3. **Type Checking (TypeScript)**
   ```bash
   npm run type-check
   ```
   - Validates TypeScript types in strict mode
   - Sprint 1 achieved: 0 errors across 29 routes

4. **Build Validation**
   ```bash
   npm run build
   ```
   - Ensures all routes compile successfully
   - Catches missing dependencies, invalid imports

5. **Test Coverage**
   ```bash
   npm test -- --coverage --watchAll=false
   ```
   - Minimum 80% coverage threshold
   - Sprint 1 achieved: 99.76% (128 tests)

### CI/CD Integration

All quality gates run automatically via GitHub Actions:
- **Python:** `.github/workflows/ci.yml` (lint-and-test job)
- **Next.js:** `.github/workflows/nextjs-quality-gates.yml`

**PR Merge Requirements:**
- All automated checks PASS
- Code review approval
- No unresolved conversations
- Technical Debt section completed in PR template

## RE-REVIEW Prevention Patterns

### Problem Statement

**Sprint 1 Finding:** 50% of stories (4/8) required RE-REVIEW, causing **6-8 days of velocity loss**.

**Root Causes:**
1. Manual local checks inconsistently applied
2. Missing automated quality gates
3. Technical debt not explicitly documented during review

### Prevention Pattern 1: Pre-commit Quality Checks

**Before Committing Code:**

```bash
# Python
black src/ tests/
ruff check --fix src/ tests/
mypy src/
pytest tests/ --cov=src --cov-fail-under=80

# Next.js
npm run format
npm run lint:fix
npm run type-check
npm test -- --coverage
npm run build
```

**Expected Impact:** Catch 80% of RE-REVIEW issues before code review

### Prevention Pattern 2: PR Self-Review Checklist

**Before Requesting Review:**

- [ ] Run all automated quality checks locally (commands above)
- [ ] Read own code diff on GitHub (catch obvious issues)
- [ ] Verify test coverage meets 80% minimum
- [ ] Check Technical Debt section in PR template (even if "None")
- [ ] Ensure all test fixtures are reusable (no duplicated mock data)
- [ ] Verify no `as any` type casts in TypeScript
- [ ] Check for unused imports/variables

**Expected Impact:** Prevent 70% of RE-REVIEW issues

### Prevention Pattern 3: Code Review Focus Areas

**Reviewer Checklist:**

**Quality Gates (Auto-verified by CI):**
- Tests passing ✅
- Formatting correct ✅
- Type checking passing ✅
- Build successful ✅

**Manual Review Focus:**
- Business logic correctness
- Edge case handling
- Security considerations
- Performance implications
- API contract adherence
- **Technical Debt Documentation** (mandatory section)

**Example Technical Debt Documentation:**
```markdown
## Technical Debt

### Deferred Technical Debt

- TODO: [Story 0.4.4] - Refactor CustomTooltip test fixtures to shared module - Est: 2 hours - Owner: @amelia

### Debt Justification

Sequential story dependency (same developer). Story 0.4.4 will reuse fixtures created in Story 0.4.3.
```

### Prevention Pattern 4: Story Acceptance Criteria

**All Stories Must Include:**

1. **Functional Requirements**
   - Clear feature description
   - User acceptance criteria
   - API contracts (if applicable)

2. **Test Requirements**
   - Minimum test coverage: 80%
   - Test types required (unit/component/integration)
   - Edge cases to cover

3. **Quality Requirements**
   - All automated quality gates passing
   - TypeScript strict mode (0 errors)
   - No security vulnerabilities

4. **Performance Requirements** (for dashboard stories)
   - Page load time: <2s
   - API response time: <200ms
   - Bundle size impact: <50KB

**Example Story AC (Story 0.4.3):**
```markdown
## Acceptance Criteria

### Functional
- AC1: System prompt editor supports rich text editing with syntax highlighting
- AC2: Variable substitution works with {{variable}} syntax
- AC3: Version history shows all past versions with diff view

### Tests
- AC4: Unit tests for all editor components (≥80% coverage)
- AC5: Component tests for user interactions
- AC6: Integration tests for version history API

### Quality
- AC7: TypeScript strict mode with 0 errors
- AC8: ESLint passing with 0 warnings
- AC9: All components accessible (WCAG 2.1 AA)
```

### Common RE-REVIEW Triggers

| Issue | Root Cause | Prevention |
|-------|------------|------------|
| ESLint errors (41 in Story 9) | Manual checks not run | Automated CI check |
| Unused imports | IDE not configured | ESLint auto-fix + CI |
| `as any` type casts | TypeScript avoidance | Code review focus |
| Test fixture duplication | Copy-paste development | Shared test utilities |
| Formatting inconsistencies | Black/Prettier not run | Automated CI check |
| Missing error states | Incomplete test coverage | Mandatory 80% coverage |

### Success Metrics

**Sprint 1 Baseline:**
- RE-REVIEW Rate: 50% (4/8 stories)
- Velocity Loss: 6-8 days per sprint

**Target (Sprint 2+):**
- RE-REVIEW Rate: <20% (≤2/8 stories)
- Velocity Loss: <2 days per sprint

**Measurement:**
- Track RE-REVIEW rate per sprint in retrospective
- Analyze RE-REVIEW root causes
- Update prevention patterns based on learnings

## Best Practices

### Test Naming Conventions

**Python:**
```python
def test_<function_name>_<scenario>_<expected_result>():
    """Test description in docstring."""
    pass

# Examples:
def test_create_agent_with_valid_data_returns_agent():
def test_create_agent_with_missing_name_raises_validation_error():
def test_execute_agent_with_invalid_id_returns_404():
```

**TypeScript:**
```typescript
describe('ComponentName', () => {
  describe('Feature/Behavior', () => {
    it('should <expected behavior> when <scenario>', () => {
      // test implementation
    });
  });
});

// Examples:
describe('TokenCounter', () => {
  describe('Warning Display', () => {
    it('should show warning icon when at 70-90% limit', () => {});
    it('should show danger color when over 90% limit', () => {});
  });
});
```

### Test Organization

**Directory Structure:**
```
tests/
├── unit/                  # Isolated unit tests
│   ├── test_services/
│   ├── test_models/
│   └── test_utils/
├── integration/           # Multi-component tests
│   ├── test_api_integration/
│   └── test_mcp_workflow/
├── e2e/                   # End-to-end tests
│   └── test_user_workflows/
├── fixtures/              # Shared test fixtures
│   ├── mock_data.py
│   └── test_factories.py
└── mocks/                 # Mock implementations
    └── mock_plugin.py
```

### Test Data Management

**Reusable Fixtures (Avoid Duplication):**
```typescript
// Good: Shared fixture
export const mockTokenCount: TokenCount = {
  count: 1000,
  characters: 4000,
  words: 800,
  model: 'gpt-4',
};

// Usage in multiple tests
import { mockTokenCount } from '@/tests/fixtures/tokenFixtures';

describe('TokenCounter', () => {
  it('test 1', () => {
    render(<TokenCounter tokenCount={mockTokenCount} />);
  });
  
  it('test 2', () => {
    render(<TokenCounter tokenCount={mockTokenCount} maxTokens={2000} />);
  });
});
```

**Bad: Duplicated fixtures**
```typescript
// DON'T DO THIS
describe('TokenCounter', () => {
  const mockTokenCount = { count: 1000, characters: 4000, ... };
});

describe('TokenPreview', () => {
  const mockTokenCount = { count: 1000, characters: 4000, ... }; // DUPLICATE
});
```

### Edge Cases to Test

**Every Feature Should Cover:**
1. **Success Path**: Happy path with valid data
2. **Validation Errors**: Invalid input, missing required fields
3. **Boundary Conditions**: Zero values, maximum values, empty arrays
4. **Error States**: API failures, network errors, timeouts
5. **Loading States**: Data fetching, async operations
6. **Permission Errors**: Unauthorized access, insufficient permissions
7. **Edge Cases**: Special characters, very long inputs, concurrent access

**Example:**
```typescript
describe('PromptVersionHistory', () => {
  it('should display all versions'); // Success path
  it('should handle empty version list'); // Boundary condition
  it('should handle API error gracefully'); // Error state
  it('should show loading spinner during fetch'); // Loading state
  it('should handle versions without creator'); // Edge case
});
```

## Tools and Configuration

### Python Testing Stack

| Tool | Purpose | Config File |
|------|---------|-------------|
| pytest | Test runner | `pyproject.toml` |
| pytest-cov | Coverage reporting | `pyproject.toml` |
| pytest-asyncio | Async test support | `pyproject.toml` |
| black | Code formatting | `pyproject.toml` |
| ruff | Linting | `pyproject.toml` |
| mypy | Type checking | `pyproject.toml` |
| bandit | Security scanning | `pyproject.toml` |

### Next.js Testing Stack

| Tool | Purpose | Config File |
|------|---------|-------------|
| Jest | Test runner | `jest.config.js` |
| React Testing Library | Component testing | N/A |
| @testing-library/user-event | User interaction simulation | N/A |
| Playwright | E2E testing | `playwright.config.ts` |
| ESLint | Linting | `.eslintrc.json` |
| Prettier | Code formatting | `.prettierrc.json` |
| TypeScript | Type checking | `tsconfig.json` |

### Configuration Examples

**`jest.config.js` (Coverage Thresholds):**
```javascript
module.exports = {
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
```

**`.prettierrc.json`:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## Continuous Improvement

### Retrospective Review

After each sprint:
1. Review RE-REVIEW rate and root causes
2. Update prevention patterns based on learnings
3. Adjust quality gates if needed
4. Share learnings across team

### Metrics Tracking

Track in sprint retrospectives:
- Test coverage trend
- RE-REVIEW rate
- Time to first review
- Velocity impact of quality issues

### Document Updates

This document should be updated when:
- New testing patterns discovered
- RE-REVIEW root causes identified
- Tool configuration changes
- Team agreements on testing standards

---

**Document Owner:** Bob (Scrum Master)  
**Last Retrospective:** Sprint 1 (2025-11-22)  
**Next Review:** Sprint 2 Retrospective

## Description

<!-- Provide a brief summary of the changes and the motivation behind them -->

**Story/Epic Reference:** <!-- e.g., Story 0.4.3, Epic 12 -->

**Type of Change:**
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Dependency update

## Changes Made

<!-- List the key changes made in this PR -->

-
-
-

## Testing

### Test Coverage
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated (if applicable)
- [ ] Manual testing completed

**Test Coverage:** <!-- e.g., 99.76%, 85%, etc. -->

### Test Plan
<!-- Describe how you tested these changes -->

1.
2.
3.

## Quality Gates Checklist

### Automated Checks (CI will verify)
- [ ] All tests passing
- [ ] Code formatting (Black/Prettier) passing
- [ ] Linting (Ruff/ESLint) passing
- [ ] Type checking (mypy/TypeScript) passing
- [ ] Build successful
- [ ] No security vulnerabilities (Bandit/npm audit)

### Manual Checks
- [ ] Code follows project style guide
- [ ] No hardcoded secrets or credentials
- [ ] Error handling implemented appropriately
- [ ] Performance considerations addressed
- [ ] Accessibility requirements met (WCAG 2.1 AA)
- [ ] Documentation updated (README, API docs, comments)

## Technical Debt

<!--
IMPORTANT: This section tracks technical debt that is deliberately deferred to maintain velocity.
Sprint 1 retrospective identified that 50% of RE-REVIEW overhead came from undocumented debt handoffs.

Use this format for ALL deferred work:
TODO: [Story X.Y] - Brief description - Est: X hours - Owner: @username

Example:
TODO: [Story 0.4.4] - Refactor CustomTooltip test fixtures to shared module - Est: 2 hours - Owner: @amelia
-->

### Deferred Technical Debt

<!-- List any technical debt intentionally deferred in this PR -->

- None

<!-- OR -->

<!--
- TODO: [Story X.Y] - Description - Est: X hours - Owner: @username
- TODO: [Story X.Y] - Description - Est: X hours - Owner: @username
-->

### Debt Justification

<!--
If deferring debt, explain why:
- Blocking higher-priority work?
- Sequential story dependency (same developer)?
- Requires separate investigation spike?
-->

## Screenshots/Demo

<!-- If applicable, add screenshots, GIFs, or video demonstrating the changes -->

## Accessibility

<!-- For UI changes only -->

- [ ] Keyboard navigation tested
- [ ] Screen reader tested (if applicable)
- [ ] Color contrast meets WCAG 2.1 AA
- [ ] Focus indicators visible
- [ ] ARIA labels added where appropriate

## Performance Considerations

<!-- For performance-critical changes -->

- [ ] Load tested (if applicable)
- [ ] Database queries optimized (if applicable)
- [ ] Bundle size impact measured (for frontend changes)
- [ ] API response time measured (for backend changes)

**Performance Metrics:**
<!-- e.g., "Page load time: <2s, Bundle size: +5KB, API response: <200ms" -->

## Deployment Notes

<!-- Any special deployment considerations -->

- [ ] No database migrations required
- [ ] Environment variables need to be updated
- [ ] Requires infrastructure changes
- [ ] Backward compatible

## Reviewer Notes

<!-- Any specific areas you want reviewers to focus on? -->

## Related PRs/Issues

<!-- Link related PRs or issues -->

Closes #
Related to #

---

**Checklist before requesting review:**
- [ ] Self-review completed
- [ ] All automated quality gates passing locally
- [ ] Technical debt section completed (even if "None")
- [ ] Tests added/updated and passing
- [ ] Documentation updated

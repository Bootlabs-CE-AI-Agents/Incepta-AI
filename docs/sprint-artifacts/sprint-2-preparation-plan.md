# Sprint 2 Preparation Plan

**Date Created:** 2025-11-22
**Sprint:** Next.js UI Migration - Sprint 2 Preparation (3 Days)
**Epic:** Next.js UI Migration
**Retrospective Reference:** `docs/retrospectives/nextjs-sprint-1-retro-2025-11-22.md`

## Executive Summary

Sprint 1 retrospective identified a **critical blocker** for Sprint 2: Story 17 (Backend Workers API) must be completed before any UI stories (18-21) can begin. This document outlines a **3-day preparation sprint** with parallel work streams to unblock Sprint 2 and implement high-impact process improvements.

**Critical Path:**
- Story 17: Backend Workers API (16 hours) - BLOCKS all Sprint 2 UI work
- Streaming Decision ADR (8 hours) - BLOCKS Story 19 (Logs Viewer)

**Expected Outcomes:**
- Sprint 2 fully unblocked
- Performance testing framework in place
- 4 technical debt items resolved
- Team knowledge sharing complete

---

## Table of Contents

1. [Preparation Sprint Overview](#preparation-sprint-overview)
2. [Critical Path Tasks](#critical-path-tasks)
3. [Parallel Preparation Tasks](#parallel-preparation-tasks)
4. [Technical Debt Resolution](#technical-debt-resolution)
5. [Daily Schedule](#daily-schedule)
6. [Success Criteria](#success-criteria)
7. [Risk Mitigation](#risk-mitigation)

---

## Preparation Sprint Overview

### Duration
**3 Days** (Days -3, -2, -1 before Sprint 2 starts)

### Team Allocation
- **Charlie (Senior Dev):** Backend API + Prometheus integration (2.5 days)
- **Amelia (Developer):** Streaming research + fixtures refactor + knowledge sharing (2 days)
- **Alice (Product Owner):** Performance DoD definition (0.5 days)
- **Dana (QA Engineer):** k6 test scripts + performance DoD (0.5 days)

### Work Streams

| Stream | Focus | Days | Owner(s) |
|--------|-------|------|----------|
| **Critical Path** | Backend API + Streaming | 3 | Charlie + Amelia |
| **Quality Gates** | Performance testing | 1 | Alice + Dana |
| **Technical Debt** | Fixtures refactor | 0.5 | Amelia |
| **Knowledge Sharing** | Celery architecture | 0.25 | Charlie + Amelia |

---

## Critical Path Tasks

These tasks **BLOCK Sprint 2** and must complete successfully before UI work begins.

### Task 1: Backend Workers API (Story 17)

**Owner:** Charlie (Senior Dev)
**Duration:** 16 hours (Days -3 to -2)
**Priority:** P0 - BLOCKING
**Blocks:** Stories 18, 19, 20, 21

#### Scope

Implement REST API endpoints for Celery worker monitoring to enable UI dashboard development.

#### Deliverables

1. **Three REST Endpoints:**

   **A. `GET /api/workers`**
   ```python
   # List all active Celery workers with status
   Response: {
     "workers": [
       {
         "id": "worker-1@hostname",
         "status": "online" | "offline",
         "active_tasks": 3,
         "processed_tasks": 1524,
         "success_rate": 0.98,
         "avg_task_duration_ms": 1250,
         "last_heartbeat": "2025-11-22T10:30:00Z",
         "uptime_seconds": 86400
       }
     ],
     "total_count": 5
   }
   ```

   **B. `GET /api/workers/{worker_id}/logs`**
   ```python
   # Get worker logs with pagination and filtering
   Query Params:
     - limit: int (default 100, max 1000)
     - offset: int (default 0)
     - level: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL"
     - start_time: ISO8601 datetime
     - end_time: ISO8601 datetime

   Response: {
     "logs": [
       {
         "timestamp": "2025-11-22T10:30:15.234Z",
         "level": "INFO",
         "task_id": "abc-123",
         "message": "Task completed successfully",
         "worker_id": "worker-1@hostname"
       }
     ],
     "total_count": 5432,
     "has_more": true
   }
   ```

   **C. `POST /api/workers/{worker_id}/restart`**
   ```python
   # Graceful worker restart
   Request Body: {
     "graceful": true,  # Wait for active tasks to complete
     "timeout_seconds": 300  # Max wait time
   }

   Response: {
     "worker_id": "worker-1@hostname",
     "status": "restarting",
     "estimated_completion": "2025-11-22T10:35:00Z",
     "active_tasks_count": 2
   }
   ```

2. **OpenAPI Documentation**
   - Add endpoint definitions to `openapi.yaml`
   - Include request/response schemas
   - Document error codes (400, 404, 500, 503)
   - Add example requests/responses

3. **Backend Implementation**
   - Service layer: `src/services/worker_service.py`
   - API routes: `src/api/workers.py`
   - Database models: `src/database/models.py` (if needed)
   - Pydantic schemas: `src/schemas/worker.py`

4. **Celery Integration**
   - Use Celery Inspect API for worker discovery
   - Implement log aggregation from worker logs
   - Add worker restart via Celery control commands
   - Handle offline/dead worker scenarios

5. **Unit Tests**
   - Test coverage: ≥80%
   - Test files: `tests/unit/test_worker_service.py`, `tests/unit/test_worker_api.py`
   - Mock Celery inspect responses
   - Test error handling (worker offline, invalid IDs)

#### Implementation Plan

**Day -3 (8 hours):**
- Hour 1-2: Design API contracts, review OpenAPI spec
- Hour 3-4: Implement `worker_service.py` with Celery inspect integration
- Hour 5-6: Implement `GET /api/workers` endpoint
- Hour 7-8: Write unit tests for GET /workers

**Day -2 (8 hours):**
- Hour 1-3: Implement `GET /api/workers/{id}/logs` with pagination
- Hour 4-5: Implement `POST /api/workers/{id}/restart` with graceful shutdown
- Hour 6-7: Complete OpenAPI documentation
- Hour 8: Integration testing, fix edge cases

#### Acceptance Criteria

- [ ] All 3 endpoints implemented and tested
- [ ] OpenAPI documentation complete and accurate
- [ ] Unit test coverage ≥80%
- [ ] Manual testing with actual Celery workers successful
- [ ] Error handling covers offline workers, invalid IDs, timeouts
- [ ] Code review approved
- [ ] Merged to main branch

#### Dependencies

- Celery running with at least 1 worker for testing
- Database schema updated (if worker state persistence needed)
- Docker Compose configuration updated for local testing

#### Risk Mitigation

- **Risk:** Celery inspect API unreliable
  - **Mitigation:** Implement fallback to database-based worker tracking

- **Risk:** Worker restart hangs/fails
  - **Mitigation:** Add timeout mechanism, return 503 if restart fails

---

### Task 2: Real-time Streaming Decision (ADR)

**Owner:** Amelia (Developer)
**Duration:** 8 hours (Day -3)
**Priority:** P0 - BLOCKING
**Blocks:** Story 19 (Real-time Logs Viewer)

#### Scope

Research streaming technologies and document decision for real-time log streaming in Story 19.

#### Deliverables

1. **Research Spike (4 hours)**
   - Compare WebSockets vs Server-Sent Events (SSE)
   - Evaluate Next.js 14 App Router compatibility
   - Assess scalability for 100+ concurrent connections
   - Test browser support (Safari, Chrome, Firefox)
   - Evaluate libraries: `socket.io`, `ws`, `sse`, `eventsource`

2. **Working Prototype (2 hours)**
   - Implement minimal spike for chosen technology
   - Test real-time log streaming from Celery worker
   - Verify reconnection handling
   - Test performance with high-frequency events (10 logs/sec)

3. **Architecture Decision Record (2 hours)**
   - Document: `docs/architecture/adr-018-real-time-streaming.md`
   - Follow ADR template from existing ADRs
   - Include comparison matrix
   - Document decision rationale
   - Provide implementation guidance

#### Research Comparison Matrix

| Criteria | WebSockets | Server-Sent Events (SSE) |
|----------|------------|--------------------------|
| **Browser Support** | Excellent (all modern) | Excellent (all modern) |
| **Reconnection** | Manual implementation | Automatic (built-in) |
| **Bi-directional** | Yes | No (server → client only) |
| **Next.js App Router** | Requires custom server | Native fetch support |
| **Scalability** | High (requires connection mgmt) | High (simpler state) |
| **Libraries** | socket.io, ws | native EventSource, sse |
| **Use Case Fit** | Chat, real-time collab | Logs, notifications, feeds |

#### Implementation Plan

**Day -3 (8 hours):**
- Hour 1-2: Research WebSockets (libraries, Next.js compatibility, examples)
- Hour 3-4: Research SSE (native support, reconnection, Next.js patterns)
- Hour 5-6: Build working prototype with chosen technology
- Hour 7-8: Write ADR-018 with decision rationale

#### Acceptance Criteria

- [ ] Research comparison documented
- [ ] Working prototype demonstrates real-time log streaming
- [ ] ADR-018 created following template
- [ ] Decision includes implementation guidance for Story 19
- [ ] Code review approved (prototype code optional to merge)
- [ ] Decision socialized with team

#### Recommended Decision (Preliminary)

**Server-Sent Events (SSE)** is recommended for this use case:

**Rationale:**
- **Unidirectional:** Logs only flow server → client (no client → server needed)
- **Automatic Reconnection:** Built-in EventSource API handles reconnects
- **Next.js Native:** Works with App Router fetch API and streaming responses
- **Simpler Implementation:** No custom WebSocket server needed
- **Good Enough Performance:** Handles 10-100 logs/sec easily
- **HTTP/2 Multiplexing:** Efficient when multiple streams needed

**Implementation Sketch:**
```typescript
// Next.js API Route: app/api/workers/[id]/logs/stream/route.ts
export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Subscribe to Celery log events
      for await (const log of subscribeToWorkerLogs(workerId)) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(log)}\n\n`));
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// React Hook: hooks/useWorkerLogsStream.ts
export function useWorkerLogsStream(workerId: string) {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/workers/${workerId}/logs/stream`);

    eventSource.onmessage = (event) => {
      const log = JSON.parse(event.data);
      setLogs(prev => [...prev, log]);
    };

    return () => eventSource.close();
  }, [workerId]);

  return logs;
}
```

---

## Parallel Preparation Tasks

These tasks run in parallel with critical path and add value without blocking Sprint 2.

### Task 3: Performance Testing Definition of Done

**Owners:** Alice (Product Owner) + Dana (QA Engineer)
**Duration:** 4 hours (Day -1)
**Priority:** P1 - HIGH
**Impact:** Prevents performance regressions in production

#### Scope

Add performance testing criteria to Story Definition of Done and create k6 test scripts.

#### Deliverables

1. **Updated Definition of Done**
   - Add to `.bmad/bmm/templates/story-template.md`
   - New acceptance criterion: "Performance tested with k6 (100 concurrent users, <2s response time, <5% error rate)"
   - Document when performance testing is required (dashboard pages, API endpoints)

2. **k6 Test Scripts**
   - Create `tests/performance/dashboard-load-test.js`
   - Test scenarios:
     - Dashboard page load (LLM Costs, Agent Performance, Workers)
     - API endpoint stress (100 concurrent requests)
     - Data fetching with pagination (1000 records)
   - Performance budgets:
     - Page load time: <2 seconds
     - API response time: <200ms (p95)
     - Error rate: <5%
     - Concurrent users: 100

3. **CI/CD Integration**
   - Add performance test job to `.github/workflows/performance-tests.yml`
   - Run on staging environment before production deploy
   - Fail build if thresholds exceeded

#### Implementation Plan

**Day -1 (4 hours):**
- Hour 1: Alice defines performance criteria for dashboard stories
- Hour 2: Dana creates k6 test scripts for LLM Costs dashboard
- Hour 3: Dana creates k6 test scripts for Workers dashboard (Story 19-21)
- Hour 4: Alice + Dana integrate into CI/CD, test against staging

#### Example k6 Script

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],  // 95% of requests under 200ms
    http_req_failed: ['rate<0.05'],    // Error rate under 5%
  },
};

export default function () {
  const res = http.get('http://localhost:3000/dashboard/llm-costs');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'page loads in <2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);
}
```

#### Acceptance Criteria

- [ ] Story template updated with performance criteria
- [ ] k6 test scripts created for dashboard pages
- [ ] Performance thresholds documented
- [ ] CI/CD workflow integrated
- [ ] Test run successful against staging environment

---

### Task 4: Celery Monitoring Prometheus Integration

**Owner:** Charlie (Senior Dev)
**Duration:** 8 hours (Days -2 to -1)
**Priority:** P2 - MEDIUM
**Impact:** Production monitoring and alerting for workers

#### Scope

Integrate Prometheus metrics for Celery workers to enable production monitoring.

#### Deliverables

1. **Prometheus Exporter**
   - Install `prometheus-client` Python library
   - Create `src/monitoring/celery_metrics.py`
   - Export metrics:
     - `celery_tasks_total{status="success|failure|retry"}`
     - `celery_task_duration_seconds{task_name, quantile}`
     - `celery_workers_online`
     - `celery_queue_length{queue_name}`

2. **Grafana Dashboard**
   - Create `monitoring/grafana/celery-dashboard.json`
   - Panels:
     - Worker health status
     - Task throughput (tasks/sec)
     - Task duration percentiles (p50, p95, p99)
     - Error rate trends
     - Queue length monitoring

3. **Alerting Rules**
   - Create `monitoring/prometheus/celery-alerts.yml`
   - Alerts:
     - Worker offline for >5 minutes
     - Error rate >10%
     - Task duration p95 >5 seconds
     - Queue length >1000

#### Implementation Plan

**Day -2 (4 hours):**
- Hour 1-2: Implement Prometheus exporter in `celery_metrics.py`
- Hour 3-4: Test metrics collection, verify Prometheus scraping

**Day -1 (4 hours):**
- Hour 1-2: Create Grafana dashboard
- Hour 3-4: Write alerting rules, test alert firing

#### Acceptance Criteria

- [ ] Prometheus metrics exported from Celery workers
- [ ] Grafana dashboard visualizes all key metrics
- [ ] Alerting rules configured and tested
- [ ] Documentation updated (`docs/operations/monitoring.md`)

---

### Task 5: Celery Architecture Knowledge Sharing

**Owners:** Charlie (Senior Dev) + Amelia (Developer) - co-facilitate
**Duration:** 2 hours (Day -1)
**Priority:** P2 - MEDIUM
**Impact:** Team knowledge transfer for Sprint 2 workers stories

#### Scope

Team knowledge sharing session on Celery architecture to prepare for Sprint 2 workers monitoring stories.

#### Agenda

**30 Minutes: Architecture Overview (Charlie)**
- Celery fundamentals: workers, queues, tasks, brokers
- Current architecture: RabbitMQ + Celery + Redis
- Task lifecycle: submission → queue → worker → result
- Worker monitoring: inspect API, control commands

**30 Minutes: Monitoring Integration (Charlie)**
- Celery inspect API usage
- Prometheus metrics collection
- Log aggregation patterns
- Worker health checks

**30 Minutes: Frontend Integration (Amelia)**
- REST API design for workers endpoints
- Real-time streaming for logs (SSE vs WebSockets)
- TanStack Query patterns for worker data
- Error handling for offline workers

**30 Minutes: Q&A + Hands-on**
- Team questions
- Live demo: worker restart, log streaming
- Test worker failure scenarios

#### Deliverables

- [ ] Session recording (optional)
- [ ] Shared slides/notes in `docs/architecture/celery-architecture.md`
- [ ] Team questions answered and documented

---

## Technical Debt Resolution

### Task 6: Refactor CustomTooltip Test Fixtures

**Owner:** Amelia (Developer)
**Duration:** 2 hours (Day -1)
**Priority:** P3 - LOW
**Impact:** Reduce test fixture duplication

#### Scope

Extract reusable test fixtures from Stories 9-10 (LLM Cost Dashboard) to shared module.

#### Current Problem

Test fixtures duplicated across multiple test files:
- `DailySpendChart.test.tsx`
- `TokenBreakdownPieChart.test.tsx`
- `CustomTooltip.test.tsx`

Duplicated data structures:
```typescript
// Duplicated in 3+ files
const mockTokenCount: TokenCount = {
  count: 1000,
  characters: 4000,
  words: 800,
  model: 'gpt-4',
};

const mockCostData: CostDataPoint[] = [
  { date: '2025-01-01', cost: 12.50, tokens: 50000 },
  { date: '2025-01-02', cost: 15.30, tokens: 61200 },
];
```

#### Deliverables

1. **Shared Fixtures Module**
   - Create `nextjs-ui/tests/fixtures/llmCostFixtures.ts`
   - Export reusable fixtures:
     - `mockTokenCount`
     - `mockCostData`
     - `mockCostTrendData`
     - `mockBudgetUtilization`
     - `mockChartProps`

2. **Update Test Files**
   - Refactor `DailySpendChart.test.tsx` to import fixtures
   - Refactor `TokenBreakdownPieChart.test.tsx` to import fixtures
   - Refactor `CustomTooltip.test.tsx` to import fixtures
   - Remove all duplicated fixture definitions

3. **Documentation**
   - Add fixtures guide to `docs/testing-strategy.md`
   - Document fixture naming conventions

#### Implementation

```typescript
// tests/fixtures/llmCostFixtures.ts
export const mockTokenCount: TokenCount = {
  count: 1000,
  characters: 4000,
  words: 800,
  model: 'gpt-4',
};

export const mockCostData: CostDataPoint[] = [
  { date: '2025-01-01', cost: 12.50, tokens: 50000 },
  { date: '2025-01-02', cost: 15.30, tokens: 61200 },
];

export const mockCostTrendData: CostTrendDataPoint[] = [
  { timestamp: '2025-01-01T00:00:00Z', cost: 12.50, model: 'gpt-4' },
  { timestamp: '2025-01-02T00:00:00Z', cost: 15.30, model: 'gpt-4' },
];

// Factory functions for customization
export function createMockTokenCount(overrides?: Partial<TokenCount>): TokenCount {
  return { ...mockTokenCount, ...overrides };
}
```

#### Acceptance Criteria

- [ ] Shared fixtures module created
- [ ] All test files refactored to use shared fixtures
- [ ] No duplicated fixture definitions remain
- [ ] All tests passing with 100% coverage
- [ ] Documentation updated

---

## Daily Schedule

### Day -3 (Before Sprint 2 Start)

**Focus:** Critical path unblocking + streaming research

| Time | Task | Owner | Status |
|------|------|-------|--------|
| 9:00 - 11:00 | Story 17: Design API contracts, worker_service.py | Charlie | Critical |
| 9:00 - 11:00 | Streaming research: WebSockets vs SSE comparison | Amelia | Critical |
| 11:00 - 13:00 | Story 17: Implement GET /api/workers endpoint | Charlie | Critical |
| 11:00 - 13:00 | Streaming research: SSE deep dive | Amelia | Critical |
| 14:00 - 16:00 | Story 17: Unit tests for GET /workers | Charlie | Critical |
| 14:00 - 16:00 | Streaming prototype: Build SSE working demo | Amelia | Critical |
| 16:00 - 18:00 | Story 17: Code review, merge | Charlie | Critical |
| 16:00 - 18:00 | Streaming ADR: Write ADR-018 document | Amelia | Critical |

**End of Day -3 Deliverables:**
- ✅ GET /api/workers endpoint complete
- ✅ ADR-018 streaming decision documented
- ✅ SSE prototype working

---

### Day -2

**Focus:** Complete Story 17 + start Prometheus integration

| Time | Task | Owner | Status |
|------|------|-------|--------|
| 9:00 - 12:00 | Story 17: GET /workers/{id}/logs with pagination | Charlie | Critical |
| 12:00 - 13:00 | Lunch break | All | - |
| 13:00 - 15:00 | Story 17: POST /workers/{id}/restart endpoint | Charlie | Critical |
| 15:00 - 17:00 | Story 17: OpenAPI docs + integration testing | Charlie | Critical |
| 17:00 - 18:00 | Story 17: Final code review, merge | Charlie | Critical |
| 14:00 - 18:00 | Prometheus: Implement celery_metrics.py exporter | Charlie | Parallel |

**End of Day -2 Deliverables:**
- ✅ Story 17 COMPLETE (all 3 endpoints)
- ✅ Prometheus exporter implemented

---

### Day -1

**Focus:** Process improvements + knowledge sharing

| Time | Task | Owner | Status |
|------|------|-------|--------|
| 9:00 - 10:00 | Performance DoD: Define criteria | Alice | Process |
| 9:00 - 11:00 | Performance DoD: Create k6 test scripts | Dana | Process |
| 10:00 - 11:00 | Prometheus: Grafana dashboard creation | Charlie | Monitoring |
| 11:00 - 13:00 | Prometheus: Alerting rules | Charlie | Monitoring |
| 13:00 - 15:00 | Celery Architecture Knowledge Sharing Session | Charlie + Amelia | Team |
| 15:00 - 17:00 | Technical Debt: Refactor test fixtures | Amelia | Debt |
| 17:00 - 18:00 | Preparation sprint retrospective | All | Retro |

**End of Day -1 Deliverables:**
- ✅ Performance testing framework complete
- ✅ Prometheus + Grafana monitoring live
- ✅ Team trained on Celery architecture
- ✅ Test fixtures refactored

---

## Success Criteria

### Critical Path Success (MUST HAVE)

- [ ] **Story 17 Complete**
  - All 3 REST endpoints implemented and tested
  - OpenAPI documentation complete
  - Unit test coverage ≥80%
  - Code review approved and merged
  - Manual testing successful with running Celery workers

- [ ] **Streaming Decision Complete**
  - ADR-018 created with clear decision
  - Working prototype demonstrates feasibility
  - Implementation guidance documented
  - Team agrees with decision

### Process Improvement Success (SHOULD HAVE)

- [ ] **Performance Testing Framework**
  - Story DoD updated with performance criteria
  - k6 test scripts created and working
  - CI/CD integration complete
  - Baseline metrics established

- [ ] **Monitoring Infrastructure**
  - Prometheus metrics exported
  - Grafana dashboard created
  - Alerting rules configured
  - Documentation updated

- [ ] **Knowledge Sharing**
  - Team session conducted
  - Architecture documentation created
  - Team comfortable with Celery concepts

- [ ] **Technical Debt Resolved**
  - Test fixtures refactored
  - No duplicated test data
  - All tests passing

### Sprint 2 Readiness

- [ ] All Sprint 2 stories (18-21) have backend dependencies met
- [ ] Story 19 has streaming technology decision
- [ ] Team has Celery architecture knowledge
- [ ] Performance testing framework ready for use
- [ ] No blockers remain

---

## Risk Mitigation

### Risk 1: Story 17 Development Delays

**Probability:** Medium
**Impact:** HIGH (blocks entire Sprint 2)

**Mitigation Strategies:**
1. **Time-box:** If not complete by end of Day -2, cut scope to GET /workers only
2. **Fallback:** Mock API responses for UI development, implement backend in Sprint 2 Day 1-2
3. **Early Testing:** Test with actual Celery workers on Day -3 to catch issues early
4. **Code Review:** Schedule code review for end of Day -2 (don't wait until last minute)

**Warning Signs:**
- Day -3 ends without GET /workers complete
- Celery inspect API proving unreliable
- Test coverage below 80% by Day -2 noon

---

### Risk 2: Streaming Technology Choice Wrong

**Probability:** Low
**Impact:** MEDIUM (Story 19 needs rework)

**Mitigation Strategies:**
1. **Prototype First:** Build working demo before ADR decision
2. **Test Performance:** Verify 10-100 logs/sec throughput
3. **Browser Testing:** Test in Safari, Chrome, Firefox
4. **Fallback:** If SSE fails, polling is acceptable fallback (500ms interval)

**Warning Signs:**
- SSE prototype doesn't handle reconnection
- Browser compatibility issues discovered
- Performance under 10 logs/sec

---

### Risk 3: Team Availability

**Probability:** Medium
**Impact:** MEDIUM (delays parallel work)

**Mitigation Strategies:**
1. **Prioritize Critical Path:** Story 17 and ADR-018 are non-negotiable
2. **Optional Tasks:** Prometheus, fixtures refactor are nice-to-have
3. **Knowledge Sharing:** Record session if team member unavailable
4. **Flexible Scheduling:** Move non-critical tasks to Sprint 2 Day 1 if needed

---

### Risk 4: Performance Testing Infrastructure Issues

**Probability:** Low
**Impact:** LOW (can test manually)

**Mitigation Strategies:**
1. **Manual Testing:** If k6 CI integration fails, run manually before release
2. **Staged Rollout:** Deploy to staging first, validate performance
3. **Monitoring:** Use Prometheus metrics to track production performance

---

## Appendices

### Appendix A: Story 17 API Contract Examples

See [Critical Path Task 1](#task-1-backend-workers-api-story-17) for detailed API specifications.

### Appendix B: Streaming Technology Resources

**Server-Sent Events (SSE):**
- [MDN: Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Next.js Streaming Guide](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)

**WebSockets:**
- [MDN: WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Socket.io Documentation](https://socket.io/docs/v4/)

### Appendix C: Celery Monitoring References

**Celery Inspect API:**
- [Celery Documentation: Monitoring](https://docs.celeryq.dev/en/stable/userguide/monitoring.html)
- [Flower: Celery Monitoring Tool](https://flower.readthedocs.io/)

**Prometheus Integration:**
- [prometheus-client Python](https://github.com/prometheus/client_python)
- [Celery Prometheus Exporter](https://github.com/danihodovic/celery-exporter)

### Appendix D: k6 Performance Testing Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/api-load-testing/)

---

**Document Owner:** Bob (Scrum Master)
**Contributors:** Charlie (Senior Dev), Amelia (Developer), Alice (Product Owner), Dana (QA Engineer)
**Date Created:** 2025-11-22
**Last Updated:** 2025-11-22
**Status:** ACTIVE
**Next Review:** End of Preparation Sprint (Day -1 retrospective)

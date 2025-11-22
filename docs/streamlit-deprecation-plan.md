# Streamlit Sunset & Next.js Migration Roadmap

**Date:** 2025-11-21
**Purpose:** Phased plan to transition users from Streamlit → Next.js and eventually remove Streamlit
**Status:** 📋 **PLANNING DOCUMENT** - Execute after API inventory validation complete

---

## Executive Summary

**Goal:** Replace Streamlit UI with Next.js UI while minimizing user disruption and maintaining zero downtime.

**Timeline:** 9+ weeks from Phase 1 start
**Success Criteria:** 90% of users on Next.js, zero critical bugs for 2 weeks, Streamlit deleted

**Risk Mitigation:**
- Parallel operation allows rollback at any phase
- Parity tests ensure data correctness before transitions
- User feedback collected at each phase
- Emergency rollback plan documented

---

## Prerequisites (Complete Before Phase 1)

### BLOCKER: Must Complete Before Starting Phase 1

- [ ] **API Inventory 100% Verified** - All 14 pages mapped to REST endpoints
- [ ] **Critical Backend APIs Created**
  - [ ] Epic 2 Story 2.1: Workers API (5 endpoints) - `/api/workers`
  - [ ] Epic 6: Operations API (6 endpoints) - `/api/operations/*`
  - [ ] Prometheus Proxy API (3 endpoints) - `/api/metrics/*/timeseries`
- [ ] **All Parity Tests Written** - 14 pages × average 3 tests = ~42 tests
- [ ] **All Parity Tests PASSING** - 100% pass rate, no data mismatches
- [ ] **Next.js Feature Complete**
  - [ ] All 14 Streamlit pages migrated
  - [ ] All RBAC rules ported
  - [ ] All UI components functional
  - [ ] Performance ≥ Streamlit (load time, responsiveness)
- [ ] **Production Deployment Ready**
  - [ ] Next.js deployed to staging environment
  - [ ] Load testing completed (concurrent users, API response times)
  - [ ] Monitoring/alerting configured (DataDog, Sentry, etc.)
  - [ ] Rollback procedure tested

**Estimated Time to Complete Prerequisites:** 3-4 weeks

---

## Phase 1: Parallel Operation (Weeks 1-4)

**Goal:** Both UIs available, users can choose which to use, collect feedback

### User Experience
- **Default Landing:** Streamlit (existing behavior)
- **Access Next.js:** Banner at top of every Streamlit page:
  ```
  ✨ Try our new Next.js UI (beta) - faster, more responsive!
  [Switch to Next.js] [Give Feedback]
  ```
- **Access Streamlit:** Next.js has banner:
  ```
  💡 You're using the new Next.js UI. Having issues? [Switch to Streamlit]
  ```
- **User Choice Persists:** Cookie stores preference (30 days)

### Technical Implementation
- **Routing:**
  - `/dashboard` → Streamlit (default)
  - `/next` → Next.js (beta access)
  - Cookie `ui_preference=streamlit|nextjs` determines redirect
- **Data Collection:**
  - Track page views by UI (analytics event: `ui.page_view`)
  - Track UI switches (event: `ui.switch`, properties: `from`, `to`)
  - Track feedback submissions (event: `ui.feedback`, properties: `rating`, `comment`, `page`)
- **Monitoring:**
  - Next.js error rate vs Streamlit error rate
  - Next.js page load time vs Streamlit
  - User retention (do users switch back to Streamlit?)

### Success Criteria to Advance to Phase 2
- [ ] **Adoption:** ≥10% of daily active users try Next.js
- [ ] **Error Rate:** Next.js error rate ≤ Streamlit error rate
- [ ] **Performance:** Next.js p95 load time ≤ Streamlit p95 load time
- [ ] **Feedback:** ≥70% positive feedback (4-5 stars)
- [ ] **Critical Bugs:** Zero P0 bugs, ≤5 P1 bugs (all with workarounds)
- [ ] **Parity Verified:** Spot-check 10 random user sessions, data matches

### Rollback Plan (If Phase 1 Fails)
1. Remove "Try Next.js" banner from Streamlit
2. Add "Next.js Beta Paused" message
3. Fix critical bugs
4. Re-run parity tests
5. Retry Phase 1

**Phase 1 Duration:** 4 weeks (minimum 2 weeks for data collection)

---

## Phase 2: Next.js Default (Weeks 5-6)

**Goal:** Next.js becomes default, Streamlit fallback, push majority of users to Next.js

### User Experience
- **Default Landing:** Next.js (`/dashboard` routes to Next.js)
- **Access Streamlit:** Banner in Next.js:
  ```
  💡 You're using the new Next.js UI.
  Having issues or prefer the old UI? [Switch to Streamlit]
  ```
- **Access Next.js (from Streamlit):** Banner in Streamlit:
  ```
  ⚠️ This is the old Streamlit UI. It will be removed soon.
  [Switch to Next.js] (recommended)
  ```
- **User Choice Persists:** Cookie still controls, but default flipped

### Technical Implementation
- **Routing Changes:**
  - `/dashboard` → Next.js (NEW default)
  - `/admin/streamlit` → Streamlit (fallback URL)
  - Existing `/next` alias kept for bookmarks
- **Data Collection Continues:**
  - Track "fallback to Streamlit" events (identify problem areas)
  - Track time spent in each UI (session duration by UI)
  - Track feature usage (which pages still prefer Streamlit?)
- **Proactive Outreach:**
  - Email to "Streamlit-only" users: "We're migrating to Next.js, try it!"
  - In-app notifications for users who haven't tried Next.js

### Success Criteria to Advance to Phase 3
- [ ] **Adoption:** ≥70% of daily active users use Next.js
- [ ] **Retention:** ≥90% of Phase 1 Next.js users still on Next.js
- [ ] **Error Rate:** Next.js error rate ≤ 1.5× Streamlit error rate (acceptable during transition)
- [ ] **Critical Bugs:** Zero P0 bugs, ≤3 P1 bugs
- [ ] **Performance:** Next.js p95 load time ≤ Streamlit + 10%
- [ ] **Support Tickets:** Next.js-related tickets ≤ 10/week

### Rollback Plan (If Phase 2 Fails)
1. Flip default back to Streamlit (`/dashboard` → Streamlit)
2. Demote Next.js back to `/next` beta URL
3. Communicate to users: "Next.js default paused due to feedback"
4. Fix issues, re-test, retry Phase 2

**Phase 2 Duration:** 2 weeks (shorter than Phase 1, most bugs already fixed)

---

## Phase 3: Streamlit Read-Only Warning (Weeks 7-8)

**Goal:** Discourage Streamlit use, final push to Next.js, prepare for removal

### User Experience
- **Streamlit Banner (Every Page):**
  ```
  ⛔ THIS PAGE IS DEPRECATED
  Streamlit UI will be removed on [DATE]. All data is read-only (no edits/actions allowed).
  [Switch to Next.js NOW] (required)
  ```
- **Streamlit Restrictions:**
  - All write operations disabled (create, update, delete buttons hidden/grayed out)
  - Forms show: "This action is disabled. Use Next.js to edit."
  - Read-only mode enforced (API calls rejected with 403)
- **Next.js Banner:**
  ```
  ✅ You're using Next.js! Streamlit will be removed on [DATE].
  ```

### Technical Implementation
- **Streamlit Code Changes:**
  - Wrap all mutation buttons with `st.info("Disabled - use Next.js")`
  - Disable form submissions
  - Add global banner via `st.markdown()` at top of every page
- **Backend API Changes:**
  - Add middleware: If `User-Agent: streamlit` → reject mutations with 403
  - Allow GET requests (read-only)
  - Log remaining Streamlit API calls (track who's still using)
- **Communication:**
  - Email blast to all users: "Streamlit removal on [DATE]"
  - Slack notifications (if integrated)
  - In-app countdown timer: "Streamlit removal in X days"

### Success Criteria to Advance to Phase 4
- [ ] **Adoption:** ≥90% of daily active users use Next.js
- [ ] **Streamlit Usage:** ≤5 daily active Streamlit users (identify holdouts)
- [ ] **Critical Bugs:** Zero P0 bugs in Next.js for 7 consecutive days
- [ ] **Support Tickets:** Next.js-related tickets ≤ 5/week
- [ ] **Manual Validation:** Product team uses Next.js exclusively for 1 week

### Rollback Plan (If Phase 3 Fails)
1. Re-enable Streamlit mutations
2. Extend Phase 3 timeline (communicate new removal date)
3. Identify and fix blockers preventing last 10% from switching
4. Offer 1-on-1 migration assistance to holdout users

**Phase 3 Duration:** 2 weeks (final warning period)

---

## Phase 4: Streamlit Removal (Week 9+)

**Goal:** Delete Streamlit codebase, finalize migration, celebrate success

### User Experience
- **Streamlit URL Redirects:**
  - `/admin/streamlit/*` → `/dashboard/*` (301 permanent redirect)
  - `/dashboard` (if somehow still on old default) → `/dashboard` (Next.js)
- **No More Streamlit Access:**
  - All Streamlit pages return 404 or redirect
  - Bookmarks automatically redirect to Next.js equivalent

### Technical Implementation

#### Week 9: Final Streamlit Deprecation
- **Day 1-2: Redirect All Streamlit Traffic**
  - Update nginx/reverse proxy:
    ```nginx
    location /admin/streamlit {
        return 301 /dashboard$request_uri;
    }
    ```
  - Monitor for 404s or redirect loops
  - Communicate: "Streamlit removed as planned"

- **Day 3-5: Remove Streamlit from Deployment**
  - Stop Streamlit container in docker-compose
  - Remove Streamlit from K8s deployment (if applicable)
  - Keep code in repo (don't delete yet - rollback safety)

- **Day 6-7: Monitor for Issues**
  - Watch error rates, support tickets
  - Verify no production issues
  - Identify any undocumented Streamlit dependencies

#### Week 10: Code Cleanup
- **Delete Streamlit Codebase:**
  ```bash
  git rm -r src/admin/pages/
  git rm -r src/admin/utils/
  git commit -m "feat: Remove Streamlit UI (migration complete)"
  ```
- **Remove Streamlit Dependencies:**
  - `requirements.txt`: Remove `streamlit==1.X.X`
  - `docker-compose.yml`: Remove streamlit service
  - `nginx.conf`: Remove streamlit proxy rules
- **Update Documentation:**
  - Archive `docs/streamlit-nextjs-api-inventory.md` (historical reference)
  - Update `README.md`: Remove Streamlit setup instructions
  - Update `docs/architecture.md`: Next.js as sole frontend

### Success Criteria (Final)
- [ ] **Zero Streamlit Traffic:** No requests to `/admin/streamlit` for 7 days
- [ ] **Codebase Clean:** Streamlit code removed, dependencies removed
- [ ] **Documentation Updated:** No references to Streamlit in main docs
- [ ] **No Regressions:** Next.js error rate stable for 14 days
- [ ] **User Satisfaction:** ≥80% positive feedback on Next.js
- [ ] **Team Confidence:** Engineering team comfortable with Next.js stack

### Emergency Rollback Plan (Last Resort)
**IF** a critical P0 bug is discovered in Week 9-10 that blocks all users:

1. **Immediate (< 1 hour):**
   - Revert nginx redirect (re-enable `/admin/streamlit`)
   - Restart Streamlit container from Docker image
   - Communicate outage to users

2. **Short-Term (< 24 hours):**
   - Identify root cause of critical bug
   - Deploy hotfix or rollback breaking Next.js change
   - Run full regression test suite

3. **Recovery:**
   - Fix issue in Next.js
   - Re-test parity tests
   - Return to Phase 3 (read-only Streamlit)
   - Extend timeline 2 weeks

**Rollback Window:** Keep Streamlit deployment config for 30 days after removal

**Phase 4 Duration:** 2 weeks (1 week redirect monitoring + 1 week code cleanup)

---

## Success Metrics Dashboard

### Key Metrics to Track Throughout Migration

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Next.js Adoption Rate** | ≥90% by Phase 4 | % of daily active users on Next.js |
| **Next.js Error Rate** | ≤ Streamlit error rate | Errors/1000 requests |
| **Next.js Load Time (p95)** | ≤ Streamlit + 10% | Seconds (p95 percentile) |
| **User Satisfaction** | ≥4.0/5.0 stars | In-app feedback rating |
| **Support Tickets** | ≤10/week | Tickets tagged "Next.js" |
| **Parity Test Pass Rate** | 100% | % of parity tests passing |
| **Critical Bugs (P0)** | 0 | Count of production-blocking bugs |
| **Feature Completeness** | 100% | % of Streamlit features in Next.js |

### Weekly Review Meetings
- **Attendees:** Engineering Lead, Product Manager, UX Designer
- **Agenda:**
  - Review metrics dashboard
  - Analyze user feedback
  - Identify blockers for next phase
  - Go/No-Go decision for phase advancement

---

## Communication Plan

### Internal (Engineering Team)
- **Kickoff Meeting:** Present this plan, answer questions, assign owners
- **Weekly Standups:** Migration progress, blockers, celebrations
- **Slack Channel:** `#nextjs-migration` for real-time coordination
- **Documentation:** All decisions logged in `docs/migration-decisions.md`

### External (Users)
- **Phase 1 Announcement:**
  ```
  Subject: Try Our New Next.js UI (Beta)

  We're excited to announce our new Next.js UI! It's faster, more responsive,
  and built with modern technology.

  Try it today: [Link to /next]

  Both UIs will be available during the transition. Your feedback helps us improve!
  ```

- **Phase 2 Announcement:**
  ```
  Subject: Next.js is Now the Default UI

  Based on positive feedback, Next.js is now our default UI.

  If you prefer the old Streamlit UI, it's still available at /admin/streamlit.
  However, we recommend switching to Next.js for the best experience.
  ```

- **Phase 3 Announcement:**
  ```
  Subject: [ACTION REQUIRED] Streamlit UI Removal on [DATE]

  The old Streamlit UI will be removed on [DATE].

  ALL users must switch to Next.js before this date. The Streamlit UI is now
  read-only (no edits allowed).

  Switch to Next.js: [Link]
  Need help? Contact support: support@example.com
  ```

- **Phase 4 Announcement:**
  ```
  Subject: Streamlit UI Removed - Migration Complete!

  The Streamlit UI has been successfully removed. All users are now on Next.js!

  Thank you for your patience during this transition. We're excited about the
  new features and improvements we can now deliver with Next.js.

  Questions? Check out our FAQ: [Link]
  ```

---

## Risk Assessment & Mitigation

### High-Risk Scenarios

#### Risk 1: Parity Tests False Positives
**Description:** Tests pass but Next.js shows different data to users
**Likelihood:** Medium
**Impact:** High (users lose trust)
**Mitigation:**
- Manual validation by QA team before Phase 1
- Spot-check 20 random user sessions in Phase 1
- User feedback form on every Next.js page
- A/B test screenshots (Streamlit vs Next.js) for same data

#### Risk 2: Performance Degradation Under Load
**Description:** Next.js slow with 100+ concurrent users
**Likelihood:** Medium
**Impact:** High (user complaints, rollback)
**Mitigation:**
- Load testing with 200 concurrent users before Phase 1
- CDN caching (Cloudflare, Fastly) for static assets
- Database query optimization (add missing indexes)
- Redis caching for expensive queries

#### Risk 3: Undiscovered Backend API Gaps
**Description:** Next.js missing critical API discovered in Phase 2
**Likelihood:** Low (API inventory mitigates)
**Impact:** High (blocks migration)
**Mitigation:**
- Complete API inventory validation before Phase 1
- Parity tests for ALL endpoints
- User acceptance testing (UAT) with real users before Phase 1
- Emergency API creation process (< 48 hour turnaround)

#### Risk 4: User Resistance to Change
**Description:** Users refuse to switch, demand Streamlit forever
**Likelihood:** Low
**Impact:** Medium (delays timeline)
**Mitigation:**
- Emphasize benefits (speed, features) in communications
- Offer 1-on-1 training sessions for resistant users
- Collect feedback and address concerns quickly
- Executive sponsorship (C-level endorsement)

---

## Post-Migration

### Week 11+: Optimization & New Features

**Now that Streamlit is gone, unlock Next.js advantages:**

1. **Real-Time Updates** - WebSockets for live dashboard updates (no more 60s polling)
2. **Mobile Responsive** - Optimize for phone/tablet (Streamlit was desktop-only)
3. **Advanced Visualizations** - D3.js, Recharts animations
4. **Keyboard Shortcuts** - Power user productivity
5. **Dark Mode** - User preference toggle
6. **Customizable Dashboards** - Drag-and-drop widgets
7. **Faster Performance** - Remove Streamlit overhead, optimize bundle size

### Retrospective
**Hold a retrospective meeting to capture learnings:**
- What went well?
- What didn't go well?
- What would we do differently next time?
- Document in `docs/migration-retrospective.md`

---

## Timeline Summary

| Week | Phase | Key Activities | Gate Criteria |
|------|-------|----------------|---------------|
| **Pre-1** | **Prerequisites** | API inventory, parity tests, backend APIs | 100% parity tests passing |
| **1-4** | **Phase 1: Parallel** | Both UIs available, collect feedback | ≥10% adoption, 70% positive feedback |
| **5-6** | **Phase 2: Next.js Default** | Flip default, push users to Next.js | ≥70% adoption, stable error rate |
| **7-8** | **Phase 3: Read-Only** | Streamlit deprecated, final warning | ≥90% adoption, 0 P0 bugs for 7 days |
| **9** | **Phase 4: Removal** | Delete Streamlit code, redirects | Zero Streamlit traffic for 7 days |
| **10+** | **Post-Migration** | Optimize, new features, celebrate | User satisfaction ≥80% |

**Total Duration:** 10 weeks (after prerequisites complete)

---

## Document Control

**Owner:** Engineering Lead
**Reviewers:** Product Manager, UX Designer, DevOps Lead
**Approval Required:** CTO (before Phase 1 starts)
**Last Updated:** 2025-11-21
**Next Review:** Before each phase transition

---

_This is a living document. Update after each phase transition with actual metrics and learnings._

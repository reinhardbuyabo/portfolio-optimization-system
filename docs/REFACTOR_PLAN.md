# Full UI Refactor - Execution Plan

**Date**: November 10, 2025  
**Branch**: Current branch  
**Goal**: Remove old UI, make new UI default, remove mock data, integrate backend

---

## Pre-Refactor State

### Current Structure
```
app/
├── (root)/              ← OLD UI - TO BE DELETED
│   ├── dashboard/
│   ├── market-overview/
│   ├── predictions/
│   └── admin/
├── new/(newui)/         ← NEW UI - TO BE MADE DEFAULT
│   ├── dashboard/
│   ├── portfolios/
│   ├── stock-analysis/  ← ML Integration (just completed)
│   ├── market/
│   ├── reports/
│   └── settings/
├── (auth)/              ← OLD AUTH
└── new/(auth)/          ← NEW AUTH
```

### Files to Delete
- [ ] `app/(root)/dashboard/`
- [ ] `app/(root)/market-overview/`
- [ ] `app/(root)/predictions/`
- [ ] `app/(root)/admin/`
- [ ] `app/(root)/role-demo/`
- [ ] `lib/mockData.ts`
- [ ] Any legacy components using mock data

### Files to Relocate
- [ ] `app/new/(newui)/*` → `app/(dashboard)/*`
- [ ] `app/new/(auth)/*` → `app/(auth)/*` (merge or replace)

---

## Phase 1: Backup and Prepare ✅

### Actions
1. Create this migration plan
2. Document current routes
3. List all components using mock data
4. Verify backend server actions exist

### Verification
- Migration plan created
- Routes documented
- Mock data usage mapped

---

## Phase 2: Move New UI to Root

### Actions
1. Create new layout structure: `app/(dashboard)/`
2. Move files from `app/new/(newui)/` to `app/(dashboard)/`
3. Update layout.tsx
4. Preserve the ML-integrated components (stock-analysis, portfolios)

### File Moves
```
app/new/(newui)/dashboard/page.tsx      → app/(dashboard)/dashboard/page.tsx
app/new/(newui)/portfolios/page.tsx     → app/(dashboard)/portfolios/page.tsx
app/new/(newui)/portfolios/[id]/page.tsx → app/(dashboard)/portfolios/[id]/page.tsx
app/new/(newui)/stock-analysis/page.tsx → app/(dashboard)/stock-analysis/page.tsx
app/new/(newui)/market/page.tsx         → app/(dashboard)/market/page.tsx
app/new/(newui)/reports/page.tsx        → app/(dashboard)/reports/page.tsx
app/new/(newui)/settings/page.tsx       → app/(dashboard)/settings/page.tsx
app/new/(newui)/ml-predictions/page.tsx → app/(dashboard)/ml-predictions/page.tsx
```

### Verification
- [ ] All new UI pages accessible without `/new` prefix
- [ ] ML integration still works
- [ ] Navigation functional

---

## Phase 3: Delete Old UI

### Actions
1. Delete `app/(root)/dashboard/`
2. Delete `app/(root)/market-overview/`
3. Delete `app/(root)/predictions/`
4. Delete `app/(root)/admin/`
5. Delete `app/(root)/role-demo/`
6. Keep `app/(root)/page.tsx` temporarily for root redirect

### Verification
- [ ] Old UI code deleted
- [ ] No broken imports
- [ ] Build succeeds

---

## Phase 4: Update Routing and Imports

### Actions
1. Update all import statements removing `/new` references
2. Update middleware.ts for new routes
3. Update root page.tsx to show dashboard or landing
4. Fix any hardcoded `/new` links in components
5. Update navigation components

### Files to Update
- [ ] `middleware.ts`
- [ ] `app/page.tsx` or `app/(root)/page.tsx`
- [ ] `components/figma/Sidebar.tsx`
- [ ] Any component with `href="/new/*"`

### Verification
- [ ] No 404s on main routes
- [ ] All navigation links work
- [ ] Middleware correctly protects routes

---

## Phase 5: Remove Mock Data

### Actions
1. Delete `lib/mockData.ts`
2. Find all files importing from mockData
3. Replace with API calls or server actions
4. Update components to handle loading states

### Files Using Mock Data (to fix)
```bash
grep -r "mockData" --include="*.tsx" --include="*.ts"
```

### Verification
- [ ] No imports of mockData
- [ ] All data comes from backend
- [ ] Loading states implemented

---

## Phase 6: Auth Cleanup

### Current State
- Old auth: `app/(auth)/` using NextAuth
- New auth: `app/new/(auth)/` simpler login

### Decision Required
**Option A**: Keep NextAuth (more features, established)
**Option B**: Use simpler custom auth (lighter weight)

### Actions (if Option A - NextAuth)
1. Keep `app/(auth)/*` with NextAuth
2. Delete `app/new/(auth)/*`
3. Ensure all protected routes use NextAuth session
4. Update middleware for NextAuth

### Actions (if Option B - Custom Auth)
1. Delete `app/(auth)/*` (NextAuth)
2. Move `app/new/(auth)/*` to `app/(auth)/*`
3. Implement server actions for auth
4. Update middleware for custom auth

### Verification
- [ ] Login works
- [ ] Logout works
- [ ] Protected routes redirect correctly
- [ ] Session persists across routes

---

## Phase 7: Testing Setup

### Install Dependencies
```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom
npm install -D playwright @playwright/test
```

### Create Config Files
1. `vitest.config.ts`
2. `vitest.setup.ts`
3. `playwright.config.ts`

### File Structure
```
__tests__/
├── unit/
│   ├── components/
│   ├── utils/
│   └── actions/
├── integration/
│   ├── api/
│   └── flows/
└── e2e/
    ├── auth.spec.ts
    ├── portfolio.spec.ts
    └── predictions.spec.ts
```

### Verification
- [ ] `npm run test:unit` works
- [ ] `npm run test:e2e` works
- [ ] CI-ready test setup

---

## Phase 8: Write Critical Tests

### Unit Tests (Vitest)
- [ ] Portfolio creation form validation
- [ ] ML prediction result display
- [ ] Chart data transformation
- [ ] Utility functions (formatCurrency, etc.)

### Integration Tests (Vitest)
- [ ] Server actions (create portfolio, login)
- [ ] API routes (ML predictions, stock data)
- [ ] Data fetching and error handling

### E2E Tests (Playwright)
- [ ] Auth flow (login → dashboard)
- [ ] Portfolio creation flow
- [ ] Run ML predictions flow
- [ ] Navigation and routing

### Verification
- [ ] All critical paths tested
- [ ] Tests pass on clean run
- [ ] Coverage > 60% for critical code

---

## Phase 9: QA and Validation

### Manual Testing Checklist
- [ ] **Auth**
  - [ ] Login with valid credentials
  - [ ] Login with invalid credentials
  - [ ] Logout
  - [ ] Protected route redirect
  
- [ ] **Dashboard**
  - [ ] Dashboard loads
  - [ ] Shows correct user data
  - [ ] Navigation works
  
- [ ] **Portfolios**
  - [ ] List portfolios
  - [ ] Create new portfolio
  - [ ] View portfolio details
  - [ ] Edit portfolio (if supported)
  - [ ] Delete portfolio (if supported)
  
- [ ] **Stock Analysis (ML Integration)**
  - [ ] Select stock from dropdown (67 stocks)
  - [ ] Change prediction horizon (1D-1Y)
  - [ ] Run LSTM prediction
  - [ ] Run GARCH prediction
  - [ ] View charts and metrics
  - [ ] Batch run on portfolio
  
- [ ] **Market**
  - [ ] Load market data
  - [ ] View indices
  - [ ] Search stocks
  
- [ ] **Reports**
  - [ ] Generate reports
  - [ ] Export functionality

### Performance Checks
- [ ] Page load times < 2s
- [ ] No console errors
- [ ] No memory leaks
- [ ] Mobile responsive

### Verification
- [ ] All features functional
- [ ] No regressions
- [ ] Production-ready

---

## Phase 10: Update Documentation

### Files to Update
- [ ] `README.md` - Update project structure
- [ ] `INTEGRATION_COMPLETE_SUMMARY.md` - Note refactor completion
- [ ] Create `UI_REFACTOR_COMPLETE.md` - Document changes
- [ ] Update any API documentation

### New Documentation to Create
- [ ] Testing guide (how to run tests)
- [ ] Deployment guide (updated for new structure)
- [ ] Troubleshooting guide

### Verification
- [ ] Documentation accurate
- [ ] Setup instructions current
- [ ] All links valid

---

## Rollback Plan

If critical issues arise:

1. **Revert commits**:
   ```bash
   git log --oneline
   git revert <commit-hash>
   ```

2. **Restore from backup**:
   - Old UI code saved in git history
   - Can cherry-pick specific files

3. **Gradual rollback**:
   - Restore mock data temporarily
   - Keep new UI but reinstate old routing
   - Fix issues then re-attempt

---

## Success Criteria

### Must Have
✅ Old UI completely removed
✅ New UI accessible from root routes
✅ All mock data removed
✅ ML integration functional
✅ Auth works
✅ Portfolio CRUD works
✅ Basic tests pass

### Should Have
✅ Comprehensive test coverage
✅ All E2E flows tested
✅ Documentation updated
✅ No console errors
✅ Performance optimized

### Nice to Have
- CI/CD pipeline updated
- Monitoring/logging enhanced
- Error boundaries implemented
- Progressive enhancement

---

## Estimated Timeline

- **Phase 1**: 15 minutes ✅
- **Phase 2**: 45 minutes
- **Phase 3**: 30 minutes
- **Phase 4**: 1 hour
- **Phase 5**: 45 minutes
- **Phase 6**: 1 hour
- **Phase 7**: 1 hour
- **Phase 8**: 2 hours
- **Phase 9**: 2 hours
- **Phase 10**: 30 minutes

**Total**: ~10 hours

---

## Notes

- Preserve all ML integration work (stock-analysis, horizon selector, GARCH charts)
- Keep prediction horizon feature (1D-1Y)
- Maintain stock dropdown with sector grouping
- Preserve API endpoints and server actions
- Don't modify database schema or backend ML code

---

## Start Time
November 10, 2025 - Starting Phase 2

## Completion Time
TBD



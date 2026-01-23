# Design: Comprehensive E2E Test Coverage

## Context

MekStation has grown significantly with 50+ PRs merged in January 2026. The current E2E test suite covers:
- Basic app routes and loading
- Mobile navigation
- PWA functionality
- Visual regression (limited)
- P2P sync (basic)
- Replay player (basic)

Major features like campaigns, encounters, combat, customizers, and awards have no E2E coverage.

## Goals

1. **Comprehensive coverage**: Every major user flow has E2E tests
2. **Fast execution**: Full suite runs in < 5 minutes
3. **Stability**: No flaky tests (< 1% failure rate on green code)
4. **Clear failures**: Test names and assertions identify broken functionality
5. **Maintainability**: Shared helpers, page objects, test fixtures

## Non-Goals

- 100% code coverage (unit tests handle edge cases)
- Visual regression for every component (only critical paths)
- Performance benchmarking (separate concern)
- Cross-browser testing beyond Chromium (Playwright default)

## Decisions

### Test Organization

```
e2e/
  fixtures/           # Test data factories
    campaign.ts       # Campaign test data
    force.ts          # Force test data
    unit.ts           # Unit test data
  helpers/            # Shared utilities
    navigation.ts     # Navigation helpers
    assertions.ts     # Custom assertions
    wait.ts           # Wait utilities
  pages/              # Page object models
    campaign.page.ts  # Campaign page interactions
    encounter.page.ts # Encounter page interactions
    customizer.page.ts# Customizer interactions
  
  # Test files by domain
  campaign.spec.ts
  encounter.spec.ts
  force.spec.ts
  game-session.spec.ts
  combat.spec.ts
  customizer-aerospace.spec.ts
  customizer-vehicle.spec.ts
  awards.spec.ts
  compendium.spec.ts
  # ... etc
```

**Rationale**: Separating fixtures, helpers, and page objects improves reusability and maintainability.

### Test Data Strategy

**Option A**: Use seeded database with known state
**Option B**: Create test data at runtime via UI
**Option C**: Create test data via API/store injection

**Decision**: Hybrid approach
- Use store injection for complex state (campaigns with missions, forces with units)
- Use UI for simple creation flows (validates the creation UI works)
- Avoid database seeding (tests should be independent)

**Implementation**:
```typescript
// e2e/fixtures/campaign.ts
export async function createTestCampaign(page: Page): Promise<string> {
  await page.evaluate(() => {
    const store = window.__ZUSTAND_STORES__.campaign;
    return store.getState().createCampaign({
      name: 'Test Campaign',
      // ... minimal required fields
    });
  });
}
```

### Test Isolation

Each test should:
1. Start with clean state (clear stores)
2. Create only the data it needs
3. Clean up after itself (automatic with store reset)

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    // Reset all stores to initial state
    window.__ZUSTAND_STORES__?.campaign?.getState().reset?.();
    window.__ZUSTAND_STORES__?.force?.getState().reset?.();
    // ... etc
  });
});
```

### Waiting Strategy

**Avoid**: Fixed timeouts (`waitForTimeout`)
**Prefer**: Condition-based waits

```typescript
// Bad
await page.waitForTimeout(1000);

// Good
await expect(page.getByTestId('campaign-list')).toBeVisible();
await page.waitForLoadState('networkidle');
```

### Test Categorization

Use Playwright tags for selective execution:

```typescript
test('create campaign @smoke @campaign', async ({ page }) => { ... });
test('complex battle resolution @campaign @slow', async ({ page }) => { ... });
```

```bash
# Run smoke tests only
npx playwright test --grep @smoke

# Skip slow tests
npx playwright test --grep-invert @slow
```

### Data-testid Conventions

```
[entity]-[component]-[action?]

Examples:
  campaign-list
  campaign-card-{id}
  campaign-create-btn
  force-unit-slot-{index}
  encounter-launch-btn
  combat-attack-btn
  armor-location-{location}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Tests become slow | Use `@slow` tag, parallelize, optimize setup |
| Flaky tests | Condition-based waits, retry on CI, investigate failures |
| Maintenance burden | Page objects, shared helpers, clear naming |
| Store injection breaks | Expose stores only in test builds, version the API |

## Open Questions

1. Should we expose Zustand stores globally for test injection?
   - **Tentative**: Yes, behind `NEXT_PUBLIC_E2E_MODE` flag
   
2. How to handle features requiring multiple browser contexts (P2P)?
   - **Tentative**: Use Playwright's multi-page fixtures
   
3. Should we add visual regression for new components?
   - **Tentative**: Only for critical UI (armor diagram, hex grid)

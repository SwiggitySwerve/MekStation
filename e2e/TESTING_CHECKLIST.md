# MekStation E2E Testing Checklist

## Quick Start

```bash
# Run all E2E tests
npm run test:e2e

# Run smoke tests only (fast, for PR checks)
npx playwright test --project=smoke

# Run by tag
npx playwright test --grep @campaign
npx playwright test --grep @smoke
npx playwright test --grep-invert @slow

# Run specific test file
npx playwright test campaign.spec.ts

# Run with browser visible
npm run test:e2e:headed

# Run with Playwright UI (interactive debugging)
npm run test:e2e:ui
```

---

## Test Infrastructure

### Directory Structure

```
e2e/
  fixtures/           # Test data factories
    campaign.ts       # createTestCampaign(), etc.
    encounter.ts      # createTestEncounter(), etc.
    force.ts          # createTestForce(), etc.
    pilot.ts          # createTestPilot(), etc.
    index.ts          # Barrel export

  helpers/            # Shared utilities
    navigation.ts     # navigateTo(), navigateToCampaigns(), etc.
    wait.ts           # waitForPageReady(), waitForListItems(), etc.
    store.ts          # resetStores(), getStoreState(), etc.
    index.ts          # Barrel export

  pages/              # Page object models
    base.page.ts      # BasePage abstract class
    campaign.page.ts  # CampaignListPage, CampaignDetailPage, etc.
    encounter.page.ts # EncounterListPage, etc.
    force.page.ts     # ForceListPage, etc.
    index.ts          # Barrel export

  # Test files
  app-routes.spec.ts
  campaign.spec.ts
  encounter.spec.ts
  force.spec.ts
  game-session.spec.ts
  ...
```

### Store Exposure for Testing

Tests can inject data via exposed stores when `NEXT_PUBLIC_E2E_MODE=true`:

```typescript
// Access stores in tests
const campaignId = await page.evaluate(() => {
  return window.__ZUSTAND_STORES__.campaign.getState().createCampaign({...});
});
```

---

## Test Coverage by System

### Core Application (Implemented)

- [x] Homepage loads without errors
- [x] No broken images
- [x] Accessibility: interactive elements have accessible names
- [x] Document structure valid
- [x] No failed network requests
- [x] Fast page load (< 5s)
- [x] Dark mode support
- [x] Light mode support
- [x] Mobile navigation rendering
- [x] Responsive layout adapts to viewport

### PWA Features (Implemented)

- [x] PWA manifest present and valid
- [x] Service worker support
- [x] Theme color meta tag
- [x] Apple touch icon
- [x] Static asset caching
- [x] Offline page available

### Campaign System (Implemented - `campaign.spec.ts`)

- [x] Navigate to campaigns list page (@smoke @campaign)
- [x] Create new campaign (@smoke @campaign)
- [x] View campaign detail page (@campaign)
- [x] Campaign mission tree displays (@campaign)
- [x] Start mission from campaign (@campaign)
- [x] Campaign audit timeline tab (@campaign)
- [x] Campaign resources display (@campaign)
- [x] Delete campaign with confirmation (@campaign)
- [x] Search/filter campaigns (@campaign)
- [x] Empty state when no campaigns (@campaign)

### Encounter System (Implemented - `encounter.spec.ts`)

- [x] Navigate to encounters list page (@smoke @encounter)
- [x] Create new encounter (@smoke @encounter)
- [x] View encounter detail page (@encounter)
- [x] Assign player force (@encounter)
- [x] Assign opponent force (@encounter)
- [x] Validate encounter before launch (@encounter)
- [x] Launch encounter to game (@smoke @encounter)
- [x] Clone existing encounter (@encounter - skipped, no store action)

### Force Management (Implemented - `force.spec.ts`)

- [x] Navigate to forces list page (@smoke @force)
- [x] Create empty force (@smoke @force)
- [x] Add unit to force (@force)
- [x] Assign pilot to unit (@force)
- [x] Remove unit from force (@force)
- [x] BV calculation updates (@force)
- [x] Clone force (@force)
- [x] Delete force (@force)

### Pilot Management (Partial - `awards.spec.ts`, `integration.spec.ts`)

- [x] Navigate to pilots list page (@smoke)
- [x] Create pilot page navigation (@smoke)
- [ ] View pilot detail page
- [ ] View career history tab
- [ ] Improve gunnery skill
- [ ] Improve piloting skill
- [ ] Purchase ability
- [x] View pilot awards (store-level testing in awards.spec.ts)

### Game Session (Implemented - `game-session.spec.ts`, `ui-components.spec.ts`)

- [x] Game page loads with hex grid (@smoke @game)
- [x] Unit deployment phase (@game)
- [x] Select unit (@game)
- [x] Move unit (@game)
- [ ] Combat phase - select target (@game @combat)
- [ ] Combat phase - execute attack (@game @combat)
- [x] End turn advances phase (@game)
- [x] Game replay page loads (@game)
- [x] Replay controls work (@game)

### Combat Resolution (Implemented - `combat.spec.ts` - 38 tests)

- [x] Attack roll displays correctly (@combat)
- [x] Hit location determination (@combat)
- [x] Damage application to armor (@combat)
- [x] Critical hit processing (@combat @slow)
- [x] Heat accumulation (@combat)
- [x] Heat dissipation (@combat)
- [x] Ammo explosion handling (@combat @slow)
- [x] Unit destruction state (@combat)

### Repair System (Implemented - `repair.spec.ts` - PR #146)

- [x] Navigate to repair bay (@smoke)
- [x] View damaged unit options
- [x] Repair cost calculation
- [x] Queue repair job
- [x] Repair progress tracking

### Awards System (Implemented - `awards.spec.ts` - 13 tests)

- [x] View pilot awards (store-level)
- [x] Award unlock conditions display (auto-evaluation tests)
- [x] Award progress tracking (stats tracking)
- [x] Multiple awards display (independent pilot tracking)

### Customizer - Mech (Implemented - `omnimech.spec.ts`, `exotic-mech.spec.ts`)

- [x] Load mech in customizer (@smoke @customizer)
- [x] Change engine (@customizer)
- [x] Adjust armor (@customizer)
- [x] Add weapon (@customizer)
- [x] Remove equipment (@customizer)
- [x] Validation errors shown (@customizer)
- [x] Save custom variant (@customizer)
- [x] OmniMech pod configuration (@customizer - 20 tests)
- [x] QuadMech configuration (@customizer - exotic-mech.spec.ts)
- [x] LAM configuration (@customizer - exotic-mech.spec.ts)
- [x] Tripod configuration (@customizer - exotic-mech.spec.ts)

### Customizer - Aerospace (Implemented - `aerospace.spec.ts` - PR #147)

- [x] Load aerospace in customizer (@customizer)
- [x] Configure aerospace armor (@customizer)
- [x] Add aerospace weapons (@customizer)
- [x] Save aerospace unit (@customizer)

### Customizer - Vehicle (Implemented - `vehicle.spec.ts` - PR #148)

- [x] Load vehicle in customizer (@customizer)
- [x] Configure vehicle armor (@customizer)
- [x] Add vehicle weapons (@customizer)
- [x] Save vehicle (@customizer)

### Compendium (Implemented - `compendium.spec.ts` - 71 tests)

- [x] Navigate to compendium (@smoke @compendium)
- [x] Browse units (@compendium)
- [x] Search units (@compendium)
- [x] Filter by weight class (@compendium)
- [x] View unit detail (@compendium)
- [x] Browse equipment (@compendium)
- [x] Search equipment (@compendium)
- [x] View equipment detail (@compendium)

### P2P Sync (Implemented)

- [x] Test page loads in mock mode
- [x] Create room in mock mode
- [x] Add items when connected
- [x] Update items
- [x] Delete items
- [x] Disconnect and reconnect

### Audit Timeline (Implemented - `audit-timeline.spec.ts`, `events.spec.ts`)

- [x] Timeline page loads with filters
- [x] Toggle advanced query builder
- [x] Category filters clickable
- [x] Empty state when no events
- [x] Replay keyboard shortcuts
- [x] Campaign events page accessible
- [x] Game events and replay pages
- [x] Event log display in demo game
- [x] Timeline filtering controls
- [x] Export button exists

### UI Components (Implemented - `ui-components.spec.ts` - 18 tests)

- [x] Unit card displays accurate data (compendium)
- [x] PilotMechCard renders correctly (force pages)
- [x] Armor diagram interaction (customizer)
- [x] Armor diagram damage display (record sheet)
- [x] Hex grid renders correctly (demo game)
- [x] Hex grid unit tokens and zoom
- [x] Action bar and phase banner
- [x] Tab manager in customizer

### Integration Flows (Implemented - `integration.spec.ts` - 18 tests)

- [x] Full campaign flow (create → mission → combat → repair)
- [x] Customizer to force flow (create unit → add to force)
- [x] Force to encounter flow (create force → use in encounter)
- [x] Pilot progression flow (create → awards → skills)
- [x] Game session flow (demo game → replay)
- [x] Compendium integration (units, equipment, rules)
- [x] Repair system integration
- [x] Navigation integration (main menu, breadcrumbs)

---

## Manual Testing Checklist

### PWA Installation

- [ ] Chrome/Edge: Install prompt appears in address bar (desktop)
- [ ] Chrome Android: "Add to Home Screen" banner appears
- [ ] Safari iOS: Can add to home screen via share menu
- [ ] Installed app opens in standalone mode (no browser UI)
- [ ] App icon appears correctly on home screen

### Offline Support

1. Open DevTools → Application → Service Workers
   - [ ] Service worker is registered and activated
2. Go to Network tab → Check "Offline"
   - [ ] Offline page displays when navigating
   - [ ] Previously cached pages still work
3. Uncheck "Offline"
   - [ ] App reconnects and works normally

### Mobile Touch Interactions

1. Use Chrome DevTools device toolbar (Ctrl+Shift+M)
   - [ ] Select iPhone or Pixel device preset

2. Bottom Navigation Bar
   - [ ] Visible on mobile viewport
   - [ ] All 5 tabs are tappable (44x44px minimum)
   - [ ] Active tab is highlighted
   - [ ] Smooth tab switching

3. Touch Targets
   - [ ] All buttons meet 44x44px minimum
   - [ ] Adequate spacing between touch targets
   - [ ] No accidental taps on adjacent elements

### Performance

- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 5s
- [ ] No layout shifts after load
- [ ] Smooth scrolling (60fps)
- [ ] No memory leaks during extended use

---

## Browser Compatibility

| Browser | Desktop    | Mobile |
| ------- | ---------- | ------ |
| Chrome  | ✅         | ✅     |
| Firefox | ⚠️ (no SW) | ⚠️     |
| Safari  | ⚠️         | ⚠️     |
| Edge    | ✅         | ✅     |

Note: Service workers may not work in all browsers during development.

---

## CI/CD Configuration

### PR Checks (Fast)

```yaml
- npx playwright test --project=smoke
```

### Merge to Main (Full)

```yaml
- npx playwright test
```

### Nightly (Comprehensive)

```yaml
- npx playwright test --grep @slow
```

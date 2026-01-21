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

### Campaign System
- [ ] Navigate to campaigns list page (@smoke @campaign)
- [ ] Create new campaign (@smoke @campaign)
- [ ] View campaign detail page (@campaign)
- [ ] Campaign mission tree displays (@campaign)
- [ ] Start mission from campaign (@campaign)
- [ ] Campaign audit timeline tab (@campaign)
- [ ] Campaign resources display (@campaign)
- [ ] Delete campaign with confirmation (@campaign)
- [ ] Search/filter campaigns (@campaign)
- [ ] Empty state when no campaigns (@campaign)

### Encounter System
- [ ] Navigate to encounters list page (@smoke @encounter)
- [ ] Create new encounter (@smoke @encounter)
- [ ] View encounter detail page (@encounter)
- [ ] Assign player force (@encounter)
- [ ] Assign opponent force (@encounter)
- [ ] Validate encounter before launch (@encounter)
- [ ] Launch encounter to game (@smoke @encounter)
- [ ] Clone existing encounter (@encounter)

### Force Management
- [ ] Navigate to forces list page (@smoke @force)
- [ ] Create empty force (@smoke @force)
- [ ] Add unit to force (@force)
- [ ] Assign pilot to unit (@force)
- [ ] Remove unit from force (@force)
- [ ] BV calculation updates (@force)
- [ ] Clone force (@force)
- [ ] Delete force (@force)

### Pilot Management
- [ ] Navigate to pilots list page (@smoke)
- [ ] Create pilot (@smoke)
- [ ] View pilot detail page
- [ ] View career history tab
- [ ] Improve gunnery skill
- [ ] Improve piloting skill
- [ ] Purchase ability
- [ ] View pilot awards

### Game Session
- [ ] Game page loads with hex grid (@smoke @game)
- [ ] Unit deployment phase (@game)
- [ ] Select unit (@game)
- [ ] Move unit (@game)
- [ ] Combat phase - select target (@game @combat)
- [ ] Combat phase - execute attack (@game @combat)
- [ ] End turn advances phase (@game)
- [ ] Game replay page loads (@game)
- [ ] Replay controls work (@game)

### Combat Resolution
- [ ] Attack roll displays correctly (@combat)
- [ ] Hit location determination (@combat)
- [ ] Damage application to armor (@combat)
- [ ] Critical hit processing (@combat @slow)
- [ ] Heat accumulation (@combat)
- [ ] Heat dissipation (@combat)
- [ ] Ammo explosion handling (@combat @slow)
- [ ] Unit destruction state (@combat)

### Repair System
- [ ] Navigate to repair bay (@smoke)
- [ ] View damaged unit options
- [ ] Repair cost calculation
- [ ] Queue repair job
- [ ] Repair progress tracking

### Awards System
- [ ] View pilot awards
- [ ] Award unlock conditions display
- [ ] Award progress tracking
- [ ] Multiple awards display

### Customizer - Mech
- [ ] Load mech in customizer (@smoke @customizer)
- [ ] Change engine (@customizer)
- [ ] Adjust armor (@customizer)
- [ ] Add weapon (@customizer)
- [ ] Remove equipment (@customizer)
- [ ] Validation errors shown (@customizer)
- [ ] Save custom variant (@customizer)
- [ ] OmniMech pod configuration (@customizer)

### Customizer - Aerospace
- [ ] Load aerospace in customizer (@customizer)
- [ ] Configure aerospace armor (@customizer)
- [ ] Add aerospace weapons (@customizer)
- [ ] Save aerospace unit (@customizer)

### Customizer - Vehicle
- [ ] Load vehicle in customizer (@customizer)
- [ ] Configure vehicle armor (@customizer)
- [ ] Add vehicle weapons (@customizer)
- [ ] Save vehicle (@customizer)

### Compendium
- [ ] Navigate to compendium (@smoke @compendium)
- [ ] Browse units (@compendium)
- [ ] Search units (@compendium)
- [ ] Filter by weight class (@compendium)
- [ ] View unit detail (@compendium)
- [ ] Browse equipment (@compendium)
- [ ] Search equipment (@compendium)
- [ ] View equipment detail (@compendium)

### P2P Sync (Implemented)
- [x] Test page loads in mock mode
- [x] Create room in mock mode
- [x] Add items when connected
- [x] Update items
- [x] Delete items
- [x] Disconnect and reconnect

### Audit Timeline (Implemented)
- [x] Timeline page loads with filters
- [x] Toggle advanced query builder
- [x] Category filters clickable
- [x] Empty state when no events
- [x] Replay keyboard shortcuts

### Integration Flows (@slow)
- [ ] Full campaign flow (create → mission → combat → repair)
- [ ] Customizer to force flow (create unit → add to force)
- [ ] Force to encounter flow (create force → use in encounter)
- [ ] Pilot progression flow (create → awards → skills)

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

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome  | ✅      | ✅     |
| Firefox | ⚠️ (no SW) | ⚠️   |
| Safari  | ⚠️      | ⚠️     |
| Edge    | ✅      | ✅     |

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

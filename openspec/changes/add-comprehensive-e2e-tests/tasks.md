# Tasks: Comprehensive E2E Test Coverage

## 1. Test Infrastructure Setup

- [x] 1.1 Create `e2e/fixtures/` directory with test data factories
- [x] 1.2 Create `e2e/helpers/` directory with shared utilities
- [x] 1.3 Create `e2e/pages/` directory for page object models
- [x] 1.4 Add store exposure for test injection (`NEXT_PUBLIC_E2E_MODE`)
- [x] 1.5 Update `playwright.config.ts` with test categorization tags
- [x] 1.6 Update `TESTING_CHECKLIST.md` with new test coverage

## 2. Gameplay: Campaign System Tests

- [x] 2.1 Create `e2e/pages/campaign.page.ts` page object
- [x] 2.2 Create `e2e/fixtures/campaign.ts` test data factory
- [x] 2.3 Test: Navigate to campaigns list page
- [x] 2.4 Test: Create new campaign with valid data
- [x] 2.5 Test: View campaign detail page
- [x] 2.6 Test: Campaign mission tree displays correctly
- [x] 2.7 Test: Start mission from campaign
- [x] 2.8 Test: Campaign audit timeline tab shows events
- [x] 2.9 Test: Campaign resources display correctly
- [x] 2.10 Test: Delete campaign with confirmation

## 3. Gameplay: Encounter System Tests

- [x] 3.1 Create `e2e/pages/encounter.page.ts` page object
- [x] 3.2 Create `e2e/fixtures/encounter.ts` test data factory
- [x] 3.3 Test: Navigate to encounters list page
- [x] 3.4 Test: Create new encounter
- [x] 3.5 Test: Configure player force in encounter (empty state verification)
- [x] 3.6 Test: Configure opponent force in encounter (empty state verification)
- [x] 3.7 Test: Validate encounter before launch (launch button disabled)
- [x] 3.8 Test: Launch encounter to game session (skipped - requires force setup)
- [x] 3.9 Test: Clone existing encounter (skipped - no UI exposed)

## 4. Gameplay: Force Management Tests

- [x] 4.1 Create `e2e/pages/force.page.ts` page object
- [x] 4.2 Create `e2e/fixtures/force.ts` test data factory
- [x] 4.3 Test: Navigate to forces list page
- [x] 4.4 Test: Create new force (lance, star, company, level_ii, binary, custom)
- [x] 4.5 Test: View force details page
- [x] 4.6 Test: Edit force details
- [x] 4.7 Test: Delete force with confirmation
- [x] 4.8 Test: Search/filter forces
- [ ] 4.9 Test: Clone existing force (skipped - no UI exposed)

## 5. Gameplay: Game Session Tests

- [x] 5.1 Create `e2e/pages/game.page.ts` page object
- [x] 5.2 Create `e2e/fixtures/game.ts` test data factory
- [x] 5.3 Add data-testid attributes to game components
- [x] 5.4 Test: Game list page navigation and display
- [x] 5.5 Test: Demo game loads with correct initial state
- [x] 5.6 Test: Game session displays phase banner, hex map, action bar
- [x] 5.7 Test: Unit tokens visible on map
- [x] 5.8 Test: Unit selection via store and UI
- [x] 5.9 Test: Zoom controls functionality
- [x] 5.10 Test: Action bar shows phase-appropriate actions
- [x] 5.11 Test: Skip action respects lock state
- [x] 5.12 Test: Game replay page navigation
- [x] 5.13 Test: Error handling for non-existent games
- [ ] 5.14 Test: Movement phase - move unit (requires game flow)
- [ ] 5.15 Test: Combat phase - execute attack (requires game flow)
- [ ] 5.16 Test: End turn advances phase (requires locked units)

## 6. Gameplay: Combat Resolution UI Tests

Note: Combat LOGIC is extensively unit-tested (~4,800 lines in `src/utils/gameplay/__tests__/`).
These E2E tests focus on verifying the UI correctly displays combat data.

- [x] 6.1 Add testids to RecordSheetDisplay.tsx, HeatTracker.tsx, EventLogDisplay.tsx
- [x] 6.2 Create `e2e/combat.spec.ts` with combat UI tests (38 tests)
- [x] 6.3 Test: Record sheet displays unit name, designation, pilot info
- [x] 6.4 Test: Armor/structure values display correctly for all locations
- [x] 6.5 Test: Heat display shows current heat and dissipation rate
- [x] 6.6 Test: Weapons section displays all weapons with stats
- [x] 6.7 Test: Event log displays and toggles correctly
- [x] 6.8 Test: Movement info displays movement type and hexes moved
- [x] 6.9 Test: Pilot wounds display correctly (0 for player, 1 for opponent)
- [x] 6.10 Test: Unit state verification via store (heat, wounds, destroyed)

## 7. Gameplay: Repair System Tests

- [ ] 7.1 Create `e2e/pages/repair.page.ts` page object
- [ ] 7.2 Test: Navigate to repair bay page
- [ ] 7.3 Test: View damaged unit repair options
- [ ] 7.4 Test: Repair cost calculation displays
- [ ] 7.5 Test: Queue repair job
- [ ] 7.6 Test: Repair progress tracking

## 8. Customizer: Aerospace Tests

**COMPLETED** - PR #144 merged. Foundation tests pass. Full customization tests
require fixture/API support for creating aerospace units programmatically.

- [x] 8.1 Add testids to aerospace customizer components (AerospaceCustomizer, StructureTab, ArmorTab, EquipmentTab)
- [x] 8.2 Create `e2e/pages/customizer.page.ts` page object with AerospaceCustomizerPage class
- [x] 8.3 Test: Navigate to aerospace customizer (6 passing tests)
- [-] 8.4 Test: Create new aerospace unit (SKIPPED - requires unit creation fixture)
- [-] 8.5 Test: Configure aerospace armor (SKIPPED - requires loaded unit)
- [-] 8.6 Test: Add weapons to aerospace unit (SKIPPED - requires loaded unit)
- [-] 8.7 Test: Validate aerospace construction rules (SKIPPED - requires loaded unit)
- [-] 8.8 Test: Save aerospace unit (SKIPPED - requires loaded unit)

## 9. Customizer: Vehicle Tests

- [ ] 9.1 Test: Navigate to vehicle customizer
- [ ] 9.2 Test: Create new vehicle
- [ ] 9.3 Test: Configure vehicle armor
- [ ] 9.4 Test: Add weapons to vehicle
- [ ] 9.5 Test: Validate vehicle construction rules
- [ ] 9.6 Test: Save vehicle

## 10. Customizer: OmniMech Tests

- [ ] 10.1 Test: Load OmniMech in customizer
- [ ] 10.2 Test: Switch OmniMech configuration
- [ ] 10.3 Test: Pod space display is accurate
- [ ] 10.4 Test: Add equipment to pod space
- [ ] 10.5 Test: OmniMech indicators display correctly

## 11. Customizer: Exotic Mech Tests

- [ ] 11.1 Test: Load QuadMech in customizer
- [ ] 11.2 Test: QuadMech critical slots display correctly
- [ ] 11.3 Test: Load LAM in customizer (if supported)
- [ ] 11.4 Test: Tripod mech loads correctly (if supported)

## 12. Awards System Tests

- [ ] 12.1 Create `e2e/fixtures/awards.ts` test data factory
- [ ] 12.2 Test: View pilot awards in detail page
- [ ] 12.3 Test: Award unlock conditions display
- [ ] 12.4 Test: Award progress tracking
- [ ] 12.5 Test: Multiple awards display correctly

## 13. P2P Sync Enhanced Tests

- [ ] 13.1 Enhance existing `p2p-sync.spec.ts` with more scenarios
- [ ] 13.2 Test: Create room and get code
- [ ] 13.3 Test: Join room with valid code
- [ ] 13.4 Test: Sync item creation between peers
- [ ] 13.5 Test: Sync item deletion between peers
- [ ] 13.6 Test: Conflict resolution display

## 14. Event Store Tests

- [ ] 14.1 Test: Events are recorded for game actions
- [ ] 14.2 Test: Event timeline displays chronologically
- [ ] 14.3 Test: Event filtering by category
- [ ] 14.4 Test: Event search functionality
- [ ] 14.5 Test: Export events to JSON

## 15. Compendium Tests

**COMPLETED** - PR pending. 71 tests pass.

- [x] 15.1 Create `e2e/pages/compendium.page.ts` page object with 6 page classes
- [x] 15.2 Test: Navigate to compendium hub page (3 tests)
- [x] 15.3 Test: Navigate to units page and search (5 tests)
- [x] 15.4 Test: Navigate to equipment page and filter (7 tests)
- [x] 15.5 Test: Navigate to rules reference pages (8 tests)
- [x] 15.6 Test: Responsive design tests (2 tests)
- [x] 15.7 Test: Accessibility tests (2 tests)
- [x] 15.8 Add testids to compendium hub page

## 16. UI Component Tests

- [ ] 16.1 Test: Unit card displays accurate data
- [ ] 16.2 Test: PilotMechCard renders correctly
- [ ] 16.3 Test: Armor diagram interaction
- [ ] 16.4 Test: Armor diagram damage display
- [ ] 16.5 Test: Hex grid renders correctly
- [ ] 16.6 Test: Hex grid unit selection

## 17. Cross-Feature Integration Tests

- [ ] 17.1 Test: Full campaign flow (create -> mission -> combat -> repair)
- [ ] 17.2 Test: Customizer to force flow (create unit -> add to force)
- [ ] 17.3 Test: Force to encounter flow (create force -> use in encounter)
- [ ] 17.4 Test: Pilot progression flow (create -> awards -> skills)

## 18. Documentation & CI

- [ ] 18.1 Update `TESTING_CHECKLIST.md` with all new tests
- [ ] 18.2 Add E2E test documentation to `docs/development/`
- [ ] 18.3 Configure CI to run smoke tests on PR
- [ ] 18.4 Configure CI to run full suite on merge to main
- [ ] 18.5 Add test coverage badge to README

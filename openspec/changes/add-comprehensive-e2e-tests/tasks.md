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

- [ ] 5.1 Create `e2e/pages/game.page.ts` page object
- [ ] 5.2 Test: Game page loads with hex grid
- [ ] 5.3 Test: Unit placement phase
- [ ] 5.4 Test: Movement phase - select unit
- [ ] 5.5 Test: Movement phase - move unit
- [ ] 5.6 Test: Combat phase - select target
- [ ] 5.7 Test: Combat phase - execute attack
- [ ] 5.8 Test: End turn advances phase
- [ ] 5.9 Test: Game replay page loads (enhance existing)
- [ ] 5.10 Test: Replay controls work correctly

## 6. Gameplay: Combat Resolution Tests

- [ ] 6.1 Test: Attack roll displays correctly
- [ ] 6.2 Test: Hit location determination
- [ ] 6.3 Test: Damage application to armor
- [ ] 6.4 Test: Critical hit processing
- [ ] 6.5 Test: Heat accumulation and dissipation
- [ ] 6.6 Test: Ammo explosion handling
- [ ] 6.7 Test: Unit destruction state

## 7. Gameplay: Repair System Tests

- [ ] 7.1 Create `e2e/pages/repair.page.ts` page object
- [ ] 7.2 Test: Navigate to repair bay page
- [ ] 7.3 Test: View damaged unit repair options
- [ ] 7.4 Test: Repair cost calculation displays
- [ ] 7.5 Test: Queue repair job
- [ ] 7.6 Test: Repair progress tracking

## 8. Customizer: Aerospace Tests

- [ ] 8.1 Create `e2e/pages/customizer.page.ts` page object (shared)
- [ ] 8.2 Test: Navigate to aerospace customizer
- [ ] 8.3 Test: Create new aerospace unit
- [ ] 8.4 Test: Configure aerospace armor
- [ ] 8.5 Test: Add weapons to aerospace unit
- [ ] 8.6 Test: Validate aerospace construction rules
- [ ] 8.7 Test: Save aerospace unit

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

- [ ] 15.1 Create `e2e/pages/compendium.page.ts` page object
- [ ] 15.2 Test: Navigate to compendium units page
- [ ] 15.3 Test: Search units by name
- [ ] 15.4 Test: Filter units by weight class
- [ ] 15.5 Test: View unit detail page
- [ ] 15.6 Test: Navigate to compendium equipment page
- [ ] 15.7 Test: Search equipment by name
- [ ] 15.8 Test: View equipment detail page
- [ ] 15.9 Test: Navigate to rules reference

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

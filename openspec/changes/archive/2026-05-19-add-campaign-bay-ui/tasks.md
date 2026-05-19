# Tasks: Add Campaign Bay UI

## 1. Bay Navigation and Selectors

- [x] 1.1 Add a "Bays" campaign-navigation group with entries for Mech Bay, Repair Bay, Medical Bay, and Salvage
- [x] 1.2 Add typed campaign-store selectors over `ICampaignInventory` — `selectRepairBay`, `selectSalvageBay`, `selectMedicalBay`, `selectInventorySummary`
- [x] 1.3 Tests: selectors return the expected projections from a populated campaign and empty arrays from a battle-free campaign

## 2. Mech Bay Page

- [x] 2.1 Build the Mech Bay page — a roster-wide unit-status grid (damage state, repair-ticket count, combat-readiness)
- [x] 2.2 Add per-row drill-down navigation into the unit's Repair Bay detail
- [x] 2.3 Implement loading, empty (no units), and error states matching `campaign-ui` conventions
- [x] 2.4 Storybook story with populated, empty, and error variants
- [x] 2.5 Render tests: grid rows, ticket counts, drill-down link

## 3. Repair Bay Page

- [x] 3.1 Build the Repair Bay page — the `repairBay` ticket queue grouped by unit, each ticket showing kind, location, expected hours, parts-ready, status
- [x] 3.2 Implement priority reorder — dragging a ticket writes a `priority` ordinal onto the campaign's `repairTickets` state via the persistence store
- [x] 3.3 Implement loading, empty (no tickets), and error states
- [x] 3.4 Storybook story with populated, empty, and error variants
- [x] 3.5 Tests: queue grouping, priority reorder persists the ordinal, expected-hours and parts-ready render read-only

## 4. Medical Bay Page

- [x] 4.1 Build the Medical Bay page — the `medicalBay` list of injured pilots (injury level, days-to-recover, status), read-only
- [x] 4.2 Add recovery-progress copy making clear healing happens on day advancement
- [x] 4.3 Implement loading, empty (no injuries), and error states
- [x] 4.4 Storybook story with populated, empty, and error variants
- [x] 4.5 Render tests: pilot rows, injury levels, no mutation controls present

## 5. Salvage Acceptance Panel

- [x] 5.1 Build the Salvage Acceptance panel — the `salvageBay` list with per-item accept / decline actions
- [x] 5.2 Implement accept/decline — flips item `status` on the campaign's `salvageAllocations` state via the persistence store
- [x] 5.3 Implement the running mercenary-share value total as a pure projection over item status
- [x] 5.4 Implement loading, empty (no salvage), and error states
- [x] 5.5 Storybook story with populated, empty, and error variants
- [x] 5.6 Tests: accept/decline persists status, value total recomputes correctly, declined items excluded from the total

## 6. Verification

- [x] 6.1 Integration test: after a campaign battle and day advancement, all four bays render the projected inventory
- [x] 6.2 Integration test: salvage accept and repair-priority reorder mark the campaign dirty and trigger an auto-save
- [x] 6.3 `openspec validate add-campaign-bay-ui --strict` clean
- [x] 6.4 Build, lint, typecheck, and storybook-build pass

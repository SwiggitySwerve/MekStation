# Tasks: tactical-movement-intent-composer

## 1. Pre-flight and state foundation

- [x] 1.1 Verify the de-clutter wave's interim dock-authoritative selector edits are reverted on the working branch (per ADR 0001 Consequences); keep direction-neutral fixes
- [x] 1.2 Add the `movementIntent` slice to the gameplay store (`IIntentItem`, `IWaypoint`, `ILocomotionLeg`, `IBudgetOption`, `IMovementIntentState` per design D5) with unit tests for reducers
- [x] 1.3 Implement derived selectors: `ledgerTotalMp`, `budgetOptions` (walk/run/jump budgets via existing `movement-system` hooks, damage/heat-adjusted), `affordableBudgets`; unit-test the engine-crit case (Walk 2 / Run 3)
- [x] 1.4 Implement `commitComposedMovement(intent, lockedMode)` feeding the existing movement declaration path; deprecate `onMovementModeSelect` wiring

## 2. Waypoint routing engine surface

- [x] 2.1 Add waypoint-constrained routing: cheapest A\* path between consecutive anchors, accruing terrain-adjusted MP per hex and facing-change MP at pivots; memoize per (unitId, mode, remainingMp, terrain revision)
- [x] 2.2 Compute per-leg costs and pivot facing costs for the ledger; unit tests: single-click fast default, forced wooded-route waypoint, pop-last restores prior state exactly
- [x] 2.3 Implement Live Intersection: recompute placeable-hex set and palette gating from remaining MP of every affordable budget after each edit; unit tests: reach shrinks after posture add; impossible composition unreachable by construction

## 3. Map interaction (tactical-map-interface delta)

- [x] 3.1 Simultaneous affordable-mode envelopes: render all affordable budgets at once with the existing MegaMek palette + non-color encodings, recomputed against remaining MP (MODIFIED Reachable Hex Overlay scenarios, incl. envelope-shrink)
- [x] 3.2 Re-anchor hover path preview at the last placed waypoint (falling back to the unit); cumulative MP includes composed intent (MODIFIED Path Preview scenarios)
- [x] 3.3 Click-adds-waypoint: append waypoint on reachable-hex click; persist previewed leg; Backspace/last-waypoint-click pops (spec: pop limited to last waypoint)
- [x] 3.4 WaypointLayer rendering: waypoint markers, pivot indicators with facing-change MP, per-leg cost chips (gate chips below medium zoom per design open question resolution)
- [x] 3.5 Keep Facing Picker Overlay working at the last waypoint (final facing feeds the composed intent)

## 4. Composer UI (tactical-movement-intent capability)

- [x] 4.1 `MovementIntentComposer` hosted in the action dock; remove the dock's movement-verb buttons (dock retains facing/phase/utility); demote any in-map mode/cost readout to non-interactive (Single Movement Authority)
- [x] 4.2 `PosturePalette`: legal posture actions with MP costs, Live-Intersection disabling with non-color-only encoding (illegal-for-state actions not offered)
- [x] 4.3 `CostLedger`: per-item rows, running total, per-budget affordability columns; world-change recompute flags rows and blocks Lock-In
- [x] 4.4 `BudgetResolver`: affordable modes with heat + attacker to-hit consequence lines; Forced Mode single-option; explicit Lock-In button (never auto-pick); Lock-In commits atomically and resets composition
- [x] 4.5 Keyboard + touch: posture hotkeys retained, keyboard hex-cursor waypoint placement, Backspace pop; aria semantics on palette/resolver disabled states

## 5. Test migration and verification

- [x] 5.1 Re-anchor tactical e2e specs and the command-screen evidence capture flow (`tactical-action-dock:movement` ready-marker, combat quick-slice) from mode buttons to composer interactions
- [x] 5.2 Unit/integration tests for the full flow: prone engine-crit unit composes Careful Stand + 2-hex move → Forced Mode Run → Lock-In commits sequence
- [x] 5.3 Run `npm run typecheck`, targeted jest, `npm run qc:command:combat:quick`, `npm run qc:command-evidence` (capture + validate); read PNG 09 to confirm composer renders, single authority, envelopes visible
- [x] 5.4 `openspec.cmd validate tactical-movement-intent-composer --strict` passes; update evidence manifest if ready-markers changed

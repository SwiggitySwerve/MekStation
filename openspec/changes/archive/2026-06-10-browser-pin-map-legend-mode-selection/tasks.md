## 1. Implementation

- [x] Add a stateful tactical-map harness scenario for legend-driven movement mode selection.
- [x] Reuse derived biped walk/run/jump movement projections rather than hand-authored movement rows.
- [x] Wire the scenario to the map legend selection callback.

## 2. Verification

- [x] Add focused fixture coverage for the selectable legend projection source data.
- [x] Add Playwright coverage that clicks MP legend rows and verifies projection metadata changes.
- [x] Run focused Jest and Playwright checks.
- [x] Run strict OpenSpec validation.
- [x] Run typecheck, lint, format, build, and diff checks.

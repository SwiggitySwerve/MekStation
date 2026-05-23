# Tasks: Add Combat To-Hit Modifier Tooltip Rows

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for combat to-hit modifier rows
- [x] 1.2 Require combat and combined tooltips to expose per-modifier rows

## 2. Implementation

- [x] 2.1 Add reusable to-hit modifier row component sourced from `ICombatRangeHex.toHitModifiers`
- [x] 2.2 Render modifier rows in combat-only hover tooltips
- [x] 2.3 Render modifier rows in combined tactical hover tooltips
- [x] 2.4 Expose stable modifier metadata for count, names, values, and sources

## 3. Verification

- [x] 3.1 Add focused combat tooltip coverage for target-terrain modifier rows
- [x] 3.2 Add focused combat tooltip coverage for stacked terrain modifier metadata
- [x] 3.3 Add focused combined tactical tooltip coverage
- [x] 3.4 Focused Jest coverage passes
- [x] 3.5 `npm.cmd run typecheck` passes
- [x] 3.6 `npm.cmd run lint` passes
- [x] 3.7 `npm.cmd run format:check` passes
- [x] 3.8 `npx.cmd openspec validate add-combat-to-hit-modifier-tooltip-rows --strict` passes

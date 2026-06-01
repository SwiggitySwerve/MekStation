# Tasks: Add Movement Option Tooltip Details

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for movement option tooltip details
- [x] 1.2 Require movement and combined tactical tooltips to expose per-option costs and blocked reasons

## 2. Implementation

- [x] 2.1 Add reusable movement option tooltip rows sourced from `movementModeOptions`
- [x] 2.2 Render option rows in movement-only hover tooltips
- [x] 2.3 Render option rows in combined movement/combat hover tooltips
- [x] 2.4 Reuse existing movement option metadata formatting helpers
- [x] 2.5 Expose blocked option invalid reason/detail metadata on individual tooltip rows

## 3. Verification

- [x] 3.1 Add focused movement tooltip coverage for Walk/Run/Jump cost rows
- [x] 3.2 Add focused movement tooltip coverage for blocked option reasons
- [x] 3.3 Add focused combined tactical tooltip coverage
- [x] 3.4 Focused Jest coverage passes
- [x] 3.5 `npm.cmd run typecheck` passes
- [x] 3.6 `npm.cmd run lint` passes
- [x] 3.7 `npm.cmd run format:check` passes
- [x] 3.8 `npx.cmd openspec validate add-movement-option-tooltip-details --strict` passes
- [x] 3.9 Focused browser smoke coverage asserts blocked option row invalid reason/detail metadata

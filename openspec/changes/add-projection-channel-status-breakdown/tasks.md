# Tasks: Add Projection Channel Status Breakdown

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for movement/combat channel statuses
- [x] 1.2 Add `tactical-map-interface` requirement for explicit channel status breakdowns

## 2. Implementation

- [x] 2.1 Add movement-channel status derivation to tactical map hex projections
- [x] 2.2 Add combat-channel status derivation to tactical map hex projections
- [x] 2.3 Surface channel statuses on rendered hex metadata
- [x] 2.4 Surface channel statuses on projection status badges and combined hover tooltips
- [x] 2.5 Preserve current rules calculations and top-level projection status semantics

## 3. Verification

- [x] 3.1 Add focused projection unit tests for channel status derivation
- [x] 3.2 Add focused HexMapDisplay assertions for mixed movement/combat channel metadata
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `npx.cmd openspec validate add-projection-channel-status-breakdown --strict` passes

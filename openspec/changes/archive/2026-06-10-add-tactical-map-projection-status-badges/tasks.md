# Tasks: Add Tactical Map Projection Status Badges

## 1. Spec contract

- [x] 1.1 Author proposal/design/tasks for the focused status badge slice
- [x] 1.2 Add `tactical-map-interface` delta for projection-driven blocked/mixed badges

## 2. Rendering

- [x] 2.1 Add a `HexCell` projection status badge component driven by `ITacticalMapHexProjection` status fields
- [x] 2.2 Render projection blocked/mixed status without recalculating movement or combat legality
- [x] 2.3 Preserve existing movement, combat, terrain, elevation, and invalid badges

## 3. Verification

- [x] 3.1 Add focused render coverage for a mixed movement/combat projection
- [x] 3.2 Add focused render coverage for a blocked combat projection
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `npx.cmd openspec validate add-tactical-map-projection-status-badges --strict` passes

# Tasks: Add Tactical Map Combined Hover Explanations

## 1. Spec contract

- [x] 1.1 Author proposal/design/tasks for combined projection hover explanations
- [x] 1.2 Add `tactical-map-interface` delta for multi-surface hover tooltips

## 2. Implementation

- [x] 2.1 Expose the hovered tactical projection from `useHexMapDisplayState`
- [x] 2.2 Render a combined hover tooltip for projections containing both movement and combat data
- [x] 2.3 Preserve existing single-surface tooltip behavior
- [x] 2.4 Expose the shared projection explanation on the combined tooltip

## 3. Verification

- [x] 3.1 Add focused render coverage for a mixed movement/combat hover
- [x] 3.2 Focused Jest coverage passes
- [x] 3.3 `npm.cmd run typecheck` passes
- [x] 3.4 `npm.cmd run lint` passes
- [x] 3.5 `npm.cmd run format:check` passes
- [x] 3.6 `npx.cmd openspec validate add-tactical-map-combined-hover-explanations --strict` passes
- [x] 3.7 Focused render coverage asserts combined tooltip projection explanation metadata

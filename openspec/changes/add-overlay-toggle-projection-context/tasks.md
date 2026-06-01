# Tasks: Add Overlay Toggle Projection Context

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for overlay toggle projection context
- [x] 1.2 Add `tactical-map-interface` requirement for projection-aware overlay toggles

## 2. Implementation

- [x] 2.1 Expose map-layer id, visibility, lock, and intensity on movement, cover, firing arc, and LOS toggles
- [x] 2.2 Expose shared projection source, projection channel, and rules surface on those toggles
- [x] 2.3 Expand toggle accessible labels with visibility and projection-channel context

## 3. Verification

- [x] 3.1 Add focused render assertions for movement and cover toggle metadata
- [x] 3.2 Add focused render assertions for firing arc and LOS toggle metadata
- [x] 3.3 Focused movement Jest coverage passes
- [x] 3.4 `npx.cmd openspec validate add-overlay-toggle-projection-context --strict` passes
- [x] 3.5 `npx.cmd oxfmt --check` passes for touched TypeScript files
- [x] 3.6 `npm.cmd run typecheck` passes
- [x] 3.7 `npm.cmd run lint` passes
- [x] 3.8 `git diff --check` passes

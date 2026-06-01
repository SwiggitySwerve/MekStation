# Tasks: Add Isometric Rotation Heading

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for isometric rotation heading
- [x] 1.2 Add `tactical-map-interface` requirement for current isometric camera heading metadata

## 2. Implementation

- [x] 2.1 Render current isometric camera heading in the rotation controls
- [x] 2.2 Expose rotation step and degrees as machine-readable metadata
- [x] 2.3 Preserve existing render-only rotation and axial click behavior

## 3. Verification

- [x] 3.1 Add focused HexMapDisplay rotation heading coverage
- [x] 3.2 Focused Jest coverage passes
- [x] 3.3 `npm.cmd run typecheck` passes
- [x] 3.4 `npm.cmd run lint` passes
- [x] 3.5 `npm.cmd run format:check` passes
- [x] 3.6 `npx.cmd openspec validate add-isometric-rotation-heading --strict` passes

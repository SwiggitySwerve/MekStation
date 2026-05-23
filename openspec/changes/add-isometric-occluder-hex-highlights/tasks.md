# Tasks: Add Isometric Occluder Hex Highlights

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for isometric occluder hex highlights
- [x] 1.2 Add `tactical-map-interface` requirement for occluding terrain visibility

## 2. Implementation

- [x] 2.1 Derive occluder-hex metadata from existing terrain occlusion info
- [x] 2.2 Pass occluder metadata through map state to each hex cell
- [x] 2.3 Render isometric-only occluder attributes, outline, badge, and stack emphasis

## 3. Verification

- [x] 3.1 Add focused projection/helper coverage
- [x] 3.2 Add focused render coverage
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `npx.cmd openspec validate add-isometric-occluder-hex-highlights --strict` passes

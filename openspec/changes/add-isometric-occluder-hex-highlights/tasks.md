# Tasks: Add Isometric Occluder Hex Highlights

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for isometric occluder hex highlights
- [x] 1.2 Add `tactical-map-interface` requirement for occluding terrain visibility

## 2. Implementation

- [x] 2.1 Derive occluder-hex metadata from existing terrain occlusion info
- [x] 2.2 Pass occluder metadata through map state to each hex cell
- [x] 2.3 Render isometric-only occluder attributes, outline, badge, and stack emphasis
- [x] 2.4 Count represented building levels in isometric occluder height and
      scene depth ordering
- [x] 2.5 Report effective occluder height in the visible highlight label
- [x] 2.6 Render represented building levels as visible isometric stack layers
- [x] 2.7 Preserve every occluding terrain layer when multiple tall hexes may
      hide the same unit

## 3. Verification

- [x] 3.1 Add focused projection/helper coverage
- [x] 3.2 Add focused render coverage
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `npx.cmd openspec validate add-isometric-occluder-hex-highlights --strict` passes
- [x] 3.8 Focused building-level occluder coverage passes
- [x] 3.9 Focused occluder highlight label coverage passes
- [x] 3.10 Focused building-stack render coverage passes
- [x] 3.11 Focused helper, render, and browser coverage proves multiple
      occluder layers remain highlighted

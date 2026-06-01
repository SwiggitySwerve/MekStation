# Tasks: Add Isometric Occluder Hover Explanations

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for isometric occluder hover explanations
- [x] 1.2 Require hover text to identify occluded units, reasons, and rotation context

## 2. Implementation

- [x] 2.1 Pass hover occluder metadata from map state into HTML overlays
- [x] 2.2 Render reusable occluder context rows across tooltip variants
- [x] 2.3 Keep rotation-cleared occluder state out of tooltip output

## 3. Verification

- [x] 3.1 Add focused render coverage for occluder hover text
- [x] 3.2 Add focused render coverage for rotation cleanup
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `npx.cmd openspec validate add-isometric-occluder-hover-explanations --strict` passes

# Tasks: Add Projection Camera Control Context

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for projection camera control context
- [x] 1.2 Add `tactical-map-interface` requirement for projection/camera controls

## 2. Implementation

- [x] 2.1 Expose shared projection source/channel/rules-surface metadata on the projection mode toggle
- [x] 2.2 Expose current/target projection mode and current camera heading on the projection mode toggle
- [x] 2.3 Expose current/next isometric camera heading metadata on rotation controls
- [x] 2.4 Expand control accessible labels with projection/camera context
- [x] 2.5 Support focused-map `Q`/`E` keyboard rotation in isometric mode

## 3. Verification

- [x] 3.1 Add focused render assertions for projection and isometric camera control metadata
- [x] 3.2 Add browser smoke assertions for projection and camera control metadata
- [x] 3.3 Focused movement-animation Jest coverage passes
- [x] 3.4 Focused tactical-map browser smoke coverage passes
- [x] 3.5 `npx.cmd openspec validate add-projection-camera-control-context --strict` passes
- [x] 3.6 `npx.cmd oxfmt --check` passes for touched files
- [x] 3.7 `npm.cmd run typecheck` passes
- [x] 3.8 `npm.cmd run lint` passes
- [x] 3.9 `git diff --check` passes
- [x] 3.10 Focused render and browser smoke coverage prove `Q`/`E` rotate
  the isometric camera through the focused map surface

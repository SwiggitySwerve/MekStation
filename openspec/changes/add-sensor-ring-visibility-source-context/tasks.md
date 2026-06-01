# Tasks: Add Sensor Ring Visibility Source Context

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for sensor ring visibility context
- [x] 1.2 Add `tactical-map-interface` requirement for source-aware sensor ring metadata

## 2. Implementation

- [x] 2.1 Derive sensor-ring display position from current or last-known token state
- [x] 2.2 Expose range, radius, displayed position, source position, fog status, and source kind as inspectable attributes
- [x] 2.3 Preserve existing hidden-contact suppression

## 3. Verification

- [x] 3.1 Add focused render assertions for visible and last-known ring context
- [x] 3.2 Add focused assertion that hidden contacts do not render sensor rings
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npx.cmd openspec validate add-sensor-ring-visibility-source-context --strict` passes
- [x] 3.5 `npx.cmd oxfmt --check` passes for touched TypeScript files
- [x] 3.6 `npm.cmd run typecheck` passes
- [x] 3.7 `npm.cmd run lint` passes
- [x] 3.8 `git diff --check` passes

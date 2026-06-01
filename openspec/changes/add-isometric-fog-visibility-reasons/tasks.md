# Tasks: Add Isometric Fog Visibility Reasons

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for isometric fog visibility reasons
- [x] 1.2 Add `tactical-map-interface` requirement for fog-rule indicators distinct from terrain occlusion

## 2. Implementation

- [x] 2.1 Derive isometric visibility-rule metadata from token fog status
- [x] 2.2 Render `FOG`/`LAST` rule badges without terrain occlusion boost
- [x] 2.3 Preserve existing top-down fog marker and elevation occlusion behavior
- [x] 2.4 Project last-known contacts from their stale display hex for isometric depth and terrain occlusion

## 3. Verification

- [x] 3.1 Add focused render coverage for hidden and last-known contacts in isometric mode
- [x] 3.2 Focused Jest coverage passes
- [x] 3.3 `npm.cmd run typecheck` passes
- [x] 3.4 `npm.cmd run lint` passes
- [x] 3.5 `npm.cmd run format:check` passes
- [x] 3.6 `npx.cmd openspec validate add-isometric-fog-visibility-reasons --strict` passes
- [x] 3.7 Add helper and browser coverage for last-known isometric ghost-depth projection

# Tasks: Add Terrain/Elevation Label Projection Context

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for terrain/elevation label projection context
- [x] 1.2 Add `tactical-map-interface` requirement for projection-aware terrain and elevation labels

## 2. Implementation

- [x] 2.1 Expose shared tactical projection source/channel/rules-surface metadata on terrain labels
- [x] 2.2 Expose shared tactical projection source/channel/rules-surface metadata on elevation labels
- [x] 2.3 Preserve terrain-elevation source reference details on both label types

## 3. Verification

- [x] 3.1 Add focused render assertions for label projection metadata
- [x] 3.2 Add browser smoke assertions for top-down terrain/elevation label projection metadata
- [x] 3.3 Focused terrain label Jest coverage passes
- [x] 3.4 Focused tactical-map browser smoke coverage passes
- [x] 3.5 `npx.cmd openspec validate add-terrain-elevation-label-projection-context --strict` passes
- [x] 3.6 `npx.cmd oxfmt --check` passes for touched files
- [x] 3.7 `npm.cmd run typecheck` passes
- [x] 3.8 `npm.cmd run lint` passes
- [x] 3.9 `git diff --check` passes

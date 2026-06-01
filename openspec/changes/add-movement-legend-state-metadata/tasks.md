# Tasks: Add Movement Legend State Metadata

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for movement legend state metadata
- [x] 1.2 Add `tactical-map-interface` requirement for accessible active/disabled legend state

## 2. Implementation

- [x] 2.1 Add accessible active/inactive labels to MP legend rows
- [x] 2.2 Expose disabled Jump reason metadata and hover title
- [x] 2.3 Keep legend rows hoverable without blocking the map overlay broadly

## 3. Verification

- [x] 3.1 Add focused MP legend render coverage
- [x] 3.2 Focused Jest coverage passes
- [x] 3.3 `npm.cmd run typecheck` passes
- [x] 3.4 `npm.cmd run lint` passes
- [x] 3.5 `npm.cmd run format:check` passes
- [x] 3.6 `npx.cmd openspec validate add-movement-legend-state-metadata --strict` passes

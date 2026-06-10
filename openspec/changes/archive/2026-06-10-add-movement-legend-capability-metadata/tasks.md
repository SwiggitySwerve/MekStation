# Tasks: Add Movement Legend Capability Metadata

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for movement legend capability metadata
- [x] 1.2 Add `tactical-map-interface` requirement for motive/MP legend metadata

## 2. Implementation

- [x] 2.1 Add motive mode and effective MP values to map legend state
- [x] 2.2 Render motive mode and MP values in the MP legend
- [x] 2.3 Preserve existing active/inactive/disabled jump legend state

## 3. Verification

- [x] 3.1 Add focused HexMapDisplay legend render coverage
- [x] 3.2 Add movement planning coverage proving capability-derived legend state
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `npx.cmd openspec validate add-movement-legend-capability-metadata --strict` passes

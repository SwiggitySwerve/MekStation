# Tasks: Add Tactical Projection Source Metadata

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for projection source metadata
- [x] 1.2 Validate the focused OpenSpec change

## 2. Projection contract

- [x] 2.1 Add stable source-reference types and formatting helpers
- [x] 2.2 Populate terrain/elevation, movement, combat, LOS-blocker, and legacy
      attack-range source references from the shared projection builder

## 3. Rendering

- [x] 3.1 Expose projection source metadata on `HexCell` data attributes
- [x] 3.2 Expose projection source metadata on tactical hover tooltip context

## 4. Verification

- [x] 4.1 Add focused projection unit coverage
- [x] 4.2 Add focused HexMapDisplay metadata coverage
- [x] 4.3 Focused Jest coverage passes
- [x] 4.4 `npm.cmd run typecheck` passes
- [x] 4.5 `npm.cmd run lint` passes
- [x] 4.6 `npm.cmd run format:check` passes

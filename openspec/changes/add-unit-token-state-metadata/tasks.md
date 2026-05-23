# Tasks: Add Unit Token State Metadata

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for inspectable unit token state metadata
- [x] 1.2 Add `tactical-map-interface` requirement for token wrapper state metadata

## 2. Implementation

- [x] 2.1 Add unit type, display position, source position, and facing metadata to standalone token wrappers
- [x] 2.2 Add mounted host metadata to mounted battle armor token wrappers
- [x] 2.3 Add aerospace altitude and velocity metadata when present
- [x] 2.4 Include token state in accessible labels without changing visuals or click handling

## 3. Verification

- [x] 3.1 Add focused UnitTokenForType assertions for common token metadata
- [x] 3.2 Add focused assertions for aerospace altitude/velocity metadata
- [x] 3.3 Add focused assertions for mounted battle armor host metadata
- [x] 3.4 Focused Jest coverage passes
- [x] 3.5 `npm.cmd run typecheck` passes
- [x] 3.6 `npm.cmd run lint` passes
- [x] 3.7 `npm.cmd run format:check` passes
- [x] 3.8 `npx.cmd openspec validate add-unit-token-state-metadata --strict` passes

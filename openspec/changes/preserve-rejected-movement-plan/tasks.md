# Tasks: Preserve Rejected Movement Plan

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for rejected movement commit handling
- [x] 1.2 Add `tactical-map-interface` requirement covering movement plan preservation after engine rejection

## 2. Implementation

- [x] 2.1 Detect whether a planned movement commit produced a new `MovementDeclared` event
- [x] 2.2 Preserve selected unit, planned movement, and interactive phase when the engine rejects the move
- [x] 2.3 Still refresh session state so `MovementInvalid` evidence is visible to UI surfaces
- [x] 2.4 Preserve successful movement clear/animation behavior

## 3. Verification

- [x] 3.1 Add focused store regression coverage for rejected planned movement commits
- [x] 3.2 Focused Jest coverage passes
- [x] 3.3 `npm.cmd run typecheck` passes
- [x] 3.4 `npm.cmd run lint` passes
- [x] 3.5 `npm.cmd run format:check` passes
- [x] 3.6 `npx.cmd openspec validate preserve-rejected-movement-plan --strict` passes

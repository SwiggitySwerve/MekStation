# Tasks: Block Locked Movement Projections

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for locked movement projection gating
- [x] 1.2 Add `tactical-map-interface` requirement covering UI/engine agreement after movement lock

## 2. Implementation

- [x] 2.1 Add shared movement declaration eligibility for locked/resolved units
- [x] 2.2 Reject locked-unit movement commits with an engine invalid event
- [x] 2.3 Hide map movement projections and MP legend for locked/resolved selected units
- [x] 2.4 Disable movement commands with the same blocked reason

## 3. Verification

- [x] 3.1 Add engine coverage for second movement rejection
- [x] 3.2 Add command availability coverage for locked movement commands
- [x] 3.3 Add movement planning coverage for locked projection suppression
- [x] 3.4 Focused Jest coverage passes
- [x] 3.5 `npm.cmd run typecheck` passes
- [x] 3.6 `npm.cmd run lint` passes
- [x] 3.7 `npm.cmd run format:check` passes
- [x] 3.8 `npx.cmd openspec validate block-locked-movement-projections --strict` passes

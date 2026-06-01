# Tasks: Gate Movement Modes By Effective MP

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for heat-adjusted movement command gating
- [x] 1.2 Add `tactical-map-interface` requirement covering movement commands consuming effective MP

## 2. Implementation

- [x] 2.1 Gate Walk, Run, and Jump availability by movement capability when supplied
- [x] 2.2 Use heat-adjusted `getMaxMP` so commands match movement projection budgets
- [x] 2.3 Preserve legacy command availability when movement capability is not present
- [x] 2.4 Surface the same disabled reason through dock and hex menu command surfaces

## 3. Verification

- [x] 3.1 Add focused movement command, dock, and hex-menu tests
- [x] 3.2 Focused Jest coverage passes
- [x] 3.3 `npm.cmd run typecheck` passes
- [x] 3.4 `npm.cmd run lint` passes
- [x] 3.5 `npm.cmd run format:check` passes
- [x] 3.6 `npx.cmd openspec validate gate-movement-modes-by-effective-mp --strict` passes

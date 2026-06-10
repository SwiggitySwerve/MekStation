# Tasks: Route Movement Command Payloads

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for movement command payload routing
- [x] 1.2 Add `tactical-map-interface` requirement covering movement mode command selection

## 2. Implementation

- [x] 2.1 Forward structured payloads from the tactical action dock
- [x] 2.2 Forward structured payloads from command context menus
- [x] 2.3 Map walk/run/jump payloads to planned movement mode state in interactive Movement phase
- [x] 2.4 Preserve non-movement `lock` action behavior

## 3. Verification

- [x] 3.1 Add focused dispatch assertions for command payload forwarding
- [x] 3.2 Add focused movement helper assertions for payload-to-mode planning
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `npx.cmd openspec validate route-movement-command-payloads --strict` passes

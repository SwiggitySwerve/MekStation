# Tasks: Add Combined Tooltip Stand-Up Details

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for combined tooltip stand-up details
- [x] 1.2 Add `tactical-map-interface` requirement for preserving stand-up movement details in combined hover state

## 2. Implementation

- [x] 2.1 Render stand-up MP cost in the combined tactical tooltip
- [x] 2.2 Render stand-up PSR target/impossible reason and modifiers in the combined tactical tooltip
- [x] 2.3 Preserve existing combined movement/combat/terrain/projection rows

## 3. Verification

- [x] 3.1 Add focused HexMapDisplay combined-tooltip coverage
- [x] 3.2 Focused Jest coverage passes
- [x] 3.3 `npm.cmd run typecheck` passes
- [x] 3.4 `npm.cmd run lint` passes
- [x] 3.5 `npm.cmd run format:check` passes
- [x] 3.6 `npx.cmd openspec validate add-combined-tooltip-standup-details --strict` passes

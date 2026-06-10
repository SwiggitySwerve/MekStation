# Tasks: Gate Fire Volley By Combat Projection

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for projection-gated fire volley commands
- [x] 1.2 Add tactical-map-interface requirement for command availability to consume shared combat projection

## 2. Implementation

- [x] 2.1 Add combat projection fields to tactical command context
- [x] 2.2 Build target-id keyed combat projections from the existing command preview projection pass
- [x] 2.3 Disable `Fire Volley` when the selected target projection is blocked
- [x] 2.4 Let enemy token context menus use the right-clicked target's projection without recalculating rules

## 3. Verification

- [x] 3.1 Add focused command, dock, token menu, and preview input tests
- [x] 3.2 Focused Jest coverage passes
- [x] 3.3 `npm.cmd run typecheck` passes
- [x] 3.4 `npm.cmd run lint` passes
- [x] 3.5 `npm.cmd run format:check` passes
- [x] 3.6 `npx.cmd openspec validate gate-fire-volley-by-combat-projection --strict` passes

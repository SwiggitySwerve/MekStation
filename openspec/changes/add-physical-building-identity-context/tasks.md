# Tasks: Add Physical Building Identity Context

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for represented building identity
- [x] 1.2 Validate the focused OpenSpec change

## 2. Terrain and physical context

- [x] 2.1 Add optional building identity metadata to terrain features
- [x] 2.2 Preserve building identity through terrain encoding
- [x] 2.3 Carry attacker/target building ids into physical attack terrain context
- [x] 2.4 Reject push attempts when attacker and target have different known
      building ids

## 3. Verification

- [x] 3.1 Add focused physical attack restriction coverage
- [x] 3.2 Add focused terrain context coverage
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npx.cmd openspec validate add-physical-building-identity-context --strict` passes
- [x] 3.5 `npm.cmd run typecheck` passes
- [x] 3.6 `npm.cmd run lint` passes
- [x] 3.7 `npm.cmd run format:check` passes

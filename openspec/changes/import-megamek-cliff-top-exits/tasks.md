# Tasks: Import MegaMek Cliff-Top Exits

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec deltas for MegaMek cliff-top exit import
- [x] 1.2 Validate the OpenSpec change strictly

## 2. Implementation

- [x] 2.1 Parse `cliff_top:1:<exitMask>` entries from MegaMek board terrain strings
- [x] 2.2 Convert exit masks to facing-direction metadata
- [x] 2.3 Drop cliff-top exits that do not point to a 1- or 2-level drop
- [x] 2.4 Preserve imported cliff metadata through terrain feature encoding

## 3. Verification

- [x] 3.1 Add parser coverage for cliff exit masks and invalid cliff correction
- [x] 3.2 Add movement projection coverage using parsed board cliff metadata
- [x] 3.3 `npx.cmd openspec validate import-megamek-cliff-top-exits --strict` passes
- [x] 3.4 Focused parser and movement tests pass
- [x] 3.5 `npm.cmd run typecheck` passes
- [x] 3.6 `npm.cmd run lint` passes
- [x] 3.7 `npm.cmd run format:check` passes
- [x] 3.8 `npm.cmd run build` passes
- [x] 3.9 `git diff --check` passes

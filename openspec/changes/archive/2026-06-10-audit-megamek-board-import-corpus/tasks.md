# Tasks: Audit MegaMek Board Import Corpus

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for the optional corpus audit
- [x] 1.2 Validate the OpenSpec change strictly

## 2. Implementation

- [x] 2.1 Add a local script that scans MegaMek `.board` files
- [x] 2.2 Parse each selected board through MekStation's parser
- [x] 2.3 Report board, hex, large-coordinate, and `cliff_top` coverage
- [x] 2.4 Fail on parse errors or parsed-hex count mismatches
- [x] 2.5 Add a package script for the verifier

## 3. Verification

- [x] 3.1 Run the verifier against the local MegaMek board corpus
- [x] 3.2 `npx.cmd openspec validate audit-megamek-board-import-corpus --strict` passes
- [x] 3.3 `npm.cmd run typecheck` passes
- [x] 3.4 `npm.cmd run lint` passes
- [x] 3.5 `npm.cmd run format:check` passes
- [x] 3.6 `npm.cmd run build` passes
- [x] 3.7 `git diff --check` passes

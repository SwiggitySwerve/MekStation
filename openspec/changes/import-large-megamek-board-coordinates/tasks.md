# Tasks: Import Large MegaMek Board Coordinates

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for large MegaMek board labels
- [x] 1.2 Validate the OpenSpec change strictly

## 2. Implementation

- [x] 2.1 Parse two-or-more digit MegaMek column and row label components
- [x] 2.2 Use declared board dimensions to choose the correct column/row split
- [x] 2.3 Preserve existing small-board coordinate parsing behavior
- [x] 2.4 Preserve invalid-coordinate failure behavior for labels that cannot fit
      the declared board dimensions

## 3. Verification

- [x] 3.1 Add parser coverage for three-digit columns and rows
- [x] 3.2 Add parser coverage proving large-board cliff metadata still imports
- [x] 3.3 `npx.cmd openspec validate import-large-megamek-board-coordinates --strict` passes
- [x] 3.4 Focused parser tests pass
- [x] 3.5 `npm.cmd run typecheck` passes
- [x] 3.6 `npm.cmd run lint` passes
- [x] 3.7 `npm.cmd run format:check` passes
- [x] 3.8 `npm.cmd run build` passes
- [x] 3.9 `git diff --check` passes

# Tasks: Align Movement Colors with MegaMek

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta with MegaMek source reference
- [x] 1.2 Modify the `Reachable Hex Overlay by MP Type` requirement for cyan/yellow/red/dark-gray movement colors

## 2. Implementation

- [x] 2.1 Update movement overlay constants for Walk, Run, Jump, and blocked movement
- [x] 2.2 Update MP legend swatches to match the overlay colors
- [x] 2.3 Preserve jump hatch pattern and existing movement range metadata

## 3. Verification

- [x] 3.1 Update focused palette/render tests
- [x] 3.2 Focused Jest coverage passes
- [x] 3.3 `npm.cmd run typecheck` passes
- [x] 3.4 `npm.cmd run lint` passes
- [x] 3.5 `npm.cmd run format:check` passes
- [x] 3.6 `npx.cmd openspec validate align-movement-colors-with-megamek --strict` passes

# Tasks: Use Combat Projection Impact For Command Preview

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for command-preview combat impact source
- [x] 1.2 Add `tactical-map-interface` requirement for weapon preview heat/ammo from shared combat projection

## 2. Implementation

- [x] 2.1 Refactor weapon command preview heat to read `availableWeaponHeat`
- [x] 2.2 Refactor weapon command preview ammo usage to read `availableWeaponImpacts`
- [x] 2.3 Preserve weapon-status usage for expected damage only
- [x] 2.4 Preserve blocked-attack zero heat/ammo behavior

## 3. Verification

- [x] 3.1 Update focused command-preview tests to prove projection-sourced heat/ammo
- [x] 3.2 Update component preview tests to provide projection impact metadata
- [x] 3.3 Focused Jest coverage passes
- [x] 3.4 `npm.cmd run typecheck` passes
- [x] 3.5 `npm.cmd run lint` passes
- [x] 3.6 `npm.cmd run format:check` passes
- [x] 3.7 `npx.cmd openspec validate use-combat-projection-impact-for-command-preview --strict` passes

# Tasks: Add Combat Tooltip Weapon Impact

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for combat weapon impact tooltip rows
- [x] 1.2 Add `tactical-map-interface` requirement for heat/ammo impact from shared combat projection

## 2. Implementation

- [x] 2.1 Add available weapon impact metadata to shared combat projection types
- [x] 2.2 Populate weapon heat/ammo impact in `deriveCombatRangeHexes`
- [x] 2.3 Render weapon impact in combat-only hover tooltips
- [x] 2.4 Render weapon impact in combined movement+combat hover tooltips
- [x] 2.5 Include weapon impact in shared projection explanations

## 3. Verification

- [x] 3.1 Add focused utility coverage for projected weapon impact metadata
- [x] 3.2 Add focused combat tooltip render coverage
- [x] 3.3 Add focused combined tactical tooltip render coverage
- [x] 3.4 Focused Jest coverage passes
- [x] 3.5 `npm.cmd run typecheck` passes
- [x] 3.6 `npm.cmd run lint` passes
- [x] 3.7 `npm.cmd run format:check` passes
- [x] 3.8 `npx.cmd openspec validate add-combat-tooltip-weapon-impact --strict` passes

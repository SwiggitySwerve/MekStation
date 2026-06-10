# Tasks: Add Combat Projection Damage Envelope

## 1. Spec contract

- [x] 1.1 Author proposal/tasks/spec delta for combat projection damage envelope
- [x] 1.2 Add `tactical-map-interface` requirement for projection-sourced expected damage

## 2. Implementation

- [x] 2.1 Extend combat projection impact metadata with listed weapon damage
- [x] 2.2 Add aggregate listed and expected damage to `ICombatRangeHex`
- [x] 2.3 Show damage envelope in combat hover/explanation/aria text
- [x] 2.4 Refactor weapon command preview expected damage to use combat projection
- [x] 2.5 Preserve blocked-attack zero damage behavior
- [x] 2.6 Sum mixed-volley expected damage from per-weapon target numbers instead of the aggregate target number

## 3. Verification

- [x] 3.1 Update focused combat projection tests for damage and expected damage
- [x] 3.2 Update map hover/projection tests for damage text
- [x] 3.3 Update command preview tests to prove projection-sourced expected damage
- [x] 3.4 Focused Jest coverage passes
- [x] 3.5 `npm.cmd run typecheck` passes
- [x] 3.6 `npm.cmd run lint` passes
- [x] 3.7 `npm.cmd run format:check` passes
- [x] 3.8 `npx.cmd openspec validate add-combat-projection-damage-envelope --strict` passes
- [x] 3.9 Mixed medium/extreme volley fixture proves per-weapon expected damage and committed per-weapon target numbers

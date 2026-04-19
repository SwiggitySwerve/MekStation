# Decisions — add-infantry-combat-behavior

## [2026-04-18] Use folder layout (infantry/) not flat files

**Choice**: Put all new code in `src/utils/gameplay/infantry/` with files: `state.ts`, `events.ts`, `damageDivisor.ts`, `damage.ts`, `morale.ts`, `fieldGun.ts`, `platoonFire.ts`, `legAttack.ts`, `cover.ts`, `dispatch.ts`, `aiBehavior.ts`, `index.ts`.
**Rationale**: Matches aerospace pattern from Wave 3, keeps the 200+ KB of new code out of `src/utils/gameplay/` root, gives a single barrel export.
**Discovered during**: Task 1 planning.

## [2026-04-18] Combat state separate from construction state

**Choice**: Build `IInfantryCombatState` in `infantry/state.ts`, constructed at battle start via `createInfantryCombatState(unit: IInfantry)`. Never mutate `IInfantry`.
**Rationale**: Same pattern as aerospace/vehicle combat modules; keeps construction-side types pure.
**Discovered during**: Task 2 (Platoon Combat State).

## [2026-04-18] Engine wiring deferred

**Choice**: `dispatchDamage` will be extended to accept `{ kind: 'infantry', ... }`, but GameEngine integration is deferred (same pattern Wave 3 vehicle + aerospace used).
**Rationale**: GameEngine doesn't call `dispatchDamage` today at all; end-to-end battle simulation of infantry belongs to a follow-up integration wave.
**Discovered during**: Task 1 planning.

## [2026-04-18] Damage divisor lookup by weapon category string

**Choice**: Accept a weapon-category string ('flamer', 'mg', 'burst_fire', 'inferno', 'ballistic', 'energy', 'other') plus raw damage; return effective damage. Callers are responsible for classifying the weapon. A helper `classifyInfantryWeaponCategory(weapon)` will cover the common cases.
**Rationale**: Avoids pulling the entire equipment database into the combat module; keeps the table small and testable.
**Discovered during**: Task 3 planning.

## [2026-04-18] Morale TN + leader modifier

**Choice**: Base TN 8 + optional `leaderModifier` (default 0, range -2..+2). Roll 2d6, compare to TN. Margin-based result: success (≥ TN), pinned (off by exactly 1), routed (off by 2+).
**Rationale**: Matches spec scenarios exactly; leader modifier hook allows future officer / veteran traits without breaking the signature.
**Discovered during**: Task 5 planning.

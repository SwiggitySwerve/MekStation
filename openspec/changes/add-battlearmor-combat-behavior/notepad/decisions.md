# Decisions — add-battlearmor-combat-behavior

## D1: Follow aerospace subfolder layout

**Choice**: Create `src/utils/gameplay/battlearmor/` subfolder with `damage.ts`, `hitLocation.ts`, `swarm.ts`, `legAttack.ts`, `squadFire.ts`, `stealth.ts`, `vibroClaw.ts`, `state.ts`, `events.ts`, `dispatch.ts`, `index.ts`.
**Rationale**: Aerospace's pattern keeps files small and testable. Vehicle's top-level sprawl is messier.
**Referenced by**: Tasks 1, 2, 3, 4, 5, 6, 7, 8.

## D2: Combat state lives separately from construction

**Choice**: `IBattleArmorCombatState` in `src/types/gameplay/BattleArmorCombatInterfaces.ts`, not in `IBattleArmorUnit`.
**Rationale**: Construction types are immutable snapshots; combat state is mutable per battle. Mirrors what vehicle and aerospace do.
**Referenced by**: Tasks 2.1-2.3.

## D3: Dispatch extends existing damageDispatch.ts

**Choice**: Add `'battlearmor'` kind to `DamageDispatchKind` in existing `damageDispatch.ts`.
**Rationale**: One dispatch entry point for ground targets (mech/vehicle/battlearmor); aerospace stays separate because of its flight model.
**Referenced by**: Task 1.1.

## D4: Bot AI adaptations (Section 10) deferred

**Choice**: Section 10 tasks (10.1, 10.2, 10.3) are deferred — bot AI is not currently wired up at the level needed to make adaptations meaningful. Same pattern Wave 3 used.
**Rationale**: Bot AI requires full GameEngine integration not present in this wave. Deferring keeps the wave focused on the combat primitives.
**Referenced by**: Task 10.

## D5: Integration tests deferred

**Choice**: Section 11.2 simulation tests (BA squad vs single mech, mech vs BA squad, BA vs BA) are deferred — GameEngine doesn't yet dispatch BA targets at the scenario level. Same Wave 3 pattern.
**Rationale**: Unit tests cover each primitive (damage distribution, swarm, leg, vibroclaw, stealth, fire resolution). End-to-end scenarios require full GameEngine wiring.
**Referenced by**: Task 11.2.

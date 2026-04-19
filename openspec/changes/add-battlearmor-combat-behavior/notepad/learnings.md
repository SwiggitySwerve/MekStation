# Learnings — add-battlearmor-combat-behavior

## Codebase Conventions
- Vehicle combat was added as top-level files (`vehicleDamage.ts`, `vehicleHitLocation.ts`, etc.) under `src/utils/gameplay/`. Aerospace was added as a subfolder `src/utils/gameplay/aerospace/` with smaller files. Either layout is acceptable; aerospace's subfolder pattern is cleaner and will be followed for BA.
- Combat state is kept OUT of construction interfaces — use a separate `IBattleArmorCombatState` type under `src/types/gameplay/`.
- RNG: inject `D6Roller` / `defaultD6Roller` from `diceTypes.ts` to let tests drive deterministic outcomes.
- Events: existing vehicle events live in `src/utils/gameplay/gameEvents/vehicle.ts`. Mirror that pattern for BA (`battleArmor.ts`).
- Dispatch: aerospace uses `dispatch.ts` in its folder; vehicle uses top-level `damageDispatch.ts`. For BA we'll extend the existing `damageDispatch.ts` to add a `'battlearmor'` kind.

## BA-specific Rules
- BA has NO heat (task 4.3) and NO mech-style criticals (task 1.4, spec scenario "No mech-style criticals on BA"). Do not reuse the crit pipeline.
- Damage model: per-trooper armor pool. One hit → one random surviving trooper takes the whole hit; excess kills that trooper, next hit picks a new random survivor.
- Cluster weapons: damage distributed via cluster-hits table with squadSize used as cluster size (each missile/shell rolled as a hit).
- Swarm: requires Magnetic Clamps. Attach roll = 2d6 + BA piloting vs Mech piloting + 4.
- Leg attack: any BA in base contact may declare. Same roll formula. Success = 4 × survivingTroopers damage to target leg.
- Flamer: 2x damage vs BA/infantry (anti-BA rule, task 9.4).
- Mimetic: +1 to hit if squad didn't move.
- Stealth: Basic +1 all ranges, Improved +2 short/med / +3 long, Prototype +1.
- Vibro-claw: 1 + ceil(0.5 × survivingTroopers) per claw.

## Phase 7 Wave Pattern (from Waves 1-3)
- Wave 3 (vehicle + aerospace combat) deferred integration tests that required full GameEngine/AI wiring and marked them as `.skip()` with a TODO comment. Apply same pattern here.
- Units tests for each module go in `__tests__/` sibling folder.
- Verification: `npx oxfmt --check`, `npx oxlint`, `npx tsc --noEmit -p .`, jest on affected suites.

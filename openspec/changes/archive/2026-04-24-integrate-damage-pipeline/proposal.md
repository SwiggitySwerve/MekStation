# Change: Integrate Damage Pipeline into Combat Resolution

## Why

The sophisticated `damage.ts` pipeline (armor → structure → transfer → adjacent location → pilot) and `criticalHitResolution.ts` (2d6 table → slot selection → effect application) both exist in the codebase but are never called by the combat loop. When an attack hits, the engine records "hit" and stops — it does not actually degrade the unit. Armor never decreases, structure never breaches, internal components never take critical hits, and side-torso destruction never cascades to the arm. This change connects those modules to the attack-resolution path so hits actually matter. It depends on `wire-real-weapon-data` (real damage numbers must arrive at the pipeline) and `wire-firing-arc-resolution` (hit location needs the real arc), and unblocks everything that reads unit state after an attack. See `openspec/changes/archive/2026-02-12-full-combat-parity/proposal.md` Phase 2 and Phase 3 for context.

## What Changes

- Call `resolveDamage()` from `damage.ts` when an attack hits, passing damage, hit location, arc, attacker state, target state, and a seeded RNG
- Emit `DamageApplied`, `LocationDestroyed`, `TransferDamage`, and `PilotHit` events from the resolution result
- Call `resolveCriticalHits()` from `criticalHitResolution.ts` whenever structure is exposed by a hit (and on TAC triggers from hit-location roll 2)
- Select critical slots randomly from occupied non-destroyed slots in the affected location
- Apply critical effects per component type: engine (+5 heat/hit, 3 hits destroys unit), gyro (+3 PSR/hit, 2 hits destroys), cockpit (pilot killed), sensors (+1/+2 to-hit), life support (2 hits per `fix-combat-rule-accuracy`), actuators with distinct types, weapons destroyed, heat sinks reduced, jump jets reduced, ammo explosion
- Cascade side-torso destruction to the arm on that side
- Apply head-damage cap (max 3 points from a single standard-weapon hit)
- Apply 20+-phase-damage trigger (queues a PSR in the PSR queue for later firing by `wire-piloting-skill-rolls`)
- Apply pilot damage from head-structure hits (1 point per penetrating hit)
- Inject the seeded RNG so replay produces identical damage outcomes

## Dependencies

- **Requires**: `fix-combat-rule-accuracy` (life-support 2-hit rule, consciousness off-by-one), `wire-real-weapon-data` (real damage values), `wire-firing-arc-resolution` (real arc → correct hit location table)
- **Blocks**: `wire-piloting-skill-rolls` (PSR triggers fire from damage events), `implement-physical-attack-phase` (physical attacks feed the same pipeline)

## Impact

- **Affected specs**: `damage-system` (connect resolveDamage to engine), `critical-hit-resolution` (invoke from attack path), `critical-hit-system` (slot selection and effect application integrated), `combat-resolution` (attack events produce damage events)
- **Affected code**: `src/engine/GameEngine.ts`, `src/utils/gameplay/gameSession.ts`, `src/utils/gameplay/gameSessionAttackResolution.ts`, `src/utils/gameplay/damage.ts`, `src/utils/gameplay/criticalHitResolution.ts`, `src/utils/gameplay/hitLocation.ts`, `src/simulation/runner/SimulationRunner.ts`
- **Event additions**: `DamageApplied`, `LocationDestroyed`, `TransferDamage`, `PilotHit`, `CriticalHit`, `ComponentDestroyed`, `AmmoExploded` (if not already present)
- **No new top-level specs created**.

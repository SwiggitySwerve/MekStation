# Change: Wire Piloting Skill Rolls

## Why

The `pilotingSkillRolls.ts` and `fallMechanics.ts` modules are fully implemented, the 26 PSR triggers are enumerated in the existing spec, and the fall-damage formulas are documented — but no trigger actually fires a PSR during gameplay. Damage hits don't queue PSRs, gyro crits don't queue PSRs, failed MASC rolls don't queue PSRs. The result: mechs never trip, never fall, never take fall damage. This change connects the trigger points (produced by earlier wiring work in `integrate-damage-pipeline`, `wire-heat-generation-and-effects`, and movement resolution) to the PSR queue, resolves queued PSRs in a dedicated resolution step, and invokes `fallMechanics.ts` on failure. See `openspec/changes/archive/2026-02-12-full-combat-parity/proposal.md` Phase 6 for the canonical PSR trigger list.

## What Changes

- Wire all 26 PSR triggers onto an in-state `psrQueue` on `IUnitGameState`: 20+ phase damage, leg damage (structure exposed), hip actuator crit, gyro crit, leg actuator crit, physical attack hit (kick / charge / DFA / push), physical attack miss (DFA miss, charge miss), terrain change (jump into water, skidding, fall), MASC failure, supercharger failure, attempting to stand, attempting to clear prone, heavy-enough damage to engine, etc. (full 26 per spec)
- Each trigger adds an `IPsrQueuedEntry { triggerId, baseModifier, sourceEvent }` to the queue at the moment it fires
- Resolve the queue during the end phase (or immediately, per trigger rule): for each entry, compute TN = pilotingSkill + sum(modifiers) and roll 2d6
- On failure, call `applyFall` from `fallMechanics.ts` with the fall direction, height, and weight
- Apply fall damage (`ceil(weight / 10) × (fallHeight + 1)`) in 5-point clusters using the fall-direction hit-location table
- Apply pilot damage (1 per fall) and queue a consciousness check
- Mark the unit prone; standing up in a subsequent turn costs walking MP and requires its own PSR
- Emit `PsrTriggered`, `PsrResolved`, `UnitFell`, `UnitStood`, `PilotHit` events
- Clear the queue at end of phase if any entry resolves to failure (remaining PSRs this phase are cancelled — the unit is already down)

## Dependencies

- **Requires**: `fix-combat-rule-accuracy` (consciousness off-by-one), `integrate-damage-pipeline` (damage events that trigger PSRs), `wire-heat-generation-and-effects` (shutdown-related triggers)
- **Blocks**: `implement-physical-attack-phase` (physical attacks fire PSR triggers on hit and miss)

## Impact

- **Affected specs**: `piloting-skill-rolls` (wire triggers into queue, resolve), `fall-mechanics` (invoke from PSR failures)
- **Affected code**: `src/utils/gameplay/pilotingSkillRolls.ts`, `src/utils/gameplay/pilotingSkillRolls/*.ts`, `src/utils/gameplay/fallMechanics.ts`, `src/utils/gameplay/gameSessionPSR.ts`, `src/engine/GameEngine.phases.ts`, `src/utils/gameplay/damage.ts` (queue triggers)
- **New events**: `PsrTriggered`, `PsrResolved`, `UnitFell`, `UnitStood`
- **No new modules required**.

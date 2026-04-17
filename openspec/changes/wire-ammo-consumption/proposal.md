# Change: Wire Ammo Consumption into Combat Resolution

## Why

Ammo bins exist on every mech construction but the combat engine never reads or mutates them. Autocannons never run dry, missile launchers never eject an empty bin, and the bot never factors ammo remaining into its target selection. This change wires bin initialization at session start, bin mutation on every firing, out-of-ammo invalidation, and `AmmoConsumed` event emission. It was split out of the earlier `wire-real-weapon-data` proposal because ammo consumption introduces mutable state, replay-fidelity invariants, and an `OutOfAmmo` invalidation path that deserve independent validation — bundling it with the damage/heat catalog read inflated the earlier change's blast radius and made replay testing ambiguous. This change lands immediately after `wire-real-weapon-data`, extends the same attack-resolution path, and does not introduce any new damage or heat calculations.

## What Changes

- Initialize per-unit ammo state from construction data at session start; each ton of ammo is a separate `IAmmoBin` with `remainingRounds = maxRounds` and an `isExplosive` flag
- On every weapon firing, locate the first non-empty bin matching the weapon's ammo type
- Decrement `remainingRounds` by 1 for single-shot weapons, by 1 salvo for cluster weapons (not per missile)
- Emit an `AmmoConsumed` event with `{binId, weaponId, remainingRounds}` for every firing that draws from a bin
- If no matching non-empty bin exists, emit `AttackInvalid { reason: 'OutOfAmmo' }` and do NOT resolve the attack (no damage, no heat charge, no further events)
- Energy weapons (lasers, PPCs, flamers) SHALL NOT touch any bin and SHALL NOT produce `AmmoConsumed`
- Add `ammoBinId` field to the attack-resolved event payload so UI + replay consumers can trace consumption to a specific bin
- Update `AttackAI.ts` to skip weapons whose ammo type has no non-empty matching bin
- Preserve replay fidelity — reprocessing the same event sequence SHALL produce identical bin states

## Dependencies

- **Requires**: `wire-real-weapon-data` (depends on the attack-resolved event payload shape and the catalog reads that this change does not re-do)
- **Blocks**: `wire-heat-generation-and-effects` is NOT blocked (heat generation reads per-weapon heat from the catalog, unrelated to bin state)
- **Related**: `integrate-damage-pipeline` may land in parallel with this change; neither modifies the other's surface

## Impact

- **Affected specs**: `ammo-tracking` (ADDED — bin initialization, consumption, invalidation, energy-weapon bypass), `weapon-resolution-system` (MODIFIED — attack-resolved payload gains `ammoBinId`)
- **Affected code**: `src/utils/gameplay/gameSessionAttackResolution.ts`, `src/utils/gameplay/ammoTracking.ts`, `src/simulation/ai/AttackAI.ts`, `src/utils/gameplay/gameSession.ts` (session-start bin initialization), test fixtures for the attack path
- **Test fallout**: New replay-fidelity tests required to verify bins reset correctly on replay. Existing tests that assumed infinite ammo may now fail legitimately — update fixtures to pre-populate bins
- **No new events besides those named here**. No new external dependencies.

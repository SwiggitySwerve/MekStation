# Change: Add ProtoMech Combat Behavior

## Why

ProtoMechs fight as 5-unit Clan Points but damage per-proto like tiny mechs: each has per-location armor / structure, takes locational damage, and applies physical attacks. However, their hit table is shorter (6 locations vs 11), they share a point-level squad interface for coordinated fire, and they have no pilot-damage / consciousness rule. The Phase 1 combat engine does not know about any of this. This change adds proto combat behavior, deliberately thinner than the other four unit-type combat changes (niche Clan-only asset).

## What Changes

- Add proto combat state: per-location armor/structure (Head, Torso, MainGun, LeftArm, RightArm, Legs), pilot wound track (proto-specific), destroyed flag
- Add proto hit location tables: Front / Side / Rear → 2d6 → location outcome (shorter 6-entry table)
- Add proto damage pipeline: armor → structure → location destroyed; no adjacent transfer (excess discarded if leg destroyed; MainGun destruction removes main gun weapon)
- Add proto critical hits: simpler table — 2-7 no crit, 8-9 equipment (random), 10-11 engine, 12 pilot killed
- Add proto physical attacks: kick (damage = tonnage / 2), punch (damage = tonnage / 5), main gun melee unavailable
- Add point interface: 5-proto point fires as coordinated squad (optional — individual combat remains the default)
- Add Glider rules: Glider flies like low-altitude unit, takes +1 TMM but takes fall damage on any structure hit
- Emit events: `ProtoLocationDestroyed`, `ProtoPointAttack`, `GliderFall`

## Non-goals

- Full point-as-single-unit combat (simplifies to 5 independent protos for Phase 6)
- ProtoMech infantry-style damage divisor (protos are full-scale targets)

## Dependencies

- **Requires**: `add-protomech-construction`, `add-protomech-battle-value`, `integrate-damage-pipeline`, `wire-heat-generation-and-effects`
- **Blocks**: full combined-arms play

## Ordering in Phase 6

ProtoMech combat is the last of 15 Phase 6 changes.

## Impact

- **Affected specs**: `combat-resolution` (MODIFIED — proto path), `damage-system` (MODIFIED — proto transfer rule), `critical-hit-system` (MODIFIED — proto crit table), `hit-location-tables` (ADDED — proto front/side/rear), `protomech-unit-system` (ADDED — combat state)
- **Affected code**: `src/utils/gameplay/protoMechDamage.ts` (new), `src/utils/gameplay/protoMechHitLocation.ts` (new), `src/utils/gameplay/protoMechCriticalHitResolution.ts` (new), `src/engine/GameEngine.ts` (dispatch)
- **New events**: `ProtoLocationDestroyed`, `ProtoPointAttack`, `GliderFall`, `ProtoPilotKilled`

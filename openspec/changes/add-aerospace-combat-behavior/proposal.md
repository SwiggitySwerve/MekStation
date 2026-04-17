# Change: Add Aerospace Combat Behavior (2D simplified)

## Why

Aerospace combat in BattleTech uses altitude levels, thrust-point economy, heading changes, and aero-specific movement paperwork that, taken together, is effectively a second combat engine. Shipping a full implementation in Phase 6 would dominate the schedule. This change adds a **2D-simplified** aerospace combat mode good enough for ground-map air support: flying units travel 2× their ground-equivalent MP per turn, fire like gun platforms using arc-based BV, take damage through the aerospace arc / SI / fuselage chain, and leave / re-enter the board as simple off-map events. Full altitude, vectoring, thrust economy, and atmospheric turning is explicitly out of scope and becomes a Phase 6-adjacent follow-up.

## What Changes

- Add aerospace hit-location tables (Nose / LeftWing / RightWing / Aft per attack direction)
- Add aerospace damage pipeline: armor-arc → SI → crit → pilot
- Add SI threshold damage (TW: `damage > 0.1 × SI` triggers control roll; excess depletes SI)
- Add aerospace critical-hit table: 2 = no crit, 3 = crew stunned, 4-5 = cargo/fuel, 6-7 = avionics, 8-9 = engine / SI, 10-11 = control surfaces, 12 = catastrophic
- Add 2D simplified movement: flying units move at `2 × safeThrust hexes` per turn in a straight line plus one ≤60° turn; no altitude tracking
- Add "off-map" state: a flying unit that reaches a board edge enters off-map for N turns then may re-enter
- Add `FlyOver` attack resolution: a flying unit strafes hexes along its 2D path, applying bomb / strafe damage
- Add aerospace firing arc computation: Nose 60° forward, Wings 120° each side, Aft 60° rear (mirrored against chassis facing)
- Add heat-per-turn tracking (aerospace heat-sink pool)
- Add basic fuel burn (1 point per thrust per turn); when fuel = 0, unit must leave board
- Add AI bot "aerospace" behavior: pick strafe target, prioritize survival / heat

## Non-goals

- Altitude levels, altitude-change thrust costs, vectoring arcs, heading markers, atmospheric turning
- Thrust-point economy and expenditure rules
- Capital-scale weapons, bay firing, PDS batteries
- DropShip / JumpShip / WarShip combat
- Aero-vs-aero dogfighting tables (flying-on-flying uses standard 2D rules)

## Dependencies

- **Requires**: `add-aerospace-construction`, `add-aerospace-battle-value`, `integrate-damage-pipeline` (A4 damage pipeline), `wire-heat-generation-and-effects` (A5 heat wiring — aero heat exempt from mech table but shares bus)
- **Blocks**: (nothing downstream in Phase 6; full aerospace rules is Phase 6-adjacent follow-up)

## Ordering in Phase 6

Aerospace combat lands **after** aerospace construction and BV. The 2D simplification keeps the scope bounded so it fits alongside the other four unit types in Phase 6.

## Impact

- **Affected specs**: `combat-resolution` (MODIFIED — aerospace path), `damage-system` (MODIFIED — aerospace transfer chain), `critical-hit-system` (MODIFIED — aerospace crit table), `hit-location-tables` (ADDED — aerospace arcs), `movement-system` (MODIFIED — flying mode), `aerospace-unit-system` (ADDED — combat state)
- **Affected code**: `src/utils/gameplay/aerospaceDamage.ts` (new), `src/utils/gameplay/aerospaceHitLocation.ts` (new), `src/utils/gameplay/aerospaceMovement.ts` (new), `src/utils/gameplay/aerospaceCriticalHitResolution.ts` (new), `src/engine/GameEngine.ts` (dispatch), `src/engine/InteractiveSession.ts` (fly-over phase)
- **New events**: `AerospaceEntered`, `AerospaceFlyOver`, `AerospaceExited`, `ControlRoll`, `FuelDepleted`

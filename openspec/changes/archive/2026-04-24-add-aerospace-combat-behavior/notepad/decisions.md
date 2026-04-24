# Decisions — add-aerospace-combat-behavior

## D1: Module layout for aerospace combat

New files live under `src/utils/gameplay/aerospace/` as a dedicated aerospace-combat namespace:

- `src/utils/gameplay/aerospace/hitLocation.ts` — arc tables + roll routing
- `src/utils/gameplay/aerospace/damage.ts` — armor-arc → SI damage chain (with control-roll trigger as a returned signal)
- `src/utils/gameplay/aerospace/controlRoll.ts` — control-roll resolution
- `src/utils/gameplay/aerospace/criticalHits.ts` — aerospace crit table
- `src/utils/gameplay/aerospace/movement.ts` — 2D simplified flight + off-map / re-entry
- `src/utils/gameplay/aerospace/firingArcs.ts` — Nose/Wings/Aft (and Sides for Small Craft) arc computation
- `src/utils/gameplay/aerospace/heat.ts` — aerospace heat table
- `src/utils/gameplay/aerospace/fuel.ts` — fuel burn + depletion
- `src/utils/gameplay/aerospace/flyOver.ts` — strafe / bomb declaration
- `src/utils/gameplay/aerospace/state.ts` — `IAerospaceCombatState` types
- `src/utils/gameplay/aerospace/events.ts` — aerospace event payload types
- `src/utils/gameplay/aerospace/index.ts` — barrel export

Rationale: mirrors existing per-domain folders (`movement/`, `damage/`, `toHit/`, `criticalHitResolution/`). Keeps aerospace combat isolated from mech pipeline so it can be dispatched cleanly.

## D2: Aerospace combat state lives on the unit's combat-state struct

`IAerospaceCombatState` will be attached via a `combatState.aero` field so any unit-state adapter can carry it around during a battle. Per the spec:

```
currentSI, armorByArc, heat, fuelRemaining, controlRollsFailed, thrustPenalty, offMap, offMapReturnTurn
```

## D3: Events use a discriminated union

Aerospace events (`AerospaceEntered`, `AerospaceExited`, `AerospaceFlyOver`, `ControlRoll`, `FuelDepleted`, `SIReduced`, `UnitDestroyed`) extend a `type`-tagged union and are emitted as return values from pure resolver functions. No global bus — resolvers return `{ state, events[] }`.

## D4: Dispatch via type guards, not polymorphism

At GameEngine / hit-location / damage entry points, we check `isAerospaceUnit(unit)` or unit.unitType and route to the aerospace module. This matches existing mech-only code that uses early-return + type guards instead of OO polymorphism.

## D5: AI adaptation via a separate bot-helper file

Aerospace bot behavior lives in `src/simulation/ai/aerospaceBotBehavior.ts` (or similar) — a thin scoring module. Not woven into BotPlayer class yet (Phase 7 Wave 3 is combat mechanics primarily; full bot integration can be a follow-up).

## D6: Deterministic RNG

All dice rolls use the existing `D6Roller` interface from `src/utils/gameplay/diceTypes.ts`. Tests inject deterministic rollers. Mirrors the mech pattern.

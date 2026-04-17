# Change: Add Bot Retreat Behavior

## Why

`IBotBehavior` already declares `retreatThreshold` and `retreatEdge` fields, but nothing consumes them — crippled bot units keep trading blows until destroyed, which feels unrealistic and drags out matches. Once a unit has lost more than half its internal structure or suffered a through-armor critical to the cockpit, gyro, or engine, a real MechWarrior would try to disengage. This change wires the existing retreat fields into the AI decision layer so crippled bots head for a map edge, maintain forward facing toward escape, and avoid frying themselves en route.

## What Changes

- Retreat trigger: bot unit enters retreat mode when cumulative internal-structure damage across all locations exceeds `IBotBehavior.retreatThreshold` (default 0.5 — half of starting structure destroyed), OR when the unit suffers a through-armor critical to cockpit, gyro, or engine
- Retreat direction: bot moves toward the map edge specified by `IBotBehavior.retreatEdge` (`north`, `south`, `east`, `west`); if `nearest`, the closest edge by Chebyshev distance is chosen at retreat-start and locked for the rest of the match; if `none`, retreat is disabled even at extreme damage
- Movement style: retreating units SHALL move at Run MP toward the target edge; SHALL NOT use Jump (jump heat risks shutdown during escape); SHALL commit the facing that maximizes forward progress toward the edge, not one that faces the nearest enemy
- Attack behavior: retreating units MAY fire weapons whose mount arc aligns with their forward-retreat facing, but SHALL reduce their `safeHeatThreshold` by 2 points (or to the unit's current dissipation, whichever is lower) to prevent shutdown during escape
- Retreat-complete: when a retreating unit reaches a hex on the target edge, emit a `UnitRetreated` event and remove the unit from the active-unit list
- Retreat is sticky: once triggered, a unit SHALL stay in retreat mode for the rest of the match — it does not return to normal combat even if healing occurs (healing mid-match is out of scope for Phase 1 anyway)

## Dependencies

- **Requires**: `improve-bot-basic-combat-competence` (C1) — reuses threat scoring, firing-arc filter, heat management, and SeededRandom discipline
- **Requires**: `integrate-damage-pipeline` (A4) — structural-damage tracking and through-armor crit events must flow through the game engine before the trigger can fire reliably
- **Required By**: none within Phase 1

## Impact

- Affected specs: `simulation-system` (new retreat-mode requirements)
- Affected code: `src/simulation/ai/BotPlayer.ts` (retreat-mode gating), `src/simulation/ai/MoveAI.ts` (edge-ward move scoring), `src/simulation/ai/AttackAI.ts` (retreat-aware heat threshold), `src/simulation/ai/types.ts` (retreat-state fields on `IAIUnitState`), `src/engine/InteractiveSession.ts` (emit `UnitRetreated`)
- New event type: `UnitRetreated` payload `{ unitId, retreatEdge, turn }` added to `GameEventType`
- No database changes; no UI changes beyond the existing event log consuming the new event
- Reproducibility preserved: retreat triggers SHALL be deterministic given game state, not random

## Non-Goals

- Player-driven retreat UI — human players already quit a unit by not moving it; retreat is a bot-only behavior
- Withdrawal bonuses or morale effects on the winning side — Phase 3 campaign territory
- Coordinated team retreat (all units retreat together) — this change handles per-unit retreat only
- Surrender or "concede" negotiation — Phase 4 multiplayer scope
- Re-entry after reaching map edge — a retreated unit is gone for the rest of the match

# Change: Add AI Coordination Tactics

## Why

The bot fights every unit as an island. `BotPlayer.playMovementPhase` and `playAttackPhase` (`src/simulation/ai/BotPlayer.ts`) take a single `unit` plus the flat `allUnits` list and decide in isolation — `scoreTarget` picks the most threatening enemy *from that one unit's view*, and `scoreMove`'s forward-arc bonus chases that one unit's `highestThreatTarget`. Nothing aggregates threat across a lance, nothing concentrates fire so two units finish a target in one turn instead of spreading damage across two, and nothing keeps a formation together so a lone bot mech does not wander into a kill-box ahead of its lancemates. A competent opponent focus-fires and moves as a unit; the current bot does neither.

This change adds the lance-level layer: multi-unit threat aggregation, focus-fire target coordination, and formation cohesion in movement. It registers its parameters into the AI Difficulty Tier Registry from A1 and is the first half of the `Elite` tier.

## What Changes

- ADDED multi-unit threat aggregation: `AIThreatMap` aggregates every enemy's threat against the *whole* friendly lance, producing a shared threat ranking instead of per-unit views
- ADDED focus-fire coordination: `AIFireCoordinator` assigns lance units to targets so combined firepower concentrates on a small number of targets — preferring a target the lance can finish this turn
- ADDED formation cohesion in movement: `scoreMove` gains a cohesion term that rewards staying within a configurable radius of the lance centroid and penalizes a unit advancing alone into enemy LOS
- ADDED a per-lance turn plan: `AILancePlanner` runs once per side per turn, computes the threat map and fire assignments, and feeds each unit's individual move/attack decision
- ADDED A3a's parameter block to the AI Difficulty Tier Registry — cohesion radius, cohesion weight, focus-fire weight, and a `lanceCoordination` flag; lower tiers leave these inert

## Dependencies

- **Requires**: `add-ai-terrain-aware-movement` (A1) — consumes the pathfinder API for cohesion-aware pathing and registers its parameter block into the Tier Registry
- **Required By**: `add-ai-objective-awareness` (A3b) — A3b's objective play is layered on the lance plan A3a produces

## Impact

- Affected specs: `simulation-system` (ADDED requirements only)
- Affected code: `src/simulation/ai/BotPlayer.ts` (consume the lance plan in `playMovementPhase`/`playAttackPhase`), `src/simulation/ai/MoveAI.ts` (cohesion term in `scoreMove`), `src/simulation/ai/types.ts` (coordination parameter block, lance-context types), new `src/simulation/ai/AIThreatMap.ts`, new `src/simulation/ai/AIFireCoordinator.ts`, new `src/simulation/ai/AILancePlanner.ts`, `src/simulation/ai/AITierRegistry.ts` (register the coordination block)
- No database migrations — coordination parameters live in the tier registry
- Reproducibility preserved: threat aggregation, fire assignment, and the lance plan are pure deterministic functions of the unit set; ties break via `SeededRandom`

## Non-Goals

- Objective-aware coordination (sending a unit to capture a hex) — that is A3b, layered on this change's lance plan
- Cross-lance / army-level strategy — A3a coordinates one lance; multi-lance command is out of scope for Wave 2
- Jump-jet repositioning tactics and ECM-aware spacing — A4
- Inter-unit communication latency or fog-of-war on the bot's own threat map — the bot plans with full knowledge of its own side

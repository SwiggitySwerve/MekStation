# Change: Add AI Advanced Systems

## Why

Three tactical systems the combat engine already models are invisible to the bot. **Jump jets**: `BotPlayer.selectMovementType` picks Jump on a flat 20% random roll and `MoveAI` has no jump-specific scoring — the bot never jumps to clear terrain, gain elevation, or escape a charge, and it cannot weigh jump heat against the multi-turn heat curve A2 introduced. **Electronic warfare**: `src/utils/gameplay/electronicWarfare/` is a complete module — ECM bubbles, ECCM countering, BAP probes, stealth-armor modifiers — and the bot consults none of it; it walks units into enemy ECM and never positions a friendly probe to counter it. **Spotting and vision**: `src/lib/multiplayer/server/fogOfWar.ts` implements per-side visibility, and the bot ignores it — it never moves to scout an unspotted enemy or break an enemy's line of sight to it.

This change wires those three existing systems into AI awareness. It registers its parameters into the AI Difficulty Tier Registry from A1 and completes the `Elite` tier. It builds none of the three systems — it consumes them.

## What Changes

- ADDED jump-jet tactics: `AIJumpTactics` scores a jump move for terrain-clearing, elevation gain, and charge/melee escape, weighed against jump heat through A2's `AIHeatPlanner`; `MoveAI` evaluates jump moves with this scorer instead of a flat random roll
- ADDED ECM awareness: `AIElectronicWarfareAdvisor` consumes `src/utils/gameplay/electronicWarfare/` to score positions — penalizing a destination inside a hostile ECM bubble, rewarding moving a friendly ECM/probe carrier to cover the lance or counter enemy ECM
- ADDED spotting and vision awareness: `AIVisionAdvisor` consumes `fogOfWar.ts` to value scouting an unspotted enemy and to value a destination that breaks an enemy's line of sight to the bot
- ADDED A4's parameter block to the AI Difficulty Tier Registry — jump-tactics weight, ECM-avoidance weight, ECM-coverage weight, and vision/spotting weight, plus an `advancedSystems` flag; lower tiers leave these inert

## Dependencies

- **Requires**: `add-ai-terrain-aware-movement` (A1) — consumes the pathfinder API and registers its parameter block into the Tier Registry
- **Requires**: `add-ai-resource-planning` (A2) — jump-jet tactics weigh jump heat against A2's multi-turn `AIHeatPlanner`
- **Required By**: none — A4 completes Wave 2

## Impact

- Affected specs: `simulation-system` (ADDED requirements only)
- Affected code: `src/simulation/ai/MoveAI.ts` (jump/ECM/vision terms in `scoreMove`), `src/simulation/ai/BotPlayer.ts` (jump-aware `selectMovementType`), `src/simulation/ai/types.ts` (advanced parameter block), new `src/simulation/ai/AIJumpTactics.ts`, new `src/simulation/ai/AIElectronicWarfareAdvisor.ts`, new `src/simulation/ai/AIVisionAdvisor.ts`, `src/simulation/ai/AITierRegistry.ts` (register the advanced block)
- Consumes existing modules: `src/utils/gameplay/electronicWarfare/` and `src/lib/multiplayer/server/fogOfWar.ts` — neither is modified
- No database migrations — advanced parameters live in the tier registry
- Reproducibility preserved: jump scoring, ECM advice, and vision advice are pure deterministic functions of unit and grid state; ties break via `SeededRandom`

## Non-Goals

- **Core-engine ECM to-hit modifiers — explicitly out of scope.** A4 is AI-*awareness* only: it makes the bot read and position around the electronic-warfare state the engine already tracks. If the core combat engine does not apply ECM modifiers to to-hit resolution, that is a flagged gap for a separate future change — A4 MUST NOT expand into core-engine combat work.
- Building or modifying the `electronicWarfare` module or `fogOfWar.ts` — A4 consumes them as-is
- Fog-of-war on the bot's *own* decision-making (the bot reasons with full knowledge of enemy positions) — A4 only *values* scouting; it does not hide enemies from the planner
- C3 networked targeting tactics — beyond Wave 2 scope

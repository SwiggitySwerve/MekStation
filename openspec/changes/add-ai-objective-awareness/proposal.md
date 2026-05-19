# Change: Add AI Objective Awareness

## Why

Wave 1's `add-scenario-objective-engine` made `Capture`, `Defend`, and `Breakthrough` scenarios winnable — but only by a human. The bot still plays every scenario as `Destroy`: `BotPlayer` and the `AILancePlanner` from A3a reason purely about enemy threat and never read the `objectives: Record<HexKey, IObjectiveMarker>` map on the game session. A bot defending an objective will happily chase an enemy off the hex it is supposed to hold; a bot attacking a capture objective will trade fire in the open instead of walking onto the marker; a bot in a breakthrough scenario never heads for the exit edge. The objective engine exists, the lance planner exists — nothing connects them.

This change makes the bot read scenario objective markers and *play the scenario*: hold what it must hold, take what it must take, and run the exit when that wins. It registers its parameters into the AI Difficulty Tier Registry from A1 and is the second half of the `Elite` tier.

## What Changes

- ADDED objective ingestion: `AIObjectivePlanner` reads the session's `objectives` map and the scenario objective type, classifying each marker as one the bot must take, hold, or deny
- ADDED objective-aware lance planning: the `ILanceTurnPlan` from A3a gains an objective layer — units are assigned objective roles (capture, hold, screen) alongside their fire assignments
- ADDED objective-seeking movement: `scoreMove` gains an objective term that rewards moving onto or toward a marker the bot must take, and rewards staying on a marker the bot must hold
- ADDED objective-aware target discipline: when holding or capturing, the bot's target selection is biased away from chasing enemies off the objective hex — it engages from the marker rather than abandoning it
- ADDED A3b's parameter block to the AI Difficulty Tier Registry — objective-seeking weight, objective-hold weight, and an `objectiveAwareness` flag; lower tiers leave these inert and the bot plays `Destroy` only

## Dependencies

- **Requires**: Wave 1 `add-scenario-objective-engine` — the `IObjectiveMarker` data model, the `objectives` session map, and the objective-type enum the bot reads
- **Requires**: `add-ai-coordination-tactics` (A3a) — the objective layer extends the `ILanceTurnPlan`; objective roles are assigned alongside fire assignments
- **Required By**: none within Wave 2

## Impact

- Affected specs: `simulation-system` (ADDED requirements only)
- Affected code: `src/simulation/ai/AILancePlanner.ts` (objective layer on the plan), `src/simulation/ai/MoveAI.ts` (objective term in `scoreMove`), `src/simulation/ai/BotPlayer.ts` (objective-aware target discipline), `src/simulation/ai/types.ts` (objective parameter block, objective-role types), new `src/simulation/ai/AIObjectivePlanner.ts`, `src/simulation/ai/AITierRegistry.ts` (register the objective block)
- No database migrations — objective parameters live in the tier registry; objective markers are read from the existing session map
- Reproducibility preserved: objective classification, role assignment, and scoring are pure deterministic functions of the objective map and unit set; ties break via `SeededRandom`

## Non-Goals

- Changing objective markers, placement, control detection, or victory evaluation — those are owned by `add-scenario-objective-engine`; A3b only *reads* the markers
- `Escort` and `Recon` objective types — the objective engine itself defers them; A3b plays only the types the engine evaluates (`Destroy`, `Capture`, `Defend`, `Breakthrough`)
- Objective-aware retreat (sacrificing an objective to save a unit) — retreat stays per-unit (`add-bot-retreat-behavior`)
- Multi-objective sequencing or feints — the bot plays the objective map as evaluated, with no deception layer

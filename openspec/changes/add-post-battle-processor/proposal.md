# Change: Add Post-Battle Processor

## Why

When a battle ends, the `ICombatOutcome` is just data — nothing acts on it.
Pilots don't gain XP, wounds don't get recorded, mechs heal nothing, contract
status doesn't update. The campaign system has every ingredient already
(day processors chain, `xpAwards.ts`, medical status helpers, contract
progression) but no handler that converts a combat outcome into the series
of campaign mutations those processors expect. This change builds that
handler and registers it as a day-processor entry point.

## What Changes

- Add `PostBattleProcessor` — given an `ICombatOutcome`, applies every
  campaign-visible consequence in a single atomic day-processor pass
- Pilot XP awards — consume `IPilotOutcome.kills` / `.tasksCompleted` /
  `.missionRole`, feed `xpAwards.ts` (`awardScenarioXP`, `awardKillXP`,
  `awardTaskXP`, `awardMissionXP`), persist via `applyXPAward`
- Pilot wound + status — increment medical `woundsTaken`, set personnel
  status to `WOUNDED` / `UNCONSCIOUS` / `KIA` / `MIA` / `CAPTURED` per
  `IPilotOutcome.finalStatus`, enqueue into medical queue
- Unit damage persistence — the construction-state mech record gains a
  sibling "current combat state" (`IUnitCombatState`): armor per location,
  structure per location, destroyed components, ammo remaining. The
  processor writes the `ICombatOutcome` deltas into that state so repair
  and ammo-resupply downstream can see real damage
- Contract mission completion — if `outcome.contractId` is set, update
  contract progress (increment scenarios-played, set mission status to
  `SUCCESS` / `FAILURE` / `PARTIAL` per scenario objective rules)
- Registered as day-processor step: `postBattleProcessor` fires when an
  `ICombatOutcome` is pending on the day being advanced, runs before
  `contractProcessor` and `healingProcessor` so their inputs are current
- Idempotent — same outcome applied twice has no additional effect

## Dependencies

- **Requires**: `add-combat-outcome-model` (consumes `ICombatOutcome`), Phase
  1 A1–A7 (needs correct damage/crit/wound math in the outcome or effects
  are wrong)
- **Requires**: existing `src/lib/campaign/progression/xpAwards.ts`,
  existing medical/personnel-status helpers, existing `contractProcessor`
- **Required By**: `add-salvage-rules-engine` (runs after this),
  `add-repair-queue-integration` (reads the persisted damage),
  `wire-encounter-to-campaign-round-trip`

## Impact

- Affected specs: `personnel-management` (MODIFIED — adds post-battle
  status application), `damage-system` (MODIFIED — adds `IUnitCombatState`
  persistence alongside construction state), `mission-contracts` (MODIFIED —
  mission completion applied from outcome), `game-session-management`
  (MODIFIED — session-to-campaign handoff step)
- Affected code: new `src/lib/campaign/processors/postBattleProcessor.ts`,
  new `src/types/campaign/UnitCombatState.ts`, extends
  `src/lib/campaign/dayPipeline.ts` registration, extends unit repository
  with `getCombatState` / `setCombatState`
- Non-goals: salvage math (that's `add-salvage-rules-engine`), repair
  ticket creation (that's `add-repair-queue-integration`), UI (that's
  `add-post-battle-review-ui`)

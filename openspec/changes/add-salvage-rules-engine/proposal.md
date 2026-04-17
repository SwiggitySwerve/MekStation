# Change: Add Salvage Rules Engine

## Why

Total Warfare and Campaign Operations define how a battle's wreckage is
divided between employer and mercenary — salvage rights clauses in
contracts, hostile-territory withdrawal modifiers, damaged-mech percentage
values. Without this engine, a successful battle produces no downstream
economic upside: no captured mechs, no parts for repair, no auction with
the employer. The Phase 1 engine already produces `ICombatOutcome` with
destroyed units and destroyed-component lists; this change turns that raw
casualty data into a divided salvage pool with per-side awards.

## What Changes

- Add `salvage-rules` capability — new spec under `openspec/specs/`
- Add `ISalvagePool` — aggregated from all enemy units with `finalStatus`
  of `DAMAGED`, `CRIPPLED`, `DESTROYED`, or `EJECTED`; contains recoverable
  units and recoverable parts (from destroyed-component lists)
- Add `ISalvageAward` per side (employer + mercenary) — list of units and
  parts awarded with estimated repair cost and market value
- Add `computeSalvage(outcome, contract, terrain): ISalvageAllocation` —
  applies Total Warfare salvage value tables (100% for intact, 75% for
  damaged, 50% for crippled, 25% for destroyed), contract salvage split
  (from `contract.salvageRights` — 0%-100%), and hostile-territory modifier
  (salvage halved if player withdraws from hostile territory)
- Add auction mechanic — when contract splits are not explicit (e.g., "50/50
  exchange"), engine enters bid-exchange: employer picks first unit, mercenary
  picks next, alternating until pool exhausted, weighted by BV
- Add `salvageProcessor` — day-processor step that consumes
  `ICombatOutcome.salvageAllocation` (populated by `PostBattleProcessor`)
  and creates inventory entries for awarded units/parts via existing
  `acquisitionProcessor` rails

## Dependencies

- **Requires**: `add-combat-outcome-model`, `add-post-battle-processor`
- **Requires (Phase 1 A1–A7)**: correct damage/crit resolution in outcome so
  unit final-status classification is trustworthy
- **Required By**: `add-repair-queue-integration` (awarded damaged units
  flow directly into repair queue), `add-post-battle-review-ui` (displays
  salvage awarded), `wire-encounter-to-campaign-round-trip` (end-to-end)

## Impact

- Affected specs: new `salvage-rules` (ADDED — this is a new capability),
  `mission-contracts` (MODIFIED — salvage rights clauses now drive
  allocation)
- Affected code: new `src/lib/campaign/salvage/salvageEngine.ts`, new
  `src/types/campaign/Salvage.ts`, new
  `src/lib/campaign/processors/salvageProcessor.ts`, extends
  `contractMarket.ts` with `salvageRights` field on contract records if
  not already present
- Non-goals: repair queue entry creation (that's
  `add-repair-queue-integration`), visual UI (that's
  `add-post-battle-review-ui`), selling salvage on markets (existing
  markets system handles that once inventory is populated)

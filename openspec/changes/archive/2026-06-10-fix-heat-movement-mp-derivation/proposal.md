# Proposal: Fix Heat Movement MP Derivation

## Why

Audit 2026-06-09 findings C-1 (critical→high) and C-2 (high) confirmed two MegaMek rules divergences in the movement heat pipeline, and the movement-system spec itself encodes the wrong formula (council Bucket-3 spec-locked finding):

- C-1: `getMaxMP` subtracted the heat penalty `floor(heat / 5)` directly from the pre-derived run/sprint MP. MegaMek applies the penalty to WALK MP only (`BipedMek.getWalkMP` `mp -= heat / 5`) and re-derives run MP from the heat-adjusted walk (`Entity.getRunMP` = `ceil(walk * 1.5)`; sprint via `Mek.getSprintMP` = `walk * 2` without boosters, boosters via `MPBoosters.calculate*MP(walk)`). Worked example: walk 5 / run 8 at heat 10 → penalty 2 → walk 3, run `ceil(3 * 1.5) = 5`, NOT `8 - 2 = 6`. Every hot unit's run envelope was wrong.
- C-2: jump MP was reduced by the heat penalty in `getHeatAdjustedMovementCapability` and in the environmental jump branch of movement validation. MegaMek `Mek.getJumpMP` has no heat term — jump MP is heat-immune.

## What Changes

- `getMaxMP` derives Run/Sprint/Evade MP from the heat-adjusted walk MP, preserving the capability's run/sprint formula family (standard, single booster, dual booster, run-equals-walk).
- `getHeatAdjustedMovementCapability` no longer reduces jump MP and re-derives run (and any pre-set sprint) MP from the adjusted walk.
- The environmental jump validation branch no longer subtracts the heat penalty from jump MP.
- Existing tests pinning the pre-fix subtraction values are corrected with C-1/C-2 citations; new tests lock the worked example and jump immunity.
- **BREAKING (spec)**: `movement-system` requirements "Heat MP Reduction" and "Heat Reduces Effective Movement" are corrected — heat reduces walk; run/sprint re-derive from the heat-adjusted walk; jump MP is never reduced by heat.

## Impact

- Affected specs: `movement-system` (2 MODIFIED requirements)
- Affected code: `src/utils/gameplay/movement/calculations.ts`, `src/utils/gameplay/movement/validation.ts`, `src/utils/gameplay/movement/reachable.ts` (doc), `src/simulation/runner/CombatRuleSupport.ts` (support catalog)
- Affected consumers (all route through the shared helpers, verified): reachability projection, movement validation, commit validation, interactive session actions, tactical dock commands, game-session UI badges, simulation runner movement phase

# Change: Add AI Resource Planning

## Why

The bot's resource management is single-turn and shallow. `AttackAI.applyHeatBudget` (`src/simulation/ai/AttackAI.ts`) trims the fire list against a fixed `safeHeatThreshold` for the *current* turn only — it has no notion of the heat curve building across turns, so the bot alpha-strikes into a shutdown it could have seen coming. Ammo eligibility is binary (`ammo[weaponId] <= 0` culls the weapon) with no projection of how many turns of fire remain, so the bot empties an autocannon early and then has a dead-weight ton of nothing. `scoreTarget` weights threat and kill-probability but never seeks a crippling critical — it cannot tell that a side-torso shot finishes a unit faster than chipping a fresh leg. And multi-mode weapons (LB-X cluster vs. slug, Ultra single vs. double) always fire in their default mode; the bot never picks the mode the situation rewards.

This change adds the depth that makes the `Veteran` difficulty tier worth selecting: multi-turn heat lookahead, ammo-runway projection, crit-seeking hit-location weighting, and weapon-mode selection. It registers its parameters into the AI Difficulty Tier Registry introduced by A1.

## What Changes

- ADDED a multi-turn heat projection: `AIHeatPlanner` projects the heat curve over a configurable lookahead window and reduces the effective fire budget before a predicted shutdown, not after
- ADDED ammo-runway projection: `AIAmmoRunway` estimates remaining turns of fire per ammo-dependent weapon and feeds a conservation weight into weapon selection so the bot rations scarce ammo
- ADDED crit-seeking target/location weighting: `scoreTarget` gains a crit-seeking term that raises the score of a target whose exposed structure (stripped armor, prior internal damage) makes a crippling hit reachable
- ADDED weapon-mode selection: for multi-mode weapons (LB-X cluster/slug, Ultra/Rotary rate-of-fire), `AIWeaponModeSelector` picks the mode that maximizes expected damage given range, target armor state, and the heat budget
- ADDED A2's parameter block to the AI Difficulty Tier Registry — heat-lookahead window, ammo-conservation weight, crit-seeking weight, and a `weaponModeSelection` flag; lower tiers leave these inert

## Dependencies

- **Requires**: `add-ai-terrain-aware-movement` (A1) — consumes the AI Difficulty Tier Registry and registers its own parameter block; reuses the pathfinder's per-turn cost so heat projection accounts for movement heat
- **Required By**: `add-ai-advanced-systems` (A4) — A4's jump-jet tactics consult the heat planner so a jump does not strand the unit in a shutdown

## Impact

- Affected specs: `simulation-system` (ADDED requirements only)
- Affected code: `src/simulation/ai/AttackAI.ts` (crit-seeking term in `scoreTarget`, mode-aware `selectWeapons`), `src/simulation/ai/types.ts` (resource parameter block, target structure-state fields on `IAIUnitState`/`IWeapon` mode metadata), `src/simulation/ai/behaviorVariants.ts` (no behavior change — tiers already mapped), new `src/simulation/ai/AIHeatPlanner.ts`, new `src/simulation/ai/AIAmmoRunway.ts`, new `src/simulation/ai/AIWeaponModeSelector.ts`, `src/simulation/ai/AITierRegistry.ts` (register the resource block)
- No database migrations — resource parameters live in the tier registry
- Reproducibility preserved: heat projection, ammo runway, and mode selection are pure deterministic functions of unit and weapon state; ties break via `SeededRandom`

## Non-Goals

- Lance-level ammo sharing or coordinated fire allocation — multi-unit resource coordination is A3a
- Objective-driven fire discipline (holding fire to preserve a unit for a capture) — A3b
- ECM/electronic-warfare effects on to-hit or weapon eligibility — A4 is AI-awareness only, and core-engine ECM modifiers are explicitly out of scope for all of Wave 2
- New weapon-mode game mechanics — A2 selects among modes the combat engine already resolves; it does not add modes

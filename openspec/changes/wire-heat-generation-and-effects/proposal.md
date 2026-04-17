# Change: Wire Heat Generation and Effects

## Why

Heat is the defining tension of BattleTech combat — fire too much, overheat, shut down, maybe explode — but in MekStation the heat system is disconnected from almost everything. Movement heat uses `Jump ? 1 : 0` instead of walk=1 / run=2 / jump=max(3, jumpMP). Weapon heat is approximated as `weapons.length * 10` instead of reading per-weapon `heat` fields (this is addressed in `wire-real-weapon-data`). Heat sinks are hardcoded to `baseHeatSinks = 10` instead of reading actual unit heat-sink count. Shutdown checks never fire. Ammo-explosion heat checks never fire. Heat-induced to-hit and movement penalties aren't applied. Water cooling bonus exists but isn't consumed by the heat phase. This change wires the heat phase to operate on real values, triggering the full downstream chain (movement reduction, to-hit penalty, shutdown roll, ammo-explosion roll, engine-hit extra heat, pilot heat damage). See `openspec/changes/archive/2026-02-12-full-combat-parity/proposal.md` Phase 5 for the canonical heat-effects specification.

## What Changes

- Apply movement heat per phase: walking = 1, running = 2, jumping = max(3, jumpMP); add to unit heat during the movement resolution
- Sum firing heat from real per-weapon heat (depends on `wire-real-weapon-data`)
- Apply engine-hit heat: +5 per engine-hit counter (depends on `integrate-damage-pipeline`)
- Compute dissipation from actual heat-sink count (engine-integrated + external, accounting for destroyed sinks)
- Apply water-cooling bonus: +2 dissipation when standing in water depth 1, +4 when depth ≥ 2
- Apply heat-induced to-hit penalty via the consolidated threshold table (from `fix-combat-rule-accuracy`)
- Apply heat-induced movement penalty: `floor(heat / 5)` MP reduction to walk and run
- Fire shutdown check at heat ≥ 14: roll 2d6 vs `4 + floor((heat - 14) / 4) * 2`
- Automatic shutdown at heat ≥ 30
- Fire ammo-explosion risk at heat ≥ 19 per bin: roll vs 4 (heat 19), 6 (heat 23), 8 (heat 28)
- Apply pilot heat damage: 1 point at heat 15-24, 2 points at heat 25+ (plus life-support state)
- Support startup rolls on subsequent turns for shut-down units
- Emit `HeatGenerated`, `HeatDissipated`, `HeatShutdown`, `HeatStartup`, `PilotHit` (heat-sourced), `AmmoExploded` (heat-sourced) events

## Dependencies

- **Requires**: `fix-combat-rule-accuracy` (canonical heat thresholds), `wire-real-weapon-data` (real per-weapon heat), `integrate-damage-pipeline` (engine-hit heat contribution)
- **Blocks**: `wire-piloting-skill-rolls` (shutdown from heat is a PSR trigger path)

## Impact

- **Affected specs**: `heat-management-system` (generation and dissipation wired), `heat-overflow-effects` (effects applied each heat phase), `heat-sink-system` (actual count consumed), `shutdown-startup-system` (shutdown/startup rolls fired), `movement-system` (movement heat + heat MP reduction)
- **Affected code**: `src/utils/gameplay/gameSessionHeat.ts`, `src/utils/gameplay/heat.ts`, `src/utils/gameplay/movement.ts`, `src/engine/GameEngine.phases.ts`, `src/constants/heat.ts` (single source of truth)
- **New events**: `HeatGenerated` (segmented by source: movement/firing/engine/environment), `HeatShutdown`, `HeatStartup`
- **No new modules required**; module files already exist.

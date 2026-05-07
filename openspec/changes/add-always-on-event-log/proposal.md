# Add Always-On Event Log

## Why

The combat-fidelity suite (archived 2026-05-06) shipped P1 catalog hydration that maps a real `IFullUnit` (Atlas AS7-D: 4×ML + AC/20 + LRM-20 + SRM-6) into runner-shaped `IUnitGameState` plus a per-unit weapon list keyed on runner-internal IDs (`player-1`...`player-N`, `opponent-1`...`opponent-N`). The `SimulationRunner` constructor accepts a 6th positional `hydration?: UnitHydrationMap` parameter (`src/simulation/runner/SimulationRunner.ts:96`) that, when supplied, swaps the synthetic single-medium-laser fallback for the real loadout.

The CLI swarm runner does not pass it.

`scripts/run-simulation.ts:559` reads:

```ts
const runner = new SimulationRunner(
  runSeed,
  undefined,
  undefined,
  aiFactory,
);
```

Five positional arguments. The 6th — `hydration` — is missing. Every swarm run, regardless of catalog selection, falls back to the synthetic loadout.

A 10-run smoke of `scripts/swarm-configs/duel-3kbv-temperate.json` made the consequence visible:

- 997 events emitted across all 10 games
- `attack_declared` events: every `payload.weapons` array length === 1 with the single ID `"player-1-weapon-1"` (the synthetic-laser fallback), NOT the catalog's 7 mounts
- `unit_destroyed` events emitted: **0** — the synthetic 5-damage laser cannot pierce 304-point Atlas armor in a 50-turn ceiling
- `critical_hit` events emitted: **0** — damage never reaches structure
- `location_destroyed` events emitted: **1** (the lone outlier)

Net per-turn alpha drops from ~85 (real Atlas: AC/20 + 4×ML + LRM-20 + SRM-6) to ~5 (one ML). Kill rate collapses to zero. The per-chassis aggregation matrix the harness produces is meaningless.

The second gap is observability: per-game event logs are only persisted under `src/simulation/__snapshots__/failed/` when an invariant violates. Every other encounter — including all 10 games above with their 997 cumulative events — leaves no on-disk replay trail. There is no way to ask "what happened in game 4?" after the fact, no NDJSON to grep for `unit_destroyed`, no cross-game distribution analysis without re-running the swarm.

This change closes both gaps with a single contract: catalog hydration is wired into the swarm CLI by default, and every encounter persists its full chronological event log to disk.

## What Changes

### Phase 1 — Catalog hydration plumb-through (~2h)

- Build `UnitHydrationMap` in `scripts/run-simulation.ts` from the loaded catalog plus the `participants` array. Keys are the runner-internal IDs (`player-1`, `opponent-1`...). Values come from `hydrateUnitFromFullUnit` (exported from `src/simulation/runner/UnitHydration.ts`, P1 of the combat-fidelity suite).
- Build the sync `WeaponLookup` once via `buildWeaponLookupFromCatalogFiles(WEAPON_CATALOG_FILES)` (`src/utils/construction/equipmentBVCatalogData.ts:41`).
- Pass the map as the 6th positional arg to `new SimulationRunner(runSeed, undefined, undefined, aiFactory, undefined, hydration)`.
- Synthetic-laser fallback at `createMinimalUnitState` stays in place for direct `SimulationRunner` callers (preset mode, unit-test fixtures). Swarm CLI MUST NOT default to it.

### Phase 2 — Always-on per-game event log (~2h)

- New module `src/simulation/runner/eventLogPersistence.ts` exporting `writeEventLog(gameId, events, outputDir): Promise<string>`. Format is NDJSON (one `IGameEvent` per line). Path is `<outputDir>/games/<run-timestamp>/<gameId>.jsonl`.
- Wire into `scripts/run-simulation.ts` after every `runner.run(simConfig)`. All games in a single CLI invocation share one `<run-timestamp>` directory.
- Report writer adds `eventLogDir` field pointing at `simulation-reports/games/<run-timestamp>/`.
- No opt-out flag. The contract is "always".

### Explicitly out of scope

- Streaming the event log during the run (writes happen post-`runner.run`, not mid-flight).
- Compressing or rotating event-log files (`.jsonl.gz` is a follow-up if disk pressure surfaces).
- Replay tooling that reads the new NDJSON files (the existing `__snapshots__/failed/` JSON snapshot path stays as the violation-triggered debugger surface; replay UI work is a separate change).
- Schema versioning beyond the existing `IGameEvent` shape — no new fields, no `schemaVersion: 3`. Reuses PR #514's `schemaVersion: 2` on `ISimulationRunResult`.
- Any change to `SimulationRunner`, `BotPlayer`, `weaponAttack.ts`, or other engine files outside the swarm CLI script and the new persistence module.

## Dependencies

- **Builds on**: archived `add-combat-fidelity-suite` (P1 hydration map + `SimulationRunner` constructor signature, P2 typed event log including `attack_declared`, `attack_resolved`, `damage_applied`, `unit_destroyed`, `critical_hit`, `location_destroyed`).
- **Reuses unchanged**: `src/simulation/runner/UnitHydration.ts` (`hydrateUnitFromFullUnit`, `UnitHydrationMap`, `UnitHydrationData`), `src/utils/construction/equipmentBVCatalogData.ts` (`WEAPON_CATALOG_FILES`, `buildWeaponLookupFromCatalogFiles`), `src/types/gameplay/GameSessionInterfaces.ts` (`IGameEvent`, `IGameEventBase.sequence`).
- **Touches**: `scripts/run-simulation.ts` (catalog hydration wiring + event-log persistence call + report-writer field), one new file under `src/simulation/runner/eventLogPersistence.ts`, two integration tests under `src/simulation/__tests__/`.

## Impact

- **Smoke verification post-fix**: re-running the same `duel-3kbv-temperate.json` 10-run swarm produces non-zero `unit_destroyed` events (Atlas alpha-strike vs Atlas armor in a 50-turn fight has a non-trivial kill probability) and a `simulation-reports/games/<timestamp>/<gameId>.jsonl` file per game with line counts matching `result.events.length`.
- **Per-chassis aggregation matrix becomes meaningful**: a `Marauder MAD-3R` vs `Atlas AS7-D` encounter now reflects the real weapon-mix damage curve, not the symmetric synthetic-laser noise floor.
- **Replay/audit baseline**: every encounter has an on-disk chronological event log keyed on `gameId`, sequence-ordered via the existing `IGameEvent.sequence` field. Future replay tooling, regression triage, and Monte Carlo distribution analysis can read these files instead of re-running the swarm.
- **No engine-layer change**: `SimulationRunner.run()`, `BotPlayer.decide()`, the combat resolver, and the event emitters are all untouched. The fix is purely a missing-argument bug in the CLI plus a new persistence callback.

# Design — Always-On Event Log

## Context

P1 of the archived `add-combat-fidelity-suite` (2026-05-06) introduced `UnitHydrationMap` keyed on runner-internal IDs (`player-1`, `opponent-2`, ...). The map flows into `SimulationRunner` via a 6th positional constructor argument. Direct callers (preset mode, unit fixtures) may omit it and accept the synthetic single-medium-laser fallback at `createMinimalUnitState`. The CLI swarm runner must NOT — its job is to expose real catalog combat behavior.

P2 of the same archive introduced a typed event log (`IGameEvent` discriminated union) with `attack_declared`, `attack_resolved`, `damage_applied`, `unit_destroyed`, `critical_hit`, `location_destroyed`, etc. Each event carries `gameId` + monotonically-increasing `sequence`. The runner returns `events: readonly IGameEvent[]` on `ISimulationRunResult`.

Today the CLI throws away the events on every successful run. Only invariant-violating runs land under `__snapshots__/failed/` via the existing `SnapshotManager`. There is no canonical replay surface for the 99% of runs that pass.

## Architecture Decisions

### D1 — Catalog hydration is a swarm-runner contract, not optional

The CLI builds a `UnitHydrationMap` per run and passes it as the 6th argument to `SimulationRunner`. Synthetic-laser fallback remains for direct `SimulationRunner` constructors used by unit-test fixtures and preset mode (`npx tsx scripts/run-simulation.ts --preset=lance`).

**Choice**: hydrate every swarm CLI run unconditionally.
**Rationale**: the synthetic-laser fallback is fiction. It silently turns the catalog into decoration. A swarm with hydration off has no business being run — it is the fast path to "passing tests but meaningless results". An always-on contract is the only way to make the harness the source-of-truth for combat distribution analysis.
**Alternatives considered**: a `--hydrate=true|false` flag (rejected — the false branch is never the right answer for a swarm); detecting hydration absence and warning (rejected — silent fallback is worse than crash; a missing arg today is a silent bug, not a feature). The fix is "always on".

### D2 — NDJSON one-event-per-line, one file per game, no opt-out

Every encounter produces `<outputDir>/games/<run-timestamp>/<gameId>.jsonl` after `runner.run` returns. NDJSON is the format. One file per `gameId`. No `--no-event-log` flag. All games of a single CLI invocation share the same `<run-timestamp>` directory.

**Choice**: NDJSON, per-game files, post-run write.
**Rationale**:
- NDJSON streams cleanly through `grep`, `jq -c`, and is append-friendly for any future mid-flight streaming work without format change.
- One file per `gameId` keeps each replay self-contained and lets disk pressure scale with retention policy, not with run length.
- Post-run write is enough for the contract — the events are already in memory at `result.events`. Streaming during the run is more complexity than this change needs.
- Sharing a `<run-timestamp>` directory across all games in one CLI invocation lets users `ls simulation-reports/games/<latest>/` and see the full sweep.
**Alternatives considered**:
- Single combined NDJSON for the whole sweep (rejected — `gameId` partitioning makes per-game replay easier; combined files force every consumer to filter).
- JSON-per-game in an array (rejected — partial writes are not safe to recover; NDJSON degrades gracefully).
- Streaming during run via runner callback (rejected — adds an integration point in `SimulationRunner`; out of scope for "missing argument + new file write").
- Compression (`.jsonl.gz`) (deferred — not justified until disk pressure surfaces).

### D3 — Sequence ordering relies on existing `IGameEvent.sequence`, no new invariants

`IGameEventBase.sequence` (`src/types/gameplay/GameSessionInterfaces.ts:326`) is already monotonic per `gameId`. Persistence writes events in `result.events` order, which matches `sequence` order. No re-sorting, no new ordering invariant, no `gameId`-uniqueness check (a `gameId` collision is a runner bug, not a persistence bug).

**Choice**: trust `result.events` ordering and `IGameEvent.sequence`.
**Rationale**: the runner's emit-order is already the canonical chronological order. Adding a sort or a uniqueness check shifts responsibility for an invariant the runner already owns; if it ever drifts, the assertion belongs in the runner test, not in the persistence module.

### D4 — `__snapshots__/failed/` snapshot path stays as-is

The existing `SnapshotManager` writes a complete-state JSON snapshot under `src/simulation/__snapshots__/failed/<gameId>_<ts>.json` ONLY when an invariant violates (`InvariantRunner` triggers). It is a debugging surface — full state, gitignored, violation-triggered. The new always-on event log is a different surface — events only, persisted under `simulation-reports/games/`, every-run.

**Choice**: keep both. Do not unify.
**Rationale**: the surfaces have different consumers (debugger vs replay/analytics), different retention pressures (rare vs every-run), different content shapes (full state JSON vs event NDJSON), and different lifecycles (gitignored debug artefact vs persisted analytics output). Unifying them creates conflict over the gitignore/retention/format axes.
**Alternatives considered**: rolling the snapshot writer into the always-on path (rejected — would force every successful run to write a full-state JSON, ~100x larger than the event NDJSON, with no consumer for the extra data).

### D5 — `schemaVersion` is the existing `2` from PR #514's `ISimulationRunResult`

The change does not introduce a new schema. Both the `SwarmConfig` JSON output and the per-game event-log NDJSON reuse the existing `schemaVersion: 2` already stamped on every `ISimulationRunResult`. The event-log file format is "one `IGameEvent` per line, encoded as JSON, no wrapper object" — implicitly versioned by the runtime contract on `IGameEvent`.

**Choice**: no version bump.
**Rationale**: nothing about the event shape changes. The change is "persist what the runner already returns". A version bump would imply a consumer-visible field change that does not exist.
**Alternatives considered**: stamp a `schemaVersion: 3` on the swarm output to signal the new `eventLogDir` field (rejected — the field is additive and optional from a consumer perspective; existing consumers that ignore unknown fields are unaffected; SemVer would call this a minor, not a major).

## File Changes

- **Modified**: `scripts/run-simulation.ts` — build `UnitHydrationMap` once per run + pass as 6th arg to `SimulationRunner`; build sync `WeaponLookup` once before the loop; call `writeEventLog` after each `runner.run`; add `eventLogDir` to the report writer's output.
- **New**: `src/simulation/runner/eventLogPersistence.ts` — exports `writeEventLog(gameId: string, events: readonly IGameEvent[], outputDir: string): Promise<string>`. Returns the absolute file path written. Creates parent directories. NDJSON encoded with `JSON.stringify(event)` per line, `\n` separator, no trailing newline.
- **New**: `src/simulation/__tests__/swarmRunnerHydration.integration.test.ts` — runs a 1-turn swarm with Atlas AS7-D selected on side A; asserts an `attack_declared` event whose `payload.weapons` array length equals 7.
- **New**: `src/simulation/__tests__/eventLogPersistence.integration.test.ts` — runs a 1-game swarm; asserts the NDJSON file exists, line count equals `result.events.length`, every line parses as `IGameEvent`, sequence numbers monotonic.

## Data Flow

```
scripts/run-simulation.ts
  loadCatalog -> rawCatalog
  prewarmCatalogBV -> catalog
  buildWeaponLookupFromCatalogFiles(WEAPON_CATALOG_FILES) -> weaponLookup   // once before loop
  for i in 0..runs:
    generateRandomForce(forceA), generateRandomForce(forceB)
    generateRandomPilots(pilotsA, pilotsB)
    build participants[]
    // NEW: build hydration map keyed on runner-internal IDs
    hydration: UnitHydrationMap = new Map()
    for each participant in participants:
      catalogEntry = catalog.find(e => e.id === participant.unitId)
      fullUnit = await canonicalUnitService.getById(participant.unitId)
      runnerInternalId = `${participant.sideId === 'player' ? 'player' : 'opponent'}-${idxInSide+1}`
      data = hydrateUnitFromFullUnit(fullUnit, runnerInternalId, weaponLookup)
      hydration.set(runnerInternalId, data)
    runner = new SimulationRunner(runSeed, undefined, undefined, aiFactory, undefined, hydration)  // 6 args
    rawResult = runner.run(simConfig)
    // NEW: persist event log
    eventLogPath = await writeEventLog(rawResult.gameId, rawResult.events, eventLogRunDir)
    allResults.push(stamped)
  writeReport(output, eventLogDir: eventLogRunDir)
```

## Validation

- Phase 1 — `swarmRunnerHydration.integration.test.ts` proves hydration reaches the runner: an Atlas-on-side-A run emits an `attack_declared` event with `payload.weapons.length === 7` (4×ML + AC/20 + LRM-20 + SRM-6).
- Phase 2 — `eventLogPersistence.integration.test.ts` proves persistence: file exists, line count matches `result.events.length`, each line round-trips through `JSON.parse` to a valid `IGameEvent`, sequence numbers strictly increase.
- Phase 2 smoke — `tsx scripts/run-simulation.ts --config scripts/swarm-configs/duel-3kbv-temperate.json --runs 5 --seed 42` produces at least one `unit_destroyed` event in any one of the 5 NDJSON files. Pre-fix this baseline was 0/10. With hydration on and the catalog's full alpha strike, at least one kill in 5 runs is the floor.

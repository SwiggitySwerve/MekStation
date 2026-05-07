# Tasks — Add Always-On Event Log

## Phase 1 — Catalog Hydration Plumb-Through (~2h)

- [x] 1.1 Build `UnitHydrationMap` per run in `scripts/run-simulation.ts`
  - In the `runSwarm` function, after the `participants` array is built (currently around line 520), construct a `Map<string, UnitHydrationData>` keyed on the runner-internal IDs (`player-1`...`player-N` for side A, `opponent-1`...`opponent-N` for side B) per the convention `SimulationRunner` uses.
  - Resolve each participant's `IFullUnit` via `getNodeCanonicalUnitService().getById(participant.unitId)` (the service is already constructed once near line 380; reuse, do not re-instantiate).
  - Call `hydrateUnitFromFullUnit(fullUnit, runnerInternalId, weaponLookup)` from `src/simulation/runner/UnitHydration.ts` for each entry.
  - Acceptance: `hydration.size === participants.length`, every key matches the `^(player|opponent)-\d+$` regex, the side prefix lines up with the participant's `sideId`.
  - QA: log `console.log({ hydratedKeys: Array.from(hydration.keys()) })` once during a debug run; manually verify against the participants list.

- [x] 1.2 Build sync `WeaponLookup` once per CLI invocation, hoisted out of the loop
  - Import `buildWeaponLookupFromCatalogFiles` and `WEAPON_CATALOG_FILES` from `src/utils/construction/equipmentBVCatalogData.ts`.
  - Call `buildWeaponLookupFromCatalogFiles(WEAPON_CATALOG_FILES)` once before the `for (let i = 0; i < config.runs; i++)` loop in `runSwarm`. Reuse the resulting `WeaponLookup` for every per-participant `hydrateUnitFromFullUnit` call.
  - Acceptance: a single weapon-lookup build per CLI invocation regardless of `--runs N`. No allocation inside the loop.
  - QA: `console.log({ weaponLookup: typeof weaponLookup })` once at startup; confirm it logs once not N times.

- [x] 1.3 Wire the hydration map into `SimulationRunner` as the 6th constructor argument
  - At `scripts/run-simulation.ts:559`, replace `new SimulationRunner(runSeed, undefined, undefined, aiFactory)` with `new SimulationRunner(runSeed, undefined, undefined, aiFactory, undefined, hydration)`.
  - Acceptance: TypeScript compiler accepts the call (the optional `hydration?: UnitHydrationMap` parameter is at position 6 in `src/simulation/runner/SimulationRunner.ts:96`).
  - QA: `npm run typecheck` clean for the touched file.

- [x] 1.4 Integration test — `src/simulation/__tests__/swarmRunnerHydration.integration.test.ts`
  - Construct a 1-turn 1v1 swarm where side A is forced to use `atlas-as7-d` (not random — pin the catalog entry directly via a test-fixture force generator or by overriding `generateRandomForce`'s output through a mock if needed).
  - Run the swarm, capture `result.events`, find the first `attack_declared` whose actor is the player Atlas.
  - Assert `event.payload.weapons.length === 7` (4×ML + AC/20 + LRM-20 + SRM-6).
  - Acceptance: test passes; failure surfaces as "expected weapons.length 7, got 1" if the hydration plumb-through regresses.
  - QA: `npx jest src/simulation/__tests__/swarmRunnerHydration.integration.test.ts` exits 0.

## Phase 2 — Always-On Per-Game Event Log (~2h)

- [x] 2.1 Author `src/simulation/runner/eventLogPersistence.ts`
  - Export async function `writeEventLog(gameId: string, events: readonly IGameEvent[], outputDir: string): Promise<string>`.
  - Build the path as `path.join(outputDir, 'games', '<run-timestamp>', `${gameId}.jsonl`)` — but the run-timestamp is owned by the caller; the function takes `outputDir` as the already-timestamped directory and writes `<outputDir>/<gameId>.jsonl` directly. (See task 2.2 for caller-side timestamp construction.)
  - Use `fs/promises.mkdir(outputDir, { recursive: true })` to create parent directories.
  - Encode as NDJSON: `events.map(e => JSON.stringify(e)).join('\n')`. No trailing newline.
  - Use `fs/promises.writeFile` with utf-8 encoding.
  - Return the absolute path written.
  - Acceptance: pure function; no side effects beyond the `mkdir` + `writeFile`; safe to call concurrently across distinct `gameId`s.
  - QA: `npm run typecheck` clean.

- [x] 2.2 Wire `writeEventLog` into `scripts/run-simulation.ts` after `runner.run`
  - Compute the per-CLI-invocation event-log run directory once before the loop: `eventLogRunDir = path.join('simulation-reports', 'games', new Date().toISOString().replace(/[:.]/g, '-'))`. Reuse for all runs in the invocation.
  - After `runner.run(simConfig)` returns `rawResult`, call `await writeEventLog(rawResult.gameId, rawResult.events, eventLogRunDir)`. Capture the returned path; do not await in parallel — sequential writes keep order predictable for debugging.
  - Acceptance: every game in a single CLI invocation produces a `<gameId>.jsonl` file under the same `eventLogRunDir`.
  - QA: `tsx scripts/run-simulation.ts --config scripts/swarm-configs/duel-3kbv-temperate.json --runs 3 --seed 42` produces 3 `.jsonl` files in one timestamped directory.

- [x] 2.3 Update the swarm output report writer to surface `eventLogDir`
  - Add `eventLogDir: string` to `ISwarmOutputFile` (the local interface in `scripts/run-simulation.ts`); set the field to the same `eventLogRunDir` path used in 2.2.
  - Acceptance: the `swarm-output.json` written at the end of the run contains an `eventLogDir` key whose value points at a directory that exists and contains exactly `config.runs` `.jsonl` files.
  - QA: parse the output JSON; assert `fs.readdirSync(output.eventLogDir).filter(f => f.endsWith('.jsonl')).length === config.runs`.

- [x] 2.4 Integration test — `src/simulation/__tests__/eventLogPersistence.integration.test.ts`
  - Use a temp directory (`os.tmpdir()` + a unique suffix) as `outputDir`.
  - Build a small `IGameEvent[]` fixture (~5 events) covering at least 2 distinct `type` values and monotonically increasing `sequence`.
  - Call `writeEventLog('test-game-1', events, tmpDir)`; assert the returned path exists.
  - Read the file, split on `\n`, assert line count === events.length, every line parses as JSON, parsed objects equal the original events deep-equal.
  - Assert sequence numbers strictly increase across lines (`events[i+1].sequence > events[i].sequence`).
  - Acceptance: test passes; failure surfaces as a clear NDJSON / sequence assertion message.
  - QA: `npx jest src/simulation/__tests__/eventLogPersistence.integration.test.ts` exits 0.

- [x] 2.5 Smoke verification — re-run the original failing case
  - Run `tsx scripts/run-simulation.ts --config scripts/swarm-configs/duel-3kbv-temperate.json --runs 5 --seed 42`.
  - Confirm 5 `.jsonl` files under the timestamped `simulation-reports/games/<ts>/` directory.
  - For each file, parse the NDJSON; assert at least one file in the 5 contains a `unit_destroyed` event. (Pre-fix baseline: 0/10 files. Post-fix floor: ≥1/5.)
  - For each file, assert at least one `attack_declared` event has `payload.weapons.length > 1` (proves hydration is live, not the synthetic 1-laser fallback).
  - Acceptance: smoke passes both checks. If `unit_destroyed` count is 0/5, escalate — the seed is unlucky or the hydration is half-wired.
  - QA: capture output to a paste in the PR body for the lead's review.

## Final Verification Wave

- [x] F1 `npm run typecheck` clean across all touched files
- [x] F2 Both new integration tests pass under `npx jest src/simulation/__tests__/`
- [x] F3 Smoke verification (task 2.5) produces at least one `unit_destroyed` and proof-of-hydration weapon-array lengths
- [x] F4 `openspec validate add-always-on-event-log --strict` clean

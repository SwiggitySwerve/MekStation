## 1. Types and enum (PR 1)

- [x] 1.1 Add `ReplaySource` enum to `src/types/gameplay/GameSessionInterfaces.ts` (or sibling file `ReplaySource.ts`) with exactly the values `Swarm = 'swarm' | Quick = 'quick' | PvP = 'pvp' | Campaign = 'campaign'`
- [x] 1.2 Add optional `replaySource?: ReplaySource` field to `IGameEventBase` (or `IBaseEvent` — match the existing interface name in the file)
- [x] 1.3 Thread `replaySource` argument through `createGameEvent` in `src/simulation/runner/phases/utils.ts`; default to `undefined` if caller does not pass it
- [x] 1.4 Add `IReplayManifestEntry` discriminated union types in `src/replay-library/types.ts` covering `ISwarmReplayManifestEntry`, `IQuickReplayManifestEntry`, `IPvPReplayManifestEntry`, `ICampaignReplayManifestEntry` (extend a shared `IReplayManifestEntryBase`)
- [x] 1.5 Add unit tests asserting `Object.values(ReplaySource)` equals exactly four expected values
- [x] 1.6 Add unit tests asserting the discriminated union narrows correctly on `replaySource` (compile-time test via type assertion)
- [x] 1.7 Run `npm run typecheck` clean
- [x] 1.8 Run `npm test` for new files clean
- [ ] 1.9 PR opened, CI green, merged

## 2. Index reader and writer (PR 2)

- [x] 2.1 Add `src/replay-library/index-reader.ts` with `readReplayIndex(): Promise<readonly IReplayManifestEntry[]>` that loads `simulation-reports/replay-index.json`, skips entries with unrecognized `replaySource`, logs skipped entries via the engine logger at debug level, and falls back to backfill scan when missing
- [x] 2.2 Add `src/replay-library/index-writer.ts` with `appendManifestEntry(entry: IReplayManifestEntry): Promise<void>` that atomically appends to `replay-index.json` (write to temp file, rename into place); creates the file if absent
- [x] 2.3 Unit tests: append preserves existing entries (1 → 2; 100 → 101)
- [x] 2.4 Unit tests: atomic write — simulate crash mid-write and verify original file is intact
- [x] 2.5 Unit tests: writer creates index when absent
- [x] 2.6 Unit tests: reader returns typed entries with correct discriminant narrowing
- [x] 2.7 Unit tests: reader skips unrecognized variants and logs at debug
- [x] 2.8 Run `npm run typecheck` clean
- [x] 2.9 Run `npm test` for new files clean
- [ ] 2.10 PR opened, CI green, merged

## 3. Backfill scan (PR 3)

- [x] 3.1 Add `src/replay-library/backfill-scan.ts` with `scanReplayDirectory(): Promise<readonly IReplayManifestEntry[]>` covering both partition layout (`simulation-reports/<source>/*.jsonl`) and legacy flat layout (`simulation-reports/games/<ts>/*.jsonl`)
- [x] 3.2 Stream-read each file's first event (`GameCreated`) and last event; compute `bvTotal` from `payload.units`, `winner`/`turns` from `GameEnded` (with `turn_started`-count fallback for missing `turns`)
- [x] 3.3 Infer `replaySource = ReplaySource.Swarm` for legacy flat-layout files; set `batchTimestamp` from the parent directory name
- [x] 3.4 Unit tests: scan covers new partition layout (one swarm fixture + one quick fixture)
- [x] 3.5 Unit tests: scan covers legacy flat layout (`games/<ts>/<id>.jsonl` fixture)
- [x] 3.6 Unit tests: `GameEnded.turns` optionality fallback (count `turn_started`, then `0`)
- [x] 3.7 Unit tests: scan is idempotent — two runs produce deep-equal arrays
- [x] 3.8 Run `npm run typecheck` clean
- [x] 3.9 Run `npm test` for new files clean
- [ ] 3.10 PR opened, CI green, merged

## 4. Swarm runner partition + manifest emit (PR 4)

- [x] 4.1 Update `src/simulation/runner/eventLogPersistence.ts` to write to `simulation-reports/swarm/<gameId>.jsonl` (added `writeSwarmEventLog` partition writer; legacy `writeEventLog` retained for back-compat)
- [x] 4.2 Update swarm output JSON `eventLogDir` to point at `simulation-reports/swarm/`
- [x] 4.3 After each successful swarm run, build an `ISwarmReplayManifestEntry` and call `appendManifestEntry`; preserve `batchTimestamp` as a metadata field on the entry
- [x] 4.4 Stamp `replaySource: ReplaySource.Swarm` on every event emitted by `SimulationRunner.run()` via post-stamp at the runner boundary (avoids threading through 30+ `createGameEvent` callsites)
- [x] 4.5 Unit tests: SimulationRunner post-stamp + `writeSwarmEventLog` integration coverage (eventLogPersistence.integration.test.ts updated)
- [x] 4.6 Unit tests: `buildSwarmManifestEntry` derivation (9 scenarios — winner / turns fallback ladder / discriminant / metadata threading)
- [x] 4.7 Unit tests: persisted events round-trip via JSON.parse and carry `replaySource: ReplaySource.Swarm` (covered by SimulationRunner.replaySource.test.ts + integration tests)
- [x] 4.8 Run `npm run typecheck` clean
- [x] 4.9 Run `npm test` clean (1239/1243 green, 4 skipped)
- [ ] 4.10 PR opened, CI green, merged

## 5. Quick game persistence (PR 5)

- [x] 5.1 Land the Node-side persistence pipeline at `src/components/quickgame/persistQuickGame.ts` (NOTE v1 scope: the React-component effect that fires on `endedAt` is deferred to a follow-on PR that adds the Next.js API route; browser code cannot write to the local filesystem directly. The pipeline is unit-tested and ready for the API route to import.)
- [x] 5.2 Pipeline writes events to `simulation-reports/quick/<gameId>.jsonl` via `node:fs/promises` (Node-only import path; browser bundle short-circuits via `shouldPersistToDisk()` three-gate check)
- [x] 5.3 After the file is written, build an `IQuickReplayManifestEntry` and call `appendManifestEntry`
- [x] 5.4 Stamp `replaySource: ReplaySource.Quick` on every event at the persistence boundary (mirrors SimulationRunner.run() post-stamp pattern from PR 4); preserves explicit values
- [x] 5.5 Unit tests: persistence pipeline writes the file and the manifest entry (5 persistQuickGame Node-env scenarios with tmpdir cwd injection)
- [x] 5.6 Unit tests: env gate (`shouldPersistToDisk`) short-circuits in test/browser when no explicit `cwd` is provided — proven by full-suite re-run leaving no `simulation-reports/` artifacts in the worktree
- [x] 5.7 Unit tests: persisted quick events carry `replaySource: ReplaySource.Quick` + an explicit non-Quick value is preserved (post-stamp respects existing field)
- [x] 5.8 Run `npm run typecheck` clean
- [x] 5.9 Run `npm test` clean (83/83 across quickgame + replay-library suites; `npm run build` clean — no `node:fs` traced into the browser bundle)
- [ ] 5.10 PR opened, CI green, merged
- [ ] 5.11 Follow-on (PR 5b or PR 6 scope): Next.js API route at `/api/replay-library/quick-save` that accepts `IPersistQuickGameInput` POST body and invokes `persistQuickGame()`. `QuickGameResults.tsx` then `fetch`-es it on `endedAt` transition. Tracked separately because it requires Next API-route patterns + Zod request validation that fall outside the current PR's scope.

## 6. Replay Library page (PR 6)

- [x] 6.1 Add a new page route `src/pages/replay-library.tsx` (chose flat-file route over `replay-library/index.tsx` to match `contacts.tsx` / `share.tsx` etc. — no nested routes planned)
- [x] 6.2 On mount, call `readReplayIndex()` and render the resulting entries as list rows with source-appropriate metadata visible (swarm: `configName`/`seed`/`batchTimestamp`; quick: `aiVariant`/`playerSide`; PvP: `opponentName`/`matchId`; campaign: `campaignId`/`missionId`/`difficulty`). Page reads via `GET /api/replay-library/index` API route — server-side reader keeps `node:fs` out of the browser bundle.
- [x] 6.3 Add a source filter (button strip) that limits the displayed list to the chosen `ReplaySource` (All | Swarm | Quick | PvP | Campaign).
- [x] 6.4 Click-to-open Watch button is a placeholder in phase A; orchestrator wires it to the replay viewer in phase B (loads events via `GET /api/replay-library/<source>/<gameId>`).
- [x] 6.5 Page renders standalone today; orchestrator adds the primary-navigation link in phase B.
- [ ] 6.6 Unit tests: page lists 5 entries when index has 3 swarm + 2 quick
- [ ] 6.7 Unit tests: source filter restricts list correctly
- [ ] 6.8 Unit tests: clicking a row mounts the replay viewer with events loaded (no file drag)
- [ ] 6.9 Storybook story for the Replay Library page (default state, filtered state, empty state)
- [ ] 6.10 Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run storybook:build` clean
- [ ] 6.11 PR opened, CI green, merged

## 7. End-to-end verification

- [ ] 7.1 Run a fresh swarm: `tsx scripts/run-simulation.ts --config scripts/swarm-configs/duel-3kbv-temperate.json --runs 3 --seed 42`; verify 3 files appear under `simulation-reports/swarm/` and 3 entries in `replay-index.json`
- [ ] 7.2 Run a quick game in the app and click through to results; verify `simulation-reports/quick/<gameId>.jsonl` is created and a manifest entry is appended
- [ ] 7.3 Open the Replay Library page; verify both the swarm and quick entries appear with correct metadata; filter by Quick and verify only the quick entry shows; click the entry and verify the replay viewer opens and plays through
- [ ] 7.4 Delete `replay-index.json` manually; reload the Replay Library page; verify the backfill scan reconstructs the index from on-disk files (including any pre-existing legacy `simulation-reports/games/<ts>/*.jsonl` files)
- [ ] 7.5 `openspec validate add-replay-library --strict` clean

## 8. Archive

- [ ] 8.1 All PRs (1–6) merged to main
- [ ] 8.2 Memory anchor written under `~/.claude/projects/E--Projects-MekStation/memory/project_replay_library.md` summarizing capability shipped, key files, deltas, lessons
- [ ] 8.3 `openspec archive add-replay-library` runs cleanly; deltas merge into source-of-truth specs

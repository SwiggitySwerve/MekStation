# gm-two-player-live-campaign-sandbox - Work Plan

## TL;DR (For humans)
**What you'll get:** A durable live campaign where one non-playing game master and two separate players can customize and own forces, play many scenarios, reconnect safely, receive immediate authorized updates, and correct or rewind history without losing the audit trail. A real three-browser simulation will prove persistence, privacy, responsiveness, and recovery at every boundary.

**Why this approach:** One server-owned journal commits facts before clients see them, while each viewer receives a separately authorized stream. Corrections create replacement branches instead of rewriting history, and the work lands as many small, independently verified pull requests with regression checks after major merges.

**What it will NOT do:** It will not replace the game engines, silently promote a player to game master, expose private game-master or opponent information, delete old history, or introduce a new broker/service without measured need. Existing audit defects remain separate tight fixes instead of being hidden inside the multiplayer program.

**Effort:** XL
**Risk:** High - durability, privacy, cross-domain rewind, native storage migration, and multi-client timing must all remain correct together.
**Decisions to sanity-check:** The game master is non-playing; network delivery may retry but effects apply once; combat-only rewind stops when the campaign accepts the outcome; healthy clients keep receiving events while scenario progression waits for every retained participant to converge.

Your next move: use the reviewed plan in an isolated task-owned worktree when implementation begins. Full execution detail follows below.

---

> TL;DR (machine): XL/high-risk, 32 independently gated implementation/refinement PRs plus two non-merge checkpoints and four final verifiers deliver durable GM+2 authority, role-safe projection, append-only correction/rewind, exact-once effects, 80 strict E2E scenarios, controlled latency gates, and exact-main post-merge regression.

## Scope
### Must have
- One non-playing authenticated GM authority connection plus exactly two independently authenticated tactical player seats.
- One durable server journal/outbox boundary for accepted commands, with atomic multi-event batches, private authority sequencing, stable receipts, and commit-before-publication.
- At-least-once network delivery with idempotent server effects and exactly-once client application through gapless per-viewer delivery sequences.
- Durable campaign/match membership, force ownership, readiness, acknowledgement cursors, cold reauthentication, active-route identity, and explicit GM-loss pause.
- Projection before serialization and one role-safe contract across live, replay, snapshot, cold recovery, timeline, and export; private GM audit data stays separate and fail-closed.
- Durable combat outcome outbox/campaign inbox receipts; combat-only rewind stops at accepted campaign receipt and post-receipt changes use coordinated retroactive correction.
- Append-only combat/campaign branches, trusted cache-only checkpoints, impact manifests, deterministic rebuild, stale-branch rejection, and atomic activation.
- Explicit, accessible pending/sealed/finalized/syncing/reconnecting/behind/rebuilding/rewound/blocked UX.
- A strict three-context Playwright sandbox implementing E2E-01 through E2E-80 with read-only SQLite evidence, raw transport/projection evidence, latency data, unique screenshots, and ownership-scoped cleanup.
- Controlled loopback budgets: p95 at most 250 ms, p99 at most 750 ms, and 1,000-event cold catch-up at most 2 s under the committed methodology.
- Small independently reversible PRs, focused verification before each merge, and applicable exact-main three-context regression after every major merge.
- Normative source of truth: `openspec/changes/harden-gm-two-player-campaign-sessions/`; implementation coverage: its `tasks.md`; this plan owns PR order, file ownership, commands, and evidence.

### Must NOT have (guardrails, anti-slop, scope boundaries)
- Do not use Open Brain, Jira, Outline, or AstraBit workflow infrastructure.
- Do not combine the program into one concurrency or mega-PR; every todo below is its own PR/checkpoint unless the plan explicitly marks `Commit: N`.
- Do not replace existing combat/campaign reducers, fork a second engine, introduce a broker/service, or add a runtime dependency without measured necessity and a new reviewed change.
- Do not conflate the GM with a tactical player, implicitly migrate GM authority, queue commands invisibly during rebuild, or let invite codes/browser state/client RNG become authority.
- Do not promise exactly-once transport; the contract is at-least-once delivery plus idempotent effects and exactly-once application.
- Do not expose raw authoritative payloads, authority sequences, private audit references, hidden metadata, or inferable gaps to players.
- Do not delete or rewrite journal history during correction, rewind, snapshot, compaction, migration, or rollback.
- Do not cross an accepted campaign receipt with combat-only rewind; use the coordinated correction flow.
- Do not instantiate `DurableMatchStore` for evidence reads; use a dedicated read-only SQLite connection with `fileMustExist`.
- Do not enable fault seams outside test mode/run/session scope or use sleeps/network dependency for deterministic failure tests.
- Preserve all pre-existing `.audit/`, audit-document, ambient-browser, server, worktree, and unrelated user changes.
- Keep determinism CI, SUPERHEAVY gyro, CAMP-03, and GAME-02 fixes as separate prerequisite/refinement PRs, never bundled into the OpenSpec authority change.

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: TDD for authority, migration, privacy, rewind, and failure seams; Jest + deterministic injected stores/duplexes first, then Playwright three-context integration and real UI.
- Baseline preflight: repository-supported Node version and native `better-sqlite3` ABI must pass durable-store suites; an in-memory substitute is not durability proof.
- Per-PR gate: changed-area tests, TypeScript/LSP diagnostics, and the exact requirement/scenario assertions named in the todo; no PR advances on self-report, screenshot-only proof, or tolerant walkthrough output.
- Major-merge definition and gate: every todo marked `Commit: Y` is a major merge. For Tasks 1-25, update to exact main and rerun that just-merged task's exact QA command, then archive its exact-main receipt before the next dependent PR. Beginning with Task 26, also set `$mergeSha = (git rev-parse --short=12 HEAD).Trim()`, run `npm.cmd run verify:qc:gm-two-player-campaign -- --group=smoke --run-id="post-merge-$mergeSha"`, and archive both receipts. Task 34's all-gates runner is the final cutover gate; it is not retroactively required for earlier merges.
- Program gate: all E2E-01..80, `typecheck`, `lint`, `format:check`, multiplayer/co-op/replay/GM/campaign validators, strict OpenSpec validation, migration/rollback proof, ten-scenario long run, and dual final verification.
- Privacy evidence: pre-serialization object, raw live/replay/recovery frames, snapshots, DOM/history, timeline/export, negative secret scans, and per-viewer projection digests.
- Persistence evidence: read-only SQLite rows for receipts, batches, outbox, participants, cursors, branches, supersession, outcome receipts, and audit linkage.
- Performance evidence: committed fixture, 20 warm-ups, at least 200 measured commands, monotonic correlated clocks, nearest-rank percentiles, and runner manifest. A connection becomes `behind` and must resync when its unsent queue first reaches either 256 envelopes or 1 MiB serialized. Catch-up chunks contain at most 128 events and at most 512 KiB serialized. Over the post-warm 200-command run, server RSS growth is at most 128 MiB and each controlled client's RSS growth is at most 64 MiB; record peak RSS for all four processes.
- Review-size evidence: every task-owned implementation PR is at most 500 non-generated changed lines and at most 15 changed files. A task-owned implementation PR exceeding either bound must be split before review; there is no waiver path.
- Evidence: `.omo/evidence/gm-two-player-live-campaign-sandbox/<run-id>/task-<N>-gm-two-player-live-campaign-sandbox/` (Playwright run artifacts additionally live under `test-results/gm-two-player/<run-id>/`).

## Execution strategy
Before Task 1, create `.omo/evidence/gm-two-player-live-campaign-sandbox/program-baseline-sha.txt` containing `(git rev-parse HEAD).Trim()` from freshly updated exact main; every task-owned branch and final scope diff uses that immutable baseline.
### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.
> Waves are staged scheduling buckets, not sets of tasks that may all launch concurrently. A task may run concurrently only with tasks listed in its `Can parallelize with` cell, and never with anything in its `Depends on` or `Blocks` cell.
- Wave 1 — isolated prerequisite refinements: todos 1-5. These are independent PRs and remain outside the OpenSpec authority implementation.
- Wave 2 — red contracts and harness scaffolding: todos 6, 10, 26, 27.
- Wave 3 — additive durable/client/test foundations: todos 7, 11, 28.
- Wave 4 — authority primitives: todos 8, 12, 14, 21.
- Wave 5 — server/campaign projection cutovers: todos 9, 13, 15, 17.
- Wave 6 — integration domains and UX: todos 16, 18, 19, 20, 23, 25.
- Wave 7 — branch activation, coordinated correction, and first strict suites: todos 22, 24, 29, 30.
- Wave 8 — remaining strict simulation and performance: todos 31, 32, 33.
- Wave 9 — final cutover, long-run proof, exact-main regression, and docs: todo 34.
- Only tasks explicitly shown as independent in the dependency matrix may run concurrently. Shared files (`Protocol.ts`, stores, campaign host/registry, package scripts, and E2E fixtures) have one owner per wave.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
- 1 | none | 34 | 2, 3, 4, 5 |
- 2 | none | 16, 32, 34 | 1, 3, 4, 5 |
- 3 | none | 16, 32, 34 | 1, 2, 4, 5 |
- 4 | none | 32, 34 | 1, 2, 3, 5 |
- 5 | none | 6, 7, 10, 27, 34 | 1-4 |
- 6 | 5 | 7, 28, 34 | 10, 26, 27 |
- 7 | 5, 6 | 8, 12, 14, 19, 21, 28, 34 | 11 |
- 8 | 7 | 9, 13, 17, 19, 34 | 12, 14, 21 |
- 9 | 8 | 13, 19, 20, 29, 34 | 15, 17 |
- 10 | 5 | 11, 12, 29, 34 | 6, 26, 27 |
- 11 | 10 | 13, 18, 29, 34 | 7, 28 |
- 12 | 7, 10 | 13, 15, 17, 29, 34 | 8, 14, 21 |
- 13 | 8, 9, 11, 12 | 29, 33, 34 | 15, 17 |
- 14 | 7 | 15, 19, 23, 32, 34 | 8, 12, 21 |
- 15 | 12, 14 | 16, 17, 25, 29, 30, 32, 34 | 9, 13 |
- 16 | 2, 3, 15 | 32, 34 | 18-20, 23, 25 |
- 17 | 8, 12, 15 | 18, 20, 25, 29, 30, 34 | 9, 13 |
- 18 | 11, 17 | 30, 34 | 16, 19, 20, 23, 25 |
- 19 | 7-9, 14 | 24, 29, 31, 32, 34 | 16, 18, 23, 25 |
- 20 | 9, 17 | 22, 31, 34 | 16, 18, 23, 25 |
- 21 | 7 | 22, 23, 32, 34 | 8, 12, 14 |
- 22 | 20, 21 | 24, 31, 32, 34 | 29, 30 |
- 23 | 14, 21 | 24, 25, 32, 34 | 16, 18-20 |
- 24 | 19, 22, 23 | 31, 32, 34 | 29, 30 |
- 25 | 15, 17, 23 | 30, 32, 33, 34 | 16, 18-20 |
- 26 | none | 27, 28, 29, 30, 31, 32, 33, 34 | 6, 10 |
- 27 | 5, 26 | 29, 30, 31, 32, 33, 34 | 6, 10 |
- 28 | 6, 7, 26 | 29, 30, 31, 32, 33, 34 | 11 |
- 29 | 9-13, 15, 17, 19, 26-28 | 34 | 22, 24, 30 |
- 30 | 15, 17, 18, 25-28 | 34 | 22, 24, 29 |
- 31 | 19, 20, 22, 24, 26-28 | 34 | 32, 33 |
- 32 | 2-4, 14-16, 19, 21-28 | 34 | 31, 33 |
- 33 | 13, 25-28 | 34 | 31, 32 |
- 34 | 1-33 | final verification | none |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->
- [x] 1. Make the determinism audit fail closed
  What to do / Must NOT do: replace the `rg | ... || true` false-green shape with an availability/error-aware scanner or checked prerequisite; add a regression test that simulates missing `rg`; do not change the allowlist or required check name.
  Parallelization: Wave 1 | Blocked by: none | Blocks: 34.
  References (executor has NO interview context - be exhaustive): `.github/workflows/pr-checks.yml:411-460`; `scripts/qc/validate-restore-ci-correctness-teeth.mjs`; `openspec/changes/harden-gm-two-player-campaign-sessions/proposal.md` Non-goals.
  Acceptance criteria (agent-executable): workflow test proves a missing scanner exits nonzero, an allowlisted source passes, and an injected forbidden `Math.random()` fails; `npm.cmd run qc:openspec-ci:validate` remains green.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath scripts/__tests__/restore-ci-correctness-teeth.test.ts` (created by this task), then `node scripts/qc/validate-restore-ci-correctness-teeth.mjs`; installed-scanner and allowlist fixtures pass, while missing-scanner and forbidden-call fixtures exit nonzero; Evidence `.omo/evidence/.../task-1-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `fix(ci): make determinism audit fail closed`

- [ ] 2. Preserve SUPERHEAVY gyro through unit round-trip
  What to do / Must NOT do: add a failing 101+ weight customized-unit serialize/load round-trip, repair only the enum/mapping seam that downgrades `GyroType.SUPERHEAVY`, and retain all other serialization output.
  Parallelization: Wave 1 | Blocked by: none | Blocks: 16, 32, 34.
  References (executor has NO interview context - be exhaustive): `src/utils/serialization/UnitSerializer.ts:45-75`; `src/services/units/unitLoaderService/componentMappers.ts:82-92`; `src/__tests__/unit/utils/serialization/UnitSerializer.test.ts:340-420`; OpenSpec `campaign-management` requirement `Customized Units Adopt Canonically`.
  Acceptance criteria (agent-executable): a canonical SUPERHEAVY fixture serializes and reloads with the same gyro, weight, tech base, engine, armor, equipment, and critical slots; existing serializer suite passes.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/__tests__/unit/utils/serialization/UnitSerializer.test.ts`; SUPERHEAVY round-trip passes and unknown-enum fallback remains unchanged; Evidence `.omo/evidence/.../task-2-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `fix(serialization): preserve superheavy gyro type`
  Partial verification: PR #1071 squash-merged as `fcebf449c6744b4158428c681e4b2160b4668904`; gyro/schema exact-main regression passed. Broader checkbox remains open because UnitLoader still drops equipment slot positions. Receipt: `.omo/evidence/gm-two-player-live-campaign-sandbox/task-2-gm-two-player-live-campaign-sandbox/gyro-receipt.md`.

- [ ] 3. Close CAMP-03 zero-BV mission materialization
  What to do / Must NOT do: reproduce the exact-main campaign-to-mission zero-BV failure, correct the smallest authoritative roster/force materialization seam, and prove both owned forces reach pre-battle; do not bypass normal force construction or hardcode BV.
  Parallelization: Wave 1 | Blocked by: none | Blocks: 16, 32, 34.
  References (executor has NO interview context - be exhaustive): `src/lib/campaign/encounter/materializeCampaignMissionEncounter.ts:287`; `src/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits.ts`; `src/pages-modules/gameplay/campaigns/missionLaunchPage.launch.ts:232`; `e2e/seam-roster-materialization-handoff.spec.ts:71-154`; OpenSpec `campaign-management` requirement `Scenario Materialization Uses Authoritative Owned Forces`.
  Acceptance criteria (agent-executable): materialized player force BV is greater than zero, unit IDs match the authoritative campaign force, and mission launch reaches pre-battle after reload.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/campaign/encounter/__tests__/materializeCampaignMissionEncounter.test.ts`, then `node scripts/playwright/run-playwright.mjs test --project=chromium e2e/seam-roster-materialization-handoff.spec.ts --workers=1`; valid roster passes, while missing/invalid unit references fail before navigation; Evidence `.omo/evidence/.../task-3-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `fix(campaign): preserve force units through mission materialization`

- [ ] 4. Persist Quick Game bootstrap before navigation
  What to do / Must NOT do: persist the constructed session's existing `GameCreated` and `GameStarted` events under `session.matchId ?? session.id` before spectator/interactive navigation; share the seam and await flush; do not misuse Replay Library or Quick Game session storage.
  Parallelization: Wave 1 | Blocked by: none | Blocks: 32, 34.
  References (executor has NO interview context - be exhaustive): `src/stores/useQuickGameStore.actions.ts:254-320`; `src/components/quickgame/QuickGameReview.tsx:206-225`; `src/engine/InteractiveSession.persistence.ts:57-74`; `src/engine/InteractiveSession.sessionEvents.ts:60-67`; `src/stores/__tests__/useGameplayStore.recover.test.ts:198-315`.
  Acceptance criteria (agent-executable): starting interactive and spectator Quick Game writes exactly `GameCreated`,`GameStarted`; resetting the gameplay store and loading the route recovers the session.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/stores/__tests__/useQuickGameStore.bootstrapPersistence.test.ts src/stores/__tests__/useGameplayStore.recover.test.ts` (the first file is created by this task); cold reload passes, while injected bootstrap-write rejection leaves the route unchanged and surfaces the typed error; Evidence `.omo/evidence/.../task-4-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `fix(quickgame): persist recoverable bootstrap events`

- [ ] 5. Clear the native SQLite durability preflight
  What to do / Must NOT do: select the repo-supported Node version and rebuild/reinstall `better-sqlite3` until durable suites execute; record ABI/environment; do not accept in-memory substitutes or modify product behavior.
  Parallelization: Wave 1 | Blocked by: none | Blocks: 6, 7, 10, 27, 34.
  References (executor has NO interview context - be exhaustive): `package.json`; `src/lib/multiplayer/server/DurableMatchStore.ts:147-159`; OpenSpec `tasks.md` 1.1; `design.md` D1 and D10.
  Acceptance criteria (agent-executable): `npm.cmd test -- --runInBand src/lib/multiplayer/server/__tests__/DurableMatchStore.test.ts src/lib/multiplayer/server/__tests__/hardenedTransport.test.ts` passes and manifest records Node/ABI/SQLite versions.
  QA scenarios (name the exact tool + invocation): `node -p "JSON.stringify({node:process.version,modules:process.versions.modules,napi:process.versions.napi})"`, then `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/server/__tests__/DurableMatchStore.test.ts src/lib/multiplayer/server/__tests__/hardenedTransport.test.ts`; supported ABI passes, while `node scripts/qc/check-better-sqlite3-abi.mjs --expect-modules=0` (created by this task) exits nonzero with the typed ABI blocker before Jest; Evidence `.omo/evidence/.../task-5-gm-two-player-live-campaign-sandbox/`.
  Commit: N | environment/evidence preflight only.

- [ ] 6. Capture red authority, crash, and migration baselines
  What to do / Must NOT do: in a disposable isolated worktree, add the future contract tests for atomic batches, receipt collisions, commit-before-publish, crash-before/after commit, idempotent backfill, ambiguous ownership, and rollback compatibility; record that each fails for its intended missing behavior, then discard only that temporary worktree. Do not commit or merge red tests and do not alter the canonical implementation worktree.
  Parallelization: Wave 2 | Blocked by: 5 | Blocks: 7, 28, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `event-store` requirements `Atomic Command Event Batches`, `Command Receipts Persist for the Authority Lifetime`; `campaign-persistence` requirement `Campaign Journal Migration Is Additive and Idempotent`; `src/lib/multiplayer/server/IMatchStore.ts`; `ServerMatchHostIntent.ts:145-193`; `CampaignHostRegistry.ts:170-233`.
  Acceptance criteria (agent-executable): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/server/__tests__/authority-contract.red.test.ts` fails only the named assertions for partial append, false publication, duplicate receipt, migration ambiguity, and rollback compatibility; the disposable worktree is removed after copying the test matrix and console output to evidence; `git diff --exit-code` is clean in the canonical worktree.
  QA scenarios (name the exact tool + invocation): from the disposable worktree run `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/server/__tests__/authority-contract.red.test.ts`; expected result is nonzero with every named missing-contract assertion and no setup/module error; Evidence `.omo/evidence/.../task-6-gm-two-player-live-campaign-sandbox/`.
  Commit: N | evidence-only red baseline; Tasks 7-9 and 19 recreate the applicable tests beside their implementations and merge only green slices.

- [ ] 7. Add authority schema and atomic store contracts
  What to do / Must NOT do: add additive tables/records for receipts, batches, outbox, sessions, participants, viewer cursors, branches, supersession, checkpoints, outcome receipts, and private audit references; extend durable/in-memory adapters; preserve current snapshots and reads.
  Parallelization: Wave 3 | Blocked by: 5, 6 | Blocks: 8, 12, 14, 19, 21, 28, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `tasks.md` 2.1-2.4; `event-store` delta; `campaign-persistence` migration delta; `src/lib/multiplayer/server/IMatchStore.ts`; `DurableMatchStore.ts`; `InMemoryMatchStore.ts`.
  Acceptance criteria (agent-executable): repeated migrations/backfill are idempotent, constraints reject duplicate authority identities, legacy snapshots remain readable, and durable/in-memory contract suites agree.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/server/__tests__/AuthoritySchemaMigration.test.ts src/lib/multiplayer/server/__tests__/DurableMatchStore.test.ts src/lib/multiplayer/server/__tests__/InMemoryMatchStore.test.ts` (the migration file is created by this task); repeated migration/legacy-read cases pass, while ambiguous ownership and uniqueness-collision fixtures fail closed; Evidence `.omo/evidence/.../task-7-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(authority-store): add additive journal schema`

- [ ] 8. Implement atomic command batch and durable outbox API
  What to do / Must NOT do: atomically write receipt, contiguous authority events, effective-head update, and recipient-neutral outbox; preserve receipt for session lifetime; do not serialize recipient payloads into outbox.
  Parallelization: Wave 4 | Blocked by: 7 | Blocks: 9, 13, 17, 19, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `event-store` requirements `Atomic Command Event Batches` and `Command Receipts Persist for the Authority Lifetime`; design D1; `IMatchStore.ts`; `DurableMatchStore.ts`; `InMemoryMatchStore.ts`.
  Acceptance criteria (agent-executable): middle-event/head/outbox faults roll back all rows; identical retry returns the prior receipt; changed-payload identity collision fails.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/server/__tests__/InMemoryMatchStore.test.ts src/lib/multiplayer/server/__tests__/DurableMatchStore.test.ts src/lib/multiplayer/server/__tests__/MatchStoreStress.test.ts`; the multi-event batch passes and middle-event, head, outbox, and changed-payload collision injections leave zero partial rows; Evidence `.omo/evidence/.../task-8-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(authority-store): commit command batches atomically`

- [ ] 9. Cut combat commands to a per-session serialized executor
  What to do / Must NOT do: route validation/reducer/batch commit through one executor per match, publish only committed outbox rows, and retain a shadow comparison/cutover flag; do not globally serialize unrelated sessions.
  Parallelization: Wave 5 | Blocked by: 8 | Blocks: 13, 19, 20, 29, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `multiplayer-server` requirements `Per-Session Command Execution Is Serialized` and `Commit Precedes Recipient Publication`; `ServerMatchHostIntent.ts:145-193`; `ServerMatchHostEvents.ts:96-147`; `ServerMatchHostCommandResults.ts`.
  Acceptance criteria (agent-executable): concurrent P1/P2 commands produce deterministic non-interleaved batches, unrelated sessions progress independently, and crash-after-commit resumes publication without execution.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/server/__tests__/ServerMatchHost.serializedExecutor.test.ts src/lib/multiplayer/server/__tests__/ServerMatchHost.test.ts src/lib/multiplayer/server/__tests__/MatchStoreStress.test.ts` (the serialized-executor file is created by this task); concurrent same-session commands serialize, different sessions overlap, and crash/send fixtures resume only committed outbox rows; Evidence `.omo/evidence/.../task-9-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(multiplayer): serialize commands per session`

- [ ] 10. Add stable intent identity and terminal receipts
  What to do / Must NOT do: put command/idempotency identity on production envelopes, create it before first send, persist pending identity, reuse across reconnect, and clear only matching terminal receipt.
  Parallelization: Wave 2 | Blocked by: 5 | Blocks: 11, 12, 29, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `multiplayer-sync` requirements `Stable Intent Identity Survives Retries`; `src/types/multiplayer/Protocol.ts:317-342`; `src/lib/multiplayer/client.ts:449-460`; existing `AcceptedIntentTracker.ts`.
  Acceptance criteria (agent-executable): production frames include stable identity; reconnect retry reuses it; identical retry returns one effect; changed-payload reuse yields integrity conflict.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/types/multiplayer/__tests__/Protocol.test.ts src/lib/multiplayer/__tests__/client.test.ts src/lib/multiplayer/server/__tests__/AcceptedIntentTracker.test.ts src/lib/multiplayer/server/__tests__/hardenedTransport.test.ts`; uncertain-send retry reuses one identity, while payload collision and mismatched terminal receipt reject; Evidence `.omo/evidence/.../task-10-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(multiplayer): stabilize intent identity across retries`

- [ ] 11. Add gapless viewer delivery and exact-once client application
  What to do / Must NOT do: separate private authority sequence from per-viewer delivery sequence; replace high-water-only logic with contiguous apply/ack, replay-live buffering, gap recovery, and collision blocking.
  Parallelization: Wave 3 | Blocked by: 10 | Blocks: 13, 18, 29, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `multiplayer-sync` requirements `Delivery Is At-Least-Once and Application Is Exactly-Once`, `Authority and Viewer Sequences Are Separate`, `Sequence Gaps and Collisions Fail Explicitly`; `client.ts:140-167,409-418`; `ServerMatchHostReplay.ts:107-145`.
  Acceptance criteria (agent-executable): duplicate/overlap applies once, hidden GM events create no player gap, missing delivery triggers controlled resync, and conflicting identity blocks.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/__tests__/client.test.ts src/lib/multiplayer/server/__tests__/replayStream.test.ts src/lib/multiplayer/server/__tests__/reconnectionFlow.test.ts`; replay/live overlap applies once, while gap and same-sequence/different-event collision enter typed recovery; Evidence `.omo/evidence/.../task-11-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(multiplayer): add viewer delivery cursors`

- [ ] 12. Persist membership before attachment and active-route recovery
  What to do / Must NOT do: resolve authenticated durable membership before replay/fan-out attachment; persist active campaign/match binding; recover via durable identity after invite expiry; remint scoped token after account/vault login; never put bearer token in URL.
  Parallelization: Wave 4 | Blocked by: 7, 10 | Blocks: 13, 15, 17, 29, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `multiplayer-server` requirements `Authenticated Membership Precedes Socket Attachment` and `Durable Active Bindings Survive Invite Expiry`; `bindMultiplayerSocketConnection.ts`; `bindCampaignSyncConnection.ts`; `ServerMatchSocketLifecycle.ts:111-133`; active lobby route and invites API.
  Acceptance criteria (agent-executable): known participant cold-recovers active route; expired invite rejects newcomer; unknown/revoked identity receives no baseline/frame/export and is never registered for fan-out.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/server/__tests__/auth.test.ts src/lib/multiplayer/server/__tests__/bindMultiplayerSocketConnection.test.ts src/lib/multiplayer/server/__tests__/bindCampaignSyncConnection.test.ts src/lib/multiplayer/server/__tests__/reconnectPersistence.integration.test.ts`; then `node scripts/playwright/run-playwright.mjs test --project=chromium e2e/multiplayer-live-vault-auth.spec.ts --workers=1`; remint/rejoin succeeds and unknown/revoked/mismatched identities receive zero frames; Evidence `.omo/evidence/.../task-12-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(multiplayer): persist active participant bindings`

- [ ] 13. Complete heartbeat and isolate slow-client backpressure
  What to do / Must NOT do: implement bidirectional liveness; add bounded per-connection queue; mark only saturated recipient behind; continue healthy delivery; keep next-scenario progression convergence-gated.
  Parallelization: Wave 5 | Blocked by: 8, 9, 11, 12 | Blocks: 29, 33, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `multiplayer-sync` `Heartbeat Is Bidirectional`; `multiplayer-server` `Per-Connection Backpressure Is Bounded`; `src/types/multiplayer/Protocol.ts:344-347`; `src/lib/multiplayer/client.ts:168-170`; `src/lib/multiplayer/server/ServerMatchSocketLifecycle.ts:111-133`; `src/lib/multiplayer/server/ServerMatchBroadcaster.ts`.
  Acceptance criteria (agent-executable): quiet healthy clients stay connected; dead peer reconnects; slow P2 queue stays bounded and does not delay GM/P1; progression waits for convergence or audited removal.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/server/__tests__/ServerMatchSocketLifecycle.test.ts src/lib/multiplayer/server/__tests__/reconnectionFlow.test.ts src/lib/multiplayer/server/__tests__/hardenedTransport.test.ts`; quiet-client heartbeat passes, dead-peer and delayed/send-failure fixtures reconnect or mark only that recipient behind with bounded queue depth; Evidence `.omo/evidence/.../task-13-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(multiplayer): bound delivery and fix heartbeat`

- [ ] 14. Move shared campaign authority to a durable journal
  What to do / Must NOT do: replace unconditional in-memory registry selection with environment-aware durable journal; add idempotent backfill/genesis branch; preserve snapshots; role-scope activity; reject same-field stale commands and revalidate disjoint commands.
  Parallelization: Wave 4 | Blocked by: 7 | Blocks: 15, 19, 23, 32, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `campaign-persistence` delta; `CampaignHostRegistry.ts:170-233`; `CampaignMatchHost.ts:416-451`; campaign persistence/migration tests; design D7 and migration plan.
  Acceptance criteria (agent-executable): campaign and activity recover after process restart, repeated backfill is idempotent, ambiguous ownership blocks, stale same-field command cannot overwrite, and unrelated campaigns remain available if one quarantines.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/server/__tests__/CampaignJournalMigration.test.ts src/lib/multiplayer/server/__tests__/CampaignHostRegistry.test.ts src/lib/multiplayer/server/__tests__/CampaignMatchHost.test.ts` (the migration file is created by this task); restart recovery passes, while ambiguous migration, stale same-field conflict, and corrupt-journal fixtures block only their campaign; Evidence `.omo/evidence/.../task-14-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(campaign): make server journal authoritative`

- [ ] 15. Add non-playing GM plus two durable player slots
  What to do / Must NOT do: persist one GM with no tactical seat and P1/P2 slots with owned forces, readiness revision, branch, cursor, revocation; validate all commands by membership; pause on GM loss without migration; support audited removal.
  Parallelization: Wave 5 | Blocked by: 12, 14 | Blocks: 16, 17, 25, 29, 30, 32, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `coop-campaign-sync` delta; `CampaignSyncSession.ts`; `CampaignMatchHost.ts`; `CampaignGmArbiter.ts`; existing host/guest tests.
  Acceptance criteria (agent-executable): restart preserves three roles and ownership, third player rejects, cross-force command rejects with zero append, readiness invalidates by revision, GM loss pauses and players never inherit authority.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/server/__tests__/CampaignSyncSession.test.ts src/lib/multiplayer/server/__tests__/CampaignGmArbiter.test.ts src/lib/multiplayer/server/__tests__/CampaignMatchHost.test.ts`; GM/P1/P2 join-ready-resume survives restart, while third-player, cross-owner, and GM-loss fixtures reject or pause with zero unauthorized append; Evidence `.omo/evidence/.../task-15-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(campaign): model gm and two player memberships`

- [ ] 16. Await campaign creation and preserve canonical custom units
  What to do / Must NOT do: await campaign/genesis/membership/force/unit commit before navigation; preserve canonical customized-unit fields; materialize both owned forces from active revision; reject stale artifacts.
  Parallelization: Wave 6 | Blocked by: 2, 3, 15 | Blocks: 32, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `campaign-management` delta; `src/pages/gameplay/campaigns/create.tsx`; campaign creation store/API; `materializeCampaignMissionEncounter.ts`; `campaign-customizer-handoff.spec.ts`.
  Acceptance criteria (agent-executable): cold restart after creation restores roles/forces; customized unit remains exact through adoption/materialization; partial write never exposes active campaign; stale force revision cannot launch.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/campaign/encounter/__tests__/materializeCampaignMissionEncounter.test.ts src/lib/multiplayer/server/__tests__/CampaignMatchHost.test.ts`, then `node scripts/playwright/run-playwright.mjs test --project=chromium e2e/campaign-customizer-handoff.spec.ts --workers=1`; canonical custom-unit cold recovery passes, while incomplete checkpoint and stale force revision prevent launch; Evidence `.omo/evidence/.../task-16-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(campaign): await authoritative creation checkpoint`

- [ ] 17. Project live facts per viewer before serialization
  What to do / Must NOT do: create one server viewer projector before serialization for match/campaign live frames; keep GM drafts/private reasons in separate server-only record; add sealed P1/P2 choices and immediate public-fact publication; fail closed.
  Parallelization: Wave 5 | Blocked by: 8, 12, 15 | Blocks: 18, 20, 25, 29, 30, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `gm-authority-redaction` requirements through `Ordinary Public Combat Facts Publish Immediately`; `ServerMatchHostEvents.ts:96-147`; `fogOfWar.ts`; `CampaignGmArbiter.ts`; design D4.
  Acceptance criteria (agent-executable): pre-`JSON.stringify` player objects contain no forbidden fields/authority gaps; sealed opponent choice absent; finalized/public result present; projection failure serializes nothing.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/server/__tests__/ViewerProjection.test.ts src/lib/multiplayer/server/__tests__/ServerMatchHost.fogOfWarIntegration.test.ts src/lib/multiplayer/server/__tests__/CampaignGmArbiter.test.ts` (the projector file is created by this task); GM/P1/P2 object and raw-frame projections pass, while projector or membership lookup failure emits no serialized frame; Evidence `.omo/evidence/.../task-17-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(redaction): project live events before serialization`

- [ ] 18. Enforce replay snapshot timeline and export parity
  What to do / Must NOT do: reuse the same projector for replay/resync/snapshot/cold recovery/timeline/export; add per-viewer digests; authorize private GM audit lookup separately; negative-scan raw and rendered artifacts.
  Parallelization: Wave 6 | Blocked by: 11, 17 | Blocks: 30, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `gm-authority-redaction` `Visibility Is Equivalent Across Surfaces` and privacy proof; `audit-timeline` `Private GM Audit Is Separate and Access-Controlled`; `ServerMatchHostReplay.ts`; replay library/audit export/timeline paths.
  Acceptance criteria (agent-executable): same viewer/event has equal authorized fields/digest on all surfaces; player cannot fetch private audit reference; forbidden-term and inferable-gap scans are empty.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/server/__tests__/ViewerProjectionParity.test.ts src/lib/multiplayer/server/__tests__/replayStream.test.ts src/engine/__tests__/InteractiveSession.recovery.test.ts` (the parity file is created by this task); live/replay/snapshot/timeline/export digests match for each viewer, while player-private-audit lookup and forbidden-term/gap scans reject; Evidence `.omo/evidence/.../task-18-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(redaction): unify replay and audit visibility`

- [ ] 19. Add durable combat outcome outbox and campaign receipt
  What to do / Must NOT do: write terminal outcome outbox in combat transaction; atomically ingest campaign consequences and unique outcome/version receipt; retry safely; make pre/post-receipt boundary queryable.
  Parallelization: Wave 6 | Blocked by: 7-9, 14 | Blocks: 24, 29, 31, 32, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `campaign-combat-loop` `Terminal Combat Outcome Uses Durable Outbox and Inbox`; `InteractiveSession.outcome.ts:61-75`; `ServerMatchHostOutcomePublisher.ts`; `bindCampaignSyncConnection.reconcile.test.ts`.
  Acceptance criteria (agent-executable): crash/retry/restart produces one campaign consequence batch/receipt; terminal acknowledgement follows durability; duplicate delivery is idempotent.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/server/__tests__/ServerMatchHostOutcomePublisher.test.ts src/lib/multiplayer/server/__tests__/bindCampaignSyncConnection.reconcile.test.ts`; finalize produces one durable outcome receipt, while crash-before-receipt and duplicate-delivery fixtures converge to one consequence batch; Evidence `.omo/evidence/.../task-19-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(campaign): reconcile combat outcomes exactly once`

- [ ] 20. Commit immutable GM combat corrections
  What to do / Must NOT do: keep preview non-mutating/private; finalize via server-authored command on current branch/revision; append actor/reason reference/replacement data; reject stale preview; do not patch current state directly.
  Parallelization: Wave 6 | Blocked by: 9, 17 | Blocks: 22, 31, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `gm-combat-interventions` `Combat Intervention Has Distinct Preview and Commit Phases`; `src/pages-modules/gameplay/games/gmTacticalInterventionSurface.ts`; intervention types/control surfaces; `design.md` D6 and D7.
  Acceptance criteria (agent-executable): preview mutates nothing; finalized correction survives restart and publishes player-safe result; branch/revision drift rejects with zero append.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/pages-modules/gameplay/games/__tests__/gmTacticalInterventionSurface.test.ts src/lib/multiplayer/server/__tests__/GmCombatCorrection.test.ts` (the server correction file is created by this task); preview and commit pass, while stale preview and unauthorized-player fixtures append nothing; Evidence `.omo/evidence/.../task-20-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(gm): commit combat corrections immutably`

- [ ] 21. Add cache-only checkpoints and replay kernel
  What to do / Must NOT do: add immutable checkpoint keyed by branch/head/reducer version/digest; full replay and checkpoint+tail equality; never compact authoritative facts; quarantine incompatibility/corruption per session.
  Parallelization: Wave 4 | Blocked by: 7 | Blocks: 22, 23, 32, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `event-store` `Checkpoints and Compaction Are Cache-Only` and `Corrupt Authority Data Is Quarantined Per Session`; `MatchRecovery.ts`; replay/recovery tests; design D5/D9.
  Acceptance criteria (agent-executable): compatible cache equals full replay for authority plus all viewer digests; reducer/digest mismatch rebuilds or blocks; healthy control session stays available.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/engine/__tests__/InteractiveSession.recovery.test.ts src/lib/multiplayer/server/__tests__/MatchRecovery.checkpoints.test.ts` (the checkpoint file is created by this task); full replay equals checkpoint+tail, while reducer/digest mismatch rebuilds and corrupt authority quarantines only the affected session; Evidence `.omo/evidence/.../task-21-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(event-store): add verified projection checkpoints`

- [ ] 22. Activate append-only combat rewind branches
  What to do / Must NOT do: GM-only rewind/player request, replacement building branch, `PROJECTION_REBUILDING`, stale-branch rejection, deterministic combat/RNG/fog/sealed projection rebuild, atomic activation; reject post-receipt combat-only rewind.
  Parallelization: Wave 7 | Blocked by: 20, 21 | Blocks: 24, 31, 32, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `gm-combat-interventions` rewind/rebuild requirements; `event-store` branch requirements; `campaign-combat-loop` receipt boundary; `InteractiveSession.lifecycle.ts:156-165`.
  Acceptance criteria (agent-executable): old history remains, player cannot commit rewind, commands during rebuild reject, valid rebuild activates once, stale/offline clients resync, fog restores, post-receipt path closes.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/engine/__tests__/InteractiveSession.rewind.test.ts src/engine/__tests__/InteractiveSession.recovery.test.ts src/lib/multiplayer/server/__tests__/ServerMatchHost.fogOfWarIntegration.test.ts src/lib/multiplayer/server/__tests__/reconnectionFlow.test.ts` (the rewind file is created by this task); pre-receipt rewind converges, while player commit, rebuilding/stale command, and post-receipt rewind reject; Evidence `.omo/evidence/.../task-22-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(gm): add auditable combat rewind branches`

- [ ] 23. Rebuild retroactive campaign branches from impact manifests
  What to do / Must NOT do: enumerate all derived families, preview blast radius without mutation, implement backward/retroactive changes as replacement replay, invalidate stale artifacts, reject commands during rebuild, activate after all projections verify.
  Parallelization: Wave 6 | Blocked by: 14, 21 | Blocks: 24, 25, 32, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `campaign-persistence` `Retroactive Campaign Changes Rebuild Declared Families` and `Campaign Rebuild Is Gated`; `dayPipeline.ts`; GM campaign intervention types/components; `gm-ledger.tsx`.
  Acceptance criteria (agent-executable): payroll/repair/medical/contract rewind deterministically rebuilds declared date/finance/roster/unit/pilot/market/receipt/artifact/activity/audit projections; stale artifact rejects; failure preserves prior head.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/campaign/__tests__/dayPipeline.test.ts src/lib/interventions/__tests__/GmTimeCascadeInterventionImplementer.test.ts src/lib/interventions/__tests__/GmCampaignInterventionBoundaries.test.ts`, then `npm.cmd run qc:gm:time-cascade:validate`; targeted rewind passes, while omitted projection-family and stale-artifact fixtures preserve the prior active head; Evidence `.omo/evidence/.../task-23-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(campaign): rebuild retroactive correction branches`

- [ ] 24. Coordinate post-receipt outcome correction and scenario gate
  What to do / Must NOT do: higher outcome version, explicit combat/campaign supersession, replacement receipt/consequence batch, invalidation, cross-journal audit, N+1 gate; do not reopen combat-only rewind after receipt.
  Parallelization: Wave 7 | Blocked by: 19, 22, 23 | Blocks: 31, 32, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `campaign-combat-loop` `Coordinated Outcome Correction Supersedes Across Journals` and `Next Scenario Requires Reconciled Active Outcome`; `audit-timeline` causality requirements.
  Acceptance criteria (agent-executable): one replacement version/receipt/batch survives retry/restart; old outcome remains superseded; next scenario waits for active receipt/artifacts/participant convergence.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/server/__tests__/CampaignOutcomeCorrection.test.ts src/lib/multiplayer/server/__tests__/bindCampaignSyncConnection.reconcile.test.ts` (the correction file is created by this task); coordinated correction survives restart, while duplicate, stale-version, and unacknowledged-progression fixtures remain blocked with one active receipt; Evidence `.omo/evidence/.../task-24-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(campaign): coordinate retroactive outcome correction`

- [ ] 25. Surface accessible lifecycle, conflict, and rewind UX
  What to do / Must NOT do: stable locators and persistent text for nine lifecycle states; command gating; typed safe recovery; live announcements; focus management; keyboard/narrow-viewport rewind confirmation; do not use color-only status.
  Parallelization: Wave 6 | Blocked by: 15, 17, 23 | Blocks: 30, 32, 33, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `e2e-testing` E2E-75..77; design D10; campaign co-op/GM controls; gameplay session/lobby status surfaces.
  Acceptance criteria (agent-executable): component tests and viewport sweep prove every state, gating, announcement, focus, confirm/cancel, and primary recovery action.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/components/campaign/coop/__tests__/LiveCampaignLifecycleStates.test.tsx src/components/campaign/gm/__tests__/GmCampaignInterventionControlPlane.test.tsx` (the lifecycle-state file is created by this task), then `npm.cmd run verify:qc:viewport-sweep`; all nine states pass keyboard/focus/live-region/narrow-viewport checks and blocked/stale/projection-error fixtures expose one safe recovery action; Evidence `.omo/evidence/.../task-25-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `feat(ux): clarify live campaign recovery states`

- [ ] 26. Build isolated GM/P1/P2 browser fixture
  What to do / Must NOT do: create separate non-playing GM and two player contexts/identities against one harness-owned server/database with deterministic seed; add `scripts/qc/run-gm-two-player-campaign.mjs` and register `verify:qc:gm-two-player-campaign` before any later task invokes a group; do not use `ffa-3`, shared storage, or ambient browser tabs.
  Parallelization: Wave 2 | Blocked by: none | Blocks: 27, 28, 29, 30, 31, 32, 33, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `e2e-testing` `Strict GM and Two-Player Durability Catalog`; `e2e/coop-campaign-two-browser-journey.spec.ts`; `design.md` D2, D3, and D11.
  Acceptance criteria (agent-executable): contexts have distinct auth/storage, GM owns no tactical seat, P1/P2 own distinct slots, fixture exposes deterministic server/session handles, and the new package script accepts only the registered groups `fixture-smoke,evidence-smoke,fault-smoke,smoke,authority,visibility,combat,campaign,failure,performance,all,traceability,quality,manual-setup,scope`; final-only groups initially return typed `NOT_IMPLEMENTED` until Task 34 wires their completed-program checks.
  QA scenarios (name the exact tool + invocation): `npm.cmd run verify:qc:gm-two-player-campaign -- --group=fixture-smoke --run-id=task-26-fixture-smoke`; three-context join passes, while cross-context storage contamination, third-player admission, or unknown group exits nonzero; Evidence `.omo/evidence/.../task-26-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `test(e2e): add gm and two-player fixture`

- [ ] 27. Add evidence bundle and truly read-only durable probe
  What to do / Must NOT do: capture role-labeled screenshots/traces, raw frames, projector objects, latency, environment, role hashes, cleanup; query SQLite with `readonly: true,fileMustExist: true`; never call production store constructor.
  Parallelization: Wave 2 | Blocked by: 5, 26 | Blocks: 29, 30, 31, 32, 33, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec E2E-78..79; `DurableMatchStore.ts:147-159`; design D9; `test-results/` patterns.
  Acceptance criteria (agent-executable): passing and failing smoke scenarios each emit complete manifest/evidence; read-only probe performs no PRAGMA/DDL/write; cleanup receipt lists only run-owned targets.
  QA scenarios (name the exact tool + invocation): `npm.cmd run verify:qc:gm-two-player-campaign -- --group=evidence-smoke --run-id=task-27-evidence-smoke`; passing and intentionally failing scenarios both emit the declared bundle, and the read-only SQLite probe reports identical database hash/schema before and after; Evidence `.omo/evidence/.../task-27-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `test(e2e): capture authority evidence safely`

- [ ] 28. Add production-rejected scoped fault seams
  What to do / Must NOT do: deterministic one-shot append/crash/send/projection/disconnect/corruption controls requiring test mode, run ID, session ID; production startup rejects any enabled control; no sleeps or network dependency.
  Parallelization: Wave 3 | Blocked by: 6, 7, 26 | Blocks: 29, 30, 31, 32, 33, 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `e2e-testing` `Strict Failure Security and Recovery Catalog`; design D9; controlled store/duplex test patterns.
  Acceptance criteria (agent-executable): each seam affects one scoped occurrence/session; wrong run/session cannot trigger; production config fails startup; no fault API is reachable in normal build.
  QA scenarios (name the exact tool + invocation): `npm.cmd test -- --watchAll=false --runInBand --runTestsByPath src/lib/multiplayer/server/__tests__/ScopedFaultControls.test.ts` (created by this task), then `npm.cmd run verify:qc:gm-two-player-campaign -- --group=fault-smoke --run-id=task-28-fault-smoke`; one scoped occurrence fires, while wrong run/session, repeated trigger, unscoped config, and production activation reject; Evidence `.omo/evidence/.../task-28-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `test(harness): add scoped live-session fault injection`

- [ ] 29. Implement strict durability/reconnect E2E-01 through E2E-18
  What to do / Must NOT do: real UI actions plus authority rows for creation, ownership, commit ordering, atomicity, crash windows, concurrency, idempotency, gaps, persistence failure, slow client, restart, reauth, active route, heartbeat.
  Parallelization: Wave 7 | Blocked by: 9-13, 15, 17, 19, 26-28 | Blocks: 34.
  References (executor has NO interview context - be exhaustive): OpenSpec `e2e-testing` E2E-01..18; `tasks.md` 21.1; related event-store/multiplayer requirements.
  Acceptance criteria (agent-executable): `npm.cmd run verify:qc:gm-two-player-campaign -- --group=authority` passes all 18 and each result links UI plus persisted/transcript evidence.
  QA scenarios (name the exact tool + invocation): `$runId = "task-29-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"; npm.cmd run verify:qc:gm-two-player-campaign -- --group=authority --run-id=$runId`; all 18 pass, including forced E2E-05/06/11/13/14 failure/recovery assertions; Evidence `test-results/gm-two-player/$runId/`.
  Commit: Y | `test(e2e): prove live campaign authority and recovery`

- [ ] 30. Implement strict visibility/finalization E2E-19 through E2E-30
  What to do / Must NOT do: inspect pre-serialization/raw/recovery/DOM/history/export for draft/sealed/fog/redaction/parity/unauthorized/veto/proposal behavior; no screenshot-only privacy claim.
  Parallelization: Wave 7 | Blocked by: 15, 17, 18, 25-28 | Blocks: 34.
  References (executor has NO interview context - be exhaustive): OpenSpec E2E-19..30; `gm-authority-redaction` delta; `audit-timeline` private-audit requirements.
  Acceptance criteria (agent-executable): the exact visibility command below passes all 12; negative searches find zero GM-private/opponent-hidden/authority-sequence/private-ID/inferable-gap data in player artifacts.
  QA scenarios (name the exact tool + invocation): `$runId = "task-30-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"; npm.cmd run verify:qc:gm-two-player-campaign -- --group=visibility --run-id=$runId`; finalized reveal passes and projector, unauthorized-access, and private-audit lookup failures emit no forbidden player data; Evidence `test-results/gm-two-player/$runId/`.
  Commit: Y | `test(e2e): prove role-safe campaign visibility`

- [ ] 31. Implement strict combat/outcome E2E-31 through E2E-45
  What to do / Must NOT do: owned commands, concurrent deterministic choices, server RNG, disconnect policy, pause, receipt, correction, pre-receipt rewind, stale branch, convergence, fog, offline catch-up, post-receipt coordinated correction.
  Parallelization: Wave 8 | Blocked by: 19, 20, 22, 24, 26-28 | Blocks: 34.
  References (executor has NO interview context - be exhaustive): OpenSpec E2E-31..45; `gm-combat-interventions`; `campaign-combat-loop`; `audit-timeline` causality.
  Acceptance criteria (agent-executable): the exact combat command below passes all 15 twice with identical authority/receipt/branch/projection digests.
  QA scenarios (name the exact tool + invocation): `$runId = "task-31-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"; npm.cmd run verify:qc:gm-two-player-campaign -- --group=combat --run-id=$runId --repeat=2`; full combat passes and cross-owner, stale, rebuild, and post-receipt rewind paths reject without unauthorized append; Evidence `test-results/gm-two-player/$runId/`.
  Commit: Y | `test(e2e): prove combat rewind and outcome authority`

- [ ] 32. Implement strict campaign/failure E2E-46 through E2E-70
  What to do / Must NOT do: day atomicity, retroactive rebuild, invalidation, next scenario, custom unit, ten scenarios, cache equality, receipts/audit/preview, malformed/replay/failure/privacy/GM-loss/partition/quarantine/bounded/socket recovery.
  Parallelization: Wave 8 | Blocked by: 2-4, 14-16, 19, 21-28 | Blocks: 34.
  References (executor has NO interview context - be exhaustive): OpenSpec E2E-46..70; campaign persistence/combat/audit deltas; `tasks.md` 22.1-22.2.
  Acceptance criteria (agent-executable): the two exact commands below cover E2E-46..70 once each; the healthy control session remains available during corruption quarantine.
  QA scenarios (name the exact tool + invocation): `$runId = "task-32-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"; npm.cmd run verify:qc:gm-two-player-campaign -- --group=campaign --run-id=$runId; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run verify:qc:gm-two-player-campaign -- --group=failure --run-id=$runId`; the ten-scenario chain passes and stale-artifact/projection/corruption/socket fixtures fail safely; Evidence `test-results/gm-two-player/$runId/`.
  Commit: Y | `test(e2e): prove campaign continuity and failure recovery`

- [ ] 33. Implement strict performance/UX/evidence E2E-71 through E2E-80
  What to do / Must NOT do: commit methodology, warm-up/sample/mix/clocks/percentiles/runner/chunk/queue/memory; prove budgets, accessible states, confirmation/conflicts, evidence/cleanup, and exact-main trigger; do not use 2 s functional wait as latency gate. Bound each unsent connection queue to the first of 256 envelopes or 1 MiB serialized, each catch-up chunk to both 128 events and 512 KiB serialized, server RSS growth to 128 MiB, and each controlled-client RSS growth to 64 MiB over the post-warm 200-command run.
  Parallelization: Wave 8 | Blocked by: 13, 25-28 | Blocks: 34.
  References (executor has NO interview context - be exhaustive): OpenSpec E2E-71..80; design D10; `tasks.md` 23.1-23.4.
  Acceptance criteria (agent-executable): the exact performance command below records p95<=250 ms, p99<=750 ms, catch-up<=2 s, the numeric queue/chunk/RSS limits above, peak RSS for every process, all nine accessible states, complete evidence, and scoped cleanup on the recorded runner class.
  QA scenarios (name the exact tool + invocation): `$runId = "task-33-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"; npm.cmd run verify:qc:gm-two-player-campaign -- --group=performance --run-id=$runId --warmups=20 --samples=200`; budgets pass, while injected slow-client, threshold, and foreign-cleanup fixtures fail with retained evidence; Evidence `test-results/gm-two-player/$runId/`.
  Commit: Y | `test(perf): gate gm two-player campaign latency`

- [ ] 34. Cut over, prove ten scenarios on exact main, and document operation
  What to do / Must NOT do: prove shadow equality; enable new sessions behind reviewed flag; preserve legacy reads; document rollback/reauth/host loss/rewind boundary/quarantine/perf/evidence; complete the runner's `traceability`, `quality`, `manual-setup`, and `scope` final-verifier groups; add `scripts/qc/run-gm-two-player-final-gates.mjs` as a fail-fast exact-main gate runner that captures stdout/stderr/exit status per command; audit the archived exact-main receipts produced for every earlier `Commit: Y` todo, then run the new all-gates runner once for final cutover and the ten-scenario campaign; never delete history or user artifacts.
  Parallelization: Wave 9 | Blocked by: 1-33 | Blocks: final verification.
  References (executor has NO interview context - be exhaustive): OpenSpec design Migration Plan/Risks; `tasks.md` 24-25; all delta specs; this implementation plan; exact-main receipts from Tasks 1-33.
  Acceptance criteria (agent-executable): shadow digests match; migration/cutover/rollback tests pass; the fail-fast runner executes, in order, `verify:qc:gm-two-player-campaign -- --group=all`, `verify:qc:campaign-long`, `typecheck`, `lint`, `format:check`, `verify:qc:multiplayer-reliability`, `verify:qc:coop-campaign-journey`, `verify:qc:replay-recovery`, `verify:qc:gm:campaign-ledger`, `verify:qc:gm:time-cascade`, `verify:qc:encounter-combat-continuity`, strict OpenSpec validation, and `qc:openspec-ci:validate`; every command has its own retained log/exit receipt, and an injected middle-command failure prevents all later commands from running.
  QA scenarios (name the exact tool + invocation): `$runId = "task-34-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"; node scripts/qc/run-gm-two-player-final-gates.mjs --run-id=$runId`; expect exit 0 and one receipt per required gate; then `node scripts/qc/run-gm-two-player-final-gates.mjs --run-id="$runId-fail-fast" --inject-failure=verify:qc:replay-recovery` must exit nonzero, mark later gates `NOT_RUN`, and retain earlier logs. The all-group covers restarts, reconnects, pre/post-receipt corrections, migration/cutover/rollback, and ten scenarios; Evidence `.omo/evidence/.../task-34-gm-two-player-live-campaign-sandbox/`.
  Commit: Y | `docs(campaign): finalize live session authority rollout`

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit
  Verify every OpenSpec requirement and task maps to implemented code/test/evidence; every E2E-01..80 has one strict result; all todo dependencies exist; and every `Commit: Y` todo has an exact-main receipt generated under the historical gate applicable when it merged. APPROVE only with `openspec validate harden-gm-two-player-campaign-sessions --strict --no-interactive` and `npm.cmd run qc:openspec-ci:validate` green.
  Setup / invocation / expected result: `$runId = "final-f1-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"; openspec validate harden-gm-two-player-campaign-sessions --strict --no-interactive; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run qc:openspec-ci:validate; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run verify:qc:gm-two-player-campaign -- --group=traceability --run-id=$runId`; expect exit 0, 80 unique E2E IDs, zero uncovered SHALL/task/todo/dependency, and one exact-main receipt for every todo marked `Commit: Y`.
  Evidence: `.omo/evidence/gm-two-player-live-campaign-sandbox/$runId/final-f1-plan-compliance/` with OpenSpec logs, traceability matrix, E2E index, dependency audit, and merge-receipt index.
- [ ] F2. Code quality review
  Review migrations, transaction boundaries, authorization-before-serialization, idempotency, branch activation, error handling, performance bounds, and dirty-tree preservation; run typecheck/lint/format and changed-area tests. APPROVE only with no high-severity correctness/privacy/durability finding.
  Setup / invocation / expected result: `$runId = "final-f2-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"; npm.cmd run typecheck; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run lint; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run format:check; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run verify:qc:multiplayer-reliability; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run verify:qc:coop-campaign-journey; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run verify:qc:replay-recovery; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run verify:qc:encounter-combat-continuity; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm.cmd run verify:qc:gm-two-player-campaign -- --group=quality --run-id=$runId`; expect exit 0, no high-severity reviewer finding, no transaction/redaction/idempotency/branch-activation gap, and no unrelated dirty-tree mutation.
  Evidence: `.omo/evidence/gm-two-player-live-campaign-sandbox/$runId/final-f2-code-quality/` with command logs, changed-file inventory, migration/transaction review, privacy review, and verdict.
- [ ] F3. Real manual QA
  Use one fresh controlled server and three fresh browser contexts to play campaign setup, customization handoff, two scenarios, disconnect/reconnect, GM correction, pre-receipt rewind, post-receipt coordinated correction, timeline/export, and narrow-viewport recovery. APPROVE only with unique screenshots plus server/store authority proof.
  Setup / invocation / expected result: `$runId = "final-f3-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"; npm.cmd run verify:qc:gm-two-player-campaign -- --group=manual-setup --run-id=$runId --keep-alive`; expect a `READY` receipt containing the harness-owned URL, three isolated controlled-browser endpoints, GM/P1/P2 identities, database path, cleanup token, and zero ambient-browser/process ownership. The verifier then controls each dedicated endpoint separately to perform every named action in order, runs the receipt's read-only evidence command after each finalized mutation, captures role-labeled unique screenshots, and finally invokes the receipt's exact cleanup command. APPROVE only if all three clients converge after each transition, private negative checks remain empty, reload/restart authority rows match UI state, and cleanup removes only run-owned resources.
  Evidence: `.omo/evidence/gm-two-player-live-campaign-sandbox/$runId/final-f3-manual-qa/` plus `test-results/gm-two-player/$runId/`, containing setup/cleanup receipts, action log, screenshots, raw frames, viewer projections, and read-only SQLite proofs.
- [ ] F4. Scope fidelity
  Diff against the approved OpenSpec and this plan; reject broker/new engine/GM-as-player/raw-payload/destructive-history/mega-PR drift, unrelated edits, missing rollback, or any claim based only on browser-local state.
  Setup / invocation / expected result: `$runId = "final-f4-$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"; $baseline = (Get-Content -Raw -LiteralPath '.omo/evidence/gm-two-player-live-campaign-sandbox/program-baseline-sha.txt').Trim(); $evidenceDir = ".omo/evidence/gm-two-player-live-campaign-sandbox/$runId/final-f4-scope-fidelity"; New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null; git diff --check "$baseline...HEAD"; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; git diff --name-status "$baseline...HEAD" | Tee-Object -FilePath "$evidenceDir/name-status.txt"; npm.cmd run verify:qc:gm-two-player-campaign -- --group=scope --run-id=$runId --baseline=$baseline`; expect exit 0, every changed file mapped to one approved todo/requirement, no forbidden architecture/history/privacy drift, every task-owned implementation PR at most 500 non-generated changed lines and at most 15 changed files, every oversize implementation change split before review, and rollback/authority evidence for every state claim.
  Evidence: `.omo/evidence/gm-two-player-live-campaign-sandbox/$runId/final-f4-scope-fidelity/` with name-status diff, todo/requirement ownership map, PR-size audit, forbidden-pattern report, rollback inventory, and verdict.

## Commit strategy
- Branch every todo from freshly updated exact main with `codex/` prefix and one task-owned worktree; no direct main push.
- One todo normally equals one focused commit/PR. Split before review if it exceeds 500 non-generated changed lines or 15 changed files, or if a migration, protocol, projection, or harness diff ceases to be independently reviewable; there is no review-size waiver and unrelated prerequisite todos are never combined.
- Commit messages are declared per todo. Generated test evidence is retained only where repository policy permits; unique run artifacts stay under ignored evidence roots while concise review manifests are linked.
- Before every PR: inspect `git diff --check`, changed-file scope, focused tests, type/LSP results, and OpenSpec task/requirement links.
- Merge one dependent PR at a time. Every todo marked `Commit: Y` is a major merge. After each, refresh exact main and run the historical gate defined in Verification strategy before opening/continuing the next dependent PR; Task 34's final all-gates runner is only the cutover gate.
- Rollback remains additive and history-preserving: revert application/cutover code, stop admission if required, and never erase committed journal/branch/receipt/audit rows.

## Success criteria
- OpenSpec `harden-gm-two-player-campaign-sessions` remains strictly valid, its CI-quality ledger accounting stays green, and every normative requirement has implementation/test/evidence traceability.
- One non-playing GM and two tactical players can cold-join/rejoin a durable campaign, own distinct forces, play sequential scenarios, and converge across client/server restarts.
- Accepted commands commit atomically before publication; rejected/failed commands produce no false success; retries/replay apply effects once; slow clients do not block healthy delivery.
- No player can receive GM-private or opposing-player hidden data through pre-serialization objects, frames, replay, snapshot, cold recovery, DOM/history, timeline, or export.
- Combat outcomes reconcile exactly once; pre-receipt combat rewind and post-receipt coordinated correction behave distinctly and remain auditable.
- Combat/campaign rewind preserves immutable prior branches, rebuilds declared state/projections deterministically, rejects stale/rebuilding commands, and activates only after verification.
- Customized units stay exact through customization, campaign ownership, force, mission, combat, outcome, rewind, reload, and next scenario.
- E2E-01..80 pass with complete authority, visibility, audit, latency, accessibility, and cleanup evidence; p95/p99/catch-up and memory/queue bounds pass on the controlled runner.
- Ten sequential scenarios survive periodic reconnects/restarts/corrections and checkpoint replay equals full history for authoritative state and all viewer digests.
- Every major merge has an archived exact-main regression receipt; final plan-compliance, code-quality, real-manual-QA, and scope-fidelity reviewers all approve.

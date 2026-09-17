# Lane A review: U3
reviewedHead: 935fe0423e9eef2c806ab8b4e012c9a9a8d6c929
baseline: 9d1351a780b74f095fb5864f8879419d2d27967b
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## A. E2E-02 ordering, real assertion, own sockets

Ordering (`e2e/gm-two-player-authority-recovery.pack.spec.ts:85-119`):

```
98  await prepareHostDeathTrigger(drive);
99  const before = snapshotOwnership(drive);
100 await fireHostDeath(drive, request);
104 const persisted = snapshotOwnership(drive);   // <-- new read
105 const beforePlaying = boundPlayingSeats(before.seats);
106 const persistedPlaying = boundPlayingSeats(persisted.seats);
107 expect(persistedPlaying).toEqual(beforePlaying);
108 expect(persistedPlaying).toHaveLength(2);
109 expect(persistedPlaying.map((seat) => seat.occupantPlayerId)).toEqual(
110   beforePlaying.map((seat) => seat.occupantPlayerId),
111 );
112 await reloadAll(drive);   // <-- client reload happens AFTER the persisted read
113 const after = snapshotOwnership(drive);
```

`fireHostDeath` (`e2e/helpers/gmTwoPlayerAuthorityRecovery.ts:113-124`) ends with `await waitForRelaunch(request)`, which polls `/api/campaigns` until the respawned host answers 200 — i.e. the restart is complete before `fireHostDeath` returns. The spec then calls `snapshotOwnership(drive)` (line 104) immediately, and only afterward calls `reloadAll(drive)` (line 112). `reloadAll` is the only place any client page is reloaded, and it is not called before line 104. So the persisted-seat read is strictly after the host restart and strictly before any client reload/rejoin.

Real assertion, not tautology: `snapshotOwnership` (`e2e/helpers/authorityRecoveryEvidence.ts:125-138`) opens a fresh sqlite connection via `drive.fixture.openEvidence('multiplayer')` on every call (`readMatchAuthority`, `authorityRecoveryEvidence.ts:169-199`) and closes it in a `finally`; nothing is cached between the `before` and `persisted` calls, so the two reads are independent samples of on-disk state. This is proven empirically, not just structurally: mutant M1 (`MatchRecovery.ts`, seats forced to `occupant: null` on boot) initially **survived** against the pre-existing (post-reload-only) assertion, then was rerun against the new persisted-read assertion and was **killed** (3 failed incl. `E2E-02 participant ownership survives restart`) — see `u3-local-20260916.json` `mutants[0]` (`caught: false` → `rerunResult: "3 failed / 1 passed"`). That is direct evidence the new assertion catches a real regression class the old one missed, not a rephrased tautology.

Own sockets, never the spectator GM: `prepareHostDeathTrigger` (`gmTwoPlayerAuthorityRecovery.ts:99-118`) sends `SetReady` for `alpha-1` from `drive.gm`, and `OccupySeat` + `SetReady` for `bravo-1` from `drive.playerOne` — a distinct socket/context, not the GM's. The GM itself is no longer a spectator: `postCampaignMatch` now posts `hostSeatKind: 'human'` (`gmTwoPlayerAuthorityRecovery.ts:228-231`), so the co-op creator occupies `alpha-1` as a playing host rather than `spectator-1` (previously the default per the diagnosis receipt's root-cause: `src/pages/api/multiplayer/matches/index.ts` `resolveHostSeatKind` seats a co-op creator as spectator, and `rejectSpectatorIntent` refuses lobby intents from that seat — which is exactly why the old drive's `SetAiSlot`/`LaunchMatch` from the GM never landed). Player 1 uses `OccupySeat` then `SetReady`, in that order, from its own socket, matching the letter.

**A: confirmed on all three sub-questions.**

## B. E2E-15 remount, sqlite clauses, refuses pending, honest comment

`e2e/gm-two-player-resilience.pack.spec.ts:863-896`: after `setOffline(false)` on both contexts, both pages are now reloaded (`await page.reload({ waitUntil: 'domcontentloaded' })`, lines 874-876) **before** the `expect.poll(() => lifecycleState(page))` block that checks `COMMANDS_ENABLED_STATES` (lines 878-885). This ordering is correct — remount precedes the commands-enabled poll.

The sqlite recovery clauses (campaign GET, match/participant fields, receipt count/coverage, delivery/ack cursors, outbox drained) sit entirely above this block (lines 806-861) and are untouched by the diff — confirmed by `git diff`, which shows exactly two hunks in this file: the header-comment hunk and the tail hunk starting at the `setOffline(false)` calls. Nothing in the recovery-assertion body was touched.

`pending` is still refused: `COMMANDS_ENABLED_STATES = ['live', 'finalized'] as const` (`gm-two-player-resilience.pack.spec.ts:123`) is unchanged by this diff (not in either hunk), so the enabled-state set was not widened.

Header comment honesty: the new comment says "the offline window burns the lobby client's `maxReconnectAttempts` (2)... Production has no HMR document reload." `maxReconnectAttempts: 2` is real and verified at `src/pages/multiplayer/lobby/[roomCode].tsx:296` (`useMultiplayerSession(..., { maxReconnectAttempts: 2 })`), independently corroborated by an unrelated, untouched pack (`e2e/gm-two-player-lifecycle.pack.spec.ts:45`) that already documents the same constant. This is a pre-existing, verifiable fact, not an invented rationale.

**B: confirmed on all four sub-questions.**

## C. Path/size caps

`git diff --numstat 9d1351a78..935fe0423`:
```
11  2  e2e/gm-two-player-authority-recovery.pack.spec.ts
19  11 e2e/gm-two-player-resilience.pack.spec.ts
33  7  e2e/helpers/gmTwoPlayerAuthorityRecovery.ts
1   0  openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md
139 0  openspec/planning/2026-09-12-roadmap-completion/evidence/u3-admission-20260916.json
205 0  openspec/planning/2026-09-12-roadmap-completion/evidence/u3-diagnosis-20260916.json
536 0  openspec/planning/2026-09-12-roadmap-completion/evidence/u3-local-20260916.json
82  0  openspec/planning/2026-09-12-roadmap-completion/evidence/u3-red-20260916.json
```
`git diff --numstat 9d1351a78..935fe0423 -- src/ scripts/qc/` returns **no output** — src/ and scripts/qc are untouched, confirmed.

Product lines (e2e + the tasks.md line, excluding the generated evidence receipts): 4 files, 64 changed lines (64 insertions + 20 deletions across the three e2e files and tasks.md). Well inside the 500-line / 15-file caps (4 files, 64 lines vs the cap of 15/500).

**Non-blocking observation:** `u3-local-20260916.json`'s own `lineCounts` self-report (`insertions: 4/1` for the authority-recovery spec, `21/5` for the helper) does not match the actual committed diff (`11/2` and `33/7` respectively) — the resilience spec and tasks.md counts do match exactly. The gap is consistent with explanatory comments (e.g. the `prepareHostDeathTrigger` docstring rewrite, the `hostSeatKind` comment) being added after that receipt's line-count snapshot was taken. This does not affect cap compliance (real total is still 64 lines, nowhere near 500) and does not change any pass/fail claim, but the receipt's self-reported line counts are stale relative to the final commit.

**C: confirmed — no src/ or scripts/qc touched; well under both caps; one non-blocking staleness note on receipt line-counts.**

## D. Genesis non-claim

The genesis-bearing test (`E2E-02 effective branch remains authoritative`, asserting `after.effectiveBranchId`) and the `E2E-01 genesis branch recovers` test are in the same spec file but entirely outside the two diff hunks — confirmed by inspecting the diff, which only touches the `E2E-02 participant ownership survives restart` test and the `prepareHostDeathTrigger`/`fireHostDeath`/`sendMatchIntents` helpers. The `event_history_branches` genesis-row assertion (`assertGenesisBranchRecovers`) and `effectiveBranchId` assertion are byte-identical to baseline.

The non-claim is stated in three places consistently:
- `tasks.md` PROGRESS line: "Genesis clauses of E2E-01/02 (event_history_branches genesis row, effectiveBranchId) stay a scoped non-claim gated on design-campaign-authority-and-sync task 5.7; assertions and the production flag untouched."
- `u3-admission-20260916.json` `genesisNonClaim` field, naming the same gate and flag (`CAMPAIGN_JOURNAL_AUTHORITY_ENABLED`).
- `u3-local-20260916.json` `nonClaims[]`, naming the exact failing assertions and line numbers (`authorityRecoveryEvidence.ts:229`, `gm-two-player-authority-recovery.pack.spec.ts:135`) and confirming "Assertion not weakened. Flag not touched."

**D: confirmed — genesis assertions untouched in range; non-claim stated consistently with the 5.7 gate named.**

## E. u3-local-20260916.json receipt content

Three killed mutants with observed failing assertions, all present:
- **M1** (`MatchRecovery.ts`, boot-time seat wipe): initially survived (`caught: false`), rerun against the final persisted-read assertion and killed (`rerunResult: "3 failed / 1 passed"`, naming the three failing rows including E2E-02-plain).
- **M2** (`DurableMatchStore.ts`, `updateMatchMeta` always nulling occupants): caught immediately — `expect.poll(...).toBe(2)` in `prepareHostDeathTrigger` times out at 15000ms, received 0.
- **M4** (`MatchHostRegistry.ts`, boot recovery skipped behind its own log line): caught — `expect(recovered.outboxPending).toBe(0)` receives 3.

**M3** (`tacticalLifecycleState.ts`, `deriveState` returns `'live'` instead of `'behind'` when not ready) survived, with an equivalence argument: "After remount the client reaches ready (ReplayEnd) before the 1s poll samples data-state... the row does not observe the behind window." This is a plausible, specific equivalence claim (not a hand-wave) — the row samples posture after the client has already progressed past the mutated branch, so the mutant is genuinely unobservable by this test, not merely untested.

Parent's verification section is present and substantive: it explains why the parent ran verification itself ("the grok-4.6 continuation lane wrote the final row edits... and then stopped on Cursor usage exhaustion before re-running gates or the mutant"), and documents a real incident — the root `node_modules` was pruned (191 packages) by an `npm install` run inside a junctioned bisect worktree, restored by `npm install` in the root before the parent's runs. This is exactly the kind of node_modules/junction hazard this review's own setup instructions warn against, now documented as having actually happened and been recovered from (by the parent, not this review).

The E2E-16 finding (`e2e/gm-two-player-token.pack.spec.ts:281`, `socketUrls.length` not `> socketCountBeforeStaleReload`) is present in `findingsReportedNotFixed`, classified by the parent as "deterministic on this tree: failed in five of five runs across the grok lane and the parent... no product file changed between the two commits and U3 touches no token-pack path; cause not isolated... recorded for a diagnosis successor, not fixed here." This is an honest scope boundary, not a swept-under-rug failure — it is also called out explicitly in the tasks.md PROGRESS line.

Run-result cross-check: PROGRESS line claims "Final --group=authority... 3 failed / 17 passed (4.4m)" with per-row detail (E2E-01-genesis fail, E2E-02-genesis fail, E2E-16 fail, everything else pass). This matches `u3-local-20260916.json`'s `runs[].authority-union` entry (3 failed / 17 passed, 4.5m, same three failing rows) and the separate `parentVerification20260916.runs["authority (full)"]` ("3 failed / 17 passed", corroborated by a distinct `authority-full.log` sha256). The two runs (implementer's local pass, parent's independent rebuild) report the same pass/fail partition with a small, unremarkable timing difference (4.4m vs 4.5m) consistent with being two separate executions, not a copy-pasted number.

**E: confirmed on all sub-questions.**

## F. Commands run and results

```
$ npx jest scripts/__tests__/gm-two-player-campaign-qc.test.ts
PASS unit scripts/__tests__/gm-two-player-campaign-qc.test.ts
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total

$ npx tsc --noEmit -p tsconfig.json
(no output, exit 0)

$ npx oxfmt --check e2e/gm-two-player-authority-recovery.pack.spec.ts e2e/gm-two-player-resilience.pack.spec.ts e2e/helpers/gmTwoPlayerAuthorityRecovery.ts
Checking formatting...
All matched files use the correct format.
Finished in 48ms on 3 files using 16 threads.

$ npx oxlint e2e/gm-two-player-authority-recovery.pack.spec.ts e2e/gm-two-player-resilience.pack.spec.ts e2e/helpers/gmTwoPlayerAuthorityRecovery.ts
Found 0 warnings and 0 errors.
Finished in 16ms on 0 files using 16 threads.
```
(oxlint reports "0 files" because `.oxlintrc.json` `ignorePatterns` includes `e2e/**` — a pre-existing repo-wide config, not something this diff changed or hid behind; the u3-local receipt notes the identical behavior.)

```
$ node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs
ROADMAP VALIDATION PASSED: 73 nodes, 13 packages, 376 tasks, 40 triage rows

$ node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs --next
U3
```
All four numbers (73/13/376/40) match exactly what was expected. `--next` correctly still names U3, consistent with `units.json` still marking U3 `planned` on this head (the ledger-parking docs PR is explicitly deferred, per the task brief).

**AI attribution:** `git show 935fe0423 --format="%B" -s` and a full-diff grep for `co-authored-by|generated with|claude|anthropic|gpt|openai|copilot` found no attribution lines in the commit message or diff body. One incidental hit was a false positive (`"no bearer in any URL"` matched a loose `bearer [a-zA-Z0-9]` pattern — it is prose about *absence* of a bearer token, pre-existing text, not a secret). The only literal model-name string in the entire range is `"claude-fable-5-1"` inside `u3-local-20260916.json`'s `parentVerification20260916.why` field, describing which model ran the parent's verification pass — this is process metadata inside an evidence receipt (which this review was explicitly told to read), not a commit/PR attribution line, so it does not trip the repo's "never add AI attribution to commits or PRs" guardrail.

**Secrets / absolute paths:** grepped the three e2e files + tasks.md diff for API keys, bearer tokens, passwords, and `E:\`/`C:\Users` style absolute paths — none found (the one hit was the same "no bearer" false positive above). Grepped the four `u3-*.json` evidence files for key/token/password patterns — none found. Evidence JSON files do carry worktree-relative and machine-local paths (e.g. `.sisyphus/roadmap-completion-20260912/worktrees/u3/...`), which is explicitly permitted for evidence files by this review's brief; none of the three product e2e files or tasks.md carry any such path.

**F: confirmed — all four gate commands pass with the expected numbers; no AI attribution in commit/diff; no secrets or absolute machine paths in product files.**

## Non-blocking observations

1. `u3-local-20260916.json`'s self-reported per-file `lineCounts` for `e2e/gm-two-player-authority-recovery.pack.spec.ts` (4/1) and `e2e/helpers/gmTwoPlayerAuthorityRecovery.ts` (21/5) understate the actual committed diff (11/2 and 33/7) — likely because explanatory comments were added after that receipt snapshot was taken. Total is still far under the 500-line cap, and every pass/fail claim in the receipts is independently verified above, so this is cosmetic, not a correctness issue. Worth tightening for future receipts (regenerate line-count snapshots at commit time) but not a reason to hold this PR.
2. The PROGRESS line and the `u3-local-20260916.json`/`u3-admission-20260916.json` receipts are internally dated 2026-09-17, one day after this review's "today" (2026-09-16, per session context) and one day after the branch name's own `-20260916` suffix and the baseline commit's date. This is consistent with the receipts' own timestamps throughout (`u3-diagnosis` `at: "2026-09-17T01:35:29Z"` etc.) and does not affect any technical claim, but is a minor date-labeling oddity worth a glance if the team cares about receipt-date consistency with the roadmap day's nominal date.
3. `u3-local-20260916.json` records `"committed": false` — a snapshot-in-time field from before the parent committed the final tree. This is expected for a receipt authored during the working phase and does not indicate the committed tree differs from what was verified (the parent's verification runs in `parentVerification20260916` were run after the final row edits, per its own `why` field).

## Summary

Both letter rows (E2E-02, E2E-15) are genuinely fixed harness defects, not weakened assertions: the seat-ownership check now reads real on-disk state before any client can rejoin and is proven non-tautological by a mutant that flipped from surviving to killed across this exact change; the reconnect-recovery check now remounts before polling, consistent with a real, cross-referenced `maxReconnectAttempts: 2` production constant, while leaving every sqlite recovery clause and the refusal of `pending` untouched. The diff stays entirely inside `e2e/` plus one tasks.md progress line, well under both caps, with no src/ or scripts/qc touched. The genesis non-claim is honestly preserved and consistently gated on task 5.7 in the spec, the tasks.md line, and both admission/local receipts. The mutation-testing receipt is substantive (three real kills, one well-argued survival-as-equivalent, an honestly reported unrelated finding, and a documented node_modules recovery incident), and its headline run-result claims are independently corroborated across two separate verification passes. All four requested gate commands pass with exactly the expected output. No AI attribution, secrets, or absolute machine paths appear in any product file.

Nothing here needs to change before merge.

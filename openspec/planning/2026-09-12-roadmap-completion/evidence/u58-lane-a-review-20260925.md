# Lane A review: U58

reviewedHead: eb49cfdf2fd997d4e1c31c450b027fd8653808a4
baseline: 3b1cca3a6542e53703f2ac6fa7ac43ec97ae7f98
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin`, then `git worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u58-review eb49cfdf2fd997d4e1c31c450b027fd8653808a4`. Confirmed `git rev-parse HEAD` = `eb49cfdf2fd997d4e1c31c450b027fd8653808a4` throughout.
- Junctioned `node_modules` from the root checkout via PowerShell `New-Item -ItemType Junction`.
- Node 22.22.0 (`export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH`); `npm_config_dry_run=true` set for every shell; no `npm install`/`ci`/`prune` run.
- `node scripts/qc/machine-idle.mjs --wait --timeout-ms 1800000` run before every full-directory jest invocation; each printed `MACHINE_IDLE`.
- Read: GOAL.md, DELIVERY.md, units.json (U58, U31), roadmap.json (`OD-umbrella-12-1-slice`, `OD-mvp-hard-cutover`), the three staged receipts (admission/red/local), `harden-gm-two-player-campaign-sessions/tasks.md:252-259`, `gm-authority-redaction/spec.md` (Authorized Viewer Projection Precedes Serialization, Viewer Delivery Cursors), the umbrella delta's "Visibility Is Equivalent Across Surfaces", the full `git diff` baseline..head, and `CampaignSyncSession.ts` (`joinMember` :475, `resyncGuest` :556, `buildBaselineEvent` :825, `admitToWire`/`attachLiveParticipant` :340-410), `CampaignMatchHost.ts` (`subscribe`/`publish` :262,:507), `campaignSourceGenesis.ts`, `campaignRecordJournalSave.ts`, `campaignAuthorityMigration.ts`.
- I did not read the implementer's review-question answers before writing my own probes; the probe file below was written from my own reading of the seams, then run, before I compared its output against the local receipt's claims.

## Files on the range

`git diff 3b1cca3a6542e53703f2ac6fa7ac43ec97ae7f98..eb49cfdf2fd997d4e1c31c450b027fd8653808a4 --stat` (measured): 12 files changed, 567 insertions(+), 167 deletions(-). All 12 paths are under `src/lib/campaign` (`git diff --name-only`, measured):

```
src/lib/campaign/authority/campaignAuthorityMigration.ts
src/lib/campaign/coop/__tests__/roomCodeGuestHydration.test.ts
src/lib/campaign/coop/roomCodeGuestHydration.ts
src/lib/campaign/delivery/__tests__/campaignDelivery.nonInference.test.ts
src/lib/campaign/delivery/__tests__/campaignGenesisArmParity.test.ts
src/lib/campaign/delivery/__tests__/campaignGrantSnapshot.storedBaselineLeak.test.ts
src/lib/campaign/delivery/__tests__/projectCampaignStreamForGrant.test.ts
src/lib/campaign/delivery/campaignDeliveryTypes.ts
src/lib/campaign/delivery/projectCampaignStreamForGrant.ts
src/lib/campaign/grants/campaignGrantGuards.ts
src/lib/campaign/sync/__tests__/campaignViewerProjection.test.ts
src/lib/campaign/sync/campaignViewerProjection.ts
```

Product-only `--numstat` (measured, the 6 non-test files): campaignAuthorityMigration.ts +4/-1; roomCodeGuestHydration.ts +22/-12; campaignDeliveryTypes.ts +6/-1; projectCampaignStreamForGrant.ts +23/-16; campaignGrantGuards.ts +0/-17; campaignViewerProjection.ts +51/-25. Sum: +106/-72, 178 changed lines. No file under `src/lib/multiplayer/server`, `openspec/`, `units.json` or `roadmap.json` is touched.

## Findings

**F-Q1 (informational, VERIFIED).** Built a real SQLite/journal stream (`JournalCampaignEventStore` + `CampaignMatchHost` + `CampaignSyncSession`, plus the grant-arm harness) holding a migration-authored baseline (seq 0, real `importCampaignBaseline`), a gm-scoped fact, and a later `system`-authored checkpoint. Measured all four surfaces for a restricted (`campaign`-scope) player and the GM:

| surface | restricted player | GM |
|---|---|---|
| legacy join baseline (`joinMember`) | empty state, no `pilot-imported` | full imported+checkpoint state |
| legacy large-gap resync baseline (`resyncGuest`, gap>50) | empty state, no `pilot-imported` | (not probed; join already proves the arm) |
| grant scoped snapshot (`buildScopedCampaignSnapshot`) | empty pilots | full imported+checkpoint state |
| room-code guest seed (`genesisStateFromHostLog`) | `null` (nothing admitted) | n/a |

The restricted player gets the migration baseline, and the later checkpoint minted from the imported record, through **none** of the four surfaces; the GM gets it through every surface probed. This matches `OD-umbrella-12-1-slice` exactly and matches the local receipt's `designAnswers.wireToday` claims.

**F-Q2 (informational, VERIFIED — the ordering latch, not new to this unit).** Built a genesis stream (seq 0 `system` genesis with `pilot-opening`, seq 1 gm-scoped fact, seq 2 `system` checkpoint adding `pilot-added-in-checkpoint`, seq 3 an in-scope incremental `FundsChanged`). Measured: the restricted player's legacy join baseline and grant scoped snapshot both keep `pilot-opening` (genesis, pre-latch) but never gain `pilot-added-in-checkpoint` (the checkpoint, post-latch); the seq-3 incremental fact **does** fold in (balance moved to the incremental's value). This confirms the answer to charter question 2 directly: once *any* fact has been withheld from a restricted viewer (a single early gm-scoped action is enough), every later full-state baseline/checkpoint is refused for the rest of that viewer's fold — permanently, since the fold is recomputed from event 0 on every join/resync/snapshot and the latch trips at the same point every time. The viewer does not "catch up" via a fresh baseline; they only ever accumulate further *incremental*, in-scope events on top of the last full-state fold that preceded the withhold. This is the **pre-existing legacy-arm ordering law** (`campaignViewerProjection.ts:72-80` before this unit); U58's change is to make the grant arm and the room-code guest seed share it, not to introduce it. It is not a defect in this diff, but it is a real behavioral consequence the OD text does not spell out (spec-silent, as the admission receipt itself flags) — a restricted player in a campaign with any GM-only history and a later whole-document checkpoint (U35e) will silently diverge from the authoritative state rather than reconcile, until the underlying facts happen to also exist as separate in-scope incremental events. Worth the owner's (Lane B) attention, not a required edit to this PR.

**F-Q3 (informational, VERIFIED).** Pinned a delivery epoch under `projectorVersion: 1` with one sequence assigned, then called `projectCampaignStreamForGrant` with a cursor naming that epoch. Measured: `result.kind === 'stale-epoch'`, `CAMPAIGN_GRANT_PROJECTOR_VERSION === 2`, `newBaseline.deliveryEpochId !== oldEpoch.deliveryEpochId`. Continuing from the new epoch at `afterSequence: 0` returned `[CampaignSnapshotPublished@1, FundsChanged@2]` — the baseline numbered first, no gap, no duplicate. Appending one more fact and resuming from `afterSequence: 2` returned exactly `[FundsChanged@3]` — no repeat of the baseline, no reorder. The version bump does what its own comment claims.

**F1-independently-confirmed (privacy, MEASURED, not this unit's ownership path — see charter question 4).** Built a real host+session over a real SQLite-backed journal. A restricted player stayed live-attached (`joinMember`). I then appended a mid-stream, `system`-authored, full-state `CampaignSnapshotPublished` **directly to the journal** via `appendCampaignCommandBatch` (the same journal-write shape `campaignRecordJournalSave.ts`'s `saveCampaignRecordThroughJournal` — the real PUT-route checkpoint producer — uses; it never calls `CampaignMatchHost.commit`/`publish`). Measured:
- The live-attached sink received **nothing** from this write (`CampaignMatchHost.publish` (`CampaignMatchHost.ts:507`) is only invoked from the host's own commit pipeline (`handleIntent`/`_commitEventsForTests`), which this producer never enters) — F1's "live fan-out" framing does not reach this specific producer.
- A subsequent `resyncGuest` small-gap resync (`snapshotted: false`) **did** deliver the raw checkpoint object — full unprojected state, including the planted `pilot-leak-check` — to the restricted player, because `admitToWire` (`CampaignSyncSession.ts:358-366`) applies only `campaignScopeAdmits` (a pure scope check), never `campaignBaselineReachesViewer`.

This upgrades the local receipt's F1 (`"productionReach": "not measured end to end"`) to: **measured, and reachable** — a restricted player who resyncs with a small gap after a whole-campaign PUT checkpoint (U35e's mechanism) receives the raw full state on the wire, not the projected fold. It is not reachable via `attachLiveParticipant`/live fan-out for this producer specifically, because that producer bypasses `host.publish`. `src/lib/multiplayer/server` is out of U58's ownership path and this unit correctly does not touch it or claim to fix it; the local receipt already reports F1 as an open, unfixed finding rather than papering over it. I agree with the charter's framing: this needs a unit before UAT round 2, but it is not a reason to reject this PR's own (correctly scoped) diff.

**No defects found inside the diff itself.** The predicate (`campaignBaselineReachesViewer`), its two callers (`campaignViewerVisibleEvents`, `projectCampaignStreamForGrant`), the exported migration-author constant, the projector-version bump, and the room-code guest seed's re-use of `campaignViewerVisibleEvents` all match their doc comments, and the doc comments match measured behavior (including the predicate's own comment explicitly stating the latch: *"A caller that gets `false` counts the baseline as withheld from then on: a later checkpoint folded from an imported record carries the same material the refused baseline did."*, verified true by F-Q2 above).

## Red reproduction (charter question 5)

Restored the 6 baseline product blobs (`git show 3b1cca3a...:<path>`) over the head worktree, confirmed head test files unchanged (`git status` showed only the 6 product files modified), then ran the six row suites:

```
npx jest --verbose campaignGenesisArmParity.test.ts roomCodeGuestHydration.test.ts campaignViewerProjection.test.ts projectCampaignStreamForGrant.test.ts campaignGrantSnapshot.storedBaselineLeak.test.ts campaignDelivery.nonInference.test.ts
```
Result: `Test Suites: 6 failed, 6 total` / `Tests: 14 failed, 29 passed, 43 total` — all 6 suites red, including 3 `TypeError: campaignBaselineReachesViewer is not a function` rows (the predicate doesn't exist at baseline) and value-mismatch rows matching the local red receipt's shape (imported pilot present where it must be absent, digest mismatch, stale-epoch version assertion failing at `1`). One suite (`storedBaselineLeak`) hit a `ZodError` rather than a clean assertion failure — expected collateral from running the head's migration-authored fixture through baseline harness code, still a hard failure (exit 1), still red.

Restored all 6 files to head content (`git show eb49cfdf2...:<path>`) and verified sha256 for every file against the local receipt's `finalContentSha256` table — **all 6 matched exactly** before and after the round-trip. `git status --porcelain` clean afterward.

## Independent mutant (charter question 6; not M1-M7)

Mutated `campaignViewerProjection.ts:100` from `if (admits('gm') && admits('campaign')) return true;` to `if (admits('gm') || admits('campaign')) return true;` — a realistic "the entitled-viewer check is too loose" mutant (any ordinary campaign-scoped player, which is nearly every restricted viewer, would short-circuit into "entitled to everything"). Pre-mutant sha256 `a56dbb4a...`. Ran the six row suites: `Test Suites: 4 failed, 2 passed, 6 total` / `Tests: 9 failed, 34 passed, 43 total` — **killed**, caught by both the migration-leak rows and (per the log) the genesis-parity rows. Restored the file from the head blob; sha256 `a56dbb4a...` matched exactly; `git status --porcelain` clean afterward.

## Gates (charter question 7, on the exact head)

| gate | last line | exit |
|---|---|---|
| `npx jest src/lib/campaign` | `Test Suites: 204 passed, 204 total` / `Tests: 2998 passed, 2998 total` | 0 |
| `npx jest src/lib/multiplayer/server` | `Test Suites: 160 passed, 160 total` / `Tests: 1178 passed, 1178 total` | 0 |
| `npx jest src/__tests__/api/campaigns` | `Test Suites: 15 passed, 15 total` / `Tests: 110 passed, 110 total` | 0 |
| `npx jest src/lib/events` | `Test Suites: 51 passed, 51 total` / `Tests: 947 passed, 947 total` | 0 |
| `npx tsc --noEmit` | (no output) | 0 |
| `npx oxlint` | `Found 84 warnings and 0 errors.` | 0 |
| oxlint warnings inside the 6 changed product files | 0 (grepped the full oxlint output for each changed path; no hits) | n/a |
| `npx oxfmt --check` (12 changed files) | `All matched files use the correct format.` | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | `...accountedActiveOpenSpecChanges=9 errors=0` | 0 |
| `node .../validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

The `src/lib/campaign`, `src/lib/multiplayer/server` and `src/__tests__/api/campaigns` counts match the local receipt exactly; `src/lib/events` was not in the local receipt and is my own addition to the gate list per the charter — clean. The oxlint warning count (84) matches the pinned count with zero warnings attributable to the changed files.

## Cap (charter question 8)

- Files: 12 changed, all under `src/lib/campaign` (cap: 15 files, `src/lib/campaign` ownership). Within cap.
- Product (non-test) lines: 178 changed (106 added + 72 deleted) across 6 files (cap: 500 non-generated product lines). Within cap.
- No AI attribution and no absolute machine path found in the diff (`git diff baseline..head | grep -iE "claude|anthropic|co-authored|generated with|E:\\\\Projects|/e/Projects|C:\\\\Users|/c/Users"` — no match).
- Every added/changed function-level comment I checked (`campaignBaselineReachesViewer`, `campaignViewerVisibleEvents`, `CAMPAIGN_MIGRATION_AUTHOR_ID`, `CAMPAIGN_GRANT_PROJECTOR_VERSION`, `genesisStateFromHostLog`, the `projectCampaignStreamForGrant` baseline branch) states what the code actually does, and each claim I probed came out true against measured behavior. The predicate's own comment explicitly names the latch (quoted above under F-Q2), satisfying the charter's specific check on that point.

## Verdict rationale

The diff does exactly what `OD-umbrella-12-1-slice` approved: one exported predicate, shared by both projection arms and the room-code guest seed, keyed on `authorPlayerId === 'migration'` plus the pre-existing withheld-precedes ordering rule; I independently verified this on real SQLite through the real arms (F-Q1), verified the latch's real-world consequence (F-Q2, matches the owner's ordering law, not a new defect), verified the epoch bump is clean under reconnect with no duplicate/reorder (F-Q3), and independently reproduced red (6/6 suites) and killed a fresh mutant the implementer didn't name. All required gates pass on the exact head, matching the local receipt's counts everywhere they overlap. Caps, attribution and path hygiene, and comment accuracy all check out. The one real residual — F1, a raw full-state checkpoint riding the small-gap resync tail to a restricted player, unfiltered by the baseline law — sits entirely outside `src/lib/campaign` (this unit's ownership path), is honestly disclosed as unfixed in the local receipts rather than concealed, and does not regress relative to before this unit (the same tail was equally unprotected on the baseline; U58 does not touch `CampaignSyncSession.ts`). It is a strong, evidence-backed argument for a follow-up unit before UAT round 2, not a reason to block this correctly-scoped, caps-respecting, red-first, mutation-tested change. This unit still requires the owner's head-bound Lane B ruling before it may be recorded as merged (privacy and replay review classes) — that gate is unaffected by this Lane A verdict.

**Verdict: APPROVE.**

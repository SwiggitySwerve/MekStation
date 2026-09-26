# Lane A review: U61
reviewedHead: 9966f819ce7113f81ee99ebeec6334721a85b086
baseline: 3c010252b43bb062a93fc490fe7b29c6346afff4
reviewerModel: claude-sonnet (Agent model: sonnet, lean-worker)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` — exit 0, no output (already current).
- Both `9966f819ce7113f81ee99ebeec6334721a85b086` and `3c010252b43bb062a93fc490fe7b29c6346afff4` resolved locally via `git rev-parse` before any worktree op.
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u61-review 9966f819ce7113f81ee99ebeec6334721a85b086` — succeeded, "HEAD is now at 9966f819c ...".
- `New-Item -ItemType Junction -Path ...\u61-review\node_modules -Target ...\node_modules` — created.
- `npm_config_dry_run=true` exported for every npm/npx invocation. No install/build/jest/Playwright run.
- Fold status checked first: `git show origin/main:openspec/planning/2026-09-12-roadmap-completion/units.json` already shows U61 `"state": "local-verified"` with all three stage receipts (`admission`, `red`, `local`) present at `evidence/u61-{admission,red,local}-20260926.json` on `origin/main` — read directly from origin/main rather than the implementer's worktree, since the fold had already landed.

## Files on the range

`git diff 3c010252b..9966f819c --stat`:
```
 openspec/changes/design-campaign-authority-and-sync/design.md |  2 +-
 .../specs/campaign-authority/spec.md                          | 15 ++++++++++++++-
 openspec/changes/design-campaign-authority-and-sync/tasks.md  |  2 +-
 3 files changed, 16 insertions(+), 3 deletions(-)
```
All 3 files sit under `openspec/changes/design-campaign-authority-and-sync`, matching U61's `ownershipPaths`. 3 files ≤ cap 15; 16 added / 3 removed lines ≤ cap 500 (`units.json` `U61.caps`).

## Findings

1. **[INFO] Authority packet decision matches the delta's scope.** `units.json` packet `PK-6-2b-single-player-seat`: `decision.option = "(b) co-op-host-only scope for 6.2b"`, `decision.text = "approve and yes to both"`, `decision.at = "2026-09-22T22:15:03Z"`, `ruling: null`. The delta (`spec.md:197`, `spec.md:230-235`, `tasks.md:102`) implements exactly that scope: co-op-host acceptance routed through `/commands` (spec.md:230-234), single-player stays the client apply as a recorded non-claim naming `FN-ob2-identity-before-hosted-deployment` (spec.md:197, :235; tasks.md:102 — 3 hits, grepped). No new single-player principal is invented anywhere in the diff. `ruling: null` is expected here: per `DELIVERY.md:11`, Lane B (owner OWNER-RULING on the exact head) is a separate gate from Lane A engineering review; it is not this lane's job to supply it.

2. **[INFO] `git diff` shows zero `[x]` insertions.** `git diff 3c010252b..9966f819c -- openspec/changes/design-campaign-authority-and-sync | grep -c '^\+.*\[x\]'` → `0`. `tasks.md` line 104 (6.1, already `[x]` at baseline) is untouched by this diff (only tasks.md:102, the section-6 preface line, changed).

3. **[VERIFIED, no defect] D8's five clauses, each true in code:**
   - **Journal-native adoption:** `campaignAuthorityMigration.ts:160` — `createJournalNativeMarker` sets `state: 'journal'`.
   - **System-authored genesis at sequence 0, actor `campaign-source-genesis`:** `campaignSourceGenesis.ts:238` (`authorPlayerId: 'system'`), `:239` (`type: 'CampaignSnapshotPublished'`), `:281-282` (`purpose: 'genesis', sequence: 0`), `:254-255` (`actorId: genesis ? 'campaign-source-genesis' : ...`), `:247-248` (`commandId: campaign-genesis:${campaignId}`).
   - **Marker `state: 'journal'`, `importedBaseline: null`, no shadowing marker:** `campaignAuthorityMigration.ts:160-161`. `campaignLegacyAdoption.ts:144` (`writeMarker(marker)`) is the only marker write in the adoption path — `grep -n "shadowing"` in `campaignLegacyAdoption.ts` matches only two comment lines (14, 112), no call to a shadowing-marker constructor.
   - **D10 rollback not applying; `importedDigest` still returned:** `campaignAuthorityMigration.ts:341-343` (`baselineHead = marker.importedBaseline ? ... : -1`) and `:344-349` (`journalHighestSequence !== baselineHead` → `rollback-prohibited`, reason `journal-head-past-baseline`) — for an adopted campaign `importedBaseline` is `null` so `baselineHead = -1`, while the genesis append leaves `journalHighestSequence = 0`, so `0 !== -1` always prohibits rollback. `importedDigest` returned at `campaignLegacyAdoption.ts:146` (`importedDigest: genesis.stateDigest`).
   - **Viewer predicate reads the genesis:** `src/lib/campaign/sync/campaignViewerProjection.ts:95-103` — `campaignBaselineReachesViewer` returns `false` only when `baseline.authorPlayerId === CAMPAIGN_MIGRATION_AUTHOR_ID` (`'migration'`, line 70); the genesis event's `authorPlayerId` is `'system'` (not `'migration'`), so it falls through to `!withheldBefore` (line 102) and can reach an unwithheld restricted viewer, unlike a migration-authored baseline.

   No clause required an edit.

4. **[INFO, non-blocking] Two charter file-path pointers are stale.** The charter names `src/lib/campaign/authority/campaignViewerProjection.ts:90-105` and `src/services/campaign/CampaignPersistenceService.ts:170-190`. Neither path exists; the actual files are `src/lib/campaign/sync/campaignViewerProjection.ts` (confirmed clause 5 there, lines 95-103) and `src/services/campaignPersistence/CampaignPersistenceService.ts` (confirmed the CAS at lines 186-187). This is a charter/context-package inaccuracy, not a defect in the reviewed diff — flagged per the charter's own "note adjacent problems, don't fix them" convention, not applied against the verdict.

5. **[VERIFIED, no defect] Pinned rows byte-identical.** Computed sha256 of each live `tasks.md` row (line stripped of its `- [ ] `/`- [x] ` prefix) against `evidence/admission-snapshot-supplement-20260922.json`'s recorded `text` field for the same task id:
   - 1.6@30: `22864583af9540ff…` == `22864583af9540ff…` MATCH
   - 6.1@104: `116ed18e4eb2eff0…` == `116ed18e4eb2eff0…` MATCH
   - 6.2@106: `a266125321583ca9…` == `a266125321583ca9…` MATCH
   - 6.3@108: `55d3d8c27fe2498e…` == `55d3d8c27fe2498e…` MATCH
   - 6.4@110: `b9364671f24ddcb7…` == `b9364671f24ddcb7…` MATCH
   Supplement file itself: `git diff 3c010252b..9966f819c -- .../evidence/admission-snapshot-supplement-20260922.json` → 0 lines; `sha256sum` on the head = `2047731066377c7a…`, matching the `sha256` `units.json` records for it in `supplementSnapshots` (`2047731066377c7a`, grepped at units.json:3842).

6. **[VERIFIED, no defect] 6.4 bridge and active-seat authorization.**
   - Stale whole-envelope save refused with the current record: `src/services/campaignPersistence/CampaignPersistenceService.ts:186-187` — `if (baseVersion !== currentVersion) { return conflictFromStoredRow(row, prepared.record, hostInstanceId); }`, where `conflictFromStoredRow` (same file, ~line 474-495) returns `{ kind: 'conflict', current: ... }` carrying the stored row, never overwriting. A second, stricter guard ahead of it (`:162-181`, the `sourceReplayFence` check) also routes to the same `conflictFromStoredRow` 409 path.
   - Active-seat authorization on `/commands`: `src/pages/api/campaigns/[id]/commands.ts:161` — `if (!isActiveCampaignSeat(id, auth.playerId)) { res.status(403)... }`, imported at `:54` from `CampaignSessionParticipantStore`. Header comment at `:28-31` states the rationale (a campaign with no co-op session has no seats, so it refuses every caller — the single-player boundary, finding #29).
   - Client-side apply confirmed non-submitting: `src/stores/campaign/campaignCommandActions.ts:453-490` (`acceptContractOffer`) mutates the in-memory campaign via `applyCampaignMutation` only (`missions`, `contractMarket`); no `fetch`/`POST` call to `/commands` anywhere in the function body.

7. **[VERIFIED, no defect] No AI attribution, no absolute machine paths.** `git log 3c010252b..9966f819c --format="%H %an %ae%n%B"` → single commit, author `Wes Rollings <wrollings@gmail.com>`, message `docs(openspec): task 6.2b scoped to co-op-host acceptance routing through /commands; ...` — no AI-attribution trailer. `git diff 3c010252b..9966f819c | grep -niE "C:\\\\|/Users/|/home/|E:\\\\Projects"` → no matches (exit 1).

8. **[VERIFIED, no defect] Requirement scenario count.** `awk '/### Requirement: An accepted contract .../,0' spec.md | grep -c '^#### Scenario'` → `6`, matching the receipt's "six scenarios" and the charter's expectation.

## Gates

- `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` — last line `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 381 tasks, 40 triage rows`, exit 0.
- `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs --git` — same last line, exit 0.
- `npx --no-install openspec validate --all --strict` — last line `Totals: 229 passed, 0 failed (229 items)`, exit 0; `change/design-campaign-authority-and-sync` listed with `✓`.
- `npx --no-install openspec validate design-campaign-authority-and-sync --strict` — `Change 'design-campaign-authority-and-sync' is valid`, exit 0.
- `node scripts/qc/validate-openspec-ci-quality.mjs` — `[qc:openspec-ci] ... errors=0`, exit 0.
- Mutant reproduction (chosen: **missing colon** on the requirement header, `spec.md:196`, `### Requirement: An accepted...` → `### Requirement An accepted...`): re-ran `openspec validate design-campaign-authority-and-sync --strict` on the mutated file → `Change 'design-campaign-authority-and-sync' is valid`, exit 0 (mutant survives strict validation, as the receipt records). Restored from a pre-mutation backup; `git diff --stat -- spec.md` after restore → empty (0 lines), and `sha256sum` of the restored file = `ddbf300e8a90eb36…`, unconditionally recomputed post-restore to confirm no residual change was left in the worktree.

## Cap

3 files changed (cap 15), +16/-3 lines (cap 500 non-generated lines) — both within `units.json` `U61.caps`. All 3 files under the single `ownershipPaths` entry `openspec/changes/design-campaign-authority-and-sync`.

## Verdict rationale

Every review question resolved with matching, file:line-backed evidence and no discrepancy between the delta's prose and the code it describes: the authority-packet scope, all five D8 clauses, the five pinned-row hashes plus the supplement's own integrity, the OpenSpec/roadmap gates (all green, matching the receipt's recorded numbers), the 6.4 CAS-refusal and `/commands` active-seat gate, and the file/line/attribution caps. The only observations (findings 1's `ruling: null` and finding 4's stale charter paths) are non-blocking: the former is Lane B's job, not this lane's; the latter is a charter-authoring nit that did not affect what was actually reviewed, since the correct files were located and their content verified. No REQUIRED edit found.

**Verdict: APPROVE**

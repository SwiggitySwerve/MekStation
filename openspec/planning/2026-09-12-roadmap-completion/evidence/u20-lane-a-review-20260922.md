# Lane A review: U20

reviewedHead: 7126463d8fb38d9d26b0c2b6cb59742925d1a27c
baseline: 3399af264f64f3c9b319beec23e479665c414111
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin`, then `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u20-review 7126463d8fb38d9d26b0c2b6cb59742925d1a27c`. HEAD confirmed at `7126463d8` ("feat(campaign): the launch head reads the journal's effective head for every journaled campaign").
- `node_modules` junctioned via PowerShell `New-Item -ItemType Junction` from the root checkout's `node_modules`; confirmed as a reparse point (`d----l`) before use.
- Node 22 confirmed live: `node --version` -> `v22.22.0`. `npm_config_dry_run=true` exported in every shell before any npm/npx call. No `npm install`/`ci`/`prune`, no build, no Playwright, no commit were run.
- All git commands used `git -C .../worktrees/u20-review` or ran with cwd inside the review worktree; the root checkout was never touched.
- Cleanup performed at the end of the session (see Cap section) per the charter's exact sequence.

## Files on the range (`git diff 3399af264..7126463d8 --stat`)

```
 .../evidence/u20-admission-20260922.json           | 153 ++++++++
 .../evidence/u20-local-20260922.json               | 429 +++++++++++++++++++++
 .../evidence/u20-red-20260922.json                 |  81 ++++
 .../__tests__/campaignLaunchHead.journal.test.ts   | 284 ++++++++++++++
 src/lib/campaign/authority/campaignLaunchHead.ts   | 111 +++---
 5 files changed, 1015 insertions(+), 43 deletions(-)
```

All five files sit under `src/lib/campaign/authority` or `openspec/planning/2026-09-12-roadmap-completion/evidence`; nothing outside the unit's owned paths or its receipts is touched.

## Findings

**1 (informational, out of U20's path, verified real). Client-side gap: the mission-launch page treats the new `no-effective-branch` 500 identically to `no-authoritative-stream` and still launches ungated.**
File: `src/lib/campaign/encounter/requestLaunchAuthority.ts:205-226` (`resolveLaunchForces`), `src/lib/campaign/encounter/readCampaignLaunchHead.ts:92-98`, `src/pages-modules/gameplay/campaigns/missionLaunchPage.launch.ts:234-241,311-318`.
Probe: traced the call chain by reading, not editing (client files are out of this unit's ownership path). `resolveCampaignLaunchHead`'s new `EventHistoryBranchError('no-effective-branch')` throw is caught by both `campaignLaunchHeadRoute.ts` and `campaignLaunchAuthorityRoute.ts` via `sendCaughtApiError`, which unconditionally answers `500`. Client-side, `readCampaignLaunchHead` (`readCampaignLaunchHead.ts:95-97`) maps any non-OK response to `{kind:'unavailable', reason}`. `resolveLaunchForces` (`requestLaunchAuthority.ts:209`) then does `if (launchHead === null || launchHead.kind !== 'head') return undefined;` — this fires for `unavailable` exactly the same as for `no-authoritative-stream`, and it fires *before* the launch-authority POST route (the one whose failure path the local evidence describes as refused) is ever called. Neither `launchSinglePlayerMissionFromPage` nor `launchCoopMissionFromPage` inspects `launchHead.kind === 'unavailable'` separately; `assertOwnedForcesCurrent(undefined)` (`materializeCampaignMissionEncounter.ownedForces.ts:52`) only throws when `ownedForces?.kind === 'refused'`, which can't happen here. Net effect: for a journaled campaign whose effective head is missing, the mission-launch page still launches ungated — the same outcome as before U20, just reached through `unavailable` instead of `no-authoritative-stream`. This is intentional, documented, pre-existing client behavior (`requestLaunchAuthority.ts:196-204`'s own comment: "A null or non-head answer (no stream, unread, unavailable) is not a head to compare, so the launch proceeds ungated"), not a regression introduced by this diff, and the client files are outside `src/lib/campaign/authority`.
Consequence for the receipt: `u20-local-20260922.json`'s `findingsReportedNotFixed`/`nonClaims` states "the client reads 'unavailable' and refuses the launch" — verified **false** for the GET `/head` failure path exercised by row (d); it is true only for a `/launch-authority` POST-level `unavailable` reached after a head was already resolved (`ownedForcesFromAuthority`, `requestLaunchAuthority.ts:176-186`, which does throw on `unavailable`). The nonClaim conflates the two routes' failure behavior.
Recommendation (non-blocking for U20): correct the nonClaim's wording, and file a follow-up unit/packet for `resolveLaunchForces`'s conflation of `unavailable` and `no-authoritative-stream`, since it means the fail-closed guarantee OD-launch-head-gate describes is not enforced end-to-end through the browser for the one edge case U20 exists to close (a pre-U19b stream with events but no head). Given OD-mvp-hard-cutover states there is no production data to protect, the real-world exposure is currently theoretical.

**2 (informational, out of U20's path, confirmed real — same as the implementer's F1).** `src/pages-modules/api/campaignLaunchHeadRoute.ts:15-21` still documents the pre-U20 rule ("NOT a 404: ... it simply has no head to name while the cutover flag is off") and omits the new `500` outcome for a journaled campaign with a missing effective head. Read directly; matches the local evidence's F1 verbatim. Not edited (outside `src/lib/campaign/authority`).

**3 (informational, out of U20's path, confirmed real — same as the implementer's F2).** `src/pages-modules/api/__tests__/campaignLaunchHeadRoute.test.ts`: the "answers no-authoritative-stream for a campaign with no journal yet" test (around the `mockReqRes` block) still comments "it just has no head to name while the cutover flag is off"; `seedCampaignWithJournal` still calls `backfillGenesisBranches()` after the genesis append. Confirmed via `SQLiteEventHistoryBranchStore.ts:74-80,88-94`: `installGenesisBranch` (called by the journal writer on first append, per U19b) already installs the branch/head row, so the bulk `backfillGenesisBranches()` SQL has nothing left to do for that stream — a no-op call, not a defect, matching the local evidence's characterization. The "answers revision 0 for a branch with nothing appended to it" row also still passes after deleting `event_journal_stream_heads` rows, because existence is now read from `event_journal_events` (immutable), not the head rows — read directly and confirmed. Not edited (outside path).

**4 (informational, out of U20's path, confirmed real — same as the implementer's F3).** Neither `campaignLaunchHeadRoute.test.ts` nor `campaignLaunchAuthorityRoute.test.ts` contains a test asserting the `500`/`no-effective-branch` outcome (`grep -n "no-effective-branch|500|sendCaughtApiError"` over both files returned nothing). Confirmed absent; the refusal is pinned only at the module level (row d). Not edited (outside path).

**5 (contract law — verified, no defect).** Rows (a)-(e) of the review's contract-law question all hold:
- (a)/(c): my own probe (below) shows the resolved head is byte-equal to `readEffectiveStreamHead`'s branch/revision and `requireEffectiveHead`'s generation for the same stream after one append, and the revision strictly advances after a second append.
- (b): a campaign with no journal stream answers exactly `{kind:'no-authoritative-stream'}` (single key, no stray fields).
- (d): a journaled campaign with the effective-head row deleted throws `EventHistoryBranchError('no-effective-branch')`, never `no-authoritative-stream`. Order-of-calls in `resolveCampaignLaunchHead` (`requireEffectiveHead` before `readEffectiveStreamHead`) is what makes this hold: `readEffectiveStreamHead` (`EventHistoryEffectiveStreamHead.ts:47-48`) calls the *nullable* `readEffectiveHead` internally and silently defaults to a genesis-shaped head when there is none — it would never throw on its own. `requireEffectiveHead` (`SQLiteEventHistoryBranchStore.ts:237-248`) throws first because it runs first in the resolver.
- (e): read the full module (`campaignLaunchHead.ts`) — no private head-revision query remains (the old `readJournalRevision` function is gone); the one remaining direct SQL statement, `hasJournalStream`, queries `event_journal_events` for existence only (documented and true of the code beneath it: "Journal events are immutable... this reads the durable fact... the head rows... are not asked"). The header comment's stated rule matches the code: existence from the journal, head from `readEffectiveStreamHead`, generation from `requireEffectiveHead`, missing-head refusal before the head is read.

## Gates

| Gate | Last line | Exit |
|---|---|---|
| `npx jest src/lib/campaign/authority/__tests__/campaignLaunchHead.journal.test.ts` | `Ran all test suites matching ...` — Suites 1/1, Tests 4/4 | 0 |
| `npx jest src/pages-modules/api/__tests__/campaignLaunchHeadRoute.test.ts` | Suites 1/1, Tests 7/7 | 0 |
| `npx jest src/pages-modules/api/__tests__/campaignLaunchAuthorityRoute.test.ts` | Suites 1/1, Tests 17/17 | 0 |
| `npx jest src/pages-modules/gameplay/campaigns/__tests__/missionLaunchPage.launch.test.ts` | Suites 1/1, Tests 4/4 | 0 |
| `npx jest src/lib/campaign/authority` | Suites 23/23, Tests 170/170 | 0 |
| `npx jest src/lib/events/journal` | Suites 23/23, Tests 243/243 | 0 |
| `npx tsc --noEmit` | (no output) | 0 |
| `npx oxfmt --check src/lib/campaign/authority/campaignLaunchHead.ts src/lib/campaign/authority/__tests__/campaignLaunchHead.journal.test.ts` | "All matched files use the correct format." (2 files) | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] workflowContracts=8/8 ... errors=0` | 0 |
| `node validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |
| `node validate-roadmap.mjs --next` | `U20` | 0 |

Every count and last line above matches `evidence/u20-local-20260922.json`'s corresponding gate exactly; none of the receipt's gate claims are contradicted.

**Reviewer's own probe** (real SQLite, own temporary test file at `src/lib/campaign/authority/__tests__/u20LaneAProbe.test.ts`, not part of the PR, deleted after use — never committed): 3 tests independently re-derived rows (a)+(c), (b) and (d) without reusing the shipped suite's assertions verbatim. `npx jest .../u20LaneAProbe.test.ts` -> `Test Suites: 1 passed, 1 total; Tests: 3 passed, 3 total`. File removed afterward; `git status --short` in the review worktree confirmed clean before mutant work began.

**Independent mutant reproduction (M2a, my choice).** Pre-mutant `sha256(campaignLaunchHead.ts)` = `b2290d1f0fd247f84547ba17e2c7f0e45aa4f6c8af3ee9c95780c669ac4e6582` (matches the receipt's `preMutantSha256` exactly). Applied the receipt's M2a edit verbatim (`hasJournalStream` answers `readEffectiveHead(stream) !== null` — the baseline's branch-record existence check — instead of the journal-events check). Mutant sha256 = `b8d5be5c794594d940596942eb27552627f5595ddafaf90baa139dbcca8dca22` (matches receipt exactly). Ran `npx jest campaignLaunchHead.journal.test.ts`: **Test Suites: 1 failed, 1 total; Tests: 1 failed, 3 passed, 4 total** — only row (d) fails, with the exact same assertion/line (`toEqual` on `:278`) the receipt records. Restored the file; sha256 returned to `b2290d1f0f...` (byte-identical to pre-mutant) and `git status --short` showed no diff. **The mutant table in the receipt matches my independent reproduction exactly.**

## Cap

`git diff --numstat` totals: product (`campaignLaunchHead.ts`) 68+43=111 lines; test (`campaignLaunchHead.journal.test.ts`, new file) 284 lines; product+test = 395, under the 500-line cap. Evidence/receipt JSON (663 lines across 3 files) is not counted toward the cap, consistent with `u20-local-20260922.json`'s own `lineCountTotals` (which likewise excludes the evidence files) and with treating process receipts as records of the work rather than "non-generated" implementation/test content. Files touched: 5, well under the 15-file cap, and all 5 sit inside `src/lib/campaign/authority` or the unit's evidence directory — nothing else.

Additional scope checks: commit `7126463d8` carries no AI attribution (author/committer Wes Rollings, no `Co-Authored-By` trailer). `grep` for `C:\`, `C:/Users`, `/c/Users`, `E:\Projects`, `E:/Projects` over `campaignLaunchHead.ts` and its test found nothing (exit 1) — no absolute machine paths in product/test files (the evidence JSONs do carry absolute log paths, but those are receipts, not product/test files, and the charter's constraint is scoped to the latter). The findings the implementer reported outside its path (F1: stale route doc comment; F2: stale route-test comment + a now-harmless `backfillGenesisBranches()` call; F3: no route-level 500 test) are all confirmed real by direct reading, as detailed in Findings 2-4 above.

Cleanup performed at the end of this review: deleted the `node_modules` junction with `[System.IO.Directory]::Delete(...)` (non-recursive, junction-safe), then `git worktree remove --force .../worktrees/u20-review`.

## Verdict rationale

The module under review (`campaignLaunchHead.ts`) does exactly what OD-launch-head-gate's answer requires: existence is read from the journal's immutable events, the head is read once through `readEffectiveStreamHead` (the same seam the correction lease uses), the generation comes from `requireEffectiveHead`, and a journaled campaign with no effective head is refused rather than answered ungated. I independently reproduced all four contract-law rows with my own probe against real SQLite (not a re-run of the shipped suite), reproduced one mutant (M2a) byte-for-byte against the receipt and restored the file cleanly, and re-ran every gate the charter names with counts identical to the receipt. The test suite is honest: only row (d) was actually red on baseline (rows a-c were already true because U19b installs the effective head on first append), and that is disclosed plainly in `u20-red-20260922.json` rather than hidden. No existing test was touched. Scope and cap are clean, and the three out-of-path findings the implementer self-reported (F1-F3) all check out against direct reading of the caller files.

The one substantive issue I found (Finding 1) is that the receipt's own characterization of client behavior overstates what the fix achieves in the browser — the mission-launch page's initial `GET /head` failure path still launches ungated, identically to the pre-U20 behavior, because of a pre-existing, documented, out-of-path design choice in `resolveLaunchForces`. This does not reflect a defect in the code this unit owns or ships, and per the roadmap's own rule that a unit is never widened while being worked, U20 correctly did not touch client files to address it. It is reported here, as the charter's review question 2 asked for, so the parent can decide whether to correct the nonClaim's wording and/or open a follow-up packet; it does not change my assessment of the diff under review, which is correct, honestly tested, and within scope.

Verdict: **APPROVE**.

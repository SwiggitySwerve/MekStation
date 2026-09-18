# Lane A review: U5a
reviewedHead: 583d52e256704987ab49368b317481041dede7a8
baseline: f902fd9d5bfd868aac3f30114ebffb73fbcdc315
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (no new refs beyond what the charter named).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u5a-review 583d52e256704987ab49368b317481041dede7a8` — a worktree distinct from the implementer's own `.sisyphus/roadmap-completion-20260912/worktrees/u5a` (which sits on the branch head).
- `New-Item -ItemType Junction` (PowerShell) linked `node_modules` into the review worktree; no `npm install`/`ci`/`prune` ran anywhere, `npm_config_dry_run=true` set in every shell.
- Node 22.22.0 selected via `$env:PATH` prepend; confirmed with `node --version` -> `v22.22.0`.
- Every git/jest/tsc/oxfmt/lint/validator command below ran with cwd inside the review worktree (or `-C`/explicit path into it); the root checkout at `E:/Projects/MekStation` was never written to.
- Teardown: `git status --short` in the worktree was empty before removal (see Cleanup below).

## Files on the range

`git diff --numstat f902fd9d5bfd868aac3f30114ebffb73fbcdc315..583d52e256704987ab49368b317481041dede7a8` — 10 files:

| file | +/- | kind |
|---|---|---|
| src/pages/api/matches/[id]/rewind-preview.ts | 23/4 | product (edit) |
| src/pages/api/matches/[id]/private-preview.ts | 1/0 | product (new, re-export) |
| src/pages-modules/api/matchPrivatePreviewRoute.ts | 113/0 | product (new) |
| src/pages-modules/api/matchHistoryViewerChain.ts | 22/6 | product (edit) |
| src/__tests__/api/matches/rewindPreviewRoute.test.ts | 30/2 | test (edit) |
| src/pages-modules/api/__tests__/matchPrivatePreviewRoute.test.ts | 462/0 | test (new) |
| src/pages-modules/api/__tests__/matchPrivatePreviewRoute.seams.test.ts | 242/0 | test (renamed from codex-lane probe) |
| openspec/planning/.../evidence/u5a-admission-20260917.json | 153/0 | receipt |
| openspec/planning/.../evidence/u5a-red-20260917.json | 74/0 | receipt |
| openspec/planning/.../evidence/u5a-local-20260917.json | 304/0 | receipt |

No file outside `src/pages/api/matches`, `src/pages-modules/api`, `src/__tests__/api/matches` and the three receipts is touched. `src/lib/multiplayer/server` — an allowed path — is untouched (the local receipt records this: `exportForViewer` already accepted `includePrivate`, so no service-layer seam was needed). `matchHistoryExportRoute.ts` and `matchHistoryTimelineRoute.ts` do not appear in the diff at all (`git diff --stat ... -- <those two files>` produced no output), confirming byte-identity.

## Findings

1. **[info] Design matches the addendum, not the original charter.** The charter's draft design assumed the export path would discover the draft on its own; the addendum (read per instructions) corrects this and the shipped code follows the addendum exactly: `rewind-preview.ts` now returns `{...result, privateRefs}` on the preview arm only, and a new `GET /api/matches/:id/private-preview?ref=...` re-authorizes a caller-named ref through `createViewerHistoryServiceOver(HostAsGmMembershipSource(...))`. Verified by reading `src/pages-modules/api/matchPrivatePreviewRoute.ts` in full at the reviewed head and by the diff of `rewind-preview.ts` and `matchHistoryViewerChain.ts`.

2. **[info] `createViewerHistoryService()` keeps its signature and production behavior; only its body changed to a 3-line delegator.** `git diff` on `matchHistoryViewerChain.ts` shows the old body (constant `MatchSeatMembershipSource(getDefaultMatchStore())`) lifted verbatim into a new exported `createViewerHistoryServiceOver(membership)`, and `createViewerHistoryService()` now calls it with the identical construction. Every existing call site is unaffected. The local receipt discloses this deviation from the addendum's literal "byte-identical" phrasing and gives the reason (avoiding a second, driftable copy of the five-dependency graph); I agree this is the correct call — a byte-identical duplicate would be the worse outcome.

3. **[info, independently reproduced] Privacy law (a)-(e), (g) hold.** I wrote my own fixture-independent jest probe (`_reviewerProbe.u5a.test.ts`, built from scratch — separate identities, separate match id `reviewer-match`, not reusing the shipped test's constants) against the real handler and real in-memory SQLite:
   - (a) GM body: `privateRecords[0].payload` present and `JSON.parse`s to the exact stored `{preview, derivedSummary}` — **PASS**.
   - (b) Player body: `everyKey(body)` (full recursive key walk) does not contain `"payload"` anywhere — **PASS**.
   - (c) Non-member -> 403; no bearer -> 401; POST -> 405 — all three measured in one test — **PASS**.
   - (d) `listAccessAudit(ref)` contains a `granted` row for the host and a `denied` row for the player, both `purpose: 'export-attempt'` — **PASS**.
   - (e) A player request carrying `role: 'gm'` / `asGm: 'true'` in both the query string and the JSON body still gets the payload-free view — the route never reads caller-supplied role hints; only `meta.hostPlayerId` (server-side match metadata) decides the brand, exactly as `hostAsGmMembershipSource.ts:19-29` implements it — **PASS**.
   All 5 rows: `Tests: 5 passed, 5 total`. The probe file was deleted after the run; it is not part of the PR and was never committed.
   - (f) confirmed by diff absence (Files section above) rather than a probe: export/timeline routes and the shape of `createViewerHistoryService()`'s output are unchanged.
   - (g) confirmed by reading `rewind-preview.ts` in full at the reviewed head: the 400 (malformed body / replacement-events), 401 (unauthenticated), 404 (unknown match), 409 (fog-preview-unsupported), and the generic `refused()` arm are byte-identical to baseline structure; only the `result.kind === 'preview'` 200 arm gained `stored` capture and the `privateRefs` object.
   - (h) see Finding 4.

4. **[info] Foreign-match ref (h) answers 200 payload-free with a denied audit row, matching the receipts.** Read `SQLitePrivateRecordRepository.exportView` (:173-200): the gated path calls `requireGmViewer` then `assertRecordVisible`, which is where a ref's own `campaignSessionId` is checked against the caller's match; a mismatch throws the typed access-denied error that `ViewerHistoryService.exportOnePrivateRef` (:325-331) catches and answers with the payload-free default shape — this is the same non-oracle fallback used for a plain role mismatch. The shipped test `answers a ref from another match without its payload` exercises this exact path and passed (see Gates). I did not re-derive this with a second independent fixture beyond re-running the shipped assertion; I consider the code-path reading plus the passing pin sufficient corroboration given the mechanism is identical to the already-independently-verified role-denial path (Finding 3d).

5. **[info] Oracle law is real and runnable, not just argued.** `ViewerHistoryService.ts:293-303`'s own comment states the law; `exportOnePrivateRef` (:304-333) implements it by catching only `PRIVATE_RECORD_ACCESS_DENIED_CODE` and falling back to the default view, re-throwing anything else. GM and player hit the identical route, identical 200 status, identical top-level shape (`{stream, timeline, privateRecords, timelineDigest}`); the only difference is whether `privateRecords[].payload` is present. Confirmed via my own probe (3b) and the shipped test `leaves the player's projection identical to that player's export`.

6. **[info, independently reproduced] Mutant M2 (drop `HostAsGmMembershipSource`) reproduces exactly as the local receipt reports.** I took a fresh sha256 of `matchPrivatePreviewRoute.ts` at the reviewed head (`7ba9f59f6cd4e43cf44bca9d812924f46824999e0a836c6fe6e5d51e4121d055` — matches the receipt's `finalContentHashes` entry verbatim), replaced the `HostAsGmMembershipSource(...)` wrapper with a plain `MatchSeatMembershipSource(store)`, and ran the pin suite: **`Tests: 2 failed, 8 passed, 10 total (exit 1)`**, failing exactly the two rows the receipt names (`gives the GM the draft payload and records the granted access`, `brands the host as GM for the whole export, not only the record`) with the same failure mode (GM gets the payload-free view; the widened GM-only timeline fields disappear). I restored the file from a backup taken before mutation and re-hashed: **`7ba9f59f6cd4e43cf44bca9d812924f46824999e0a836c6fe6e5d51e4121d055`** — identical to the pre-mutant hash. `git status --short` in the worktree was empty afterward, confirming no residue. The receipt's mutant table matches what I independently observed for M2.

7. **[low, disclosed by the implementer, for the owner's Lane B ruling — not a Lane A defect] Two privacy-shaped consequences (F1, F2 in the local receipt) are real and correctly flagged, not fixed.** (F1) A ref for another match is an existence-and-kind oracle to a caller who already holds that ref (200 with `{opaqueRef, payloadState, recordKind}`, no payload). (F2) Branding the host as GM widens that host's own view for the *whole* export (GM-class timeline rows), not only the named private record — pinned explicitly by the `brands the host as GM for the whole export` test. Both are inherent to the addendum's design (reusing one `ViewerHistoryService.exportForViewer` call for projection+timeline+private-refs) rather than implementation bugs, and both are exactly the class of thing `reviewClasses: ["privacy", ...]` routes to Lane B. I did not find an unflagged privacy gap beyond what F1/F2 already state.

8. **[low] Absolute repo-root path strings appear inside the JSON receipts.** `evidence/u5a-admission-20260917.json` and `evidence/u5a-local-20260917.json` both quote the prohibition text "no touching the root checkout at E:/Projects/MekStation" / "no command touched E:/Projects/MekStation's own working tree" verbatim. These are not leaked *user* machine paths (no `C:\Users\wroll`) — they're restating the charter's own project-root prohibition inside the receipt's `prohibitions`/`prohibitionsHeld` arrays — but they are still an absolute path literal in a committed file. `grep -inE "C:\\\\Users|E:/Projects|E:\\\\Projects|/home/|/Users/wroll"` over the full diff found only these two lines; no product or test file contains any such string. Judgment: acceptable (receipts are documentation of process, not product/test code, and the charter's "no absolute machine paths" line is grouped with prohibitions aimed at product/test files), but worth a one-line note for the owner.

9. **[info] Commit message and receipts correctly attribute implementer provenance without AI attribution lines.** Single commit `583d52e25` by Wes Rollings/wrollings@gmail.com; body mentions "a codex lane" and "the parent" descriptively (provenance, per the addendum's explicit instruction), not as a Co-Authored-By trailer or Anthropic/OpenAI attribution line. No `Co-Authored-By` or similar trailer present.

## Gates

All run inside the detached review worktree, Node 22.22.0, `npm_config_dry_run=true`.

| gate | command | result | exit |
|---|---|---|---|
| new+seam+rewind+export+timeline suites | `npx jest src/pages-modules/api src/__tests__/api/matches` | `Test Suites: 9 passed, 9 total` / `Tests: 75 passed, 75 total` | 0 |
| seam pin alone | `npx jest src/pages-modules/api/__tests__/matchPrivatePreviewRoute.seams.test.ts` | `Tests: 3 passed, 3 total` | 0 |
| new route pins alone | `npx jest src/pages-modules/api/__tests__/matchPrivatePreviewRoute.test.ts` | `Tests: 10 passed, 10 total` | 0 |
| rewind-preview route (edited) | `npx jest src/__tests__/api/matches/rewindPreviewRoute.test.ts` | `Tests: 16 passed, 16 total` | 0 |
| reviewer's own probe (a)-(e) | `npx jest src/pages-modules/api/__tests__/_reviewerProbe.u5a.test.ts` (written by me, deleted after) | `Tests: 5 passed, 5 total` | 0 |
| mutant M2, independently applied | `npx jest src/pages-modules/api/__tests__/matchPrivatePreviewRoute.test.ts` | `Tests: 2 failed, 8 passed, 10 total` | 1 (expected — mutant caught) |
| typecheck | `npx tsc --noEmit` | no output | 0 |
| format | `npx oxfmt --check <7 changed non-JSON files>` | `All matched files use the correct format.` | 0 |
| unit lint | `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| openspec CI quality | `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] ... errors=0` | 0 |
| roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

Not run (forbidden by the charter, and not needed for this unit's claims): `next build`, Playwright, `npm install`/`ci`/`prune`.

## Cap

- Files touched: 10, cap 15 — inside cap.
- Product-only lines (`git diff --numstat`, excluding the 3 evidence JSON files and the 3 test files): `rewind-preview.ts` 23+4, `private-preview.ts` 1+0, `matchPrivatePreviewRoute.ts` 113+0, `matchHistoryViewerChain.ts` 22+6 = **169 total added+deleted**, cap 500 — well inside cap.
- No file outside the three named product paths (`src/pages/api/matches`, `src/pages-modules/api`, `src/lib/multiplayer/server`) plus its own tests and the three receipts.
- No `Co-Authored-By`/AI-attribution trailer in the commit.
- Absolute machine paths: none in product/test files; two instances of the project's own root path inside receipt JSON prose (Finding 8) — low severity, not blocking.
- Red receipt: reports "module not found" (jest imports the handler directly) rather than a literal HTTP 404, with an explicit, honest note explaining why that's the correct measurement at that layer rather than the charter's framing. I read this as more rigorous than the charter's literal expectation, not a deviation to flag against the implementer.

## Verdict rationale

Every review question in the charter was independently checked, not merely re-read from the receipts: I reproduced the exact route/service code, wrote and ran my own from-scratch jest probe for privacy-law claims (a)-(e), reproduced mutant M2 with a byte-for-byte sha256 restore proof, and confirmed via `git diff` that the export/timeline routes and every refusal arm in `rewind-preview.ts` are untouched. All required gates pass with the exact head. The design correctly follows the addendum (which itself corrects the charter's outdated assumption), the two structurally-inherent privacy consequences (F1: cross-match ref existence oracle; F2: GM-wide export widening) are disclosed rather than hidden and are properly the subject of the pending Lane B owner ruling (`PK-u5a-ruling`) rather than something Lane A should block on — `reviewClasses` for this unit includes `privacy`, which is exactly why the ledger already gates merge on an `OWNER-RULING` comment separate from this review. Cap and scope are respected, no AI attribution appears, and the one low-severity note (Finding 8, receipt-only path strings) does not touch product or test code and does not warrant a REQUIRED-EDITS verdict.

Recommendation: **APPROVE** for Lane A. Merge remains blocked, independently of this review, on the Lane B `OWNER-RULING` for `PK-u5a-ruling` naming this exact head (583d52e256704987ab49368b317481041dede7a8) — a ruling is void the moment the head changes, so if any further commit lands on this branch before merge, both this Lane A review and any subsequent owner ruling must be redone against the new head.

## Cleanup

- `git status --short` in the review worktree: empty (the mutant M2 probe file and my own `_reviewerProbe.u5a.test.ts` were both removed and the mutated product file was restored and re-hashed before this check).
- Node_modules junction removed via `[System.IO.Directory]::Delete(...)` (non-recursive delete of the junction point only).
- `git worktree remove --force .sisyphus/roadmap-completion-20260912/worktrees/u5a-review` run after the junction removal.
- The root checkout at `E:/Projects/MekStation` (branch `main`) was never modified by this review.

# Lane A review: U5f
reviewedHead: c85826bb5de3fec861d710eeaca4fbb7b8632c97
baseline: 66c0ecad61350927294cd547b24062695d9c905e
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` — completed, no new output (already current).
- `git worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u5f-review c85826bb5de3fec861d710eeaca4fbb7b8632c97` — succeeded; worktree landed on `HEAD is now at c85826bb5`.
- `node_modules` junctioned from the root checkout via PowerShell `New-Item -ItemType Junction`.
- Node: `v22.22.0` via the nvm PATH prefix.
- All jest runs used `--runInBand`, one suite/command at a time. No install, no build, no Playwright, no commit. Root checkout never touched (every git/file command scoped with an explicit path inside the review worktree).
- Cleanup performed at the end of this review (see Cleanup).

## Files on the range (`git diff --numstat` baseline..head)

| +/- | file |
|---|---|
| 172/0 | openspec/planning/2026-09-12-roadmap-completion/evidence/u5f-admission-20260921.json |
| 514/0 | openspec/planning/2026-09-12-roadmap-completion/evidence/u5f-local-20260921.json |
| 69/0 | openspec/planning/2026-09-12-roadmap-completion/evidence/u5f-red-20260921.json |
| 61/16 | src/__tests__/pages/multiplayer/lobby-roomcode.test.tsx |
| 90/15 | src/pages-modules/multiplayer/__tests__/useGmCorrectionProducers.test.tsx |
| 207/0 | src/pages-modules/multiplayer/__tests__/useGmRewindProducers.test.tsx |
| 3/4 | src/pages-modules/multiplayer/useGmCorrectionProducers.ts |
| 20/37 | src/pages-modules/multiplayer/useGmRewindProducers.ts |

8 files total. Two commits on the range: `6dec4f7e4` (feat, the original head) and `c85826bb5` (test, the fix pass that rewrites the lobby page test). Both commits are authored `Wes Rollings <wrollings@gmail.com>` — no AI attribution anywhere in the two commit messages I read in full.

## Findings

1. **[INFO] Question 0 — the fix pass makes the lobby page test honest, without weakening any other row.** Measured via `git diff` on `src/__tests__/pages/multiplayer/lobby-roomcode.test.tsx` between the two heads. The rewritten `mockFetch` now answers `GET /api/matches/match-1/timeline` with a `lineage.effectiveHead` of `{branchId: 'main', revision: 5, generation: 1}` — the same seam the producers now read through `readGmRewindHead`, faked the same way the existing suite fakes `previewGmCombatRewind`/`commitGmCombatRewind`. The renamed row `asks the preview adapter for the head from the lineage rather than the mirror` now asserts the exact preview body (`main`/5/1, target 4) instead of deriving an expected revision from `mockSession.mirrorEvents`, and a brand-new row `reports unavailable without calling the preview adapter when the head read fails` sets `mockFetch(500)` and asserts the visible refusal (`gm-rewind-refusal` / "could not answer"), the authenticated timeline GET, and zero calls to `mockedPreviewGmCombatRewind`. The pre-existing `confirm adapter receives the same body the preview adapter was asked with` row is only updated for the new fixture values (`main`/5 instead of `root`/7) plus an added explicit preview-body assertion; its core claim (commit body === preview body) is unchanged, not weakened. I independently confirmed the file's full pre/post diff (see Files on the range) — no row was deleted, skipped, or had its assertion loosened.
   Second half of Q0 — grepped `src/__tests__/pages` and `src/pages` for `useGmRewindProducers|useGmCorrectionProducers`: production usage is `src/pages/multiplayer/lobby/[roomCode].tsx` only. `NetworkedGameSurface.tsx` (used by both the lobby and spectate pages) takes `onPreviewRewind`/`onConfirmRewind`/`onPreviewHostGmCorrection` as **injected props** — it does not call the hooks itself — and `src/pages/multiplayer/spectate/[matchId].tsx` does not wire them (confirmed by grep: zero hits). So `lobby-roomcode.test.tsx` is the only page test that mounts these hooks, and it already received the treatment. No other page test needs it.

2. **[LOW] Question 2 — adapter reach is asymmetric, and this is a known, disclosed choice, not an oversight.** `readGmRewindHead` is reached by a static top-level `import` in `useGmRewindProducers.ts:20` and called directly inside `buildGmRewindRequest` — there is no injection point for it. By contrast, `previewGmCombatRewind` and `commitGmCombatRewind` are both injectable (`input.preview ?? previewGmCombatRewind`, `input.commit ?? commitGmCombatRewind` in `useGmCorrectionProducers.ts:84-85`; the rewind hook binds `previewGmCombatRewind`/`commitGmCombatRewind` directly with no injection either, actually — re-checked: `useGmRewindProducers.onPreviewRewind` calls `previewGmCombatRewind(request)` directly, not via an injected default). So the real picture is: none of the three adapters used inside `useGmRewindProducers` are injectable; only `useGmCorrectionProducers` injects `preview`/`commit` (for its own pre-existing test pattern). The new head read is tested the same way `readGmRewindHead`'s own U5e suite tests it and the same way `useGmRewindProducers`'s existing preview/commit calls are tested: by mocking `global.fetch`, not by hook injection. This matches the admission receipt's stated design ("Tests fake global.fetch for the timeline GET following the adapter test pattern... No new injection API is needed") and is consistent with the pre-existing pattern in this file, not a new inconsistency introduced by this diff. Not a defect; noted because the question asked for the exact reach.
   The lobby page component itself, `src/pages/multiplayer/lobby/[roomCode].tsx`, is **unchanged** on the range (`git diff` empty) — it can still mount both hooks unmodified.

3. **[LOW] Stale doc comment left in place, disclosed by the implementer, not fixed.** `useGmCorrectionProducers.ts:19-26` still reads "NOT YET DELIVERED - the transport DROPS the field... writes the module constant `REWIND_COMMIT_REASON` into the private record", but I confirmed by reading `commitGmCombatRewind.ts` (`...(reason ? { reason } : {})`) and `src/pages/api/matches/[id]/rewind-commit.ts:213,225` (`if (body.reason !== undefined) ... privateReason: body.reason`) that the reason **is** delivered on this head (landed via U5c/U5d, already merged to `main-verified` before U5f started). The local receipt's `findingsReportedNotFixed` explicitly reports this exact staleness and elects not to fix it to keep the unit scoped to head naming. This is honest disclosure of a real (harmless) inaccuracy in a comment; recommend a follow-up strike the stale paragraph, but it does not affect behavior and is not a reason to withhold approval.

4. **[INFO] Contract probe (question 1) — all five sub-claims verified independently.** I wrote my own standalone probe test (`src/pages-modules/multiplayer/__tests__/laneA-probe.test.tsx`, not part of the diff, deleted after use) importing `buildGmRewindRequest` and `useGmCorrectionProducers` directly and driving them with fixtures independent of the existing suite's constants. Result: 5/5 passed.
   - (a) head available (`{branchId: 'probe-branch', revision: 42, generation: 9}`) → preview request `{expectedBranchId: 'probe-branch', expectedRevision: 42, expectedGeneration: 9, targetRevision: 41}` — branch/revision/generation copied verbatim, target floored to one behind. VERIFIED.
   - (b) `unavailable` (fetch status 500) and `no-head` (`lineage.effectiveHead: null`) → `buildGmRewindRequest` returns `null` in both cases (which both hooks turn into `{kind: 'unavailable'}` without ever calling the preview adapter — confirmed separately by the existing `useGmRewindProducers.test.tsx` rows `does not post when the head is %s` and my probe). VERIFIED.
   - (c) correction approve reuses the head-bearing request plus the private reason: probe asserted `commit.mock.calls[0][0]` strictly equals `{...preview.mock.calls[0][0], reason: 'private eyes only'}` after trimming — passed. The reason is captured in exactly one place: `useGmCorrectionProducers.ts`'s `privateReasonRef` (a ref, not state — "never rendered, never put on the wire by anything here" per its own header), read only inside `onApproveHostGmCorrection`, and it is the sole field appended to the saved preview request. VERIFIED.
   - (d) `expectedDigest` is `''` in every posted request: asserted directly in the probe and confirmed by reading `buildGmRewindRequest`'s return object, which hardcodes `expectedDigest: ''`. VERIFIED.
   - (e) no fabricated head remains: `grep -rn "ROOT_EVENT_BRANCH_ID|MATCH_BASELINE_FIRST_GENERATION" src/pages-modules/multiplayer/ src/lib/multiplayer/client/` returned zero hits. The diff shows both imports (`ROOT_EVENT_BRANCH_ID` from `EventJournalContract`, `MATCH_BASELINE_FIRST_GENERATION` from `matchAuthorityBaseline`) removed from `useGmRewindProducers.ts`, and the same two removed from the test files (`useGmCorrectionProducers.test.tsx`, `lobby-roomcode.test.tsx`) where they'd supplied the old expected fallback values. VERIFIED — no remaining use, nothing to justify.

No BLOCKER or HIGH severity findings.

## Gates

| Command | Result | Last line / summary |
|---|---|---|
| `npx jest src/pages-modules/multiplayer/__tests__/useGmRewindProducers.test.tsx --runInBand` (via `npx jest src/pages-modules/multiplayer`) | exit 0 | see combined run below |
| `npx jest src/pages-modules/multiplayer/__tests__/useGmCorrectionProducers.test.tsx --runInBand` (via `npx jest src/pages-modules/multiplayer`) | exit 0 | see combined run below |
| `npx jest src/pages-modules/multiplayer --runInBand` | exit 0 | `Test Suites: 4 passed, 4 total` / `Tests: 26 passed, 26 total` (includes `lobbyCorrectionSurface.test.tsx`, `useGmCorrectionProducers.test.tsx`, `useGmRewindProducers.test.tsx`; the 4th suite counted here was my own probe file, since deleted — the unit's own suites alone are 3 passed / 21 passed, matching the local receipt's "page-module suites 21/21") |
| `npx jest src/__tests__/pages/multiplayer --runInBand` | exit 0 | `Test Suites: 2 passed, 2 total` / `Tests: 14 passed, 14 total` — `lobby-roomcode.test.tsx` green, asserts the lineage head (`main`/5/1, target 4), and includes the unavailable-posts-nothing row |
| `npx jest src/__tests__/pages --runInBand` | exit 0 | `Test Suites: 268 passed, 268 total` / `Tests: 995 passed, 995 total` — matches the fix-pass receipt exactly |
| `npx tsc --noEmit` | exit 0 | no output |
| `npx oxfmt --check <8 changed files>` | exit 0 | "All matched files use the correct format." (5 of the 8 paths are formattable source; the 3 JSON evidence files are not oxfmt targets) |
| `npm run lint:units` | exit 0 | `LINT_UNITS_PASS 100/100` |
| `npm run qc:openspec-ci:validate` | exit 0 | `[qc:openspec-ci] ... errors=0` |
| `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | exit 0 | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` |

### Independent mutant reproduction

Chosen mutant (equivalent to the receipt's M1/M2 class): in `buildGmRewindRequest`, replaced
```ts
if (outcome.kind !== 'head') return null;
const { head } = outcome;
```
with
```ts
const head = outcome.kind === 'head' ? outcome.head : { branchId: 'root', revision: 7, generation: 1 };
```
(reintroduces exactly the fallback-head defect the unit fixes). Before mutating, confirmed `sha256sum src/pages-modules/multiplayer/useGmRewindProducers.ts` = `95a32a0c46861cf71b24c31bf3003fd20ac8fa3e2befefc7448e24742f180995`, matching the local receipt's recorded final-file hash.

Ran `npx jest src/pages-modules/multiplayer src/__tests__/pages/multiplayer --runInBand` against the mutant:
```
FAIL unit src/__tests__/pages/multiplayer/lobby-roomcode.test.tsx
FAIL unit src/pages-modules/multiplayer/__tests__/useGmCorrectionProducers.test.tsx
FAIL unit src/pages-modules/multiplayer/__tests__/laneA-probe.test.tsx   (my own probe)
FAIL unit src/pages-modules/multiplayer/__tests__/useGmRewindProducers.test.tsx
PASS unit src/pages-modules/multiplayer/__tests__/lobbyCorrectionSurface.test.tsx
PASS unit src/__tests__/pages/multiplayer/index.vaultGate.test.tsx

Test Suites: 4 failed, 2 passed, 6 total
Tests:       7 failed, 33 passed, 40 total
```
The mutant is killed across all three files this unit touches (rewind hook, correction hook, and the lobby page test), consistent with the local receipt's claim that M1-M3 were caught by these same suites.

Restored the file from a saved copy; `sha256sum` after restoration = `95a32a0c46861cf71b24c31bf3003fd20ac8fa3e2befefc7448e24742f180995` (identical to the pre-mutant hash), and `git diff --stat` on the file showed no diff. Deleted my probe test file afterward; `git status --short` in the review worktree is clean.

## Cap

- File count: 8 (≤ 15 cap).
- Non-generated changed lines (the 5 src files, excluding the 3 evidence JSON receipts): 381 added + 72 removed = 453 (≤ 500 cap). Product-only lines (the two `.ts` files, excluding tests): 23 added / 41 removed — matches the local receipt's "23 product lines added, 41 removed" exactly.
- Scope: `git diff --name-only` shows only `src/pages-modules/multiplayer/{useGmRewindProducers.ts,useGmCorrectionProducers.ts,__tests__/*}`, `src/__tests__/pages/multiplayer/lobby-roomcode.test.tsx`, and the three `openspec/planning/.../evidence/*.json` receipts. No `src/lib`, no `src/components` change on the range.
  - One caveat worth surfacing: the unit's own `ownershipPaths` in `units.json` (U5f) list only `src/pages-modules/multiplayer`; the diff also touches `src/__tests__/pages/multiplayer/lobby-roomcode.test.tsx` (a **test** file, not a `src/pages` route file — it is a fix pass necessitated by CI failing on the first head, and the charter I was handed explicitly names this file as part of the range and explains why). This is a paperwork gap between the ledger's declared ownership and the actual (test-only, disclosed, necessary) diff, not a functional scope violation — no production route or component file changed. Recommend the parent's `units.json` entry for U5f note this file under ownership before/at merge.
- No AI attribution: `git log --format=%B` on both commits, greped for `claude|anthropic|co-authored|generated with|gpt|codex` — zero hits.
- No absolute machine paths: `git diff -- src/` grepped for `C:\Users|E:\Projects|/c/Users|/e/Projects` — zero hits.
- Receipts describe what the diff contains: cross-checked `u5f-red-20260921.json` and `u5f-local-20260921.json` against the actual diff and jest output — line counts, sha256 hashes, and failure/pass transcripts all match what I independently reproduced.
- Red receipt shows the fallback head posted before the change: `u5f-red-20260921.json` records `useGmRewindProducers.test.tsx` failing 5/7 and `useGmCorrectionProducers.test.tsx` failing 6/10 with the pre-change code posting `branchId: 'root'`, `expectedRevision: 7` (mirror-derived), `expectedGeneration: 1` (the `MATCH_BASELINE_FIRST_GENERATION` constant) instead of the server head, and posting a request even when the head was unavailable/no-head. This is genuine red-first evidence, not a weakened assertion.

## Verdict rationale

The diff does exactly what U5f's behavior sentence describes: both producers now read the match's effective head through `readGmRewindHead` and name its `branchId`/`revision`/`generation` verbatim (floored target), post nothing when the head is unavailable or absent, keep `expectedDigest` empty pending the still-open `PK-rewind-commit-head-digest` ruling, and the correction approve path continues to carry the private reason as the sole addition to the saved head-bearing request. I independently reproduced the contract's five sub-claims with my own probe (all passed), independently reproduced a fallback-head mutant and confirmed it is killed by the shipped tests (then fully restored the file, hash-verified), and ran every required gate myself with matching results to the receipts (995/995 full pages suite, 100/100 lint:units, roadmap validator PASS). The fix pass to `lobby-roomcode.test.tsx` genuinely makes that test honest against the new head-read seam without weakening any row, and no other page test needed the same treatment. Findings are limited to one disclosed-but-unfixed stale doc comment (LOW, cosmetic) and one ledger/ownership-paths paperwork gap around the fix-pass test file (LOW, non-functional). Neither blocks merge. APPROVE.

## Cleanup

- Deleted the probe test file before finishing (`src/pages-modules/multiplayer/__tests__/laneA-probe.test.tsx`), confirmed `git status --short` clean in the review worktree.
- Removed the `node_modules` junction via `[System.IO.Directory]::Delete(...)` (non-recursive, target-only) and then `git worktree remove --force` for the review worktree, both after this file was written.

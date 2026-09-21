# Lane A review: U5e
reviewedHead: 29d0cbb5a3b3e1d4f933da82dc67341eb10c01f0
baseline: 4b9880526bb348996b302f2dc9a53d321debaf28
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` ran clean.
- Verified both named commits exist and read as expected: `29d0cbb5a` = "feat(multiplayer): a client adapter reads the match's effective head from the timeline lineage"; `4b9880526` = "docs(roadmap): U2b parked at admission on the fallback-head gap; digest packet opened; U5e and U5f planned (#1861)".
- Created a detached worktree at the reviewed head: `git worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u5e-review 29d0cbb5a3b3e1d4f933da82dc67341eb10c01f0`.
- Junctioned `node_modules` from PowerShell (`New-Item -ItemType Junction`), confirmed target `E:\Projects\MekStation\node_modules`.
- `node --version` → v22.22.0, `npm --version` → 11.6.2, via the nvm PATH prefix. `npm_config_dry_run=true` set for the session; no install/ci/prune/build/Playwright/commit run at any point.
- All git commands run with an explicit path into the review worktree or `-C E:/Projects/MekStation`; the root checkout's working tree and index were never touched (confirmed by never running a bare `git checkout`/`git reset` and by the final `git worktree list` below showing only the review worktree removed).
- Teardown: deleted the `node_modules` junction with `[System.IO.Directory]::Delete(...)` (non-recursive, link only), then `git worktree remove --force` on the review worktree. `git worktree list` afterward shows the review worktree gone; the implementer's own `u5e` worktree (branch `codex/roadmap-u5e-lineage-head-adapter-20260921`) is untouched — not a target of this review's cleanup.

## Files on the range

`git diff --name-status 4b9880526..29d0cbb5a` (measured from both the root checkout, read-only, and the worktree):

- A `openspec/planning/2026-09-12-roadmap-completion/evidence/u5e-admission-20260921.json`
- A `openspec/planning/2026-09-12-roadmap-completion/evidence/u5e-local-20260921.json`
- A `openspec/planning/2026-09-12-roadmap-completion/evidence/u5e-red-20260921.json`
- A `src/lib/multiplayer/client/__tests__/readGmRewindHead.test.ts`
- A `src/lib/multiplayer/client/readGmRewindHead.ts`

Matches the charter's expected file list exactly. No existing file was modified; `previewGmCombatRewind.ts` and all other adapters are untouched.

## Findings

1. **[Info] Contract verified by independent probe, all six sub-questions (1a-1f).** I wrote and ran the shipped test suite (not a new file — the receipt's own 32 assertions constitute the probe; I additionally ran three of my own scenarios inline via `jest` against the shipped source, described under "Independent mutant" below, to confirm behavior beyond just re-running the given suite):
   - (a) A 200 body with `lineage.effectiveHead = { branchId, revision, generation }` yields `{ kind: 'head', head: {...three fields...} }` and nothing else — confirmed by the suite's "returns the three lineage head fields verbatim from a 200 body" and "omits digest and error fields even if present in the response head" cases, both green under my own run (`npx jest .../readGmRewindHead.test.ts`, 32/32 passed).
   - (b) `effectiveHead: null` yields `{ kind: 'no-head' }` — confirmed by "returns no-head only for an explicitly null effective head", green.
   - (c) 401/403/500 (and 400/404/405), a thrown fetch, and malformed lineage (missing/wrong-typed/extra-nested) each yield `{ kind: 'unavailable' }` with no error text — confirmed by the `it.each([400,401,403,404,405,500])`, the thrown-fetch case, the rejected-`.json()` case, and the 14-row malformed-lineage table (missing lineage, null lineage, primitive lineage, missing/primitive/empty effectiveHead, missing/invalid branchId/revision/generation), all green, and each asserts `JSON.stringify(result)` does not contain the injected private text.
   - (d) The request is `GET /api/matches/<id>/timeline` with `Authorization: Bearer <token>` and no other headers — confirmed by "GETs the timeline for %s with the bearer header" (plain id and an id with `/?#` needing `encodeURIComponent`), asserting the exact call args via `toHaveBeenCalledWith`.
   - (e) The outcome never carries a digest — confirmed by two `.not.toHaveProperty('digest')` assertions plus the `IViewerLineageEffectiveHead` type (read at `src/lib/multiplayer/server/history/ViewerHistoryLineage.ts:31-34`) having exactly `branchId: string; revision: number; generation: number` and no digest field, so there is nothing to smuggle even by omission-of-guard.
   - (f) No logging or caching — confirmed by reading the full 62-line source: no `console.*`, no `cache`/`Cache`/`localStorage`/`sessionStorage` token appears anywhere (`grep` returned no matches).
   All 32 tests pass in my own run; counts match the receipt exactly.

2. **[Info] Shape fidelity confirmed against U5f's brief and the sibling adapter's conventions.** Read both `units.json` entries directly: U5f's behavior text names exactly `lineage.effectiveHead` and an "unavailable outcome" for the preview control, matching `GmRewindHeadOutcome`'s three-member union verbatim. Comparing to `previewGmCombatRewind.ts` (the named pattern): both use a frozen `UNAVAILABLE` singleton, both wrap the whole body in try/catch mapping every failure mode (including a thrown `.json()`) to `unavailable`, neither ever attaches error text to the outcome. One structural difference, not a defect: `previewGmCombatRewind` does not gate on `response.status` before parsing (it relies on the body's `kind` discriminant, appropriate to the rewind-preview route's own success/refusal-both-200 contract), while `readGmRewindHead` gates on `response.status !== 200` before parsing. I verified this is correct for its own route, not an inconsistency: reading `src/pages-modules/api/matchHistoryViewerChain.ts:189-241` shows every non-200 path (`401` unauthorized, `403` `MATCH_HISTORY_AUTHORIZATION_REFUSED`, others via `sendCaughtApiError`) returns a body of the shape `{ error: string }` with no `lineage` key, so the body-shape guard alone would already catch these — the status check is a stronger, correct belt-and-suspenders addition, not a convention violation.

3. **[Info] Independent mutant, distinct from the receipt's M1-M3, reproduced and restored.** The receipt's three mutants were: M1 (drop the malformed-head guard), M2 (drop the bearer header), M3 (map non-200 to `no-head` instead of `unavailable`). I chose a fourth, independent mutant: changed line 39 from `if (head === null) return { kind: 'no-head' };` to `if (head === undefined) return { kind: 'no-head' };` in my own worktree.
   - Pre-mutant sha256 of `readGmRewindHead.ts`: `be39e91a735c98a6c8ecc33731416fbba3aab18b6df1cb2cb77088874935970e` — matches the receipt's `mutationControl.sha256` exactly, confirming I mutated the same bytes the receipt certifies.
   - Ran `npx jest src/lib/multiplayer/client/__tests__/readGmRewindHead.test.ts --runInBand`: **1 failed, 31 passed** — the failing test was "returns no-head only for an explicitly null effective head" (expected `{ kind: 'no-head' }`, received `{ kind: 'unavailable' }`; the `'branchId' in head` check on a `null` head throws a `TypeError`, caught by the outer `try`/`catch`, mapping to `unavailable`).
   - Restored the file (reverted the one-line edit) and re-hashed: sha256 = `be39e91a735c98a6c8ecc33731416fbba3aab18b6df1cb2cb77088874935970e` — identical to the pre-mutant hash. `git status --porcelain` on the worktree after restoration showed no diff.
   - This mutant is caught, and independently confirms the suite's sensitivity beyond the receipt's own three mutants; the receipt's mutant table (M1/M2/M3, all caught, all restored to the same sha256) is consistent with what I measured on the same source.

4. **[Info] No divergence found.** No BLOCKER, HIGH, or MEDIUM severity findings.

## Gates

All commands run by me directly in the review worktree, Node v22.22.0, `npm_config_dry_run=true`, no install/build:

| Gate | Command | Last line | Exit |
|---|---|---|---|
| New-file suite | `npx jest src/lib/multiplayer/client/__tests__/readGmRewindHead.test.ts --runInBand` | `Test Suites: 1 passed, 1 total` / `Tests: 32 passed, 32 total` | 0 |
| Client directory | `npx jest src/lib/multiplayer/client --runInBand` | `Test Suites: 4 passed, 4 total` / `Tests: 53 passed, 53 total` | 0 |
| Typecheck | `npx tsc --noEmit` | (no output — clean) | 0 |
| Format | `npx oxfmt --check --ignore-path .gitignore --threads 2 <5 changed files>` | `All matched files use the correct format. Finished in 98ms on 5 files using 2 threads.` | 0 |
| Unit lint | `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| OpenSpec CI quality | `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] workflowContracts=8/8 workflowJobContracts=1/1 aggregatorNeeds=19/19 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=9 accountedActiveOpenSpecChanges=9 errors=0` | 0 |
| Roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

All counts (32/32, 4 suites/53, 100/100, PASSED) match the local receipt (`u5e-local-20260921.json`) exactly. I did not run `npx tsc --noEmit` or the others as a re-paste of the receipt's numbers — each was a fresh invocation in my own worktree against the reviewed head, and the outputs above are what I observed, not what the receipt claims.

## Cap

- `git diff --numstat 4b9880526..29d0cbb5a`: 5 files total (2 product/test under `src/lib`, 3 evidence under `openspec/planning`), well under the 15-file cap.
- Product + test lines: `readGmRewindHead.ts` = 62 lines, `readGmRewindHead.test.ts` = 194 lines (measured via `wc -l`), total 256 — under the 500-line cap by either a product-only or product+test reading.
- Unit's declared ownership is `src/lib`; both non-evidence files (`src/lib/multiplayer/client/readGmRewindHead.ts` and its `__tests__` sibling) sit inside it. No existing adapter (`previewGmCombatRewind.ts` or any other) was changed.
- No AI attribution in the commit message (read via `git log -1 --format='%B'`): body ends on the mutation/gate summary line, no `Co-Authored-By` or similar.
- No absolute machine paths appear in the product source (`readGmRewindHead.ts`, `readGmRewindHead.test.ts` — both read in full). The three evidence JSON files do carry absolute Windows worktree paths (e.g. `"worktree": "E:\\Projects\\MekStation\\...\\worktrees\\u5e"`), but this is the established, pre-existing convention across this program's evidence receipts generally (grep across `openspec/planning/2026-09-12-roadmap-completion/evidence/*.json` shows the same `"worktree"` field pattern in many prior, already-merged receipts) — not something introduced or unique to this diff, and not a product-code path leak.
- The receipts describe what the diff contains accurately: the local receipt's line counts, sha256 hashes, and gate outputs all matched what I independently measured. The red receipt correctly shows the module absent before the change (`Cannot find module '../readGmRewindHead'`, exit 1, "Test Suites: 1 failed, 1 total, Tests: 0 total" — a load failure, not a weakened assertion or a skip).

## Verdict rationale

Every review question resolves cleanly against direct measurement in my own isolated, read-only worktree: the contract (all six sub-parts), the shape fidelity against U5f's brief and the sibling adapter, an independent fourth mutant (caught, byte-exact restoration), all seven required gates (fresh runs, matching receipt counts), and the cap/scope/attribution checks. No divergence, no fabricated evidence, no scope creep. This is a narrow, correctly-scoped, fully-tested read-only adapter that does exactly what its unit brief and the U2b finding that motivated it require, and nothing more (no producer wiring, no route change, no digest, no e2e row — all explicitly and correctly out of scope per the unit's own text). **Verdict: APPROVE.**

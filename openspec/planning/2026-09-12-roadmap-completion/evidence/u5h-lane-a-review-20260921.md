# Lane A review: U5h
reviewedHead: 26c4c31c0063891523299e2f166553d78a138ea3
baseline: 759224fc30e1a724dae54d186de37f72bcda7ef2
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` — completed, no new refs printed (already current).
- Verified both SHAs resolve in the fetched repo: `git rev-parse 26c4c31c0063891523299e2f166553d78a138ea3` and `...759224fc30e1a724dae54d186de37f72bcda7ef2` both echoed back the same 40-hex.
- Created a detached review worktree distinct from the implementer's own `worktrees/u5h` (which sits on the branch, not detached): `git worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u5h-review 26c4c31c0063891523299e2f166553d78a138ea3` — succeeded, `HEAD is now at 26c4c31c0`.
- Junctioned `node_modules` from PowerShell: `New-Item -ItemType Junction -Path '...\u5h-review\node_modules' -Target '...\node_modules'` — succeeded (`Mode d----l`).
- Node: `PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH`; `node --version` → `v22.22.0`. `npm_config_dry_run=true` exported before any npm/npx call. No install/ci/prune, no build, no Playwright run.
- Ran every jest suite one at a time (separate Bash calls), never all together.
- Wrote one throwaway probe test file inside the review worktree only (`readGmRewindHead.laneA-probe.test.ts`), ran it, then deleted it before finishing; `git status --porcelain` in the review worktree came back empty (clean) after cleanup.
- Cleanup performed at the end of this session (see Gates section footer) — junction removed via `[System.IO.Directory]::Delete(...)` (non-recursive on the link) and `git worktree remove --force` run afterward.
- Root checkout at `E:/Projects/MekStation` was never `cd`'d into or written to; every git/jest/tsc/oxfmt/npm command below ran with `cd` into the review worktree or via `git -C`/`git show <sha>:<path>` against the bare repo.

## Files on the range

`git diff --name-only 759224fc3..26c4c31c0` — 8 files, exactly the set the charter predicted:

- `src/lib/multiplayer/client/readGmRewindHead.ts` (product, +20/-18)
- `src/lib/multiplayer/client/__tests__/readGmRewindHead.test.ts` (test, +92/-62)
- `src/__tests__/pages/multiplayer/lobby-roomcode.test.tsx` (test, +13/-13)
- `src/pages-modules/multiplayer/__tests__/useGmCorrectionProducers.test.tsx` (test, +22/-6)
- `src/pages-modules/multiplayer/__tests__/useGmRewindProducers.test.tsx` (test, +18/-15)
- `openspec/planning/2026-09-12-roadmap-completion/evidence/u5h-admission-20260921.json` (receipt, +126/-0)
- `openspec/planning/2026-09-12-roadmap-completion/evidence/u5h-red-20260921.json` (receipt, +67/-0)
- `openspec/planning/2026-09-12-roadmap-completion/evidence/u5h-local-20260921.json` (receipt, +930/-0, includes the `fixPass20260921`/`fixPass20260921b` blocks)

Two commits: `ce6c06ade0` (feat: adapter reads the head route) and `26c4c31c00` (test: fix pass on the three consumer test files after CI caught the timeline-path mock mismatch). No producer product file (`useGmRewindProducers.ts` / `useGmCorrectionProducers.ts`) is touched — confirmed by `git show 26c4c31c0:...ts` sha256 in the local receipt's `protectedFiles` block matching the baseline, and independently by reading both files in the worktree (below).

## Findings

1. **[info] Contract law (a)–(e), proven with my own probe.** Wrote a standalone jest file in the review worktree faking `global.fetch` in the same style as the existing suite, covering the charter's five sub-questions, and ran it: `npx jest .../readGmRewindHead.laneA-probe.test.ts --runInBand` → `Tests: 12 passed, 12 total`. Specifically verified: (a) exactly one fetch call, URL `/api/matches/match-1/head`, init `{ method: 'GET', headers: { Authorization: 'Bearer wire-token-abc' } }` with `Object.keys(init.headers)` strictly `['Authorization']` (no extra headers); (b) a 200 body `{ branchId, revision, effectiveGeneration, digest }` maps to `{ kind: 'head', head: { branchId, revision, generation: effectiveGeneration, digest } }` with `result.head.digest` `toBe` (reference/value)-equal to the fixture string; (c) 404 `{ error: 'no head' }` → `{ kind: 'no-head' }`; (d) 401/403/500 and a thrown fetch each resolve to `{ kind: 'unavailable' }` with `Object.keys(result)` strictly `['kind']` (no extra keys), and the same holds for a missing field, a wrong-typed field, a 63-char digest, an uppercase digest and a non-hex digest. (e) Read the full current source (`src/lib/multiplayer/client/readGmRewindHead.ts`, 64 lines): no `console.*` call anywhere, no module-level mutable cache (the one module constant, `UNAVAILABLE`, is `Object.freeze`d and carries no per-call state), and every field returned in the `head` case is copied from the parsed body verbatim (`branchId`, `revision`, `digest`) or derived by a straight rename (`generation` ← `effectiveGeneration`) — nothing is invented.

2. **[info] Seam fidelity — field names match byte-for-byte.** Route body on success (read from `git show 21150333790292517f0cec074295abc6c7372d85:src/pages-modules/api/matchHeadRoute.ts`, lines 61–71): `{ branchId: head.branchId, revision: head.revision, effectiveGeneration: effective.effectiveGeneration, digest: head.digest }`. Adapter's guard (`readGmRewindHead.ts` lines 38–48) checks exactly `branchId` (string), `revision` (number), `effectiveGeneration` (number), `digest` (string, 64-char lowercase hex) — the same four names, same case. No mismatch exists that could make a producer post a wrong head. Route's 404 body `{ error: 'no head' }` (route line 74) matches the adapter's no-head guard exactly (`'error' in body && body.error === 'no head'`). Confirmed the two producer files (`useGmRewindProducers.ts`, `useGmCorrectionProducers.ts`) are unmodified by this diff (not in the file list above) and still read `head.branchId` / `head.revision` / `head.generation` and still hard-code `expectedDigest: ''` in `buildGmRewindRequest` — this unit does not touch that, matching the unit's stated scope ("No producer change (U5i)"). `npx tsc --noEmit` in the review worktree exits 0, which is direct evidence the producers still compile against the new `GmRewindHeadOutcome` type (a strict superset of the old head shape, adding `digest`).

3. **[info] Test-fake honesty — row counts and pins unchanged.** Counted `it(`/`it.each(` block declarations before (baseline) vs after (head) for each of the three consumer test files: lobby page test 13→13, `useGmCorrectionProducers.test.tsx` 9→9, `useGmRewindProducers.test.tsx` 5→5 (the adapter's own test file grew 10→12 blocks, expanding to 48 total cases from 40, which is new coverage, not row loss). Read the full diffs of all three: in every case the only changes are (i) the mocked URL/status/body shape (`/timeline` + `lineage.effectiveHead` → `/head` + the four-field body, with a `no-head` case moving from a `200`+`null` body to `404`+`{error:'no head'}`), and (ii) the corresponding `toHaveBeenCalledWith` URL assertions. `EXPECTED_BODY`/`EXPECTED_REQUEST` (the posted-body pins, `expectedDigest: ''` included) are untouched byte-for-byte in both producer test files, and the lobby test's preview/confirm body assertions are likewise untouched except the URL string. The "does not post" tests in both producer suites still assert `fetchMock`/`global.fetch` was called exactly once (the GET only, no POST) for both the `unavailable` and `no-head` cases. No assertion was weakened and no row was dropped.

4. **[info] Independent mutant reproduction.** Chose a mutant distinct from (but adjacent to) the receipt's M1/M2/M3: removed the 404 body-shape guard so any 404 unconditionally maps to `no-head` (`if (response.status === 404) { return { kind: 'no-head' }; }`, dropping the `'error' in body && body.error === 'no head' ? ... : UNAVAILABLE` check). Saved the original file's bytes first (`sha256sum` = `ee6de9cee7dd9647a8761809f8715c190bc6bddcceda1950f6f6e2b2e7ded5d3`, matching the local receipt's `sourceSha256`). After mutating, `npx jest .../readGmRewindHead.test.ts --runInBand` → `Tests: 5 failed, 43 passed, 48 total`; the 5 failures were exactly `maps a 404 transport error to unavailable without error text`, `rejects status 404 even when the body carries a valid head`, and the three `maps a 404 with another body (...) to unavailable` rows (`{}`, `{"error":"unknown match"}`, `{"error":404}`) — i.e. the pin does catch this mutant. Restored the file from the saved bytes; `sha256sum` afterward again `ee6de9cee7dd9647a8761809f8715c190bc6bddcceda1950f6f6e2b2e7ded5d3` (byte-identical restoration), and the full suite went back to `Tests: 48 passed, 48 total`. This mutant was not one of the receipt's three (M1: digest format, M2: bearer header, M3: path), so it adds one more independently-confirmed data point beyond the receipt's own table; the receipt's table is consistent with what I observed for the overlapping mutation class (digest/path) and I have no reason to doubt M1–M3's reported catch/restore results, which follow the same pattern (pre/post sha256 recorded, `caught: true`, `restoredHashMatches: true`).

5. **[info] Red receipt honesty.** `u5h-red-20260921.json` records the pre-implementation failure at the baseline commit: 8 of 48 tests failed, and the failure detail explicitly shows the adapter requesting `/api/matches/match-1/timeline` (not `/head`) and returning `{ kind: 'unavailable' }` where `{ kind: 'head', ... }` was expected — i.e. the red evidence is a real reproduction against the un-migrated timeline path, not a rewritten or skipped assertion.

No BLOCKER, HIGH, or MEDIUM findings. All five items above are informational confirmations of compliance with the charter's review questions.

## Gates

All commands run from the review worktree (`E:/Projects/MekStation/.sisyphus/roadmap-completion-20260912/worktrees/u5h-review`) with Node 22 on PATH and `npm_config_dry_run=true` exported, one at a time:

| Gate | Command | Last line | Exit code |
|---|---|---|---|
| Adapter/client suite | `npx jest src/lib/multiplayer/client --runInBand` | `Ran all test suites matching /src\\lib\\multiplayer\\client/i.` — `Tests: 69 passed, 69 total` | 0 |
| Pages/multiplayer suite | `npx jest src/__tests__/pages/multiplayer --runInBand` | `Ran all test suites matching /src\\__tests__\\pages\\multiplayer/i.` — `Tests: 14 passed, 14 total` | 0 |
| Pages-modules/multiplayer suite | `npx jest src/pages-modules/multiplayer --runInBand` | `Ran all test suites matching /src\\pages-modules\\multiplayer/i.` — `Tests: 21 passed, 21 total` | 0 |
| Typecheck | `npx tsc --noEmit` | (no output; clean) | 0 |
| Format | `npx oxfmt --check` on the 5 changed source/test files | `All matched files use the correct format.` / `Finished in 197ms on 5 files using 16 threads.` | 0 |
| Lint units | `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| OpenSpec CI quality | `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] workflowContracts=8/8 workflowJobContracts=1/1 aggregatorNeeds=19/19 protectedContexts=4 packageScripts=3/3 activeOpenSpecChanges=9 accountedActiveOpenSpecChanges=9 errors=0` | 0 |
| Roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

All eight counts and exit codes match what the unit's `local` receipt (and the fix-pass blocks) claim.

Cleanup (post-review, run after the table above): deleted the throwaway probe test file; `git status --porcelain` in the review worktree returned empty; removed the `node_modules` junction with `[System.IO.Directory]::Delete(...)` (non-recursive); ran `git worktree remove --force .../worktrees/u5h-review`.

## Cap

- `git diff --numstat` (excluding the three evidence receipts, which are program bookkeeping, not product/test code): 5 files, 165 added / 114 deleted = 279 non-generated changed lines — well under the 500-line cap. Including the receipts, 8 files total — under the 15-file cap.
- Scope check: every touched path is inside `src/lib/multiplayer/client` (the adapter + its test), the lobby page test, the two named producer hook tests, or the unit's own `evidence/` receipts. Nothing else is touched — confirmed by `git diff --name-only`.
- No AI attribution: grepped both commit messages in full and the entire diff body for `claude|anthropic|co-authored|generated with` outside the JSON receipts — the only hits are the receipts' own `implementerModel: "codex (gpt-6-astra xhigh)"` bookkeeping fields, which is the program's standard model-attribution convention for its own audit trail, not commit/PR attribution. Commit messages carry no attribution trailer.
- No absolute machine paths outside the program's own documented convention: grepped the diff for `C:\Users`, `/c/Users`, `E:\Projects`; the only hits are the receipts' `shellPrelude`/`command` fields containing `export PATH=/c/Users/wroll/AppData/Local/nvm/v22.22.0:$PATH` — this is the exact Node-22 PATH prelude GOAL.md's Standing Constraints section mandates for every unit's evidence in this program, not a stray leaked path.
- Red receipt shows the timeline path before the change (see Findings item 5) — confirmed.

## Verdict rationale

Every review question in the charter checks out against direct measurement in this session: the adapter's contract law is exhaustively proven by an independent probe (12/12 passing) plus a read of the full 64-line source; the seam matches the U5g route handler's response shape field-for-field with no possibility of a wrong-head post; the three consumer test files were honestly migrated (same row counts, same posted-body pins, only the URL/mock-shape moved) rather than weakened; an independently-chosen mutant not in the receipt's own table is caught by the existing pins and the file is restored byte-identical; all eight required gates pass with counts matching the receipts; the diff stays inside its 8-file/279-line scope with no attribution or path leakage. No producer product code changed, matching the unit's declared scope, and `tsc --noEmit` confirms the (unmodified) producers still compile against the widened head type. **APPROVE.**

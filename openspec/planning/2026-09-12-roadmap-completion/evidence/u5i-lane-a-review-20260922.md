# Lane A review: U5i
reviewedHead: 9b966d0ea74c9c61f0a3e48754f06f266a3c19f4
baseline: 145e155609afd73b079f8410c04fd8df6bb5a278
reviewerModel: claude-sonnet (Agent model: sonnet)
Verdict: APPROVE

## Setup

Fetched `origin`, created a detached worktree at
`.sisyphus/roadmap-completion-20260912/worktrees/u5i-review` pinned to
`9b966d0ea74c9c61f0a3e48754f06f266a3c19f4`, junctioned `node_modules` from
the root checkout (PowerShell `New-Item -ItemType Junction`), ran Node
22.22.0 (`nvm` PATH prepend). No `npm install`/`ci`/`prune`, no build, no
Playwright, no commits. Ran jest suites one at a time. At the end, deleted
the junction with `[System.IO.Directory]::Delete(...)` (non-recursive —
confirmed the root repo's real `node_modules` still holds 590 entries
after the delete) and removed the worktree with
`git worktree remove --force`; `git worktree list` afterward shows only
the pre-existing worktrees (the implementer's own `u5i` worktree and
`u12b` untouched). The root checkout was never touched — every git/jest/
tsc/oxfmt command ran with the review worktree as cwd.

## Files on the range

`git diff --numstat 145e15560..9b966d0ea`:

| file | +/- |
|---|---|
| openspec/.../evidence/u5i-admission-20260921.json | 162/0 |
| openspec/.../evidence/u5i-local-20260921.json | 213/0 |
| openspec/.../evidence/u5i-red-20260921.json | 86/0 |
| src/__tests__/pages/multiplayer/lobby-roomcode.test.tsx | 2/2 |
| src/pages-modules/multiplayer/__tests__/useGmCorrectionProducers.test.tsx | 2/2 |
| src/pages-modules/multiplayer/__tests__/useGmRewindProducers.test.tsx | 56/2 |
| src/pages-modules/multiplayer/useGmRewindProducers.ts | 15/8 |

One commit (`9b966d0ea`, "feat(multiplayer): the rewind producers send
the GM head's journal digest"). Exactly the files the charter predicted:
one product file (`useGmRewindProducers.ts`), three test files, three
receipts. `useGmCorrectionProducers.ts` (source) is unchanged — confirmed
by its absence from the numstat — because it already forwards the pinned
preview request verbatim. No adapter (`readGmRewindHead.ts`), route, or
component file changed.

## Findings

1. **[INFO]** `src/pages-modules/multiplayer/useGmRewindProducers.ts:58-59` — the new guard (`if (typeof digest !== 'string' || digest.length === 0) return null;`) is defensive against a head shape the current adapter cannot actually produce: `readGmRewindHead.ts` (U5h, unchanged on this baseline) already rejects any body whose `digest` is not exactly 64 lowercase hex *before* it ever returns `{ kind: 'head', ... }`, and `GmRewindHeadOutcome`'s `head` type declares `digest: string` as required, not optional. My own full-stack probe (fetch faked only at `/api/matches/probe-match/head`, real adapter running unmocked) confirmed this directly: feeding the adapter a head body with a missing, empty, or 63-char digest all resolve through the adapter's own `UNAVAILABLE` branch, never reaching `buildGmRewindRequest`'s `outcome.kind === 'head'` path — so this unit's new client-side check is unreachable via any body the real adapter can hand it today. This is disclosed by the unit itself (`u5i-red-20260921.json` "notes": "Row (c) could not be taken through the faked global.fetch alone... a digest-less head body already yields `unavailable` from the adapter"; `u5i-local-20260921.json` "nonClaims": "Row (c)'s digest-less head is reached through a jest.mock spy over the adapter, not through the network shape"). Not a defect — it is honest, forward-defensive code guarding against a future adapter/type change, and the receipts do not claim otherwise. Documenting it here only because the charter's probe requirement surfaced it independently and it is worth a reader's attention when this code is touched again (the guard is real dead code on the current adapter contract, testable only through the `jest.mock` spy the shipped suite already uses).
2. **[INFO]** `src/pages-modules/multiplayer/useGmCorrectionProducers.ts:19-28` — pre-existing stale docblock ("the transport DROPS the field") not touched by this diff; already flagged by the implementer's own local receipt as `FN-u5i-stale-correction-producer-docblock` and correctly left out of scope (this unit owns only the digest, not that comment). No action needed from this review.

No BLOCKER, HIGH, or MEDIUM findings.

## Contract law (question 1), proven on the head with my own probe

I wrote a standalone jest file (not part of the diff, not committed, deleted before the gates ran) at `src/pages-modules/multiplayer/__tests__/zz-lane-a-u5i-probe.test.tsx` in my review worktree: full-stack, `global.fetch` faked only at `/api/matches/probe-match/head` (and the preview/commit endpoints, to inspect the posted body), with the real `readGmRewindHead` adapter and `useGmRewindProducers` hook running unmocked.

Ran with `npx jest src/pages-modules/multiplayer/__tests__/zz-lane-a-u5i-probe.test.tsx`:
```
PASS unit src/pages-modules/multiplayer/__tests__/zz-lane-a-u5i-probe.test.tsx
  Lane A probe - U5i contract law (full stack, real adapter)
    √ (a) posts a byte-equal digest and unchanged branch/revision/generation fields
    √ (b) approve reuses the exact previewed body verbatim (commit adapter serialization)
    √ (c) a head whose digest is missing entirely yields unavailable and posts nothing
    √ (c) a head whose digest is empty string yields unavailable and posts nothing
    √ (c) a head whose digest is too short (63 hex) yields unavailable and posts nothing
    √ (d) a no-head (404) outcome also posts nothing
    √ (e) the digest never reaches console.log/warn/error or Storage.setItem
Tests:       7 passed, 7 total
```

- **(a)** Confirmed: the posted `rewind-preview` body's `expectedDigest` is byte-equal (`toBe`) to the faked head's 64-hex digest, and `expectedBranchId`/`expectedRevision`/`expectedGeneration`/`targetRevision` compute exactly as before (head-derived, `targetRevision = revision - 1`) — unchanged logic, only the digest field's value changed.
- **(b)** Confirmed: `JSON.parse` of the actual `rewind-commit` fetch body `toStrictEqual`s the actual `rewind-preview` fetch body, proving the approve path reuses the exact same wire body (this also independently exercises the still-unchanged `useGmCorrectionProducers.ts`'s equivalent behavior, since both hooks share `buildGmRewindRequest`).
- **(c)/(d)** Confirmed: a digest missing, empty, or short-by-one (63 hex chars) — and a 404 no-head — all yield `{ kind: 'unavailable' }`, and the `rewind-preview`/`rewind-commit` fetch mocks were never called (asserted directly via boolean flags plus `fetchMock` call count of 1, i.e. only the `/head` GET).
- **(e)** Confirmed by source read and by probe: `useGmRewindProducers.ts`'s diff adds no `console.*`, no `localStorage`/`sessionStorage` call, and no digest fabrication (`digest` is read verbatim from `head.digest`, never computed). The probe additionally spied `console.log/warn/error` and `Storage.prototype.setItem` across a full preview+confirm run and asserted none were called with the digest or at all.
- No adapter, route, or component file changed (confirmed above via numstat).

Item (c)'s honest caveat, corroborated independently: my probe shows the *adapter itself* already refuses a malformed/absent-digest body (returning `unavailable` before `buildGmRewindRequest` even sees a `head` outcome), which is the same fact the unit's own red/local receipts disclose about why the shipped test needed a `jest.mock` spy for that row — see Finding 1.

## Seam fidelity (question 2)

`src/pages-modules/api/matchHeadRoute.ts` (U5g, on `origin/main` at `53bd8f0a8`, not on this unit's baseline but read from `origin/main` per the charter) computes, inside one `db.transaction`:
```
const head = readEffectiveStreamHead(db, branches, stream);
...
return { branchId: head.branchId, revision: head.revision, effectiveGeneration: effective.effectiveGeneration, digest: head.digest };
```
using `stream = matchStreamRef(caller.matchId)` — the same `matchStreamRef` helper the rewind/correction preview and lease code use to name a match's stream.

`SQLiteEventHistoryCorrectionLeaseStore.ts:318` (`assertExpectedHeadIsCurrent`) compares:
```
if (binding.expectedDigest !== head.digest) throw this.staleHead('STALE_DIGEST', ...);
```
where `head` comes from `this.readJournalHead(stream)`, which is `readEffectiveStreamHead(this.db, this.branches, stream)` — the *identical* function, called with the same `stream` shape, as the route.

Between the adapter's head and the posted body, nothing can alter or drop the digest:
- `readGmRewindHead.ts` reads `digest` off the parsed JSON body and requires it to already be 64 lowercase hex before returning `{ kind: 'head', head: { ..., digest: head.digest } }` (verbatim passthrough, no transform).
- `buildGmRewindRequest` (this unit's diff) reads `head.digest` into a local `const digest`, guards it, and assigns `expectedDigest: digest` — again verbatim, no transform, no fallback.
- `previewGmCombatRewind.ts` serializes `input.expectedDigest` directly into `JSON.stringify({ ..., expectedDigest: input.expectedDigest, ... })` for the POST body — no transform.
- The route/commit-deps schema (`rewindPreviewRouteSupport.ts:20,41` and `rewindCommitDeps.ts:51,73`) types `expectedDigest: string` and validates only `typeof body.expectedDigest === 'string'` — it accepts the string through unchanged (this is the pre-existing, still-open non-claim about the preview schema accepting an empty string too, owned by U5g's node, not this unit).

So the digest the producer sends for a given match is the same value the lease compares against for that same stream ref, read through the same `readEffectiveStreamHead` function at both ends — verified by source, not by a live call (no server ran in this review).

## Test honesty (question 3)

No pin was weakened. Row counts, confirmed against the unit's own red receipt and by running the suites myself:

| suite | before (red receipt) | after (gate run) |
|---|---|---|
| useGmRewindProducers.test.tsx | 9 (5 failed / 4 passed) | 9 passed |
| useGmCorrectionProducers.test.tsx | 10 (4 failed / 6 passed) | 10 passed |
| lobby-roomcode.test.tsx | 13 (2 failed / 11 passed) | 13 passed |

All three counts are unchanged before/after (only `useGmRewindProducers.test.tsx` gained the 2 new `it.each` rows for the digest-absent/empty case, matching the diff's `+56/-2`; the other two files only had `expectedDigest: ''` swapped for `HEAD_DIGEST` and one `it` title updated to reflect the new behavior, with 0 tests added or removed). The lobby page test (`lobby-roomcode.test.tsx`) still asserts, in its unrelated no-head/unavailable rows (unchanged by this diff, not shown above since they were already green), that nothing is posted — the changed rows only tighten the expected digest value from `''` to `HEAD_DIGEST`, which is a strengthening, not a weakening.

## Mutant reproduction (question 4)

I independently reproduced mutant **M2** from the unit's local receipt (`u5i-local-20260921.json`): removed the two-line digest guard and replaced `expectedDigest: digest` with `expectedDigest: digest ?? ''` in my worktree's `useGmRewindProducers.ts`.

- Pre-mutation sha256: `b1d91fe3aac2439940d82a6f81282db57b4035c496f23304fd31e49845afe703`
- Ran `npx jest src/pages-modules/multiplayer src/__tests__/pages/multiplayer`:
  ```
  FAIL unit src/pages-modules/multiplayer/__tests__/useGmRewindProducers.test.tsx
    ✕ posts nothing when the head outcome carries an absent digest
    ✕ posts nothing when the head outcome carries an empty digest
  Test Suites: 1 failed, 4 passed, 5 total
  Tests:       2 failed, 35 passed, 37 total
  ```
- Restored the file (`git checkout --`); sha256 after restore: `b1d91fe3aac2439940d82a6f81282db57b4035c496f23304fd31e49845afe703` (matches pre-mutation exactly). `git status --porcelain` clean.

This exactly matches the receipt's own M2 entry (same two failing rows, same file, same restored sha256 `b1d91fe3...` — the receipt records `restoredEqualsPre: true` for its own run). The receipt's mutant table (M1: reverts the digest to `''` entirely; M2: the one I reproduced; M3: the approve arm loses the digest, in `useGmCorrectionProducers.ts`) matches what the diff and shared builder function make sense to mutate, and I have no reason to doubt M1/M3 were run as described — the diff shape (a single guarded read-and-assign in one function, reused verbatim by the correction hook) makes all three mutants the obvious candidates, and M2 is representative of the class.

## Gates

| command | last line | exit |
|---|---|---|
| `npx jest src/pages-modules/multiplayer` | `Tests: 30 passed, 30 total` (includes my probe file; re-run without it: `Tests: 23 passed, 23 total, 3 suites`) | 0 |
| `npx jest src/__tests__/pages/multiplayer` | `Tests: 14 passed, 14 total, 2 suites` | 0 |
| `npx jest src/lib/multiplayer/client` | `Tests: 69 passed, 69 total, 4 suites` | 0 |
| `npx tsc --noEmit` | (no output) | 0 |
| `npx oxfmt --check` (4 changed source/test files) | `All matched files use the correct format.` | 0 |
| `npm run lint:units` | `LINT_UNITS_PASS 100/100` | 0 |
| `npm run qc:openspec-ci:validate` | `[qc:openspec-ci] ... errors=0` | 0 |
| `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

(My scratch probe file was deleted before the tsc/oxfmt/lint gates ran, so those gates ran against the exact reviewed diff only.)

## Cap

- `git diff --numstat` against the two bounds: 7 files total (3 evidence receipts + 4 source/test), well under the 15-file cap; product lines 15 added / 8 removed (23), test lines 60 added / 6 removed (66) — total 89 non-generated changed lines, well under 500.
- Nothing outside `src/pages-modules/multiplayer`, the lobby page test, and the receipts — confirmed by numstat: no `src/lib`, `src/pages`, `src/components`, or e2e file appears.
- No AI attribution in the commit message (checked with a case-insensitive grep for `co-authored|claude|anthropic|gpt|codex|generated with|opus` — no match).
- No absolute machine paths in the diff (checked with a grep for `C:\Users`, `E:\Projects`, `/c/Users`, `/home/`, `/Users/` — no match).
- The receipts (`u5i-admission`, `u5i-local`, `u5i-red`) describe exactly what the diff contains: line counts, sha256s, mutant table, and gate outputs in the local receipt all match what I independently measured.
- The red receipt (`u5i-red-20260921.json`) shows `expectedDigest ''` as the pre-change/failing value across all three failing suites (e.g. `"receivedBody": "{...\"expectedDigest\":\"\",...}"` and the lobby page diff `"expectedDigest": ""` → digest), confirmed.

## Verdict rationale

The diff is a minimal, single-function change (`buildGmRewindRequest`) plus its shared caller (`useGmCorrectionProducers`, unchanged, verified by its absence from the diff) that does exactly what U5i's behavior sentence says: send the adapter's digest verbatim, refuse to post when the head carries no usable digest. I independently verified, via my own full-stack probe (not the shipped suite's mocks) and my own mutant reproduction, that: the digest is byte-equal end-to-end from the U5g route's seam through to the wire body; the approve path reuses the identical body; a missing/empty/malformed digest yields `unavailable` and posts nothing; the digest is never logged or stored; and the receipts' honest self-disclosed limitation (row (c) needs a mock because the real adapter already refuses malformed digests) is correct and not concealed. All required gates pass with the exact commands specified, the cap is well within bounds, and there is no scope creep. No BLOCKER/HIGH/MEDIUM findings — the two INFO notes are pre-existing/disclosed and do not warrant edits before merge.

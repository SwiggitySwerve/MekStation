# Lane A review: U5b

reviewedHead: 8479b05e1790c282c90a6d18276031ceb1b8987f
baseline: 0638f87e04b34d6619a7b89587e9b1faccc61248
reviewerModel: claude-sonnet (Agent model: sonnet)
implementerModel: claude-opus (Agent lane)

Verdict: APPROVE

## Setup

- `git -C E:/Projects/MekStation fetch origin` (clean; no output).
- `git -C E:/Projects/MekStation worktree add --detach .sisyphus/roadmap-completion-20260912/worktrees/u5b-review 8479b05e1790c282c90a6d18276031ceb1b8987f` — confirmed at "HEAD is now at 8479b05e1". No leftover `worktrees/u5b` directory existed (`ls .sisyphus/roadmap-completion-20260912/worktrees/` showed only `u3-diagnosis/` and `u4/`), so nothing to avoid touching.
- `node_modules` junctioned via PowerShell `cmd /c mklink /J ...` (the Bash-tool `cmd /c mklink` invocation silently produced no junction; the PowerShell tool's identical command worked and was verified with `ls node_modules`).
- Node 22 confirmed: `node --version` → `v22.22.0`.
- `npm_config_dry_run=true` exported in every shell before any npm/npx command.
- No `npm install`/`ci`/`prune`, no build, no Playwright, no commit, run anywhere. All commands executed with cwd inside the review worktree.
- Worktree cleanup performed at the end of this review (junction deleted non-recursively, `git worktree remove --force` run) — see final note.

## Files on the range

`git diff --name-status 0638f87e0..8479b05e1` (verified):

```
A  openspec/planning/2026-09-12-roadmap-completion/evidence/u5b-admission-20260917.json
A  openspec/planning/2026-09-12-roadmap-completion/evidence/u5b-local-20260917.json
A  openspec/planning/2026-09-12-roadmap-completion/evidence/u5b-red-20260917.json
A  src/components/multiplayer/NetworkedGameSurface.gmCorrection.tsx
M  src/components/multiplayer/NetworkedGameSurface.tsx
A  src/components/multiplayer/__tests__/NetworkedGameSurface.correction.test.tsx
A  src/pages-modules/multiplayer/__tests__/lobbyCorrectionSurface.test.tsx
A  src/pages-modules/multiplayer/__tests__/useGmCorrectionProducers.test.tsx
A  src/pages-modules/multiplayer/useGmCorrectionProducers.ts
M  src/pages-modules/multiplayer/useGmRewindProducers.ts
M  src/pages/multiplayer/lobby/[roomCode].tsx
```

11 files total: 3 evidence receipts + 8 source/test files, all inside the unit's three ownership paths (`src/pages/multiplayer`, `src/components/multiplayer`, `src/pages-modules/multiplayer`) plus the evidence directory. Verified with `grep -iE "claude|anthropic|co-authored|generated with|E:\\\\Projects|E:/Projects|/c/Users|C:\\\\Users"` over the diff and over the commit message — zero matches in both. No edits to `src/lib`, `src/pages/api`, `src/pages-modules/api`, or `src/pages/e2e` (confirmed: `git diff` on those four read-only files listed in the charter returns 0 lines).

## Findings

1. **[INFO] Privacy claim holds — verified independently, not just by the implementer's own suite.** I read `useGmCorrectionProducers.ts` in full: the reason lives in `privateReasonRef` (a `useRef`, not React state), and appears in exactly one place — `commitRef.current(reason.length > 0 ? { ...request, reason } : request)` (useGmCorrectionProducers.ts:131-134). The preview call (`previewRef.current(request)`, line 115) never sees it. I then wrote and ran my own scratch integration test (`src/pages-modules/multiplayer/__tests__/laneAScratch.u5b.test.tsx`, deleted after the run, not part of the PR) that rendered the real `NetworkedGameSurface` wired to the real `useGmCorrectionProducers` hook (only the network transports injected), typed a reason into the actual rendered `networked-gm-private-reason` input via `userEvent.type`, clicked the actual Preview and Approve buttons, and asserted the secret string appeared in none of: the preview mock's call args, `document.body.textContent`, `window.sessionStorage`, `window.localStorage`, or the rendered status text — and appeared in exactly one place, `commit.mock.calls[0][0].reason`. Result: `PASS ... Tests: 1 passed, 1 total`. This corroborates the implementer's own privacy-sweep test (`useGmCorrectionProducers.test.tsx:210-251`), independently and at the full-component-render level rather than only at the hook-API level.

2. **[INFO] Gating to host-gm non-spectator viewers confirmed by direct source read.** `NetworkedGameSurface.tsx:422` gates the whole correction block on `authorityProjection.viewerRole === 'host-gm' && !spectator`, and `authorityProjection` (line 243-258) is a `useMemo` that already takes `spectator` as an input to `buildNetworkedTacticalAuthorityProjection`. `NetworkedGameSurface.correction.test.tsx` (read in full) exercises both a player (`playerId: 'pid_guest'`) and a spectator holding the host id (`spectator: true`) and asserts `networked-gm-private-reason` and `networked-host-gm-controls` are both absent in each case; these rows passed in gate run #1 below (part of the 143). Note (see Finding 5) that `&& !spectator` in that JSX gate is provably dead code on this head — pre-existing, not introduced by this PR — because the projection itself already resolves `viewerRole` away from `'host-gm'` when `spectator` is true.

3. **[INFO] Regression: rewind producer behavior is byte-identical after the extraction.** `git diff` on `useGmRewindProducers.ts` shows `buildGmRewindRequest` was lifted verbatim out of `onPreviewRewind` — every field (`matchId`, `wireToken`, `targetRevision`, `expectedBranchId`, `expectedRevision`, `expectedDigest`, `expectedGeneration`) and every inline `WHY` comment is unchanged text, only relocated into a named exported function. `onConfirmRewind` still re-posts `lastRewindRequestRef.current` verbatim, unchanged. The pre-existing suite `src/__tests__/pages/multiplayer/lobby-roomcode.test.tsx`, which the receipt says asserts the exact rewind preview/confirm request bodies, passed 13/13 in gate run #2 below, and `NetworkedGameSurface.rewind.test.tsx` passed inside the 143 in gate run #1. I did not need a separate scratch test for this claim since the diff itself proves the lift is text-preserving and the two suites that assert on the request shape both passed.

4. **[INFO] Test ids the e2e specs use are unchanged and gated the same way.** Read `e2e/networked-command-proof.spec.ts:20,25,29` and `e2e/gm-two-player-privacy.pack.spec.ts:264-267`: they assert on `networked-host-gm-controls`, `networked-gm-preview-btn`, `networked-gm-approve-btn`. All three test ids are present unchanged in the new `NetworkedGameSurface.gmCorrection.tsx` (lines 119, 124, 132). `src/pages/e2e/networked-command-proof.tsx` (read in full, and confirmed zero-diff against baseline) passes `previewGmCorrection`/`approveGmCorrection`, both inferred as `() => void`, to `onPreviewHostGmCorrection`/`onApproveHostGmCorrection`, now typed `GmCorrectionPreviewHandler = () => void | Promise<GmRewindPreviewOutcome | void>` / `GmCorrectionApproveHandler = () => void | Promise<GmCombatRewindCommitResult | void>` — `() => void` is a member of that union, so this stays assignable, and `npx tsc --noEmit` (gate run #3) confirms it compiles. The new status paragraph in `NetworkedHostGmControls` (`networked-gm-correction-status`) only renders when the handler's return value is not `undefined` (gmCorrection.tsx:98,112); since the proof page's handlers return `void`, that branch is never taken, so the proof page's DOM is provably unchanged by this addition — verified by reading the control flow, not merely asserted by the receipt.

5. **[LOW, pre-existing, not introduced by this PR] The `&& !spectator` clause in `NetworkedGameSurface.tsx`'s GM-block gate is dead code.** I mutated `authorityProjection.viewerRole === 'host-gm' && !spectator` (line 422) to drop `&& !spectator`, ran the full correction/surface/rewind suites (`NetworkedGameSurface.correction.test.tsx`, `NetworkedGameSurface.test.tsx`, `NetworkedGameSurface.rewind.test.tsx`), and all 37 rows still passed — including the two rows that specifically assert the correction controls are absent for a spectator holding the host id. Reading `buildNetworkedTacticalAuthorityProjection`'s inputs confirms why: `spectator` is already an input to the projection, so `viewerRole` is never `'host-gm'` when `spectator` is true, making the JSX-level check redundant. I confirmed this condition is pre-existing (`git show 0638f87e0:src/components/multiplayer/NetworkedGameSurface.tsx` shows the identical `&& !spectator` at line 409 on the baseline) — U5b did not introduce it, only carried it forward unchanged when moving the block's surrounding code. Restored the file and verified `sha256sum` matched the pre-mutation digest (`0938793a...b8b8d23`) exactly. Not a regression and not a privacy risk (belt-and-suspenders, not a hole), so not a blocker; informational only.

6. **[LOW] Reproduced mutant M4 (my own, not one of the implementer's three) independently.** Mutated `useGmCorrectionProducers.ts:131` from `privateReasonRef.current.trim()` to `privateReasonRef.current` (dropping the trim), ran `useGmCorrectionProducers.test.tsx`: `Tests: 1 failed, 6 passed, 7 total` — the failure is exactly the row `treats a whitespace-only reason as no reason`, with `Expected: false / Received: true` on the `'reason' in body` check. Restored the file and verified `sha256sum` matched the pre-mutation digest (`8729a0bb...4cc480cb7f651`) exactly. This corroborates the receipt's mutant-testing methodology and shows the pins catch a defect the implementer's own three mutants (M1-M3) did not target.

7. **[INFO] Honesty of the narrowing — verified against the read-only files, not just the prose.** `src/lib/multiplayer/client/commitGmCombatRewind.ts:14` types `ICommitGmCombatRewindInput = IPreviewGmCombatRewindInput` (the same 5-field type with no `reason`), and its POST body (lines 55-63) is a literal `JSON.stringify` of exactly `targetRevision, expectedBranchId, expectedRevision, expectedDigest, expectedGeneration` — any `reason` on the input object is dropped before the fetch call. `src/pages-modules/api/rewindCommitDeps.ts:38` declares `REWIND_COMMIT_REASON = 'authorized combat rewind'` and its `IRewindCommitBody` (lines 47-53) has no `reason` field. `src/pages/api/matches/[id]/rewind-commit.ts:199` writes the literal `reason: REWIND_COMMIT_REASON` into the private record. All three files are confirmed zero-diff against baseline (`git diff` returns nothing). The PR body (`gh pr view 1827`) states this plainly: "the transport drops the field and the route writes the constant reason; E2E-25's THEN clause is not satisfied here" and "Non-claims and findings: ... The reason does not reach the server on this head." This matches the receipts and the code exactly — no overclaim found.
8. **[INFO, not a blocker for Lane A] Lane B (owner ruling) is outstanding, as expected.** `gh pr view 1827 --json comments,labels,reviews` returns empty comments, labels and reviews — no `OWNER-RULING` comment or `owner-ruled` label exists yet on this head. Per the charter and DELIVERY.md this is a decision for the owner, not for this review; noting it here only so the state is on record.

## Gates

All run from the review worktree with Node 22 and `npm_config_dry_run=true` set.

| Gate | Command | Last line | Exit |
|---|---|---|---|
| Focused suites | `npx jest src/components/multiplayer src/pages-modules/multiplayer src/pages/multiplayer` | `Test Suites: 14 passed, 14 total` / `Tests: 143 passed, 143 total` | 0 |
| Pre-existing page suite | `npx jest src/__tests__/pages/multiplayer` | `Test Suites: 2 passed, 2 total` / `Tests: 13 passed, 13 total` | 0 |
| Typecheck | `npx tsc --noEmit` | (no output) | 0 |
| Lint | `npx oxlint` | `Found 84 warnings and 0 errors.` | 0 |
| Format | `npx oxfmt --check` (the 8 changed files) | `All matched files use the correct format.` | 0 |
| Roadmap validator | `node openspec/planning/2026-09-12-roadmap-completion/validate-roadmap.mjs` | `ROADMAP VALIDATION PASSED: 75 nodes, 13 packages, 376 tasks, 40 triage rows` | 0 |

All six numbers are byte-identical to the receipts' claims (14/143, 2/13, tsc silent, 84 warnings/0 errors unchanged from baseline, oxfmt clean, validator PASSED with the same counts). `grep -i "NetworkedGameSurface\|lobby/\[roomCode\]\|gmCorrection\|useGmRewindProducers\|useGmCorrectionProducers"` over the oxlint output returned nothing, confirming none of the changed files carry a max-lines (or any other) warning.

`npm run qc:openspec-ci:validate` from the receipts was not independently re-run (not in the charter's required gate list); the roadmap validator and the two lint/format/type gates the charter specified were all run and matched.

## Cap

`git diff --numstat` (verified):

```
174  0  src/components/multiplayer/NetworkedGameSurface.gmCorrection.tsx
 23 46  src/components/multiplayer/NetworkedGameSurface.tsx
179  0  src/components/multiplayer/__tests__/NetworkedGameSurface.correction.test.tsx
333  0  src/pages-modules/multiplayer/__tests__/lobbyCorrectionSurface.test.tsx
251  0  src/pages-modules/multiplayer/__tests__/useGmCorrectionProducers.test.tsx
142  0  src/pages-modules/multiplayer/useGmCorrectionProducers.ts
 52 27  src/pages-modules/multiplayer/useGmRewindProducers.ts
 18  0  src/pages/multiplayer/lobby/[roomCode].tsx
```

Splitting product (5 files: gmCorrection.tsx, NetworkedGameSurface.tsx, useGmCorrectionProducers.ts, useGmRewindProducers.ts, lobby page) from test (3 files): product = +409/−73, test = +763/−0. Both totals match the claimed "+409/−73 across five files and 763 test lines... eight files" exactly. `wc -l` on the five new/untouched-baseline new files (174, 142, 179, 333, 251) matches the `git diff --numstat` additions exactly for each.

Against the unit's cap (`maxFiles: 15`, `maxNonGeneratedLines: 500`): 8 files well under 15. Product lines (409 added, 336 net) are under 500 either way; the receipts' own accounting appears to exclude test lines from the "non-generated lines" cap (763 test lines would blow a combined 500-line budget), which is a program-wide convention I cannot verify from this unit's files alone — flagging it as a question for the parent/roadmap owner rather than a defect in this PR, since the receipts are internally consistent and I have no evidence the convention is being applied inconsistently here.

**Is the component move and the builder extraction justified or padding?** Justified, on the evidence:
- `NetworkedGameSurface.tsx` sat at ~382 effective lines against oxlint's 400-line `max-lines` warn threshold (confirmed: baseline oxlint output listed no warning for this file, and post-change it still lists none, at 503 raw / ~359 effective lines) — the move had a real, verifiable size constraint, not an invented one.
- `buildGmRewindRequest`'s extraction (+52/−27 in useGmRewindProducers.ts) is a byte-identical lift (Finding 3) that lets the new correction hook share the exact same request-construction logic the rewind hook uses — necessary, not incidental, since a second independent builder would be "two CAS bindings" the GM could be shown one of and approve the other (the risk the docstrings name explicitly, and which my Finding 1 scratch test and the implementer's own mutant M3 both target).
- The 763 test lines are the read-first (red) pins plus their follow-on rows; I read all three test files and found no padding, no weakened assertions, and no skipped tests — every row asserts something specific (an absence, a presence, an exact request-body equality, or a privacy sweep) that would fail without the corresponding product line.

## Verdict rationale

APPROVE. I independently reproduced the two production-critical claims (the privacy boundary, via my own end-to-end scratch test at the full-component level, and the rewind-producer behavior preservation, via a text-diff read plus the pre-existing suite) rather than relying only on the receipts. I independently reproduced two mutants (one of my own choosing beyond the implementer's three) and restored both files to their exact pre-mutation sha256 digests. All six required gates match the receipts' claims exactly, with no drift in the oxlint warning count. The cap/scope numbers check out exactly against `git diff --numstat` and `wc -l`, no edits exist outside the three owned paths plus evidence, no AI attribution or absolute machine paths were found anywhere in the diff or commit message, and the PR body's non-claims (E2E-25 not satisfied, the reason not reaching the server) are verified true against the read-only transport/route files rather than merely asserted. The one dead-code observation (Finding 5) is pre-existing and non-regressive; the testid-naming drift between the admission plan's `networked-gm-correction-preview-status` and the shipped `networked-gm-correction-status` is cosmetic and untested by the PR's own suites but does not affect any behavior the charter or the e2e specs depend on. Lane B (owner ruling for the privacy class) remains outstanding and is explicitly not this review's call.

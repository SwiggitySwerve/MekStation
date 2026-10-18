# P2CG1A1 independent exact-head review (PR #2166)

- Reviewer: Claude Fable 5.1 (independent; not the author). Author: Claude Opus 5.5.
- Unit: P2CG1A1, first move-only extraction slice of the P2CG1 chain (plan Task 14).
- Head reviewed: `cdd846752139220d6d531ea0fa6e0d5bad65a111` (PR #2166, state OPEN, mergeable CLEAN at review time).
- Base: `6645308f4d6bdd6a424e73761ee20ffa81f8101f` (merge of #2165). The binder at this base is byte-identical to the registration base `d0a7dd8b6`.
- Author worktree `E:/Projects/Personal/MekStation-wt/p2cg1a1-extract-1-20261016`: `git status --porcelain` empty before and after every command I ran there.
- Runtime for test runs: Node v22.22.0 (`C:\Users\wroll\AppData\Local\nvm\v22.22.0`). Review scripts and logs: `E:/Projects/Personal/MekStation-wt/_fable-review-logs/` (outside any repository; disposable).
- Main moved during review: `origin/main` is now `7d1f038ae` (#2153 CI pipeline, #2154 TS7 docs, #2167 registration correction). None of those three touch this unit's two leaves; #2167 edits units.json but leaves the P2CG1A1 entry byte-identical (verified by id-keyed deep diff).

## Verdict

**APPROVE-WITH-NOTES.** No blockers, no majors. Four minors, all documentary or carry-forwards for P2CG1A2; none requires a change to this head.

## 1. Move proof (own script, not the author's)

Script `fable-moveproof.cjs` (TypeScript compiler API). It parses the base binder, the head binder and the head new file, and checks:

| Check                                                                                                                                                                                                                                                       | Result                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New file declares exactly the 12 moved names, in base order, each exported, nothing else besides imports                                                                                                                                                    | PASS                                                                                                                                                                                                                                                                              |
| Each moved block (leading comments included) byte-equal to base once one `export` is removed                                                                                                                                                                | 11 of 12 PASS                                                                                                                                                                                                                                                                     |
| `sameAppliedView`                                                                                                                                                                                                                                           | token stream equal to base modulo one trailing comma before `)`; comment list identical; AST shape (node kinds + leaf texts, export modifier excluded) identical. Layout-only, as the author states.                                                                              |
| Binder remainder vs base with the 12 declarations removed, statement by statement with leading comments                                                                                                                                                     | 43 statements equal; the only added statement is `export type { ICampaignApplicationReceiptPort } from './campaignApplicationConnection'`, at the interface's old position                                                                                                        |
| Imports: every name the new file or binder imports binds to the module the base binder imported it from; removed binder imports are unreferenced in the remainder; binder imports only moved names from the new module; new file does not import the binder | PASS                                                                                                                                                                                                                                                                              |
| Binder exported names                                                                                                                                                                                                                                       | unchanged, 9 names: IBindCampaignSyncConnectionDeps, IBoundCampaignSyncConnection, ICampaignApplicationReceiptPort, ICampaignForceClaimPort, ICampaignHostRegistryLike, ICampaignSeatBindOutcome, ICampaignSessionMembershipPort, IWireCampaignSocket, bindCampaignSyncConnection |

Mutation probes, each applied in memory to the head text and required to fail the script: **11 of 11 caught**, each attributed to the right declaration.

1. `COMMIT_ATTEMPTS = 3` to `4` (changed default) - caught (COMMIT_ATTEMPTS).
2. One word in the HEAD_DRIFT doc comment (comment-only) - caught (HEAD_DRIFT).
3. `send`: `readyState !== 1` to `=== 1` (changed branch) - caught (send).
4. `sameAppliedView`: `&&` to `||` inside the layout-tolerant block - caught.
5. A `//` comment inserted inside `sameAppliedView` (comment-only, inside the tolerant block) - caught.
6. Comment-only edit inside `preparePublicCut` body - caught.
7. Extra exported const appended to the new file - caught (13 declarations).
8. Comment-only edit in the binder remainder (`P2CE: one socket` doc) - caught (statement 35).
9. Binder branch flip `envelope.kind === 'Heartbeat'` to `!==` - caught (statement 15).
10. `NOT_OFFERED` redeclared in the binder - caught.
11. Extra `export const` added to the binder - caught.

A first version of my AST walker visited only the first child (a `forEachChild` return-value bug) and produced a false FAIL on `sameAppliedView`; I fixed it and re-ran. The result above is from the fixed script. Head bytes checked: binder `212bf491...7dab7`, new file `d5b10779...aecdf`, both equal to the local receipt's `productBytes`.

## 2. Cycles and compile boundary

- Own transitive closure over `src/` from the new file: 149 files via value imports, 907 files including type-only imports; the binder is in neither set.
- madge (npx madge@8, `--circular --ts-config tsconfig.json`) on head: 174 circular chains among 973 processed files, none involving `campaignApplicationConnection.ts`. Same command on a throwaway checkout of base (binder only): 174 chains. The sorted chain sets are identical. The author's "no madge run" concern is closed: the move adds no cycle.
- `ICampaignApplicationReceiptPort` importers outside the two leaves: none in `src`, `scripts`, `e2e` or `server.js`. The type re-export keeps the name on the binder's public surface regardless (export list above). Typecheck passes on head.
- Runtime load through `tsx/cjs` under Node 22: binder exports `bindCampaignSyncConnection` only; new module exports COMMIT_ATTEMPTS, HEAD_DRIFT, NOT_OFFERED, errorFrame, isApplicationAck, preparePublicCut, sameAppliedView, send.

## 3. Scope and census

- `git diff --name-status 6645308f..HEAD`: exactly six paths, the two registered leaves (binder M, new file A), units.json (M), and three evidence receipts (A). No test, harness, `server.js` or workflow file.
- units.json id-keyed deep diff: 193 units; only P2CG1A1 differs, in `ownershipExceptions` (+4 own evidence paths including the reserved review slot, same pattern as P2CE3/P2CF1/P2CF2), `state` planned to implementing, `baseline`, and `stageReceipts.admission/red/local`. Key order preserved; no top-level key changed.
- Census recomputed from `git diff --numstat --no-renames` with the validator's rule (evidence directory skipped, tests uncounted): new file 199 + binder 18 + units.json 16 = **233 of 500**. Files: 6 in the PR + reserved review slot = **7 of 15**. Matches the author.
- Attempt-directory artifacts named in the receipts (census.md, move-proof.cjs, move-proof.json, probes log, caller-suites.txt, red.log, base-results.json) all match their recorded sha256 prefixes and byte counts.

## 4. Author's concerns

**(a) Registered range 1589-1723 ends inside the class doc comment.** Verified at base: moved block 1589-1709, class doc comment 1711-1723, class 1724-2049. Keeping the comment with its class is correct; the alternative orphans a doc comment. A2's block is therefore 1711-2049 (339 physical) at base d0a7dd8b6, and sits at 1579-1917 in the head binder. PR #2167 did not correct A2's text: `P2CG1A2.behavior` still reads "binder lines 1724-2049 ... 326 physical lines". A2 fit: my dependency scan of the class shows it uses only two binder declarations (IWireCampaignSocket, ICampaignSessionMembershipPort, both interfaces, both exported, type-only use) and needs these imports the new file lacks: randomUUID, ServerMatchBroadcaster, campaignEventWireFrame, CampaignPublicAppliedViewStore + readCampaignPublicAppliedView, and the types ICampaignHostRegistryEntry and CampaignApplicationResult; none of those modules reaches the binder at runtime. Estimate: 339 + roughly 15-20 import lines + 1-3 binder import lines + 16 lifecycle, about 372-380 counted lines. Inside the registered 370-410 and under 500 with margin. A2's admission must re-measure at its own baseline: block start/end lines in the post-A1 binder, physical count 339, and the counted total.

**(b) explicit-module-boundary-types warning on exported sameAppliedView.** Verified: base 85 warnings, head 86, 0 errors both; the single new warning is this one; the binder's max-lines warning drops from 1773 to 1638 counted lines. Acceptable for a move-only slice: a return annotation would change moved text. After A2 the class is the only consumer of sameAppliedView (and of IApplicationCandidate, IApplicationView, COMMIT_ATTEMPTS, HEAD_DRIFT, preparePublicCut), so A2 can drop those six exports, which returns sameAppliedView to one line and base bytes and removes the warning. The registration's "unchanged apart from export keywords" covers that.

**(c) Ledger wording "every moved block equals base bytes once export removed."** True for 11 of 12. The local receipt (`moveProof.checks[2]`) records the exception precisely; the admission receipt does not mention it. The behavior text is registration prose, outside this unit's lifecycle-field edit right, so no ledger edit in this PR. The review receipt the parent writes should carry one sentence: "sameAppliedView equals base modulo formatter wrap and a trailing comma; the other eleven are byte-equal." The A2 registration should use "equal modulo export keyword and formatter layout" rather than "base bytes".

**(d) No madge run.** Closed by section 2.

## 5. Re-runs on exact head and base

| Check                                           | Head                                                        | Base                             |
| ----------------------------------------------- | ----------------------------------------------------------- | -------------------------------- |
| Task 14 selector + 31 caller suites (35 suites) | 35 suites, 369 tests, 369 passed                            | 35 suites, 369 tests, 369 passed |
| Sorted (suite, full test name, status) rows     | identical to base, 0 only-head, 0 only-base                 |                                  |
| typecheck                                       | PASS                                                        |                                  |
| oxlint                                          | 0 errors, 86 warnings                                       | 0 errors, 85 warnings            |
| format:check                                    | PASS                                                        |                                  |
| lint:units                                      | PASS 17899/17899, src-tests 17783/17783, ceilings unchanged |                                  |
| validate-roadmap.mjs                            | PASS (79 nodes, 13 packages, 381 tasks, 40 triage rows)     |                                  |
| validate-roadmap --next                         | prints U25 (P2CG1A1 is implementing)                        |                                  |
| validate-roadmap.test.mjs                       | 86 pass, 0 fail                                             |                                  |
| PR CI (run 38941078224)                         | all 32 checks pass                                          |                                  |

The 31 caller suites were derived independently (own transitive import scan from every `*.test.ts` to the binder, including jest.mock specifiers) and are identical to the author's `caller-suites.txt`. Base suites ran in a throwaway worktree at 6645308f with node_modules junctioned from the main checkout; the worktree was removed afterwards (junction unlinked first, main node_modules intact).

**test:stable assessment (not re-run).** The explanation is credible and the "status null" is not a ledger problem:

- Both suites spawn the roadmap scripts with `spawnSync(..., { timeout: 30000 })`. On timeout Node returns `status: null`, `signal: SIGTERM`, `error: ETIMEDOUT`; the closure-proof `run()` helper copies only status/stdout/stderr, so the assertion prints "closure exited null". The identity-capture failure shows `ETIMEDOUT` explicitly.
- A real closure refusal exits non-zero with a stderr reason (the same suite asserts `status).not.toBe(0)` for its refusal cases). Here stderr is empty and stdout already contains the validator's PASS line for the real ledger (79 nodes, 13 packages, 381 tasks, exit 0), so the child was killed mid-run after the validator step, under a full `--runInBand`-free load where the suite took 1141 s versus 994 s alone.
- Both suites pass alone on the same bytes (52/52, 146/146), and the validator and its 86 tests pass on head in my run.
- Residual, pre-existing and not this PR's: the closure-proof suite needs about 1000 s even alone because each of its 146 tests spawns Node plus the validator on a 1.4 MB ledger; its 30 s per-spawn budget will keep flaking inside full runs.

## 6. Minors and notes

- M1 (docs, A2): `P2CG1A2.behavior` range and count are stale (1724-2049 / 326; actual 1711-2049 / 339 at d0a7dd8b6; 1579-1917 at this head). #2167 did not fix it. Amend in the A2 release-to-planned PR or record in A2's admission receipt as A1 did.
- M2 (docs, parent review receipt): record the sameAppliedView layout exception in one sentence (section 4c).
- M3 (lint, A2): one new explicit-module-boundary-types warning; disappears when A2 drops the six exports only the class uses.
- M4 (madge, A2): importing IWireCampaignSocket and ICampaignSessionMembershipPort as types from the binder will add exactly one madge chain (binder <-> new file, type-only; madge counts type imports, as the existing `bindCampaignSyncConnection.ts > handleRoomCodeGuestJoin.ts` chain shows). Runtime closure stays acyclic. A2's receipt should expect 175, not 174, or move the two interfaces, which the registration does not currently allow.
- N1: `.github/workflows/pr-checks.yml` changed on main after this base (#2153). The PR's green run used the head's workflow set; the parent should confirm the required-check names on the merge ref before the guarded merge.
- N2: the ownershipExceptions edit lists the reserved `p2cg1a1-admission-review-20261016.md` slot; it is absent at head, as required.

## 7. Carry-forwards for P2CG1A2 (exact wording)

1. "Block to move: class CampaignApplicationConnection with its doc comment, binder lines 1711-2049 at d0a7dd8b6 (339 physical lines), lines 1579-1917 at cdd846752; re-measure at the A2 baseline and record both the registered 1724-2049/326 and the measured figures in the admission receipt."
2. "The class uses only IWireCampaignSocket and ICampaignSessionMembershipPort from the binder, both as types; import them with `import type` from './bindCampaignSyncConnection'. Runtime names come from campaignApplicationConnection.ts only."
3. "New imports the slice-1 file needs for the class: randomUUID (node:crypto); ServerMatchBroadcaster; campaignEventWireFrame; CampaignPublicAppliedViewStore and readCampaignPublicAppliedView, and type CampaignApplicationResult (@/lib/campaign/sync/campaignPublicAppliedView); type ICampaignHostRegistryEntry (./CampaignHostRegistry). None of these modules reaches the binder at runtime."
4. "After the move the binder no longer uses IApplicationCandidate, IApplicationView, COMMIT_ATTEMPTS, HEAD_DRIFT, preparePublicCut or sameAppliedView; drop those six exports (permitted as export-keyword changes), which returns sameAppliedView to base bytes and removes the explicit-module-boundary-types warning. Binder imports from the new module then: NOT_OFFERED, errorFrame, isApplicationAck, send, plus the ICampaignApplicationReceiptPort type re-export."
5. "Moved-text comparison wording: each moved block equals base modulo the export keyword and formatter layout; state which blocks, if any, are not byte-equal."
6. "Expected lint: binder max-lines warning drops further; campaignApplicationConnection.ts trips max-lines at about 400 counted lines (per #2167); madge chain count 175 (one new type-only binder <-> new-file chain) unless the parent rules otherwise."
7. "Counted-line estimate 372-380 of 500; 7 of 15 files with the reserved review slot."

## 8. Not verified

- `npm run test:stable` was not re-run (per brief); assessment in section 5 is from the author's logs and the test sources.
- The exact oxlint max-lines count A2 will produce (the #2167 "about 404") was not reproduced; my scanner-based count is a different method and only consistent in magnitude.
- No e2e, Electron or production build run; none is in this unit's registered selectors.
- The reserved admission-review slot was not written (reserved for the parent).

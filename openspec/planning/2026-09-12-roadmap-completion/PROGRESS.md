## 2026-09-28 P1B2 complete; P1B3 released (parent)

P1B2 (#2069, head `4bc1ee4dfe427aa8dc627bab523c399a175864af`, merge `24e7888e3458d6ea217eac7574bade5974b884ec`) publishes each accepted co-op mission exactly once. The co-op mission receipt now stores immutable `deployingPlayerIds` at create (unique, sorted owners of player-side deploy units, never client input), and after the create lock is released a server-only, lock-taking `CampaignMatchHost` door commits one `CampaignMissionLaunched` fact with command id `campaign-mission-launched:<campaignId>:<missionMatchId>` and the stored request fingerprint. An identical retry returns the prior receipt events and recovers a create-before-announcement interruption; a divergent identity, a legacy receipt without deployers, a store without the journal command lifecycle and a stale head are refused with typed 409s. It is 5 files with 84 counted lines. Lane A (gpt-6-sol, a different model from the gpt-6-astra implementer) reproduced the seven reds and approved the head.

The owner's standing merge instruction of 2026-09-28 (merge once CI is green and Lane A approves the exact head; for sensitive units the parent posts the ruling) is recorded in PK-p1b2-ruling; the parent posted `OWNER-RULING` comment 5862095085 and applied `owner-ruled`. The [exact-main proof](evidence/p1b2-mainproof-20260928.json) passed: build with the e2e marker, 12 runtime suites and 118 tests, the exact-main ladder (strict-smoke), tsc, the validator in four modes, openspec strict, qc:openspec-ci, the qc pin, lint (84 warnings, 0 errors), lint:units and format:check. P1B2 was folded and closed in one PR because its ruling was already given.

P1B3 is released from blocked to planned: its `admissionRequires` (P1B2 complete with an exact-main mainProof receipt) is met. `validate-roadmap.mjs --next` prints P1B3.

## 2026-09-28 P1B1 and U23 complete; P1B2 released (parent)

The owner approved both pending rulings in the working session and chose to have the parent transcribe them. The parent posted `OWNER-RULING` comments quoting the owner's answer on the exact reviewed heads (PR #2063 at `ff448e2`, comment 5861144908; PR #2065 at `7d9399f`, comment 5861145972) and applied `owner-ruled`. PK-p1b1-ruling and PK-u23-ruling now record the owner's decision, with the transcription disclosed in each packet's `ruling.deviationDisclosed`. Both product PRs merged pinned to those heads after 31 of 31 checks, CLEAN and no review threads: P1B1 as `6d58cd327dfdc8659bbfc6438a80e445a8986741` and U23 as `c032fec2f793a041996c052a502c613f9e8da936`.

Each exact-main proof ran `roadmap:main-proof` in the owned wave-A worktree detached at its merge: production build with the e2e marker, the runtime jest group, the exact-main ladder (strict-smoke), tsc, the validator in four modes, openspec strict, qc:openspec-ci and the qc pin, plus lint (84 warnings, 0 errors), lint:units (17899/17899) and format:check. P1B1: 13 suites, 417 tests passed ([proof](evidence/p1b1-mainproof-20260928.json)). U23: 13 suites, 113 tests passed ([proof](evidence/u23-mainproof-20260928.json)). Both closures report one parent and blob equality with the PR head.

P1B2 is released from blocked to planned: its `admissionRequires` (P1B1 complete with an exact-main mainProof receipt) is met. `validate-roadmap.mjs --next` prints P1B2. FN-u23-fingerprint-key-order stays recorded and unheld.

## 2026-09-27 spec triage of plan tasks 32-37 (parent)

The six spec-triage tasks are dispositioned in one ledger PR, with no spec, product or test file changed: product spec edits follow their owning unit. Nineteen findings now carry a `triage20260927` disposition, each keeping its prior status. Four are resolved by existing exact-main proof (U94, U95, U96, U29). Eleven are assigned to units: new units U99 (restricted-view convergence and baseline-author clauses), U100 (damaged-as-repaired feed copy), U101 (production scoped tokens), U103 (the closure tool still does not tick live task rows after U17c), U104 (launch-route saga proof) and U105 (guest snapshot acknowledgement), plus the planned U53 (strict-combat scenario rows; behavior amended), U57 and U54's admission. Three are product decisions the evidence cannot make, registered as undecided owner packets (checkpoint-carried day effects, destroyed units in the roster count, and intervention-history authority). R6.umbrella and R2.authority-live each gain one exact ownership path for the new units. The [analysis](evidence/triage-32-37-20260927.md) and the [round-2 register](evidence/uat-round-2-register-20260927.md) hold the evidence. U34's 80-row table stays inventory.

## 2026-09-27 U23 locally verified; owner ruling pending (parent)

U23 (#2065, head `7d9399f5abef0660f3889b01593857fbf609d091`) makes journal-authority commands fail closed at mode enabled. When the post-transaction journal mirror does not report `mirrored` (a non-mirrored result, a throw, integrity-conflict, a post-commit branch-integrity error, or an unavailable capability database, now recorded as a tripwire), the command returns `STORE_FAILURE`. An identical retry is a duplicate only when its fingerprint, the stored post-state digest and the canonical stored events all match, and it heals the journal from the stored data; a divergent same-id retry is refused before any journal call. Legacy, seed and rolled-back matches stay diagnostic, and a mirror mismatch on one match no longer refuses journal authority to later matches. It is 6 files with 119 counted lines, green in two processes with every gate and a production build. Lane A rejected the first head because a digest-only divergent retry could still be mirrored; the fix was reproduced red and approved at `7d9399f`. CI is 31 of 31 green.

U23 is folded to local-verified with the undecided packet **PK-u23-ruling**; the product PR stays unmerged until the owner rules. FN-u23-fingerprint-key-order records a pre-existing, conservative key-order sensitivity in the stored command fingerprint.

## 2026-09-27 P1B1 locally verified; owner ruling pending (parent)

P1B1 (#2063, head `ff448e2853523c0ec50890a5be85682cfaf05214`) registers the `CampaignMissionLaunched` event contract: a strict four-field payload, every exhaustive replay and projection consumer, a no-op reducer, campaign scope and a roster-free activity row, with the privacy latch unchanged and nothing emitting the event yet. It is 14 files and 291 lines, green in three processes with every gate and a production build, and Lane A (privacy, replay) approved it with no required edits after reproducing the reds. CI is 31 of 31 green.

P1B1 is folded to local-verified and the sensitive-class packet **PK-p1b1-ruling** is registered with no decision: the owner was asked for the exact-head ruling and has not answered, and the agent does not rule, comment or label on the owner's behalf. The product PR stays unmerged until the owner rules. `validate-roadmap.mjs --next` now looks past P1B1's in-flight paths.

## 2026-09-27 P1B1 ownership amended by two exhaustive replay consumers (parent)

Registering `CampaignMissionLaunched` in the live campaign union makes two more files compile- or test-enforced that P1B1's planned list missed: `src/lib/events/replay/ReplayInputProvenanceManifest.ts` (its provenance record must cover every campaign and game event type, so typecheck fails without a row) and `src/lib/events/replay/__tests__/ReplayBaselineDomainRegistry.test.ts` (it pins the live campaign count at 8). The P1B1 worker stopped at its ownership boundary with the other twelve files green. Both paths are added to node R2.authority-live and to P1B1 (`ownershipAmended20260927`); P1B1 becomes fourteen planned files, still within 15 files and 500 lines. No other unit, packet or finding changes, and `validate-roadmap.mjs --next` still prints P1B1.

## 2026-09-27 P1B split into P1B1, P1B2 and P1B3 (parent)

P1B stopped with BLOCKED-SPLIT before any product edit. Its red tests showed that a restricted guest's cold reconnect cannot carry the launch fact within the fifteen admitted files: the browser reconnect sends `CampaignJoin`, and both the member path (`CampaignSyncSession.joinMember`) and the room-code guest path send a safe folded baseline and then only events above the cut, so a state-preserving fact from before the cut never reaches the guest. A diagnostic with an already registered campaign-scoped fact confirmed it: delivered live, absent after a cold reconnect. The fix needs `CampaignSyncSession.ts` and `handleRoomCodeGuestJoin.ts`, a sixteenth file at least.

The [split evidence](evidence/p1b-split-admission-20260927.json) registers three dependency-ordered units, each within 15 files and 500 lines by estimate: **P1B1** registers the event contract (union, strict schema, replay registry, no-op reducer, scope, entity refs, activity and projection); **P1B2** stores immutable deployers and publishes the fact exactly once with recovery and live delivery; **P1B3** delivers the stored fact after a cold reconnect on the member, room-code and grant paths without weakening the privacy latch. The admitted decisions D1-D4 stand; a state-bearing reducer was rejected because stored checkpoints replace campaign state wholesale. P1B stays blocked and superseded, with no receipts fabricated. P1C, PAI, P2 and U38 now name the three successors. `validate-roadmap.mjs --next` prints P1B1.

## 2026-09-27 U17c complete (parent)

U17c (#2059, merge `3b4a7b1534afd95db0fc57d761ef265d02157f1e`) is complete. `roadmap-unit-fold.mjs` and `roadmap-unit-closure.mjs` now exit non-zero with the validator's own line (`LEDGER_INVALID_AFTER_WRITE`) when the ledger they just wrote fails validation; the write stays on disk and must not be published. The closure no longer writes fixed receipt claims: a unit with a non-routine review class needs a packet ruling bound to the PR head, which Lane B then names, or the closure refuses before writing anything; reviewer context, reviewer effort, checkout and merge method come from new flags or read "not stated by the closer"; the tick note no longer claims a packet holds the row; and observed failed rows come only from the closer's `--extra-runtime`. The parent rejected a first version that copied `expectedReds` into `runtime.failedRows`, which would have made the U41 check pass by construction. Every existing refusal is kept. Lane A reproduced all four reds against the baseline tools and a real fold CLI failure.

The [exact-main proof](evidence/u17c-mainproof-20260927.json) passed on its first attempt: both pin files in three separate processes (49/49 each), typecheck, lint, lint:units, format and the validator in four modes. This closure is the first written by the new tool with the closer's own flags, so no receipt field was corrected by hand. FN-p1a-ledger-tools-exit-0-on-validator-failure and FN-p1a-closure-fixed-receipt-text are resolved by U17c; FN-u17c-park-ignores-validator-result records that `roadmap-unit-park.mjs` still ignores the validator result and is not yet held by a unit. `validate-roadmap.mjs --next` now prints P1B.

## 2026-09-27 U98c complete (parent)

U98c (#2057, merge `d1297db61807e09019213842f40f30df5955a872`) is complete. The server-time test now measures each log size over 4 discarded warm-ups and 12 measured GM commands instead of 2 and 6, so a burst of up to five stalled commands can no longer carry a step's median. U89's growth rule, its thresholds, the sizes and every asserted row are unchanged; only the test helper changed (+8/−0). A test-local mutant that stalls the first three measured 1000-event commands by ~30 ms failed U98's row at the old counts (net `serverTotal` rose from 4.86 to 19.58 ms) and passed at the new ones, while size-scaled growth and a 60 ms rewrite still fail their rows. The added cost is about 0.66 s per run. Lane A reproduced the stall mutant at both counts, both protection mutants and three clean runs.

The [exact-main proof](evidence/u98c-mainproof-20260927.json) passed on its first attempt: five separate processes, typecheck, lint, lint:units, format and the validator in four modes. FN-u98b-stall-burst-takes-six-sample-median is resolved by U98c. The closure tool's fixed reviewer, checkout and tick text was corrected again in U98c's receipts (FN-p1a-closure-fixed-receipt-text, held by U17c). `validate-roadmap.mjs --next` now prints U17c.

## 2026-09-27 U98b complete; U98c registered (parent)

U98b (#2055, merge `e8a21edb15475df2728a538c0d96869be72e4376`) is complete. U98's server-time row now asserts `serverTotal` net of the separately timed record rewrite, and a new row bounds the rewrite at U89's 50 ms clause. Only the two test files changed (+21/−2). Lane A reproduced three green processes and two discriminating mutants.

The [exact-main proof](evidence/u98b-mainproof-20260927.json) needed two attempts on the same commit. Attempt 01 ran two processes green and failed its third on U98's row: net `serverTotal` rose from 4.37 to 23.78 ms. The cause was a burst of ~30 ms stalls on the first three measured 1000-event commands, each in a different step. Attempt 02 ran the full ladder green: three processes, typecheck, lint, lint:units, format and the validator in four modes. Both ladders are preserved.

Ten further runs on the same commit were clean. Across thirteen runs and 156 measured commands, that burst was the only stall over 15 ms. It is a separate defect: with six commands per size, a three-command burst can carry the median. It is recorded as FN-u98b-stall-burst-takes-six-sample-median and held by the new unit **U98c**, which raises warm-ups to 4 and measured commands to 12 without changing any threshold. FN-u98b-servertotal-row-includes-growing-rewrite is resolved by U98b.

The closure tool's fixed reviewer and checkout text was corrected again in U98b's receipts (FN-p1a-closure-fixed-receipt-text, held by U17c). `validate-roadmap.mjs --next` now prints U98c.

## 2026-09-27 two discovered defects registered (parent)

Closing P1A surfaced two pre-existing defects, now registered as planned units ahead of P1B.

**U98b.** PR #2053, which changes only the ledger, failed Unit Tests (3/6) on U98's server-time row (CI run 36337191504). That row asserts `serverTotal` does not grow, but `serverTotal` contains the whole-stream record rewrite that FN-u89 and FN-u98 already record as growing. In [six local runs](evidence/u98b-diagnosis-20260927.json), `serverTotal` grew x1.13-1.58, the rewrite x5-8, and `serverTotal` net of the rewrite x0.78-1.05. CI crossed the 2x clause at x2.17. U98b makes the row assert `serverTotal` net of the rewrite and bounds the rewrite by the 50 ms clause. It changes no threshold or product file (finding FN-u98b-servertotal-row-includes-growing-rewrite).

**U17c.** The fold and closure tools exit 0 after their own validator reports FAILED, and the closure writes fixed receipt text that was false for P1A (Lane B "not required", a root-checkout fast-forward, an `__E2E_MODE__` marker, a reviewer that re-ran the gates). U17c makes both tools exit non-zero on a validator failure and takes that text from the unit and the closer (findings FN-p1a-ledger-tools-exit-0-on-validator-failure and FN-p1a-closure-fixed-receipt-text).

`validate-roadmap.mjs --next` now prints U98b.

## 2026-09-27 P1A complete on main (parent)

P1A is complete. The owner answered the ruling question for [PR #2051](https://github.com/SwiggitySwerve/MekStation/pull/2051) with "Accept P1A scope (Recommended)" and then instructed "go ahead and transcribe and continue". On that instruction the parent posted the `OWNER-RULING a6eed9ddbcbf25373fb3873e2f3f1a3bbd83cf6a` comment (5857974832) and applied `owner-ruled`; `PK-p1a-ruling` records the decision, the ruling and that deviation from the out-of-band rule. The PR merged with a head-pinned squash and no administrative bypass as `d0347e7e6a236055a8af59c610cf6fb3ff650d35`: one parent, the 14 reviewed files byte-identical, 31 of 31 checks green.

The [exact-main proof](evidence/p1a-mainproof-20260927.json) ran in the owned worktree detached at the merge, not the root checkout. It covers a fresh production build, typecheck, lint (84 warnings, 0 errors), lint:units 17899/17899, format:check, 18 focused suites (131 passed), the real production HTTP run (47 of 47 cases, 9 server boots, all 526 artifacts hash-verified, cleanup checked) and the validator with `--git`, `--next` and `--github`. A first attempt stopped before any gate on a proof-script defect; its log is kept. The closure tool's fixed text about a gate-re-running reviewer, Lane B "not required" and a root-checkout fast-forward was corrected in the receipts.

P1B is released to planned because its predecessor now has an exact-main receipt; its admission must supply an immutable source for the announced deployers. P1C stays blocked on P1B. Plan task 2's aggregate proof, the server AI, browser launch proof and U38 enforcement remain unfinished.

## 2026-09-27 P1A local verification (parent)

P1A is locally verified at corrected product candidate `a6eed9ddbcbf25373fb3873e2f3f1a3bbd83cf6a`, based on `9f0d401dfdcbc832f48f678733b790d4566d271c`. The [local receipt](evidence/p1a-local-20260927.json) binds 14 source/test files to 131 passing focused tests and the CI shard (459 suites, 5,962 passed, zero failed, three pre-existing platform/asset skips). The earlier 47-case real-HTTP proof and production build cover unchanged runtime bytes. Product additions are 473 lines; test additions are 1,003 lines. The first CI failure and its stricter native-error assertion fix remain recorded.

The corrected head has an independent exact-head APPROVE and 31 successful CI checks on [PR #2051](https://github.com/SwiggitySwerve/MekStation/pull/2051). Owner-originated ruling evidence and the packet decision are not yet verified; guarded merge, exact-main proof and closure remain required. P1B/P1C, server AI, browser launch proof and U38 ownership enforcement remain separate unfinished work. No task row is ticked by this local checkpoint. Historical checkpoints below are unchanged.

## 2026-09-22 terminal checkpoint (parent)

origin/main 28d5b7d7b. `validate-roadmap.mjs --next` prints NONE-ADMISSIBLE (0 owner-gated, 3 blocked) with the validator PASSED: the loop's terminal state per GOAL.md. Since the loop checkpoint earlier today: U12b merged (#1885, 5917a6425; closure #1889; the parked U12 draft #1809 closed), U2b resumed (#1882) and re-parked on draft #1886 head cbb0e214e (#1887, packet shape repaired #1888) with E2E-19 green and E2E-25 refused at the candidate anchor, U2c planned (#1887), folded (#1890), merged on the owner's ruling (#1891, a28cda806; OWNER-RULING comment 5778168930) and closed (#1892): the privacy pack now runs armed, E2E-19 proven on main, E2E-25 authored verbatim and gated @until-journal-cutover.

Ledger: 32 complete, U3 main-verified, U2 / U2b / U12 blocked (parked drafts #1796 and #1886; U12's successor U12b complete); open packets PK-umbrella-acceptance-unsatisfiable and PK-u2b-ruling; five deferrals hold the remaining occurrences of the activated package. No tasks.md row was checked without a tick receipt; 21.2 stays held by U2b.

Proof limits: every runtime proof is fixture-armed (the tactical channel under the ladder arm, never the production journal flag, which stays off); E2E-25's letter is not discharged; the rewind rows E2E-40..44 and E2E-25 are gated on the combat journal cutover; the true-symlink branch of the U12b guard is proven by POSIX CI only.

Next action (owner): rule PK-umbrella-acceptance-unsatisfiable; decide the whole-row tick rule, U3b (21.1), the E2E-76 severability measurement, and node-close versus change-archive as the program goal. Next action (loop): none admissible until an owner decision or the cutover changes the ledger.

## 2026-09-22 loop checkpoint (parent)

origin/main 827ab5544. Since the 2026-09-15 checkpoints the program runs as the goal-drivable loop defined in GOAL.md and DELIVERY.md (seven stages with receipts; red-first with mutants; Lane A cross-model review on the exact head; Lane B owner rulings for sensitive classes; one product PR per unit, squash on the matched head; main proof on the exact merge commit through `scripts/qc/roadmap-main-proof.mjs`; tick only from a receipt on main). Ledger state in `units.json`: 30 units complete (U0, U1, U1b, U1c, U1d, U1e, U4, U5a-U5i, U6-U11, U13-U17b, U15a/b), U3 main-verified, U12b local-verified, U2b planned (resumed), U2 and U12 blocked on parked drafts.

Delivered this window: the owner ruled PK-rewind-commit-head-digest option (a) and then approved U5g on its head (OWNER-RULING comment 5771907101 on #1871, transcribed with disclosure): U5g the GM head route (#1871, 53bd8f0a8), U5h the client adapter carrying the digest (#1875, 145e15560; two test-fake fix passes, receipt #1876), U5i the producers sending it (#1881, dd7477070); closures #1879, #1877, #1882. U12b planned (#1878) as the narrow successor of parked U12 (guard CLI, no preinstall claim) and folded local-verified (#1883). U2b resumed (#1882) from draft #1860 by content; its fresh admission re-measures the two 2026-09-21 refusals.

Process deviation recorded: U12b and U2b were in flight at once although both own `scripts/qc` (`--next` refuses U2b while U12b is in flight); U2b's admission was taken when `--next` printed U2b, U12b merges first, and U2b's fold waits for U12b's closure. Council 3 (2026-09-21) measured the umbrella's recorded failures on main: E2E-16, the genesis clauses, the privacy and proposal packs green; the rewind rows honestly deferred; the acceptance packet remains the owner's decision.

Next action: U12b product PR, Lane A, merge, proof, closure (then close draft #1809); U2b lane result, fold, product PR, Lane A, owner ruling PK-u2b-ruling, merge, proof, closure, tick 21.2; then `--next` (expected NONE-ADMISSIBLE with the five deferrals holding the rest), the terminal handoff, and the owner decisions listed in the README line.

## 2026-09-15 publication complete (parent)

R0.publish is complete. #1758 (receipts batch 20260912-01, merge bf98c6f27), #1761 (audit data and review receipts, merge cb4058c6f) and the consolidated #1776 (merge b668d659a; 761 files from the sixteen reviewed heads, superseding #1759-#1775 which are closed) are on origin/main b668d659a with passing exact-main proofs (blob equality, single-parent squash, four openspec validators, and the roadmap validator on the combined merge commit). Cleanup: 16 superseded PRs closed, worktrees publish, publish-b removed, 14 owned publication branches deleted with content verified on main, root tripwire 59 -> 59 entries outside the planning directory. The combined-PR review (APPROVE with one required edit) found that the first attempt to record OD-publication-single-pr had been dropped by JSON serialisation (an object key set on the ownerDecisions array), so #1776 shipped a PROGRESS sentence and a PR body that overstated it; this PR adds the entry in the array shape, the #1776 body was corrected, and the review receipt records the applied edit. This accounting PR carries the publication receipts and the R0.publish terminal receipt; its own merge and proof receipts stay local, as for every terminal accounting PR of this program.

## 2026-09-15 publication consolidation (parent)

After #1758 (receipts batch 20260912-01) and #1761 (audit data and review receipts) merged with passing exact-main proofs, the user directed that all remaining documentation PRs go in one single PR (roadmap.json ownerDecisions OD-publication-single-pr). The sixteen open PRs (#1759-#1775 except the two merged) are consolidated into one branch built file-by-file from their reviewed heads; roadmap.json and PROGRESS.md are taken from the root checkout so this decision and the failed Grok review attempt (workerRouting20260915.grokReviewAttempt20260915) are recorded. Every superseded PR keeps its sonnet APPROVE receipt and is closed as superseded once the combined PR is merged and proven.

## 2026-09-15 publication start (parent)

R0.publish is executing per PUBLICATION.md from the `publish` worktree (detached at 1f67f814e). The read-only manifest (`evidence/r0-publication-manifest-20260915.json`) found three packaging facts that fix the PR shape. (1) `validate-roadmap.mjs` reads the allowed-state line of DELIVERY.md as the node enum and failed on 19 compound states introduced today, so each of those nodes now carries its enum base in `state` and the verbatim qualifier in `stateQualifier` (roadmap.json `stateNormalization20260915`); the validator passes (73 nodes, 13 packages, 376 tasks, 40 triage rows) and nothing is claimed beyond the prior compound wording. (2) README.md has no evidence links and PROGRESS.md cites receipts in prose only, so the generated receipts publish first as date-grouped batches (`evidence/r0-evidence-batch-plan-20260915.json`: 837 files in 11 batches, each at most 100 files and 2 MB with a sha256 manifest built from the index blobs; the 7 gitignored raw logs are recorded by hash, not force-added; six receipts exported with CRLF are stored LF per .gitattributes and their manifests carry both hashes), and the ledger prefix then needs only README.md, roadmap.json, validate-roadmap.mjs and admission-snapshot.json, with PROGRESS.md as its own preceding PR. (3) The audit README, inventory.md and inventory-overview.md link to each other cyclically, so they ship together (666 authored lines, the smallest set that activates no dangling navigation) after the four detail docs (419 lines) and the audit data and review receipts; the stale routing-package link in inventory.md is corrected to the verified archive path per PUBLICATION.md. The planning contracts follow as one six-file PR, then PROGRESS.md, the ledger prefix, ACTIVE-CHANGES-ROADMAP.md with the historical index, and last the publication receipts and the accounting PR carrying HANDOFF.md.

## 2026-09-15 late: user directives after closeout

User approved the exact payload for publishing the roadmap planning directory (R0.publish), and asked for a pull and a local-branch prune. Root fast-forwarded be7f85b86 -> 1f67f814e with the full dirty state preserved first (root-dirty-20260915: patch, copies, stash 7f8372fd7); 71 overlapping local edits merged cleanly, 12 files adopted from main (the root held older drafts of the published edits; root-only lines recoverable from the patch), 41 tracked modifications of user work remain. Twenty roadmap-owned backup/draft branches pruned after recording tips; user branches untouched; remote reference branch kept. Publication proceeds per PUBLICATION.md in capped prefixes from the new `publish` worktree.

## 2026-09-15 closing checkpoint (parent)

origin/main 1f67f814e. Terminal at the agent-reachable tier: 86 PRs (#1667-#1757) merged today as single-parent squashes, each with a merge receipt and an exact-main proof receipt (`evidence/main-proof-index-20260915.json`); six reconciliation batches merged; 179 of 376 admitted task rows checked on main. Since the night checkpoint: R4.S7-b (#1744-#1746, task 1.3 flipped) and S7-c (#1751); cutover CO0-CO2 (#1739/#1740) and CO3 two-process proof (#1747-#1750); authority-live rows (#1753-#1755) and the F-LIVE-1 live-socket detach fix (#1756); flake fixes #1741/#1742 (seventeen consecutive PRs without a rerun after); batches 4-6 (#1743/#1752/#1757).

Node states: 15 main-verified, 8 complete, 1 archived, 13 main-verified except an owner gate, 2 except an owner ruling, 1 measured except an owner gate, 1 with residuals, 1 local-verified, 1 publication owner-gated, 1 owner-blocked, 1 blocked, 28 planned (all behind owner decisions). New owner decisions today: OD-rewind-branch-reader, OD-launch-head-gate. Cleanup complete: 22 owned worktrees removed, 70 merged local branches deleted, references and the owner-blocked 6.2b draft retained, root dirty set (162) and root node_modules untouched. Full limits and deferrals in HANDOFF.md and roadmap.json completionStatement20260915.

## 2026-09-15 night checkpoint (parent)

origin/main a8ec5105d. Merged and exact-main verified since the evening checkpoint: #1726 recovery-redaction row; #1727 reconciliation batch 2; #1731 combat-browser launch proof (E2E build + spec run on the merge commit); #1728/#1729/#1730 R4.S6 stack (main-verified, S6-R1 now closed by S7-a2); #1733 R2.authority-host H0+H1/H2 single squash (828-line harness floor recorded; #1732 closed superseded, branch retained); #1734/#1735 R9.roster-damage S1+S2 (main-verified); #1736 reconciliation batch 3 (flips: design-campaign 6.1, saved-custom redaction row, journal 1.6; spec migration item 3 closed); #1737/#1738 R4.S7-a1/a2 (mirror strip; create-path seeding, mode off). Receipts `evidence/*-main-proof-20260915.json` for each. Admitted task rows checked on main: 178 of 376 (4 belong to the archived tab-precedence package).

Queued: #1739 CO0 marker wiring, #1740 CO1/CO2 parity driver + rollback surface (both APPROVE), #1741 selected-paper print settle fix (diagnosed CPU-contention race on the 2-vCPU runner; no timeout widening; APPROVE). Implementing: R4.S7-b marker retirement. Briefing: R2.authority-cutover CO3 two-process convergence/restart proof. Owed to reconciliation batch 4: #1735 population note, S7-a rows, CO0-2 rows once main-verified.

Command-level CAMP receipts now exist for every wave (camp-01b/c/d journey re-run on main 231c7848a full green, zero 403s); controller-registered and PR-provenanced tiers remain owner-blocked.

New/updated owner items: OD-rewind-branch-reader; cutover-owner flag that #1724's refreshAfterCommittedCommand is a second whole-record writer with no production call site (ordering decision owed at 5.7); host F-R1 in-mount reconnect hazard disclosed; cutover CLI has neither typecheck nor lint coverage (recorded); S7a-Q2/Q3/Q4 carried to S7-d.

## 2026-09-15 evening checkpoint (parent)

Merged and exact-main-verified since the afternoon checkpoint: #1721/#1722 (R2.authority 6.1 fence A+B), #1724/#1725 (6.4 CAS bridge A+B; 6.2b caller stays owner-blocked), #1726 (R2.combat recovery-redaction row). Receipts: `evidence/r2-61-fence-a-1721-*`, `r2-61-fence-b-1722-*`, `r2-64-bridge-a-1724-*`, `r2-64-bridge-b-1725-*`, `r2-combat-residual-rows-1726-main-proof-20260915.json`. Two DIRTY stacked PRs (1722, 1725) resolved by merging origin/main keeping the branch test file, hooks on.

Queued in order (merge manager): #1727 ledger reconciliation batch 2 (review edits RE-1..RE-4 applied: CAMP notes now record #1720), #1731 combat-browser launch proof (three consecutive greens plus a post-review green on a fresh E2E build), #1728/#1729/#1730 R4.S6 stack (APPROVE; rebuilt on main by cherry-pick; A 182 / B 340 / C 163 lines).

Local, reviewed, publishing: R2.authority-host H0 (red 6/7 on stale values) + H1/H2 (single shared fold `campaignAuthoritativeFold.ts`; APPROVE-WITH-REQUIRED-EDITS, comment-only; F-R1 in-mount reconnect hazard disclosed).

Implementing: R9.roster-damage S1 (maxima-derived figure, explicit unavailable state) + S2 (population through the canonical/custom source authority); R2.authority-cutover CO0 (marker wiring, zero callers today) / CO1 (parity driver) / CO2 (rollback surface); CO3 two-process proof after. Journey re-run camp-01b/c/d on main ≥ f685a5391 in progress (E2E build in archive-original-main-proof).

New owner decisions: OD-rewind-branch-reader (rewind fold unreachable for match streams: mirror writes onto the baseline branch, segment reader serves only root). Residual candidates recorded, not fixed: fire-and-forget terminal archive writes can double-fire (`GameSessionPage.lifecycle.ts`); S1 mirror cannot JCS-encode a real launch batch (routed to R4.S7a).

Infra: NEXT_PUBLIC_* are inlined at build time, so any lane that commits a .ts file has its E2E standalone build replaced by the hook's bare build; rebuild with the E2E flags before any post-commit live run.

## Checkpoint 2026-09-15 (afternoon)

Supersedes the 2026-09-15 (morning) checkpoint immediately below; that section and the 2026-09-13 section are preserved unchanged for history. Captured against origin/main tip 819ff6fd86696f88b7a9f23540b5caa2ca0a5ace (PR #1701 merge commit; confirmed via `git fetch origin main` + `git rev-parse origin/main` at capture time) and a fresh `gh pr list --state all --limit 60 --json number,state,title,mergedAt,mergeCommit` for PRs #1667+. Scope unchanged per roadmap.json counts: 13 packages, 376 task occurrences, 40 dispositioned rows, 73 dependency nodes.

### 1. PRs #1667+ (live GitHub state)

| PR | Title (short) | State | Merge commit | Exact-main proof receipt |
| --- | --- | --- | --- | --- |
| 1667 | print/export browser gate | MERGED | b39b8291 | browser-1667-main-proof-20260915.json (+ browser-main-proof-2-20260915.json after #1682) |
| 1668 | prepared journal append API | MERGED | 79c789e2 | api-1668-main-proof-20260915.json |
| 1669 | archive chassis index | MERGED | c3b4cc1e | archives-1669-1670-main-proof-20260915.json |
| 1670 | archive equipment catalog | MERGED | a018f717 | archives-1669-1670-main-proof-20260915.json (shared with 1669) |
| 1671 | history A genesis fixtures | MERGED | 4cf52fe7 | history-fixtures-1671-main-proof-20260915.json |
| 1672 | 80-row combat journal matrix | MERGED | 13e4b9ea | r4-matrix-1672-main-proof-20260915.json |
| 1673 | simulation-deferral receipt | MERGED | ebe80aff | r6-deferrals-1673-main-proof-20260915.json |
| 1674 | history B integrity refusals | MERGED | bcc34f7c | history-b-1674-main-proof-20260915.json |
| 1675 | D12 source-only projection decision | MERGED | b7d65099 | r2-projection-prereq-1675-main-proof-20260915.json |
| 1676 | QC registry repoint | MERGED | 0df5ed2b | camp-qc-registry-1676-main-proof-20260915.json |
| 1677 | camp01 umbrella pin | MERGED | 2d410f3c | camp-umbrella-pin-1677-main-proof-20260915.json |
| 1678 | customizer production browser gate | MERGED | 0f86b4ee | ci-customizer-gate-1678-main-proof-20260915.json |
| 1679 | CAMP live-probe fix | MERGED | fec1359b | camp-live-probe-fix-1679-main-proof-20260915.json |
| 1680 | [NEGATIVE PROBE] R1.ci 5.4 must block | CLOSED (unmerged, by design) | none | none — negative probe, never meant to merge |
| 1681 | history C forward migration 31 | MERGED | 1f84beef | history-c-1681-main-proof-20260915.json |
| 1682 | paper-size test-race settle | MERGED | 79de4f19 | paper-size-settle-1682-main-proof-20260915.json |
| 1683 | archive edit-recovery package | MERGED | bce2049d | archive-edit-recovery-1683-main-proof-20260915.json |
| 1684 | R4.S1 journal batch mirror | MERGED | 95042d91 | r4-s1-journal-batches-1684-main-proof-20260915.json |
| 1685 | client spec delta (1.6/D13/6.2a-b/6.4) | MERGED | 318f4ecc | r2-client-spec-delta-1685-main-proof-20260915.json |
| 1686 | P0b S1 private envelope field | MERGED | 69ae5374 | r2-p0b-s1-1686-main-proof-20260915.json |
| 1687 | P0b S2 source replay refusals | MERGED | 6a658c4a | r2-p0b-s2-1687-main-proof-20260915.json |
| 1688 | P0b S3 envelopeOf routing | MERGED | e7cbe9e0 | r2-p0b-s3-1688-main-proof-20260915.json |
| 1689 | CI job-scoped OpenSpec contract test | MERGED | 2af7b225 | ci-quality-test-1689-main-proof-20260915.json |
| 1690 | CI gate-weakening mutation tests | MERGED | 3bf09634 | ci-quality-mutations-1690-main-proof-20260915.json |
| 1691 | R4.S2 live journal-head admission | MERGED | 823bdf3a | r4-s2-live-head-1691-main-proof-20260915.json |
| 1692 | CI package task reconciliation | MERGED | 5fac5a58 | ci-package-reconcile-1692-main-proof-20260915.json |
| 1693 | R4.S3 derived started-state signal | MERGED | f8abc184 | r4-s3a-derived-started-1693-main-proof-20260915.json |
| 1694 | client crash-window discard flush | MERGED | c40a394f | r2-client-crash-window-1694-main-proof-20260915.json |
| 1695 | guest cache-stands fix | MERGED | 7f4ade5b | guest-cache-stands-1695-main-proof-20260915.json |
| 1696 | equipment abort-signal p1 | MERGED | c0428a2c | equipment-abort-signal-p1-1696-main-proof-20260915.json |
| 1697 | equipment abort-signal p2 | MERGED | 12906763 | equipment-abort-signal-p2-1697-main-proof-20260915.json |
| 1698 | P1 6.2a-1(i) prepared accept | MERGED | 818e654e | r2-p1-62a1i-1698-main-proof-20260915.json |
| 1699 | P1 6.2a-1(ii) refusal rows | MERGED | 484708a9 | r2-p1-62a1ii-1699-main-proof-20260915.json |
| 1700 | P1 6.2a-2 first-acceptance derivation | MERGED | 21b98e64 | r2-p1-62a2-1700-main-proof-20260915.json |
| 1701 | packaged-socket credential subprotocol fix | MERGED | 819ff6fd | packaged-socket-credential-1701-main-proof-20260915.json |
| 1702 | R4.S3b(A) repoint started-state callers | MERGED | 28e11430 | r4-s3b-a-1702-main-proof-20260915.json |
| 1703 | R4.S3b(B) pre-cutover transition pins | MERGED | f6c5bd15 | r4-s3b-b-1703-main-proof-20260915.json |
| 1704 | R4.S4(A) restart recovery from journal head | MERGED | 8cacf20a | r4-s4-a-1704-main-proof-20260915.json |
| 1705 | R4.S4(B) restart divergence + create-path gap | OPEN | none | none — not yet merged; DIRTY-resolution vs #1704 in progress |
| 1706 | P1 6.2a-3(A1) source record follows contract | OPEN | none | none — not yet merged; stacked after #1700 |
| 1707 | P1 6.2a-3(A2) refusal rows | OPEN | none | none — not yet merged; stacked after #1706 |
| 1708 | P1 6.2a-3(B) malformed-shape + same-actor re-submit | OPEN | none | none — not yet merged; stacked after #1707 |
| 1709 | authority-client crash-window proof spec | OPEN | none | none — not yet merged; part of the 1709-1711 land-together stack |
| 1710 | F1 fix: acknowledge hidden-transition flush | OPEN | none | none — not yet merged; stacked on #1709 |
| 1711 | case (a) close-discard proof | OPEN | none | none — not yet merged; stacked on #1710 |
| 1712 | R2.combat S5 co-op custom-authority proof | OPEN | none | none — not yet merged; reviewed APPROVE, queued |
| 1713 | R2.combat S5 unit-level snapshot-denial rows | OPEN | none | none — not yet merged; stacked on #1712 |
| 1714 | proof-02 starmap settle (third-cause fix) | OPEN | none | none — not yet merged; reviewed APPROVE, queued |

37 of 48 listed PRs are MERGED, all 37 carry an exact-main proof receipt on disk (verified via `ls evidence/*main-proof*`). 1 is CLOSED by design (negative probe). 10 are OPEN.

### 2. Node status (all 73 nodes; state + today's change + receipt)

| Node(s) | State | What changed today | Receipt |
| --- | --- | --- | --- |
| R0.plan | local-verified | no change | none |
| R0.contracts | complete | no change | evidence/r0-contracts-completion-20260912.json |
| R0.publish | implementing | no change (still local-verified documentation readiness from 09-13) | none |
| R1.specs | complete | no change | evidence/r1-specs-completion-20260913.json |
| R1.references | complete | no change | evidence/source-reference-comments-main-parent-acceptance-20260913.json |
| R1.archives | main-verified | chassis+equipment archives (#1669/#1670) and edit-recovery archive (#1683) all rechecked on exact main | archives-1669-1670-main-proof-20260915.json, archive-edit-recovery-1683-main-proof-20260915.json |
| R1.route | archived | no change | evidence/routing-closure-main-verification.json |
| R1.infantry | complete | no change | evidence/infantry-main-verification.json |
| R1.ci | main-verified | 3 remaining CI prefixes merged+proofed (#1678 gate, #1689 quality test, #1690 quality mutations) plus #1692 package reconciliation; negative probe #1680 confirmed the gate blocks a real regression | ci-customizer-gate-1678, ci-quality-test-1689, ci-quality-mutations-1690, ci-package-reconcile-1692 (all -main-proof-20260915.json) |
| R1.remote | main-verified | closure verdict CLOSABLE-NOW: all 6 acceptance lines satisfied, 20/20 taskKeys PROVEN on origin/main | evidence/r1-remote-closure-20260915.json |
| R1.browser | main-verified | #1667 rechecked 12/12 (attempt-2); paper-size flake diagnosed as a test race (not a product bug) and fixed via #1682 | browser-1667-main-proof-20260915.json, paper-size-settle-1682-main-proof-20260915.json |
| R2.receipts | main-verified-except-owner-gate | closure verdict: 13 PROVEN, 4 PROVEN-WITH-RESIDUAL, 2 OWNER-BLOCKED (tasks 6.1/6.2); CAMP live-probe fix (root cause: stale globalSetup path handling) merged as #1679 | evidence/r2-receipts-closure-20260915.json |
| R2.triage | implementing | fresh proof-02 reproduction run; two proved product-bug causes fixed (A: equipment abort-signal #1696/#1697; B: guest-cache-stands #1695); a third cause found on rerun (aborted campaign PUT on starmap navigation) with a test-side settle fix published as #1714 | none (per-slice receipts above) |
| R2.combat | implementing | admission brief found all 6 original tasks already implemented by #1635; S1-S4 re-verified at current tip; new S5 co-op custom-source-authority proof built and published (#1712/#1713) | none (per-slice receipts above) |
| R2.authority | admitted | D12 projection prerequisite merged (#1675); P0b S1-S3 all merged+proofed (#1686-1688); P1 prefixes 62a-1(i)/1(ii)/2 all merged+proofed (#1698-1700); 62a-3 source-row split (A1/A2/B) published as #1706-1708 | r2-projection-prereq-1675, r2-p0b-s1/s2/s3-168x, r2-p1-62a1i/1ii/2-169x-170x (all -main-proof-20260915.json) |
| R2.authority-live | planned | no change | none |
| R2.camp-0 | implementing | tasks 0.1-0.3 confirmed already shipped; 0.4 receipt run exposed a real validator defect (credential sent as &token= in the URL, not on the WebSocket subprotocol) — fixed and merged as #1701; a fresh receipt run on main is in progress | packaged-socket-credential-1701-main-proof-20260915.json |
| R2.camp-1, R2.camp-2, R2.camp-3, R2.camp-4, R2.camp-5, R2.camp-6, R2.camp-7, R2.camp-8 | planned | no change | none |
| R2.journey | planned | no change | none |
| R3.storage | main-verified | delivery prefixes A (fixtures, #1671), B (runtime integrity, #1674, needed a follow-up repair for a CI-only quarantine-reason failure), C (SQL integrity, #1681) all merged and rechecked on exact main | history-fixtures-1671, history-b-1674, history-c-1681 (all -main-proof-20260915.json) |
| R3.activation | blocked | closeout review found no edit required; confirmed still blocked — remaining halves of 2.4-2.6 and all of 2.7 depend on add-cross-stream-effect-receipts (R5.E*, 0/51 tasks, unarchived) | evidence/r3-activation-closeout-20260915.json |
| R3.combat | planned | no change | none |
| R4.matrix | main-verified | #1672 rechecked on exact main | r4-matrix-1672-main-proof-20260915.json |
| R4.S1 | main-verified | #1684 journal-batch mirror merged+proofed | r4-s1-journal-batches-1684-main-proof-20260915.json |
| R4.S2 | main-verified | #1691 live journal-head admission for 4 illegal command shapes merged+proofed | r4-s2-live-head-1691-main-proof-20260915.json |
| R4.S3 | sub-prefix-2-main-verified | sub-prefix 1 (derived started-state signal, #1693) and sub-prefix 2 A/B (repoint callers, #1702/#1703) all merged+proofed | r4-s3a-derived-started-1693, r4-s3b-a-1702, r4-s3b-b-1703 (all -main-proof-20260915.json) |
| R4.S4 | planned | prefix A (restart recovery from journal head, #1704) merged+proofed; prefix B (divergence refusal + create-path gap, #1705) is open with a DIRTY-resolution against #1704 in progress | r4-s4-a-1704-main-proof-20260915.json |
| R4.S5 | implementing | lane spawned today (revision-offset derivation); local work only, not yet published | none |
| R4.S6 | planned | no change | none |
| R4.S7 | planned | owner decision raised: design.md's S5/S6 naming (S5-a/S5-b + S6) disagrees by one with the roadmap's three-node S5/S6/S7 split — flagged, not blocking | none |
| R4.rewind | planned | no change | none |
| R5.E1, R5.E2, R5.E3, R5.E4, R5.E5, R5.E6, R5.E7, R5.E8, R5.E9, R5.E10 | planned | no change | none |
| R6.B4, R6.B5, R6.B6, R6.B7 | planned | no change | none |
| R6.umbrella | planned | no change | none |
| R6.deferrals | main-verified | #1673 rechecked on exact main | r6-deferrals-1673-main-proof-20260915.json |
| R7.versions, R7.context | planned | shared admission-brief pass confirmed still gated behind R2.journey (D8 program ordering); no drift found | evidence/r7-r8-vault-travel-admission-brief-20260915.json |
| R7.provenance | planned | same admission-brief pass; found a stale drift — roadmap's frozen quote says v1->v2 migration, but main's tasks.md/design D4 already say v2->v3 (schema v2 is occupied by campaign-authority metadata); tasks 1.2/1.3 already implemented, ledger reason string stale | evidence/r7-r8-vault-travel-admission-brief-20260915.json |
| R8.travel, R8.journey | planned | same admission-brief pass; no drift found | evidence/r7-r8-vault-travel-admission-brief-20260915.json |
| R8.opportunities | planned | same admission-brief pass; no drift found | evidence/r7-r8-vault-travel-admission-brief-20260915.json |
| R8.starmap | planned | same admission-brief pass; flagged that task 3.3's travel-in-progress rendering with second-commit suppression may need a design amendment since travel commits are instantaneous today | evidence/r7-r8-vault-travel-admission-brief-20260915.json |
| R8.isometric | planned | same admission-brief pass; found the roadmap's frozen canvas-vs-WebGL framing for task 4.5 is already settled by main's design D7 (extend the existing SVG 2.5D isometric renderer) | evidence/r7-r8-vault-travel-admission-brief-20260915.json |
| R9.triage, R9.close | planned | no change | none |
| R2.combat-browser | planned | no change | none |
| R2.authority-client | implementing | crash-window flush prefix P-A merged+proofed (#1694); browser proof of the acknowledgement path found one moderate gap (F1, a 409 on the reconciliation save) — fixed and published as a land-together stack (#1709-1711) | r2-client-crash-window-1694-main-proof-20260915.json |
| R2.authority-host | planned | no change | none |
| R2.authority-cutover | planned | no change | none |
| R9.equipment-loader | complete | no change | evidence/equipment-loader-main-verification-20260912.json |
| R9.validation-order | complete | no change | evidence/validation-order-main-verification-20260912.json |
| R9.roster-damage | planned | no change | none |
| R9.manifest-sync | complete | no change | evidence/manifest-sync-main-verification-20260912.json |
| R9.hydration-safety | complete | no change | evidence/hydration-safety-main-verification-20260912.json |

### 3. Open PR queue order and stacking

Currently OPEN (per live gh pr list), in the order the roadmap records them for the merge manager:

1. #1705 (R4.S4 prefix B) — stacked on merged #1704; DIRTY-resolution in progress (same test file add/add as the #1704 squash).
2. #1706 -> #1707 -> #1708 (R2.authority P1 6.2a-3 split A1/A2/B) — stacked in that order after merged #1700.
3. #1709 -> #1710 -> #1711 (R2.authority-client crash-window proof, F1 fix, case-(a) close-discard) — explicitly must land together as one stack, based on merged #1694.
4. #1712 -> #1713 (R2.combat S5 co-op custom-authority proof + snapshot-denial rows) — released to the merge manager in that order.
5. #1714 (proof-02 starmap third-cause settle) — independent, reviewed APPROVE, queued.

Historical DIRTY resolutions this session (mergeManagerReport20260915.dirtyResolutions), all resolved by merging origin/main into the branch and keeping the branch's own file contents, then pushing fast-forward (never force-push): #1687 (vs #1686 squash), #1688 (GitHub update-branch, no conflict), #1697 (vs #1696), #1698 (vs #1686), #1700 (vs #1699), #1702/#1703 (vs #1693/#1702 respectively), #1704 (merge-manager's update-branch already resolved it), #1705 (in progress), #1706 (vs #1700 squash + cherry-picked openspec commits, kept branch src + main's openspec files).

### 4. Owner decisions (ownerDecisions, 5 entries)

| Topic | Finding (one line) | Status |
| --- | --- | --- |
| R7/R8 D8 sequencing gate | R2.journey dependency is program-ordering, not structural, for most R7/R8 nodes, but IS structural for R8.travel 2.3 and R8.opportunities (CampaignEventType union closed) | decision needed: admit independent prefixes early vs. hold order; parent holds to recorded order until owner rules |
| OB-2 unauthenticated campaign routes | GET/PUT/DELETE /api/campaigns/[id] + adopt.ts have no auth and no owner column; risk depends on deployment surface (local desktop vs. hosted) | decision needed: close as not-a-defect for local single-user, or open an identity/owner-column item before hosted deployment; P1 proceeds either way |
| Single-player identity/seat (6.2b + OB-2) | no single-player identity/seat exists; /commands requires a co-op token + active seat | decision needed: define a single-player principal, or scope 6.2b to co-op hosts only; parent holds 6.2b |
| OD-flush-mechanism (R2.authority-client) | task 1.6 chose fetch keepalive over sendBeacon; measured on Chromium 143 the keepalive fetch is aborted before dispatch on an about:blank navigation-discard (0/15) and lands nondeterministically (1/2) on a same-origin navigation; close-shaped discards are solid (11/11) | owner decision required, not implemented; residual recorded |
| OD-journal-writer-authority (R4.S7) | design.md's S5/S6 naming (two seams, S5-a/S5-b + S6) vs. the roadmap's three separate nodes R4.S5/S6/S7 disagree by one | owner decision required before S7-d; S5/S6 proceed mode-off in the meantime |

### 5. Explicit deferrals preserved (unchanged)

- All production mode flips remain off (CAMPAIGN_JOURNAL_AUTHORITY_ENABLED=false; the R4 mode FLIP itself stays a preserved deferral per R4.S7).
- History tasks 8.1-8.3 — retained as explicit future-only simulation restrictions (R6.deferrals disposition, rechecked on exact main ebe80aff8); the existing GM correction/rewind route is explicitly distinct and not affected.
- CAMP eligible non-author review and three witnesses — still owner-blocked. R2.receipts externalGates: G1 (a real non-author APPROVED review) is unsatisfiable today because the repository has a single collaborator (SwiggitySwerve, admin) and PRs #1215/#1216 have 0 reviews; G2 (three authority-evidenced play sessions) remains OPEN — required session/result ids are absent from product source at c3b4cc1e3. R2.camp-0's githubReviewGate.soloException is false.
- 6.2b identity/seat — blocked per owner decision above; R2.authority.p1.p62b.state = "blocked-owner-decision".
- R3.activation 2.4-2.7 — blocked on add-cross-stream-effect-receipts (R5.E*, 0/51 tasks, unarchived).
- R7/R8 D8 order — held to the recorded roadmap order pending the owner ruling above.
- OB-2 — unauthenticated campaign record routes left as-is pending the owner ruling above; P1 work does not widen the exposure.

### 6. Infra/worktree notes

- Husky in worktrees (infraNotes.huskyInWorktrees): .husky/_ is created by the husky prepare script; a worktree without node_modules/npx husky has no hooks path and commits run no hooks silently. Lane worktrees that ran npm install had hooks; the parent's merge commits on #1687 and #1702 did not (recorded as a deviation in dirtyResolutions). From #1698 onward, npx husky is run in the merge worktree first so lint-staged + the full build gate execute on merge commits.
- node_modules junction (infraNotes.junctionNodeModules): camp-receipt-verification/node_modules is a Windows junction to the root node_modules; a next standalone build reproduces it and the hydration-safety guard correctly refuses it. Use a worktree with its own npm ci for any production build (confirmed again today in the proof02-rerun and camp00-disposable worktrees).
- Pre-commit build is not an E2E build (infraNotes.preCommitBuildNotE2E): the pre-commit hook runs a bare npm run build; NEXT_PUBLIC_E2E_MODE/NEXT_PUBLIC_E2E_TEST are baked at build time, so after any commit staging .ts the worktree holds a non-E2E standalone build (stores not exposed) — rebuild with the E2E flags before any e2e run or a store-exposure timeout will masquerade as a spec failure (measured today: BUILD_ID 1789472247303 vs 1789472881854). RETIRED 2026-09-23 by U62 (PR #1916, merge f1b14afb2): the pre-commit hook no longer builds, so a commit no longer replaces an E2E bundle.
- Worktree note: history-sql-integrity worktree is DETACHED at a1fd1aaa1; the S1 branch is actually checked out in history-runtime-integrity at e1ccf668c after a parent rebase — reconcile at cleanup.
- Concurrency ceiling deviation: the parent briefly ran 7 child lanes at once (ceiling is 6) when spawning ci-prefixes-3-4-rebase; recorded as a process deviation, not hidden, with no further spawns above 5 until resolved.
- GitHub auto-merge: delete_branch_on_merge is enabled (remote branches vanish on merge); the repository owner armed auto-merge on several early PRs, which fired ahead of some premerge receipts (recorded as race artifacts, not correctness issues — content guards ran before update-branch).
- No worktree or branch deletions have been performed as program-owned cleanup yet; this remains outstanding.

### 7. Proof limits and honest non-claims

- Navigation-discard loss residual (R2.authority-client.discardFlushDiagnosis): a user who navigates away via an external URL or full page load still loses up to 2s of pending mutations; tab close, window close, and in-app routing are covered by the crash-window flush. Product is spec-conformant (spec.md:157-158 requires only a best-effort issue, not a landing).
- Case (a) earlier green is unexplained (discardFlushDiagnosis.earlierGreenUnexplained: true): the about:blank navigation-discard case measured 0/15 (headless and headed) on Chromium 143 today; an earlier report of it passing has no root-cause explanation on record.
- CAMP-01 umbrella skip count: the qc:camp01-authority-receipt umbrella consistently reports exactly 10 skipped tests across every run today (731/25 suites, 753/28, 757/29 passed) with no further breakdown of which cases are skipped recorded in the roadmap — reported as observed, not decomposed.
- R2.receipts remaining: "731 passed / 10 skipped is tooling only" — does not establish the eligible exact-head non-author approvals or required runtime witnesses that G1/G2 still require.
- R4.S4 review non-claim: task 1.4's second clause (the umbrella restart-pack against a rewound match, E2E-05/06/15) is explicitly NOT claimed yet.
- R2.combat S5 non-claim: task line 7 is PROVEN for co-op only; stale/revision-mismatched snapshot adjectives still share one product branch/denial code, and live/e2e coverage is out of scope for this slice.
- R2.camp-0 receipt run: the validator fix (#1701) is main-verified, but the camp-00 receipt itself has not produced a closing receipt yet (receiptRunMain.status: "running"); closure remains externally gated on the CAMP review requirement regardless.
- R3.storage historical caveat carried forward: the isolated SQLite/readers/session proof does not establish a WebSocket or CAMP production cutover (unchanged from the 2026-09-13 checkpoint).

### 8. What's next, in dependency order

Computing "all dependsOn entries are terminal (complete/main-verified/archived) but the node's own state is not" against the current roadmap.json graph gives exactly four true frontier nodes (all already have work in flight today):

1. R2.triage (implementing, deps: R2.receipts — main-verified-except-owner-gate) — two of three proof-02 causes fixed and merged; third cause (starmap discard-flush timing) has a fix published as #1714 awaiting merge.
2. R2.combat (implementing, deps: R1.remote — main-verified) — S1-S4 re-verified; S5 published as #1712/#1713 awaiting merge; no S6 consolidated receipt yet.
3. R2.authority (admitted, deps: R0.contracts — complete) — P0b and P1 6.2a-1/2 fully merged; 6.2a-3 split published as #1706-1708 awaiting merge; 6.2b blocked on the identity/seat owner decision.
4. R4.S4 (planned, deps: R4.S3 — sub-prefix-2-main-verified, R4.matrix — main-verified) — prefix A merged; prefix B (#1705) mid DIRTY-resolution.

Immediately behind the frontier once today's open PRs land: R4.S5 (implementing, local-only lane already spawned, blocked structurally on R4.S4 closing) and R2.authority-client (implementing, P-A merged, F1-fix stack #1709-1711 awaiting merge, then 6.2b gates the rest). R2.camp-0 is implementing ahead of its formal dependency (R2.triage not yet terminal) because tasks 0.1-0.3 were already shipped independently; its remaining work (0.4 receipt run) is now unblocked on the merged validator fix (#1701) but externally gated on the CAMP review requirement (Section 5) regardless of task completion. R3.activation, though technically a frontier candidate on paper (deps: R3.storage, now main-verified), is explicitly blocked pending add-cross-stream-effect-receipts (R5.E1, wave 5) per its own closeout note — no independent action is available until that predecessor is admitted.

---

# Roadmap progress — 2026-09-15T09:16:35Z

Prior checkpoint (2026-09-13) preserved at .sisyphus/roadmap-completion-20260912/handoff-20260915/PROGRESS-before-20260915-refresh.md and below this section. origin/main at refresh: 5fac5a58c95c351cbfe37a7ab16fbb371b8022df. Scope unchanged: 13 packages, 376 task occurrences, 40 dispositioned rows, 73 dependency nodes. Authoritative per-node state, receipts and PR/merge/main-proof records are in roadmap.json.

## Merged and rechecked on exact main (2026-09-15)

| PR | Slice | Merge | Exact-main proof |
| --- | --- | --- | --- |
| 1669, 1670 | chassis and equipment archives | c3b4cc1e3, a018f717a | archives-1669-1670-main-proof |
| 1672 | 80-row source matrix | 13e4b9ea1 | r4-matrix-1672-main-proof |
| 1671 | history A fixtures | 4cf52fe73 | history-fixtures-1671-main-proof (27/3) |
| 1667 | print/export browser tests | b39b82917 | browser-1667-main-proof (12/12 attempt-2) + browser-main-proof-2 (12/12 at bce2049d with the settle) |
| 1668, 1673 | prepared journal append; simulation deferral receipt | 79c789e2a, ebe80aff8 | api-1668-main-proof (36/3); r6-deferrals-1673-main-proof |
| 1675 | D12 source-only projection decision | b7d650997 | r2-projection-prereq-1675-main-proof |
| 1676, 1677 | QC registry repoint; umbrella pin | 0df5ed2bf, 2d410f3ca | camp-qc-registry-1676 / camp-umbrella-pin-1677 main proofs |
| 1674, 1681 | history B (repaired) and C | bcc34f7cd, 1f84beef2 | history-b-1674 (206/1588), history-c-1681 (189/1463) |
| 1682 | paper-size settle (test race fix) | 79de4f195 | paper-size-settle-1682-main-proof |
| 1678, 1689, 1690 | customizer CI gate + quality test + mutations | 0f86b4ee9, 2af7b2259, 3bf096346 | ci-customizer-gate-1678 / ci-quality-test-1689 / ci-quality-mutations-1690 main proofs; Customizer Regressions ran SUCCESS on #1678 and the negative probe #1680 blocked the aggregator |
| 1683 | edit-recovery archive (third original archive) | bce2049d7 | archive-edit-recovery-1683-main-proof |
| 1685 | client spec delta (1.6/D13/6.2a-b/6.4) | 318f4ecc1 | pending docs batch |
| 1684 | R4.S1 journal mirror | 95042d919 | r4-s1-journal-batches-1684-main-proof (207/1596) |
| 1692 | CI package task reconciliation | 5fac5a58c | docs-only |

Nodes now main-verified: R1.archives, R1.browser, R1.ci, R3.storage, R4.matrix, R4.S1, R6.deferrals; R2.receipts slices C2/C3; R2.authority prepared-journal API and D12 prerequisite.

## Open PRs (merge manager queue, serial, head-guarded squash)

1679 CAMP live-probe fix (pin-corrected 71a22399f) · 1691 R4.S2 proof + task 1.2 amendment (stacked on S1) · 1693 R4.S3a derived started signal (stacked on S2) · 1686/1687/1688 P0b S1-S3 (stacked) · 1694 crash-window flush P-A · 1695 guest cache-stands fix. All independently reviewed APPROVE with required edits applied.

## In progress locally

6.2a market durability (reference b09a0f89f, being split into two capped prefixes); R4.S3 sub-prefix 2 caller repoint; equipment abort-signal fix (027549ce6, under review); CAMP-00 receipt run in a disposable checkout.

## Blocked or owner decisions

CAMP eligible non-author review and three witnesses (single-collaborator repository; sentinel receipts); R3.activation 2.4-2.7 on cross-stream effect receipts; R7/R8 D8 sequencing (structurally independent prefixes held to recorded order); OB-2 unauthenticated campaign record routes (no single-player identity or owner column; deployment-surface decision). Explicit deferrals preserved: history 8.1-8.3, all production mode flips off.

## Retained limits

Local proofs are not main acceptance; exact-main proofs cite the merge commit tested. Node runtime: CI is Node 22; jest under the explicit Node 22 binary; where typecheck/lint ran under ambient Node 24 the receipts say so. Owner armed GitHub auto-merge on the first five PRs; receipts record the race artifacts. No worktree or branch deletions performed yet; remote branches auto-delete on merge.

---

# Roadmap progress — 2026-09-13T10:52:35.461Z

Current handoff update (2026-09-15): PRs #1667–#1673 are open and all four protected checks passed on their current heads; each PR reports CLEAN. None is merged. Publication authorization is resolved. Browser integration typecheck passed, but its local production build has no terminal receipt and must be repeated in a new attempt before Chromium proof. No matching owned build processes were found; PID68448 is an unrelated reused app PID. See HANDOFF.md and .sisyphus/roadmap-completion-20260912/handoff-20260915/remote-pr-snapshot.json. Native goal status remains blocked; this handoff does not claim completion.


The execution goal is blocked awaiting exact publication approvals; the roadmap remains incomplete. The finite inventory is unchanged: 13 original packages, 376 task occurrences, 40 dispositioned rows and 73 dependency nodes. Current delivery details and original task mappings are in roadmap.json; HANDOFF.md contains continuation constraints.

## Independent simulation-deferral delivery

The historical R6.deferrals source receipt is committed locally at 20bb868fc5f6e9c1db7602b255eac6c67a50eb7d on codex/roadmap-r6-deferrals-20260913 in worktrees/r6-deferrals, based on 44b94adbbb333a9d4965e057b34290e19fc0e781. Its 15 source hashes match the clean base; no blocked commit is an ancestor. The single 109-line JSON passed independent readiness review, normal commit hooks and seven isolated checks under two-core affinity. The documentation-only hook skipped the production build. All owned driver processes are terminal; the checkout is clean. No source or original task checkbox changed.

Automatic approval review rejected push/PR creation before execution. The exact payload and reviewed body are in .sisyphus/roadmap-completion-20260912/r6-deferral-delivery-20260913/publication-payload.json; no publication-result.json exists. This is a seventh publication approval, separate from the six older requests. Do not retry or export another way without its exact approval. Canonical receipts: evidence/r6-deferral-local-commit-20260913.json and evidence/r6-deferral-publication-block-20260913.json.

Read-only CAMP refresh at 2026-09-13T10:43:06Z found zero reviews on the three historically sampled PRs1094,1217,1256. This is not an exhaustive review inventory and supplies no missing eligible approval. Raw: .sisyphus/roadmap-completion-20260912/camp-review-refresh-20260913T1040/report.json.

## Documentation readiness update

Seven current summaries were reconciled: both READMEs, inventory overview, top-level index, PR slices, worker policy and publication sequence. All 220 catalog entries and catalog bytes remain unchanged; routing links resolve locally. Original scope remains 13 packages/376 tasks/40 dispositions/73 nodes; the local active ledger contains 12 packages. Historical test runs and original snapshots stay separate from current delivery claims.

Five specification/accounting gates passed. Scoped formatting passed after correcting table padding; the first formatter driver syntax failure and initial formatting failure are retained. Final local whitespace/link and catalog checks pass. Owned check drivers and all three workers are terminal; root index remains unchanged. This is local documentation proof, not fresh product/runtime or main acceptance.

Publication is not ready: seven overview targets are absent from fetched main, and the planning contracts still have unpublished plain-text prerequisites. Seven exact publication approvals now remain pending; see the independent deferral delivery above. Canonical receipt: evidence/r0-documentation-readiness-parent-acceptance-20260913.json. Raw evidence and prior wording: .sisyphus/roadmap-completion-20260912/r0-publication-readiness-parent-20260913/.

## Current acceptance inventory

R4.matrix is local-verified as a source inventory. Its 80-row notepad maps 34 active assertion surfaces, six strict expected failures and 40 rows without complete assertions. These are not runtime pass counts. Parent and independent Terra reviews verified exact source anchors, classifications and existing successor ownership; six documentation/accounting gates passed. The three-file, 354-line delivery is committed at 6d493d508fe797e9a4342cbc0bd41b13ff376be4 in worktrees/r4-matrix. All seven isolated checks passed after the normal documentation commit hook, which applies its existing documentation-only build exemption. Automatic review rejected its push/PR before execution; exact user approval is pending. No new main proof is claimed.

## Locally verified history repair

| Prefix | Local commit | Change | Verification |
| --- | --- | --- | --- |
| A | 870f93856d5b09eb1ed7191be94a5a3e9e52103c | Three existing root fixtures use the canonical genesis digest; nine changed lines | 27 tests in three suites; explicit full build and static/spec gates |
| B | 22cbe105fc9b050cc136f823d4bddc5f6fb6c8fc | Persisted branch/head validation and campaign integrity refusal; five files, 335 changed lines | 421 tests in 47 suites without migration 31; normal hooks/build and remaining gates |
| C | fd335ee371c522957544c96b1e7f62772075b504 | Forward migration 31 guards new root/head writes; 11 files, 167 changed lines | 423 tests in 47 suites; normal hooks/build and remaining gates |

Independent review approved the corrected source, and the final composition matches all 19 reviewed file hashes. Earlier failed tests, the swallowed-error finding and red launch reproduction are retained. The repair rejects malformed authority without rewriting stored evidence or enabling player simulations. Unknown database exceptions retain prior compatibility. The isolated SQLite/readers/session proof does not establish a WebSocket or CAMP production cutover. Test totals overlap and must not be added.

Prefix A was normally committed before its missing generated hook wrapper was discovered. The existing wrapper was restored locally with unchanged configuration; explicit full checks subsequently passed on the exact commit. B and C ran their normal hooks. See the three r3-*-prefix-local-commit-20260913.json receipts.

## Delivery gates

Exact publication approvals remain pending for browser 77d9, journal 6f795, chassis archive f6078, equipment archive 0f26, fixture 870f, matrix 6d493 and deferral receipt 20bb868. Automatic review rejected the fixture push/PR before execution. Runtime B and SQL C have not been pushed; they must not export blocked A through another route. Protected checks, applicable real reviews, guarded merges, exact-main proof, reconciliation and owned cleanup remain required. R3.storage is local-verified, not complete.

## Documentation and retained limits

- R6 simulation restrictions now have a parent-verified source disposition. Player-authored simulation and promotion remain deferred; the existing GM correction rewind route is distinct. No runtime authentication or deployment claim was added.
- The remaining 28 publication fields were reviewed: 17 now name exact accepted specification/repair deliveries and 11 retain their local/pending scope. An incorrect overview PR attribution was rejected and corrected to PR1655. Independent review verified additive evidence links, unchanged dispositions and a single validation-order note correction. This supplements the earlier seven-note refresh; it adds no runtime acceptance.
- The equipment archive is locally committed and independently approved. Its five byte-exact moves and ledger removal passed documentation gates; publication and main proof are still pending.
- The approved Cursor launcher attempt failed at its hooks before file access. Terra completed the repair; the parent auxiliary browser diagnostic passed 1/1 on the existing frozen production build. The original committed combined browser suite remains 3/4. The named-selector repair already exists in blocked browser77d9.
- Previously accepted specification, reference, loader, validation, manifest, CI and other deliveries remain recorded in roadmap.json and their canonical receipts. This checkpoint does not reopen explicit Infantry/ProtoMech or full draft HUD deferrals. CAMP review/witness requirements and branch PR1–3 prerequisite exemption remain binding.

All three native workers and new verification drivers are terminal; seven exact process IDs were verified absent. The first detached PowerShell launch exited before driver startup and made no Git changes. Its retained second attempt used the verified Node supervisor and completed normally. See r4-matrix-delivery-20260913/attempt2/commit-gates.json. Root index and dirty work were preserved. No new fetch, public deployment, asset acquisition, dependency resolution or memory write occurred. Prior detailed progress prose and raw Git/process/accounting evidence are preserved under .sisyphus/roadmap-completion-20260912/checkpoint-r3-local-delivery-20260913/.

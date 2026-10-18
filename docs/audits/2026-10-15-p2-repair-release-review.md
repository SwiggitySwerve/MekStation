# P2 repair release review — exact-head verdict

**Verdict: APPROVE the exact signed source/composition candidate `f5015eee140199c32e72fa76e2e816c5fa5cc071`, tree `c8cfc352a83cf152ab744310025f0991f8329b15`. Unresolved blockers within this required review: none.** The complete release source delta, 16-commit packaging sequence, exact authored-byte equality, and final copied-input/donor reconciliation satisfy this independent REL-02 review gate. Root acceptance, publication, required CI, guarded merge, and actual Main proof remain separate obligations; this verdict does not declare P2 complete.

Reviewed by `/root/astra_p1_exit_r1` on 2026-10-15. The independently read native reviewer receipt recorded `gpt-6-astra / high`; served tier is UNKNOWN. Session: `C:/Users/wroll/.codex-cliproxy/sessions/2026/10/15/rollout-2026-10-15T02-44-44-01a13ebc-3458-7c53-b47e-37da44109bb0.jsonl`. The line 8 `turn_context` frame is byte offset 95,043, length 646 including LF, SHA-256 `191ad6e704182dca1591a38c5ec1b17ca76bcf780d48c9021b32cdcaeb6bc6ca`. This review used read-only source, Git, and receipt inspection; this audit is its only authorized new write. No tests, builds, browser sessions, product/control/evidence changes, Git mutations, or nested delegation were performed.

## Inputs and scope

- Review base: `07990c0aa43d22c9b34e347e0987e9318cbf71e5`, also independently confirmed as the merge base of W and that commit.
- W: `E:/Projects/MekStation-wt/usability-flow-20261012`; independently read HEAD `d8078d655871282e7e247b91148ff1ce02aa90d5`.
- The release union comprises the 20 commits above the review base plus the qualified 67 authored overlay paths. Reviewing only the overlay would omit consequential existing gameplay, persistence, and construction changes.
- [Qualified source manifest](E:/Projects/MekStation-wt/usability-flow-20261012/.omo/evidence/usability-final-repair-qualification-20261013/validation-r3-20261015/source-manifest.json): SHA-256 `982508d92304363407311a01abb7555a60e4841c59a23245a6807b6b42c3fe3b`. It records 18,033 files and 68 changed/new paths, including generated `next-env.d.ts`. During P2 preparation, all 67 authored overlay files were independently compared against their manifest byte lengths and SHA-256 values: zero mismatches.
- The tracked W delta against the review base spans 152 files, with 9,548 insertions and 1,369 deletions; that statistic includes the generated declaration and omits untracked authored files. The manifest, not this statistic, defines the authored overlay.
- Parent reported PR #2134 open at `324f3189d5fa2ff9ebacfa74dbf62a52634ed2de`. That old published head is not the reviewed final candidate.
- Packaging workspace C: `E:/Projects/MekStation-wt/usability-release-20261015-01a0febd`; final signed head `f5015eee140199c32e72fa76e2e816c5fa5cc071`, tree `c8cfc352a83cf152ab744310025f0991f8329b15`.

P1 is closed and retained under [the approved local qualification](E:/Projects/MekStation/docs/audits/2026-10-15-p1-local-qualification.md) and [Root acceptance](E:/Projects/MekStation/.omo/plans/mekstation-phased-delivery-20261015/p1-root-acceptance.md). This preparation does not repeat P1 or enlarge its original UX contracts. Release requirements are [REL-01–03](E:/Projects/MekStation/.omo/plans/mekstation-phased-delivery-20261015/near-term-tasks.md) and [commit admission](E:/Projects/MekStation/.omo/plans/mekstation-phased-delivery-20261015/p2-commit-admission.md).

## Source findings

The review inspected the product delta against the review base and the untracked production overlay owners, tracing consequential call sites and existing regression expectations. No concrete release-blocking correctness, privacy, durable-state, or contract-fidelity defect was identified in the inspected candidate.

| Area                           | Review focus and finding                                                                                                                                                                                                                                                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tactical controls and outcomes | Active-side phase control, confirmation dispatch, hotkeys, physical-phase reachability, initiative reset, bounded unlimited scenarios, and recorded concession precedence were inspected together. No conflicting transition or terminal-outcome blocker identified.                                                                          |
| Combat and construction        | Terrain and heat projections, explicit unavailable hit estimates, authoritative ammunition including empty mounted-bin construction, full machine-gun bins, first-call BV and equipment readiness, and arm-actuator topology through editing/save/printing were traced across the affected owners. No concrete regression blocker identified. |
| Quick Game                     | Saved-design validation/loading, scenario selection and force admission, repeat completion/adoption, linked session identity and recovery, stale async results, and Retry were inspected. The admitted unlinked-history limitation remains unchanged; no new durable unlinked recovery requirement is introduced.                             |
| Replay persistence             | Quick replay metadata repair, index-write serialization/atomic replacement, backfill and event metadata were inspected for history preservation and identity handling. No concrete history-loss or privacy blocker identified.                                                                                                                |
| Confirmation and settings      | Shared modal behavior, request lifecycle/context checks, navigation/removal/armor adapters, Omni controls, desktop settings and cache decision handling, reset settings and ErrorBoundary were inspected. Mocked Electron proof remains mocked; no live destructive operation is claimed.                                                     |
| Runtime and review support     | Development service-worker caching, opt-in analyzer/E2E initialization, and custody inventory changes were inspected within their affected boundaries. No concrete production exposure or custody-integrity blocker identified.                                                                                                               |

This is a source-review finding, not a claim that every behavior or platform was executed afresh. Existing P1 results and limitations remain authoritative for that local qualification, including its scoped passing regressions, strict assets/build/noEmit proof, and preserved historical whole-suite failure of 36,593 passed / 8 failed / 16 pending. No global whole-suite PASS is asserted.

## Exact-head composition and coherence

All 16 completed packaging stages have been independently reconciled through `f5015eee140199c32e72fa76e2e816c5fa5cc071`. For each immutable completed stage, the review compared its actual Git parent/tree/message and changed paths with the Root mapping, reconstructed its cumulative expected file manifest from the preceding receipt and pinned inputs, compared pre-hook and committed trees, checked the raw Jest suite identities/results, and read natural command exits, build/internal-TypeScript output, normal hook completion output and signature-verification receipts. No mismatch was found. These were receipt and Git-object reads, not replayed commands or fresh source inventories.

| Stage | Focused suites / passed cases | Signed head prefix |
| ----- | ----------------------------- | ------------------ |
| 01    | 4 / 18                        | `4bc999e048`       |
| 02    | 3 / 73                        | `1b47199976`       |
| 03    | 3 / 68                        | `b486335207`       |
| 04    | 2 / 26                        | `8117b89c1d`       |
| 05    | 1 / 12                        | `e66c387b96`       |
| 06    | 4 / 36                        | `84ccf12976`       |
| 07    | 2 / 59                        | `f70a5164b4`       |
| 08    | 5 / 74                        | `515604c3a5`       |
| 09    | 1 / 7                         | `5abacba3eb`       |
| 10    | 2 / 29                        | `819318b977`       |
| 11    | 1 / 26                        | `4009b0158b`       |
| 12    | 2 / 42                        | `c2f7d0ccbc`       |
| 13    | 8 / 131                       | `346cceac77`       |
| 14    | 8 / 131                       | `b62bc88646`       |
| 15    | 9 / 145                       | `36be7f8822`       |
| 16    | 9 / 192                       | `f5015eee14`       |

Every listed focused run has zero failed or pending cases. These per-stage totals overlap and are not a unique coverage count. Each ordinary production build and signed commit completed with natural exit 0 and no signal. Raw hook output records completed `oxlint --fix`, `oxfmt --write`, full `tsc --noEmit --skipLibCheck`, and application of task modifications; committed trees equal their pre-hook staged trees.

Stage 01's original wrapper failure remains at `01/failure.json`: it expected a literal `lint-staged` banner which the actual successful task reporter did not print. The original tests/build/commit had already exited naturally with success. The separate `reconcile-01.cjs` and `signature-reconciled.json` verify those original outputs, source/tree identity, and signature without replaying tests/build/commit. I inspected the raw completed tasks and reconciliation control; this is an accounted-for metadata predicate failure, not a concealed failed validation command.

All three Root mappings jointly enumerate exactly the 67 authored overlay paths. Historical snapshot hashes for stages 03, 12, 13 and 14 match their pinned inputs. The actual stage 12 completion-helper extraction and stage 14 linked-identity extraction were inspected as Git deltas and preserve the existing behavior before their subsequent behavior stages. Overview and Desktop Settings remain coherent grouped behavior commits rather than fabricated earlier extractions.

The inspected serial controller SHA-256 is `e58814c3df2fba5d06a3e1798b32645c5098ebe7db3ea3f31fdbc6cac26e4f7a`; the final reconciliation controller SHA-256 is `a5fb6cd75324b0e7ec83faf6a66e46499eaeae48e440dc82bfe31cb39a82ae73`. Both independently read hashes match Root's admission. The latter requires completed stage 16, verifies source/tool/hook identities, freshly inventories exactly the four copied and donor trees, and records all file/directory differences. Its summary reports differences explicitly; no drift was found in the completed result below.

Stages 15–16 have subsequently passed the same independent immutable-receipt and Git-object reconciliation with zero mismatches. Stage 15 is `36be7f8822af79f62f1e31fd653f3159f965799f`; final signed candidate is **`f5015eee140199c32e72fa76e2e816c5fa5cc071`**, tree **`c8cfc352a83cf152ab744310025f0991f8329b15`**. Their ordinary builds completed naturally in 119.958 and 109.832 seconds respectively, with internal TypeScript; raw hook tasks and signature receipts pass. These timings are observations, not controlled speedup measurements.

The final cumulative receipt contains 18,033 files and differs from the accepted P1 manifest only in the permitted generated production `next-env.d.ts`. The actual Git delta from `d8078d655871282e7e247b91148ff1ce02aa90d5` is exactly the 67 authored paths. I independently read all 67 committed Git blobs at the final head and compared byte lengths and SHA-256 values with the accepted P1 manifest: zero differences. The full release delta from the review base contains no `.omo`, `.audit`, `.next`, dependency-tree, temporary-build, database or `next-env.d.ts` paths. This directly binds committed authored content to the previously source-reviewed candidate without repeating a checkout inventory or P1 execution. The final equality receipt is `16/final-candidate-equality.json`, SHA-256 `6e653218b0c61ae8d1f1b076bb3de22a9b8806c7fe16de48c52211dfe4a46e00`.

## Final input reconciliation and release boundary

The retained [final reconciliation summary](E:/Projects/MekStation-wt/usability-flow-20261012/.omo/evidence/usability-release-20261015/final-input-reconciliation/summary.json) binds to the exact final head above and finished at `2026-10-15T10:50:28.726Z`. Its independently read SHA-256 is `dac7342d935b31680d7028c34b6d13cfe2e966d34b704158a64f160fed6c5fe5`. Root reported the owned reconciliation process's natural exit 0. I independently compared all eight retained final inventories (four C trees and four donor trees) with the original copied and donor-before receipts, verified the copy and historical-seal byte/hash pins, and reconciled the sealed file lists. All comparisons match exactly:

- Dependencies: 39,300 files and 5,146 directories.
- `biped_pips`: 504 files.
- `templates_us`: 25 files.
- `templates_iso`: 25 files.

All added/removed/changed-file and added/removed-directory lists are empty. The summary records complete W source/external-tool pin equality and unchanged normal-hook pins. No install/rebuild or unaccounted cache/dependency drift is substituted for equality. I did not repeat the inventory, tests, build, or P1 browser qualification.

The independent exact-head source/composition gate is therefore approved with no unresolved blocker. Required CI on the actual PR head, guarded merge identity, and actual Main proof remain their own REL-02/03 obligations; the old PR head's checks and local P1 cannot substitute for them. No W promotion or remote publication had occurred at this review's final handoff. Root owns those next integration actions and final P2 acceptance.

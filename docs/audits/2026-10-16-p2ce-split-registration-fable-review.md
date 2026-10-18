# P2CE split registration review (PR #2146)

- Reviewer: Claude Fable 5.1 (claude-fable-5-1), independent review sub-agent; author of the PR was Claude Opus 5.5
- Subject: https://github.com/SwiggitySwerve/MekStation/pull/2146, exact head 08dae1ba15d295c106e5e984ba4f84c244d0d30f, base a2280c40fda38603f5270250f182ede898b3bb6e (main)
- Worktree inspected: E:/Projects/Personal/MekStation-wt/p2ce-split-registration-20261016 (HEAD = PR head; `gh pr view 2146` confirms headRefOid, base main, state OPEN, 3 files)
- Scope of this review: read-only on the PR; this file is the only output. No OWNER-RULING, labels, packet decisions or ledger edits.
- Runtime used for validator proofs: Node v22.22.0 (C:\Users\wroll\AppData\Local\nvm\v22.22.0\node.exe)

## Verdict

**APPROVE-WITH-NOTES.** No blockers. The registration is byte-exact against its receipt, the per-slice census recomputes to the author's numbers from the stored patch, the slice order compiles forward only, the ledger chain is coherent, and the validator passes in every mode. Four non-blocking notes follow.

## 1. Diff shape and receipt integrity

`git diff --numstat a2280c40f 08dae1ba1`:

| File                                                                                                 | Added | Deleted |
| ---------------------------------------------------------------------------------------------------- | ----: | ------: |
| openspec/planning/2026-09-12-roadmap-completion/evidence/p2ce-split-registration-20261016.json (new) |   293 |       0 |
| openspec/planning/2026-09-12-roadmap-completion/roadmap.json                                         |    21 |       2 |
| openspec/planning/2026-09-12-roadmap-completion/units.json                                           |   194 |       7 |

- Exactly three files. No `src/`, validator, or test edits. The prior registration receipts (p2cb-saga, p2cer) are byte-unchanged.
- Receipt preimages and postimages match committed bytes exactly:
  - roadmap.json at base: 1063461 bytes, sha256 1d150eb1...fb0c; at head: 1064440 bytes, cce2c38d...6387.
  - units.json at base: 1275490 bytes, 25ab4a48...643e; at head: 1291715 bytes, c42646d5...0308.
- The receipt itself is UTF-8 without BOM (first bytes `7b 0a`).
- Evidence files named in the receipt (report.md, census.md, red.log, green.log, validation.log, p2ce-full-implementation-717.patch) all match their stated byte counts and sha256. The stored patch carries BOM + CRLF (sha256 of stored file 505899e1...0afd); after BOM strip and CRLF to LF it hashes to c396b1f4...9d67a, which equals the `git diff | sha256sum` recorded in report.md, and `git apply --check` succeeds against a2280c40f.
- The plan file hash in the receipt (456418 bytes, ddfca64e...de3c) matches the live plan.

## 2. Recomputed per-slice census

Counting rule applied: U41 as implemented in validate-roadmap.mjs, i.e. added lines from `git diff --numstat --no-renames`, files under `__tests__/` or matching `.test.`/`.spec.` uncounted, no deletion credit, every changed file counts toward maxFiles.

Numstat of the normalized patch against a2280c40f (independently re-run):

| File                                                     |      +/- |                        Counted |
| -------------------------------------------------------- | -------: | -----------------------------: |
| src/lib/multiplayer/server/bindCampaignSyncConnection.ts | +600/-22 |                            600 |
| src/lib/multiplayer/server/ServerMatchBroadcaster.ts     |   +80/-1 |                             80 |
| src/lib/multiplayer/server/handleRoomCodeGuestJoin.ts    |   +37/-0 |                             37 |
| **tests**/ServerMatchBroadcaster.test.ts                 |  +197/-0 |                              0 |
| **tests**/bindCampaignSyncConnection.test.ts             |  +103/-0 |                              0 |
| **tests**/coopMissionAnnouncement.reconnect.test.ts      |  +418/-1 |                              0 |
| **tests**/handleRoomCodeGuestJoin.test.ts                |   +67/-0 |                              0 |
| Total product                                            |          | **717** of 500 (7 of 15 files) |

Independent hunk-by-hunk attribution of the binder's 600 added lines (28 pre-class hunks = 140 lines, one class hunk = 460 lines), by which slice the line serves:

| Binder region                                                                                                                                                |  P2CE1 |   P2CE2 |   P2CE3 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -----: | ------: | ------: |
| Import hunks 1-3 (36 lines)                                                                                                                                  |      0 |      30 |       6 |
| Broadcaster import + IWireCampaignSocket extends ICallbackMatchSocket                                                                                        |      5 |       0 |       0 |
| applicationReceipts port + ICampaignApplicationReceiptPort                                                                                                   |      0 |      11 |       0 |
| lifecycle/broadcaster pair type, construction, destructuring                                                                                                 |     18 |       0 |       0 |
| application construction, threading through handleInbound/dispatch/join, hydrateApplication, join routing, lastSeq guard                                     |      0 |      42 |       0 |
| strict parse + isApplicationAck guard, envelope union, CampaignAck dispatch + numeric refusal                                                                |      0 |       0 |      28 |
| Class hunk: NOT_OFFERED/COMMIT_ATTEMPTS/HEAD_DRIFT/isApplicationAck/sameAppliedView                                                                          |      0 |       0 |      16 |
| Class hunk: IPublicCut, preparePublicCut, candidate/view types, class shell, open, invalidate, wake/enqueue/fail/prepare, refresh, publish without ACK hooks |      0 |     292 |       0 |
| Class hunk: pendingAck field + init, acknowledge, publish ACK hooks, processAck, commit + confirmation                                                       |      0 |       0 |     152 |
| **Binder subtotal**                                                                                                                                          | **23** | **375** | **202** |

Per-slice counted product lines:

| Slice | Product files                              | Counted | With ~16 lifecycle lines | Under 500 |
| ----- | ------------------------------------------ | ------: | -----------------------: | --------- |
| P2CE1 | ServerMatchBroadcaster.ts 80 + binder 23   | **103** |                     ~119 | yes       |
| P2CE2 | binder 375 + handleRoomCodeGuestJoin.ts 37 | **412** |                     ~428 | yes       |
| P2CE3 | binder 202                                 | **202** |                     ~218 | yes       |
| Sum   |                                            |     717 |                          |           |

This matches the author's 103 / 412 / 202 exactly. Two-way alternatives: E1+E2 = 515 (>500 before lifecycle), E2+E3 = 614, E1+E3 is not orderable because the ACK/commit code lives inside the class that E2 introduces. The three-way split is the minimal ordinary-cap partition of this candidate.

Caveats carried from the receipt and confirmed: these are attributions of one candidate, not measurements of each future slice. Each slice is still measured at its own admission. Because the rule gives no deletion credit, lines a later slice rewrites (for example P2CE2 widening P2CE1's `const { lifecycle } =` destructuring) count again, so the split is slightly conservative rather than generous.

## 3. Forward-only dependency order (E1 -> E2 -> E3)

- P2CE1 uses only base symbols. `ICampaignApplicationAck` (used in the sendConfirmed message union) already exists on base in src/types/multiplayer/Protocol.ts from P2CD. The binder's E1 part needs nothing from E2/E3. Note: as written in the candidate, the destructured `broadcaster` would be unused in an E1-only build (oxlint no-unused-vars is an error), so E1 will write `const { lifecycle } =` and E2 widens it. One glue line, already anticipated by the receipt's caveat.
- P2CE2 uses sendConfirmed (E1) and the broadcaster pair (E1). It references nothing from E3: `pendingAck`, `isApplicationAck`, `NOT_OFFERED`, `sameAppliedView`, `acknowledge`, `processAck`, `commit`, the strict schema and the CampaignAck dispatch branch are all attributable to E3 and removable without breaking E2. `campaignEventWireFrame` and `closeWithTypedError` are pre-existing binder imports. All P2CB/P2CD symbols E2 imports (CampaignPublicAppliedViewStore helpers, projectCampaignForViewer, campaignScopeAdmits, selectCampaignMissionLaunches) exist on base.
- P2CE3 uses the E2 class and E1 sendConfirmed. Nothing later.

Scenario coverage, mapped from the sibling's RED/green test titles to slices:

- P2CE1 (ServerMatchBroadcaster.test.ts, 9 cases): callback-only success, callback error, synchronous throw wins, callback-ignoring socket gets no success and cancels on abort, late callback after abort ignored, closed/aborted socket writes nothing, shared backpressure and behind state with broadcast, serialize failure, tracing on/off. Covers "successful send required" and "shared backpressure".
- P2CE2 (handleRoomCodeGuestJoin.test.ts 3 cases + the hydration/offer/delivery parts of coopMissionAnnouncement.reconnect.test.ts): uniform viewer-safe hydration with grant replica internal, failed hydration rejected, wrong room code never hydrates, failed/backpressured write establishes nothing while a healthy recipient continues, deltas linked to latest with hidden progress withheld, launch adjunct facts, opaque offer on an authenticated connection.
- P2CE3 (bindCampaignSyncConnection.test.ts 2 cases + the ACK/commit parts of the reconnect suite): receipt ACK on an unoffered connection refused with no numeric fallback, legacy numeric ACK kept, confirm only after the row commits, superseded/foreign/altered receipts refused, early ACK held in one slot then committed once, numeric/unadmitted/removed-participant ACKs refused and removed participant stopped, failed confirmation write keeps the row and closes.

Every Task 12 acceptance criterion and QA failure clause (plan lines 1131-1143) maps to at least one slice. The three leaves the candidate never edited (CampaignSyncSession.ts, campaignEventWireFrame.ts, CampaignSyncSession.test.ts) stay in the retained P2CE restriction and in every slice's selector as unedited regression suites, which is correct: they were not needed and must not be silently reassigned.

## 4. Ledger coherence (hand-enforced; the validator does not read these)

The validator machine-checks only: new units' state, ownership paths against the node, ciClass derivation, review classes, caps range, stage ladder shape, and `--next` ordering (and for `--next`, predecessors only when a unit carries a `registration20261016.predecessors` field, which the Task 8 P2C units and these slices do not use). Everything below was therefore checked by script and by reading.

- P2CE: state planned -> blocked; `superseded20261016` {at, by "P2CE1, P2CE2, P2CE3", note, evidence} and `blocked20261016` {cause, nextIndependentAction} have the same shape and wording pattern as P1B's `superseded20260927`/`blocked20260927` and U24's. All other P2CE fields, its restriction (10 leaves) and subtotal 11 are unchanged. Accepted as matching precedent.
- P2CE1/2/3: `splitFrom: "P2CE"`; caps 15/500; `ownershipPaths`, `ownershipExceptions`, `lifecycleOwnershipLimit`, `ciClass`, `reviewClasses` are string-equal copies of P2CE (all five review classes kept on each slice; P1B1-3 narrowed theirs, keeping all five here is the conservative choice and is fine); `taskKeys` empty; baseline/prHead/mergeSha/ownerGate null; all seven stage slots null; node R2.authority-live; inserted in order P2CE > P2CE1 > P2CE2 > P2CE3 > P2CF.
- `admissionRequires` on each slice is a successor-specific prefix followed by P2CE's text verbatim as a suffix (verified by exact string containment at end-of-string).
- States: P2CE1 planned, P2CE2 and P2CE3 blocked; both blocked slices say the parent releases them after the predecessor's exact-main mainProof PASS, matching P1B2/P1B3's `released2026..` pattern that the parent will later add.
- Chain: P2CE1 preds [P2CB, P2CD] succ [P2CE2, P2C]; P2CE2 preds [P2CE1] succ [P2CE3, P2C]; P2CE3 preds [P2CE2] succ [P2CF, P2C]. P2CF preds [P2CE] -> [P2CE1, P2CE2, P2CE3] with an `amended20261016` marker (same shape as P1C's `amended20260927`). P2C preds replaced in place, "All eight source slices" -> "All ten source slices" (count verified: 10), with the same marker.
- roadmap.json: `unit` string now lists P2CE1/2/3 beside P2CE; governing `evidence` re-pointed to the new receipt (as P2CER and the P2CB saga did); restrictions for P2CE1 (3 leaves), P2CE2 (4), P2CE3 (3) are exact subsets of P2CE's 10; subtotals 4/5/4 equal leaves + 1 lifecycle file, the rule every existing P2C subtotal uses; union of the three leaf sets leaves exactly the three unassigned leaves named in the receipt.
- The validator parsed both ledgers and `--git` found no ownership or cap violation on any merged unit.

## 5. Validator re-run (Node v22.22.0)

```
validate-roadmap.mjs          ROADMAP VALIDATION PASSED: 79 nodes, 13 packages, 381 tasks, 40 triage rows   EXIT 0
validate-roadmap.mjs --next   P2CE1                                                                         EXIT 0
validate-roadmap.mjs --git    ROADMAP VALIDATION PASSED (plus the pre-existing CNI1_SOURCE_SIZING line)     EXIT 0
node --test validate-roadmap.test.mjs   86 tests, 86 pass, 0 fail                                           EXIT 0
```

## 6. Cap-evasion opinion

Opinion: this split is a legitimate application of the ordinary-cap successor procedure, not an evasion of the 500-line cap.

- The governing clause (units.json P2CE.admissionRequires and roadmap.json R2.authority-live permissionBoundary, both quoting the plan): "If measured scope cannot fit, use the existing narrower separately registered ordinary-cap successor procedure; do not omit a required scenario." This is exactly the triggering condition: a complete, green, measured candidate at 717 lines, stopped at admission-by-cap before any commit, with no scenario dropped.
- Precedent: P1B (PR #2061, evidence/p1b-split-admission-20260927.json) was superseded by P1B1/P1B2/P1B3 when the fifteen-file cap could not hold cold reconnect; each successor then ran its own admission, red-first, review, merge and mainProof (visible in units.json P1B1-3 receipts). U24 -> U24a/U24b likewise. P2CE follows the same shape with the line cap as the binding constraint instead of the file cap.
- What would make it an evasion: a capException, cap inflation, a new alias or directory-wide grant, slices that are not independently meaningful or testable, or fabricated parent completion. None is present. Caps stay 15/500 on every slice; no new leaf is registered; each slice is a coherent seam (result-aware send primitive; offers plus same-cut hydration; receipt-ACK admission plus durable commit) with its own red tests; P2CE keeps no completion receipt.
- The plan explicitly permits dormant primitives in Task 12 ("Task12 and Task13 may land callable producer/consumer primitives while retaining legacy production traffic", 2026-10-09 clarification), so landing P2CE1 and P2CE2 before the ACK path is within the plan's design, and production stays legacy because server.js never composes `applicationReceipts`.
- The purpose of the cap (bounded, independently reviewable and provable increments) is preserved, arguably better than a single 717-line PR would have.

## Findings

1. **[LOW, non-blocking] P2CB.successors and P2CD.successors still name P2CE.** The receipt discloses this and says it follows how P1B's and P1's predecessors were left. That precedent citation is imprecise: P1A carries no `successors` field at all, so the P1B split never faced this choice. The pointer still resolves through P2CE's `superseded20261016.by`, the validator does not read `successors`, and P2CB/P2CD are main-verified units whose lifecycle fields the registration deliberately did not touch. Acceptable as is. Suggested follow-up for the parent: re-point both to P2CE1 at the next ledger edit that touches those units, or record in the P2CE1 admission receipt that the superseded marker is the resolution path.
2. **[LOW, non-blocking] coopMissionAnnouncement.reconnect.test.ts is not cleanly partitionable by file.** Its "hydrates ... and confirms only after the row commits" and "links deltas ... and refuses superseded, foreign and altered receipts" cases mix P2CE2 (hydration, deltas) and P2CE3 (confirmation, receipt refusals) assertions. The registration correctly lists the file under both slices, and test lines are uncounted, but P2CE2's red-first proof must author E2-only variants rather than copy the candidate's cases verbatim, and P2CE3 then extends them. The receipt's "may be reused for this slice's leaves only; this slice still runs its own red-first proof" already requires this.
3. **[INFO] NEXT does not enforce the P2CE1 -> P2CE2 -> P2CE3 order by itself.** `--next` reads predecessors only from `registration20261016.predecessors` (the Task 8/U99-U105 shape); these slices use top-level `predecessors` plus `source20261016`, matching the P1B1-3 shape. Enforcement rests on P2CE2/P2CE3 staying `blocked` until the parent's release edit, which admissionRequires states explicitly. Consistent with precedent; no change needed.
4. **[INFO] P2CE2 at ~428 counted lines with lifecycle leaves about 70 lines of margin.** Standalone glue (the destructuring rewrite, possible E2-only test scaffolding in product files is not expected) should fit, but the P2CE2 admission must measure rather than rely on this attribution. The sibling's concern about the binder's size (1773 lines against a 400-line soft max) is real; a dedicated `campaignApplicationConnection.ts` leaf would need its own registration and is correctly not smuggled in here.

## Checks performed

- `git diff --stat/--numstat/-p a2280c40f 08dae1ba1`; `gh pr view 2146` head/base/files.
- sha256 and byte counts of base/head ledgers, the receipt, the plan and all six evidence files; BOM/CRLF normalization of the stored patch; `git apply --check` against base; `git apply --numstat`.
- Hunk-by-hunk reading and attribution of all three product files in the patch; symbol existence on base via `git grep`.
- Scripted checks: admissionRequires suffix equality, field copies, chain symmetry, restriction subsets, subtotal rule, unit ordering, every predecessors/successors reference to P2CE\*.
- Validator full, `--next`, `--git`, and the 86-test suite on Node v22.22.0.

SHA256 of this file is reported in the review message and in the PR thread; it is not embedded here because the hash is of the final bytes.

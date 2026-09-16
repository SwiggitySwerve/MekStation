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
- Pre-commit build is not an E2E build (infraNotes.preCommitBuildNotE2E): the pre-commit hook runs a bare npm run build; NEXT_PUBLIC_E2E_MODE/NEXT_PUBLIC_E2E_TEST are baked at build time, so after any commit staging .ts the worktree holds a non-E2E standalone build (stores not exposed) — rebuild with the E2E flags before any e2e run or a store-exposure timeout will masquerade as a spec failure (measured today: BUILD_ID 1789472247303 vs 1789472881854).
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

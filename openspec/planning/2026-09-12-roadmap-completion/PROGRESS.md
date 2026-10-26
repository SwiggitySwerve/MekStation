## 2026-10-25 Registration correction: backup removal, Step 4 leaf lists, Step 3 rulings (ledger and docs only)

Recorded the owner's answer "yes and yes" (owner-decisions-20261025b.md, sha256 3177a4fa6df54d3dd033d2bead3767dd2ed30c5a5649af0253838846ad3ce9b2) to the backup-removal and Step 3 questions, and a Root ruling of 2026-10-25 on the stop report (reg-correction STOPPED.md) under the standing instruction. Evidence: [evidence/release-blocking-registration-correction-20261025.json](evidence/release-blocking-registration-correction-20261025.json), SHA-256 32f3d59a1caefa0589992927e69202fae34ae9dad2ed3fc71ff9103cfebe23c1. No unit state, receipt, cap or historical evidence changes; v220-steps.json and the Step 1 recorded hash are untouched; --next is unchanged.

- DESKTOP-DATA-OWN-2 (id kept) is now the backup removal: timer, tray item, create-backup and restore-backup IPC, preload exposure, BackupService wiring, the packaged validator assertion, and the service-call clearCache route. 10 leaves + 5 lifecycle = 15 files. S7-02, S7-05, the createBackup/restoreBackup half of S7-04, F-3 and F-4 are resolved by removal; S7-03 and the clearCache half of S7-04 are made unreachable, not repaired. DESKTOP-DATA-OWN-2B and the proposed -2C are retired; Step 4 prBudget stays 29.
- Registered two blocked backlog units outside the closures and in no step: DESKTOP-BACKUP-DEADCODE-1 (dead backup code, settings fields and unmounted dialog parts; may split at admission) and DESKTOP-DATA-EXPORT-1 (a plain user Export data). The planned node R2.desktop-platform gains three ownership literals.
- Leaf corrections to 15 files each: API-SAME-HOST-1 (variant B, fail-closed boot, 1 MiB frames), CAMPAIGN-LIVE-WRITE-1 (two test helpers and the dashboard page; the host's own DELETE is refused while a session runs), DESKTOP-DATA-OWN-1 (main.cleanup.ts; the ELECTRON_RUN_AS_NODE spike is an admission precondition), DESKTOP-GUARDS-1 (packaged-ipc-probe.js and the CI wiring test; the pre-upgrade safety copy is explicit; required CI depends on an owner setting that is not decided). RELEASE-PRODUCER-1's second proof now fails closed before an RC exists.
- Step 3 rulings (annotations on L1-SMOKE-B, -A2, -A2F and -A2M; L1-SMOKE-A2FP is not edited) and a release-notes gate annotation (the topology page misses 2 of the 7 checker strings and the lobby string names B15-PRIV, which is not in v2.2.0).

---

## 2026-10-25 L1-SMOKE-A2FP admitted (first Step 3 unit; ledger and evidence only)

Admits L1-SMOKE-A2FP on baseline 57fd9064c, after the LSC-2P closure in the previous commit of this PR. GOAL.md:10 and stepPlanDecision20261024.wip allow closure and the next admission to share one PR; implementation starts only after this PR merges. GATE OPEN is the Root brief for this PR (owner decision 5: Step 3 starts once LSC-2P closes). The registered undated evidence literal is kept ([evidence](evidence/l1-smoke-a2fp-admission.json)).

- Authority: HOLD lift (holdLiftAmendment20261024), the merge-through order, owner decisions 2026-10-25 1-8, the size-cap rule ownerRuling20261020SizeCapOptionA, and the Q-F3 interface change; proofClass full; no PK packet until GREEN.
- Fresh census at 57fd9064c with the commit-1 ledger: no literal collision on the four leaves, no open PR touching a leaf or consumer (only the draft #2113), the `scripts` alias of STEP2-RC-RERUN-1 grants nothing. All 15 controls are byte-identical to the prep hashes.
- Q-F3 is part of the frozen manifest: the 21-line interface change (connect, connOf, witnessRequest, offline, hash, need, lineage, command.trusted, runDirect) with the patch text, its sha256 and the amended leaf hashes; A2F and A2M reuse the leaves instead of copying about 50 lines.
- Measured fit (amended leaves): 619 literal leaf lines (86 + 249 + 284) plus the test file (445 lines, exempt). capException.countedLines is 657 literal and 373 under option A, measured with measure-cap.cjs on a drafted implementation diff (units.json +36, page +2); reachability.ts is test-support under Root's interpretation and the owner may overrule it before this PR merges (the contingency split costs two more PRs).
- Tests and mutants rerun on the amended leaves through heavy-run: 15 of 15 (the prep 13 plus the adopted M4/M10 gap tests). Killed: M1-M7, M9-M11, M14-M16, M18, M18b and M21; M4 and M10 are now killed outright. Survivors M8, M12, M13, M22, M23; M17, M19, M20, M24 and M25 need a built server and were not run.
- ownershipExceptions gain PROGRESS.md, V2.2.0-STEPS.md and the four literal evidence names; the new scripts/release leaves need `git add -f` at implementation.
- Open: B2 (owner may overrule the witness classification), B7 (the amended leaves have no built-image run yet), a test for the trusted flag, stub-image falsifiers for M17/M19/M20.

---

## 2026-10-25 LSC-2P closed; main-verified (exact-main packaged proof); Step 3 opens

Closes LSC-2P (PR #2335, reviewed and merged head 63c8fb8ac, merge 57fd9064c) as main-verified. The OWNER-RULING (comment 6404037472) accepted that exact head.

- Exact-main proof at clean 57fd9064c (its tree equals the reviewed head tree, so the eight proof leaves are byte-identical to the local receipt): fresh `npm ci` and `npm --prefix desktop ci`; `npm run electron:build`; the NSIS package built with `--publish never` and no token (MekStation-2.2.0-lsc2p.2-win-x64.exe, 177306577 bytes, sha256 c2e7ac5255a9b089adb330184ff7faab0d0c75b8d788c5df7b1f0a312037f0a1, installed MekStation.exe sha256 0e3171e01572724602f1728b564bb266fa833ea36c09fff84adaca84bc3ceb63, Authenticode NotSigned). G-P5: the registered command with the head spec and no flag, 22:34Z-23:37Z: 17 of 17 passed, exit 0, N4 before S5b, S3 real-time soak 1.0 h incl. N5, three distinct public playerIds. The restart again kept seats and ids and showed the InMemoryPlayerStore warning with matchRecovered=no (recorded, not asserted). G-P7 at the same clean tree: v220 tests 130/130, generate-v220-steps --check, validate-roadmap plain, --git and --github (94 nodes) all exit 0, validate-roadmap tests 86/86.
- Receipts: review (the two Opus reports in one byte envelope, M-1..M-4 and the listed Low fixes applied in 63c8fb8ac, the accepted-on-the-record items), merge and mainProof; the ruling comment is byte-copied and equals the live comment and the Root copy; one log envelope holds the tool-check, build, install, run and authority logs and the PowerShell recipe. PK-lsc-2p-ruling decision and ruling are filled.
- No v220-step-evidence.json Step 2 entry (owner decision 5): Step 2 keeps the generator default "not started | manual evidence pending" until STEP2-RC-RERUN-1 reruns it on the RC build; the page now shows LSC-2P main-verified.
- Carry-forward routing (units.json LSC-2P.carryForwardRouting20261025): CF-SMOKEA1-7 (identities survive a restart; player profiles do not) and F4 (no automatic reconnect) are open decisions for Root, P2J depends on the first; F1 security half stays with CAMPAIGN-LIVE-WRITE-1; STEP2-RC-RERUN-1 gets L-1, L-2, L-4, M-4, L-7 and L-9; F2/F3/F5/F6/F7 are recorded; the ghost-removal UI is LSC-GM-REMOVE-1; the password-manager prompt is a Step 8 human item.
- heavy-run: the packaged run held its package ticket for about 66 minutes against the 30-minute lease, as the first run did; the lsc-2p-closure OVERDUE marker is for Root to clear.
- No successor is released: P2J and P2CG1H keep other open predecessors. Step 3 opens by the admission of L1-SMOKE-A2FP in the next commit of this PR.

---

## 2026-10-25 Release-blocking units registered from the quality review (ledger and docs; budget pin)

Recorded the owner's council-plan decisions 1-8 (owner-decisions-20261025.md, sha256 c3189f30c2bda017857384129eef501c5233aad6dc01dc43a5ba9358a9d2eab4) and the 2026-10-24 d desktop/origin decision (sha256 e1633c49a158f2e76e1ba137c63f79a281a5ad7e6b47da770bde0fc825663eef) verbatim as `ownerRuling20261025ReleaseBlockingSet`; receipts stay outside the repository.

Registered seven blocked release-blocking units and one post-v2.2.0 backlog unit ([evidence](evidence/release-blocking-registration-20261025.json), SHA-256 4aad7594c9c2c7a739147cae2a8a68362b51c5e640969dc5a47803c2c561cf38) on a64cb3fe6d82da8598fcc89341f0db5ecbfec45f; none is admitted and --next is unchanged:

- Step 4 front, in order: API-SAME-HOST-1 (one Host/Origin/Sec-Fetch-Site guard in server.js for every route and the WebSocket upgrade, plus a 1 MiB frame limit; absorbs B15-AUTH-ORIGIN by annotation), CAMPAIGN-LIVE-WRITE-1 (the server decides who may save or delete a live co-op campaign from the verified bearer), DESKTOP-DATA-OWN-1 and -2, DESKTOP-GUARDS-1, and STEP2-RC-RERUN-1 (after LSC-2P closes).
- Step 7 position 1: RELEASE-PRODUCER-1 (CI produces the v220-qualified bundle on the RC commit).
- MULTI-WINDOW-SESSION-1: owner decision 6 backlog, outside the closures and in no step.
- New roadmap node R2.desktop-platform. S5-01 is added to P2CG2 by annotation, with CAMPAIGN-FRAME-ADMIT-1 named as the fallback.

l1ReleaseChecklist20261018.closures goes from 47 to 54. Step 4 prBudget 16 -> 29, Step 5 4 -> 7, Step 7 1 -> 3; the adopted-budgets pin in scripts/__tests__/v220-steps.test.mjs is edited with them, so this PR is product class. Step 2 scope now says "no implied server authority" and lists the HOST badge as a known issue (owner decision 2). Step 3 selection follows LSC-2P closure, not Step 2 completion (owner decision 5). Steps 0-3 carry no unit or doneTest change, so the recorded Step 1 evidence hash still validates. LSC-SALVAGE-1 is not promoted: the co-op host repro did not reproduce (owner decision 3 outcome), so it stays post-v2.2.0 and outside the closures; it gains one annotation recording the result and that its repair must also cover the co-op path.

B15-AUTH-ORIGIN, B15-1, B15-2, B15-3, B15-3R, P2CG1H, P2CG2, LSC-SALVAGE-1, U66 and U81 gain one annotation each. No unit state, receipt, cap, ownership entry, predecessor or successor of an existing unit and no historical evidence changes; LSC-2P is untouched.

---

## 2026-10-24 tsrs HOLD lift and follow-up registration (docs only)

Recorded the owner's lift of the tsrs HOLD (owner-decisions-20261024b.md item 1) as the dated `holdLiftAmendment20261024`. `stepPlanDecision20261024` is retained unchanged; GOAL.md:10, DELIVERY.md:10 and the V2.2.0-STEPS.md header source (generate-v220-steps.mjs) now say the HOLD was lifted and the Windows tsrs re-run is advisory.

Registered five blocked follow-up units ([evidence](evidence/root-registration-20261024.json), SHA-256 29a494f49fa396b759781daf6ec33688f6c6b96c51bd1af7f18fd2b715414f9b) on 1c8a05d1c6c8151432cdeb2a011a2ffd2e4b8d2a; none is admitted and --next is unchanged:

- LSC-GM-REMOVE-1: the GM remove-member control (Q8, owner decision 4). It must land before the v2.2.0 human session, so it is added to l1ReleaseChecklist20261018.closures (46 -> 47) and assigned to Step 5 in v220-steps.json, the only unit assignment changed in that file. Step 5's prBudget (4) is not changed; the owner must re-rule it before this unit is admitted.
- MP-CAMPAIGN-HOST-LIFECYCLE-1: CF-MPCHD-1..5.
- MP-REWIND-DICE-2: CF-MPRD-4 and CF-MPRD-5.
- LSC-CONSOLIDATE-1: CF-LSC2C-2R and CF-LSC2-L1-DUP, then LSC-STORE-RULES-1: CF-LSC2-STORE-RULES and the IDENTITY_CHANGED recovery gap.

Recorded owner decision 2026-10-20 item 2 (size cap option A: test and fixture code excluded from the 500-line cap, file count unchanged) as `ownerRuling20261020SizeCapOptionA`, with a Root interpretation for proof-harness test-support leaves; the validator is not changed.

P2CG1H and P2CG2 gain one admission note for CF-MPCHD-5. No unit state, receipt, cap, ownership entry or closed-unit record changes. L1 closure accounting moves from 46 to 47 (LSC-GM-REMOVE-1).

---

## 2026-10-20 LSC-2OP main-verified; only LSC-2 released

#2309 merged at 0372f9d1dc51af9b463f93b2d9e2151892b8a0e1, ruled head 34cb0eb1e15805267c25ffcbe48ed5f3df8e241b; Opus reviewed 05da7d97b71e7fdb3617bd060af0c07de4cc6964 as REQUEST CHANGES. Root diffed the single F1/F2/T1/F3/F5 fix commit, accepted it in live comment6300739754 and merged after32/32 exact-head CI. No second full review or revised Opus verdict is claimed.

Review 24408 bytes SHA256 2a7359800f0c3014b705039bfa716a7ce6bc31f8e010946389aa428a896db9bc and live ruling 1593 bytes SHA256 f7276d879b2cf4a32dd7c3d0992ed55450a3da4181ed3908120839a5699affa5 are byte-preserved in base64 envelopes. The ruling is captured from the live API body, not a local ruling file. PK-lsc-2op-ruling binds it.

[Main proof](evidence/lsc-2op-mainproof-20261020.json): fresh npm ci; owned plus B14/match-history guards103/103; co-op/vault/API/auth regression1126/1126 across67 suites; typecheck PASS, all at clean exact 0372f9d1dc51af9b463f93b2d9e2151892b8a0e1 through heavy-run --lane lsc. Raw logs and runner are preserved. Implementation was345/500 counted lines,10 changed files plus1 reserved review slot. [Merge receipt](evidence/lsc-2op-merge-20261020.json) binds source/test/control hashes and clean integration. Original admission/RED/local evidence stays unchanged.

Carry routing:

- CF-LSC2OP-1 -> LSC-2: Retain the reviewer obligation in the receiving unit.
- CF-LSC2OP-2 -> LSC-2 / LSC-2P: Retain the reviewer obligation in the receiving unit.
- CF-LSC2OP-3 -> Root / separately registered server follow-up: No registered server-follow-up unit was named by the ruling; Root retains registration responsibility. This closure grants no server source scope.
- CF-LSC2OP-4 -> LSC-2P: F5 autocomplete purposes fixed in-PR; packaged password-manager/autofill verification remains LSC-2P.
- CF-LSC2OP-5 -> LSC-SALVAGE-1: #2310 registered LSC-SALVAGE-1; preserve its state and recorded release policy. No salvage repair or browser PASS claimed.

LSC-2 predecessor states: LSC-2OP=main-verified. Only LSC-2 moves blocked -> planned; LSC-2P and LSC-SALVAGE-1 retain their states. Root explicitly directs pipelined LSC-2 admission on the published closure head; closure verification, CI and merge remain Root-owned. No LSC-2 product PR, packaged acceptance, salvage repair or browser PASS is claimed.

---

## 2026-10-19 P2CG1HP source verified on main

P2CG1HP moves from implementing to main-verified after #2307.
Exact source merge: ca92b6a01c07e5038c2d1b3840117af72b0a3ed3.
Ruled head: aa1b70d8379e22d6031d7ea5546af53bf0dd370a; independently reviewed head: e582634ce9f8f4365200e3ec6ad2cca28c4f88f7 (CF-HP-4).
Opus full review: APPROVE-WITH-IN-PR-FIXES, no product defect; exact 13,967-byte copy
has SHA-256 a9cec46cb56650953851cbf81946b90e83739e3ad55c0453450309776b4352aa.
F1 subsequently changed one test leaf (+41/-0), killed R08 and passed 131/131 owned tests.
Root diffed and accepted that follow-up; no second independent review is claimed.
PK-p2cg1hp-ruling binds the posted ACCEPT comment; ruling and review are byte-copied.
All 32 source-head checks passed; two-parent merge tree reconstructs exactly.

Fresh proof at exactly ca92b6a01c07e5038c2d1b3840117af72b0a3ed3 before closure edits:
- npm ci and Node v22.22.0 through the heavy-run queue, lane hp.
- Owned: 2 suites, 131/131 tests.
- Regression: 18 suites, 384/384 tests.
- Typecheck and the unedited ledger validator passed; seven raw-log/JSON envelopes preserved.

Successor release: NONE.
- P2CG1H stays blocked; waiting on LSC-2P, L1-SMOKE-A2, L1-SMOKE-B, MP-CAMPAIGN-HOST-DEDUPE-1.
Eligibility is computed from all declared predecessors and mainProof PASS; no other unit changes.

CF-HP-1, CF-HP-2, CF-HP-3 and open CF-S-1 -> P2CG1H.
CF-MPHD-4 was routed to H by the source ruling; #2310 assigns its repair to MP-CAMPAIGN-HOST-DEDUPE-1, an H prerequisite.
I3 (visual spacing check for the empty status paragraph) -> P2CG1H / LSC-2.
CF-H7/CF-G4, CF-H14, CF-H15, CF-H8/CF-G5 member seat and CF-H12 are discharged.
CF-HP-4 is discharged here by the separate reviewedHead record.
Other review carry-forwards pass through without rewriting prior receipts or expanding scope.
No task tick, browser/build smoke, fog projection restoration or receipt-port installation is claimed.
This closure still needs its own CI and Root review/merge.

---

## 2026-10-19 MP-RECOVERY-UNITS-2 source verified on main

MP-RECOVERY-UNITS-2 moves from review-required to main-verified after #2306
(reviewed and ruled head 8bc3ebfd32a7789f8b4c6c20e1c48f638946b992, merge 1fff48df38a4d51dc235724f9bc6f7960b578e03).
The independent Fable review is copied byte-for-byte: 23,423 bytes,
SHA-256 24d2f0b7d00ce7ae50e90ba79bb2109a8930faffb7a55aaca6f6a654578d0236.
PK-mp-recovery-units-2-ruling binds the exact posted OWNER-RULING; source CI is 32/32.
The merge receipt verifies clean two-parent integration and preserves the source manifest.

Fresh proof at exactly 1fff48df38a4d51dc235724f9bc6f7960b578e03, before closure edits:
- Fresh npm ci on Node v22.22.0.
- Multiplayer server, including all three owned test leaves: 179 suites, 1591/1591 tests.
- Related engine/API/catalog: 7 suites, 54/54 tests.
- Typecheck and the unedited ledger validator pass.
All proof runs used the heavy-run queue, lane mp-recovery2, and a private Jest cache.
Seven base64 envelopes preserve the raw proof logs/JSON.

Only L1-SMOKE-A2 and MP-REWIND-DICE-1 are released (blocked -> planned), computed from the ledger after this transition.
A1, RECOVERY-1, DEDUPE and RECOVERY-2 are all main-verified with PASS mainProof.
No unrelated unit or existing packet changes. No task tick or new source admission is claimed.

Ruled carry-forwards:
- CF-MPRU2-1 (Medium) -> MP-REWIND-DICE-1, registered in #2310: live rewind dice bypass capture; repair required before the v2.2.0 GM-rewind claim. This closure releases the unit without implementing it.
- CF-MPRU2-2 -> U44: rewound-at-boot accepted action still meets the missing-journal-head fence.
- CF-MPRU2-3 -> L1-SMOKE-A2: built-image co-op restart with an accepted action and captured rolls.
- OBS-MPRU2-1 -> next MatchRecovery.ts owner: triple unit derivation at boot.
The copied source review supplies ordinary 1v1 built-image PASS 4/4; this closure adds no browser/build proof.
This metadata PR still needs its own CI and parent review/merge.

---

## 2026-10-19 L1 review follow-up registration (docs only)

Registered [three follow-ups](evidence/l1-followups2-registration-20261019.json), evidence SHA-256 0cedf55ada9b9a9c4bde019e94872d9a1389dcadc5772f2125ed096ba718f793, on ca92b6a01c07e5038c2d1b3840117af72b0a3ed3.

- MP-RECOVERY-UNITS-2 -> MP-REWIND-DICE-1 -> v2.2.0 release checklist. Initial state blocked: source merge alone is not main-verified closure. Three exact host/rebuild/test leaves; crypto capture and event rolls, with the old deterministic test re-sealed. H/I and the shared mission do not own live rewind.
- MP-HOST-DEDUPE-1 -> MP-CAMPAIGN-HOST-DEDUPE-1 -> P2CG1H. Initial state planned. Choose a two-leaf concurrency unit instead of widening H's type-only grant or its full prospective manifest. HP #2307 did not touch CampaignHostRegistry.ts.
- LSC-2OP -> LSC-SALVAGE-1. Initial state blocked; seven exact #2309 patch leaves, KNOWN-RED owned after v2.2.0. Whole-unit salvage is outside the shared mission. The 12/12 verify:qc:campaign-economy:browser predicate moves with the repair, not a false PASS or silent waiver.

H admission must acknowledge CF-HP-1..3, still-open CF-S-1, CF-MPHD-3 status-policy routing and I3 empty-status spacing. These notes grant no unregistered behavior change.

L1 closure accounting: 39 -> 41; salvage is excluded. All existing human-session, installer, exact-RC and three-seat gates remain.

Census includes all open PRs with paginated file lists, active unit and node ancestor reservations, RECOVERY-2 and HP source/closure boundaries. Their metadata writes serialize; fetch/rebase and re-census before admission and publication. U44 cutover and U26/FOG work stay separate.

No product edit, lifecycle advancement, packet, task tick, source admission or future OWNER-RULING is supplied. All units retain 15-file / 500-counted-addition caps and authentic evidence gates.

---

## 2026-10-19 LSC-1 verified on main; only LSC-2OP released

LSC-1 advances to main-verified for #2304, ruled head 1b4fb6bf531fdac96613b1a2bf4a6458d669e514, merge f4a40db2bf5f38f2e76a447a206fc6d5db9b57f0. Fable reviewed 25e1c0316bc8185d0c8bb17a22b8007f4df3f61c: APPROVE WITH IN-PR FIXES, no High. Root diffed the four-file test/receipt amendment and accepted the exact merged head; no second full-head review is claimed.

The review (31063 bytes, SHA-256 9452a72031640fafc020a380bec255b9b10a895b18af5a03e6ff6454307e2dd8) and exact posted owner ruling (2644 bytes, SHA-256 a34031e424d522e53961ff47fe5a089e25899382717e2d203951bb4490293dcf) are byte-preserved in base64 envelopes. PK-lsc-1-ruling records comment 6258073974, posted 2026-10-19T02:03:06Z, before merge 2026-10-19T02:03:12Z.

The [review receipt](evidence/lsc-1-admission-review-20261018.json) fills the reserved slot. The [merge receipt](evidence/lsc-1-merge-20261019.json) records clean integration, unchanged product/test/control bytes, 10/15 manifest files, 273/500 counted lines, and 32/32 exact ruled-head check names. The [main proof](evidence/lsc-1-mainproof-20261019.json) records fresh npm ci, 59 vault/migration/API/auth suites (958/958) and typecheck PASS at exactly f4a40db2bf5f38f2e76a447a206fc6d5db9b57f0, all through the lsc queue. Raw proof logs and runner are preserved.

Carry-forwards (owner ruling text, verbatim):

- CF-LSC1-1: the window is a per-module singleton; revisit if a second route appears.
- CF-LSC1-2: no E2E bypass, for LSC-2P.
- CF-LSC1-3: client handling of 429 vs 401 -> LSC-2.
- CF-LSC1-4: re-check scope parity when U101a lands.
- CF-LSC1-5: the H2 guard and limiter stay route-local for B15.
- CF-LSC1-6: literal vs handler-level "before reading the body".
- CF-LSC1-7: 409 handling -> LSC-2OP.

Only LSC-2OP moves blocked -> planned. Its preparation carries CF-LSC1S-4, CF-LSC1-3/7 and CF-LSC0-3/7/10/12. The assigned KNOWN-RED campaign-economy salvage patch must be reconciled with literal admission scope; its release predicate is 12/12 on verify:qc:campaign-economy:browser. This closure does not claim that repair or browser acceptance.

No other unit or existing packet changes. No tasks.md checkbox changes; tick stays null. Selection is not admission; this closure still requires independent verification and merge.

---

## 2026-10-18 MP-HOST-DEDUPE-1 source verified on main

MP-HOST-DEDUPE-1 moves from review-required to main-verified after #2303.
Reviewed and ruled head: 86cf410237a2fed16bbd79ce60d9318901286eac.
Exact source merge: 86e2a7214b77856bdce4ead9c5697a0416fbfad0.
Full Fable review copied byte-for-byte: 23,260 bytes; SHA-256 6d158e759d188d330966e25e829871bd4f2ddb7d5b0b9451fa0457896add076a.
The existing PK-mp-host-dedupe-1-ruling packet records the posted owner decision.
Source CI: all 32 expected checks passed; clean two-parent merge integration verified.

Fresh mainProof at exactly 86e2a7214b77856bdce4ead9c5697a0416fbfad0 before closure edits:
- Fresh npm ci, Node v22.22.0, private Jest cache and queued lane mp-dedupe.
- Focused MatchHostRegistry.unitBootstrap.test.ts: 1 suite, 12/12 tests.
- Full src/lib/multiplayer/server: 176 suites, 1582/1582 tests.
- Typecheck and the unedited ledger validator passed.
Seven base64 envelopes preserve raw logs and JSON; byte lengths and SHA-256 are verified.

Only P2CG1HP is released (blocked -> planned), with all predecessors main-verified.
L1-SMOKE-A2 stays blocked on MP-RECOVERY-UNITS-2. No task tick or new unit.
All unrelated units and packets are preserved; selection does not grant source admission.

CF-MPHD-1 -> MP-RECOVERY-UNITS-2/backlog; registry scope amendment or split required.
CF-MPHD-2 -> backlog; release discarded recovered hosts without closing the shared store.
CF-MPHD-3 -> P2CG1H review scope; refuse/recover completed or failed-recovery matches.
CF-MPHD-4 -> Root confirms the next CampaignHostRegistry.ts owner (P2CG1HP or H) at admission.
CF-MPHD-5 -> L1-SMOKE-A2 concurrent-first-sockets production round.
CF-MPHD-6 -> discharged here by the full review receipt and existing ruling packet.
Optional A1 (prefer landed host) and A2 (M5b/M5c/M7 test rows) -> backlog.

No product/test changes or new built-image/browser proof are claimed.
This closure still requires its own CI and Root review/merge.

---

## 2026-10-18 MP-RECOVERY-UNITS-2 registered (planned)

Root confirmed #2300 merged at f73bfe7d7251db564c7cc8b2bed544fd89fdc140.
Registers the remaining #2296 owner-routed recovery work; no implementation or source admission.
CF-MPRU-1: disk-derived co-op and ordinary recovered journal units.
CF-MPRU-3: live rewind rebuild without HTTP-to-self.
CF-MPRU-4 (Medium): recovered legacy hosts use crypto RollCapture, with captured rolls on events.
CF-MPRU-2/M8: unmocked rewound-at-boot fixture; F3/R2/R10: custom no-snapshot success/failure.

Recovery-1 alone precedes recovery-2; A2 keeps both recovery-2 and DEDUPE as predecessors.
Run in parallel with DEDUPE; shared metadata writes serialize in the writer queue, not the graph.
After DEDUPE merges, rebase on its merged Main and re-freeze the exact manifest.
DEDUPE and HP literal source/test leaves are disjoint from the new 3-source/3-test manifest.
HP receives no new dependency; shared metadata writes still serialize.
The matchUnitBootstrap.ts exception is only the required optional d6Roller plumbing.
ServerMatchHost.ts ownership is restricted to recover; engine/server.js/registry/catalog/fog stay read-only.
U44 capability-DB cutover and U26 projection stay separate; no simultaneous shared-file admission.

The new unit starts planned: its only predecessor is main-verified; all lifecycle receipts remain null.
Its 11 prospective source-stage leaves are not measured fit or permission for extra files.
L1 closure accounting advances from 38 to 39; every other acceptance/human-session gate is retained.
Existing unit lifecycle, tasks, packets, HP manifest and historical receipts are preserved.
Both ledgers bind the full open-PR/active-reservation census and exact scope to one hashed receipt.
Rebased over merged LSC-1S #2301; its lifecycle, receipts and release are preserved.
Sonnet requested removal of the unforced DEDUPE dependency; #2303 confirms disjoint leaves.
RED, finite admission, sensitive packet, independent exact-head review, OWNER-RULING, CI and
exact-main proof/ancestry/closure remain future source gates. Registration supplies none of them.

---

## 2026-10-18 LSC-1S verified on main; LSC-1 released; closure metadata proposed

LSC-1S advances from implementing to main-verified for PR #2297, head 12f4e726d83ecbc061df243e9d72731699db9b86, merge e9e63a55ebdb945668166cf2978890bfca36c91d.
The independent Fable 5.1 report reviewed 14f73d06b2ffe38c7c9eef05535d943046d4a22f: APPROVE WITH IN-PR FIXES. Root checked the four-file amendment and ruled ACCEPT at the exact merged head; no second independent full-head review is claimed.
The review is byte-preserved (25410 bytes, sha256 cb73426edb2a848179e8e868d0760acee1f06f5c9eeee9eeae791fd56165d6ec), as is the posted owner ruling (3120 bytes, sha256 a4bfebca1824c9d56954cf62906dd25da084c8cb1969a8b14d189fc9398d7678). Both use base64 envelopes to prevent line-ending normalization. PK-lsc-1s-ruling records comment 6257071774, posted 2026-10-19T00:27:06Z, before merge 2026-10-19T00:27:12Z.

The [review receipt](evidence/lsc-1s-admission-review-20261018.json) fills the reserved slot and routes carry-forwards. The [merge receipt](evidence/lsc-1s-merge-20261018.json) records clean tree integration, unchanged controls and product/test bytes, 9/15 manifest files and 500/500 counted lines, and 32/32 exact-head check names.
The [main proof](evidence/lsc-1s-mainproof-20261018.json) records fresh npm ci and runs at exactly e9e63a55ebdb945668166cf2978890bfca36c91d: 53 vault/migration suites, 852/852 tests; typecheck PASS. All heavy runs used the lsc jest ticket queue. Raw logs and the runner are byte-preserved.

Carry-forwards (owner ruling text, verbatim):

- CF-LSC1S-1 -> LSC-1: the route uses the singleton service, so one window is shared, and no address or header reaches the service.
- CF-LSC1S-2 -> LSC-1: request-schema minimums (password >= 8, label 1-64, op id 1-128, integer generation), plus a pre-read before keygen.
- CF-LSC1S-3 -> LSC-1: one in-flight mint, a mint-vs-revoke post-check, locked-seat refusal before the KDF, and window consumption.
- CF-LSC1S-4 -> LSC-2OP: seed expectedGeneration from the outcome; a fresh op id per submit; on generation-conflict, refresh rather than auto-retry.
- CF-LSC1S-5: decide on name-only logging for internal-error.
- CF-LSC1S-6 -> the LSC-1 review: rerun the secrecy mutants on the mint path.

LSC-1 preparation carries CF-LSC1S-1/2/3/6 and CF-LSC0-1/2/4/9/13/14/15/16/17/18 as routed. H2 is a local-seat-route-only guard; no primary token/vault-route or B15 discharge. RED must be runtime tests covering R2-01..14 with downstream recovery/census limits named. CF-LSC1S-4 stays with LSC-2OP; CF-LSC1S-5 is the name-only logging decision.

Successor release is separate from admission: only LSC-1 moves blocked -> planned because LSC-1S has genuine exact-main PASS. All other units are unchanged. No tasks.md checkbox changes; tick remains null. This closure still requires its own CI, independent verification and merge.

---

## 2026-10-18 MP-RECOVERY-UNITS-1 source verified on main

MP-RECOVERY-UNITS-1 moves from implementing to main-verified after #2296
(reviewed and ruled head f4165728412418d0c30f32d00b5174fe8121300a,
merge e69ae02911f11fd0d3bd891c83108414f3098727).
The independent Fable review is copied byte-for-byte: 20,977 bytes,
SHA-256 aaac1dab30cbc69009f69d6095ba455ae07632fc6daa9ba3ac04aace7e9e2eac.
PK-mp-recovery-units-1-ruling binds the exact posted OWNER-RULING to that head.
The merge receipt records all 32 successful source checks and clean two-parent integration.

Fresh proof at exactly e69ae02911f11fd0d3bd891c83108414f3098727, before closure edits:
- Fresh npm ci on Node v22.22.0.
- Multiplayer server (including MatchRecovery.canonicalUnits.test.ts): 176 suites, 1574/1574 tests.
- Related engine/API/catalog: 7 suites, 54/54 tests.
- Typecheck and the unedited ledger validator pass.
All proof runs used the heavy-run queue, lane mp-recovery, and a private Jest cache.
Raw logs/JSON are preserved in seven base64 envelopes.

Successor release: MP-HOST-DEDUPE-1 only (blocked -> planned), computed from the ledger.
- L1-SMOKE-A2 stays blocked: waiting on MP-HOST-DEDUPE-1.
No unrelated unit or existing packet changes. Selection is not source admission.

CF-MPRU-1/2/3/4 and F3 (R2/R10 custom no-snapshot row) route to MP-RECOVERY-UNITS-2.
Root will register that narrow recovery/rewind/crypto-dice unit after this closure merges,
before L1-SMOKE-A2; this closure does not register it or change A2 dependency edges.
F1/F2 evidence-quality notes are recorded; A2 must match both skip-message variants.
CF-SMOKEA1-2 is discharged for ordinary combat matches; A2 still owes co-op restart acceptance.
OBS-MPRU-2 remains with DEDUPE. No task tick or new built-image/browser proof is claimed.
This closure metadata still requires its own CI and parent review/merge.

---

## 2026-10-18 B14-HEAD source verified on main

B14-HEAD moves from implementing to main-verified after source PR #2294
(ruled head 1e55540e9d56bd0e0a503045b88984fca43c2d02, merge 8fcd311d5b60951b766fded267ba688f2dae0395).
The independent Fable review approved 20af77868bde12a3e5530c72121be0182e8482f5; its exact 23,231-byte copy
and SHA-256 66a4d9289776ad50e1ac7402062709506862d60a76ecd10eb71baf75d25cb654 are preserved in evidence.
The later +18/-2 change touched only matchHeadRoute.test.ts, killed RV9/RV6/RV4,
and was Root-diffed and ruled without a new review round. reviewedHead is
recorded separately from the ruled head (CF-B14H-6).

PK-b14-head-ruling records the posted owner decision before the merge.
The exact posted ruling and review are copied byte-for-byte; the merge receipt
records all 32 exact-head CI names and the clean two-parent tree integration.

Fresh proof at exactly 8fcd311d5b60951b766fded267ba688f2dae0395, before any closure edit:
- npm ci: 1078 packages on Node v22.22.0.
- Owned: 5 suites, 121/121 tests.
- Regression: 268 suites, 2837/2837 tests; includes all 14 seamed suites.
- Typecheck and the unedited ledger validator pass.
All runs used the heavy-run queue, lane b14-head, with a private Jest cache.
Raw proof logs/JSON are preserved in base64 envelopes.

Successor release: NONE. Closing B14-HEAD makes no dependent newly eligible.
- L1-SMOKE-B stays blocked: waiting on L1-SMOKE-A2.
- P2CG1HP stays blocked: waiting on MP-HOST-DEDUPE-1.
No unrelated unit or packet changes. Selection is not source admission.

CF-B14H-1/2 are discharged by the test fixes; CF-B14H-6 is recorded here.
CF-B14H-3 stays with the FOG chain; CF-B14H-4 with U26; CF-B14H-5 with FOG-H.
CF-B14B-4 was discharged by the exact-head Fable seam-necessity rerun.
CF-B14B-3 and the ruled legacy carry-forwards remain routed and open.
No task tick, browser proof, built-server smoke or restored fog projection is claimed.
This closure metadata still needs its own CI and parent merge.

---

## 2026-10-18 LSC-1DB verified on main; LSC-1S released; closure metadata proposed

LSC-1DB advances from implementing to main-verified for PR #2290, head d1fef6cb76f64e6b1987eb705d0432df0c59c4fc, merge 44bd8bb9191f2c945324f483e4f524841b098ddf.
The independent Fable 5.1 report reviewed 18319cc5cfd65d329b9e2dd25daa4140f7af4cf9: APPROVE WITH IN-PR FIXES. Root checked the three-file amendment and ruled ACCEPT at the exact merged head; no second independent full-head review is claimed.
The review is byte-preserved (21388 bytes, sha256 22f488154f0e4299281209a60f4695eab0b098f59bb7acf2c62eb894438a0782), as is the posted owner ruling (2883 bytes, sha256 1a40e49e21598174f6a4c8450bf2606f874bf297fe42672b474a6971e71bc06a). Both use base64 envelopes to prevent line-ending normalization. PK-lsc-1db-ruling records comment 6256147045, posted 2026-10-18T22:49:59Z, before merge 2026-10-18T22:50:07Z.

The [review receipt](evidence/lsc-1db-admission-review-20261018.json) fills the reserved slot and routes carry-forwards. The [merge receipt](evidence/lsc-1db-merge-20261018.json) records clean tree integration, unchanged controls and product/test bytes, 10/15 manifest files and 92/500 counted lines, and 32/32 exact-head check names.
The [main proof](evidence/lsc-1db-mainproof-20261018.json) records fresh npm ci and runs at exactly 44bd8bb9191f2c945324f483e4f524841b098ddf: 25 persistence/vault suites, 200/200 tests; typecheck PASS; real operator database COPY up/no-op/actual afcbd62 older build/down/re-up PASS. Original database bytes unchanged. All heavy runs used the lsc jest ticket queue. Raw logs, runner scripts and migration result are byte-preserved.

Carry-forwards (owner ruling text, verbatim):

- CF-LSC1DB-1: integer binds, CAS by changes===1, and the revoke-keeps / re-provision-clears test -> LSC-1S.
- CF-LSC1DB-2: the one-op-per-generation race test -> LSC-1S. The schema part is done.
- CF-LSC1DB-3: revocation means revoked_at IS NOT NULL; the clock source for locked_until_ms -> LSC-1S.
- CF-LSC1DB-4: the CF-LSC0-6 remainder (request-scoped key, no-secret logging) -> LSC-1S/1.
- CF-LSC1DB-5: CF-LSC0-16 window semantics -> LSC-1S/1.
- CF-LSC1DB-6: record manual down SQL -> future schema units.

LSC-1S also carries CF-LSC0-8, -15, -16 and -17: no secrets in logs or errors; revoke keeps the lock; re-provision clears it; request-scoped key lifetime, counter expiry and window consumption semantics remain runtime obligations. The schema part of CF-LSC1DB-2 is done; its race test remains open.

Successor release is separate from admission: only LSC-1S moves blocked -> planned because LSC-1DB has genuine exact-main PASS. All other units are unchanged. No tasks.md checkbox changes; tick remains null. This closure still requires its own CI, independent verification and merge.

---

## 2026-10-18 B14-0 source verified on main; B14-HEAD and MP-RECOVERY-UNITS-1 released; closure metadata proposed

B14-0 advances from implementing to main-verified for source PR #2281,
head 3b06758e4ad84328326d51a7ef12e5e6cc150f79, merge 1c7632b18d062e1b684fc7384faa4f2668183b69.
Its baseline is 3328e2fa5f9bcc87da09d8fdb16fc4a20f19134b (#2273, the B14-0B closure). Main moved before the merge: GitHub merged the head against 14893923 (#2282); merge-tree of the two parents is clean and equals the merge tree 82bef9f3, and the 13 intervening main merges touched no B14-0 leaf, admission control, seamed suite or receipt (they changed B14-0 in units.json only by adding successors). The product leaves, spec and owned test are byte-identical at the head, the merge and this closure base b16302d7 (B14Z-MAIN-1).
The owner authorized this ruling under the standing instruction and the direct approval of 2026-10-18 (which covers the temporary fog-on refusal for v2.2.0), and it was posted as [comment 6255481179](https://github.com/SwiggitySwerve/MekStation/pull/2281#issuecomment-6255481179);
its exact UTF-8 body (2947 bytes; gh api --jq .body prints it plus one LF), without an added newline, hashes to 3b6feada26f9e7b28733753dc5e7b51e8bfb9367e2e701e3247cf0b39bfa63d9.
The ruling (21:40:29Z) preceded the merge (21:40:36Z), and PR #2281 carries the owner-ruled label.
PK-b14-0-ruling records that ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/b14-0-review.json), written at the reserved slot name, binds one independent full sensitive review (Claude Fable 5.1; author Opus 5.5) of the GREEN head 471d6281c: APPROVE-WITH-IN-PR-FIXES, no product defect, sha256 7c49543a4c8b65dcfdab31dda2723fa820112b26cdae7f27d0dad68284688338 (27099 bytes), preserved byte for byte at evidence/b14-0-source-fable-review-20261018.txt. reviewedHead 471d6281ce07480119b47b61f7d3ecc07e18e5d5 is recorded explicitly beside head 3b06758e4ad84328326d51a7ef12e5e6cc150f79 (CF-B14-6).
The reviewer reproduced RED (22 failed / 28 with host leaves at baseline bytes) and GREEN (28/28), the 261-suite regression (2768/2768) and the unseamed necessity run (14/14 suites fail, 125/162), traced membership-before-policy and refusal-before-read on admission, live delivery, join/replay and the legacy callback, and ran nine mutants (R3, R6, R7, R11 caught; R1, R2, R10 and the guard-scope probe R4 survived; R5 equivalent).
The review-recommended fixes landed as the test-only follow-up 3b06758e (+62/-11 in b14FogContainment.test.ts; Root-diffed and owner-ruled, not re-reviewed; B14Z-FU-1): 31/31 owned rows, R1, R2, R10 and R4 caught, regression 2771/2771. The reviewer verdict is recorded as APPROVE with its exact qualifier (B14Z-VERDICT-1).
The reserved b14-0-review.json slot is filled by the closure review receipt only; no reviewer text is fabricated into it (B14Z-SLOT-1).

Carry-forwards (reviewer rows verbatim in the review receipt; directedTo is closure routing, as the owner ruling writes):

- CF-B14-1 [discharged in PR by the post-review follow-up 3b06758e (Root-diffed; owner-ruled; not independently re-reviewed)]: Taken in-PR, as the review row allows ("B14-0 (in-PR if taken) else B14-HEAD"): the follow-up adds the row "%s refuses a non-member generically before fog policy" for join and replay (exactly one generic Close, WS 1008, no fog reason). The join row alone does not reach R10 (handleSessionJoin resolves the viewer before sendReplay), so the row covers both entrances; R10 is caught on 3b06758e (fix/batch-all.json). The owner ruling records it ("F1: a stranger gets 1008 and the generic close on both join and replay.").
- CF-B14-2 [discharged in PR by the post-review follow-up 3b06758e (Root-diffed; owner-ruled; not independently re-reviewed)]: Taken in-PR: the legacy reject payload is asserted exactly ({matchId, reason: fog-projection-unavailable}) and a forced guardReplayFrames failure is pinned (one Close INTERNAL_ERROR viewer projection unavailable, WS 1011, detached, guard detail not echoed). The PR body names the sendJoinGuardError Error->Close change and justifies the terminal guard failure against the non-terminal unreadable-config Error, as the owner ruling records ("The PR body names the sendJoinGuardError Error->Close change and justifies the two distinct 1011 behaviours"). R1 and R2 are caught on 3b06758e.
- CF-B14-3 [partly discharged: F8 and F9 in PR by 3b06758e; F6 open]: Owner ruling: "CF-B14-3 (F6, F8, F9) -> B14-0/B14-HEAD where still open.". F8 (walk src, scripts and openspec; R4 caught) and F9 (non-null admission, ReplayEnd, no closes) landed in 3b06758e. F6 remains: lifecycle.detach in the admitSocket fog branch is a harmless no-op (the reviewer calls R5 an equivalent mutant). B14-0 is closed, and B14-HEAD frozen seven-file manifest (route, route test, units.json, receipts) cannot edit ServerMatchHost.ts, so B14-HEAD can only carry it as information; the next owner of ServerMatchHost.ts may drop or comment it. Recorded under successorNotes.B14-HEAD; no unit is edited.
- CF-B14-4 [open]: U26, as the owner ruling writes ("CF-B14-4 (F4, F7) -> U26."): route the rebuilt replay through the host wrapper (or detach on false) and resolve the raw hook with CF-S-9. Unreachable in production after B14-0 (fog-on sockets can no longer attach; the production binder never uses the raw hook). Recorded under successorNotes.U26; U26 is not edited.
- CF-B14-5 [open]: The FOG chain (FOG-S, FOG-K, FOG-B, FOG-L, FOG-R, FOG-H, FOG-X), as the owner ruling writes ("CF-B14-5 (F5) -> FOG-*."): decide whether the legacy P2P channel carries a per-peer reject when fog returns. Pre-existing channel design; P2P fallback only. Recorded under successorNotes.FOGChain; no FOG unit is edited.
- CF-B14-6 [discharged by this closure]: Owner ruling: "CF-B14-6 (record the reviewed head) -> the closure receipt.". This closure review receipt and units.json stageReceipts.review record reviewedHead 471d6281ce07480119b47b61f7d3ecc07e18e5d5 explicitly, beside head 3b06758e4ad84328326d51a7ef12e5e6cc150f79 (the merged, ruled and CI-checked head); the merge receipt commitRoles name all four PR commits by sha.
- CF-B14-0-1 [open]: Root maintenance backlog / U26, as the owner ruling writes ("CF-B14-0-1 (437-line test file) -> backlog/U26."). The item is ServerMatchHostReplay.ts (437 counted lines against the 400-line lint guideline; the one new lint warning), which the review row and the local receipt name; the ruling parenthetical "437-line test file" refers to the same item (B14Z-CF01-1). Splitting it needs a new file outside the frozen manifest. No unit is edited.
- CF-B14B-4 [open (baseline recorded on the B14-0 head; repeat owed on merged code)]: B14-HEAD, as the owner ruling writes ("CF-B14B-4 repeats at B14-HEAD on merged code."). Baseline: with all 14 canonical seams stripped against the real B14-0 code, every one of the 14 suites fails, 125 failed of 162 (author local receipt seamNecessity on 471d6281; reproduced by the reviewer, necessity.json, per-suite counts identical). B14-HEAD repeats it on the merged code at 1c7632b1 or later. Recorded under successorNotes.B14-HEAD.

Discharged by B14-0: CF-B14B-1 (with CF-B14A-2 folded in), CF-B14A-5 and CF-S-2; CF-S-3 is discharged for its containment arm and travels to the FOG chain for restoration (B14Z-CFS3-1). Passing through unchanged, as ruled: CF-S-1 (P2CG1HP), CF-S-4..9, CF-B14A-6..9 and CF-B14B-2/3. The exact-main built-server socket smoke stays owed before P2CG1H and before any build that ships spectating (B14Z-SMOKE-1). CF-G2-9 flaked once on the GREEN head and stays open with its real owner.

Still open, owners unchanged: from P2CG1R CF-H8/CF-G5, CF-G2-3, CF-R-1, CF-R-2, CF-R-3, CF-R-4, CF-R-5, CF-R-6; from P2CG1G2 CF-G2-1, CF-G2-2, CF-G2-4, CF-G2-5, CF-G2-6, CF-G2-7, CF-G2-8, CF-G2-9, CF-G2-10; from P2CG1G1 CF-H2, CF-H5, CF-H7, CF-H9, CF-H10, CF-H13, CF-H14, CF-H15, CF-H17; from P2CG1G2A CF-G2A-1, 2, 3, 4 and 6 (B15).

Root notes (not reviewer text; recorded under successorNotes.openNotes):

- B14Z-MAIN-1 (Root): Main moved between the PR base and the merge. The unit baseline is 3328e2fa (#2273, the B14-0B closure); the PR was last updated against a25ba413 (#2276) and GitHub merged it against 14893923 (#2282). The merge commit 1c7632b1 has first parent 14893923 and second parent the merged head 3b06758e; merge-base(head, first parent) is the unit baseline; git merge-tree --write-tree of the two parents is clean and equals the merge tree 82bef9f3 (the head tree 62b99a2b differs only by the main-side files). The 13 first-parent main merges between the baseline and the first parent (#2272, #2275, #2277, #2276, #2280, #2284, #2285, #2286, #2288, #2278, #2289, #2279, #2282) touched 144 files, none a B14-0 manifest leaf, admission control (33), seamed suite or author receipt, and none under src/lib/multiplayer or the fog-of-war spec. In units.json they changed B14-0 only in its successors array (B14-HEAD -> B14-HEAD, L1-SMOKE-B, MP-RECOVERY-UNITS-1, by #2275 and #2289); the merged entry is the head entry with the main successors, every other unit and packet equals the first parent. The four product leaves, the spec and the owned test are byte-identical at the head, the merge and the closure base (product hashes equal the local receipt productBytes); main moved after the merge by b16302d7 #2287 (8 files, no B14-0 leaf, control or seam; the B14-0A, B14-0B, B14-0, B14-HEAD, MP-RECOVERY-UNITS-1 and P2CG1S entries unchanged).
- B14Z-CHECKS-1 (Root): CF-H12: all 32 required PR check runs on the merged head 3b06758e (run 39167404493) concluded success on their first attempt (the filter=all listing holds exactly 32 check runs) and their names equal, one to one, the 32 names recorded for P2CG1G1, P2CG1G2A, P2CG1G2, P2CG1R, P2CG1S, B14-0A and B14-0B (the P2CG1S local receipt expectedNames); the author posted the by-name comparison, with each run id, as https://github.com/SwiggitySwerve/MekStation/pull/2281#issuecomment-6255470545 (posted 2026-10-18T21:39:22Z, not edited; before the ruling). The earlier comparison on the GREEN head 471d6281 (https://github.com/SwiggitySwerve/MekStation/pull/2281#issuecomment-6254857417) discloses one Seam Anchors flake (CF-G2-9) and the needs-aggregator Lint and Test failing with it on the first attempt, both green after one rerun with no code change. pr-checks.yml (blob a82fe0f7) is identical at the P2CG1S, B14-0A and B14-0B merges, the B14-0 baseline, reviewed head and merged head, the first parent, the merge and the closure base. The PR checks do not run on the push of the merge commit; at 2026-10-18T21:44:06Z the merge commit carried 16 push-workflow check runs, none failed. The exact-main proof here is the fresh local run at the merge.
- B14Z-FU-1 (Root): The independent review is of the GREEN head 471d6281ce07480119b47b61f7d3ecc07e18e5d5 (APPROVE-WITH-IN-PR-FIXES; no product defect). The review-recommended in-PR fixes landed afterwards in the follow-up commit 3b06758e, the exact head that was ruled, CI-checked and merged. The follow-up changes only src/lib/multiplayer/server/__tests__/b14FogContainment.test.ts (+62/-11; checked here by numstat), adds three rows (28 -> 31) and changes no product, helper, spec or receipt byte. No independent review of 3b06758e exists and none is claimed: Root diffed 471d6281..3b06758e before ruling and the owner ruling carries that receipt ("Root confirmed with a diff from 471d6281 that only server/__tests__/b14FogContainment.test.ts changed (+62/-11)."). The author re-ran the owned suite (31/31), the four survivors R1, R2, R10 and R4 (all caught) and the 261-suite regression (2771/2771) on 3b06758e (fix/batch-all.json, hashed below).
- B14Z-VERDICT-1 (Root): The reviewer verdict is APPROVE-WITH-IN-PR-FIXES, not a plain APPROVE. The report states that the fixes are test rows only and that "If Root prefers to merge without them, the four rows travel as CF-B14-1..CF-B14-3 and the verdict reads as APPROVE"; the fixes were taken (B14Z-FU-1), so the closure records verdict APPROVE (the ledger value) with the reviewer verdict text verbatim in verdictText and the exact qualifier in reviewerVerdict.
- B14Z-CFS3-1 (Root): The owner ruling names CF-S-3 twice: under Basis ("Discharged: ... CF-S-3.") and under Carry-forwards ("CF-S-1 and CF-S-3..9 ... pass through unchanged"). The review row reads "CF-S-3 (FOG-B/FOG-R: contained, not restored; pinned here)". The closure records both arms: B14-0 discharges the containment arm (no fog-on audience receives a declaration, revealed or not; seat arguments and order preserved), and the restoration of revealed declarations to fog-on audiences through a per-viewer projection passes to the FOG chain unchanged.
- B14Z-CF01-1 (Root): The owner ruling routes "CF-B14-0-1 (437-line test file) -> backlog/U26". The review row and the author local receipt name the item as ServerMatchHostReplay.ts at 437 counted lines (lint max-lines, the one new warning); the test leaf b14FogContainment.test.ts is line-exempt and is not the item. The closure routes the item as ruled and records the file the review names.
- B14Z-NEC-1 (Root): CF-B14B-4 asks that seam necessity be re-checked against real B14-0 code. The author measured it on the GREEN tree (all 14 canonical seams stripped: 14/14 suites fail, 125 failed of 162; local receipt seamNecessity) and the reviewer reproduced it with identical per-suite counts (necessity.json). The owner ruling routes the repeat on merged code to B14-HEAD; this closure main proof runs the 14 seamed suites with their seams at the merge (14 suites, 162/162) and does not strip them.
- B14Z-SMOKE-1 (Root): Still owed, unchanged by B14-0B: The exact-main built-server socket smoke (P2CG1S registration20261017HPrereqs proof 4: "exact-main built-server socket smoke before H or any spectator-bearing shipment.") remains owed, as the owner ruling writes ("The built-server socket smoke test required before H or any build shipping spectating remains owed") and as the admission and local receipts recorded it (a post-merge obligation). This closure's main proof is jest, typecheck and validator only; it does not discharge the smoke. It binds before P2CG1H and before any build that ships spectating. B14-0A changed HTTP refusal only (no WebSocket, spectator or server.js byte; server.js is an admission control) and this closure's main proof is jest, typecheck and validator only, so it neither discharges nor narrows the smoke. B14-0B is test-only (no product, WebSocket or server.js byte; server.js is an admission control) and this closure's main proof is jest, typecheck and validator only, so it neither discharges nor narrows the smoke. B14-0 changed WebSocket refusal behaviour; its local receipt records an implementation-time probe of the real server.js WebSocket entry (evidence only, at the GREEN tree), not an exact-main built-server smoke, and this closure main proof is jest, typecheck and validator only, so the exact-main built-server socket smoke stays owed before P2CG1H and before any build that ships spectating. L1-SMOKE-A1 (#2287, merged after this merge) adds built-server smoke tooling; it does not by itself discharge this item for B14-0.
- B14Z-GATE-1 (Root): The heavy runs ran through the machine-wide queue (node E:/Projects/Personal/MekStation-wt/_locks/heavy-run.mjs --lane b14; npm ci as class build, the proof runner as one class jest slot), which itself runs node scripts/qc/machine-idle.mjs --own-pid 47516 --own-pid 55164 at the head of the queue. Inside the slot the runner also gated every run on the same command and waited on any busy reading. It read MACHINE_BUSY 1 time(s) (p2cg1d: ci --no-audit --no-fund; a process this closure did not start) and waited until MACHINE_IDLE; no jest ran under a busy reading. The runs were sequential; this closure neither started nor stopped any process other than its own runner and its jest/tsc/validator children, and no timeout was raised.
- B14Z-SLOT-1 (Root): The reserved review slot evidence/b14-0-review.json (frozen in the admission manifest as the one reservedUnchanged entry, already listed in B14-0.ownershipExceptions, recorded "(unwritten)" by the local census) was unwritten at the head, the merge and the closure base. This closure writes it, under its frozen name, as the closure review receipt: Root/closure text that binds the genuine review by sha256 and quotes reviewer strings only verbatim (each checked as a substring of the stored copy). The reviewer report was written to docs/audits/2026-10-18-b14-0-review.md in its detached review worktree (untracked there); this closure preserves it byte for byte at evidence/b14-0-source-fable-review-20261018.txt (ASCII, LF only, no byte-order mark, so a .txt copy survives the repository LF normalization unchanged).
- B14Z-SUCC-1 (Root): B14-0 has three registered successors (B14-HEAD, L1-SMOKE-B, MP-RECOVERY-UNITS-1) and two further units list it as a predecessor (P2CG1HP, P2CG1H). Only B14-HEAD and MP-RECOVERY-UNITS-1 have B14-0 as their sole predecessor, so only they become releasable, as the owner ruling directs ("It releases only B14-HEAD and MP-RECOVERY-UNITS-1"). Held back with other open predecessors: L1-SMOKE-B (L1-SMOKE-A2, B14-HEAD); P2CG1HP (B14-HEAD, MP-HOST-DEDUPE-1); P2CG1H (LSC-2P, L1-SMOKE-A1, L1-SMOKE-A2, L1-SMOKE-B, P2CG1HP).

All 32 checks on the merged head succeeded on their first attempt (run 39167404493); the 32 names equal those recorded for P2CG1G1 through B14-0B and match pr-checks.yml one to one. GitHub enforces only Lint and Test; each name was verified individually.
The [merge receipt](evidence/b14-0-merge-20261018.json) binds both ordered parents, the matching integration tree, the main merges between the baseline and the first parent, the census (201/500 counted lines; 10 changed files plus the reserved slot, 11/15), the product bytes and the 33 admission controls at the merge.
The [main proof](evidence/b14-0-mainproof-20261018.json) is a fresh run at the merge before any closure edit, after a real npm ci under Node v22.22.0, through the heavy-run queue, each jest run --runInBand with a private cache after machine-idle --own-pid 47516 --own-pid 55164 printed MACHINE_IDLE (B14Z-GATE-1):
the union (157 suites, 1669/1669), the owned suite (1 suites, 31/31), the B14-0B owned suites with the guard (11 suites, 85/85), the 14 seamed suites (14 suites, 162/162), the B14-0A owned suites (7 suites, 162/162), the 111-suite census (111 suites, 931/931), the two S suites (2 suites, 41/41), the six focused S suites (6 suites, 72/72), R (3 suites, 127/127), G2 (5 suites, 129/129), G2A (2 suites, 57/57), the G2A related set (74 suites, 934/934), the P2CG1G1 leaves (4 suites, 81/81), the Task 14 selector (4 suites, 104/104), P2CG1F (3 suites, 96/96), P2CG1E (3 suites, 166/166), P2CG1D (4 suites, 129/129), P2CG1C (2 suites, 54/54), P2CG1B (2 suites, 52/52), the 35 A1/A2 suites (35 suites, 398/398), typecheck and the validator passed.
Every set shared with the B14-0B main proof matches its count at the B14-0B merge exactly; the union adds only b14FogContainment.test.ts and client.test.ts.
The seam-necessity repeat on merged code is owed by B14-HEAD (CF-B14B-4, B14Z-NEC-1).
It references the author's 26 proof logs by hash.

B14-0 has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed.

Successor release (separate from the closure): B14-HEAD and MP-RECOVERY-UNITS-1 move from blocked to planned;
their only predecessor B14-0 is main-verified with a genuine exact-main mainProof PASS in this same change set.
No other field of either changes. L1-SMOKE-B, P2CG1HP and P2CG1H keep other open predecessors and stay blocked (B14Z-SUCC-1); every other unit state is unchanged.
Selection is not downstream admission.
This closure metadata still requires its own CI and parent merge.

---

## 2026-10-18 L1-SMOKE-A1 verified on main; no successor released; closure metadata proposed

L1-SMOKE-A1 advances from implementing to main-verified for PR #2287,
head 9e22300b7eb7c565a641176f469978145d8f67f6, merge b16302d76df1ace0589bc334f9249330a25c5278.
Its admission baseline is a25ba4130da7a8cf9e107ecfa0c30b5648082936; the head was rebased onto afcbd62bba50621ebcf37c2c11adf58ecc3bfc5f, and Main then moved (B14-0 #2281, #2282, #2279, #2289, #2278) before the merge. First parent 1c7632b18d062e1b684fc7384faa4f2668183b69; the merge tree a61cdd67 equals git merge-tree of the two parents. The four script leaves and three receipts are blob-identical at head and merge, and the L1-SMOKE-A1 unit object is JSON-identical. The admission controls ServerMatchHostReplay.ts and fogMatchAdmission.ts were changed on Main by B14-0, not by this PR.
The owner ruling ([comment 6255513661](https://github.com/SwiggitySwerve/MekStation/pull/2287#issuecomment-6255513661), 2768 bytes, sha256 37e06bbd09576742d7679f55661f49ffa3450d06e27891d4f6f3789bc45da5d2) was posted at 2026-10-18T21:43:52Z, before the merge at 2026-10-18T21:44:00Z. It is copied byte for byte to [evidence/l1-smoke-a1-owner-ruling-6255513661.txt](evidence/l1-smoke-a1-owner-ruling-6255513661.txt). PK-l1-smoke-a1-ruling records it.

The admission, red and local receipts came with PR #2287 and are unchanged.
The [review receipt](evidence/l1-smoke-a1-admission-review-20261018.json) is written at the reserved slot name. It binds two independent Fable 5.1 reviews, both preserved byte for byte as base64 envelopes:

- Round 1 on de8e97758: CHANGES REQUESTED (minor), sha256 98b68afbf08ab41b68a718042323f2aeb85f6a723d2da36bf4de49ffc3dba594, 31597 bytes. Findings were fixed in-PR by the single amendment 9e22300b7.
- Round 2 on the merged head: APPROVE, sha256 b900dc41242ca20dac24b411a55697f85e95199686cf1794f3e6e5352a9b0482, 17508 bytes.

Ledger within caps: 9/15 files, 487/500 counted lines (physical count, ruled under CF-SMOKEA1-3).
CF-SMOKEA1-10 SHA mapping (patch-ids identical; recorded in the review receipt shaMapping): admission a205fa117 -> c7bcf92a3, RED a9bda139c -> 6ceb2da41, GREEN de8e97758 -> 8a3f4bfa3, then amendment 9e22300b7. Earlier local chains 954b3f0cc -> dd159d6c4 -> a205fa117 and f7cb34aa4 -> 29bcdf357 -> a9bda139c are recorded too.

The [merge receipt](evidence/l1-smoke-a1-merge-20261018.json) binds the parents, the tree, the census, the leaves at the merge, 32/32 checks by name on the head (names equal the recorded 32) and the push runs on the merge commit.
The [main proof](evidence/l1-smoke-a1-mainproof-20261018.json) is a fresh run at the merge, before any closure edit:

- The A1 harness node:test passes 17/17.
- One real `--build` smoke through the heavy queue (lane smoke-a1, P0) passes 10/10 on a clean detached merge worktree: BUILD_ID 1792360460809, the image includes the B14-0 src changes, one readiness record for each of the two owned processes, port released, 5 tokens redacted and none retained, and the read-only lineage left the DB unchanged.
- validate-roadmap plain and --git pass, and --next returns LSC-1DB. The validator tests pass 86/86, lint:units passes 17896/17899, and oxlint is 0/0 on the four leaves.
- The MP-RECOVERY-UNITS-1 boot-recovery warnings reproduce in server-2.log. A1 claims only store replay after restart.

Carry-forwards (the review receipt carries the routing, as the owner ruling writes):

- CF-SMOKEA1-1 [open]: MP-HOST-DEDUPE-1.
- CF-SMOKEA1-2 [open]: MP-RECOVERY-UNITS-1; L1-SMOKE-A2 restart acceptance depends on it.
- CF-SMOKEA1-3 [ruled]: L1-SMOKE-A2 / L1-SMOKE-B are written in normal formatted style and split on overflow.
- CF-SMOKEA1-4 [open]: Root maintenance unit (durable gate for scripts/release).
- CF-SMOKEA1-5 [open]: L1-SMOKE-A2 (bind standalone server.js; re-assert final readiness).
- CF-SMOKEA1-6 [open]: Root maintenance unit (lint-staged versus .oxfmtignore).
- CF-SMOKEA1-7 [open]: LSC-2P / P2J (InMemoryPlayerStore warning).
- CF-SMOKEA1-8 [open]: L1-SMOKE-A2 (OBS-A1-1 / OBS-A1-2).
- CF-SMOKEA1-9 [open]: next unit allowed to touch the A1 leaves (L1-SMOKE-A2/B by amendment): falsifiers for N1-N4.
- CF-SMOKEA1-10 [discharged in this closure]: SHA mapping recorded.
- L-R2-6 [discharged in this closure]: mainProof re-ran at the merge.

L1-SMOKE-A1 has no task keys. Its tick remains null; no tasks.md row is changed.

No successor is released. L1-SMOKE-A2 stays blocked, because its other predecessors MP-RECOVERY-UNITS-1 and MP-HOST-DEDUPE-1 are blocked. L1-SMOKE-B, P2CG1H and every other unit state are unchanged.
A1 is partial proof: S-SMOKE-1, B14A-SMOKE-1 and B14B-SMOKE-1 remain owed to the final combined L1-SMOKE-B run.
This closure metadata still requires its own CI and parent merge.

---

## L2 readiness amendment (2026-10-18) — registration only

Five new **blocked** slices complete the missing ownership: B15-AUTH-LIMIT (F1),
B15-AUTH-ORIGIN (F2), B15-WIRE, B15-INV and L2-GUI-SMOKE. F1/F2 remain accountable
under U101/B15-1 per CF-LSC0-1/2; their full manifests are not expanded. All new
work is L2/P3-exit only; no L1/v2.2.0 gate, runtime acceptance or lifecycle change.
The 20 existing L2 holders plus five new slices total 25 open obligations.
P2CER #2137 (`08f917ef`) is delivered registration, counted once using its original
receipt; no duplicate unit or claim of runtime delivery.

After U38/L1 release and the B15 chain through 5R: AUTH-LIMIT -> AUTH-ORIGIN ->
WIRE -> INV -> PRIV -> 6. Then residual U99/U100/U104/U105 and U101a -> b -> c -> d
-> aggregate U101; final packaged GUI proof follows B15-1/U101d/U101/B15-6 and all
residual obligations on integrated Main. Task57 and Task17/P2C gates remain.
INV owns both-mode budgets, known-code refusal, safe summary/correlation policy,
MR1/MR4 rows and optional logging disposition; PRIV retains listings/default names.
Required fixes, actor x 17-method proof and actual topology evidence precede any
B15-6 remote claim. CF-LSC0-4 local-seat scope census and CF-LSC0-12 LSC-2/2OP
ownership release bind U101a/c/d and B15-2. Existing findings remain open.

Both ledgers mirror `l2ReadinessAmendment20261018` and the
[complete census and source evidence](evidence/l2-readiness-amendment-20261018.json)
(SHA256 1da4c52b037e56328bdc97301e13c85d5be1b96dd682d509b2728883eb5d6fef). Census: 4 open PRs at stable exact heads,
all paginated files (including the 472-file PR), 124 planned/blocked/implementing
units, literal/ancestor aliases and both-ledger manifests. B14-0/A1 product merges
are observed; their historical lifecycle bytes stay untouched. Parent serializes
closure writers and in-flight LSC-1DB #2290, then rebases/re-censuses before delivery.
Publication refresh captures all five open PRs including A1 closure #2291; Main
and the 124 existing reservations remain unchanged.
Post-L1/B15 manifests, RED and actual fit must be re-frozen; U99 2/120, U100 3/120,
U104 5/220 and U101b/d 8/300 are unchanged. Separate lawful closure allocation or
narrower registration is required if tight caps cannot fit. No second L2 lane.
Every P3 letter, final platform GUI evidence and independent Astra exit review
remain owed before v2.3.0; P4 Task33 is distinct. This edit ran no runtime proof.

---

## Baseline and L1 review follow-ups (2026-10-18)

Docs-only registration under the standing owner direction, prioritizing ordinary-UI
setup, join, play, reconnect, finish and reload. Five new blocked units; no source
admission, runtime PASS, task tick, quarantine edit or existing-unit release.

B14-0 -> MP-RECOVERY-UNITS-1 -> MP-HOST-DEDUPE-1 -> P2CG1HP -> H.
B14-HEAD independently feeds HP; A2 does not wait for B14-HEAD. Recovery prefers
filesystem loading through the explicitly owned NodeCanonicalUnitService.ts.
Any server.js edit needs a scope amendment against H/U101d/B15-1; any engine edit
needs one against U73. Dedupe repairs concurrent first-host creation. Both precede
A2, whose feasibility must include an accepted unit action after packaged restart.
The separate LSC lane and all existing sensitive gates remain. L1 closures: 38.

COOP-PACK-GEN follows P2J, which already requires LSC-2P. Transfer #2279's two
quarantine owners in separately admitted config/guard work BEFORE P2J closure;
generator proof later removes them. CF-SMOKEA1-4 and CF-SMOKEA1-6 are small blocked
maintenance after L1-SMOKE-B, serial over package.json. U24b owns the nightly split
removal; LSC-2OP carries the 12/12 campaign-economy release predicate; B15-3R/B15-3
carry typed-422 handoff; H/U2b/U25 acknowledge #2283; LSC-2P/P2J check production
InMemoryPlayerStore behavior. Patch provenance is historical, not new proof.

Both ledgers carry identical followupsRegistration20261018; [the full collision
census](evidence/followups-registration-20261018.txt) covers all nine open PRs and
120 planned/blocked/implementing units. Shared ledger writes serialize with
#2288 LSC-0 closure, B14-0 closure and A1. Rebase before CI and after earlier
writers land; preserve other-unit lifecycle bytes. Future scope/cap expansion
requires admission or a registered split. NEXT remains advisory.

Sonnet review correction: all seven source hashes now bind the unchanged committed
113,202-byte LF evidence (SHA256 06f8fdf1b4d503f432771bddcd8d70564d896298c6a39cba4634bb7bd73a7428).
The old hash covered 748 extra CR bytes in the working copy. Committed bytes are
authoritative; the historical evidence is preserved. Routine maintenance units
no longer carry sensitive-work boilerplate.

---

## 2026-10-18 LSC-0 contract verified on main; LSC-1DB released; closure metadata proposed

LSC-0 advances from implementing to main-verified for contract PR #2286,
head 1298baf37853d636781a03ea633b6c2bf5d5eee3, merge 811bfd8d40d7d9366616dcd93c5a60ae0c95fd51.
Its baseline is 2d576747ee8dd210e5f6a5b0f380819b153a203a (the #2285 lscParallelLaneAmendment20261018 merge). Main did not move before the merge: first parent 2d576747ee8dd210e5f6a5b0f380819b153a203a, merge tree f5edb9b8 equal to the head tree and a clean merge-tree; the four contract leaves at the merge equal the head and the local receipt, and the admission controls are byte-identical.
The owner ruling ([comment 6254759051](https://github.com/SwiggitySwerve/MekStation/pull/2286#issuecomment-6254759051), 3911 bytes, sha256 35b9d3e6719d1b6c73e1497afcfbc44097a3ac6598a14ca3f46c1a7b0529c4be) was posted at 2026-10-18T20:27:52Z, before the merge at 2026-10-18T20:27:58Z. PK-lsc-0-ruling records it.

The admission, red and local receipts came with the contract PR and are unchanged.
The [review receipt](evidence/lsc-0-admission-review-20261018.json), written at the reserved slot name, binds two independent Fable 5.1 reviews: round 1 on 3f83031a1 REQUEST CHANGES (sha256 4260f8e109b6f4f3fc2f3730766fa0e14358582f42f3d6eb16849637a7c5ea22, 27277 bytes; H1, H2, M1-M6 and lows, fixed in-PR by 1298baf37) and round 2 on the merged head APPROVE (sha256 21717657db9473a47c46884b726a0bf07571d6ee2fc19dc41d886a313b1a5a67, 26500 bytes). Both are preserved byte for byte as base64 envelopes. Ledger within caps: 9/15 files, 195/500 counted lines.

The [merge receipt](evidence/lsc-0-merge-20261018.json) binds the parents, tree, census, contract leaves, admission controls, the D14 line range (CF-LSC0-5), 32/32 checks by name on the head (names equal the recorded 32) and the push runs on the merge commit.
The [main proof](evidence/lsc-0-mainproof-20261018.json) is a fresh contract run at the merge before any closure edit: Totals: 230 passed, 0 failed (230 items), qc:openspec-ci errors=0, spec:purpose 0 errors, validate-roadmap plain/--git PASSED and --next B14-0, validator tests 86/86, lint:units PASS, contract probe v2 38/38 and v1 20/20 over the merged leaves, spec-text mutants 30/30. All are light node runs; no heavy-run ticket was needed.

Carry-forwards (reviewer rows verbatim in the review receipt; routing as the owner ruling writes):

- CF-LSC0-1 [open]: U101 / B15-1.
- CF-LSC0-2 [open]: B15-1 / U101.
- CF-LSC0-3 [open]: LSC-2.
- CF-LSC0-4 [open]: U101a / U101c / U101d (census); LSC-1 (mirror).
- CF-LSC0-5 [open]: B15-0 admission; R2.campaign-access; closure receipt (recorded in lsc-0-merge d14).
- CF-LSC0-6 [open]: LSC-1DB / LSC-1S / LSC-1.
- CF-LSC0-7 [open]: LSC-2.
- CF-LSC0-8 [open]: LSC-1S / LSC-1.
- CF-LSC0-9 [open]: LSC-1 admission and review.
- CF-LSC0-10 [open]: LSC-2OP / B15-0.
- CF-LSC0-11 [discharged in-contract (D14 accepted consequence)]: accepted and documented in D14 (discharged in-contract).
- CF-LSC0-12 [open]: LSC-2OP / LSC-2 admission; U101c; B15-2.
- CF-LSC0-13 [open]: LSC-1 / LSC-2.
- CF-LSC0-14 [open]: LSC-1 (seam); LSC-2P (proof).
- CF-LSC0-15 [open]: LSC-1S / LSC-1.
- CF-LSC0-16 [open]: LSC-1S / LSC-1.
- CF-LSC0-17 [open]: LSC-1S / LSC-1.
- CF-LSC0-18 [open]: LSC-1 admission and review.

Low findings L-r2-1..7 are routed as the ruling writes (L-r2-1 PR-body count 14 not 15; L-r2-2 to CF-LSC0-15; L-r2-3 to CF-LSC0-16; L-r2-4 to CF-LSC0-17; L-r2-5 to LSC-2; L-r2-6 cosmetic; L-r2-7 to CF-LSC0-18).

LSC-0 has no task keys. Its tick remains null; no tasks.md row is changed.

Successor release (separate from the closure): LSC-1DB moves from blocked to planned; its only predecessor LSC-0 is main-verified with a genuine exact-main mainProof PASS in this same change set. No other unit changes: LSC-1S, LSC-1, LSC-2OP, LSC-2, LSC-2P, the B14/HP lane, H and every other unit state are unchanged.
Selection is not downstream admission.
This closure metadata still requires its own CI and parent merge.

---

## LSC parallel product lane amendment (2026-10-18)

Council 3b member A sections 1-2 independently verified at Main
`1e0a34dc5da4c4051115db828e986ceb5aad2fa0`. All seven LSC ownership paths
and literal manifests are disjoint from B14-0/B14-HEAD/HP, except shared
`units.json` lifecycle writes. PRs #2281/#2278/#2279/#2282/#2283 were checked
at the heads recorded in [census evidence](evidence/lsc-parallel-amendment-20261018.txt). The baseline PRs
intersect LSC-2P's broad `e2e` alias, but none of its literal proof files.

LSC-0 consumes existing identity/token/membership contracts, not HP recovery.
Its predecessor is now main-verified P2CG1S; LSC-0 is planned, later LSC units
remain blocked. S/LSC links are symmetric. HP now points directly to H, and H
retains LSC-2P plus every previous predecessor; its pre-existing HP gate is
also explicit. `lscParallelLaneAmendment20261018` in both ledgers records the
owner-overridable product-lane exception alongside B14/HP. Internal lane order
and all caps/contracts/review/proof/release gates remain. Shared ledger writes
are serialized with other product and smoke closures. Fresh census remains
mandatory; historical sequencing clauses are superseded only as stated there.

`--next` remains advisory and selects one candidate in array order. Actual
baseline output remains **B14-0** because Main still records it planned; the
selector does not read #2281's GitHub review state or ordinary predecessor
arrays. B14-HEAD remains blocked pending genuine B14-0 closure. LSC-0 is
independently eligible on S, even when an earlier smoke unit wins the selector.
Array placement adds no B14/HP predecessor. No validator semantics, historical
receipts, source admission or runtime acceptance are changed.

---

## Data-fidelity registration, review round 2 corrected (2026-10-18)

Rebased after #2275; its L1-SMOKE entries and B14-0 priority remain intact. This is
registration only: seven NEW blocked routine/product units, no task holders,
source admission or runtime acceptance. Every new unit retains 15 files / 500
counted additions; the amendment stays within its own 500-counted-addition budget.

Sources: [unit coverage](../../../docs/audits/2026-10-18-unit-type-coverage.md),
[equipment coverage](../../../docs/audits/2026-10-18-equipment-rules-coverage.md),
[MegaMek reference](../../../docs/audits/2026-10-18-megamek-mm-data-reference.md).
Their merged blob sourceSha256 values and exhaustive unit/node collision census
are in [registration provenance](evidence/data-fidelity-registration-20261018.txt),
hash-bound from BOTH ledgers and each new unit. Research is not runtime proof.

Order: U79 -> U80 -> U81 -> U82 -> DF-MECH-RULES -> DF-MECH-CONFIG ->
DF-MECH-META -> DF-BLK-ENGINE -> DF-CATALOG-PIN. Unit predecessor/successor
links and dedicated node edges agree; historical U79-U82 node attribution stays
via reownedTo. Initial U80 still publishes the tracked bytes U79 reproduces.
U79 compares using the immutable producer/input tuple recorded by the active
pin, so newer generator HEAD cannot make that old comparison red. Only after
U82 untracks may fidelity fixes land; their fixture-only generation changes no
tracked catalog. RULES preserves published storage paths independently of corrected
rules metadata, protecting existing static imports and one index row per identity.
DF-CATALOG-PIN validates the new tuple and artifact, publishes
and re-pins config/catalog-assets.json through U80/U81. No new cap waiver. U79/U80 admission re-measures amended cap fit;
DF-CATALOG-PIN requires owner release-publication authorization at admission.

DF-SHEET-QV is the tiny printing order fix; U72/U78 and both covering nodes
require explicit reconciliation. DF-MECH-CONFIG now covers Center Leg only;
DF-MECH-META separately covers Omni/industrial metadata, boolean schema and
generator-produced contract. DF-BLK-ENGINE includes blk_common.py fallback,
all codes 0-13, and explicit rejection of undocumented 14/15. EQ-ID supplies
an integrity gate, not wholesale catalog repair. Exact manifests include stable
Jest wrappers for every Python suite and EQ-ID; ordered python3/python/py -3
resolution, explicit timeouts and CI-runner interpreter proof are admission gates. Census includes all 22 wrapper reservations plus lifecycle exceptions,
R6.loop-harness, R6.umbrella and R2.camp-8's src alias; resolve before admission.

OFF L1/L2: no multiplayer server/API, campaign coop UI/lib, server.js or campaign
sync paths. P7 tasks 88-93 remain R7.versions -> R7.provenance -> R7.context.
Source work is serialized. Freeze all source/test/lifecycle/evidence leaves and
re-measure caps; tests/generated lines exempt only under existing validator rules.

Deferred without admission: DF-MECH-MAPPING (QuadVee/Tripod Omni recognition,
third independent configuration behavior; cannot fit this registration budget);
DF-BLK-SCHEMA (split vehicle/aero boundaries); DF-BV-REF (split historical
reference/strict validators, final parity waits BOTH BLK fixes); EQ-QUIRK
(alias/mount split after EQ-ID/U79 coordination); EQ-HAG (extractor boolean and
metadata after EQ-ID, no combat claim). DF-CATALOG-PIN publishes battlemechs
only; BLK catalogs await schema/BV. G1 expansion needs per-family contracts;
G7 engine journeys need state/combat/replay/AI and L1 coordination; G6 capital/
entity scope needs models and upstream BuildingEntity reconciliation. None is
silently included. Independent review, green CI and Root merge remain required.

---

## 2026-10-18 L1 built-server spectator smoke registration: review-round-1 corrections

Registration only: L1-SMOKE-A1 is planned; L1-SMOKE-A2 and L1-SMOKE-B are blocked. A1 depends only on P2CG1S, A2 on A1, and B on A2/B14-0/B14-HEAD genuine exact-main PASS, ancestry and closure. All three records follow B14-HEAD in units.json, preserving B14-0 as validate-roadmap --next after the #2273 rebase. This array order does not add a B14 wait to A1/A2. All have empty taskKeys, ciClass product, sensitive privacy/authority review, ordinary 15-file/500-total-counted-added-line caps and null lifecycle/owner-gate receipts. No source implementation, runtime PASS or discharge is claimed.

Root reported Sonnet CHANGES on 660756de4 and authorized this correction: split A1 harness/build identity/readiness/redaction/authenticated transport/fog-off baseline from A2 nine-case B10 live/replay matrix, actor/reveal controls and same-image reconnect/restart. Each unit has four distinct new script leaves and a nine-file prospective source stage. A1 freezes reusable harness/transport callbacks; A2 imports A1 read-only, and B imports A1/A2 read-only from its own new leaves. B retains all fog-on refusals and composes the full final proof after B14-HEAD and before H or spectator shipment. No successor may edit a predecessor's frozen module. H depends on A1/A2/B; the v2.2.0 checklist now has 36 closures. The unchanged [full prep](evidence/v220-prep-20261018.txt) is historical; these explicit split manifests supersede its four-file combined proposal.

The 500-line limit is TOTAL per unit across all counted files including lifecycle, never per-file. Planning allocations are A1 450, A2 480, B 440, not measured fit; actual aggregate measurement before admission is mandatory and overflow requires another registered split. Each unit explicitly requires: "the admission freeze lists the exact leaf files as the merge-diff allowlist; any other path under the coarse scripts alias fails admission". The scripts lint ceiling has zero headroom (50/50), so every new leaf must be lint-clean. Fixture TypeScript must use the existing tsx dependency or standalone offline SQL; no src/loader/dependency changes.

Owner authority: standing instruction "continue with recommended options and fix the issues that come up, publish as needed"; 2026-10-18 parallel/research direction and this task's explicit parallel-proof-lane authorization, reaffirmed by Root's review-fix instruction. The L1 product lane remains serial; the separate A1/A2/B proof lane is serial including closure, with shared units.json writes serialized/rebased. No L2 concurrency, sensitive ruling waiver or merge approval.

Fresh census at ebbea9a4ebec2b2445f7a04570a9af1517233881 covers all 240 units/82 nodes, including 110 planned/blocked/implementing units (36/74/0) and 35 such nodes: zero existing ownership/ancestor/prospective-manifest matches for all twelve absent script leaves. scripts/release is absent; scripts is validator navigation only, with its existing 30 unit/6 node overlaps granting no broad scope. Unique l1-smoke-a1-*, l1-smoke-a2-* and l1-smoke-b-* evidence resolves P2C/U85/R9.close documentary aliases without changing those owners. Re-census every admission. #2273's B14-0B closure and B14-0 planned release are preserved.

S-SMOKE-1, B14A-SMOKE-1 and B14B-SMOKE-1 remain owed until all three closures and genuine combined exact-Main proof; repeat on the exact RC if different. All CF-S-1 through CF-S-9 owners/historical receipts remain unchanged. NEXT does not enforce ordinary predecessors; Root enforces finite admission, sensitive packet/review/OWNER-RULING, exact-head CI and exact-main closure. H's independent checkpoint and every LSC/P2J/installer/human gate remain. Existing one-player packaged validation is not spectator proof. Root will send the revised head for independent re-review; no approval is inferred from the earlier superseded draft review.

## 2026-10-18 B14-0B source verified on main; B14-0 released; closure metadata proposed

B14-0B advances from implementing to main-verified for source PR #2270,
head 90d2bae2a48868dff619cf740fa212dfba8a6968, merge 4d9eb7213449962d9285402f48416b9608868642.
Its baseline is e6d1553ce90ca9c56705a349155c4030e7901857 (the #2269 merge, whose first parent is the B14-0A closure #2268 e23ce5e5; #2269 touched no B14 file). Main did not move before the merge: the merge has first parent e6d1553c, a clean merge-tree equal to the head tree (f3c7b51e), the ten test leaves each carry one identical +10/-0 seam hunk and nothing else under src changed, and the eighteen admission controls are byte-identical at the baseline, the head, the merge and this closure base 921ad8a1 (B14B-MAIN-1).
The owner authorized this ruling under the standing instruction and the direct approval of 2026-10-18, and it was posted as [comment 6252742470](https://github.com/SwiggitySwerve/MekStation/pull/2270#issuecomment-6252742470);
its exact UTF-8 body (2540 bytes; gh api --jq .body prints it plus one LF), without an added newline, hashes to a37ca8dd92a961135ac96e10424042eb767a5404e3cce08024e9b86d2f896b27.
The ruling (17:11:55Z) preceded the merge (17:12:01Z), and PR #2270 carries the owner-ruled label.
PK-b14-0b-ruling records that ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/b14-0b-review-20261018.json), written at the reserved slot name, binds one independent sensitive review (Claude Sonnet 5.5, the reviewer for test-only units; author Opus 5.5) of the exact head 90d2bae2a: APPROVE, no blocking findings, sha256 6a3f095054c4d6113ddb8ca1cebd46b8a5e40161975e97aaf071d1b5c3fd666c (10257 bytes), preserved byte for byte as the base64 envelope evidence/b14-0b-source-sonnet-review-20261018.bytes.json because its last line ends in CRLF and the repository normalizes text to LF (B14B-ENC-1).
The reviewer found the ten seams test-only, canonical and assertion-preserving; reproduced the baselines (85/85 at head with the guard suite; 71/71 under a simulated B14-0 refusal with the seams; 35 failed of 71 without them, per-suite counts and simulation hash matching the RED receipt); re-ran author mutants F1, F3, F5 and F7 (caught) and ran seven of its own (X1, X4, X5, X7, X8 caught; X2 and X6 survive on the unseamed base as well and are killed by fogOfWar.test.ts and the fogOfWarIntegration suite).
The allowlist guard accepts exactly the 14 registered suites and rejects a 15th, but a B14-0B seam can be deleted without it noticing (G14drop), a declared gap owned by B14-0. The S spectator suite differs only by the seam and passes 34/34; removing the spectator rule (F3) breaks 21 rows. RED is not-applicable with four real runs (B14B-RED-1). Ledger within caps: 15/15 files, 16/500 counted lines.
The reserved b14-0b-review-20261018.json slot is filled by the closure review receipt only; no reviewer text is fabricated into it (B14B-SLOT-1).

Carry-forwards (reviewer bullets verbatim in the review receipt; directedTo is closure routing, as the owner ruling writes; B14B-CFMAP-1):

- CF-B14B-1 [open]: B14-0, as the owner ruling writes ("CF-B14B-1 -> B14-0: make the guard check for the exact canonical block and for all 14 seams. Assert the capability module is unmocked in b14FogContainment.test.ts. This folds in CF-B14A-2."): the guard in matchHistoryFog.test.ts requires all 14 allowlisted suites to carry the byte-exact canonical block (not three toContain substrings), b14FogContainment.test.ts asserts fogMatchAdmission is unmocked, and the matchLacksRevealProjection override type stays in step with the real export. CF-B14A-2 (exact-match tightening against a concatenated jest.doMock path, jest.spyOn, moduleNameMapper or consumer-module mocks) is folded into this item by the same ruling. Recorded under successorNotes.B14-0; B14-0 is not edited.
- CF-B14B-2 [open]: The FOG chain (FOG-S, FOG-K, FOG-B, FOG-L, FOG-R, FOG-H, FOG-X), as the owner ruling writes ("CF-B14B-2 -> FOG-*: keep the dedicated target-visible and UnitDestroyed tests."): only fogOfWar.test.ts and ServerMatchHost.fogOfWarIntegration.test.ts kill X2 and X6; any FOG work on those branches of fogOfWar.ts keeps that dedicated coverage. Informational: B14-0B did not introduce the gap. Recorded under successorNotes.FOGChain; no FOG unit is edited.
- CF-B14B-3 [open]: The FOG chain and B14-HEAD, as the owner ruling writes ("CF-B14B-3 -> FOG-*/B14-HEAD: when a real per-viewer reveal projection lands, retarget or remove the 14 seams and shrink the allowlist."): when a real per-viewer reveal projection lands, the 14 seams (4 B14-0A, 10 B14-0B) are removed or retargeted and B14_SEAM_ALLOWLIST shrinks, so the suites test the production path again; the refusal-by-default proof stays solely in B14-0 b14FogContainment.test.ts. Recorded under successorNotes.FOGChain and successorNotes.B14-HEADAndU38; no unit is edited.
- CF-B14B-4 [open]: B14-HEAD, as the owner ruling writes ("CF-B14B-4 -> B14-HEAD: re-run the seam-necessity check against the real B14-0 code."): the 35-failure unseamed-simulation reproduction (or an equivalent) is re-run against the real B14-0 code rather than the uncommitted B14-PREP2 patch. This closure does not run it: the real B14-0 code does not exist at 4d9eb721, and the exact-main proof here runs the merged tree only (B14B-NEC-1). Recorded under successorNotes.B14-HEADAndU38; B14-HEAD is not edited.
- CF-B14A-2 [open]: folded into CF-B14B-1 (B14-0) by this ruling.

From the B14-0A closure: CF-B14A-5 (B14-0), CF-B14A-6 (FOG-H), CF-B14A-7 (FOG chain and B14-HEAD), CF-B14A-8 (B15-PRIV/FOG) and CF-B14A-9 (U26) stay open with their owners; CF-B14A-1, -3 and -4 stay discharged. From the P2CG1S closure: CF-S-1, CF-S-2 (B14-0), CF-S-3 (the seat-argument preservation held through B14-0B and binds B14-0), CF-S-4, CF-S-5, CF-S-6, CF-S-7, CF-S-8 and CF-S-9 stay open with their owners. The exact-main built-server socket smoke stays owed before P2CG1H and before any build that ships spectating (B14B-SMOKE-1). CF-G2-9 did not recur (Seam Anchors passed on its first attempt) and stays open with its real owner (B14B-SEAM-1).

Still open, owners unchanged: from P2CG1R CF-H8/CF-G5, CF-G2-3, CF-R-1, CF-R-2, CF-R-3, CF-R-4, CF-R-5, CF-R-6; from P2CG1G2 CF-G2-1, CF-G2-2, CF-G2-4, CF-G2-5, CF-G2-6, CF-G2-7, CF-G2-8, CF-G2-9, CF-G2-10; from P2CG1G1 CF-H2, CF-H5, CF-H7, CF-H9, CF-H10, CF-H13, CF-H14, CF-H15, CF-H17; from P2CG1G2A CF-G2A-1, 2, 3, 4 and 6 (B15). B14-0B changed none of their owner files. CF-E5 and CF-E6 remain recorded in evidence/p2cg1d-review-20261017.json and CF-F9 in evidence/p2cg1e-review-20261018.json, as evidence/p2cg1g1-review-20261018.json successorNotes.P2CG1H.priorNotes and evidence/p2cg1r-review-20261018.json carryForwardLedger.priorNotes list them; this closure neither restates nor changes them. The P2CG1R closure discharged H-OPEN-1 / CF-E1, pinned CF-E7 and discharged CF-H8/CF-G5 for the host arm only (R-HP-1: P2CG1HP keeps its binder test, nine files, and widens the row to {host, member}); evidence/p2cg1r-review-20261018.json records them and this closure changes none of them. The P2CG1S closure (evidence/p2cg1s-review-20261018.json) carried these unchanged; this closure changes none of them either. The B14-0B closure carries these unchanged as well.

Root notes (not reviewer text; recorded under successorNotes.openNotes):

- B14B-MAIN-1 (Root): Main did not move between the PR base e6d1553c (the #2269 merge, the units.json baseline field; its first parent is the B14-0A closure merge #2268 e23ce5e5, and #2269 changed only simulation and construction files, none in a B14 manifest, control or openspec) and the merge: the merge commit 4d9eb721 has first parent e6d1553c and second parent the merged head 90d2bae2; its tree f3c7b51e equals the head tree and git merge-tree --write-tree of the two parents (clean), as the owner ruling recorded ("merge state is CLEAN"). Its units.json equals the head's, which differs from the baseline only in the B14-0B entry; the packets are unchanged. The ten test leaves each carry one +10/-0 hunk with the identical seam block (sha256 ab0a7ed9532f1be41e72acf9591f3b9bae4b75c9f8ed4171e127b237db31e1dd over the ten added lines) from the seams commit cd45d922 through the merge, no other src file changed, and the eighteen admission unchanged controls (including fogMatchAdmission.ts, the three host modules, MatchWireSealedChoices.ts, fogOfWar.ts, the projection modules, the guard suite matchHistoryFog.test.ts, the four B14-0A seam suites, sealedChoiceDelivery.test.ts, the fog-of-war spec and server.js) equal their admission hashes at the baseline, the head, the merge and the closure base (main moved after the merge by 921ad8a1 #2271, changing docs/audits/2026-10-15-move-completion-opus-review.md, docs/audits/2026-10-15-ndc1-current-runtime-route-review.md, docs/audits/2026-10-15-ndc1-current-runtime-route.md, docs/audits/2026-10-15-ndc1-r5-differential-outcome.md, docs/audits/2026-10-15-ndc1-r5-differential-review.md, docs/audits/2026-10-15-ndc1-r5-native-failure-review.md, docs/audits/2026-10-15-ndc1-r5-schema-binding-review.md, docs/audits/2026-10-15-ndc1-r5-tool-renewal-review.md, docs/audits/2026-10-15-ndc1-vss-origin-candidate-review.md, docs/audits/2026-10-15-ndc1-vss-origin-design-review.md, docs/audits/2026-10-15-opus-foundation-catchup-review.md, docs/audits/2026-10-15-opus-investigations-catchup-review.md, docs/audits/2026-10-15-opus-p1p2-catchup-review.md, docs/audits/2026-10-15-opus-task56-scope-review.md, docs/audits/2026-10-15-p1-local-qualification.md, docs/audits/2026-10-15-p2-ci-lint-repair-review.md, docs/audits/2026-10-15-p2-main-exit-review.md, docs/audits/2026-10-15-p2-repair-release-review.md, docs/audits/2026-10-15-task56-catalog-candidate-review.md, docs/audits/2026-10-15-task9-p2ca-opus-review.md, docs/audits/2026-10-16-council-A-product-path.md, docs/audits/2026-10-16-council-B-process.md, docs/audits/2026-10-16-council-C-architecture.md, docs/audits/2026-10-16-p2cb-saga-registration-fable-review.md, docs/audits/2026-10-16-p2ce-split-registration-fable-review.md, docs/audits/2026-10-16-p2ce1-fable-review.md, docs/audits/2026-10-16-p2ce2-fable-review.md, docs/audits/2026-10-16-p2ce3-fable-review-r2.md, docs/audits/2026-10-16-p2ce3-fable-review.md, docs/audits/2026-10-16-p2cer-registration-opus-review.md, docs/audits/2026-10-16-p2cf-split-registration-fable-review.md, docs/audits/2026-10-16-p2cf1-fable-review.md, docs/audits/2026-10-16-p2cf2-fable-review.md, docs/audits/2026-10-16-p2cg1-split-registration-fable-review.md, docs/audits/2026-10-16-p2cg1a1-fable-review.md, docs/audits/2026-10-16-p2cg1a2-fable-review.md, docs/audits/2026-10-16-task10-p2cb-fable-review.md, docs/audits/2026-10-16-task11-p2cd-opus-review.md, docs/audits/2026-10-16-task14-sequencing-fable-review.md, docs/audits/2026-10-16-task57-residual-registration-opus-review-r2.md, docs/audits/2026-10-16-task57-residual-registration-opus-review.md, docs/audits/2026-10-16-task9-p2ca-packet-opus-review-r2.md, docs/audits/2026-10-16-ts7s1a-fable-review.md, docs/audits/2026-10-16-ts7s1b-fable-review.md, docs/audits/2026-10-16-ts7s2a-fable-review.md, docs/audits/2026-10-16-ts7s2b-fable-review.md, docs/audits/2026-10-17-council-A-ts7-path.md, docs/audits/2026-10-17-council-B-roadmap.md, docs/audits/2026-10-17-council-C-cadence.md, docs/audits/2026-10-17-council-roadmap-decision.md, docs/audits/2026-10-17-l1-amendment-draft.md, docs/audits/2026-10-17-p2cg1b-review.md, docs/audits/2026-10-17-p2cg1c-review.md, docs/audits/2026-10-17-p2cg1d-admission-stop-report.md, docs/audits/2026-10-17-p2cg1d-review.md, docs/audits/2026-10-17-pr2209-review.md, docs/audits/2026-10-17-pr2210-review.md, docs/audits/2026-10-17-pr2211-review-r2.md, docs/audits/2026-10-17-pr2211-review.md, docs/audits/2026-10-17-pr2212-review-r2.md, docs/audits/2026-10-17-pr2212-review.md, docs/audits/2026-10-17-pr2215-review.md, docs/audits/2026-10-17-pr2220-review.md, docs/audits/2026-10-17-pr2223-review.md, docs/audits/2026-10-17-pr2224-review.md, docs/audits/2026-10-17-pr2225-review.md, docs/audits/2026-10-17-pr2226-review.md, docs/audits/2026-10-17-rel04-prereview.md, docs/audits/2026-10-17-rel04-review.md, docs/audits/2026-10-17-ts7-archive-ownership-fix.md, docs/audits/2026-10-17-ts7-track-exit-recheck.md, docs/audits/2026-10-17-ts7-track-exit-review.md, docs/audits/2026-10-17-ts7s2od-review.md, docs/audits/2026-10-17-ts7s3-review.md, docs/audits/2026-10-17-ts7s4a-review.md, docs/audits/2026-10-17-ts7s4b-review.md, docs/audits/2026-10-17-ts7s5a-review.md, docs/audits/2026-10-17-ts7s5b-review.md, docs/audits/2026-10-17-ts7s5c-review.md, docs/audits/2026-10-18-audit-batch-provenance.md, docs/audits/2026-10-18-ichain-amendment-design.md, docs/audits/2026-10-18-megamek-mm-data-reference.md, docs/audits/2026-10-18-p2cg1e-review.md, docs/audits/2026-10-18-pr2226-review-r2.md, docs/audits/2026-10-18-pr2227-review.md, docs/audits/2026-10-18-pr2229-verify.md; none is a B14-0B leaf; the B14-0A, B14-0B, B14-0 and P2CG1S entries are unchanged).
- B14B-CHECKS-1 (Root): CF-H12: all 32 required PR check runs on the merged head 90d2bae2 (run 39146060890) concluded success on their first attempt (the filter=all listing holds exactly 32 check runs) and their names equal, one to one, the 32 names recorded for P2CG1G1, P2CG1G2A, P2CG1G2, P2CG1R, P2CG1S and B14-0A (the P2CG1S local receipt expectedNames); the author posted the by-name comparison, with each run id, as https://github.com/SwiggitySwerve/MekStation/pull/2270#issuecomment-6252601181 (posted 2026-10-18T16:58:12Z, not edited; before the ruling). pr-checks.yml (blob a82fe0f7) is identical at the P2CG1S merge, the B14-0A head, merge and closure, the B14-0B baseline, head and merge and the closure base. The PR checks do not run on the push of the merge commit to main; at 2026-10-18T17:14:49Z the merge commit carried 10 push-workflow check runs (Live Tier Signal completed/success; release completed/skipped; Push Docker image completed/skipped; build completed/skipped; Build Docker image completed/skipped; Prepare Build Artifacts completed/skipped; Determine release tag completed/success; Publish Live Evidence (windows-latest) completed/success; Publish Live Evidence (ubuntu-latest) completed/success; version-and-release completed/success), none failed. The exact-main proof here is the fresh local run at the merge.
- B14B-CFMAP-1 (Root): The owner ruling routes the four review carry-forwards by id, one clause each, with the same owners as the review bullets except that CF-B14B-3 is written "FOG-*/B14-HEAD" for the review's "FOG-*, with B14-HEAD". CF-B14B-1 folds in CF-B14A-2 (B14-0A closure, routed to B14-0): both now travel as one B14-0 guard-tightening item, and CF-B14A-2 keeps its own row with statusAtThisClosure naming the fold. CF-B14B-4 is routed to B14-HEAD, so this closure records that the necessity re-check is owed rather than claiming it (B14B-NEC-1). No review finding is discharged by this closure; the review records no blocking finding.
- B14B-RED-1 (Root): B14-0B is a test-only unit. Its RED receipt is status not-applicable under admission ruling B14-0B-R1 and the registration acceptance ("RED is honestly N/A ... Record each suite passing before and after; do not fabricate a failing-product proof."), backed by four real runs (before and after on Main, 71/71 each; simulated B14-0 refusal unseamed 35 failed of 71 and seamed 71/71). The reviewer judged it PASS (section 4) and reproduced the numbers; the owner ruling accepted it ("RED not-applicable: the rationale is backed by four real runs."). This closure records no failing-product proof and invents none; the validator requires only that the red receipt path exists.
- B14B-NEC-1 (Root): CF-B14B-4 asks that the seams' necessity be re-checked against the real B14-0 code. The author's RED receipt (status not-applicable, ruling B14-0B-R1) recorded the necessity run against an uncommitted simulation of B14-0 (b14-0-simulation.json, sha256 3d8d921f2a339127581e317c50be688b566f1a32c78c6fc19bc3492e4987c66e): unseamed 35 failed of 71 across 10/10 suites, seamed 71/71; the reviewer reproduced it with the same simulation hash (35/71 unseamed, 71/71 seamed; reviewerProofLogs P1b.json and P1.json). The owner ruling routes the re-check against real code to B14-HEAD. This closure's exact-main proof runs the merged tree, where no WebSocket module imports fogMatchAdmission and the seams are inert (admission design.inertOnMain); it neither re-runs the simulation nor claims the re-check.
- B14B-ENC-1 (Root): The review report is 10257 bytes of ASCII with no byte-order mark and 76 line feeds, of which exactly one, ending the last line (the CF-B14B-4 bullet), is preceded by a carriage return. The repository .gitattributes sets "* text=auto eol=lf", so a .txt copy would be normalized on commit and its blob would no longer hash to 6a3f095054c4d6113ddb8ca1cebd46b8a5e40161975e97aaf071d1b5c3fd666c. The B14-0A closure stored its CR-free review as a .txt; to keep this one byte for byte, as the owner ruling requires ("The closure copies it byte-for-byte"), the closure stores it as a base64 envelope ({encoding, payloadSha256, payloadBytes, data}), the same form the main-proof logs use to survive LF normalization. Decoding data yields the report exactly; payloadSha256 is the ruling's sha256. No .gitattributes or other repository-wide file is changed.
- B14B-SMOKE-1 (Root): Still owed, unchanged by B14-0B: The exact-main built-server socket smoke (P2CG1S registration20261017HPrereqs proof 4: "exact-main built-server socket smoke before H or any spectator-bearing shipment.") remains owed, as the owner ruling writes ("The built-server socket smoke test required before H or any build shipping spectating remains owed") and as the admission and local receipts recorded it (a post-merge obligation). This closure's main proof is jest, typecheck and validator only; it does not discharge the smoke. It binds before P2CG1H and before any build that ships spectating. B14-0A changed HTTP refusal only (no WebSocket, spectator or server.js byte; server.js is an admission control) and this closure's main proof is jest, typecheck and validator only, so it neither discharges nor narrows the smoke. B14-0B is test-only (no product, WebSocket or server.js byte; server.js is an admission control) and this closure's main proof is jest, typecheck and validator only, so it neither discharges nor narrows the smoke.
- B14B-SEAM-1 (Root): CF-G2-9 (Seam Anchors :425 same-seed marker inequality) did not recur on the B14-0B head: the filter=all listing on 90d2bae2 shows one Seam Anchors run, success on its first attempt, with no rerun, as the author's by-name comment records ("the CF-G2-9 Seam Anchors flake did not occur"). B14-0B touched no e2e, engine, simulation or gameplay file (e2e/seam-fresh-construction-no-instant-defeat.spec.ts is byte-identical from the B14-0A merge to this merge) and its admission recorded the item as passing through. It stays open with its real owner (G2-SEAM-1, S-SEAM-1, B14A-SEAM-1); one more clean run does not discharge it.
- B14B-GATE-1 (Root): The main-proof runner gated every run with node scripts/qc/machine-idle.mjs --own-pid 47516 --own-pid 55164, the gate Root ruled for the P2CG1G2 closure (G2-GATE-1: PID 47516 the idle server.js, PID 55164 T3 Code's idle html_preview renderer), used by the P2CG1R, P2CG1S and B14-0A closures (R-GATE-1, S-GATE-1, B14A-GATE-1) and restated by the closure brief; --own-pid was the only exclusion flag, and the runner waited on any other busy reading. Every reading printed MACHINE_IDLE on the first check, one per run. The runs were sequential (one heavy run at a time); this closure neither started nor stopped any process other than its own runner and its jest/tsc/validator children, and no timeout was raised.
- B14B-SLOT-1 (Root): The reserved review slot evidence/b14-0b-review-20261018.json (frozen in the admission manifest as the one reservedUnchanged entry, already listed in B14-0B.ownershipExceptions, and recorded "(unwritten)" by the local census) was unwritten at the head, the merge and the closure base. This closure writes it, under its frozen name, as the closure review receipt: Root/closure text that binds the genuine review by sha256 and quotes reviewer strings only verbatim (each checked as a substring of the stored copy). No reviewer text is authored into it. The reviewer's own report was written to docs/audits/2026-10-18-b14-0b-review.md in its detached review worktree (untracked there); this closure preserves it byte for byte at evidence/b14-0b-source-sonnet-review-20261018.bytes.json (B14B-ENC-1).

All 32 checks on the merged head succeeded on their first attempt (run 39146060890); the 32 names equal those recorded for P2CG1G1, P2CG1G2A, P2CG1G2, P2CG1R, P2CG1S and B14-0A and match pr-checks.yml one to one:
Detect Changes; Install Dependencies; Lint; Format Check; Validate Roadmap Ledger; Type Check; Unit Tests (1/6); Unit Tests (2/6); Unit Tests (3/6); Unit Tests (4/6); Unit Tests (5/6); Unit Tests (6/6); Perf Smoke Tests; Statistical Proof PR; Perf Budget PR; Coverage Floor; A11y Tests; Validate BV Parity; Validate Combat Suite; Build Storybook; Schema Bridge; Determinism Audit; E2E Smoke; Seam Anchors; Customizer Regressions; Desktop Type Check; Desktop Tests; Lint and Test; Prepare Build Artifacts; Build Test / linux; Build Test / mac; Build Test / win.
GitHub enforces only Lint and Test; each name was verified individually.
The [merge receipt](evidence/b14-0b-merge-20261018.json) binds both ordered parents, the matching integration tree, the census (16/500 counted lines, 14 changed files plus the reserved slot), the seam diff and the admission controls at the merge.
The [main proof](evidence/b14-0b-mainproof-20261018.json) is a fresh run at the merge before any closure edit, after a real npm ci under Node v22.22.0, each jest run --runInBand with a private cache after machine-idle --own-pid 47516 --own-pid 55164 printed MACHINE_IDLE (B14B-GATE-1):
the owned suites, the B14-0A owned suites, the regression census and the B14-0A closure proof set together (155 suites, 1606/1606), the ten owned suites with the guard suite (11 suites, 85/85), the seven B14-0A owned suites (7 suites, 162/162), the 109-suite regression census (109 suites, 868/868), the two S suites (2 suites, 41/41), the six focused S suites (6 suites, 72/72), the R suites (3 suites, 127/127), the G2 suites (5 suites, 129/129), the G2A suites (2 suites, 57/57), the G2A related set (74 suites, 934/934), the P2CG1G1 leaves (4 suites, 81/81), the Task 14 selector (4 suites, 104/104), P2CG1F (3 suites, 96/96), P2CG1E (3 suites, 166/166), P2CG1D (4 suites, 129/129), P2CG1C (2 suites, 54/54), P2CG1B (2 suites, 52/52), the 35 A1/A2 suites (35 suites, 398/398), typecheck and the validator passed.
Every set shared with the B14-0A main proof matches its count at the B14-0A merge exactly; the seams add no test.
The seam-necessity re-check against real B14-0 code is not run here; it is owed by B14-HEAD (CF-B14B-4, B14B-NEC-1).
It references the author's 21 proof logs by hash.

B14-0B has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed.

Successor release (separate from the closure): B14-0 moves from blocked to planned;
its only predecessor B14-0B is main-verified with a genuine exact-main mainProof PASS in this same change set, and B14-0A and P2CG1S are also main-verified.
No other B14-0 field changes. B14-HEAD, P2CG1HP, P2CG1H, the LSC units, P2CG1I1-P2CG1I4, P2CG2, P2CH, P2C, U26, U38, the FOG units, the B15 units and every other unit state are unchanged.
Selection is not downstream admission.
This closure metadata still requires its own CI and parent merge.

---

## 2026-10-18 B14-0A source verified on main; B14-0B released; closure metadata proposed

B14-0A advances from implementing to main-verified for source PR #2267,
head 8509a3e3188d7e860d060080861fb269259ccfc3, merge 2e61f050a7ba7e7feee7b647e711d8a833a08a2d.
Its admission baseline is 87c0f1508c859fe1386595c02c53501d9446b861 (the #2266 merge; the units.json baseline field 3971389b is the P2CG1S closure #2265, its first-parent ancestor). Main did not move before the merge: the merge has first parent 87c0f150, a clean merge-tree equal to the head tree (9a711bc1), the three product leaves equal the local receipt follow-up hashes and the sixteen admission controls are byte-identical at the head, the merge and this closure base 2e61f050 (B14A-MAIN-1).
The owner authorized this ruling under the standing instruction and the direct approval of 2026-10-18, and it was posted as [comment 6251586209](https://github.com/SwiggitySwerve/MekStation/pull/2267#issuecomment-6251586209);
its exact UTF-8 body (2446 bytes; gh api --jq .body prints it plus one LF), without an added newline, hashes to ab4d7587fcc9c74a218e6c2f3ebad9425ddf22dfeb8a895831a2c7d2abb8c326.
The ruling (15:18:45Z) preceded the merge (15:18:51Z), and PR #2267 carries the owner-ruled label.
PK-b14-0a-ruling records that ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/b14-0a-review-20261018.json), written at the reserved slot name, binds one independent full sensitive review (Claude Fable 5.1, substituting for GPT Astra; author Opus 5.5) of the GREEN head d66ef4366: APPROVE, sha256 8c11dbbc3ab014222fbcef89f947f3824ffad6c0d718a9c5e79a401208127fee (20720 bytes), preserved byte for byte at evidence/b14-0a-source-fable-review-20261018.txt.
The reviewer reproduced RED (11 failed of 159 with both existing product leaves byte-identical to the base and the new helper dead code, ruling B14-0A-R1) and GREEN (159/159), traced the ordering (membership before policy; refusal before any journal, audit, private or epoch read; no raw fallback), found the seam unable to reach production and the 1011/false semantics preserved for B14-0, and ran 10 mutants (6 caught; R1, R2, R3, R8 survived as coverage gaps, R9 bypassed the seam guard).
It found no product defect: F1 (Medium) is a test gap, F2-F8 are Low, F9-F10 Info. The classes: privacy PASS with notes (pre-existing residual channels routed below), authority PASS, replay PASS; idempotency and concurrency, also assessed, PASS.
The review-recommended additions (F1, F2, F4 rows; F3 product parity fix; F6 receipt correction) landed after the reviewed head, in the follow-up 8509a3e3, which is the ruled and merged head; Root diffed d66ef436..8509a3e3 (receipt in the ruling). No independent review of the follow-up is claimed (B14A-FU-1).
The reserved b14-0a-review-20261018.json slot is filled by the closure review receipt only; no reviewer text or review is fabricated into it (B14A-SLOT-1).

Carry-forwards (reviewer rows verbatim in the review receipt; directedTo is closure routing, as the owner ruling writes; B14A-CFMAP-1 maps its clauses to rows):

- CF-B14A-1 [discharged in PR by the post-review follow-up 8509a3e3 (not independently re-reviewed; Root-diffed; owner-ruled)]: Taken in-PR, as the review row allows ("B14-0A (in-PR if taken)"): the follow-up adds the row "B14 refuses fog-on reads with zero journal reads for every audience" (a spy on the real SQLiteEventJournal.readStream; host, opponent and spectator refused with the fixed reason and zero reads; fog-off control reads) and an inactive-seat case in the membership-precedes-policy row; the local receipt records R1 and R2 caught. Nothing is routed to B14-0 for it. See B14A-FU-1.
- CF-B14A-2 [open]: B14-0, as the owner ruling writes ("seam guard bypassable via concatenated jest.doMock path -> B14-0 tightens to exact match"): b14FogContainment.test.ts asserts the capability module is unmocked (identity with jest.requireActual, jest.isMockFunction false) in addition to the matchHistoryFog.test.ts allowlist tripwire, and the guard is tightened to an exact match so a concatenated or non-literal jest.doMock path (R9), jest.spyOn, a moduleNameMapper entry or a consumer-module mock cannot evade it. Recorded under successorNotes.B14-0; B14-0 is not edited. B14-0B adds its ten seams under the existing guard and must keep it passing.
- CF-B14A-3 [discharged in PR by the post-review follow-up 8509a3e3 (not independently re-reviewed; Root-diffed; owner-ruled)]: Taken in-PR: F3 by a FogAwareMatchProjection.ts change (the parent brand-then-scope check with the parent codes and messages now runs before the config read; an unbranded viewer gets not-a-viewer under fog-on as under fog-off), which the owner ruling records ("F3 service-level parity now fixed"); F4 by the row "B14 passes a non-match stream on a fog-on match id to the parent". The local receipt records R3 (adapted) and R8 caught. Nothing remains for B14-0 / FOG-* from this row; whoever next edits FogAwareMatchProjection.ts keeps both rows. See B14A-FU-1.
- CF-B14A-4 [discharged (local receipt corrected at 8509a3e3; reviewed head recorded explicitly by this closure)]: This review receipt records the reviewed head explicitly (reviewedHead d66ef43662b9012495124a6bcd373ff95db34d47) beside the merged head (head 8509a3e3188d7e860d060080861fb269259ccfc3) and does not inherit results.*.head from the local receipt; the follow-up corrected results.green.head and results.regression.head to d66ef4366 and kept the original value as recordedHead.
- CF-B14A-5 [open]: B14-0: matchLacksRevealProjection must be implemented as a Promise-returning function and awaited at every call site (the four seams pin async () => false, so a truthy un-awaited Promise would refuse loudly); B14-0 also decides and pins CF-S-2 (publishEvent meta-read failure: terminal 1011 versus silent withholding), which the owner ruling routes to B14-0. Recorded under successorNotes.B14-0; B14-0 is not edited.
- CF-B14A-6 [open]: FOG-H (reactivation), as the owner ruling writes ("dead fogMatchHistoryProjection, unused deps, stale comments -> FOG-H"): fogMatchHistoryProjection is exported but dead and unpinned after B14-0A; the retired fog-on HTTP rows (stale-spectator side assignment, authority-only field stripping, mid-stream refusal, unreadable envelope, mirror precondition) must be re-proven with fresh parity before any HTTP fog projection is served; remove or use the heads dependency and fix the stale class and chain comments. Recorded under successorNotes.FOG-H; FOG-H is not edited.
- CF-B14A-7 [open]: The FOG chain for the /timeline count/timing side channel under fog-on (owner ruling: "F9 timeline count/timing channel -> FOG"; the units are FOG-S, FOG-K, FOG-B, FOG-L, FOG-R, FOG-H, FOG-X, none named more narrowly) and B14-HEAD for the /head digest (owner ruling: "/head -> B14-HEAD"). Recorded under successorNotes.FOGChain and successorNotes.B14-HEADAndU38; no unit is edited.
- CF-B14A-8 [open]: B15-PRIV / FOG, as the owner ruling writes ("lobby summaries publish fogOfWar for open lobbies -> B15-PRIV/FOG"; the review row says "B15 / Root backlog"): lobby and invite summaries publish fogOfWar for joinable lobbies to any authenticated caller; reconcile with the "non-member learns nothing of fog" wording, which holds for active and completed matches only. Recorded under successorNotes.B15 and successorNotes.FOGChain; no unit is edited.
- CF-B14A-9 [open]: U26, as the owner ruling writes ("rewind -> U26"): the rewind-preview and rewind-commit routes refuse fogOfWar === true with their own reason and answer an undefined config through the generic 500; migrating them to the shared predicate is U26's call. The row's HP note stands: no FogAware dependency change for P2CG1HP, and CF-S-1 stays with B14-0 / HP. Recorded under successorNotes.U26; U26 is not edited.
- CF-S-2 [open]: rerouted from B14-0A to B14-0 by this ruling (meta-read failure withholds the actor's own declaration; decide retry, log or terminal 1011).

From the P2CG1S closure: CF-S-1, CF-S-3 (the seat-argument preservation held through B14-0A and binds B14-0B and B14-0), CF-S-4, CF-S-5, CF-S-6, CF-S-7 (B14-0A cleared the two FogAwareMatchProjection.ts highs; four remain with the Root maintenance backlog), CF-S-8 and CF-S-9 stay open with their owners. The exact-main built-server socket smoke stays owed before P2CG1H and before any build that ships spectating (B14A-SMOKE-1). CF-G2-9 did not recur (Seam Anchors passed on its first attempt) and stays open with its real owner (B14A-SEAM-1).

Still open, owners unchanged: from P2CG1R CF-H8/CF-G5, CF-G2-3, CF-R-1, CF-R-2, CF-R-3, CF-R-4, CF-R-5, CF-R-6; from P2CG1G2 CF-G2-1, CF-G2-2, CF-G2-4, CF-G2-5, CF-G2-6, CF-G2-7, CF-G2-8, CF-G2-9, CF-G2-10; from P2CG1G1 CF-H2, CF-H5, CF-H7, CF-H9, CF-H10, CF-H13, CF-H14, CF-H15, CF-H17; from P2CG1G2A CF-G2A-1, 2, 3, 4 and 6 (B15). B14-0A changed none of their owner files. CF-E5 and CF-E6 remain recorded in evidence/p2cg1d-review-20261017.json and CF-F9 in evidence/p2cg1e-review-20261018.json, as evidence/p2cg1g1-review-20261018.json successorNotes.P2CG1H.priorNotes and evidence/p2cg1r-review-20261018.json carryForwardLedger.priorNotes list them; this closure neither restates nor changes them. The P2CG1R closure discharged H-OPEN-1 / CF-E1, pinned CF-E7 and discharged CF-H8/CF-G5 for the host arm only (R-HP-1: P2CG1HP keeps its binder test, nine files, and widens the row to {host, member}); evidence/p2cg1r-review-20261018.json records them and this closure changes none of them. The P2CG1S closure (evidence/p2cg1s-review-20261018.json) carried these unchanged; this closure changes none of them either.

Root notes (not reviewer text; recorded under successorNotes.openNotes):

- B14A-MAIN-1 (Root): Main did not move between the PR base 87c0f150 (the #2266 merge, which the admission receipt names as the baseline; the units.json baseline field 3971389b is the P2CG1S closure merge #2265, its first-parent ancestor, and #2266 changed only openspec files) and the merge: the merge commit 2e61f050 has first parent 87c0f150 and second parent the merged head 8509a3e3; its tree 9a711bc1 equals the head tree and git merge-tree --write-tree of the two parents (clean), as the owner ruling recorded ("merge-tree with Main clean"). Its units.json equals the head's, which differs from the baseline only in the B14-0A entry; the packets are unchanged. The three product leaves equal the local receipt followUp20261018.productBytes, the six test leaves other than matchHistoryFog.test.ts are byte-identical from RED f402759d through the merge, matchHistoryFog.test.ts is byte-identical from RED to GREEN and changed only in the follow-up, and the sixteen admission unchanged controls equal their admission hashes at the head, the merge and the closure base (the closure base is the merge itself; main has not moved since).
- B14A-FU-1 (Root): The independent review is of the GREEN head d66ef4366 (APPROVE). The review-recommended in-PR additions landed afterwards in the follow-up commit 8509a3e3, the exact head that was ruled, CI-checked and merged. No independent review of 8509a3e3 exists and none is claimed or fabricated here: Root diffed d66ef436..8509a3e3 before ruling and the owner ruling carries that receipt ("Root diffed d66ef436..8509a3e3: one test leaf, one product leaf, local receipt"). This closure re-checks it from git: the follow-up changes exactly openspec/planning/2026-09-12-roadmap-completion/evidence/b14-0a-local-20261018.json, src/lib/multiplayer/server/projection/FogAwareMatchProjection.ts, src/pages-modules/api/__tests__/matchHistoryFog.test.ts (b14-0a-local-20261018.json +470/-7, FogAwareMatchProjection.ts +25/-8, matchHistoryFog.test.ts +113/-5); the helper, the metadata route and the other six test leaves are byte-identical to GREEN; FogAwareMatchProjection.ts and the three product leaves equal the local receipt followUp20261018.productBytes at the head, the merge and the closure base; the cumulative census is 112/500 counted lines and 15/15 files. The author recorded F1, F2, F4 as new rows in matchHistoryFog.test.ts, F3 as a product change (the parent brand-then-scope check before the config read), F6 as the receipt correction, and reviewer mutants R1, R2, R3 (adapted) and R8 as caught (16/16 with the author 12). The fresh main proof here runs those rows at the merge (b14 7 suites, 162/162).
- B14A-CHECKS-1 (Root): CF-H12: all 32 required PR check runs on the merged head 8509a3e3 (run 39138588069) concluded success on their first attempt (the filter=all listing holds exactly 32 check runs) and their names equal, one to one, the 32 names recorded for P2CG1G1, P2CG1G2A, P2CG1G2, P2CG1R and P2CG1S (the P2CG1S local receipt expectedNames); the author posted the by-name comparison, with each run id, as https://github.com/SwiggitySwerve/MekStation/pull/2267#issuecomment-6250925885 (posted 2026-10-18T14:13:05Z and edited 2026-10-18T15:17:45Z; its body says it replaces the earlier comparison for d66ef436, which was also 32/32 green; the edit precedes the ruling). pr-checks.yml (blob a82fe0f7) is identical at the P2CG1S head, merge and closure, the B14-0A baseline, reviewed head, merged head, merge and closure base. The PR checks do not run on the push of the merge commit to main; at 2026-10-18T15:23:36Z the merge commit carried 10 push-workflow check runs (Live Tier Signal completed/success; build completed/skipped; release completed/skipped; Push Docker image completed/skipped; Prepare Build Artifacts completed/skipped; Build Docker image completed/skipped; Determine release tag completed/success; version-and-release completed/success; Publish Live Evidence (windows-latest) completed/success; Publish Live Evidence (ubuntu-latest) completed/success), none failed. The exact-main proof here is the fresh local run at the merge.
- B14A-CFMAP-1 (Root): The owner ruling routes the review carry-forwards by subject, not by row id ("CF-B14A-1..9 per the review with owners (...)"). This closure maps each clause to its row: "F5/F7/F8 dead fogMatchHistoryProjection, unused deps, stale comments -> FOG-H" is CF-B14A-6 (F7, F8; the clause's subjects are the dead projection, the unused heads dependency and the stale comments); "seam guard bypassable via concatenated jest.doMock path -> B14-0 tightens to exact match" is CF-B14A-2 (F5); "F9 timeline count/timing channel -> FOG" and "/head -> B14-HEAD" are CF-B14A-7; "F3 service-level parity now fixed" is CF-B14A-3; "lobby summaries publish fogOfWar for open lobbies -> B15-PRIV/FOG" is CF-B14A-8; "rewind -> U26" is CF-B14A-9. CF-B14A-1 and CF-B14A-4 are discharged by the follow-up commit and this receipt, and CF-B14A-5 follows its row (B14-0) together with the ruled CF-S-2 -> B14-0. F5 appears in the FOG-H clause label, but its subject (the seam guard) is routed to B14-0 by its own clause; nothing about the seam guard is routed to FOG-H.
- B14A-R1-1 (Root): Ruling B14-0A-R1 (admission receipt, recorded before RED) put the new, behaviour-free fogMatchAdmission.ts helper in the RED commit because the four seam factories spread jest.requireActual of that module. The reviewer confirmed it is dead code at RED (judged item (a)) and this closure re-checks it from git: the helper is absent at the baseline, referenced by no non-test file at RED, and byte-identical from RED through the merge, while FogAwareMatchProjection.ts and the metadata route are byte-identical to the baseline at RED. The owner ruling accepts it and adds: "Recommendation for future splits: register behaviour-free helpers in the admission commit so RED stays test-only." That recommendation is recorded for later split units; it edits no unit.
- B14A-SMOKE-1 (Root): Still owed, unchanged by B14-0A: The exact-main built-server socket smoke (P2CG1S registration20261017HPrereqs proof 4: "exact-main built-server socket smoke before H or any spectator-bearing shipment.") remains owed, as the owner ruling writes ("The built-server socket smoke test required before H or any build shipping spectating remains owed") and as the admission and local receipts recorded it (a post-merge obligation). This closure's main proof is jest, typecheck and validator only; it does not discharge the smoke. It binds before P2CG1H and before any build that ships spectating. B14-0A changed HTTP refusal only (no WebSocket, spectator or server.js byte; server.js is an admission control) and this closure's main proof is jest, typecheck and validator only, so it neither discharges nor narrows the smoke.
- B14A-SEAM-1 (Root): CF-G2-9 (Seam Anchors :425 same-seed marker inequality) did not recur on the B14-0A head: the filter=all listing on 8509a3e3 shows one Seam Anchors run, success on its first attempt, with no rerun, as the author's by-name comment records ("the CF-G2-9 Seam Anchors flake did not occur"). B14-0A touched no e2e, engine, simulation or gameplay file (e2e/seam-fresh-construction-no-instant-defeat.spec.ts is byte-identical from the P2CG1S merge to this merge) and its admission recorded the item as passing through. It stays open with its real owner, whichever unit next owns that spec or the battle-resolution path (G2-SEAM-1, S-SEAM-1); one more clean run does not discharge it.
- B14A-GATE-1 (Root): The main-proof runner gated every run with node scripts/qc/machine-idle.mjs --own-pid 47516 --own-pid 55164, the gate Root ruled for the P2CG1G2 closure (G2-GATE-1: PID 47516 the idle server.js, PID 55164 T3 Code's idle html_preview renderer), used by the P2CG1R and P2CG1S closures (R-GATE-1, S-GATE-1) and restated by the closure brief; --own-pid was the only exclusion flag, and the runner waited on any other busy reading. Every reading printed MACHINE_IDLE on the first check, one per run. The runs were sequential (one heavy run at a time); this closure neither started nor stopped any process other than its own runner and its jest/tsc/validator children, and no timeout was raised.
- B14A-SLOT-1 (Root): The reserved review slot evidence/b14-0a-review-20261018.json (frozen in the admission manifest as the one reservedUnchanged entry, already listed in B14-0A.ownershipExceptions, and recorded "(unwritten)" by the local census) was unwritten at the head, the merge and the closure base. This closure writes it, under its frozen name, as the closure review receipt: Root/closure text that binds the genuine review by sha256 and quotes reviewer strings only verbatim (each checked as a substring of the stored copy). No reviewer text is authored into it and no review of the follow-up head is fabricated (B14A-FU-1). The reviewer's own report was written to docs/audits/2026-10-18-b14-0a-review.md in its detached review worktree (untracked there); this closure preserves it byte for byte at evidence/b14-0a-source-fable-review-20261018.txt (sha256 8c11dbbc3ab014222fbcef89f947f3824ffad6c0d718a9c5e79a401208127fee, 20720 bytes), as the P2CG1G1, P2CG1G2A, P2CG1G2, P2CG1R and P2CG1S closures did.

All 32 checks on the merged head succeeded on their first attempt (run 39138588069); the 32 names equal those recorded for P2CG1G1, P2CG1G2A, P2CG1G2, P2CG1R and P2CG1S and match pr-checks.yml one to one:
Detect Changes; Install Dependencies; Lint; Format Check; Validate Roadmap Ledger; Type Check; Unit Tests (1/6); Unit Tests (2/6); Unit Tests (3/6); Unit Tests (4/6); Unit Tests (5/6); Unit Tests (6/6); Perf Smoke Tests; Statistical Proof PR; Perf Budget PR; Coverage Floor; A11y Tests; Validate BV Parity; Validate Combat Suite; Build Storybook; Schema Bridge; Determinism Audit; E2E Smoke; Seam Anchors; Customizer Regressions; Desktop Type Check; Desktop Tests; Lint and Test; Prepare Build Artifacts; Build Test / linux; Build Test / mac; Build Test / win.
GitHub enforces only Lint and Test; each name was verified individually.
The [merge receipt](evidence/b14-0a-merge-20261018.json) binds both ordered parents, the matching integration tree, the census (112/500 counted lines, 14 changed files plus the reserved slot), the follow-up diff and the admission controls at the merge.
The [main proof](evidence/b14-0a-mainproof-20261018.json) is a fresh run at the merge before any closure edit, after a real npm ci under Node v22.22.0, each jest run --runInBand with a private cache after machine-idle --own-pid 47516 --own-pid 55164 printed MACHINE_IDLE (B14A-GATE-1):
the owned suites, the regression census and the P2CG1S closure proof set together (155 suites, 1606/1606), the seven owned suites (7 suites, 162/162), the 109-suite regression census (109 suites, 868/868), the two S suites (2 suites, 41/41), the six focused S suites (6 suites, 72/72), the R suites (3 suites, 127/127), the G2 suites (5 suites, 129/129), the G2A suites (2 suites, 57/57), the G2A related set (74 suites, 934/934), the P2CG1G1 leaves (4 suites, 81/81), the Task 14 selector (4 suites, 104/104), P2CG1F (3 suites, 96/96), P2CG1E (3 suites, 166/166), P2CG1D (4 suites, 129/129), P2CG1C (2 suites, 54/54), P2CG1B (2 suites, 52/52), the 35 A1/A2 suites (35 suites, 398/398), typecheck and the validator passed.
Sets without a B14-0A test leaf match their P2CG1S-merge counts exactly; the six focused S suites, the G2A suites and the related set moved only by the B14-0A rows in those leaves.
It references the author's 29 proof logs by hash.

B14-0A has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed.

Successor release (separate from the closure): B14-0B moves from blocked to planned;
its only predecessor B14-0A is main-verified with a genuine exact-main mainProof PASS in this same change set.
No other B14-0B field changes. B14-0, B14-HEAD, P2CG1HP, P2CG1H, the LSC units, P2CG1I1-P2CG1I4, P2CG2, P2CH, P2C, U26, U38, the FOG units, the B15 units and every other unit state are unchanged.
Selection is not downstream admission.
This closure metadata still requires its own CI and parent merge.

---

## 2026-10-18 LSC second split registered; all seven units remain blocked

Root adopts the LSC-PREP2 recommendations under the owner standing instruction
"continue with recommended options and fix the issues that come up, publish as needed"
and the owner's 2026-10-18 approval of recommended actions. This is a docs-only
registration amendment on Main 3971389b3ead0cf6a7d78bdefb58604477e67ec6, not source
admission, an implementation OWNER-RULING or runtime acceptance. The byte-for-byte
report is [evidence/lsc-prep2-20261018.txt](evidence/lsc-prep2-20261018.txt), 23268 bytes,
SHA-256 0f74fab0e01a78d84f28e6f34fc9a9b5d0554ad2e2e05975c3b70c13dd651043.

The measured 773-line LSC-1 splits into blocked sensitive LSC-1S (repository and
operator service, about 466 counted lines plus lifecycle) and reduced LSC-1
(password-checked mint, throttling/lockout, API and schemas, about 307). Move
listSeats/public type to LSC-1 if needed for margin. The measured 558-line LSC-2
splits into blocked sensitive LSC-2OP (operator setup/re-provision/revoke UI,
about 258) and reduced LSC-2 (chooser, join, renewal/expired-token recovery,
about 300). LSC-2OP must add at least seven operator-UI mutants beyond C11/C12/C14
at admission. Estimates still require fresh measurement; every unit retains
15 files / 500 counted lines, sensitive review, CI, OWNER-RULING, exact-main proof
and closure. No lifecycle or receipt has advanced.

Literal manifests in units.json and roadmap.json agree: LSC-1DB 10 files (adds both
migration-head test leaves; reassign version 33 at admission if another lane takes
it), LSC-1S 9, LSC-1 10, LSC-2OP 11 and LSC-2 12. LSC-1 drops token.ts and
localSeatToken.test.ts; LSC-2 drops coopCampaignAuthTokenStore.ts and adds
CampaignNavigation.tsx, which covers dashboard/missions/launch/starmap/log/personnel.
Primary vault mint stays unchanged; seat mint uses local-seats and the existing
per-match token store. The report's draft 28 -> 30 count is historical: current L1
and its closure checklist advance 31 -> 33. Symmetric order:
P2CG1HP -> LSC-0 -> LSC-1DB -> LSC-1S -> LSC-1 -> LSC-2OP -> LSC-2 -> LSC-2P -> P2CG1H.
H receives only the added LSC-1S/LSC-2OP admission requirement. The human-session
LSC-2/LSC-2P gate is unchanged; the new units' closure follows from this order.

Seat policy is recorded as owner-visible Root-adopted recommendations, which the
owner may override: one-hour seat bearer cap (vault maximum six hours), five failed
password attempts lock a seat for 60 seconds, reset issues a new player identity
requiring GM re-admission, and local-seats enforces loopback Host/same-host Origin.
Revocation refuses future mint/renewal; issued bearers keep their lifetime. The
renewal banner covers both guests and the GM. This remains operator-managed
same-host trust, not private multi-user hosting; PRIV-1 and B15 remain required.

Carry-forwards in localSeatCredentialsSplit2Registration20261018: F1 (spoofable
X-Forwarded-For rate-limit key) -> U101/B15; F2 (existing auth Host/Origin gap) ->
B15/U101; F3 (one-hour co-op expiry without recovery, including GM) -> LSC-2's
renewal banner, an open v2.2.0 human-session risk until LSC-2 lands and closes.
CF-S-8 stays with I1-I4: LSC adds no reseat-to-spectator path; preserve S's live row
and R1/R4 mutation anchors. Census notes cover U101a/U101d securitySchemas.ts and
U101c/B15-2/B15-PRIV/R2.campaign-access on the entry panel, plus navigation and all
ancestor/e2e/docs aliases. These notes do not edit those owner units. B14-0A and
all other unrelated unit objects remain unchanged.

Validation: validate-roadmap plain and --git pass; live --next selects B14-0A;
validator tests pass 86/86; strict OpenSpec validates 230/230; npm run format:check
passes. Selector fixtures exercise the nine positions above by simulating one
parent release at a time; documentary predecessors remain parent-enforced and
these fixtures do not supply closure evidence. Manifest parity/counts, blocked
states/caps and symmetric links are checked separately. The original prep results
remain historical evidence, not new product or packaged-session proof.

## 2026-10-18 P2CG1S source verified on main; B14-0A released; closure metadata proposed

P2CG1S advances from implementing to main-verified for source PR #2264,
head ca62de7beaa7274bb3782e5a4681d1ed411dc016, merge 1b8558625e1e488e6ba62b916ec68bd2ed0d701f.
Its baseline is the admission base 70eab85ae2e16adfc05e4c2fcced4be5cae4f21e (the P2CG1R closure merge #2262). Main did not move before the merge: the merge has first parent 70eab85a, a clean merge-tree equal to the head tree (aee190ce), the three product leaves equal the local receipt hashes and the two test leaves are byte-identical from RED 1efcb036 through this closure base 1b855862 (S-MAIN-1).
The owner authorized this ruling under the standing instruction and the direct approval of 2026-10-18, and it was posted as [comment 6250027395](https://github.com/SwiggitySwerve/MekStation/pull/2264#issuecomment-6250027395);
its exact UTF-8 body (2433 bytes; gh api --jq .body prints it plus one LF), without an added newline, hashes to ca0fe3d32147eee17f5aa5980b047459c6c21a93392ecee428bd70f03c664c82.
The ruling (12:40:18Z) preceded the merge (12:40:24Z), and PR #2264 carries the owner-ruled label.
PK-p2cg1s-ruling records that ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2cg1s-review-20261018.json) binds one independent full sensitive review (Claude Fable 5.1 per the owner ruling, substituting for GPT Astra; author Opus 5.5) on the exact merged head ca62de7b: APPROVE, sha256 f8301ca79635955f5146f56df81f1c7fd7d9c0722018a24c15e62bfb78ae6a80 (21120 bytes), preserved byte for byte at evidence/p2cg1s-source-fable-review-20261018.txt.
The reviewer checked the ledger commit by commit (admission 1b8976e5 with no source, RED 1efcb036 with the three product leaves byte-identical to the base, GREEN ca62de7b with no test byte changed; 9 changed files plus the reserved slot, 10/15, and 27/500 counted lines), reproduced RED (23 failed of 41) and GREEN (41/41; six focused suites 71/71), ran typecheck, oxlint and oxfmt, and caught 8 of 8 independent mutants (R7 shows that withheld frames must consume no delivery number for the reveal republish to work).
It found no defect in S; findings F1-F9 are Info or Low and pre-existing outside the five S leaves except F1, the accepted gm-branded spectator change (S-GM-1). The classes: authority PASS, privacy PASS with notes (CF-S-1, CF-S-9, both pre-existing), replay PASS; idempotency and concurrency, also reviewed, PASS.
The reserved p2cg1s-admission-review-20261018.md slot stays unwritten (S-SLOT-1).

Carry-forwards (reviewer rows verbatim in the review receipt; directedTo is closure routing, as the owner ruling writes):

- CF-S-1 [open]: B14-0 / P2CG1HP, as the review tabulates and the owner ruling writes ("B14-0/HP"): fog-off HTTP history/export has no sealed-choice hold (ViewerProjectionService.isVisibleToViewer returns true for sealed-to-actor-until-revealed; latent only because the root-branch read returns nothing for mirrored matches). Either route fog-off matches through the fog projection's sealed branch or teach the parent service the sealed decision before fog-off moves onto the effective head. Recorded under successorNotes.B14-0 and successorNotes.P2CG1HP; neither unit is edited.
- CF-S-2 [open]: B14-0A (released to planned in this change set; no other B14-0A field is edited): a getMatchMeta failure in publishEvent leaves the audience context undefined, so every sealed declaration is omitted for everyone, including the actor (fail-closed, recoverable by replay; not a leak). Decide whether the actor's own declaration should be retried or logged rather than silently withheld until replay. Recorded under successorNotes.B14-0A.
- CF-S-3 [open]: B14-0: sealed types bypass the fog classifier, so a revealed declaration of a fog-invisible unit reaches fog-on spectators and opponents in full; fold into B14's fog-scope decision together with the GameCreated roster leak. The reviewer's row adds that B14-0A and B14-0 must preserve both seat arguments and the seat-before-gm order when they touch ServerMatchHostEvents.ts / ServerMatchHostReplay.ts (also the admission receipt overlap note). Recorded under successorNotes.B14-0 and, for the preservation constraint, successorNotes.B14-0A.
- CF-S-4 [open]: B14-HEAD / U38: a frame admitted and assigned and then refused by admitForSend backpressure is not re-offered by the reveal republish (its delivery number exists), only by rejoin resume; confirm the rejoin-resume path is the intended and only recovery and add a row for it. Recorded under successorNotes.B14-HEADAndU38; neither unit is edited.
- CF-S-5 [open]: P2CG1H: refresh the stale ROLE HONESTY header in e2e/gm-two-player-privacy.pack.spec.ts (it says the membership source never mints gm; stale since deriveMembershipRole and the campaign-session gm row) when H next edits the GM packs; consider one tactical-wire row for a gm-branded spectator now that the brand exists. Recorded under successorNotes.P2CG1H; P2CG1H is not edited.
- CF-S-6 [open]: P2CG2 / P2CH: a real attack-phase and physical-phase intent drive for the spectator sealed case when a unit next owns a combat-setup test leaf (S drove movement by real intents and used real attack/physical payload shapes through the real broadcastEvent seam and real replay). Recorded under successorNotes.P2CG2AndP2CH; neither unit is edited.
- CF-S-7 [open]: Root maintenance backlog (no unit; the review names Root, outside the listed owners): npm run verify:qc:roadmap fails at the head in maintain:scan:gate (type-safety high: 6 > 0) on six files S does not touch (CompendiumAdapter, requestLaunchAuthority, CampaignReplicaSyncClient, FogAwareMatchProjection x2, the replica-sync route); not a required CI check. The reviewer adds that whoever next edits FogAwareMatchProjection.ts (an S read-only control; B14-0 / HP) should clear its two. Recorded under successorNotes.rootMaintenanceBacklog.
- CF-S-8 [open]: The local seat credential units (LSC-0, LSC-1DB, LSC-1, LSC-2, LSC-2P) / P2CG1I1-P2CG1I4, as the owner ruling writes ("LSC*/I1-I4"): reseat-to-spectator mid-match has no product path today (the spectate route only appends; addSpectatorSeat rejects a playing conflict). If local seat credentials or a later unit add one, the live row "reseated to spectator loses ownership between deliveries" and reviewer mutants R1/R4 are the regression anchors; the viewer cache invalidates by membership epoch. Recorded under successorNotes.LSCAndI1toI4; no unit is edited.
- CF-S-9 [open (standing)]: U26 (standing): the raw no-playerId sendReplay and the P2P reconnect callback remain unguarded, unchanged by S; the production binder always passes the verified identity. Recorded under successorNotes.U26; U26 is not edited.

The exact-main built-server socket smoke stays owed before P2CG1H and before any build that ships spectating (S-SMOKE-1). CF-G2-9 did not recur (Seam Anchors passed on its first attempt) and stays open with its real owner, the next owner of the seam spec or the battle-resolution path (S-SEAM-1). The local receipt key "CF-S-1 (new observation)" (M10, seats cached at first live publish, is caught by both reseat rows and incidentally by the gm-branded real-intent row) is an author mutation observation, not the reviewer's CF-S-1; it has no owner and nothing is routed for it. The CF-S-1 to CF-S-9 ids in this closure are the review's.

Still open from the P2CG1R closure, owners unchanged: CF-H8/CF-G5, CF-G2-3, CF-R-1, CF-R-2, CF-R-3, CF-R-4, CF-R-5, CF-R-6. Still open from the P2CG1G2 closure, owners unchanged: CF-G2-1 (H (next owner of campaignSyncTransportSeat.ts)); CF-G2-2 (H); CF-G2-4 (H); CF-G2-5 (H); CF-G2-6 (H (consumer owner)); CF-G2-7 (H); CF-G2-8 (I1-I4 / P2CG2); CF-G2-9 (tabulated S (engine/e2e); bound to the next owner of the seam spec or battle-resolution path, S-SEAM-1); CF-G2-10 (B15). Still open from P2CG1G1, owners unchanged: CF-H2, CF-H5, CF-H7, CF-H9, CF-H10, CF-H13, CF-H14, CF-H15, CF-H17. From P2CG1G2A, CF-G2A-1, 2, 3, 4 and 6 stay with B15. P2CG1S changed none of their owner files. CF-E5 and CF-E6 remain recorded in evidence/p2cg1d-review-20261017.json and CF-F9 in evidence/p2cg1e-review-20261018.json, as evidence/p2cg1g1-review-20261018.json successorNotes.P2CG1H.priorNotes and evidence/p2cg1r-review-20261018.json carryForwardLedger.priorNotes list them; this closure neither restates nor changes them. The P2CG1R closure discharged H-OPEN-1 / CF-E1, pinned CF-E7 and discharged CF-H8/CF-G5 for the host arm only (R-HP-1: P2CG1HP keeps its binder test, nine files, and widens the row to {host, member}); evidence/p2cg1r-review-20261018.json records them and this closure changes none of them.

Root notes (not reviewer text; recorded under successorNotes.openNotes):

- S-MAIN-1 (Root): Main did not move between the admission baseline 70eab85a (the P2CG1R closure merge #2262) and the merge: the merge commit 1b855862 has first parent 70eab85a and second parent the reviewed head ca62de7b; its tree aee190ce equals the head tree and git merge-tree --write-tree of the two parents (clean), as the owner ruling recorded ("Merge-tree with Main 70eab85a clean"). Its units.json equals the head's, which differs from the baseline only in the P2CG1S entry. The three product leaves equal the local receipt hashes, the two test leaves are byte-identical from RED 1efcb036 through the head, the merge and the closure base 1b855862, and the eleven admission unchanged controls equal their admission hashes at the head, the merge and the closure base (the closure base is the merge itself; main has not moved since).
- S-CHECKS-1 (Root): CF-H12: all 32 required PR check runs on the merged head ca62de7b (run 39125901935) concluded success on their first attempt (the filter=all listing holds exactly 32 check runs) and their names equal, one to one, the 32 names recorded for P2CG1G1, P2CG1G2A, P2CG1G2 and P2CG1R and the P2CG1S local receipt expectedNames; the author posted the by-name comparison as https://github.com/SwiggitySwerve/MekStation/pull/2264#issuecomment-6249808382 (posted 2026-10-18T12:16:43Z and edited 2026-10-18T12:17:06Z; its closing note says it replaces an earlier version whose check-run query failed on a shell quoting error). pr-checks.yml (blob a82fe0f7) is identical at the P2CG1R head and merge and the P2CG1S baseline, head, merge and closure base. The PR checks do not run on the push of the merge commit to main; at 2026-10-18T12:45:21Z the merge commit carried 10 push-workflow check runs (Live Tier Signal completed/success; Push Docker image completed/skipped; build completed/skipped; Prepare Build Artifacts completed/skipped; release completed/skipped; Build Docker image completed/skipped; Determine release tag completed/success; version-and-release completed/success; Publish Live Evidence (windows-latest) completed/success; Publish Live Evidence (ubuntu-latest) completed/success), none failed. The exact-main proof here is the fresh local run at the merge.
- S-SMOKE-1 (Root): The exact-main built-server socket smoke (P2CG1S registration20261017HPrereqs proof 4: "exact-main built-server socket smoke before H or any spectator-bearing shipment.") remains owed, as the owner ruling writes ("The built-server socket smoke test required before H or any build shipping spectating remains owed") and as the admission and local receipts recorded it (a post-merge obligation). This closure's main proof is jest, typecheck and validator only; it does not discharge the smoke. It binds before P2CG1H and before any build that ships spectating.
- S-SEAM-1 (Root): CF-G2-9 (Seam Anchors :425 same-seed marker inequality) did not recur on the P2CG1S head: the filter=all listing shows one Seam Anchors run, success on its first attempt, with no rerun, as the author's by-name comment records ("the CF-G2-9 Seam Anchors flake did not occur"). The P2CG1G2 closure routed it under S as tabulated ("S (engine/e2e)"), but P2CG1S touched no e2e, engine, simulation or gameplay file (e2e/seam-fresh-construction-no-instant-defeat.spec.ts is byte-identical from the baseline to the merge) and its admission recorded it as routed, not owned. It stays open and binds its real owner: whichever unit next owns that spec or the battle-resolution path (G2-SEAM-1). It is not discharged by one clean run.
- S-GM-1 (Root): Behaviour change accepted by the owner ruling (S-PREP-P1; review finding F1, Info, accepted): a gm-branded viewer occupying a current spectator seat (including the co-op campaign host seated as spectator) now receives sealed declarations on live and replay only once authoritatively revealed, matching HTTP fog-on, fog D6 and the registered contract; a seated, non-spectating gm keeps pre-reveal visibility. The L1 two-players-plus-GM mission is unaffected: coopMissionCreate mission metadata carries no seats and no coopCampaign (verified in code by the reviewer).
- S-GATE-1 (Root): The main-proof runner gated every run with node scripts/qc/machine-idle.mjs --own-pid 47516 --own-pid 55164, the gate Root ruled for the P2CG1G2 closure (G2-GATE-1: PID 47516 the idle server.js, PID 55164 T3 Code's idle html_preview renderer), used again by the P2CG1R closure (R-GATE-1) and restated by the closure brief; --own-pid was the only exclusion flag, and the runner waited on any other busy reading. Every reading printed MACHINE_IDLE on the first check, one per run. The runs were sequential (one heavy run at a time); this closure neither started nor stopped any process other than its own runner and its jest/tsc/validator children.
- S-SLOT-1 (Root): The reserved admission-review slot evidence/p2cg1s-admission-review-20261018.md (frozen in the admission manifest as the one reservedUnchanged entry; local census "unwritten") stays unwritten. The independent review was written by the reviewer to docs/audits/2026-10-18-p2cg1s-review.md in its detached review worktree (untracked there); this closure preserves it byte for byte at evidence/p2cg1s-source-fable-review-20261018.txt (sha256 f8301ca79635955f5146f56df81f1c7fd7d9c0722018a24c15e62bfb78ae6a80, 21120 bytes), as the P2CG1G1, P2CG1G2A, P2CG1G2 and P2CG1R closures did, rather than authoring reviewer text into the slot or renaming the copy into it.
- S-CFID-1 (Root): The local receipt key "CF-S-1 (new observation)" (M10, seats cached at first live publish, is caught by both reseat rows and incidentally by the gm-branded real-intent row) is an author mutation observation, not the reviewer's CF-S-1; it has no owner and nothing is routed for it. The CF-S-1 to CF-S-9 ids in this closure are the review's.

All 32 checks on the merged head succeeded on their first attempt (run 39125901935); the 32 names equal P2CG1G1's, P2CG1G2A's, P2CG1G2's and P2CG1R's and match pr-checks.yml one to one:
Detect Changes; Install Dependencies; Lint; Format Check; Validate Roadmap Ledger; Type Check; Unit Tests (1/6); Unit Tests (2/6); Unit Tests (3/6); Unit Tests (4/6); Unit Tests (5/6); Unit Tests (6/6); Perf Smoke Tests; Statistical Proof PR; Perf Budget PR; Coverage Floor; A11y Tests; Validate BV Parity; Validate Combat Suite; Build Storybook; Schema Bridge; Determinism Audit; E2E Smoke; Seam Anchors; Customizer Regressions; Desktop Type Check; Desktop Tests; Lint and Test; Prepare Build Artifacts; Build Test / linux; Build Test / mac; Build Test / win.
GitHub enforces only Lint and Test; each name was verified individually.
The [merge receipt](evidence/p2cg1s-merge-20261018.json) binds both ordered parents, the matching integration tree, the census and the admission controls at the merge.
The [main proof](evidence/p2cg1s-mainproof-20261018.json) is a fresh run at the merge before any closure edit, after a real npm ci under Node v22.22.0, each jest run --runInBand with a private cache after machine-idle --own-pid 47516 --own-pid 55164 printed MACHINE_IDLE (S-GATE-1):
the six focused suites with the P2CG1R closure proof set together (60 suites, 934/934), the two S suites alone (2 suites, 41/41), the six focused suites (6 suites, 71/71), the R suites (3 suites, 127/127), the G2 suites (5 suites, 129/129), the G2A suites (2 suites, 48/48), the G2A related set (74 suites, 925/925), the P2CG1G1 leaves (4 suites, 81/81), the Task 14 selector (4 suites, 104/104), P2CG1F (3 suites, 96/96), P2CG1E (3 suites, 166/166), P2CG1D (4 suites, 129/129), P2CG1C (2 suites, 54/54), P2CG1B (2 suites, 52/52), the 35 A1/A2 suites (35 suites, 398/398), typecheck and the validator passed.
It references the author's 27 proof logs by hash.

P2CG1S has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed.

Successor release (separate from the closure): B14-0A moves from blocked to planned;
its only predecessor P2CG1S is main-verified with a genuine exact-main mainProof PASS in this same change set.
No other B14-0A field changes. B14-0B, B14-0, B14-HEAD, P2CG1HP, P2CG1H, the LSC units, P2CG1I1-P2CG1I4, P2CG2, P2CH, P2C, U26, U38, the B15 units and every other unit state are unchanged.
Selection is not downstream admission.
This closure metadata still requires its own CI and parent merge.

---

## 2026-10-18 P2CG1R source verified on main; P2CG1S released; closure metadata proposed

P2CG1R advances from implementing to main-verified for source PR #2260,
head e3f2535e3968d3ea8e465aa2c4f2ff64bc2fcd6a, merge fb5d7c343a5419eeead75bbd91b78a26c52a5da5.
Its baseline is the admission base c4d0eae46e8ae49851b15e3037e2fe139e99745b (the P2CG1G2 closure merge #2258). Main did not move before the merge: the merge has first parent c4d0eae4, a clean merge-tree equal to the head tree (da7b33bf), the four product leaves equal the local receipt hashes and the three test leaves are byte-identical from RED c68ae161 through this closure base 907d06dd (R-MAIN-1).
The owner authorized this ruling under the standing instruction and the direct approval of 2026-10-18, and it was posted as [comment 6248977966](https://github.com/SwiggitySwerve/MekStation/pull/2260#issuecomment-6248977966);
its exact UTF-8 body (2585 bytes; gh api --jq .body prints it plus one LF), without an added newline, hashes to 1420353fc1429f31e0205163d98ea4a13fd02479314664ab437f152b92f43677.
The ruling (10:54:09Z) preceded the merge (10:54:16Z), and PR #2260 carries the owner-ruled label.
PK-p2cg1r-ruling records that ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2cg1r-review-20261018.json) binds one independent full sensitive review (Claude Fable 5.1 per the owner ruling, substituting for GPT Astra; author Opus 5.5) on the exact merged head e3f2535e: APPROVE-WITH-NOTES, sha256 4064bc298555db9fb61ccff47fe65ba50dd3962e1ff6fc784b23b7335050110f (21156 bytes), preserved byte for byte at evidence/p2cg1r-source-fable-review-20261018.txt.
The reviewer checked the ledger commit by commit (admission 1d7fdb54, RED c68ae161 with the four product leaves byte-identical to the base, GREEN e3f2535e with no test byte changed; 12/15 files with the reserved slot, 65/500 counted lines), reproduced RED (13 failed of 127) and GREEN (127/127), ran typecheck, oxlint and oxfmt, and caught 8 of 11 independent mutants (RV3 and RV4 survive in the race-only RM9 class; RV10 is caught by a P2CE2 row elsewhere); it showed the author's RM9 survivor is not equivalent and gave a one-row probe that closes the class (CF-R-2).
It found no product defect; findings N1-N6 are Low or informational. The five classes: authority PASS, privacy PASS, replay PASS, idempotency PASS, concurrency PASS with notes (outer-COMMIT residual bounded).
The reserved p2cg1r-admission-review-20261018.md slot stays unwritten (R-SLOT-1).

Carry-forwards (reviewer bullets verbatim in the review receipt; directedTo is closure routing, as the owner ruling writes):

- CF-E1/H-OPEN-1 [discharged by P2CG1R]: Nothing further. Residual bounded to the outer-COMMIT failure, carried as CF-R-4.
- CF-E7 [pinned by P2CG1R (closed)]: Nothing further: P2CG1R was the next owner of bindCampaignSyncConnection.test.ts and pinned the empty M trail on the participants-behind preparation refusal, the veto during preparation and the invalid proposal reservation (baseline-green pins). P2CG1HP.admissionRequires ("CF-E7 follows binder-test ownership; record R proof or discharge at this owner") records this proof at its admission.
- CF-H8/CF-G5 [discharged for the GM/host arm only; member arm open with P2CG1HP]: Owner ruling (adopting the reviewer's recommendation): P2CG1R discharges CF-H8/CF-G5 for the GM/host join arm only. P2CG1HP keeps src/lib/multiplayer/server/__tests__/bindCampaignSyncConnection.test.ts in its manifest (it stays nine files) and widens the R row "P2CG1R CF-H8/CF-G5: an installed bound membership join only ever offers (confirmed|held|failed send callback); joinMember is never invoked" to it.each over {host, member}; the newcomer arm is cross-checked by the existing P2CE2 row in coopMissionAnnouncement.reconnect.test.ts (reviewer RV10). The conditional 9 -> 8 reduction in P2CG1HP.admissionRequires is NOT taken. P2CG1HP is not edited here; its admission records this receipt, head e3f2535e and the three host-arm assertions.
- CF-G2-3 [open]: P2CG1H. P2CG1R did not absorb it (the client leaves CampaignCoopEntryPanel.tsx and campaignSyncTransportSeat.ts are admission controls, byte-identical at the merge); the owner ruling routes it to H. Recorded under successorNotes.P2CG1H; no P2CG1H field is edited.
- CF-R-1 [open]: P2CG1H, as the next owner of src/lib/multiplayer/server/CampaignGmArbiter.ts: on an append throw the arbiter consume() at CampaignGmArbiter.ts:559 drops the pending approval before resultOfDoor rethrows; the reviewer suggests using R's hook as the evidence for a known-rolled-back classification and keeping commit-uncertain only for the outer-COMMIT failure. Recorded under successorNotes.P2CG1H.
- CF-R-2 [open]: The next owner of src/lib/campaign/sync/__tests__/JournalCampaignEventStore.test.ts (the reviewer names HP if it touches the adapter suite, else H; P2CG1S does not own it): add the one-row probe in the review (stub the store-level getCommandReceipt to miss once; expect committed, no guard, hook or notification, one saved-record rewrite), which kills RM9, RV3 and RV4. Recorded under successorNotes.nextOwnerJournalCampaignEventStoreTest.
- CF-R-3 [open (standing practice)]: All P2CG1 test owners (P2CG1S, P2CG1HP, P2CG1H, P2CG1I1-P2CG1I4, P2CG2): assert SQLite rejections by message (toMatchObject), not rejects.toThrow(Class), when suites can share a worker. Recorded under successorNotes.allTestOwners.
- CF-R-4 [open]: P2CG1H, or a separate writer registration before H if H requires the guarantee: the outer-COMMIT failure after the extension returned committed is not observable by the adapter; only the reservation microtask releases M and the H-OPEN-1 nesting window reopens on that path. Closing it is a SQLiteEventJournalWriter.appendWithExtension change (a commit-failure callback around .immediate()), outside every current manifest. Recorded under successorNotes.P2CG1H.
- CF-R-5 [open]: The next owner of src/lib/campaign/sync/JournalCampaignEventStore.ts: move signalNotCommitted above the JSDoc block it orphaned (JournalCampaignEventStore.ts:306-331) and add a logger.warn (src/utils/logger.ts) when the hook throws. Recorded under successorNotes.nextOwnerJournalCampaignEventStore.
- CF-R-6 [recorded (info)]: Recorded, as the owner ruling writes; the reviewer names the next adapter owner. Hook-only controls inside an outer transaction get no signal when the outer owner rolls back; unreachable from the binder. No change requested. Recorded under successorNotes.nextOwnerJournalCampaignEventStore.

Still open from the P2CG1G2 closure, owners unchanged: CF-G2-1 (H (next owner of campaignSyncTransportSeat.ts)); CF-G2-2 (H); CF-G2-4 (H); CF-G2-5 (H); CF-G2-6 (H (consumer owner)); CF-G2-7 (H); CF-G2-8 (I1-I4 / P2CG2); CF-G2-9 (S (engine/e2e)); CF-G2-10 (B15). Still open from P2CG1G1, owners unchanged (P2CG1R changed none of their owner files): CF-H2, CF-H5, CF-H7, CF-H9, CF-H10, CF-H13, CF-H14, CF-H15, CF-H17. From P2CG1G2A, CF-G2A-1, 2, 3, 4 and 6 stay with B15. CF-E5 and CF-E6 remain recorded in evidence/p2cg1d-review-20261017.json and CF-F9 in evidence/p2cg1e-review-20261018.json, as evidence/p2cg1g1-review-20261018.json successorNotes.P2CG1H.priorNotes lists them; this closure neither restates nor changes them. From that list H-OPEN-1 / CF-E1 is discharged here and CF-E7 is pinned here; CF-G5 (CF-H8) is discharged for the host arm only, its member arm staying with P2CG1HP.

Root notes (not reviewer text; recorded under successorNotes.openNotes):

- R-MAIN-1 (Root): Main did not move between the admission baseline c4d0eae4 (the P2CG1G2 closure merge #2258) and the merge: the merge commit fb5d7c34 has first parent c4d0eae4 and second parent the reviewed head e3f2535e; its tree da7b33bf equals the head tree and git merge-tree --write-tree of the two parents (clean), as the owner ruling recorded ("Merge-tree with Main c4d0eae4 clean"). Its units.json equals the head's, which differs from the baseline only in the P2CG1R entry. The four product leaves equal the local receipt hashes, the three test leaves are byte-identical from RED c68ae161 through the head, the merge and the closure base 907d06dd, and the eight admission controls equal their admission hashes at the merge and the closure base (main moved after the merge by b4a37165 #2261, 907d06dd #2263, changing e2e/multiplayer-live-vault-auth.spec.ts, openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md, openspec/planning/2026-09-12-roadmap-completion/evidence/b14-prep2-20261018.txt, openspec/planning/2026-09-12-roadmap-completion/roadmap.json, openspec/planning/2026-09-12-roadmap-completion/units.json; none is an R leaf; the P2CG1R and P2CG1G2 entries are unchanged and the P2CG1S entry changed only in its successors (["B14-0","P2C"] -> ["B14-0A","P2C"], a registration edit by #2263 (907d06dd) that keeps it blocked)).
- R-CHECKS-1 (Root): CF-H12: all 32 required PR check runs on the merged head e3f2535e (run 39118925042) concluded success on their first attempt (the filter=all listing holds exactly 32 check runs) and their names equal, one to one, the 32 names recorded for P2CG1G1, P2CG1G2A and P2CG1G2 and the P2CG1R local receipt expectedNames; the author posted the by-name comparison as https://github.com/SwiggitySwerve/MekStation/pull/2260#issuecomment-6248788889. pr-checks.yml (blob a82fe0f7) is identical at the P2CG1G2 head and merge, the P2CG1R baseline, head, merge and closure base. The PR checks do not run on the push of the merge commit to main; at 2026-10-18T10:57:28Z the merge commit carried 10 push-workflow check runs (Live Tier Signal completed/success; release completed/skipped; Push Docker image completed/skipped; Prepare Build Artifacts completed/skipped; build completed/skipped; Build Docker image completed/skipped; Determine release tag completed/success; Publish Live Evidence (ubuntu-latest) completed/success; Publish Live Evidence (windows-latest) completed/success; version-and-release completed/success), none failed. The exact-main proof here is the fresh local run at the merge.
- R-HP-1 (Root): Owner ruling (adopting the reviewer's recommendation): P2CG1R discharges CF-H8/CF-G5 for the GM/host join arm only. P2CG1HP keeps src/lib/multiplayer/server/__tests__/bindCampaignSyncConnection.test.ts in its manifest (it stays nine files) and widens the R row "P2CG1R CF-H8/CF-G5: an installed bound membership join only ever offers (confirmed|held|failed send callback); joinMember is never invoked" to it.each over {host, member}; the newcomer arm is cross-checked by the existing P2CE2 row in coopMissionAnnouncement.reconnect.test.ts (reviewer RV10). The conditional 9 -> 8 reduction in P2CG1HP.admissionRequires is NOT taken. P2CG1HP is not edited here; its admission records this receipt, head e3f2535e and the three host-arm assertions.
- R-GATE-1 (Root): The main-proof runner gated every run with node scripts/qc/machine-idle.mjs --own-pid 47516 --own-pid 55164, the gate Root ruled for the P2CG1G2 closure (G2-GATE-1: PID 47516 the idle server.js, PID 55164 T3 Code's idle html_preview renderer) and the closure brief restated; --own-pid was the only exclusion flag, and the runner waited on any other busy reading. Every reading printed MACHINE_IDLE on the first check, one per run. The runs were sequential (one heavy run at a time); this closure neither started nor stopped any process other than its own runner and its jest/tsc/validator children.
- R-SLOT-1 (Root): The reserved admission-review slot evidence/p2cg1r-admission-review-20261018.md (frozen in the admission manifest as the one reservedUnchanged entry; local census "unwritten") stays unwritten. The independent review was written by the reviewer to docs/audits/2026-10-18-p2cg1r-review.md in its detached review worktree (untracked there); this closure preserves it byte for byte at evidence/p2cg1r-source-fable-review-20261018.txt (sha256 4064bc298555db9fb61ccff47fe65ba50dd3962e1ff6fc784b23b7335050110f, 21156 bytes), as the P2CG1G1, P2CG1G2A and P2CG1G2 closures did, rather than authoring reviewer text into the slot or renaming the copy into it.

All 32 checks on the merged head succeeded on their first attempt (run 39118925042); the 32 names equal P2CG1G1's, P2CG1G2A's and P2CG1G2's and match pr-checks.yml one to one:
Detect Changes; Install Dependencies; Lint; Format Check; Validate Roadmap Ledger; Type Check; Unit Tests (1/6); Unit Tests (2/6); Unit Tests (3/6); Unit Tests (4/6); Unit Tests (5/6); Unit Tests (6/6); Perf Smoke Tests; Statistical Proof PR; Perf Budget PR; Coverage Floor; A11y Tests; Validate BV Parity; Validate Combat Suite; Build Storybook; Schema Bridge; Determinism Audit; E2E Smoke; Seam Anchors; Customizer Regressions; Desktop Type Check; Desktop Tests; Lint and Test; Prepare Build Artifacts; Build Test / linux; Build Test / mac; Build Test / win.
GitHub enforces only Lint and Test; each name was verified individually.
The [merge receipt](evidence/p2cg1r-merge-20261018.json) binds both ordered parents, the matching integration tree, the census and the admission controls at the merge.
The [main proof](evidence/p2cg1r-mainproof-20261018.json) is a fresh run at the merge before any closure edit, after a real npm ci under Node v22.22.0, each jest run --runInBand with a private cache after machine-idle --own-pid 47516 --own-pid 55164 printed MACHINE_IDLE (R-GATE-1):
the three P2CG1R suites with the P2CG1G2, P2CG1G2A and P2CG1G1/P2CG1G2A closure proof set together (54 suites, 863/863), the R suites alone (3 suites, 127/127), the G2 suites (5 suites, 129/129), the G2A suites (2 suites, 48/48), the G2A related set (74 suites, 925/925), the P2CG1G1 leaves (4 suites, 81/81), the Task 14 selector (4 suites, 104/104), P2CG1F (3 suites, 96/96), P2CG1E (3 suites, 166/166), P2CG1D (4 suites, 129/129), P2CG1C (2 suites, 54/54), P2CG1B (2 suites, 52/52), the 35 A1/A2 suites (35 suites, 398/398), typecheck and the validator passed.
It references the author's 27 proof logs by hash.

P2CG1R has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed.

Successor release (separate from the closure): P2CG1S moves from blocked to planned;
its only predecessor P2CG1R is main-verified with a genuine exact-main mainProof PASS in this same change set.
No other P2CG1S field changes. P2CG1H, P2CG1HP, B14-0A, B14-0B, B14-0, B14-HEAD, P2C, the B15 units and every other unit state are unchanged.
Selection is not downstream admission.
This closure metadata still requires its own CI and parent merge.

---

## 2026-10-18 P2CG1G2 source verified on main; P2CG1R released; closure metadata proposed

Reduced P2CG1G2 advances from implementing to main-verified for source PR #2250,
head 45f6d7e176daf5fa825b6ecd8dba3958cab8905b, merge cc98179e4d77024651bf1a16c63f077d64337273.
Its baseline remains the admission base f32626fbd2b558e1307f16590d4ab03c55668772 (#2249, after the P2CG1G2A closure merge #2248). Main moved by the docs/ledger-only #2251 (cf42ab56, B14 host-head split) before the merge; the PR was not rebased, the merge has first parent cf42ab56 and a clean merge-tree (82f7a168), the five product leaves equal the local receipt hashes and the five test leaves are byte-identical from RED fcba7105 through this closure base ef3209c2 (G2-MAIN-1).
The owner authorized this ruling under the standing instruction and the direct approval of 2026-10-18, and it was posted as [comment 6247720708](https://github.com/SwiggitySwerve/MekStation/pull/2250#issuecomment-6247720708);
its exact UTF-8 body (2061 bytes; gh api --jq .body prints it plus one LF), without an added newline, hashes to 378fa2392a802bd46ebaff520565b286251117d1b7c4682edda9798f5dcdcaaf.
The ruling (08:38:11Z) preceded the merge (08:38:18Z), and PR #2250 carries the owner-ruled label.
PK-p2cg1g2-ruling records that ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2cg1g2-review-20261018.json) binds one independent full sensitive review (Claude Fable 5.1, substituting for GPT Astra; author Opus 5.5) on the exact merged head 45f6d7e1: APPROVE-WITH-NOTES, sha256 f5e75b7a193fda612913a0423045a54f2cc55f9076a362bfaff3462a73b8ac2b (18709 bytes), preserved byte for byte at evidence/p2cg1g2-source-fable-review-20261018.txt.
The reviewer checked the ledger discipline commit by commit (admission b72d6803, RED fcba7105 with the four existing product leaves byte-identical to the base and the seat module absent, GREEN 45f6d7e1 with no test byte changed; 15/15 files with the reserved slot, 306/500 counted lines), reproduced RED (34 failed of 129) and GREEN (129/129), verified CF-H12 (32/32 by name), found the seat module in no madge cycle, and caught 6 of 12 independent mutants (RV1, RV3, RV4, RV7, RV10 and RV11 survived: test gaps or latent hardening, none a GREEN defect; the author's ML6 downgraded from equivalent to a Low gap).
It found no blocker; findings N1-N8 are Low or informational. The five classes: authority PASS, privacy PASS (no disclosure beyond the PRIV-1 B15 hold), replay PASS with notes, idempotency PASS, concurrency PASS with notes.
The reserved p2cg1g2-admission-review-20261018.md slot stays unwritten (G2-SLOT-1).

Carry-forwards delivered by reduced P2CG1G2 (review section 5, "Yes."; owner ruling "genuinely discharged"): CF-G2A-5, CF-H6, CF-H11, CF-H12, CF-H16. CF-H2 and CF-H14 were cross-referenced only; CF-G2A-4 stays with B15 (G2A-ROUTE-1).

New carry-forwards (reviewer section 7 cells verbatim in the review receipt; directedTo is closure routing, as tabulated per the ruling):

- CF-G2-1 [open; reviewer owner: H (next owner of campaignSyncTransportSeat.ts)]: "N1: handle an already-aborted signal in waitForSeatCampaignSnapshot; pin "unmount during identity resolution opens no socket" in the entry suite." Directed to: P2CG1H, as the next owner of src/lib/campaign/coop/campaignSyncTransportSeat.ts: handle an already-aborted signal in waitForSeatCampaignSnapshot and pin "unmount during identity resolution opens no socket" in the entry suite (N1; reviewer mutant RV7 survived). Recorded under successorNotes.P2CG1H; no P2CG1H field is edited.
- CF-G2-2 [open; reviewer owner: H]: "N2: pin the role check (same match/campaign/player, other role -> not bound)." Directed to: P2CG1H: pin the role check in boundCampaignSyncTransport (same match, campaign and player, other role -> not bound) (N2; RV1 survived). Recorded under successorNotes.P2CG1H.
- CF-G2-3 [open; reviewer owner: H / R]: "N3: decide ownership of a superseded same-seat A after a successful join through B (close it, or have the registry close the displaced object when the seat is identical)." Directed to: P2CG1H or P2CG1R, as tabulated ("H / R"): decide ownership of a superseded same-seat transport A after a successful join heard through B (close it, or have the registry close the displaced object when the seat is identical) (N3). Recorded under successorNotes.P2CG1H and successorNotes.P2CG1R; whichever of the two first owns the entry panel or the transport registry carries it.
- CF-G2-4 [open; reviewer owner: H]: "N4: pin the replacement resend with a changed choice (command-hq) so RV10 dies." Directed to: P2CG1H: pin the launch-page replacement resend with a changed choice (pick command-hq, reseat, expect command-hq) so RV10 dies (N4). Recorded under successorNotes.P2CG1H.
- CF-G2-5 [open; reviewer owner: H]: "N6: pin listener lifetime after dispose (late post-unmount frame publishes nothing; one listener per join on the transport)." Directed to: P2CG1H: pin listener lifetime after dispose (a late post-unmount frame publishes nothing; one listener per join on the transport) (N6; RV3 and RV11 survived). Recorded under successorNotes.P2CG1H.
- CF-G2-6 [open; reviewer owner: H (consumer owner)]: "N7: recovery/UX for the surface when the stored transport on the same match is bound to another campaign (CF-H16 refusal leaves it offline)." Directed to: P2CG1H, the consumer owner: recovery/UX for the surface when the stored transport on the same match is bound to another campaign, which the delivered CF-H16 refusal leaves offline (N7). Recorded under successorNotes.P2CG1H.
- CF-G2-7 [open; reviewer owner: H]: "N5: connectStoredCampaignSyncTransport refuses by campaignId only; consider role/playerId in the stored refusal or route the surface through boundCampaignSyncTransport." Directed to: P2CG1H: connectStoredCampaignSyncTransport refuses a stored transport by campaignId only; consider role/playerId in the stored refusal or route the surface through boundCampaignSyncTransport (N5, pre-existing since P2CG1G1). Recorded under successorNotes.P2CG1H.
- CF-G2-8 [open; reviewer owner: I1-I4 / P2CG2]: "ML6 defence-in-depth: a cross-match participation frame must never publish under a foreign key; pin once a multi-match page exists." Directed to: P2CG1I1-P2CG1I4 / P2CG2, as tabulated: once a multi-match page exists, pin that a cross-match participation frame never publishes under a foreign key (ML6 defence in depth, N8). Recorded under successorNotes.P2CG1I1toI4AndP2CG2; none of those units is edited.
- CF-G2-9 [open; reviewer owner: S (engine/e2e)]: "Seam Anchors :425 same-seed marker inequality is a recurring flake (also 2026-10-15 on a docs-only commit); not a G2 defect." Directed to: As tabulated, "S (engine/e2e)": the engine/e2e owner of e2e/seam-fresh-construction-no-instant-defeat.spec.ts:425 (same-seed run-to-run marker inequality, aliveBySide.player 2 vs 1 from turn 3 heat), a recurring flake (failed then passed on rerun for the units.json-only 293ae722b in run 38810066031 on 2026-10-15, and for this head in run 39109741978 attempt 1). Recorded under successorNotes.P2CG1S as routed; the registered P2CG1S (live-wire spectator sealed-choice privacy) does not own that spec or the battle-resolution path, so the item binds whichever unit next owns the seam spec or that engine path (Root note G2-SEAM-1). Not a P2CG1G2 defect; no unit is edited.
- CF-G2-10 [open; reviewer owner: B15]: "Unchanged from G2A: PRIV-1 campaignId correlation, MR1/MR4 route rows, CF-G2A-1/2/3/6." Directed to: B15, unchanged from P2CG1G2A: the PRIV-1 campaignId correlation (the R-PRIV-1 hold on B15-6), the MR1/MR4 route rows (CF-G2A-4, re-routed by G2A-ROUTE-1) and CF-G2A-1, 2, 3 and 6, as recorded in evidence/p2cg1g2a-review-20261018.json. Reduced P2CG1G2 neither widened nor narrowed PRIV-1 (review section 3, Privacy). Recorded under successorNotes.B15; no B15 unit is edited.
- CF-G2-11 [closed at this closure (routed as tabulated); reviewer owner: B14-0 / HP]: "Post-merge: exact-main proof must run on the actual merge commit and CF-H12 re-read there (CF-G2A-7 pattern)." Directed to: Routed as tabulated to B14-0 / P2CG1HP; its substance is satisfied by this closure. The exact-main proof ran on the actual merge commit cc98179e4d77024651bf1a16c63f077d64337273 (first parent cf42ab56, after the docs-only #2251), and CF-H12 was re-read for that merge: the 32 PR checks ran on the merged head 45f6d7e1 (pull_request event) and were verified by name; pr-checks.yml does not run on the push to main, so the merge commit carries only the push workflows, recorded in the merge receipt (mergeCommitCheckRuns). Nothing from this item remains open for B14-0 or P2CG1HP beyond the standing pattern that each later unit runs its own exact-main proof on its own merge commit.

Still open from earlier receipts, owners unchanged (reduced P2CG1G2 changed none of their owner files): CF-H2 (open; next owner of campaignHostFoldStore.ts; the surface is a G2 leaf); CF-H5 (open; store + consumer owner); CF-H7 (open; consumer owner, at or before P2CG1H); CF-H8 (open (unchanged); bindCampaignSyncConnection.test.ts owner or P2CG1H); CF-H9 (open (unchanged); useCampaignPersistenceStore.ts owner); CF-H10 (open (unchanged); hostRecordRefresh.test.tsx owner); CF-H13 (open (optional); optional; next owner of campaignHostFoldStore.ts); CF-H14 (new; next owner of useCampaignApplicationConsumer.ts; before any mount that gates on projected state, and in any case at or before P2CG1H); CF-H15 (new; next owner of hostProjection.test.tsx); CF-H17 (new (optional); surface/store owner). P2CG1HP names CF-H7/CF-G4, CF-H14, CF-H15 and CF-H8/CF-G5 in its behaviour text. From P2CG1G2A, CF-G2A-1, 2, 3, 4 and 6 stay with B15. H-OPEN-1, CF-E1, CF-E5 and CF-E6 remain recorded in evidence/p2cg1d-review-20261017.json, CF-F9 in evidence/p2cg1e-review-20261018.json and CF-G5 (now CF-H8) in evidence/p2cg1f-review-20261018.json, as evidence/p2cg1g1-review-20261018.json successorNotes.P2CG1H.priorNotes lists them; this closure neither restates nor changes them. P2CG1R, released here, names H-OPEN-1 / CF-E1 in its own behaviour text.

Root notes (not reviewer text; recorded under successorNotes.openNotes):

- G2-GATE-1 (Root): The main-proof runner waited from 2026-10-18T08:42:21Z to 2026-10-18T09:18:54Z on MACHINE_BUSY caused only by chrome-headless-shell PID 55164, which this closure did not start and did not stop. Root ruled, verbatim: PARENT RULING (Root, machine gate): PID 55164 is T3 Code's own persistent html_preview renderer (chrome-headless-shell, parent PID 50120 "T3 Code (Nightly).exe", started 08:42Z by a Root html_preview call). Root verified it is idle (CPU time unchanged at 5.92s over a 5 s sample). It is not a heavy run and must not be killed. Root designates it an allowed idle process exactly like 47516: run the gate as `node scripts/qc/machine-idle.mjs --own-pid 47516 --own-pid 55164` (still --own-pid only, no other exclusion flags). If the gate then reports MACHINE_IDLE, proceed with your heavy run now; if it reports some other busy process, wait as before. Record this ruling in your receipts/logs. Owner authority: standing instruction "continue with recommended options and fix the issues that come up, publish as needed". The runner (this closure's own process) was restarted with --own-pid 47516 --own-pid 55164 before any jest run; every run then started on MACHINE_IDLE.
- G2-MAIN-1 (Root): Main moved between the admission baseline f32626fb (#2249) and the merge by one docs/ledger-only merge: #2251 (cf42ab56, B14 host-head containment split registration; files openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md, openspec/planning/2026-09-12-roadmap-completion/evidence/b14hp-prep-20261018.txt, openspec/planning/2026-09-12-roadmap-completion/roadmap.json, openspec/planning/2026-09-12-roadmap-completion/units.json; units.json changes {"units":["B14-0","B14-HEAD","P2CG1HP","P2CG1H"],"packets":[],"topLevel":["layerRegistration20261017L1","hPrereqRegistration20261017","b14HeadRegistration20261018"]}). It touched no P2CG1G2 leaf and neither the P2CG1G2 nor the P2CG1R entry. The PR was not rebased: the merge commit cc98179e has first parent cf42ab56 (#2251) and second parent the reviewed head 45f6d7e1; its tree 82f7a168 equals git merge-tree --write-tree of the two parents (clean), its units.json equals main's at cf42ab56 with only the P2CG1G2 entry taken from the head, and roadmap.json equals main's. The five product leaves equal the local receipt hashes and the five test leaves are byte-identical from RED fcba7105 through the head, the merge and the closure base ef3209c2 (main moved after the merge by 0607d436 #2252, a2c1ff4c #2253, 21b490fd #2254, 9fa84180 #2256, fe41f7ad #2255, ef3209c2 #2257, changing docs/releases/v2.2.0-topology.md, playtest/checklists/coop-uat.md, playtest/session-notes/TEMPLATE-v2.2.0-coop-l1.md, src/components/multiplayer/CreateMatchForm.tsx, src/components/multiplayer/__tests__/CreateMatchForm.a11y.test.tsx, src/components/multiplayer/__tests__/CreateMatchForm.test.tsx, docs/audits/2026-10-18-council3-decision.md, openspec/planning/2026-09-12-roadmap-completion/evidence/.gitattributes, openspec/planning/2026-09-12-roadmap-completion/evidence/council3-a-20261018.txt, openspec/planning/2026-09-12-roadmap-completion/evidence/council3-b-20261018.txt, openspec/planning/2026-09-12-roadmap-completion/evidence/council3-c-20261018.txt, openspec/planning/2026-09-12-roadmap-completion/roadmap.json, openspec/planning/2026-09-12-roadmap-completion/units.json, openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md, openspec/planning/2026-09-12-roadmap-completion/evidence/identity-gap-20261018.txt, docs/audits/2026-10-18-maintenance-group-b.md, scripts/__tests__/roadmap-codex-review-identity.test.ts, src/__tests__/service/printing/RecordSheetService.pipeline.test.ts, src/__tests__/unit/encoding/mojibakeGuard.test.ts, src/lib/events/journal/__tests__/SQLiteEventJournalTestHarness.ts, src/lib/testing/__tests__/faultControlsStartup.test.ts, src/lib/testing/faultControls.ts, src/services/printing/RecordSheetService.ts, src/services/printing/svgRecordSheetRenderer/svgGeometry.ts, src/utils/appearanceBootstrap.ts, openspec/planning/2026-09-12-roadmap-completion/evidence/lsc-prep-20261018.txt; none is a P2CG1G2 leaf, and the P2CG1G2, P2CG1G2A and P2CG1R entries are unchanged). The owner ruling recorded the clean merge-tree with cf42ab56 before the merge.
- G2-CHECKS-1 (Root): CF-H12 / CF-G2-11: all 32 required PR check runs on the merged head 45f6d7e1 (run 39109741978, latest attempt per check) concluded success and their names equal, one to one, the 32 names recorded for P2CG1G1 and P2CG1G2A and the P2CG1G2 local receipt expectedNames; the author posted the by-name comparison as https://github.com/SwiggitySwerve/MekStation/pull/2250#issuecomment-6247570491. Attempt 1 of that run had two failed check runs (Lint and Test failure (117624097391, started 2026-10-18T08:04:53Z); Seam Anchors failure (117623205824, started 2026-10-18T08:00:27Z)): Seam Anchors and Lint and Test, its aggregate; the filter=all listing holds 64 check runs for the head, the 32 latest all success. pr-checks.yml (blob a82fe0f7) is identical at the P2CG1G2A head and merge, the P2CG1G2 baseline, head, main at merge, merge and closure base. The PR checks do not run on the push of the merge commit to main; at 2026-10-18T08:43:20Z the merge commit carried 10 push-workflow check runs (Live Tier Signal completed/success; release completed/skipped; build completed/skipped; Push Docker image completed/skipped; Build Docker image completed/skipped; Prepare Build Artifacts completed/skipped; Determine release tag completed/success; Publish Live Evidence (ubuntu-latest) completed/success; Publish Live Evidence (windows-latest) completed/success; version-and-release completed/success), none failed. The exact-main proof here is the fresh local run at the merge.
- G2-SEAM-1 (Root): Seam Anchors flake, recorded for its owner (CF-G2-9). Attempt 1 of run 39109741978 failed only in Seam Anchors (e2e/seam-fresh-construction-no-instant-defeat.spec.ts:425, run-to-run marker equality, aliveBySide.player 2 vs 1 from turn 3 heat) and its aggregate Lint and Test; attempt 2 passed. The reviewer found that P2CG1G2 touches no e2e, engine, simulation or gameplay file, that on a single-player campaign both G2 co-op effects return at the first guard, and that the identical assertion failed and passed on rerun for the units.json-only 293ae722b (run 38810066031, 2026-10-15); its logs are kept as seam-attempt1.log and seam-293ae722b.log in the reviewer proof directory (reviewerProofLogs). The ruling accepts it as an engine-side flake unrelated to G2. The reviewer routes it to "S (engine/e2e)"; P2CG1S as registered is the live-wire spectator sealed-choice privacy repair and does not own that spec, so this closure records it under successorNotes.P2CG1S as routed and names the real owner as whichever unit next owns the seam spec or the battle-resolution path. No unit is edited for it.
- G2-SLOT-1 (Root): The reserved admission-review slot evidence/p2cg1g2-admission-review-20261018.md (frozen in the admission manifest as the one reservedUnchanged entry; local census "unwritten") stays unwritten. The independent review was written by the reviewer to docs/audits/2026-10-18-p2cg1g2-review.md in its detached review worktree (untracked there); this closure preserves it byte for byte at evidence/p2cg1g2-source-fable-review-20261018.txt (sha256 f5e75b7a193fda612913a0423045a54f2cc55f9076a362bfaff3462a73b8ac2b, 18709 bytes), as the P2CG1G1 and P2CG1G2A closures did, rather than authoring reviewer text into the slot or renaming the copy into it.

All 32 checks on the merged head succeeded (run 39109741978, latest attempt); the 32 names equal P2CG1G1's and P2CG1G2A's and match pr-checks.yml one to one:
Detect Changes; Install Dependencies; Lint; Format Check; Validate Roadmap Ledger; Type Check; Unit Tests (1/6); Unit Tests (2/6); Unit Tests (3/6); Unit Tests (4/6); Unit Tests (5/6); Unit Tests (6/6); Perf Smoke Tests; Statistical Proof PR; Perf Budget PR; Coverage Floor; A11y Tests; Validate BV Parity; Validate Combat Suite; Build Storybook; Schema Bridge; Determinism Audit; E2E Smoke; Seam Anchors; Customizer Regressions; Desktop Type Check; Desktop Tests; Lint and Test; Prepare Build Artifacts; Build Test / linux; Build Test / mac; Build Test / win.
GitHub enforces only Lint and Test; each name was verified individually.
The [merge receipt](evidence/p2cg1g2-merge-20261018.json) binds both ordered parents, the matching integration tree, the census and the docs-only main movement before the merge.
The [main proof](evidence/p2cg1g2-mainproof-20261018.json) is a fresh run at the merge before any closure edit, after a real npm ci under Node v22.22.0, each jest run --runInBand with a private cache after machine-idle --own-pid 47516 --own-pid 55164 printed MACHINE_IDLE (G2-GATE-1):
the five P2CG1G2 suites, the two P2CG1G2A suites and the P2CG1G1/P2CG1G2A closure proof set together (54 suites, 846/846), the G2 suites alone (5 suites, 129/129), the G2A suites alone (2 suites, 48/48), the G2A related set (74 suites, 925/925), the P2CG1G1 leaves (4 suites, 81/81), the Task 14 selector (4 suites, 104/104), P2CG1F (3 suites, 96/96), P2CG1E (3 suites, 166/166), P2CG1D (4 suites, 119/119), P2CG1C (2 suites, 54/54), P2CG1B (2 suites, 45/45), the 35 A1/A2 suites (35 suites, 388/388), typecheck and the validator passed.
It references the author's 23 proof logs by hash.

P2CG1G2 has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed.

Successor release (separate from the closure): P2CG1R moves from blocked to planned;
its predecessors P2CG1G2 (main-verified with a genuine exact-main mainProof PASS in this same change set), P2CG1B and P2CG1D are main-verified with mainProof PASS.
No other P2CG1R field changes. P2CG1S, B14-0, B14-HEAD, P2CG1HP, P2CG1H, P2C, the B15 units and every other unit state are unchanged.
Selection is not downstream admission.
This closure metadata still requires its own CI and parent merge.

---

## 2026-10-18 Local-seat schema and packaged-proof splits registered

Parent adopts the recommendation in the [LSC preparation report](evidence/lsc-prep-20261018.txt)
under the standing owner instruction to continue with recommended options, fix
issues and publish as needed, and the 2026-10-18 owner recommendation approval.
The report is retained byte-for-byte, SHA-256
57c20caf90e9acf3c2ce0b8ba57c8dcc5178426ece806bab7c78b14e980e25ea.
This is a docs-only registration ruling, not source admission, a future sensitive
OWNER-RULING or runtime acceptance. Baseline: fe41f7ad8ebcdc3731a59cbec5fd69005cd1e29e.

Register blocked sensitive LSC-1DB for the durable local-seat schema, central
migration catalog, migration test and own lifecycle/evidence (eight draft leaves).
Allocate its production migration version from fresh Main at admission. LSC-1
retains repository/API/token and password-verified mint throttling, consuming the
new predecessor's schema; the unsplit draft would require 17/15 leaves.

Register blocked sensitive LSC-2P for the dedicated packaged Playwright config,
packaged spec, release-proof document and own lifecycle/evidence (eight draft
leaves). Config attaches to the installed instance at 127.0.0.1:3001 with no
webServer/globalSetup, one serial worker and unchanged 30-second timeout. Move
only the packaged spec and release-proof document out of LSC-2's draft manifest;
LSC-2 retains storage, selector, provisioning/recovery UI and the in-repo
three-identity integration proof in its remaining twelve draft leaves. No source,
config, spec implementation or placeholder lifecycle evidence is created.

Effective L1 has 28 units: P2CG1HP -> LSC-0 -> LSC-1DB -> LSC-1 -> LSC-2 ->
LSC-2P -> P2CG1H. Links are symmetric. H adds LSC-2P exact-main PASS, ancestry
and closure while retaining all existing admission text, including LSC-2 and HP.
The release predicate and human-session checklist require both LSC-2 and LSC-2P
closure. Binding N1-N6 from #2256 remain explicit: full overlapping reservation
census, further splits for unregistered leaves, mint throttling, non-vault seat
semantics, next-mint/renewal revocation and H's HP gate.

Caps remain 15 actual unique files / 500 counted additions without deletion
credit; measured fit and final evidence names freeze at admission. Preserve
sensitive review, required CI, exact-head OWNER-RULING, exact-main proof and one
product/closure lane. NEXT does not enforce documentary predecessor arrays.
Only LSC-0/1/2 and H existing unit fields change; HP, G2, R and every other unit
remain unchanged. Earlier dated layer amendments remain historical. The PR
records the exact field diff, validator modes/tests, selector simulation, strict
OpenSpec validation and formatting results.

## 2026-10-18 B14 host-head containment split registered

Parent adopts "B14 fit ruling and draft split" from the
[B14/HP preparation report](evidence/b14hp-prep-20261018.txt) under the standing
owner instruction to continue with recommended options, fix issues and publish
as needed. The report is retained byte-for-byte, SHA-256
a9e395468f332ab5ae90e58d6c57a348a1389143746d25f16d866d98f377b787.
This records the parent ruling; it supplies no source admission, runtime
acceptance or future sensitive implementation OWNER-RULING.

The mandatory head census proved that matchHeadRoute.ts:61/:73 returns a
hidden-dependent journal digest (payload includes gunnery and
expectedPostStateDigest). The route bypasses FogAwareMatchProjection. Adding it
and its existing test to B14-0 would make 17/15 files. Register blocked
B14-HEAD under R2.authority-live with privacy/authority/replay review: the route,
src/pages-modules/api/__tests__/matchHeadRoute.test.ts, units.json and four
bounded admission/red/local/admission-review outputs are seven prospective
files under unchanged 15-file/500-counted-added-line caps. Final evidence names
and actual fit freeze at admission; no placeholder receipts are created.

B14-HEAD authorizes first, then uses B14-0's shared fogMatchAdmission decision
to refuse fog-on and unknown-config reads with HTTP 403 and fixed reason
fog-projection-unavailable before digest serialization. Known-off behavior is
unchanged. B14-0 must not edit the head route or its test; its 15-file manifest
and remaining acceptance stay unchanged. Full B14 privacy acceptance is
discharged only after BOTH B14-0 and B14-HEAD have genuine exact-main PASS,
fetched-main ancestry and closure.

Effective L1 has 23 units: G2 -> R -> S -> B14-0 -> B14-HEAD -> P2CG1HP -> H.
HP retains B14-0 and adds B14-HEAD as a predecessor; H adds B14-HEAD's
main-verified/exact-main/closure admission gate. Parent release follows each
predecessor's proof and closure; NEXT does not enforce ordinary predecessor
arrays and supplies no permission. Preserve one product-writing lane and all
sensitive review, required CI and exact-head OWNER-RULING obligations.

Registration baseline is f32626fbd2b558e1307f16590d4ab03c55668772. Existing unit
edits are only B14-0.admissionRequires/successors,
P2CG1HP.admissionRequires/predecessors and P2CG1H.admissionRequires.
P2CG1G2 and every other existing unit are unchanged. Original task holders,
release acceptance, H activation/checkpoint and prior dated records remain.
Validation and the exact field diff are recorded in the PR.

## 2026-10-18 Pre-H consumer recovery registered; H type scope amended

Parent adopts the recommended split and concrete two-retry policy under the
standing owner instruction to continue with recommended options, fix issues and
publish as needed. P2CG1HP (pre-H consumer recovery) is blocked under
R2.authority-live, with authority/privacy/replay/idempotency/concurrency review.
Effective L1 has 22 units: P2CG1S -> B14-0 -> P2CG1HP -> P2CG1H -> P2CG1I1.
B14-0 must have genuine exact-main PASS, fetched-main ancestry and closure before
HP release; HP needs independent sensitive review, exact-head OWNER-RULING,
required CI, exact-main PASS and closure before H admission or installation.
NEXT does not enforce ordinary predecessors and supplies no source permission.

The [HI preparation report](evidence/hi-prep-20261018.txt) is copied byte-for-byte
(SHA-256 6b8df3e824b27717d7db0c6f6f316ef150295d4cdb28d3861eb23a697ffb7590).
Its "Draft amendment / split - not applied" section is adopted here with real ID
P2CG1HP and the finite policy: two automatic quiet-window retries per mounted
campaign-seat recovery episode, counted across replacement transports; reset
only on healthy application confirmation or explicit user retry. Exhaustion
closes the unproductive socket, stops automatic rejoin and shows accessible
inline "Campaign sync could not connect. Reload this campaign to try again."
State is hook-local, scoped by campaign/match/player; dispose cancels timers and
route remount resets are documented and tested. No durable cross-route cap is
claimed. CF-H14 synchronous settling release, CF-H15 same-tick pin and CF-H8/CF-G5
bound-join first appliedView/no-joinMember proof belong here. Preserve G1 heardAt,
CF-H1 held-refresh cut, ordered offers, stale-binding silence, replacement EMPTY
fold and healthy legacy first-frame behavior. If R provides exact H8/G5 proof,
record its receipt/head/assertions and reduce the binder test; do not assume it.

HP has four exact source/test leaves plus units.json and four prospective
admission/red/local/admission-review outputs: nine files, ordinary 15/500 caps.
Freeze truthful final evidence names at admission, then measure actual fit.
H gains only CampaignHostRegistry.ts and campaignApplicationConnection.ts for
CF-E6 type-only imports; campaignApplicationReceiptPort.ts owns the single
interface. Its source/test/lifecycle subtotal changes 9 -> 11; four evidence
outputs make 15/15. R does not establish cross-file atomicity or comprehensive
outer-COMMIT cleanup; any broader required repair must be registered before H.
Preserve G2/R/S/B14-0, repair-not-implied-waiver, all other H behavior, activation
predicate, I1 successor and review/CI/exact-main/closure gates.

Registration baseline is 36dacb34613785cb364db258afdd2632eca09be0. Existing unit
changes are limited to B14-0.successors and H.behavior/admissionRequires/
predecessors. P2CG1G2A/P2CG1G2 and all other unit objects are unchanged; L1 mapping
and documentary order insert HP only. Prior dated registration records remain
historical. No source admission, implementation, runtime acceptance or future
sensitive approval is supplied. Final field audit and validation are in the PR.

Parent review follow-up: rebased onto the G2A closure (#2248), preserving its
G2A main-verified / G2 planned state and progress entry below. Following #2246,
H retains G2/R/B14-0 predecessors and includes HP; B14-0 -> HP -> H links are
symmetric without removing existing prerequisite edges.

## 2026-10-18 P2CG1G2A source verified on main; reduced P2CG1G2 released; closure metadata proposed

P2CG1G2A advances from implementing to main-verified for source PR #2247,
head 412c09411a784fbb8985995b652ef2007e5a4a39, merge a6b604a078e44abaf9dbb6e2c14888e90ad83d08.
Its baseline remains the admission base 58e5c31b09d7d724ef409b497f3b421d41d48a29 (the P2CG1G1 closure merge #2244). Main moved by the docs/ledger-only #2245 (76ed00c1) and #2246 (69bdf0ba) before the merge; the PR was not rebased, the merge has first parent 69bdf0ba and a clean merge-tree (4e071053), and both P2CG1G2A leaves are byte-identical at the head, the merge and this closure base a6b604a0 (G2A-MAIN-1).
The owner authorized this ruling under the standing instruction, and it was posted as [comment 6246826945](https://github.com/SwiggitySwerve/MekStation/pull/2247#issuecomment-6246826945);
its exact UTF-8 body (1802 bytes; gh api --jq .body prints it plus one LF), without an added newline, hashes to 6977569bcf414b4e28d4515eee032dc4118c1a003a0f27ae19ed6c687b526da6.
The ruling (06:57:20Z) preceded the merge (06:57:26Z), and PR #2247 carries the owner-ruled label.
PK-p2cg1g2a-ruling records that ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2cg1g2a-review-20261018.json) binds one independent full sensitive review (Claude Fable 5.1, substituting for GPT Astra; author Opus 5.5) on the exact merged head 412c0941: APPROVE-WITH-NOTES, sha256 e54904c72a239f8259595a0b6d49309219d657dd3e80408714986e708d43a0e5 (18297 bytes), preserved byte for byte at evidence/p2cg1g2a-source-fable-review-20261018.txt.
The reviewer checked every behaviour clause against the route, the ledger discipline commit by commit (admission 60da3dbb, RED eec0cab8 with the route byte-identical to the base, GREEN 412c0941 with no test byte changed; 7/15 files, 62/500 counted lines), reproduced RED (19 failed), GREEN (48/48) and the related set (74 suites, 925 tests), verified CF-H12 (32/32 by name) and caught 9 of 12 independent mutants (MR1 and MR4 test gaps, MR15 equivalent).
It found no blocker; findings F1-F9 are test gaps, pre-existing leniencies outside the manifest or informational. It confirmed PRIV-1 (R-PRIV-1) correct and complete, adding the co-op-ness bit (subsumed by the campaignId disclosure). The five classes: authority PASS, privacy PASS with notes, replay N/A (pure read), idempotency PASS, concurrency PASS.
The reserved p2cg1g2a-admission-review-20261018.md slot stays unwritten (G2A-SLOT-1).

Carry-forwards (reviewer section 9 cells verbatim in the review receipt; directedTo is closure routing):

- CF-G2A-1 [open; reviewer owner: B15 (remote hosting)]: "Add an abuse budget / rate limiter to the invite route (both modes) before any non-loopback hosting claim; identity mode adds Ed25519 verification per live-code hit (F9)." Directed to: B15 (remote hosting): an abuse budget / rate limiter on the invite route in both modes before any non-loopback hosting claim (F9). Routed as the owner ruling writes ("B15 (rate limiter ...)"). Recorded under successorNotes.B15; no B15 unit is edited here.
- CF-G2A-2 [open; reviewer owner: B15]: "PRIV-1 fix as ruled (joinableLobbies / session creation) must also close the co-op-ness bit (section 7.1) and the campaignId correlation; verify after the fix that a non-member with a listed code gets 404/401 in identity mode." Directed to: B15: the R-PRIV-1 remote/tunnel readiness obligation recorded on B15-6 by #2245 (fix in joinableLobbies.ts / session creation) must also close the co-op-ness bit (review section 7 item 1) and the campaignId correlation, then re-verify that a non-member with a listed code gets 404/401 in identity mode. Routed as the owner ruling writes ("PRIV-1 fix including the co-op bit").
- CF-G2A-3 [open; reviewer owner: B15 / auth hardening (not a G2 leaf)]: "decodeTokenFromWire strict base64: reject trailing bytes after padding and non-base64 characters (F4)." Directed to: B15 auth hardening: strict base64 in decodeTokenFromWire (src/types/multiplayer/Player.ts, a leaf of neither P2CG1G2A nor reduced P2CG1G2) (F4). Routed as the owner ruling writes ("strict wire decode").
- CF-G2A-4 [open (re-routed by parent ruling); reviewer owner: P2CG1G2 (next time the test leaf opens)]: "Add rows for a lowercase 'bearer' scheme and an empty-string campaignId so MR1/MR4 are killed (F1, F2)." Directed to: B15 auth hardening, NOT reduced P2CG1G2 (Root routing note G2A-ROUTE-1, parent ruling 2026-10-18): the lowercase-scheme and empty-string-campaignId rows that kill MR1 and MR4 belong to whoever next owns src/__tests__/api/securityBoundary.test.ts and the invite route under B15 auth hardening (F1, F2).
- CF-G2A-5 [open; reviewer owner: P2CG1G2 (consumer)]: "Consumer must call with exactly ?campaignIdentity=1, send the bearer only in the Authorization header (never ?token=), and treat 400/401/404 as distinct classes without falling back to the anonymous summary for campaignId." Directed to: reduced P2CG1G2 (its first in-repo consumer): call with exactly ?campaignIdentity=1, send the bearer only in the Authorization header (never ?token=), and treat 400/401/404 as distinct classes with no fallback to the anonymous summary for campaignId; it adds those rows in an existing G2 test. Routed as the owner ruling writes ("consumer contract") and confirmed by the parent ruling.
- CF-G2A-6 [open; reviewer owner: B15]: "Consider logging the verified playerId (logger.ts, not console) on identity-mode success so the identity gate at least provides accountability." Directed to: B15: consider logging the verified playerId (logger.ts, not console) on identity-mode success so the gate provides accountability. Routed as the owner ruling writes ("accountability logging").
- CF-G2A-7 [closed at this closure; reviewer owner: Merge / mainProof]: "Main has moved past the baseline with docs-only commits (#2245, #2246); merge-tree is clean at 69bdf0ba6. The exact-main proof must run on the actual merge commit, and CF-H12 must be re-read on that commit, not on 412c0941." Directed to: This closure: satisfied here. The main proof ran on the actual merge commit a6b604a078e44abaf9dbb6e2c14888e90ad83d08 (first parent 69bdf0ba, after #2245 and #2246), and CF-H12 was re-read for that merge: the 32 PR checks ran on the merged head 412c0941 (pull_request event) and were verified by name; pr-checks.yml does not run on the push to main, so the merge commit carries only the push workflows, recorded in the merge receipt (mergeCommitCheckRuns).
- Forwarded unchanged from P2CG1G1 to reduced P2CG1G2: CF-H6, CF-H11, CF-H12, CF-H16 (CF-H2 and CF-H14 cross-referenced), as recorded in evidence/p2cg1g1-review-20261018.json.

Root notes (not reviewer text; recorded under successorNotes.openNotes):

- G2A-ROUTE-1 (Root): Root routing note citing the parent ruling (T3 parent thread 6db2c314-6cd3-40c5-8fbd-7c42bc27ed35, relayed to this closure task on 2026-10-18 under the owner's standing instruction): CF-G2A-4 goes to B15 auth hardening, not reduced P2CG1G2. Both the reviewer's owner cell ('P2CG1G2 (next time the test leaf opens)') and the owner ruling's routing ('P2CG1G2 (add two test rows killing MR1 and MR4; consumer contract)') named P2CG1G2; the parent ruling re-routes only the MR1/MR4 half. Reason given by the parent: G2 preparation showed MR1 (Bearer scheme case-insensitivity, [roomCode].ts:71) and MR4 (empty-string coopCampaign.campaignId, [roomCode].ts:92) cannot be killed from reduced P2CG1G2's registered leaves; only a route-handler test in src/__tests__/api/securityBoundary.test.ts can observe them, that file is a P2CG1G2A leaf that reduced P2CG1G2 does not own (checked: none of its ownershipPaths covers it or the route), and reduced P2CG1G2 adds no file for it. CF-G2A-5 (consumer contract: exactly ?campaignIdentity=1, bearer only in the Authorization header, 400/401/404 as distinct classes with no fallback to the anonymous summary for campaignId) stays with reduced P2CG1G2, which adds those rows in an existing G2 test. The review bytes and the ruling bytes are preserved unchanged; only the closure's directedTo differs from their owner text for CF-G2A-4. Parent ruling text, verbatim: PARENT RULING (owner standing instruction: "continue with recommended options and fix the issues that come up, publish as needed"): in the G2A closure carry-forwards, route the two route-test gaps MR1 (Bearer scheme case-insensitivity untested, [roomCode].ts:71) and MR4 (empty-string coopCampaign.campaignId branch untested, [roomCode].ts:92) to B15 auth hardening, NOT to P2CG1G2: G2 prep showed they cannot be killed from G2's registered leaves (only a route-handler test in securityBoundary.test.ts, which G2 does not own, can observe them; G2 adds no file). CF-G2A-5 (consumer contract) stays with P2CG1G2 (it adds 400/401/404 rows in an existing G2 test). Record this as a Root routing note citing this ruling. No other change to your brief.
- G2A-MAIN-1 (Root): Main moved between the admission baseline 58e5c31b and the merge by two docs/ledger-only merges: #2245 (76ed00c1, G1-DOC-2 and R-PRIV-1 documentary amendments; files openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md, openspec/planning/2026-09-12-roadmap-completion/units.json; units.json changes {"units":["P2CG1G1","B15-6"],"packets":[],"topLevel":[]}) and #2246 (69bdf0ba, B14-0 fog containment registration; files openspec/planning/2026-09-12-roadmap-completion/PROGRESS.md, openspec/planning/2026-09-12-roadmap-completion/evidence/b14-fog-scope-20261018.txt, openspec/planning/2026-09-12-roadmap-completion/roadmap.json, openspec/planning/2026-09-12-roadmap-completion/units.json; units.json changes {"units":["P2CG1S","B14-0","P2CG1H"],"packets":[],"topLevel":["layerRegistration20261017L1","hPrereqRegistration20261017","b14Registration20261018"]}). Neither touched a P2CG1G2A leaf or the P2CG1G2A or reduced P2CG1G2 entries (#2246 added B14-0 as a P2CG1H predecessor and prerequisite, which this closure leaves as it is). The PR was not rebased: the merge commit a6b604a0 has first parent 69bdf0ba (#2246) and second parent the reviewed head 412c0941; its tree 4e071053 equals git merge-tree --write-tree of the two parents (clean), and its units.json equals main's at 69bdf0ba with only the P2CG1G2A entry taken from the head. The route and test leaves are byte-identical at the head, the merge and the closure base a6b604a0 (the closure base is the merge itself; main has not moved since). The review noted this drift and the clean merge-tree (section 2, Base drift row; CF-G2A-7).
- G2A-CHECKS-1 (Root): CF-H12 / CF-G2A-7: all 32 required PR check runs on the merged head 412c0941 (run 39103204265) concluded success and their names equal, one to one, the 32 names recorded for P2CG1G1 and the P2CG1G2A local receipt expectedNames; pr-checks.yml (blob a82fe0f7) is identical at the G1 head and merge, the G2A baseline, head, main at merge, merge and closure base. The PR checks do not run on the push of the merge commit to main; at 2026-10-18T07:08:52Z the merge commit carried 10 push-workflow check runs (Live Tier Signal completed/success; release completed/skipped; Push Docker image completed/skipped; build completed/skipped; Prepare Build Artifacts completed/skipped; Build Docker image completed/skipped; Determine release tag completed/success; Publish Live Evidence (ubuntu-latest) completed/success; version-and-release completed/success; Publish Live Evidence (windows-latest) completed/success), none failed. The exact-main proof here is the fresh local run at the merge.
- G2A-SLOT-1 (Root): The reserved admission-review slot evidence/p2cg1g2a-admission-review-20261018.md (frozen in the admission manifest as reservedUnchanged, exists:false; local census "unwritten") stays unwritten. The independent review was written by the reviewer to docs/audits/2026-10-18-p2cg1g2a-review.md in its detached review worktree (untracked there); this closure preserves it byte for byte at evidence/p2cg1g2a-source-fable-review-20261018.txt (sha256 e54904c72a239f8259595a0b6d49309219d657dd3e80408714986e708d43a0e5, 18297 bytes), as the P2CG1G1 closure did, rather than authoring reviewer text into the slot or renaming the copy into it.

All 32 checks on the merged head succeeded (run 39103204265); the 32 names equal P2CG1G1's and match pr-checks.yml one to one:
Detect Changes; Install Dependencies; Lint; Format Check; Validate Roadmap Ledger; Type Check; Unit Tests (1/6); Unit Tests (2/6); Unit Tests (3/6); Unit Tests (4/6); Unit Tests (5/6); Unit Tests (6/6); Perf Smoke Tests; Statistical Proof PR; Perf Budget PR; Coverage Floor; A11y Tests; Validate BV Parity; Validate Combat Suite; Build Storybook; Schema Bridge; Determinism Audit; E2E Smoke; Seam Anchors; Customizer Regressions; Desktop Type Check; Desktop Tests; Lint and Test; Prepare Build Artifacts; Build Test / linux; Build Test / mac; Build Test / win.
GitHub enforces only Lint and Test; each name was verified individually.
The [merge receipt](evidence/p2cg1g2a-merge-20261018.json) binds both ordered parents, the matching integration tree and the docs-only main movement before the merge.
The [main proof](evidence/p2cg1g2a-mainproof-20261018.json) is a fresh run at the merge before any closure edit, after a real npm ci under Node v22.22.0, each jest run --runInBand with a private cache after machine-idle --own-pid 47516 printed MACHINE_IDLE:
the two P2CG1G2A suites plus the P2CG1G1 closure proof set together (50 suites, 783 tests = 48 + 735), the G2A suites alone (2 suites, 48), the related set (74 suites, 925), the P2CG1G1 leaves (4, 81), the Task 14 selector (4, 104), P2CG1F (3, 96), P2CG1E (3, 156), P2CG1D (4, 119), P2CG1C (2, 54), P2CG1B (2, 45), the 35 A1/A2 suites (35, 388), typecheck and the validator passed.
It references the author's 22 proof logs by hash.

P2CG1G2A has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed.

Successor release (separate from the closure): reduced P2CG1G2 moves from blocked to planned;
its only predecessor, P2CG1G2A, is main-verified with a genuine exact-main mainProof PASS in this same change set.
No other P2CG1G2 field changes. P2CG1R, P2CG1S, P2CG1H, P2C, the B15 units and every other unit state are unchanged.
Selection is not downstream admission.
This closure metadata still requires its own CI and parent merge.

---

## 2026-10-18 B14-0 fog containment registered; blocked after S

Parent adopts the scope recommendation under the standing owner instruction to
continue with recommended options, fix issues and publish as needed. Register
B14-0, "fail closed on unsupported fog delivery," as planned-gated / blocked
under R2.authority-live, with privacy, authority and replay review. Effective L1
order is P2CG1S -> B14-0 -> P2CG1H (21 units). Release B14-0 only after S genuine
exact-main PASS, fetched-main ancestry and closure; H waits for B14-0 equivalent
proof. NEXT does not enforce these documentary predecessors or grant admission.

The [scope audit](evidence/b14-fog-scope-20261018.txt) is copied byte-for-byte
(SHA-256 fa86fc77b387a9547841bf96261f4bd5becfeca92e22c3b9050b2409142c2a21).
Contain fog-on live/join/rejoin/HTTP/export before the v2.2.0 build/playtest, with
membership-first generic refusal, fixed fog-projection-unavailable reason and
WS 1008. Audited combat admission/revocation/rejoin terminal paths use 1008 for
policy, 1011 for infrastructure, and server-side detach/close. Assert serialized
strings and close arguments, no hidden reference/skill/location/construction/digest,
no data before refusal, existing sockets stopped, real server.js WS entry proof,
and unchanged fog-off two-player-plus-GM co-op. No campaign close-policy rewrite.

The literal prospective 15-file manifest is in roadmap.json. Caps remain 15 files /
500 counted added lines; remeasure at admission and split if proof or review/closure
needs more. G2A lands its shared securityBoundary.test.ts first; census S/U26 shared
Events/Replay leaves and all other holders on fresh Main. Other unit contracts change only in S/H links and H
admission text; G2A/G2, G1 and B15 fields are untouched. Full playable fog
restoration remains blocked and unscheduled as later separately registered work,
not a placeholder unit. This is registration only: no source admission, runtime
fix, fabricated sensitive approval, merge or release acceptance.

Parent review follow-up: retain the byte-pinned audit as .txt evidence, following
review-copy storage conventions. The host journal-head digest route is a mandatory
admission census item: hidden-information leakage is within B14-0 acceptance,
but matchHeadRoute.ts is not an edit leaf; required extra writes trigger a split.
Metadata-unavailable tests cover fog on/unknown and known-off configuration;
missing projection metadata alone must not refuse otherwise-authorized fog-off
reads. The real server.js WS probe is evidence-only in b14-0-local.json, with no
retained harness. Registration baseline is 76ed00c16063a2e28dba4e81bc0a2cf01af7c780;
H admission now explicitly requires B14-0 main-verified and exact-main proof.

## 2026-10-18 G1-DOC-2 and R-PRIV-1 documentary amendments proposed

Docs-only correction against Main 58e5c31b09d7d724ef409b497f3b421d41d48a29.
Only P2CG1G1.behavior and B15-6.behavior change in units.json; this entry records
why. No source, lifecycle, receipt, ownership, manifest, cap, task or L1 change.
P2CG1G2A and P2CG1G2 remain identical as parsed unit objects to Main.

G1-DOC-2 follows the F-DOC-1 (#2236, ed4d93ff9) and E-DOC-1 (#2230)
precedents: correct the description of already-merged behaviour without
rewriting historical evidence. The merged source/test leaves from #2238
(head a5b4a56a8d524cb52ca7122b087d009a6603ac92,
merge 68eb607212a099a6a707a59be6bc8654064e8534) are unchanged at this baseline.
Read both preserved independent reviews:
[evidence/p2cg1g1-source-fable-review-20261018.txt](evidence/p2cg1g1-source-fable-review-20261018.txt)
and [round 2](evidence/p2cg1g1-source-fable-review-r2-20261018.txt).
The corrected behaviour names remount re-projection before another frame,
the per-transport heard cursor recorded at consume (including legacy frames,
not a successful-settle mark), the CF-H1 immediate rejoin after a live binding
is disposed with an offer still settling, and CF-H3's not-behind predicate
(`lastSequence >= transport.lastSeq()`, permitting a legacy baseline at 0
with cursor -1). It preserves the review's outstanding carry-forwards; this
amendment supplies no new runtime, activation or closure proof.

R-PRIV-1 / PRIV-1 belongs in B15-6's remote-hosting readiness obligation,
under #2237's [registration design](../../../docs/audits/2026-10-18-b15-ob2-registration-design.md)
and [v2.2.0 topology boundary](../../../docs/releases/v2.2.0-topology.md).
Static source tracing: CampaignCoopEntryPanel posts a 1v1 layout with a
spectator host; matches/index.ts creates open human meta.seats;
joinableLobbies.ts lists that lobby with its roomCode and matchId;
bindCampaignSyncConnection.ts binds campaign membership without populating
meta.seats. GET /api/multiplayer/lobbies requires a bearer but no campaign
seat, so these codes are discoverable by authenticated strangers while the
co-op match remains in lobby status. P2CG1G2A's registered authenticated
campaignIdentity=1 read permits live-code-to-campaignId correlation without
a seat. That identity read is prospective at this baseline, not claimed shipped
by this documentary amendment, and is not changed here.

A product fix in joinableLobbies.ts or co-op session creation, with regression
proof for an authenticated stranger without a campaign seat, must land before
any remote/tunnel hosting claim. Required source/test leaves beyond the B15-6
docs/config inventory are recorded as an admission note only: re-census and
register a narrower authority/privacy slice or reviewed owning-unit amendment
within ordinary caps before implementation. No manifest expands here, and
routine B15-6 gains no product or authority/privacy grant. All ten B15 units
remain blocked at 15 files / 500 counted added lines. Same-host v2.2.0 and the
existing L1 release predicate remain unchanged; PRIV-1 is not claimed fixed.

---

## 2026-10-18 P2CG1G1 source verified on main; P2CG1G2A released; closure metadata proposed

P2CG1G1 advances from implementing to main-verified for source PR #2238,
head a5b4a56a8d524cb52ca7122b087d009a6603ac92, merge 68eb607212a099a6a707a59be6bc8654064e8534.
Its baseline remains the admission base 54764673b3eb8aaa9759bfc919461640f7e360b6 (the merge of #2236), which was still main at the merge: no rebase, and the merge is one first-parent step above it.
After the merge, #2239 (969af8de, the P2CG1G2 S3 split) changed P2CG1G1's successors to [P2CG1G2A, P2C]; #2233 (gameplay), #2237 (B15 registration, its own blocked units only), #2240 and #2241 (test-only) touched no P2CG1G1 field or leaf; this closure is based on 1aa4ea47 (G1-MAIN-1).
The owner authorized this ruling in chat, and it was posted as [comment 6246040501](https://github.com/SwiggitySwerve/MekStation/pull/2238#issuecomment-6246040501), which quotes that instruction;
its exact UTF-8 body (2208 bytes), without an added newline, hashes to cddd5c42ac337d1687ddead1a8e8fa860f70e0d072c2a9e0f161560cea448998.
The ruling (05:20:03Z) preceded the head-guarded merge (05:20:13Z), and PR #2238 carries the owner-ruled label.
PK-p2cg1g1-ruling records that ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2cg1g1-review-20261018.json) binds two independent review rounds by the same reviewer (Claude Fable 5.1 high, substituting for GPT Astra as for P2CG1E and P2CG1F; author Opus 5.5), each preserved byte for byte:
- round 1 on 59c1fa72: APPROVE-WITH-NOTES, sha256 4ad652bd9b1d7ebb853e374644f87a53b54b6718e852c46217267226e6b124cc (evidence/p2cg1g1-source-fable-review-20261018.txt);
- round 2 on the exact merged head a5b4a56a: APPROVE, sha256 1be03fca615b1ef567d9eb79ddc0d22ed0a21f8828d0b14fd5ae7b144cc05e14 (evidence/p2cg1g1-source-fable-review-r2-20261018.txt). Round 2 is the verdict of record.
Round 1 found that G1 moved a liveness hole in dormant receipt-mode code (CF-H1). Root ruled it closed in lane; the author added a test-only RED commit (8dcb9e46, 4 failed / 77 passed with the consumer and store at 59c1fa72) and the fix (a5b4a56a), closing CF-H1 (the cut design), CF-H3 ("not behind") and CF-H4.
Both rounds re-derived the ledger (13/15 files; 353/500 counted lines from 54764673; product byte-identical at each RED; no test byte changed after either RED; the C3 inversion ruled acceptable RED evidence), replayed RED independently and typechecked at RED,
and re-ran (round 2 figures on a5b4a56a; round 1 figures on 59c1fa72 are in its section 3) the registered suites, the P2CG1F suites (96/96), the Task 14 selector (104/104), the P2CG1B + C + D + E batch (344/344), the 35 A1/A2 suites (388/388), the related set (163), the 73-suite co-op sweep (764), typecheck, lint, format, lint:units, the validators, OpenSpec and a merge-tree,
and caught 7 of 12 (round 1) and 6 of 10 (round 2) independent mutants. Round 2 survivors: R2-M1 and RM-G9/RM-G4 reruns (CF-H6, CF-H5) and R2-M2 (CF-H15). Neither the author nor the reviewer ran npm run test:stable; the CI unit shards stand in for it.
The five sensitive review classes are recorded with both rounds' findings verbatim; none records a product defect at the merged head.
Lint (round 2 section 4): "| `npm run lint` (oxlint) | 87 warnings, 0 errors; 0 on G1 leaves | 87 / 0 |"
The reserved p2cg1g1-admission-review-20261018.md slot stays unwritten.

The carry-forwards are recorded verbatim under carryForwards.items in the review receipt (round 1 section 7 and round 2 section 6), with the reviewer's owner brackets and the closure's routing after the S3 split (directedTo):
closed in lane CF-H1, CF-H3, CF-H4; P2CG1G2A: CF-H12 (by-name check verification on its exact head); reduced P2CG1G2: CF-H6, CF-H11, CF-H12, CF-H16; H-directed: CF-H8; at or before P2CG1H: CF-H7, CF-H14; named owners: CF-H2, CF-H5, CF-H7, CF-H9, CF-H10, CF-H13, CF-H14, CF-H15, CF-H17 (CF-H13 and CF-H17 optional).
CF-G4, CF-G5, CF-G6 and CF-G7 continue as CF-H7, CF-H8, CF-H9 and CF-H10. CF-F1, CF-F2, CF-F4 and CF-F8 remain with their named owners and CF-F9 with P2CG1H; CF-F5 is closed.

- CF-H1 (cut settle leaves a heard mark; receipt chain stalls) [closed]: round 2 "**CF-H1 - CLOSED** in G1 by the cut design (8dcb9e46 + a5b4a56a). Residual: CF-H14."
- CF-H2 (single-slot lineage versus per-transport heard mark) [open; next owner of campaignHostFoldStore.ts; the surface is a G2 leaf]: round 2 "**CF-H2 (single-slot lineage versus per-transport heard mark) - still open** [next owner of campaignHostFoldStore.ts; the surface is a G2 leaf]. Unchanged by this round (campaign A -> B -> A still self-heals through one `adjunct-failed` rejoin). Pin the A -> B -> A case either way." Round 1 wording: "**CF-H2 (single-slot lineage versus per-transport heard mark) [next owner of campaignHostFoldStore.ts; the surface is a G2 leaf].** Campaign A -> campaign B -> campaign A on two live bound transports: B's claim replaces A's lineage, so A's rebind mints a fresh EMPTY cell while A's heard record still equals its cursor; no window is armed and the next linked offer fails `adjunct-failed` (launchFacts absent on an EMPTY-seeded fold) and rejoins. Self-healing and nothing wrong is projected (PROBE-B), but the two keys disagree. Either key the store per transport identity (a WeakMap like `heardAt`, so A's lineage survives B's claim) or make `continued === false` on a bound transport arm the window. Pin the A -> B -> A case either way."
- CF-H3 (continue only a current lineage) [closed]: round 2 "**CF-H3 - CLOSED** ("not behind", pinned in both directions; see section 3 for the PROBE-H3b conflation, no action)."
- CF-H4 (unbound transport reset pin) [closed]: round 2 "**CF-H4 - CLOSED** (same unbound transport object remount pinned; RM-G1 now caught)."
- CF-H5 (one activity predicate) [open; store + consumer owner]: round 2 "**CF-H5 (one activity predicate) - still open** [store + consumer owner]. RM-G4-rerun survives on the head." Round 1 wording: "**CF-H5 (one activity predicate) [next owner of campaignHostFoldStore.ts and useCampaignApplicationConsumer.ts].** RM-G4 survived: the store re-states the consumer's `active` condition (`transport.campaignId === campaignId && confirmApplied !== undefined`) by hand. Export one predicate from the consumer or the transport module and use it in both, or pin a fake with the mounted campaignId and no `confirmApplied` remounting -> fresh cell."
- CF-H6 (legacy-server variant of W1) [open; P2CG1G2]: round 2 "**CF-H6 (legacy-server variant of W1) - still open** [P2CG1G2]. RM-G9-rerun survives on the head; pin under fake timers: bound transport, legacy baseline and one legacy event folded by the surface, unmount, remount, 2T -> one socket, no rejoin, no window." Round 1 wording: "**CF-H6 (legacy-server variant of W1) [P2CG1G2, which binds creators while the server is still legacy].** RM-G9 survived: no row pins that a bound binding against a legacy server (campaign frames without `appliedView`) records the heard cursor, so a consumer that recorded only offers would re-arm the window on every remount in the G2 period and close a healthy legacy socket at T. Pin under fake timers: bound transport, legacy baseline and one legacy event folded by the surface, unmount, remount, 2T -> one socket, no rejoin, no window."
- CF-H7 (quiet-window cycle bound) [open; consumer owner, at or before P2CG1H]: round 2 "**CF-H7 (quiet-window cycle bound) - still open** [consumer owner, at or before P2CG1H]. The cut path routes through rejoin; when the server stays quiet the replacement's window re-enters the cycle (PROBE-A/S4: three sockets by 2T). Decide a cap, backoff or terminal state before activation." Round 1 wording: "**CF-H7 (quiet-window cycle bound) [next owner of useCampaignApplicationConsumer.ts, at or before P2CG1H].** CF-G4 carried unchanged: against a server that holds the socket open and sends no campaign frame, the consumer rejoins once per window indefinitely; decide a cap, a backoff or a terminal state and its user-facing text (CF-F8) before activation. The CF-H1 fix routes the cut-settle case back through this cycle."
- CF-H8 (binder exclusivity pin) [open (unchanged); bindCampaignSyncConnection.test.ts owner or P2CG1H]: round 2 "**CF-H8 (binder exclusivity pin) - unchanged** [bindCampaignSyncConnection.test.ts owner or P2CG1H]." Round 1 wording: "**CF-H8 (binder exclusivity pin) [next owner of bindCampaignSyncConnection.test.ts, or P2CG1H].** CF-G5 carried unchanged."
- CF-H9 (adoption versus a newer guarded row) [open (unchanged); useCampaignPersistenceStore.ts owner]: round 2 "**CF-H9 (adoption versus a newer guarded row) - unchanged** [useCampaignPersistenceStore.ts owner]." Round 1 wording: "**CF-H9 (adoption versus a newer guarded row) [next owner of useCampaignPersistenceStore.ts].** CF-G6 carried unchanged."
- CF-H10 (RED shape of the CF-F3 quiet case) [open (unchanged); hostRecordRefresh.test.tsx owner]: round 2 "**CF-H10 (RED shape of the CF-F3 quiet case) - unchanged** [hostRecordRefresh.test.tsx owner]." Round 1 wording: "**CF-H10 (RED shape of the CF-F3 quiet case) [next owner of hostRecordRefresh.test.tsx].** CF-G7 carried unchanged (that suite is byte-identical in G1)."
- CF-H11 (lint and cycles) [open (figures updated)]: round 2 "**CF-H11 (lint and cycles) - figures updated.** 87/0, no G1 leaf warned; surface 319 counted (unchanged), helpers 125, store 43 (74 physical), consumer 239 (303 physical); import graph unchanged since 59c1fa72 (172 / 169 chains carry). G2 records before/after on its leaves." Round 1 wording: "**CF-H11 (lint and cycles).** Head figures: 87 warnings / 0 errors, no G1 leaf warned; surface 319 counted lines (81 under the 400 warning), helpers 125, store 42, consumer 229; madge from the surface and consumer 1133 files / 172 chains, identical set to the baseline; four entries 169 chains, none through the new modules. G2 adds creator binding to the surface; record before/after on its leaves."
- CF-H12 (required checks) [open (figures updated)]: round 2 "**CF-H12 (required checks) - figures updated.** 32 check runs on a5b4a56a, identical multiset to 59c1fa72 and B-F, all success; protection unchanged. Verify by name on G2's exact head." Round 1 wording: "**CF-H12 (required checks).** 32 check runs on 59c1fa72, all success, names identical to B-F; protection `["Lint and Test"]`, strict false, conversation resolution required, 0 approvals; `pr-checks.yml` blob a82fe0f7 unchanged. Verify all 32 names by name on G2's exact head."
- CF-H13 (store holds one transport strongly) [open (optional)]: round 2 "**CF-H13 (store holds one transport strongly) - still open, optional.** After a cut rejoin the closed transport stays reachable through `held.transport` until the next host claim; still bounded to one." Round 1 wording: "**CF-H13 (store holds one transport strongly) [optional; next owner of campaignHostFoldStore.ts].** `held.transport` keeps the last claimed transport (and its socket and listeners) reachable after a rejoin closes it, until the next host claim. Bounded to one object; clearing `held` when its transport is no longer registered would make it zero."
- CF-H14 (new; spurious cut after a confirmed settle, latent) [new; next owner of useCampaignApplicationConsumer.ts; before any mount that gates on projected state, and in any case at or before P2CG1H]: round 2 "**CF-H14 (new; spurious cut after a confirmed settle, latent) [next owner of useCampaignApplicationConsumer.ts; before any mount that gates on projected state, and in any case at or before P2CG1H].** `settling` is released in a trailing `.then` after `settle` resolves, so a dispose scheduled as a microtask after a successful `confirm` sees `settling > 0` and marks a healthy transport cut; the next binding closes a live socket and rejoins from EMPTY (PROBE-S1). Unreachable from the shipped mounts (section 2). Fix: release the count synchronously when the step has confirmed or can no longer confirm (decrement before `confirm` and on each early return, or count "consumed and unconfirmed" precisely); pin: baseline applied, linked offer, `confirmApplied` hooked to unmount in `Promise.resolve().then` on its confirm, remount -> one socket, no rejoin."
- CF-H15 (new; same-tick dispose pin) [new; next owner of hostProjection.test.tsx]: round 2 "**CF-H15 (new; same-tick dispose pin) [next owner of hostProjection.test.tsx].** R2-M2 survived: inject a linked offer and unmount inside one `act` (before the queued step starts), remount -> rejoin, acks on socket 0 stop at the baseline, refresh never called (PROBE-S2's shape)."
- CF-H16 (new; bind only a transport bound to the mounted campaign) [new; P2CG1G2, which owns the host connect call]: round 2 "**CF-H16 (new; bind only a transport bound to the mounted campaign) [P2CG1G2, which owns the host connect call].** The host `connectStoredCampaignSyncTransport` call passes no `expectedCampaignId`, so a stored transport bound to another campaign on the same match would be bound inactive, and an inactive binding swallows offers (`return isOffer(message)`) that nothing confirms, cuts or hears. F-era code, not a G1 regression, but G2 should pass `expectedCampaignId` when it binds the creator so the stored connect refuses the mismatch (the three fixture suites already exercise that branch)."
- CF-H17 (new, optional; re-projection at a cut remount) [new (optional); surface/store owner]: round 2 "**CF-H17 (new, optional; re-projection at a cut remount) [surface/store owner].** A cut remount re-projects the retained fold for the instant before the rejoin's replacement baseline (PROBE-RP). Display-only; skipping it would need the consumer to expose cut-ness to the surface. Record, do not chase."
- Not binding G2 (round 2 section 6 closing paragraph): "CF-F1, CF-F2, CF-F4, CF-F8 remain with their named owners; CF-F9 with P2CG1H; CF-F5 closed. None binds G2 except where G2 owns the leaf."
- Documentary G1-DOC-1: "**G1-DOC-1 (runtime in the red receipt) [parent, at closure].** `evidence/p2cg1g1-red-20261018.json` records `runtime.node: v24.15.0`; the local receipt, the PR body and G1-PREP record v22.22.0 for every run, and both versions are installed under nvm. The red log carries no version line, so which one ran RED cannot be derived; my replay on v22.22.0 reproduces the same 3 failed / 73 passed with the same titles and shapes, so the result is not in question, but the closure should state the version actually used and the ledger's runtime contract (v22.22.0)."
- Documentary G1-DOC-2: "**G1-DOC-2 (behaviour text) [parent, at closure].** The registered P2CG1G1 behaviour text (as amended by #2236) says the consumer "remembers transports that already delivered a campaign frame" and that the lineage continues on a rebind, but names neither the narrower cursor-watermark semantics the admission receipt's `heardSemantics` chose (a transport is heard only while every campaign frame it dispatched reached an active binding, with the two gap rows), nor the remount re-projection of the retained fold (R2), which is a shipped product behaviour and a design choice this review accepts (section 6 item 1). Record both at closure, as F-DOC-1 was."
- Documentary G1-DOC-3: "**G1-DOC-3 (hook skip undisclosed in the ledger).** The admission commit was made with hooks skipped (disclosed in the handoff to this review, not in any receipt or the PR body). The pre-commit's lint-staged matchers cover no JSON path, so nothing was bypassed; record it as the F/E receipts recorded their own disclosures."
- Minor M1: "**M1 (surface comment).** The surface's host-join comment now says "a reused one ignores the cursor"; true (the stored connect returns the existing transport without reading `lastSeq`), and worth keeping accurate when G2 changes the connect."
- Note N1 (round 1): "**N1.** The implementation was drafted before the gate (G1-PREP, stop report) and committed 7 min after RED; the ledger order and byte identities hold."
- Note N2 (round 1): "**N2.** The mojibake RED run is kept uncited; the cited run followed a fresh idle reading; the baseline em-dash bytes are intact at the head."
- Note N3 (round 1): "**N3.** The post-green type-only import reorder in `campaignCoopSurfaceHelpers.ts` was followed by full re-runs on the final bytes (idle.log 21:32-21:33, before the 21:35 commit); the `*-pre-typeimport.log` files are kept uncited; the author's mutants ran on the final consumer and store bytes, which the reorder did not touch."
- Note N4 (round 1): "**N4.** The author's three mutants stand; AM1 and AM3 re-run here agree (M2's class is covered by RM-G2/RM-G7)."
- Note N5 (round 1): "**N5.** `installReusedBoundTransport` replaces the mocked stored connect with a registry lookup, so hostProjection exercises the reuse path but not the real `existing.campaignId !== expectedCampaignId -> null` branch; the three fixture suites exercise that branch directly against the real function."
- Note N6 (round 1): "**N6.** The admission receipt cites the #2236 review report hash (dfc24912...) and F's closure merge bc7abfc4 as ancestors of the baseline; both ancestry claims hold (54764673 is the merge of #2236, which was rebased onto bc7abfc4)."
- Note N7 (round 1): "**N7.** The B-E and A1/A2 rows in section 3 are this review's runs, not the author's; the closure should cite them from here."
- Note N-R2-1: "**N-R2-1 (round-1 correction).** Round 1 wrote that the "record heard only after confirm" fix shape "recovers [the cut-settle case] like F"; it recovers only the quiet remount. Its `probe-fixshape.log` ran PROBE-A alone (the one failure in that log was my PROBE-B's own guard), so PROBE-A2 under the shape was never measured. The author's 3/43 is reproduced here and the shape is withdrawn in favour of the cut design."
- Note N-R2-2: "**N-R2-2.** The parent ruling asked for CF-H1 as a red-first pair; the author delivered CF-H3 and CF-H4 inside the same pair. That is within the ruling ("if cheap") and the RED commit stays test-only, so no separate ledger step was owed."
- Note N-R2-3: "**N-R2-3.** The review RED has no stage receipt of its own; its failing titles, log hash and runtime note live in the local receipt's `reviewFollowUp`. units.json's `stageReceipts` has one `red` slot and the historical red receipt is deliberately unedited (G1-DOC-1); the closure should cite `reviewFollowUp.red` as the RED evidence for the CF-H rows."
- Note N-R2-4: "**N-R2-4.** The author's new logs are UTF-16 LE with BOM (PowerShell redirection); hashes reconcile as bytes. The receipt's `commits.reviewRed/reviewFix` use 9-character SHAs where the ledger elsewhere uses 40-hex; the PR commit list disambiguates."
- Note N-R2-5: "**N-R2-5.** B-E (344) and A1/A2 (388) were run here, not by the author, in both rounds; the closure should cite this report for those rows on the final head."

Root notes (not reviewer text; recorded under successorNotes.P2CG1G2A.openNotes):

- G1-DOC-2 (Root): The registered P2CG1G1 behaviour text (as amended by #2236) says the consumer "remembers transports that already delivered a campaign frame" and that a host rebind on a live bound transport continues the lineage. It does not name four behaviours the merged head ships: (1) the cursor-watermark heard semantics the admission receipt's heardSemantics chose (a transport counts as heard only while the campaign frames it dispatched reached an active binding and its cursor has not moved since; round 1 section 8 G1-DOC-2 and section 2 item 5); (2) the remount re-projection of a continued fold onto the campaign store at bind (R2; round 1 section 6 item 1 accepts it); (3) the CF-H1 cut, which Root required in lane: a live binding disposed with an offer still settling marks its transport cut, and the next active binding on that transport rejoins at once (round 2 section 2); and (4) the CF-H3 "not behind" continuation: a lineage continues only when its fold's lastSequence is not behind transport.lastSeq() (round 2 section 3). A parent documentary correction of P2CG1G1's behaviour text follows as a separate PR, as #2230 did for E-DOC-1 and #2236 did for F-DOC-1. This closure does not edit P2CG1G1's behaviour text (own-lifecycle authority does not cover it); the correction is documentary and changes no reviewed behaviour or proof recorded here.
- G1-DOC-1/G1-DOC-3 (Root): G1-DOC-1 (the red receipt's runtime.node v24.15.0 is the receipt-writing script's process.version; every Jest run, RED included, prepended the v22.22.0 path) and G1-DOC-3 (the admission commit a62fc69c was made with core.hooksPath=NUL; the pre-commit lint-staged matchers cover no JSON path) were ruled to the local receipt and are recorded there under reviewFollowUp, which round 2 section 1 item 11 verified. The historical red receipt is not edited. Nothing further travels.
- G1-MAIN-1 (Root): After the head-guarded merge, main moved by five first-parent merges before this closure: #2239 (969af8de, the P2CG1G2 S3 split amendment) changed P2CG1G1's successors from [P2CG1G2, P2C] to [P2CG1G2A, P2C] and registered P2CG1G2A with predecessor P2CG1G1; #2233 (e52000e3, a gameplay turn-rail fix) touched no ledger file; #2237 (c962217b, the B15 registration) changed units.json and roadmap.json for its own blocked B15 units only, leaving P2CG1G1, P2CG1G2A, reduced P2CG1G2, P2CG1H and PK-p2cg1f-ruling unchanged; #2240 (a104208d) and #2241 (1aa4ea47) are test-only. None touched a P2CG1G1 leaf. This closure is based on 1aa4ea47; the main proof ran on the exact merge 68eb6072. Every P2CG1G1 leaf is byte-identical at 68eb6072 and 1aa4ea47.

All 32 checks on the merged head succeeded (run 39097496338); the 32 names equal P2CG1F's and match pr-checks.yml one to one:
Detect Changes; Install Dependencies; Lint; Format Check; Validate Roadmap Ledger; Type Check; Unit Tests (1/6); Unit Tests (2/6); Unit Tests (3/6); Unit Tests (4/6); Unit Tests (5/6); Unit Tests (6/6); Perf Smoke Tests; Statistical Proof PR; Perf Budget PR; Coverage Floor; A11y Tests; Validate BV Parity; Validate Combat Suite; Build Storybook; Schema Bridge; Determinism Audit; E2E Smoke; Seam Anchors; Customizer Regressions; Desktop Type Check; Desktop Tests; Lint and Test; Prepare Build Artifacts; Build Test / linux; Build Test / mac; Build Test / win.
GitHub enforces only Lint and Test; each name was verified individually.
The [merge receipt](evidence/p2cg1g1-merge-20261018.json) binds both ordered parents, the matching integration tree and the post-merge main record (G1-MAIN-1).
The [main proof](evidence/p2cg1g1-mainproof-20261018.json) is a fresh run at the merge before any closure edit, after a real npm ci under Node v22.22.0, with a private jest cache:
the four registered test leaves, P2CG1F's three, P2CG1E's three, P2CG1C's two, P2CG1B's two, P2CG1D's four and the 35 A1/A2 suites together (48 unique suites, 735 tests), the four leaves alone (4 suites, 81 tests),
the Task 14 selector alone (4 suites, 104 tests), the P2CG1F leaves alone (3 suites, 96 tests), the P2CG1E leaves alone (3 suites, 156 tests), the P2CG1D leaves alone (4 suites, 119 tests), the P2CG1C leaves alone (2 suites, 54 tests), the P2CG1B leaves alone (2 suites, 45 tests), the 35 suites alone (35 suites, 388 tests), typecheck and the validator passed.
It references the author's 37 proof logs by hash.

P2CG1G1 has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CG1G1 therefore releases
its in-flight src/components/campaign/coop and src/lib/campaign reservations at main-verified.

Successor release (separate from the closure): P2CG1G2A moves from blocked to planned;
its only predecessor, P2CG1G1, is main-verified with a genuine exact-main mainProof PASS in this same change set.
No other P2CG1G2A field changes. Reduced P2CG1G2, P2CG1R, P2CG1S, P2CG1H, P2C and every other unit state are unchanged.
Selection is not downstream admission.
This closure metadata still requires its own CI and parent merge.

---

## 2026-10-18 P2CG1F source verified on main; P2CG1G1 released; closure metadata proposed

P2CG1F advances from implementing to main-verified for source PR #2234,
head 66240745192f483f2ee1adfabfd9a30f09b13a63, merge fd9891e161ee13ab8e3a62c56a5f9029bc5fa127.
Its baseline remains the admission base 3b80a8bff25ca474f766a5dc7efb290353697946 (the merge of #2229). Before RED the admission commit was rebased onto 27eca6c10325885fef568212b29151e8ef972988 (the merge of #2230), which is the merge-base with the merge's first parent 8dc6b82b2179f10e704ebf39ccf5b27f68b50b0a (the merge of #2232; #2231 and #2232 touch no P2CG1F leaf).
The owner authorized this ruling in chat, and it was posted as [comment 6244750389](https://github.com/SwiggitySwerve/MekStation/pull/2234#issuecomment-6244750389), which quotes that instruction;
its exact UTF-8 body (2241 bytes), without an added newline, hashes to c68bd921ab3a491fea9dd357608a97a8868747ac18dcf9c2a51e4baa7846ac81.
The ruling (02:31:25Z) preceded the head-guarded merge (02:31:32Z), and PR #2234 carries the owner-ruled label.
PK-p2cg1f-ruling records that ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2cg1f-review-20261018.json) binds the independent review of the exact merged head, preserved byte for byte
(APPROVE-WITH-NOTES, no blockers, documentary defects F-DOC-1 and F-DOC-2, minors M1-M2, notes N1-N6; reviewer Claude Fable 5.1 high, substituting for GPT Astra as for P2CG1E; author Opus 5.5; sha256 51949e2635b4203fc2bad1814975e908ee288aedf54dc53fbb06f5e88d36f023).
It records the five sensitive review classes (authority, privacy, replay, idempotency, concurrency) with the reviewer's section 5 findings verbatim; none records a product defect.
The reviewer re-derived the ledger discipline (admission freeze first, product byte-identical at red, no test byte changed after red, 9 changed + 1 reserved = 10/15 files, 36/500 counted lines from 27eca6c1),
replayed RED independently (5 failed / 73 passed, titles identical to the receipt) and typechecked at RED,
re-ran the three registered suites (78/78), the Task 14 selector (104/104), the P2CG1B + C + D + E suites (344/344), the 35 A1/A2 suites (388/388), the 82 related suites, typecheck, lint, format, madge, the validators, OpenSpec and a merge-tree against 8dc6b82b,
and caught 4 of 8 independent mutants. Of the four survivors, RM-F6 (an offer ends the window) and RM-F2 (a heartbeat does not) are coverage gaps that matter once receipt mode is live (CF-G1, CF-G2), and RM-F1 and RM-F8 are near-equivalent timer handles (CF-G8). Neither the author nor the reviewer ran npm run test:stable; the CI unit shards stand in for it.
Lint (review section 3): "87 warnings, 0 errors; `useCampaignPersistenceStore.ts` max-lines 991 counted (990 at baseline, already warned); the consumer is not warned"
The reserved p2cg1f-admission-review-20261018.md slot stays unwritten.

The review's carry-forward wording for P2CG1G1 is recorded verbatim under successorNotes.P2CG1G1 in the review receipt:
section 7 items 1-11 and its closing paragraph, and F-DOC-1, F-DOC-2, minors M1-M2 and notes N1-N6 from section 8.
CF-G4 is directed at the next owner of useCampaignApplicationConsumer.ts, CF-G5 at the next owner of bindCampaignSyncConnection.test.ts or P2CG1H, CF-G6 at the next owner of useCampaignPersistenceStore.ts, and CF-G7 and CF-G8 at the next owner of hostRecordRefresh.test.tsx, as the review's owner brackets say. CF-G3 binds G1's m8 P1 case, and any fix it needs lives in an F leaf that G1 does not own.
CF-F1, CF-F2, CF-F4 and CF-F8 remain with their named owners and CF-F9 with P2CG1H; CF-F5 is closed by #2230.

- P2CG1G1 CF-G1 (offer ends the window pin): "**CF-G1 (offer ends the window pin).** RM-F6 survived: a consumer that cleared the quiet window only on legacy frames passes all 49 cases, because every receipt-mode case runs on real timers and finishes inside 60 s. Once a creator binds (G2) and the port is installed (H), that mutant would rejoin every bound view 60 s after its baseline. Pin under fake timers in `hostProjection.test.tsx` (a G1 leaf): bound transport, baseline offer injected, advance `2 * APPLICATION_CONFIRMATION_TIMEOUT_MS` -> one connect, socket open, `jest.getTimerCount()` shows no armed window."
- P2CG1G1 CF-G2 (non-campaign frames do not end the window pin): "**CF-G2 (non-campaign frames do not end the window pin).** RM-F2 survived: clearing on any frame passes all 49 cases. The server lifecycle sends `Heartbeat` frames on its cadence (`ServerMatchSocketLifecycle.ts:148`) and the GM arm sends `CampaignProposal` frames, so that mutant would silently disable the pre-receipt timeout against a hung receipt-mode server. Pin under fake timers in `hostProjection.test.tsx`: inject a Heartbeat (and a proposal or non-application Error) with no campaign frame -> the window still fires at T."
- P2CG1G1 CF-G3 (rebind on a live bound transport re-arms the window): "**CF-G3 (rebind on a live bound transport re-arms the window).** G1 registers the P2CF2 m8 P1 case (host rebind on a live bound transport continuing the lineage). Every `bind` arms a fresh 60 s window regardless of what the transport has already heard; a rebind on a latched, quiet transport (a GM reading the screen for a minute) would therefore close a healthy socket and rejoin from EMPTY, and a real-timer m8 P1 case will not see it. G1 must run its P1 case across one window under fake timers and either prove no spurious rejoin or record the design. A fix, if one is needed, lives in `useCampaignApplicationConsumer.ts` (an F leaf, not G1's): e.g. arm the window only when the transport has not yet delivered a campaign frame, which needs a transport-level or fold-store "heard" marker. Register a successor or an amendment rather than editing an unowned leaf."
- P2CG1G1 CF-G4 (quiet-window cycle bound) [next owner of useCampaignApplicationConsumer.ts]: "**CF-G4 (quiet-window cycle bound) [next owner of useCampaignApplicationConsumer.ts].** Against a server that holds the socket open and sends no campaign frame (the binder's silent `open() === false` return at `bindCampaignSyncConnection.ts:1252` is one such path), the consumer rejoins once per window indefinitely. Bounded and in the same class as the existing immediate rejoin on a refusal, but decide a cap, a backoff or a terminal state (and its user-facing text, which CF-F8 also owes) before activation."
- P2CG1G1 CF-G5 (binder exclusivity pin) [next owner of bindCampaignSyncConnection.test.ts, or P2CG1H]: "**CF-G5 (binder exclusivity pin) [next owner of bindCampaignSyncConnection.test.ts, or P2CG1H].** The "any campaign frame ends the window" rule relies on a bound, membership-admitted receipt-mode connection never receiving a legacy campaign frame before its first offer (`bindCampaignSyncConnection.ts:1244-1249`, `:1276`, `:1412`). Pin it server-side: with the port installed, a bound join's first campaign frame carries `appliedView`, and `joinMember` is never invoked for that socket."
- P2CG1G1 CF-G6 (adoption versus a newer guarded row) [next owner of useCampaignPersistenceStore.ts]: "**CF-G6 (adoption versus a newer guarded row) [next owner of useCampaignPersistenceStore.ts].** Pre-existing: `adoptFlushedRevision` has no `held.baseVersion > record.version` guard of the kind `runSave` applies, so if a guarded refresh adopts a newer row while the reconciliation's proven read is still in flight, the adoption resets the token to `flushed.baseVersion + 1` and the next save takes the 409 path. Narrow (co-op/non-co-op crossing within one GET latency), never a silent overwrite; consider mirroring the `runSave` guard when the leaf next opens."
- P2CG1G1 CF-G7 (RED shape) [next owner of hostRecordRefresh.test.tsx]: "**CF-G7 (RED shape) [next owner of hostRecordRefresh.test.tsx].** Guard the CF-F3 quiet case's `connection.acks(1)` (e.g. `connection.sockets[1] ? ... : []`) so a regression fails on the `connects` assertion rather than a TypeError."
- P2CG1G1 CF-G8 (timer-handle pins, optional) [next owner of hostRecordRefresh.test.tsx]: "**CF-G8 (timer-handle pins, optional) [next owner of hostRecordRefresh.test.tsx].** RM-F1 and RM-F8 survived as near-equivalents: pin `jest.getTimerCount()` unchanged across a rejoin (the old binding's window is gone before the new one arms), and no window armed when the binding is inactive (unbound transport). Test-only; the product already behaves this way."
- P2CG1G1 CF-G9 (lint and cycles): "**CF-G9 (lint and cycles).** Head figures: 87 warnings / 0 errors; `useCampaignPersistenceStore.ts` max-lines 991 counted (990 at baseline); madge from F's two leaves 1100 files / 173 chains, identical set. G1's m13 helper extraction is what keeps the surface under the warning; record before/after on G1's leaves."
- P2CG1G1 CF-G10 (required checks): "**CF-G10 (required checks).** 32 check runs on 66240745, all success, names identical to B/C/D/E; protection `["Lint and Test"]`, strict false, conversation resolution required, 0 approvals; `pr-checks.yml` blob a82fe0f7 unchanged. Verify all 32 names by name on G1's exact head."
- P2CG1G1 CF-G11 (G1 fake transports and the window): "**CF-G11 (G1 fake transports and the window).** G1 gives the three hand-built fake transports a `campaignId` so G2's binding does not detach them. Once they carry the mounted campaignId and `confirmApplied`, `active` becomes true and every mount arms a 60 s window on a fake that may never send a campaign frame; those suites must either inject a campaign frame, run on real timers, or dispose before T, and G1 should say which."
- Not binding G1 (section 7 closing paragraph): "CF-F1, CF-F2, CF-F4 and CF-F8 remain with their named owners; CF-F9 remains with P2CG1H; CF-F5 is closed by #2230. None of them binds G1 except where G1 owns the leaf (none of those four leaves is a G1 leaf)."
- Documentary F-DOC-1: "**F-DOC-1 (behaviour text) [parent, at closure].** The registered P2CG1F behaviour text names CF13, CF12, CF14 (as "bumps loadGeneration ... or refuses a guarded adoption ...") and the three pins, but not the CF-F3 pre-receipt quiet window the unit ships (a 60 s `setTimeout` armed per bound binding, cleared by the first campaign frame, rejoin or dispose), which the admission receipt absorbed from my E carry-forward. The closure should (a) add the window to the behaviour text and (b) record that the CF14 generation bump was the option taken. Own-lifecycle authority does not cover either; a parent documentary change, as for E-DOC-1."
- Documentary F-DOC-2: "**F-DOC-2 (baseline fields) [parent, at closure].** units.json records `baseline: 3b80a8bf` while the branch's parent is 27eca6c1 and the admission receipt's units.json hash is 3b80a8bf's. The closure should record both commits and the rebase, as the red and local receipts already do."
- Minor M1: "**M1 (cosmetic).** If `rejoin` threw from inside the chain's catch (only `transport.close()` or the hook could), the chain would stay rejected until the next step's catch; a `try` around the close in `rejoin` would make the chain unconditionally resolved. Not this PR."
- Minor M2: "**M2 (idle.log encoding).** The author's append-only `idle.log` switches from UTF-8 to UTF-16 part-way (PowerShell default encoding on a later append); the bytes hash as recorded and the readable prefix carries the discarded-run disclosure. Cosmetic."
- Note N1: "**N1.** The admission receipt's units.json hash is the 3b80a8bf blob; disclosed with the rebase (section 1 item 7)."
- Note N2: "**N2.** The red receipt's `idle.log` hash is the 1520-byte prefix of the 2578-byte log (verified); the local receipt hashes the full file."
- Note N3: "**N3.** The implementation was drafted before the gate and committed 7 min after RED, as F-PREP discloses; the ledger order and byte identities hold."
- Note N4: "**N4.** The author's overlapped first RED attempt is kept as `red-overlapped-discarded.log` and not cited; the cited run followed a clean idle reading."
- Note N5: "**N5.** The 2 pending in the related run are pre-existing (same as the author's run and the E review)."
- Note N6: "**N6.** The author's mutation runs used a single suite with bail (skipped counts in `mutants.log`); their 9/9 caught stands, and my re-runs of the overlapping probes agree."

Root notes (not reviewer text; recorded under successorNotes.P2CG1G1.openNotes):

- F-DOC-1 (Root): The registered P2CG1F behaviour text names CF13, the CF12 consumer half, CF14 (as "bumps loadGeneration in adoptFlushedRevision, or refuses a guarded adoption whose version is older than baseVersion") and the m7, m8 and m12 pins, but not the CF-F3 pre-receipt quiet window the unit ships: one APPLICATION_CONFIRMATION_TIMEOUT_MS (60 s) timer armed per bound binding, cleared by the first campaign frame, by rejoin and by dispose, which the admission absorbed from the P2CG1E review carry-forward CF-F3 (review section 2 item 3 and section 6 item 1). Part (b) is recorded here: of the two CF14 options the text offers, P2CG1F took the loadGeneration bump in adoptFlushedRevision, placed after the response.ok, version and envelope-digest proofs (review section 2 item 4 and section 6 item 2, which rules the bump the better of the two); the guarded-adoption refusal was not implemented. For part (a), a parent documentary correction of P2CG1F's behaviour text follows as a separate PR, as #2230 did for E-DOC-1. This closure does not edit P2CG1F's behaviour text (own-lifecycle authority does not cover it); the correction is documentary and changes no reviewed behaviour or proof recorded here.
- F-DOC-2 (Root): units.json records P2CG1F baseline 3b80a8bff25ca474f766a5dc7efb290353697946 (the merge of #2229, the P2CG1E closure that released F), the commit the admission was measured on: the admission receipt's frozen units.json hash df761eb69d9e58e6d4b6f88902a6e894d17f39f7a7b6f25c1bd72f1739b54041 is that commit's units.json blob. Before RED the admission commit was rebased onto 27eca6c10325885fef568212b29151e8ef972988 (the merge of #2230, the E-DOC-1 documentary correction, one first-parent merge above the baseline), as the local receipt's commits.admission and rebase entries record (ea4286c0 -> 6a7f9e79). 27eca6c1 is the parent of the admission commit 6a7f9e79 and merge-base(head, first merge parent). At 27eca6c1 units.json hashes 177cf8dd80a71827fd4304640fe3f0847070772ef7073579bffc11b989a5d775, differing by #2230's one P2CG1E sentence; #2230 touched only units.json and evidence/p2cg1e-sessionid-caller-documentary-correction-20261018.json, and the five F leaves are byte-identical at both commits. F's census is measured from 27eca6c1, as the local receipt and review section 1 item 5 state. This closure records both commits and the rebase in the merge receipt (baselineAndRebase) and here. The units.json baseline field keeps 3b80a8bf, the measured admission baseline, and the admission receipt is not rewritten.

All 32 checks on the merged head succeeded (run 39088131434); the 32 names equal P2CG1E's and match pr-checks.yml one to one:
Detect Changes; Install Dependencies; Lint; Format Check; Validate Roadmap Ledger; Type Check; Unit Tests (1/6); Unit Tests (2/6); Unit Tests (3/6); Unit Tests (4/6); Unit Tests (5/6); Unit Tests (6/6); Perf Smoke Tests; Statistical Proof PR; Perf Budget PR; Coverage Floor; A11y Tests; Validate BV Parity; Validate Combat Suite; Build Storybook; Schema Bridge; Determinism Audit; E2E Smoke; Seam Anchors; Customizer Regressions; Desktop Type Check; Desktop Tests; Lint and Test; Prepare Build Artifacts; Build Test / linux; Build Test / mac; Build Test / win.
GitHub enforces only Lint and Test; each name was verified individually.
The [merge receipt](evidence/p2cg1f-merge-20261018.json) binds both ordered parents, the matching integration tree and the baseline/rebase record (F-DOC-2).
The [main proof](evidence/p2cg1f-mainproof-20261018.json) is a fresh run at the merge before any closure edit, after a real npm ci under Node v22.22.0, with a private jest cache:
the three registered test leaves, P2CG1E's three leaves, P2CG1C's two leaves, P2CG1B's two leaves, P2CG1D's four leaves and the 35 A1/A2 suites together (45 unique suites, 679 tests), the three leaves alone (3 suites, 78 tests),
the Task 14 selector alone (4 suites, 104 tests), the P2CG1E leaves alone (3 suites, 156 tests), the P2CG1D leaves alone (4 suites, 119 tests), the P2CG1C leaves alone (2 suites, 54 tests), the P2CG1B leaves alone (2 suites, 45 tests), the 35 suites alone (35 suites, 388 tests), typecheck and the validator passed.
It references the author's proof logs by hash.

P2CG1F has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CG1F therefore releases
its in-flight src/components/campaign/coop and src/stores/campaign reservations at main-verified.

Successor release (separate from the closure): P2CG1G1 moves from blocked to planned;
its only predecessor, P2CG1F, is main-verified with a genuine exact-main mainProof PASS in this same change set.
No other P2CG1G1 field changes. P2CG1G2, P2CG1H, P2C and every other unit state are unchanged.
Selection is not downstream admission.
This closure metadata still requires its own CI and parent merge.

---

## 2026-10-18 P2CG1E source verified on main; P2CG1F released; closure metadata proposed

P2CG1E advances from implementing to main-verified for source PR #2228,
head 5032b491162b2d082acfe2a33be5063a558ba326, merge 696f87f4ae06714e773c046df1185757f11686a6.
Its baseline remains the admission base a64c6f1c9e77ecf2d6be38f2dd00316241557a85 (the merge of #2226); the merge's first parent is b843b5ac465ee84c30b4e05e1cbf4d99c3a54b4b (the merge of #2227, which touches no P2CG1E leaf).
The owner authorized this ruling in chat, and it was posted as [comment 6243490372](https://github.com/SwiggitySwerve/MekStation/pull/2228#issuecomment-6243490372), which quotes that instruction;
its exact UTF-8 body (1615 bytes), without an added newline, hashes to 3477f8b57325ee6e3335f7616904b3bb120c8e5b952ffb848b8d6eb0d44b89a9.
The ruling (00:04:16Z) preceded the head-guarded merge (00:04:24Z), and PR #2228 carries the owner-ruled label.
PK-p2cg1e-ruling records that ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2cg1e-review-20261018.json) binds the independent review of the exact merged head, preserved byte for byte
(APPROVE-WITH-NOTES, no blockers, minors M1-M3, notes N1-N6; reviewer Claude Fable 5.1 high, substituting for GPT Astra; author Opus 5.5; sha256 238f2b8cec082ba78e9a67926f566bfda305b7cada398e1a497a85951755b4f3).
It records the five sensitive review classes (authority, privacy, replay, idempotency, concurrency) with the reviewer's section 5 findings verbatim; none records a product defect, and the three unpinned cases they name (RM-E2, RM-E4, RM-E5) are carried as CF-F1 and CF-F2.
The reviewer re-derived the ledger discipline (admission freeze first, product byte-identical at red, no test byte changed after red, 11 changed + 1 reserved = 12/15 files, 192/500 counted lines),
replayed RED independently (17 failed / 139 passed, titles identical to the receipt),
re-ran the three registered suites (156/156), the Task 14 selector (104/104), the P2CG1C (54/54), P2CG1B (45/45) and P2CG1D (119/119) suites, the 35 A1/A2 suites (388/388), the four client callers (27/27), the 200 related suites, typecheck, lint, format, lint:units, madge, the validators and OpenSpec,
and caught 4 of 8 independent mutants; the four survivors (RM-E2, RM-E4, RM-E5, RM-E8) are coverage gaps, not product defects (CF-F1, CF-F2). Neither the author nor the reviewer ran npm run test:stable; the CI unit shards stand in for it.
Lint (review section 3): "87 warnings, 0 errors; warning-site multiset identical to the author's baseline log; `campaignSyncTransport.ts` max-lines 661 counted (618 at baseline, already warned); route, gate and create not warned"
The reserved p2cg1e-admission-review-20261017.md slot stays unwritten.

The review's carry-forward wording for P2CG1F is recorded verbatim under successorNotes.P2CG1F in the review receipt:
section 7 items 1-9 and its closing paragraph, and minors M1-M3 and notes N1-N6 from section 8.
CF-F9 is directed at P2CG1H; CF-F1 and CF-F4 at the next owner of campaignLaunchAuthorityRoute.test.ts, CF-F2 at the next owner of campaignSyncTransport.test.ts, CF-F5 at the parent and CF-F8 at the next owner of the launch-page/dashboard client leaves, as the review's owner brackets say.

- P2CG1F CF-F1 (no-second-switch pin) [next owner of campaignLaunchAuthorityRoute.test.ts]: "**CF-F1 (no-second-switch pin) [next owner of campaignLaunchAuthorityRoute.test.ts].** RM-E2 survived: keying the route on `getCampaignHostRegistry().get(sessionId)?.launch != null` instead of the port passes all 60 cases, because every receipt fixture has a rebuilt entry with a view. Pin: port installed, no registry entry for the session (dispose before the call) -> the receipt branch is still taken (`prepare` called, `evidence-unavailable`/`participants-behind` answer, never the legacy cursor gate)."
- P2CG1F CF-F2 (terminal-signal pins) [next owner of campaignSyncTransport.test.ts]: "**CF-F2 (terminal-signal pins) [next owner of campaignSyncTransport.test.ts].** Pin (a) recovery then remote close emits no second `recovery-required` (RM-E5); (b) an `unknown-receipt` refusal that arrives before any ACK was sent recovers (RM-E4), or record the opposite decision; (c) `jest.getTimerCount()` stays at one armed wait across two consecutive ACKs (RM-E8). All three are test-only; the product already behaves this way."
- P2CG1F CF-F3 (consumer rejoin contract): "**CF-F3 (consumer rejoin contract).** F consumes the `recovery-required` signal. The transport emits it twice: as the returned `CampaignAppliedResult` from `complete`/`drain`, and as an `Error` whose message is `Campaign application recovery required: <reason>` through `onError`. Reasons now: `application-refused`, `head-drift-exhausted`, `confirmation-timeout`, `socket-closed`, `send-failed`, `prefix-conflict`, `pending-overflow`, `application-failed`. Match on the typed result or the fixed prefix, not on free text; a typed error class is worth adding when the transport leaf next opens. A remote close before receipt mode latches emits no signal by design (legacy close kept), so F must own its own pre-receipt timeout, and F must not reconnect in a loop on `socket-closed` without the consumer's say (the transport never reconnects itself)."
- P2CG1F CF-F4 (await the async handler) [next owner of campaignLaunchAuthorityRoute.test.ts]: "**CF-F4 (await the async handler) [next owner of campaignLaunchAuthorityRoute.test.ts].** Sixteen legacy call sites (`callSignedPreflight` at `:836` and the `post` users at `:374`, `:397`, `:423`, `:436`, `:464`, `:480`) call `handler(req, res)` without `await` and read `result` synchronously. Make them `await` (and `callSignedPreflight` async) so a future await on the legacy path cannot silently zero the status."
- P2CG1F CF-F5 (E-DOC-1) [parent]: "**CF-F5 (E-DOC-1) [parent].** Correct the P2CG1E behaviour text: replace "no shipped client sends sessionId, so the session-bearing P2CB preflight is exercised only by tests until a client does" with the fact that `missionLaunchPage.launch.ts` (via `resolveLaunchForces`/`requestLaunchAuthority`) and `fastForwardCombatRunner.ts` send `sessionId` and the dashboard does not. Own-lifecycle authority does not cover it; a separate documentary change is in flight."
- P2CG1F CF-F6 (lint and cycles): "**CF-F6 (lint and cycles).** Head figures: 87 warnings / 0 errors, warning-site multiset identical to baseline; `campaignSyncTransport.ts` max-lines 661 counted (618 at baseline); madge from E's four leaves 1089 files / 176 chains, identical set. Record before/after on F's leaves."
- P2CG1F CF-F7 (required checks): "**CF-F7 (required checks).** 32 check runs on 5032b491, all success, names identical to B/C/D; protection `["Lint and Test"]`, strict false, conversation resolution required, 0 approvals; `pr-checks.yml` blob a82fe0f7 unchanged. Verify all 32 names by name on F's exact head."
- P2CG1F CF-F8 (receipt-mode conflict wording) [next owner of the launch-page/dashboard client leaves]: "**CF-F8 (receipt-mode conflict wording) [next owner of the launch-page/dashboard client leaves].** Decide the user-facing text for `reason` values `participants-behind`, `fresh-request`, `evidence-unavailable` and the precedence reasons; the card currently prints the code verbatim."
- P2CG1F CF-F9 (activation note) [P2CG1H]: "**CF-F9 (activation note) [P2CG1H].** When H installs the port, record that the launch-authority route is an unauthenticated read-only preflight (as it was under legacy) answering code-only, and that the authenticated create door is the only mutation; H's boot-order pins (CF-E5) should include one HTTP preflight under the installed port with no registry entry, which is the production shape before any socket connects."
- Not binding F (section 7 closing paragraph): "CF-E1, CF-E5 and CF-E6 remain with P2CG1H (recorded under successorNotes.P2CG1H); CF-E7 remains with the next owner of `bindCampaignSyncConnection.test.ts`; H-OPEN-1 travels to H. None of them binds F."
- Minor M1: "**M1 (cosmetic).** `prepareReceiptLaunch` returns `{ view: null, prepared: undefined }` when there is no campaign database and the route folds both into `evidence-unavailable`; a small typed result would read better. Not this PR."
- Minor M2: "**M2 (no backoff).** The three head-drift re-sends go out immediately on each refusal. Bounded and harmless at this scale; if the server ever rate-limits P2CA accepts, revisit when the leaf is open."
- Minor M3: "**M3 (double initialize).** `createCoopMissionMatch` calls `getSQLiteService().initialize()` and `runCoopMissionCreate` calls it again; idempotent."
- Note N1: "**N1.** The red receipt's `idle.log` hash is the 284-byte prefix of the append-only log (verified); the local receipt hashes the full 1142-byte file."
- Note N2: "**N2.** The implementation was drafted before the gate and applied 16 s after the RED commit, as E-PREP discloses; the ledger order and byte identities hold."
- Note N3: "**N3.** My first RED-replay launch was my own script bug (whole-project Jest); stopped, restored, re-run; not evidence (section 1.3)."
- Note N4: "**N4.** RM-E8 is an equivalent mutant except for a transient handle (the superseded timer is inert by its `sent === waiting` guard and lapses within 60 s)."
- Note N5: "**N5.** The 2 pending in the related run are pre-existing (same as the author's run and the D review)."
- Note N6: "**N6.** `handleApplicationRefusal` is reached only for `Error` frames with code `INVALID_INTENT` and a `campaign-application-` reason on a bound transport in receipt mode; a `campaign-application-head-drift` with any other code is ignored as before (pinned)."

Root note (not reviewer text; recorded under successorNotes.P2CG1F.openNotes):

- E-DOC-1 (Root): The registered P2CG1E behaviour sentence "no shipped client sends sessionId, so the session-bearing P2CB preflight is exercised only by tests until a client does" is stale: missionLaunchPage.launch.ts sends sessionId through resolveLaunchForces/requestLaunchAuthority to /launch-authority (and fastForwardCombatRunner.ts forwards it when a session is supplied), as the review confirms in section 6 item 1 and carries as CF-F5, and as the local receipt records under carryForwards.E-DOC-1. A parent documentary correction of P2CG1E's behaviour text follows as a separate PR. This closure does not edit P2CG1E's behaviour text (own-lifecycle authority does not cover it); the correction is documentary and changes no reviewed behaviour or proof recorded here.

All 32 checks on the merged head succeeded (run 39079245909); the 32 names equal P2CG1D's and match pr-checks.yml one to one:
Detect Changes; Install Dependencies; Lint; Format Check; Validate Roadmap Ledger; Type Check; Unit Tests (1/6); Unit Tests (2/6); Unit Tests (3/6); Unit Tests (4/6); Unit Tests (5/6); Unit Tests (6/6); Perf Smoke Tests; Statistical Proof PR; Perf Budget PR; Coverage Floor; A11y Tests; Validate BV Parity; Validate Combat Suite; Build Storybook; Schema Bridge; Determinism Audit; E2E Smoke; Seam Anchors; Customizer Regressions; Desktop Type Check; Desktop Tests; Lint and Test; Prepare Build Artifacts; Build Test / linux; Build Test / mac; Build Test / win.
GitHub enforces only Lint and Test; each name was verified individually.
The [merge receipt](evidence/p2cg1e-merge-20261018.json) binds both ordered parents and the matching integration tree.
The [main proof](evidence/p2cg1e-mainproof-20261018.json) is a fresh run at the merge before any closure edit, after a real npm ci under Node v22.22.0:
the three registered test leaves, P2CG1C's two leaves, P2CG1B's two leaves, P2CG1D's four leaves and the 35 A1/A2 suites together (42 unique suites, 601 tests), the three leaves alone (3 suites, 156 tests),
the Task 14 selector alone (4 suites, 104 tests), the P2CG1D leaves alone (4 suites, 119 tests), the P2CG1C leaves alone (2 suites, 54 tests), the P2CG1B leaves alone (2 suites, 45 tests), the 35 suites alone (35 suites, 388 tests), typecheck and the validator passed.
It references the author's proof logs by hash.

P2CG1E has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CG1E therefore releases
its in-flight src/lib/multiplayer/server and src/pages-modules/api reservations at main-verified.

Successor release (separate from the closure): P2CG1F moves from blocked to planned;
its only predecessor, P2CG1E, is main-verified with a genuine exact-main mainProof PASS in this same change set.
No other P2CG1F field changes. P2CG1G1, P2CG1H, P2C and every other unit state are unchanged.
Selection is not downstream admission.
This closure metadata still requires its own CI and parent merge.

---

## 2026-10-17 P2CG1D source verified on main; P2CG1E released; closure metadata proposed

P2CG1D advances from implementing to main-verified for source PR #2221,
head bc87e5b3150703967e378be495cd6e8967d994d8, merge 1c49312ddcf8079c4e6560201ab58eb3b7af196f.
Its baseline remains the admission base 0cfd627c97cdce61ea8c7ed7ee06685fb8aaccb3 (the merge of the parent literal-path amendment #2220), which is also the merge's first parent.
The owner authorized this ruling in chat, and it was posted as [comment 6241608318](https://github.com/SwiggitySwerve/MekStation/pull/2221#issuecomment-6241608318), which quotes that instruction;
its exact UTF-8 body (1755 bytes), without an added newline, hashes to 145b77f394383080479b8c14ec2c7cb157114f27dca1e50a2c6c906798d7c6d4.
The ruling (21:41:49Z) preceded the head-guarded merge (21:41:56Z), and PR #2221 carries the owner-ruled label.
PK-p2cg1d-ruling records that ruling. It accepts decision point 1 only on condition that an in-span onNotCommitted hook on P2CG1B's append controls lands before P2CG1H activation, or Root records an explicit acceptance then.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2cg1d-review-20261017.json) binds the independent review of the exact merged head, preserved byte for byte
(APPROVE-WITH-NOTES, no blockers, minors M1-M3, notes N1-N5; reviewer Claude Fable 5.1 high, substituting for GPT Astra during a quota outage; author Opus 5.5; sha256 ac9583630d9828924e5a69f57d47b373b8490c7c1592d3945c3ca20eff4dce55).
It records the five sensitive review classes (authority, privacy, replay, idempotency, concurrency) with the reviewer's section 5 findings verbatim; four record no defect, and concurrency records one accepted dormant residual (decision point 1, CF-E1).
The reviewer re-derived the ledger discipline (admission freeze first, product byte-identical at red, no test byte changed after red, 13 changed + 2 reserved = 15/15 files, 385/500 counted lines),
replayed RED independently (26 failed / 93 passed, names identical to the receipt),
re-ran the four registered suites (119/119), the Task 14 selector (97/97), the P2CG1C suites (a 1 ms clock-order flake on run 1, CF-E2), the P2CG1B suites, the 35 A1/A2 suites (381/381), the 164 related suites, typecheck, lint, format, lint:units, madge, the validators and OpenSpec,
and caught 6 of 9 independent mutants; the three survivors (RM1, RM8, RM9) are release-path test pins (CF-E7, CF-E1). Neither the author nor the reviewer ran npm run test:stable; the CI unit shards stand in for it.
Lint (review section 3): "87 warnings, 0 errors; bindCampaignSyncConnection.ts max-lines 1459 counted (1321 at baseline, already warned); DurableMatchStore.ts 1394"
The reserved p2cg1d-admission-review-20261017.md slot stays unwritten.

The review's carry-forward wording for P2CG1E is recorded verbatim under successorNotes.P2CG1E in the review receipt:
section 7 items 1-11, and minors M1-M3 and notes N1-N5 from section 8.
CF-E1, CF-E5 and CF-E6 are directed at P2CG1H and CF-E7 at the next owner of bindCampaignSyncConnection.test.ts, as the review's owner brackets say.

- P2CG1E CF-E1 (in-span release on a post-admit append failure) [B leaves + binder; prerequisite or recorded acceptance for P2CG1H]: "**CF-E1 (in-span release on a post-admit append failure) [B leaves + binder; prerequisite or recorded acceptance for P2CG1H].** The admit-then-conflict and admit-then-throw paths leave M in `BEGIN IMMEDIATE` until `holdMatchConnection`'s microtask; `afterRelease` is a no-op by then. Add `onNotCommitted?: () => void` to `ICampaignAppendControls`, call it synchronously inside `appendControlledCampaignBatch`'s extend when `appended.kind !== 'committed'` and in a catch around `append()`, wire `onNotCommitted: release` in `commitGuardedProgression`, and pin `[M:BEGIN IMMEDIATE:C-open=true, guard, M:ROLLBACK:C-open=true, tick]` for a revision conflict injected after the guard admitted. None of E's seven leaves can carry this. H must not install the port before this lands or Root records the acceptance with the section 6.1 analysis."
- P2CG1E CF-E2 (coopMissionCreate.test.ts clock-order flake) [E owns the file]: "**CF-E2 (coopMissionCreate.test.ts clock-order flake) [E owns the file].** `blocks writers in other processes while C and M are held, then lets them commit` fails about one run in three (two of six recorded runs across author and reviewer) at the `>=` comparisons of child `acquiredAt` against parent `times.matchCommit` / `times.campaignRelease`. Move the two parent samples into `traceExec`'s `before` hook. Record the flake rate before and after in E's local receipt."
- P2CG1E CF-E3 (graph-local views for the HTTP doors): "**CF-E3 (graph-local views for the HTTP doors).** The API graph must build its own `createDurableCampaignLaunchView()` and never adopt `entry.launch` from the registry (another graph's handle is refused `context-mismatch`, pinned in crossGraph). Both HTTP doors key on `getCampaignHostRegistry().applicationReceipts !== null`, the same slot the binder reads; no second switch."
- P2CG1E CF-E4 (lock order and placement in the prepared create route): "**CF-E4 (lock order and placement in the prepared create route).** Keep C IMMEDIATE then M, revalidate on C while M is held, seed/recovery/announcement after both releases (CF-D5 stands); no deferred read-then-write on M on any reservation path; a throwing reservation is a typed refusal."
- P2CG1E CF-E5 (boot order) [P2CG1H]: "**CF-E5 (boot order) [P2CG1H].** Install the port before `runtime.bootstrapMultiplayerServer()` (`server.js:537`) and after the campaign SQLite service is initialised; `installApplicationReceipts` throws on a non-empty registry and `register` throws under an installed port without a campaign database. Pin both in `CampaignHostRegistry.globalSlot.test.ts`."
- P2CG1E CF-E6 (one port type) [P2CG1H]: "**CF-E6 (one port type) [P2CG1H].** Make `campaignApplicationReceiptPort.ts` the single definition of `ICampaignApplicationReceiptPort`; have `CampaignHostRegistry.ts` and `campaignApplicationConnection.ts` import the type from it; re-run madge (expect no new chain)."
- P2CG1E CF-E7 (release-path pins) [next owner of bindCampaignSyncConnection.test.ts: P2CG1I3 or P2CG2]: "**CF-E7 (release-path pins) [next owner of bindCampaignSyncConnection.test.ts: P2CG1I3 or P2CG2].** Trace M in the preparation-refusal (`participants-behind`), veto-during-preparation and invalid-reservation cases and assert the trail is `[]`; RM1 and RM8 survive today."
- P2CG1E CF-E8 (wire reasons on the HTTP doors): "**CF-E8 (wire reasons on the HTTP doors).** D's socket refusals are code-only; the legacy HTTP gate (`campaignLaunchProgressionGate.ts:148-161`) still carries `requiredRevision` and behind rows. Decide and document E's payload shape; prefer code-only in receipt mode, matching D, and keep the legacy shape only on the legacy branch."
- P2CG1E CF-E9 (lint and cycles): "**CF-E9 (lint and cycles).** Head figures: 87 warnings / 0 errors (identical set); `bindCampaignSyncConnection.ts` 1459 counted (max-lines, warned since before B); `DurableMatchStore.ts` 1394; madge from D's five leaves 976 files / 175 chains, identical set. E's leaves (`coopMissionCreate.ts`, `campaignLaunchAuthorityRoute.ts`, `campaignSyncTransport.ts`) are not warned today; record before/after."
- P2CG1E CF-E10 (required checks): "**CF-E10 (required checks).** 32 check runs on bc87e5b3, all success, names identical to B and C; protection `["Lint and Test"]`, strict false, conversation resolution required, 0 approvals. Verify all 32 names by name on E's exact head."
- P2CG1E CF-E11 (CF-D11 still open) [E owns coopMissionCreate.test.ts]: "**CF-E11 (CF-D11 still open) [E owns coopMissionCreate.test.ts].** Add the STALE_HEAD re-admission case on the prepared path (CF-D11(a)); CF-D11(b) remains with the next owner of `DurableMatchStore.test.ts`."
- Minor M1: "**M1 (cosmetic, test leaves).** Two new describe titles and two comments use a literal `?` where the file's other titles use an em dash: `CampaignGmArbiter.test.ts` (`'CampaignGmArbiter ? guarded AdvanceDay reservation (P2CG1D)'`, `order ? the guard`, `span ? and answers`) and `CampaignHostRegistry.test.ts` (`'CampaignHostRegistry ? receipt port and launch view (P2CG1D)'`). Byte check: the files contain U+003F there and U+2014 elsewhere. Fix when the leaves next open; not this PR (a post-RED test edit would need its own commit)."
- Minor M2: "**M2 (binder store selection).** `commitGuardedProgression` reserves on `getDefaultMatchStore()` while `CampaignHostRegistry` accepts an injected `matchStore` (used only for `getMatchMeta`). They coincide in production (one globalThis singleton) and in tests (`_setDefaultMatchStoreForTests`); a future injected store would not be the reserved connection. Note for I3/P2CG2."
- Minor M3: "**M3 (dead defensive arm).** `submitProposal`'s `throw campaignProgressionLateRefusal('proposal-reservation-invalid')` after `commitGuarded` returns null is unreachable for auto-approve (`entry === undefined` never yields null); harmless."
- Note N1: "**N1.** `_reset()` keeps the port by design (instance-level), so a test that reuses the global registry across cases must call `_resetCampaignHostRegistry()`; the D cases do."
- Note N2: "**N2.** The coalesced approver's answer is null -> `BAD_ENVELOPE unknown-proposal`, which is exactly legacy's answer for an approve that arrives after the entry left the queue; the GM UI already handles it."
- Note N3: "**N3 (hardening).** `ICampaignAppendRefusal.reason` is `string`; the host-intent path forwards it to the wire without the kebab-case check the arbiter path gets. All current sources are constants. Route both through one check or narrow the type when the leaf is next open."
- Note N4: "**N4.** `appendControlledCampaignBatch` COMMITs an empty C transaction on a post-guard revision conflict (nothing written); that is B's behaviour and is why the conflict is a result rather than a throw."
- Note N5: "**N5.** The two `pending` skips in the related run are pre-existing (same as the author's run)."

Root note on the P2CG1H successor chain (not reviewer text; recorded under successorNotes.P2CG1H; it travels to H and does not hold P2CG1E admission):

- H-OPEN-1 (Root): Before P2CG1H activation, an in-span onNotCommitted hook on P2CG1B's ICampaignAppendControls/JournalCampaignEventStore must be wired in the binder so the admit-then-fail path releases the match reservation explicitly (P2CG1D review decision point 1 and OWNER-RULING issuecomment-6241608318), or Root must record an explicit acceptance at H's admission. The hook's files are B leaves, not D/E leaves: it needs its own registered unit or literal-path amendment.

All 32 checks on the merged head succeeded (run 39068420033); the 32 names equal P2CG1C's and match pr-checks.yml one to one:
Detect Changes; Install Dependencies; Lint; Format Check; Validate Roadmap Ledger; Type Check; Unit Tests (1/6); Unit Tests (2/6); Unit Tests (3/6); Unit Tests (4/6); Unit Tests (5/6); Unit Tests (6/6); Perf Smoke Tests; Statistical Proof PR; Perf Budget PR; Coverage Floor; A11y Tests; Validate BV Parity; Validate Combat Suite; Build Storybook; Schema Bridge; Determinism Audit; E2E Smoke; Seam Anchors; Customizer Regressions; Desktop Type Check; Desktop Tests; Lint and Test; Prepare Build Artifacts; Build Test / linux; Build Test / mac; Build Test / win.
GitHub enforces only Lint and Test; each name was verified individually.
The [merge receipt](evidence/p2cg1d-merge-20261017.json) binds both ordered parents and the matching integration tree.
The [main proof](evidence/p2cg1d-mainproof-20261017.json) is a fresh run at the merge before any closure edit, after a real npm ci under Node v22.22.0:
the four registered test leaves, P2CG1C's two leaves, P2CG1B's two leaves and the 35 A1/A2 suites together (41 unique suites, 526 tests), the four leaves alone (4 suites, 119 tests),
the Task 14 selector alone (4 suites, 97 tests), the P2CG1C leaves alone (2 suites, 52 tests), the P2CG1B leaves alone (2 suites, 45 tests), the 35 suites alone (35 suites, 381 tests), typecheck and the validator passed.
It references the author's proof logs by hash.

P2CG1D has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CG1D therefore releases
its in-flight src/lib/multiplayer/server reservations at main-verified.

Successor release (separate from the closure): P2CG1E moves from blocked to planned;
its only predecessor, P2CG1D, is main-verified with a genuine exact-main mainProof PASS in this same change set.
No other P2CG1E field changes. P2CG1H, P2C and every other unit state are unchanged.
Selection is not downstream admission.
This closure metadata still requires its own CI and parent merge.

---

## 2026-10-17 P2CG1C source verified on main; P2CG1D released; closure metadata proposed

P2CG1C advances from implementing to main-verified for source PR #2218,
head ed7fb95be593b7372793451fb6f91f1feff79e36, merge 4690f67408d3e4e7cc2025db6799d034786b41a1.
Its baseline remains the admission base 8fde3b975fad16dc2af91faa16c49356ada9f921, which is also the merge's first parent (main had not moved since the P2CG1B closure).
The owner authorized this ruling in chat, and it was posted as [comment 6239129525](https://github.com/SwiggitySwerve/MekStation/pull/2218#issuecomment-6239129525), which quotes that instruction;
its exact UTF-8 body (1587 bytes), without an added newline, hashes to 4c5db80c0c2f7a7b47595bef64a685c299b8484d9a228766b8963cd1b2620c22.
The ruling (19:02:08Z) preceded the head-guarded merge (19:02:15Z), and PR #2218 carries the owner-ruled label.
PK-p2cg1c-ruling records that ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2cg1c-review-20261017.json) binds the independent review of the exact merged head, preserved byte for byte
(APPROVE-WITH-NOTES, no blockers, no majors, minors M1-M5, notes N1-N6; reviewer Claude Fable 5.1 high, substituting for GPT Astra during a quota outage; author Opus 5.5; sha256 c4cfeaca4feb9dace3dda6d49f99abd760e6e71807c55d49d793823d8d4bf46f).
It records the five sensitive review classes (authority, privacy, replay, idempotency, concurrency) with the reviewer's section 5 findings verbatim; none has a finding, and concurrency carries two successor hazards (N2, N3) as CF-D5 and CF-D7.
The reviewer re-derived the ledger discipline (RED 21 failing on unchanged product, GREEN 52/52, 10/15 files, 336/500 counted lines),
ruled decision point 1 (the disclosed, assertion-monotone post-red change to the cross-process case; the RED-byte test file passes 28/28 three times against the head product) consistent with the discipline, with minor M1 that it should have been its own commit,
re-ran the registered suites, the Task 14 selector, the P2CG1B suites, the 35 A1/A2 suites, the 196 related suites, typecheck, lint, madge and the validator,
and caught 5 of 7 mutants; the two survivors are coverage gaps, not defects (M4, M5, CF-D11). Neither the author nor the reviewer ran npm run test:stable; the CI unit shards stand in for it.
Lint (review section 3): "**0 errors, 87 warnings** (baseline 87); `DurableMatchStore.ts` max-lines 1394 counted (baseline 1312, already warned); `IMatchStore.ts` and `coopMissionCreate.ts` do not warn."
The reserved p2cg1c-admission-review-20261017.md slot stays unwritten.

The review's carry-forward wording for P2CG1D is recorded verbatim under successorNotes in the review receipt:
section 7 items 1-11, and minors M1-M5 and notes N1-N6 from section 8.

- P2CG1D CF-D1 (reservation is write-free and synchronous): "**CF-D1 (reservation is write-free and synchronous).** `reserveMatchProgression()` is `BEGIN IMMEDIATE` on DurableMatchStore's own M connection with only `release()` (ROLLBACK, idempotent) and no commit; a queued microtask rolls back whatever its synchronous span left open. Any M write made while the reservation is held (including store methods such as `appendEvents`/`appendCommandBatch`, which nest as SAVEPOINTs via `db.transaction`) is discarded by the release while the method reports success. D must make no M write inside the reservation, and the span from `reserveMatchProgression()` to `release()` must contain no `await`."
- P2CG1D CF-D2 (placement inside B's guard): "**CF-D2 (placement inside B's guard).** B's `guard(db)` runs synchronously inside `appendWithExtension`'s `.immediate()` transaction on C and the writer calls `onCommitted` synchronously after COMMIT in the same span (`SQLiteEventJournalWriter.ts:74-82`), so a reservation taken in the guard is still held at `onCommitted`. The adapter invokes D's `onCommitted` only when a batch was actually recorded (`committed !== null`); on a refused guard or a duplicate the explicit release never runs and the microtask releases M. Release explicitly on both the guard's refusal return and `onCommitted`; treat the microtask only as the safety net."
- P2CG1D CF-D3 (M-busy must be a refusal, not an uncertain commit): "**CF-D3 (M-busy must be a refusal, not an uncertain commit).** `reserveMatchProgression()` throws `Match reservation needs an idle match connection` when M is already in a transaction. A throw from inside B's guard is classified `commit-uncertain` (CF-C2) and demands a receipt readback. D's guard must catch that throw and return a typed `{kind:'refused', reason}` arm."
- P2CG1D CF-D4 (lock order): "**CF-D4 (lock order).** C's prepared create takes C IMMEDIATE then M IMMEDIATE; D's door takes C IMMEDIATE (the writer's `.immediate()`) then M (the reservation inside the guard). Keep C-then-M in every new door; never take M before C on a path that can later touch C; never hold either across an await."
- P2CG1D CF-D5 (deferred reads on M): "**CF-D5 (deferred reads on M).** Every existing `this.db.transaction(fn)()` on DurableMatchStore is BEGIN DEFERRED and reads before it writes; under a concurrent writer in another process the write upgrade fails with `SQLITE_BUSY_SNAPSHOT` (message `database is locked`), which `busy_timeout` does not retry. This is baseline exposure (the kept flake `green-related-run1-flake.json`: `seedJournalFromInitialEvents` at `DurableMatchStore.ts:1260`), not a C defect. D must not add a deferred read-then-write on M on any reservation path, and E's route switch must keep seed, recovery and announcement after both releases exactly as C does."
- P2CG1D CF-D6 (readback and identity): "**CF-D6 (readback and identity).** `createMatchPrepared` classifies a failed COMMIT by `getMatchRow(meta.matchId).meta_json === JSON.stringify(meta)` (exact identity, not row presence) and answers `uncertain` only when the release or the readback itself threw. D's analogue on C is B's `getCommandReceipt`; do not add a presence-only check anywhere on either side."
- P2CG1D CF-D7 (stuck-transaction hazard): "**CF-D7 (stuck-transaction hazard).** `holdMatchConnection.release` and `holdCampaign` mark the hold released before ROLLBACK; a throwing ROLLBACK leaves that connection in a transaction nothing retries. The next prepared hold on it refuses (`needs an idle ... connection`), which is fail-closed, but ordinary `db.transaction()` callers on the same connection would then nest as SAVEPOINTs without durability (B's N1). D's door must keep B's `onCommitted` request (which forces the writer's in-transaction refusal) and must treat `db.inTransaction === true` before its BEGIN as a refusal, never as a nested transaction."
- P2CG1D CF-D8 (production inertness, re-verify at D's baseline): "**CF-D8 (production inertness, re-verify at D's baseline).** At ed7fb95b the only production caller of the create module is `src/pages/api/multiplayer/matches/index.ts:315 -> createCoopMissionMatch`; `createPreparedCoopMissionMatch`, `createMatchPrepared`, `reserveMatchProgression` and `CoopMissionCommitError` have no production caller; `bindCampaignSyncConnection.ts:910` and `CampaignGmArbiter.ts:453` still call the uncontrolled `applyHostIntent`; `server.js` installs no port and composes no guard. D is the first production caller of the B and C operations: re-run this grep at D's baseline and record it."
- P2CG1D CF-D9 (lint and cycles): "**CF-D9 (lint and cycles).** Head figures: `DurableMatchStore.ts` 1875 physical / 1394 counted (max-lines, already warned at the baseline's 1312); `IMatchStore.ts` and `coopMissionCreate.ts` not warned; repo-wide 87 warnings, 0 errors (baseline 87, identical set); madge 992 files / 174 chains from C's three leaves (baseline 174, identical sets). D's leaves include `bindCampaignSyncConnection.ts` (1675 physical at the scope snapshot), so expect an existing max-lines warning there; record before/after."
- P2CG1D CF-D10 (required checks): "**CF-D10 (required checks).** 32 check runs on ed7fb95b, all `completed/success`, 0 commit statuses; the names are identical to the P2CG1B list; `pr-checks.yml` blob `a82fe0f7` unchanged since B. Branch protection: `required_status_checks.contexts = ["Lint and Test"]`, strict false, conversation resolution required, 0 approvals. The guarded merge should require all 32 names `success` on the merge ref's head."
- P2CG1D CF-D11 (coverage gaps for whoever next owns the test leaves): "**CF-D11 (coverage gaps for whoever next owns the test leaves).** (a) The prepared path's STALE_HEAD re-admission (`readmit()` before the C hold) has no case: removing the call survives both suites (RM2). E owns `coopMissionCreate.test.ts` next; add a case that drifts the host's contribution between catalog IO and the C hold on the prepared path and expects `COOP_MISSION_STALE_HEAD` with nothing written. (b) The exact-meta readback has no discriminating case: a presence-only check survives (RM6). It belongs in `DurableMatchStore.test.ts` (a foreign row under the same id inserted after the ROLLBACK and before the readback must not read back as `committed`). Neither is a defect on this head."
- Minor M1: "**M1 (ledger, docs):** the post-red stabilisation of the cross-process case is folded into the implementation commit `ed7fb95b` rather than a separately labelled commit; it is disclosed in the local receipt's `testBytesVersusRed` and in the kept flake log. Future units should commit any post-red test edit on its own with the reason in the message so the ledger shows the deviation without reading the receipt. Not this PR."
- Minor M2: "**M2 (docs, interface comment):** `IMatchStore.ts` says of a failed COMMIT "its row present is `committed`" while the implementation requires the identical `meta_json`; the implementation is the correct, stricter rule. Reword the comment when the leaf is next open."
- Minor M3: "**M3 (layering, optional):** `DurableMatchStore.ts` now value-imports `rejectPreparedThenable` from `@/lib/events/journal/SQLiteEventJournalWriter`, a campaign/journal module, for a four-line helper. No cycle (madge unchanged), but the match store did not previously depend on the journal writer at value level; a later unit that owns both could move the helper to a neutral module."
- Minor M4: "**M4 (test, successor):** see CF-D11(a): STALE_HEAD on the prepared path is uncovered (RM2 survived)."
- Minor M5: "**M5 (test, successor):** see CF-D11(b): the exact-meta readback is uncovered (RM6 survived)."
- Note N1: "**N1:** the duplicate pre-check in `writeMatchRows` runs inside the IMMEDIATE hold on the prepared path and outside any transaction on the async path (baseline behaviour, where the UNIQUE constraint remains the backstop); this is why `refuses a borrowed transaction and a duplicate id without writing` can assert `already exists` with nothing written."
- Note N2: "**N2:** both `holdMatchConnection.release` and `holdCampaign` set `held=false` (or return) before ROLLBACK runs; if ROLLBACK itself threw, the connection would remain in a transaction with no retry, and only the next prepared hold would notice (fail-closed). ROLLBACK failing in better-sqlite3 requires an I/O error or an open statement iterator, neither of which this code can produce; this is a design note for CF-D7, not a finding."
- Note N3: "**N3:** the flake's root cause is the DEFERRED `db.transaction` in `seedJournalFromInitialEvents` (and every other `db.transaction` on M) under a concurrent external writer; see section 6 item 1(c) and CF-D5. In the single-process deployment there is no external writer on matches.db; operational scripts opened against a live file would be the only way to reach it today."
- Note N4: "**N4:** `CoopMissionCommitError` extends `AggregateError` with `errors` in the order [uncertain error, ...release errors] for `uncertain` and [...release errors] for `committed`; the route would log it and answer the fixed 500 code, so the SQLite text never reaches a client even if E later routes the prepared path."
- Note N5: "**N5:** the child process in the cross-process cases is an inline `node -e` script using the installed `better-sqlite3`; no new worker fixture file, so the harness/fixture leaves stayed unchanged as the admission planned. The 15 s child deadlines mean a parent failure before `.done` degrades to a slow test failure, not a hang."
- Note N6: "**N6:** `validate-roadmap --next` was not consulted; the plain and `--git` validators pass at the head."

Root note for P2CG1D's admission (not reviewer text; P2CG1D's behaviour text and leaves are not edited here):

- D-OPEN-1 (Root): P2CG1D admission is held until a separate parent literal-path amendment registers src/lib/multiplayer/server/__tests__/campaignGrantChannel.test-helpers.ts as a P2CG1D leaf (roadmap.json R2.authority-live restrictions.P2CG1D 9->10 leaves; knownSourceTestLifecycleSubtotals.P2CG1D 10->11; units.json P2CG1D behavior 'Planned leaves (9)' -> 10): the registered required field launch: CampaignLaunchView | null makes that helper fail TS2741 at line 175 (one-line `launch: null,`). Census with it is 15/15.

All 32 checks on the merged head succeeded (run 39058063119); the 32 names equal P2CG1B's and match pr-checks.yml one to one:
Detect Changes; Install Dependencies; Lint; Format Check; Validate Roadmap Ledger; Type Check; Unit Tests (1/6); Unit Tests (2/6); Unit Tests (3/6); Unit Tests (4/6); Unit Tests (5/6); Unit Tests (6/6); Perf Smoke Tests; Statistical Proof PR; Perf Budget PR; Coverage Floor; A11y Tests; Validate BV Parity; Validate Combat Suite; Build Storybook; Schema Bridge; Determinism Audit; E2E Smoke; Seam Anchors; Customizer Regressions; Desktop Type Check; Desktop Tests; Lint and Test; Prepare Build Artifacts; Build Test / linux; Build Test / mac; Build Test / win.
GitHub enforces only Lint and Test; each name was verified individually.
The [merge receipt](evidence/p2cg1c-merge-20261017.json) binds both ordered parents and the matching integration tree.
The [main proof](evidence/p2cg1c-mainproof-20261017.json) is a fresh run at the merge before any closure edit, after a real npm ci under Node v22.22.0:
the two registered test leaves, P2CG1B's two leaves and the 35 A1/A2 suites together (39 suites, 466 tests), the two leaves alone (2 suites, 52 tests),
the Task 14 selector alone (4 suites, 96 tests), the P2CG1B leaves alone (2 suites, 45 tests), the 35 suites alone (35 suites, 369 tests), typecheck and the validator passed.
It references the author's proof logs by hash.

P2CG1C has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CG1C therefore releases
its in-flight src/lib/multiplayer/server reservations at main-verified.

Successor release (separate from the closure): P2CG1D moves from blocked to planned;
its only predecessor, P2CG1C, is main-verified with a genuine exact-main mainProof PASS in this same change set.
No other P2CG1D field changes. P2CG1E, P2C and every other unit state are unchanged.
Selection is not downstream admission, and D-OPEN-1 holds P2CG1D admission until its separate parent amendment lands.
This closure metadata still requires its own CI and parent merge.

---

## 2026-10-17 P2CG1B source verified on main; P2CG1C released; closure metadata proposed

P2CG1B advances from implementing to main-verified for source PR #2216,
head c0c97c135004532412c3c6a0b41124ce51761941, merge ce5fd2ae130a9f41027603823ef4903c5dad5d95.
Its baseline remains the admission base 3826f7cb78179cf01d4e935c3ef886cee4f755da; the merge's first parent is main at merge time, 1a22b98fd4310bce9b6643350469c7c6db73a65e.
The owner authorized this ruling in chat, and it was posted as [comment 6237415300](https://github.com/SwiggitySwerve/MekStation/pull/2216#issuecomment-6237415300), which quotes that instruction;
its exact UTF-8 body (1347 bytes), without an added newline, hashes to 0eda51a37bfd074a166c239621fb2d1a375d8a8b96f21b40b51c45f31b98287a.
The ruling (17:16:57Z) preceded the head-guarded merge (17:17:04Z), and PR #2216 carries the owner-ruled label.
PK-p2cg1b-ruling records that ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2cg1b-review-20261017.json) binds the independent review of the exact merged head, preserved byte for byte
(APPROVE-WITH-NOTES, no blockers, no majors, minors M1-M4, notes N1-N5; reviewer Claude Fable 5.1 high, substituting for GPT Astra during a quota outage; author Opus 5.5; sha256 bd59452be0b247b72c4fe38846d0b040fed76534377d21d2fc56178a885ee4c0).
It records the five sensitive review classes (authority, privacy, replay, idempotency, concurrency) with the reviewer's section 5 findings verbatim; all five pass, concurrency with carry-forward CF-C5.
The reviewer re-derived the ledger discipline (RED 23 failing on unchanged product, GREEN 45/45 with byte-identical tests, 13/15 files, 456/500 counted lines),
re-ran the registered leaves, the Task 14 selector, the 35 A1/A2 suites, the 340 related suites, typecheck, lint, madge and the validator,
and caught 11 of 12 mutants; the survivor is a coverage gap, not a defect (N2). Neither the author nor the reviewer ran npm run test:stable; the CI unit shards stand in for it.
Lint wording (review M1): "**M1 (docs, review receipt):** record "JournalCampaignEventStore.ts trips eslint(max-lines) at 446 counted lines (new); SQLiteEventJournalWriter.ts stays warned, 435 -> 445; CampaignMatchHost.ts 699 physical, under 400 counted; repo-wide 87 warnings, 0 errors (base 86).""
The reserved p2cg1b-admission-review-20261017.md slot stays unwritten.

The review's carry-forward wording for P2CG1C is recorded verbatim under successorNotes in the review receipt:
section 7 items 1-10, minors M1-M4 and notes N1-N5 from section 8, and section 6 item 7 on required checks.

- P2CG1C CF-C1 (borrowed seam contract): "**CF-C1 (borrowed seam contract).** `SQLiteEventJournalWriter.appendInBorrowedTransaction(raw)` is synchronous, requires `db.inTransaction === true` on the writer's own handle, shares `validatedIdentity` with the owning wrappers, and never begins, commits, releases a savepoint or notifies. C's ordered "campaign C IMMEDIATE then match M IMMEDIATE" must open the C transaction itself on the journal's handle and call this operation inside it; only that outer owner may announce the C commit, after its own COMMIT returns. Do not use `appendWithExtension`/`appendPreparedWithExtension` for the borrowed role: both own an IMMEDIATE transaction and, when nested, silently become a SAVEPOINT (unchanged baseline behaviour when no `onCommitted` is requested; refused before writing when one is)."
- P2CG1C CF-C2 (refusal versus throw): "**CF-C2 (refusal versus throw).** The only "nothing written with certainty" signal is the typed `refused` arm; any throw from the append (including a throwing guard, a thenable guard result, a stale branch or a saved-record rewrite failure) is classified `commit-uncertain {commandId, error}` and must be resolved by `getCommandReceipt` readback, never by compensation or a fresh command. A guard that wants the precise arm must return `{kind:'refused', reason}` rather than throw."
- P2CG1C CF-C3 (capability fail-closed): "**CF-C3 (capability fail-closed).** Controls are honoured only by `JournalCampaignEventStore` over a `SQLiteEventJournalWriter`; `InMemoryCampaignEventStore`, a non-SQLite journal, and any store exposing `appendCommandBatch` without `appendControlledCommandBatch` are refused with `append-controls-unsupported` before any write, at both the adapter and the host (`commitEvents`, including the per-event fallback). C and D must not add a second capability flag or a boolean switch; the presence of `appendControlledCommandBatch` is the capability."
- P2CG1C CF-C4 (outcome consumption): "**CF-C4 (outcome consumption).** `applyHostIntentWithControls` answers `CampaignDoorOutcome = answered | committed | lost-race | refused | commit-uncertain | committed-unsettled`, and throws only for a door-level throw or a cleanup failure on a non-committed outcome, in which case the thrown `AggregateError.cause` is the outcome and `errors[0]` is the cleanup error (an identity conflict is mapped to `answered` inside the door). Consumers must switch exhaustively (typecheck enforces it through `throwCommitFailure`), must treat `committed-unsettled` as durable-plus-unfinished (errors retained in order: notification, divergence, rebuild, publishes, cleanup), and must never map any failure arm to a public success or a zero-append answer."
- P2CG1C CF-C5 (cleanup ordering): "**CF-C5 (cleanup ordering).** `afterRelease` runs once per door after the single-writer lock chain has advanced (lockDepth 0) and after `onCommitted` and publication, but it is a promise continuation: the next queued door may already have started (up to its first await) when it runs. A reservation release placed in `afterRelease` must therefore be idempotent and observable by readback, and the next door's guard must tolerate a not-yet-released prior reservation by refusing (fail closed) rather than assuming order."
- P2CG1C CF-C6 (writer-level onCommitted): "**CF-C6 (writer-level onCommitted).** At the writer, `appendWithExtension`'s `onCommitted` is called un-wrapped after COMMIT; a throw there rejects the promise although the batch is durable. The adapter wraps it into `notificationError`; any new direct writer caller must either not throw from `onCommitted` or wrap it the same way, and must not read a rejection as "nothing committed"."
- P2CG1C CF-C7 (trust boundary): "**CF-C7 (trust boundary).** Controls (`guard`, `onCommitted`, `afterRelease`) are server-only operation arguments; `toJournalBatch`, `canonicalizeCommandIdentityV1`, the private envelope and every Protocol/wire type are unchanged and must stay so. The identity-equality fixture (guarded versus plain journal rows and digests) in `JournalCampaignEventStore.test.ts` is the regression the successors should keep green rather than re-derive."
- P2CG1C CF-C8 (production inertness, re-verify at C's baseline): "**CF-C8 (production inertness, re-verify at C's baseline).** At c0c97c13 no production module calls the new operations, `server.js` composes no guard, and the guest wire door and GM arbiter still use the uncontrolled `applyHostIntent`. C's admission must re-run this grep at its own baseline; the first production caller of a controlled door belongs to D/H, not C."
- P2CG1C CF-C9 (lint and cycles): "**CF-C9 (lint and cycles).** Head figures: writer 531 physical / 445 counted (warned), adapter 660 / 446 (newly warned), host 699 / under 400, batch commit 309; repo-wide 87 warnings, 0 errors; madge 171 chains from the six leaves, unchanged sets. C adds files, so expect the madge count to move only by C's own modules; record before/after."
- P2CG1C CF-C10 (required checks): "**CF-C10 (required checks).** 32 `pr-checks.yml` job names (A2's 31 plus `Validate Roadmap Ledger`), verified by name on the merge ref's head; GitHub enforces only `Lint and Test` plus conversation resolution and a zero-approval review gate."
- Minor M1: "**M1 (docs, review receipt):** record "JournalCampaignEventStore.ts trips eslint(max-lines) at 446 counted lines (new); SQLiteEventJournalWriter.ts stays warned, 435 -> 445; CampaignMatchHost.ts 699 physical, under 400 counted; repo-wide 87 warnings, 0 errors (base 86).""
- Minor M2: "**M2 (docs, optional):** the refusal message `Commit notification needs an outer transaction` reads backwards (the request is refused *because* an outer transaction is open, so the wrapper would be a savepoint). The test matches `/outer transaction/`, so a later wording such as `Commit notification cannot run inside an outer transaction` would stay green. Not this PR."
- Minor M3: "**M3 (docs, successor contract):** the cleanup-failure fold for non-committed outcomes places the primary outcome in `AggregateError.cause` and only the cleanup error in `errors`; document that for D (CF-C4) rather than change the head."
- Minor M4: "**M4 (test, successor):** add a case that exercises the in-transaction `recorded` check with a stale pre-check (the race window), so that mutant M5 is caught; it belongs in `JournalCampaignEventStore.test.ts` when a successor already owns that leaf."
- Note N1: "**N1:** without an `onCommitted`, `appendWithExtension` nested inside a caller transaction still degrades to a savepoint exactly as on the baseline; this preserves the existing 2-argument callers and is why the refusal is conditional. A guard-only controlled append nested that way would run its guard inside the savepoint and report `committed` without durability; no production caller can reach that today (JS is single-threaded and better-sqlite3 is synchronous, so a door never runs with the journal handle mid-transaction), and the `onCommitted` request D will supply forces the refusal."
- Note N2: "**N2:** mutant M5 survived at the registered suites only because the store's out-of-transaction receipt pre-check shadows the in-transaction `recorded` check; my probe confirms the head's code is correct inside the window (guard 0, notify 0, one batch). Coverage gap, not a defect."
- Note N3: "**N3:** the mock in `CampaignMatchHost.pipeline.test.ts` gains the `armRemovalApplyDrift` branch; it is the only edit to an existing line in either test leaf and no pre-existing case sets it; the five pre-existing pipeline cases pass at both red and green."
- Note N4: "**N4:** `commit-uncertain` for the sequence-fallback identity carries the generated `campaign-cmd:<campaign>:<base>` id, which the journal records, so readback works; `committed-unsettled.commandId` from `applyHostIntentWithControls` uses the intent identity and is null only when the intent offers none."
- Note N5: "**N5:** `validate-roadmap --next` prints U25 at this head; advisory only, the validator does not model the one-lane rule. Not a finding."
- Required checks (section 6 item 7): "**32 checks.** Verified by name on c0c97c13: 32 check runs, all success, zero commit statuses; the set is A2's 31 plus `Validate Roadmap Ledger`, which `pr-checks.yml` gained after A2 (this closes the reconciliation A2's M3 asked for: the A1 "32" was a table figure; a real 32nd check only exists now). GitHub enforces only `Lint and Test` (the `if: always()` aggregator; a completed-but-failed state is a failure) plus conversation resolution and a zero-approval review requirement. The guarded merge should require all 32 names `success` on the merge ref's head."

Parent notes for P2CG1C's admission (not reviewer text; P2CG1C's behaviour text is not edited):

- C-OPEN-1 (scope of CF-C1 for C): CF-C1 tells C to open the campaign C transaction itself on the journal's handle and to use appendInBorrowedTransaction for any campaign append inside it. C's registered behaviour commits only the match row while C is held, and C's seven leaves include no campaign sync or journal module. C's admission must state whether C appends any campaign batch inside C. If it does, the append uses the borrowed operation as CF-C1 says; if that needs a leaf outside the seven, it needs a registration correction first.
- C-OPEN-2 (placement of review M4): Review M4's race-window case belongs in src/lib/campaign/sync/__tests__/JournalCampaignEventStore.test.ts, which is not a P2CG1C leaf. It waits for a later successor that owns that leaf; C's admission does not absorb it.
- C-OPEN-3 (baseline and re-measurement): C's baseline will be a main that contains ce5fd2ae and this closure. Admission must verify P2CG1B main-verified with this mainProof PASS, re-run the CF-C8 production-inertness grep, and record the CF-C9 lint and madge figures at its own baseline instead of relying on c0c97c13 facts.

All 32 checks on the merged head succeeded (run 39050343896); the 32 names are P2CG1A2's 31 plus Validate Roadmap Ledger and match pr-checks.yml one to one:
Detect Changes; Install Dependencies; Lint; Format Check; Validate Roadmap Ledger; Type Check; Unit Tests (1/6); Unit Tests (2/6); Unit Tests (3/6); Unit Tests (4/6); Unit Tests (5/6); Unit Tests (6/6); Perf Smoke Tests; Statistical Proof PR; Perf Budget PR; Coverage Floor; A11y Tests; Validate BV Parity; Validate Combat Suite; Build Storybook; Schema Bridge; Determinism Audit; E2E Smoke; Seam Anchors; Customizer Regressions; Desktop Type Check; Desktop Tests; Lint and Test; Prepare Build Artifacts; Build Test / linux; Build Test / mac; Build Test / win.
GitHub enforces only Lint and Test; each name was verified individually.
The [merge receipt](evidence/p2cg1b-merge-20261017.json) binds both ordered parents and the matching integration tree.
The [main proof](evidence/p2cg1b-mainproof-20261017.json) is a fresh run at the merge before any closure edit, after a real npm ci under Node v22.22.0:
the two registered test leaves and the 35 A1/A2 suites together (37 suites, 414 tests), the two leaves alone (2 suites, 45 tests),
the Task 14 selector alone (4 suites, 96 tests), the 35 suites alone (35 suites, 369 tests), typecheck and the validator passed.
It references the author's proof logs by hash.

P2CG1B has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CG1B therefore releases
its in-flight src/lib/campaign, src/lib/multiplayer/server and SQLiteEventJournalWriter.ts reservations at main-verified.

Successor release (separate from the closure): P2CG1C moves from blocked to planned;
its only predecessor, P2CG1B, is main-verified with a genuine exact-main mainProof PASS in this same change set.
No other P2CG1C field changes. P2CG1D, P2C and every other unit state are unchanged.
Selection is not downstream admission.
This closure metadata still requires its own CI and parent merge.

---

## 2026-10-16 P2CG1A2 source verified on main; P2CG1B stays held; closure metadata proposed

P2CG1A2 advances from implementing to main-verified for source PR #2169,
head 27ecf768c7f6d62fe442866297baaf993ca777b7, merge 5d02dcab6ff2b1a62b2d73355a0bc3345aec2ae2.
Its baseline remains the admission base ace667bff5b9e6857b60a608e5b89a5baabfdcc6.
The owner explicitly authorized this ruling in chat, and it was posted as [comment 6223189276](https://github.com/SwiggitySwerve/MekStation/pull/2169#issuecomment-6223189276);
its exact UTF-8 body (523 bytes), without an added newline, hashes to bd3b3967b5029f2a42626ace254c839a6f396d0570529a88971e1d8c8ab95bd9.
The merge (19:33:23Z) preceded the ruling (19:33:28Z); this record preserves that chronology.
PK-p2cg1a2-ruling is first recorded here, after both the merge and the ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2cg1a2-review-20261016.json) binds the Fable 5.1 review of the exact merged head, preserved byte for byte
(APPROVE-WITH-NOTES, no blockers, no majors, documentary minors M1-M3, notes N1-N2; author Opus 5.5; sha256 d0f565928eecf5ad6a8169681b1e912b6441516f016a4ac01c7d449ff4284e6a).
The reviewer re-ran its own move proof (15 of 15 mutations caught), its own value-import closure (binder not reached),
madge on head and base (175 against 174, one added type-only chain), the Task 14 selector plus the 31 caller suites on head and base
(35 suites, 369 tests, identical rows), typecheck, lint, lint:units and the validator.
The author's second stable run passed on the final bytes (2796/2796 suites, 37180 passed, exit 0); the reviewer did not re-run it.
Move-proof wording (review section 1): "PASS; sameAppliedView is the only layout-only case (A1's wrap undone)"
Lint wording (review M1): "M1 (docs, review receipt): record "campaignApplicationConnection.ts trips eslint(max-lines) at 476 counted lines (registration estimate about 404); the binder drops to 1321; repo-wide 86 warnings, 0 errors, same count as base because the accepted warning replaces the removed one.""
The reserved p2cg1a2-admission-review-20261016.md slot stays unwritten.

The review's carry-forward wording for P2CG1B is recorded verbatim under successorNotes in the review receipt:
section 7 items 1-9, the three documentary minors and notes N1-N2 from section 8,
the section 6 N1 required-check row, the section 2 IPublicCut judgment and the section 5(b) estimate paragraph.

- P2CG1B B-CF1 (baseline and unchanged leaves): "Baseline for P2CG1B is the P2CG1A2 merge commit on main. Admission must verify P2CG1A2 main-verified with a genuine exact-main mainProof PASS, and that none of B's eight leaves changed between ace667bf and that merge. At 27ecf768 none of B's six source leaves imports bindCampaignSyncConnection.ts or campaignApplicationConnection.ts, so A2 cannot have moved B's baseline bytes."
- P2CG1B B-CF2 (writer seam): "Writer seam: SQLiteEventJournalWriter.appendWithExtension (lines 60-82) owns its IMMEDIATE transaction through db.transaction(...).immediate(); appendPreparedWithExtension (99-138) opens and commits its own transaction too and is not the borrowed seam. The new synchronous borrowed-transaction operation shares one body with appendWithExtension (AppendEventBatchSchema.parse, canonicalizeCommandIdentityV1, duplicate-eventId check, appendInTransaction) and neither begins nor commits. Red test: call it inside a caller-owned db.transaction and assert the batch is absent after the outer rollback and present only after the outer commit; this test must fail on the unmodified baseline."
- P2CG1B B-CF3 (store seam): "Store seam: ICampaignEventStore.appendCommandBatch is optional (line 185); JournalCampaignEventStore.appendCommandBatch (line 434) reaches journal.appendWithExtension (line 325). The optional synchronous guard runs inside that transaction before the batch is written; a refusal is a typed result arm, not an Error.name match; a store without the capability fails closed when a guard is supplied (choose typed refusal or throw-before-any-write, state which, and test it in JournalCampaignEventStore.test.ts)."
- P2CG1B B-CF4 (host plumbing): "Host plumbing: CampaignMatchHost.commitEvents (551-578) takes the batch path only when eventStore.appendCommandBatch exists and otherwise falls back to commitCampaignEventsInSequence, which has no transaction to guard; with a guard supplied the fallback must fail closed. CampaignCommitOutcome (campaignHostBatchCommit.ts:61, today 'committed' | 'lost-race') gains the typed arms for prewrite refusal, known commit, uncertain commit and post-commit cleanup; resultOfCommit maps each; every outcome.kind consumer is made exhaustive so typecheck proves no arm is dropped. No cross-file atomicity claim in code comments or receipts."
- P2CG1B B-CF5 (trust boundary): "Trust boundary: guard and notification callbacks are server-only operation inputs. Test that canonicalizeCommandIdentityV1's digest for a batch is identical with and without a guard, and that no wire schema in @/types/multiplayer/Protocol gains a field for them."
- P2CG1B B-CF6 (production inertness): "Production inertness: server.js composes no guard. Record that the default-absent path is behaviour-equivalent: the 35 suites of A1/A2 plus B's two named test leaves pass unchanged, and CampaignMatchHost.pipeline.test.ts carries the real-SQLite released-reservation removal cases the Task 15 amendment requires."
- P2CG1B B-CF7 (red-first proof): "Red-first proof is required (unlike A1/A2): the red receipt must show the new assertions failing on the unmodified baseline with the failure text, not a baseline pass."
- P2CG1B B-CF8 (lint and madge): "Lint: SQLiteEventJournalWriter.ts is 510 physical and CampaignMatchHost.ts 611 physical at 27ecf768; record their oxlint max-lines status before and after. Expect the repo-wide count to move only by warnings on B's own leaves; madge chain count from B's leaves should be unchanged because B adds no module."
- P2CG1B B-CF9 (required checks): "Required checks: the 31 pr-checks.yml job names in section 6, verified by name on the merge ref; GitHub enforces none of them."
- Minor M1: "M1 (docs, review receipt): record "campaignApplicationConnection.ts trips eslint(max-lines) at 476 counted lines (registration estimate about 404); the binder drops to 1321; repo-wide 86 warnings, 0 errors, same count as base because the accepted warning replaces the removed one.""
- Minor M2: "M2 (docs, optional): the P2CG1A2 `behavior` text's "about 404" is stale; correct only through a registration-correction PR if the parent wants ledger accuracy. Not this PR."
- Minor M3: "M3 (process): reconcile A1's "32 checks" with the 31 pr-checks.yml names before the guarded merge; if a 32nd check existed on #2166 it did not come from the current PR-triggered workflow set."
- Note N1: "N1: the author's `redKind` wording ("no test can fail and none was written") is accurate for a move-only slice; B must not inherit it (carry-forward 7)."
- Note N2: "N2: `IPublicCut` is now a dead export (section 2); harmless."
- Required checks (section 6, N1): "GitHub: `branches/main/protection` has `required_conversation_resolution` only, no `required_status_checks`; `rules/branches/main` is empty. So nothing is enforced server-side and the guarded merge must verify by name. The only PR-triggered workflow is `pr-checks.yml` (`camp01-live-adversarial.yml` runs on push to main and dispatch). The workflow is identical at base and `origin/main`, and PR #2169's run used it. **The guarded merge should require all 31 job names below to be `pass` on the merge ref's head**: Detect Changes; Install Dependencies; Lint; Format Check; Type Check; Unit Tests (1/6) ... Unit Tests (6/6); Perf Smoke Tests; Statistical Proof PR; Perf Budget PR; Coverage Floor; A11y Tests; Validate BV Parity; Validate Combat Suite; Build Storybook; Schema Bridge; Determinism Audit; E2E Smoke; Seam Anchors; Customizer Regressions; Desktop Type Check; Desktop Tests; Lint and Test; Prepare Build Artifacts; Build Test / linux; Build Test / mac; Build Test / win. `Lint and Test` is the `if: always()` aggregator, so a completed-but-failed state must be read as failure, not as "ran". A1 reported 32 checks on #2166; #2169 shows 31, all from pr-checks.yml; the parent should reconcile that count when it confirms the names (M3 below). |"
- IPublicCut (section 2): "**IPublicCut (author's question).** It is referenced only inside the new file (declaration line 76, return type of the now-unexported `preparePublicCut` at 98, field type at 171). No external importer, no exported referrer, no lint signal. Keeping it exported is harmless and keeps this head's six-name drop exactly equal to A1's carry-forward 4. Dropping it would be an export-keyword change the registration permits, but changing the reviewed bytes now is not worth it. Judgment: leave it; if the parent wants it unexported, do it in a later slice that already touches the file (P2CG1B does not)."
- Estimate (section 5(b)): "**(b) New file is 476 counted lines against the registration's "about 404".** The oxlint figure is 476 (my scanner gives 477 with a slightly different rule; oxlint's own message is authoritative). The 404 was an estimate error, not scope creep: the file contains exactly the registered content (12 slice-1 declarations, the class, and the imports the class needs), verified in section 1. The cap metric is added product lines (379/500), which holds. The max-lines rule is `warn`, `npm run lint` passes, and splitting the class for a lint threshold would be an unregistered behaviour-risk refactor outside a move-only unit. The registration's "no further split, no lint override" therefore still stands. Record the measured 476 in the review receipt (M1); a ledger text correction is optional and belongs in a registration-correction PR, not here."

The 31 required job names come from .github/workflows/pr-checks.yml and match the check runs on the head one to one:
Detect Changes; Install Dependencies; Lint; Format Check; Type Check; Unit Tests (1/6); Unit Tests (2/6); Unit Tests (3/6); Unit Tests (4/6); Unit Tests (5/6); Unit Tests (6/6); Perf Smoke Tests; Statistical Proof PR; Perf Budget PR; Coverage Floor; A11y Tests; Validate BV Parity; Validate Combat Suite; Build Storybook; Schema Bridge; Determinism Audit; E2E Smoke; Seam Anchors; Customizer Regressions; Desktop Type Check; Desktop Tests; Lint and Test; Prepare Build Artifacts; Build Test / linux; Build Test / mac; Build Test / win.
On the 32-versus-31 count (review M3): the check-runs API lists 31 runs and no commit statuses on both the A1 head cdd84675 and this head.
The 32 was the A1 review table's figure; the A1 merge receipt already recorded 31.
IPublicCut stays exported, as the reviewer judged.
The about-404 estimate in P2CG1A2's behavior text is not corrected here; review M2 limits that to a registration-correction PR.

Parent notes for P2CG1B's admission (not reviewer text; P2CG1B is not edited):

- B-OPEN-1 (baseline under the TypeScript-7 hold): B-CF1 names the P2CG1A2 merge commit 5d02dcab as the P2CG1B baseline. The parent holds P2CG1B blocked until the TypeScript-7 track stopping condition is met or a waiver is recorded (ts7TrackRegistration20261016.schedulingRule), so B will be admitted on a later main. None of the eight leaves differs between ace667bf and 5d02dcab (git diff --name-only, empty), and #2170 did not touch them. Admission must state its actual baseline, verify P2CG1A2 main-verified and the ancestry to that baseline, and re-measure any leaf the TypeScript-7 units changed (including the B-CF8 physical line counts, 510 and 611 at 27ecf768) instead of relying on 27ecf768 facts.
- B-OPEN-2 (location of the borrowed-transaction red test): B-CF2 requires a red test of the new borrowed-transaction writer operation (outer rollback leaves no batch, outer commit keeps it). The registered leaves name only two test files, src/lib/campaign/sync/__tests__/JournalCampaignEventStore.test.ts and src/lib/multiplayer/server/__tests__/CampaignMatchHost.pipeline.test.ts. src/lib/events/journal/__tests__/SQLiteEventJournalWriter.test.ts is not a P2CG1B leaf, and the admission rules forbid unnamed tests. So the test belongs in one of the two named test leaves (JournalCampaignEventStore.test.ts already opens real better-sqlite3 databases), or the leaf set needs a separate registration correction before admission. This closure does not decide that and does not edit P2CG1B.
- B-OPEN-3 ("pass unchanged" in B-CF6): B-CF6 says the 35 A1/A2 suites "plus B's two named test leaves pass unchanged", but B adds assertions to those two test leaves, and neither is among the 35 suites. The parent reads it as: the 35 suites pass with no test change, and the two named test leaves pass with only B's additions, their existing cases unchanged. B's admission should state the reading it uses.
- B-OPEN-4 (CampaignCommitOutcome consumers for B-CF4 exhaustiveness): A grep at 5d02dcab finds outcome.kind narrowing on commit outcomes only inside B's leaves (CampaignMatchHost.ts lines 371 and 543; campaignHostBatchCommit.ts resultOfCommit line 74, used by CampaignMatchHost.doors.ts lines 73, 209 and 240) and in one non-leaf test, src/lib/campaign/rebuild/__tests__/campaignRetroactiveCorrectionCommit.test.ts lines 410-411. That test narrows with outcome.kind !== 'committed', so it compiles unchanged under a wider union. No leaf change is implied. Admission must re-run the consumer scan at its own baseline; if a consumer outside the eight leaves needs an edit, that needs a registration correction.

All 31 checks on the merged head succeeded (run 38953555934). The [merge receipt](evidence/p2cg1a2-merge-20261016.json)
binds both ordered parents and the matching integration tree. GitHub enforces no required-check names on main, so each name was verified individually.
The [main proof](evidence/p2cg1a2-mainproof-20261016.json) is a fresh run at the merge before any closure edit:
the Task 14 selector and the 31 binder-user suites together (35 suites, 369 tests), the selector alone (4 suites, 96 tests),
the callers alone (31 suites, 273 tests), typecheck and the validator passed. It references the attempt logs by hash.

P2CG1A2 has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CG1A2 therefore releases
its in-flight src/lib/multiplayer/server reservation at main-verified.

No successor is released. P2CG1B stays blocked: the parent holds it under the TypeScript-7 track (#2170)
until that track's stopping condition is met or an explicit waiver is recorded.
P2CG1B, P2C, the TS7 units and every other unit state are unchanged.
Selection is not downstream admission.
This closure metadata still requires its own review, CI and parent merge.

---

## 2026-10-16 P2CG1A1 source verified on main; P2CG1A2 released; closure metadata proposed

P2CG1A1 advances from implementing to main-verified for source PR #2166,
head cdd846752139220d6d531ea0fa6e0d5bad65a111, merge f11c64d98782f134380dfe6513a9eeb360aaac38.
Its baseline remains the admission base 6645308f4d6bdd6a424e73761ee20ffa81f8101f.
The owner explicitly authorized this ruling in chat, and it was posted as [comment 6221546750](https://github.com/SwiggitySwerve/MekStation/pull/2166#issuecomment-6221546750);
its exact UTF-8 body (603 bytes), without an added newline, hashes to 19460810121eda1055890bc812b94798539290f717c8da22983a772f2483739c.
The merge (17:56:58Z) preceded the ruling (17:57:02Z); this record preserves that chronology.
PK-p2cg1a1-ruling is first recorded here, after both the merge and the ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2cg1a1-review-20261016.json) binds the Fable 5.1 review of the exact merged head, preserved byte for byte
(APPROVE-WITH-NOTES, no blockers, no majors, minors M1-M4, notes N1-N2; author Opus 5.5; sha256 99846b38e2528d859660f76c65fddee077cb27d7f38891bc2a46f599ab95e21d).
The reviewer re-ran its own move proof (11 of 11 mutations caught), madge on head and base (174 chains each, identical),
the Task 14 selector plus the 31 caller suites on head and base (35 suites, 369 tests, identical rows), typecheck, lint, lint:units and the validator.
The author's stable run had three spawnSync timeouts in the two roadmap script suites, which pass alone (52/52, 146/146); the reviewer judged that credible.
Move-proof wording (review M2): "sameAppliedView equals base modulo formatter wrap and a trailing comma; the other eleven are byte-equal."
The reserved p2cg1a1-admission-review-20261016.md slot stays unwritten.

The review's carry-forward wording for P2CG1A2, verbatim (section 7 items 1-7, the section 4(a) fit paragraph,
the minors M1-M4 and notes N1-N2 from section 6), is recorded under successorNotes in the review receipt:

- P2CG1A2 A2-CF1 (block to move): "Block to move: class CampaignApplicationConnection with its doc comment, binder lines 1711-2049 at d0a7dd8b6 (339 physical lines), lines 1579-1917 at cdd846752; re-measure at the A2 baseline and record both the registered 1724-2049/326 and the measured figures in the admission receipt."
- P2CG1A2 A2-CF2 (type-only binder imports): "The class uses only IWireCampaignSocket and ICampaignSessionMembershipPort from the binder, both as types; import them with `import type` from './bindCampaignSyncConnection'. Runtime names come from campaignApplicationConnection.ts only."
- P2CG1A2 A2-CF3 (new imports): "New imports the slice-1 file needs for the class: randomUUID (node:crypto); ServerMatchBroadcaster; campaignEventWireFrame; CampaignPublicAppliedViewStore and readCampaignPublicAppliedView, and type CampaignApplicationResult (@/lib/campaign/sync/campaignPublicAppliedView); type ICampaignHostRegistryEntry (./CampaignHostRegistry). None of these modules reaches the binder at runtime."
- P2CG1A2 A2-CF4 (drop six exports): "After the move the binder no longer uses IApplicationCandidate, IApplicationView, COMMIT_ATTEMPTS, HEAD_DRIFT, preparePublicCut or sameAppliedView; drop those six exports (permitted as export-keyword changes), which returns sameAppliedView to base bytes and removes the explicit-module-boundary-types warning. Binder imports from the new module then: NOT_OFFERED, errorFrame, isApplicationAck, send, plus the ICampaignApplicationReceiptPort type re-export."
- P2CG1A2 A2-CF5 (moved-text comparison wording): "Moved-text comparison wording: each moved block equals base modulo the export keyword and formatter layout; state which blocks, if any, are not byte-equal."
- P2CG1A2 A2-CF6 (expected lint and madge): "Expected lint: binder max-lines warning drops further; campaignApplicationConnection.ts trips max-lines at about 400 counted lines (per #2167); madge chain count 175 (one new type-only binder <-> new-file chain) unless the parent rules otherwise."
- P2CG1A2 A2-CF7 (counted-line estimate): "Counted-line estimate 372-380 of 500; 7 of 15 files with the reserved review slot."
- P2CG1A2 block range and fit (section 4(a)): "**(a) Registered range 1589-1723 ends inside the class doc comment.** Verified at base: moved block 1589-1709, class doc comment 1711-1723, class 1724-2049. Keeping the comment with its class is correct; the alternative orphans a doc comment. A2's block is therefore 1711-2049 (339 physical) at base d0a7dd8b6, and sits at 1579-1917 in the head binder. PR #2167 did not correct A2's text: `P2CG1A2.behavior` still reads "binder lines 1724-2049 ... 326 physical lines". A2 fit: my dependency scan of the class shows it uses only two binder declarations (IWireCampaignSocket, ICampaignSessionMembershipPort, both interfaces, both exported, type-only use) and needs these imports the new file lacks: randomUUID, ServerMatchBroadcaster, campaignEventWireFrame, CampaignPublicAppliedViewStore + readCampaignPublicAppliedView, and the types ICampaignHostRegistryEntry and CampaignApplicationResult; none of those modules reaches the binder at runtime. Estimate: 339 + roughly 15-20 import lines + 1-3 binder import lines + 16 lifecycle, about 372-380 counted lines. Inside the registered 370-410 and under 500 with margin. A2's admission must re-measure at its own baseline: block start/end lines in the post-A1 binder, physical count 339, and the counted total."
- P2CG1A2 exports and warning (section 4(b)): "**(b) explicit-module-boundary-types warning on exported sameAppliedView.** Verified: base 85 warnings, head 86, 0 errors both; the single new warning is this one; the binder's max-lines warning drops from 1773 to 1638 counted lines. Acceptable for a move-only slice: a return annotation would change moved text. After A2 the class is the only consumer of sameAppliedView (and of IApplicationCandidate, IApplicationView, COMMIT_ATTEMPTS, HEAD_DRIFT, preparePublicCut), so A2 can drop those six exports, which returns sameAppliedView to one line and base bytes and removes the warning. The registration's "unchanged apart from export keywords" covers that."
- Minor M1: "M1 (docs, A2): `P2CG1A2.behavior` range and count are stale (1724-2049 / 326; actual 1711-2049 / 339 at d0a7dd8b6; 1579-1917 at this head). #2167 did not fix it. Amend in the A2 release-to-planned PR or record in A2's admission receipt as A1 did."
- Minor M2: "M2 (docs, parent review receipt): record the sameAppliedView layout exception in one sentence (section 4c)."
- Minor M3: "M3 (lint, A2): one new explicit-module-boundary-types warning; disappears when A2 drops the six exports only the class uses."
- Minor M4: "M4 (madge, A2): importing IWireCampaignSocket and ICampaignSessionMembershipPort as types from the binder will add exactly one madge chain (binder <-> new file, type-only; madge counts type imports, as the existing `bindCampaignSyncConnection.ts > handleRoomCodeGuestJoin.ts` chain shows). Runtime closure stays acyclic. A2's receipt should expect 175, not 174, or move the two interfaces, which the registration does not currently allow."
- Note N1: "N1: `.github/workflows/pr-checks.yml` changed on main after this base (#2153). The PR's green run used the head's workflow set; the parent should confirm the required-check names on the merge ref before the guarded merge."
- Note N2: "N2: the ownershipExceptions edit lists the reserved `p2cg1a1-admission-review-20261016.md` slot; it is absent at head, as required."

All 31 checks on the merged head succeeded (run 38941078224). The [merge receipt](evidence/p2cg1a1-merge-20261016.json)
binds both ordered parents and the matching integration tree; GitHub enforces no required-check names on main (N1 stays for P2CG1A2).
The [main proof](evidence/p2cg1a1-mainproof-20261016.json) is a fresh run at the merge before any closure edit:
the Task 14 selector and the 31 binder-user suites together (35 suites, 369 tests), the selector alone (4 suites, 96 tests),
the callers alone (31 suites, 273 tests), typecheck and the validator passed. It references the attempt logs by hash.

P2CG1A1 has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CG1A1 therefore releases
its in-flight src/lib/multiplayer/server reservation at main-verified.

Successor release and range correction (separate from the closure, on owner instruction to reduce ceremony):
P2CG1A2 moves from blocked to planned; its only predecessor, P2CG1A1, is main-verified in this same change set.
Its behavior text's stale range (review M1) is corrected in one sentence, from
"Moves the CampaignApplicationConnection class (binder lines 1724-2049 at base d0a7dd8b6, 326 physical lines) into campaignApplicationConnection.ts" to
"Moves the CampaignApplicationConnection class with its doc comment (binder lines 1711-2049 at base d0a7dd8b6, 339 physical lines) into campaignApplicationConnection.ts".
Nothing else in P2CG1A2 changes; "the class alone is 326 lines" stays, because the declaration without its doc comment is 326 lines.
P2CG1B, P2C and all other unit states remain unchanged.
Selection is not downstream admission.
This closure metadata still requires its own review, CI and parent merge.

---

## 2026-10-16 P2CF2 source verified on main; Task 13 complete; closure metadata proposed

P2CF2 advances from implementing to main-verified for source PR #2162,
head cda526457f919bba39abe9e64847ecbf6a696958, merge ad2822abe66faf80caab6ffaa4fd7eb66b2e8030.
Its baseline remains the admission base d823114d7c01aeebb846b51074cf6d7b66c59f6f.
The owner explicitly authorized this ruling in chat, and it was posted as [comment 6218213354](https://github.com/SwiggitySwerve/MekStation/pull/2162#issuecomment-6218213354);
its exact UTF-8 body, without an added newline, hashes to 94e2d3ea7ee7de1363c3dc567d244ce2f4c001a69535b381fa6eb5eaa9458a34.
The merge (14:55:54Z) preceded the ruling (14:55:58Z); this record preserves that chronology.
PK-p2cf2-ruling is first recorded here, after both the merge and the ruling.

With P2CF2 main-verified, plan Task 13 is complete: both P2CF slices
(P2CF1 #2159, P2CF2 #2162) are main-verified, and the full plan Task 13
QA selector passes at this merge (3 suites, 54 tests). The reviewer judged Task 13
complete as a whole at the mounted-dormant level the plan allows in this phase:
production traffic stays legacy because no creator binds expectedCampaignId.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2cf2-review-20261016.json) binds the Fable 5.1 review of the exact merged head, preserved byte for byte
(APPROVE-WITH-NOTES, no blockers, one new design-level major M2, minors m7-m14; author Opus 5.5; sha256 eb4962d758612601a7eaf88f7a0b47c9bad408992d1f0c6754f1c6b2a3bdfd7c).
The reviewer re-ran the three edited suites (62 tests), the P2CF2 selector (7 suites, 155 tests), the plan Task 13 selector
(3 suites, 54 tests) and the 48 caller suites (483 tests) on the head.
The author's stable run 2 (2796 suites, 37180 passed) ran on source and test bytes equal to the committed blobs.
useCampaignPersistenceStore.ts keeps its pre-existing max-lines warning; the component has five counted lines of headroom (m13).
The reserved p2cf2-admission-review-20261016.md slot stays unwritten.

The review's carry-forward wording, verbatim (section 9, with M2 and the minors from section 8, the recovery semantics from section 5,
the judged deviations from sections 2 and 3, and the completeness statement from section 10), is recorded under successorNotes in the review receipt:

- Task 14 CF1 (corrected; per-binding reset): "On every change of the component's binding, dispose the previous consumer before the new bind. The host fold is reset to `EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD` per binding; the guest mirror is module-scoped and is NOT reset: a receipt baseline replaces it from EMPTY (`applySnapshot(event, -1, true, facts)`), a legacy join keeps quoting its `lastSequence`. A rebind does not imply a reconnect: `connectStoredCampaignSyncTransport` reuses the match's active transport (see CF11)."
- Task 14 CF3 (corrected; replacement baseline at cursor -1): "A baseline offer is adopted with `replacement = true` and the frame's bundle at cursor -1: `foldCampaignHydration(fold, frame.event, frame.hydrationFacts, true, -1)` for the host, `applySnapshot(frame.event, -1, true, frame.hydrationFacts)` for the guest, so a first live event at sequence 0 is admitted. The receipt chain, not the cursor, orders offers."
- Task 14 CF7, CF8, CF9 (reviewer): "**CF7, CF8, CF9**: unchanged from the P2CF1 review and the P2CF1 closure receipt."
- Task 14 hard precondition CF7 (M1 precondition, carried verbatim from the P2CF1 closure receipt): "Before `applicationReceipts` is composed into `bindCampaignSyncConnection` and `expectedCampaignId` is bound at every creator (CampaignCoopEntryPanel.tsx 328, CampaignCoopRouteSurfaceConnected.tsx 156 and 268, launch.tsx), close M1 by one of: (a) the client ignores `campaign-application-unknown-receipt` when a newer offer has been registered since the refused ACK (`latest !== sent`) and otherwise rejoins; (b) the binder admits an ACK of any established receipt of the live view as `stale` (no frame) and reserves `unknown-receipt` for receipts the view never issued, or names the refused `appliedView` in the refusal frame. Record the choice in the owning unit's contract before source execution."
- CF7 placement (section 5): "The author's placement is right. `handleApplicationRefusal` in the P2CF1 transport calls `recover('application-refused')` (view torn down, `failed = true`, `pending` cleared) before any `onError` listener runs, so the consumer cannot "ignore a superseded unknown-receipt"; option (a) can only live in `campaignSyncTransport.ts`, a P2CF1 leaf outside `restrictions.P2CF2`. Editing it would have been an unregistered leaf. CF7 stands as the Task 14 precondition."
- Task 14 CF8 (bounds, carried verbatim from the P2CF1 closure receipt): "Decide the client bound for head-drift re-sends (m1) and for a lost refusal (P2CE3 Task14 item 4): either route typed refusals through `sendConfirmed` or have the consumer rejoin after a bounded wait without confirmation or refusal."
- Task 14 CF9 (binding at creators, carried verbatim from the P2CF1 closure receipt): "`connectStoredCampaignSyncTransport` returns `null` when an existing transport's `campaignId` differs from the supplied `expectedCampaignId`; bind at every creator in the same change, or the mounted surface detaches from the entry panel's transport."
- Task 14 CF10 (new, rejoin re-seat): "The consumer's rejoin closes the match's shared transport and deletes it from `activeTransports`. `CampaignCoopEntryPanel.tsx` (328-344) and `launch.tsx` (149, 177) hold references to the closed instance and never learn of the replacement. Before `expectedCampaignId` is bound at those creators, either make them resolve the transport through `getActiveCampaignSyncTransport` on each use, or publish a registry change the surface's rejoin triggers, or make the mounted surface the sole creator of the bound transport."
- Task 14 CF11 (new, M2): "A host binding on an already-hydrated bound transport (route navigation between the three host-mounting pages, a StrictMode remount, any effect re-run without the transport closing) starts from EMPTY with `latched = false`; its first linked offer fails the adjunct check and forces a rejoin. Before activation decide one of: hold the host fold in a module-scoped store like the guest mirror so a rebind continues the lineage; close the transport in the surface cleanup so every binding gets its own hydration; or accept one rejoin per navigation and measure it. Keep `retainsLaunchFacts` in every case: with it removed the rebind ACKs a fold seeded from EMPTY as applied (reviewer probe P1)."
- Task 14 CF12 (new, close visibility): "`socket.onclose` sets `closed` and clears `pending` but emits nothing; a close with no offer in flight is invisible to the consumer (probe P7). When the transport leaf is next open, surface the close (an `onClose` handler or an `emitError` with a recovery-required reason) and make the consumer rejoin on it."
- Task 14 CF13 (new, queue hardening): "In `useCampaignApplicationConsumer.ts`, chain `.catch(() => rejoin())` on the per-offer queue step so a throwing `confirmApplied` (or any future throw outside `settle`'s try) ends the binding with a rejoin instead of stalling the queue (probe P4)."
- Task 14 CF14 (new, persistence): "`adoptFlushedRevision` adopts a row without bumping `loadGeneration`; a guarded refresh whose GET read the pre-flush row can install an older `baseVersion` after it. Bump the generation in `adoptFlushedRevision`, or refuse to adopt in the guarded path when `migrated.version < get().baseVersion`."
- Tests to register: "**Tests to register with the next change that opens these leaves:** the host sequence-0 case (m7), P1 as a registered case and a GM fact-bearing baseline/launch case (m8)."
- Major M2 (verdict): "One new major (M2) that is a design-level cost for Task 14, not a defect in this slice: the host fold is component-local and resets per binding, while `connectStoredCampaignSyncTransport` reuses the match's live transport, so any rebind without a reconnect (route navigation between the three host-mounting pages, a StrictMode remount, a `roomCode` change) starts a binding from EMPTY on an already-hydrated connection. In receipt mode that costs one rejoin per occurrence (fail-closed through the adjunct check, which my probe shows is load-bearing there, so the author's "H15 equivalent" claim is wrong); in legacy mode it is the pre-existing lossy seed. The test that proves the per-binding reset uses a mock that opens a new connection on every call, so it does not model the real transport's reuse."
- Major M2 (finding): "**M2 (new; design-level, Task 14 cost, not a P2CF2 deviation). Rebind on a live transport starts from EMPTY.** `connectStoredCampaignSyncTransport` returns the match's active transport when one exists (lines 495-505); the surface's cleanup never closes it; the host fold is a `useRef` of this component and is now reset on every effect run. So every binding that is not the first on a connection (route navigation between `CampaignDashboardPage.tsx` 354, `personnel.tsx` 107 and `campaignPageShell.tsx` 358, a StrictMode remount, a `roomCode`-only change) binds an EMPTY fold with `latched = false` to an already-hydrated connection that will send no new baseline. In receipt mode the next linked offer fails the adjunct check and forces a rejoin (P1): correct state, one reconnect per navigation. In legacy mode the next event seeds the fold from empty (pre-existing for a fresh mount; new for a `roomCode`-only change, which no client code performs today: `coopSession.roomCode` is written only at creation in `CampaignCoopEntryPanel.tsx` 258/333). The registered proof ("starts every host binding from an empty fold...") installs a mock `connectStoredCampaignSyncTransport` that records a new connect per call, so it demonstrates the reset but not production's reuse. My CF1 wording ("before the new transport opens") assumed a reconnect per rebind; I correct it in section 9. Owner decision before Task 14 activation (CF11): hold the host fold in a module-scoped store as the guest mirror is, or close the transport in the surface cleanup so each binding gets its own hydration, or accept one rejoin per navigation; in every case keep the adjunct check, which is what makes the path fail closed."
- M2 probe P1: "| P1 host rebind on a live, already-hydrated bound transport (dispose A, reset fold, bind B, inject linked r2) | no ACK for r2, socket closed, one rejoin: fail-closed via `adjunct-failed` (`launchFacts` undefined on the from-empty fold). **With the adjunct check removed (H15) the same probe ACKs r2 as `applied` over a fold seeded from EMPTY** (balance 700_000, chain r0 r1 r2, no rejoin). H15 is not equivalent. |"
- Recovery semantics (section 5): ""One rejoin per occurrence": `rejoin()` is idempotent per binding (`live` flag), closes the transport, and bumps `rejoins` so both effects re-run; the host resets its fold, the guest's next baseline replaces. Each M1 hit therefore costs one close + fresh join + replacement baseline; durable state is unaffected (cumulative commit already covers the refused receipt). Safe but not free; the frequency at Task 14 is why CF7 is hard."
- Recovery semantics (section 5): "Unlimited rejoins: each cycle needs a server refusal or close, so there is no tight loop; a server that refuses every join would cause a reconnect per refusal. CF8 (bounds) stands."
- Recovery semantics (section 5): "Rejoin closes the shared transport: `transport.close()` deletes it from `activeTransports`; the entry panel and the launch page keep references to the closed instance. Unreachable before Task 14 binds creators; new carry-forward CF10."
- Recovery semantics (section 5): "`confirmApplied` throwing stops the queue without a rejoin (author concern 1): confirmed by probe P4 (baseline confirm throws -> no ACK, no refresh for the next offer, `rejoins` 0, jest reports the rejection). Nothing in the shipped transport throws there (send failures are caught inside `drain`), so fail-closed today; m9."
- Recovery semantics (section 5): "Socket close with no offer in flight: confirmed invisible (probe P7, `rejoins` 0 after `onclose`). The transport's `onclose` sets `closed` and clears `pending` but emits nothing; the consumer learns only through a `refused: closed` confirm result or an INTERNAL_ERROR frame. Transport leaf; CF12."
- Minor m7: "**m7. Host baseline cursor is unpinned.** My MD mutation (host `foldCampaignHydration(..., true, 0)`) survives all 62 tests; the author's H18 mutated the guest call only. Add a GM case in `hostRecordRefresh.test.tsx` that sends `linkedOffer('v1', 1, fundsChangedFrame(0, ...))` after the baseline and expects the r1 ACK."
- Minor m8: "**m8. H15 is not an equivalent mutant and the GM adjunct path has no fact-bearing test.** All GM cases use `hydrationFacts: []` and never send a `CampaignMissionLaunched` offer; the adjunct check's only GM coverage is incidental. Register P1 (rebind on a live bound transport -> no `applied` ACK, rejoin) and one GM baseline with a non-empty bundle plus a live launch."
- Minor m9: "**m9. `confirmApplied` throwing rejects the serial queue** (P4; author concern 1): later offers never settle and no rejoin follows. Nothing throws there today. Add `.catch(() => rejoin())` on the queue step the next time the hook leaf is open (CF13)."
- Minor m10: "**m10. Socket close with no offer in flight is invisible** (P7; author concern 2). Transport leaf; CF12."
- Minor m11: "**m11. Flush reconciliation does not supersede a guarded refresh** (author concern 5; section 4). Pre-existing for the legacy refresh; CF14."
- Minor m12: "**m12. The guarded refresh does not announce `saving`.** Behaviour difference for a receipt-bound GM only; decide at Task 14 and amend the behaviour text either way."
- Minor m13: "**m13. Component headroom is five counted lines** (395 against the 400 warning). Task 14's creator binding and any CF11 change will cross it; plan the extraction with the registration, as P2CE2 did for the binder."
- Minor m14: "**m14. P2CF1 minors status.** m1 (re-send bound) -> CF8 stands. m2/m3 (transport untested branches) remain; the transport was correctly not touched. m4 (byte equality on non-replacement hydration) is closed for the client: the consumer never uses the non-replacement path for a baseline. m5 (fold does not check the snapshot's campaign on non-replacement) is covered three times on the receipt path: the consumer gate, `registerOffer` (`frame.event.campaignId !== options.expectedCampaignId` -> prefix-conflict, P5) and `projectAuthoritativeStateOntoCampaign` (`current.id !== campaignId` -> null -> `projection-failed`). m6 (dropped confirmation) is moot: the consumer awaits no confirmation (CF4 honoured)."
- Deviation judged (cursor -1, section 2): "Cursor -1 versus CF3's literal 0 (author deviation): correct. The server frames every baseline at `sequence: -1` (`bindCampaignSyncConnection.ts` 1859, `CampaignSyncSession.ts` 932) and the log hands out sequences from 0 (`campaignHostBatchCommit.ts` 112 `sequence = await host.nextSequence()`, healed logs start at `nextSequence: 0`; the mirror store's own doc says "the following log events (sequence 0+)"). `foldCampaignEvent` refuses `event.sequence <= fold.lastSequence`, so a baseline adopted at 0 would refuse a first live event at 0 and the consumer would report `fold-rejected`, which the transport turns into `recover('application-failed')` and a rejoin loop on a fresh campaign. The legacy adopt-at-0 convention (`foldCampaignFrame`, entry panel `applySnapshot(snapshot, 0)`) carries that latent edge; the receipt path avoids it. The ordering guarantee on the receipt path comes from `registerOffer`'s receipt chain (`previousReceiptId === latest.receiptId`), not from the cursor, so -1 loses nothing. The guest side is pinned; the host side is not (m7)."
- Deviation judged (guest mirror not reset per binding, section 3): "Guest mirror not reset per binding (author deviation from CF1): correct, and better than my CF1 wording. The mirror store is module-scoped and holds the lineage across a rebind (probe P8: a second binding on the same live transport continues the chain and ACKs r2 with the right date and balance); `beginMirror` per binding would discard the entry panel's seeded mirror and the `lastSeq` the legacy guest join quotes; in receipt mode every baseline is an authorized replacement from EMPTY, which is the "reconnect cannot adopt stale held proof" clause at the mirror level. CF1 is corrected in section 9."
- Note N1 (for this closure, not applied): "**N1.** Deviations judged: cursor -1 (section 2) and the guest mirror not reset per binding (section 3) are both correct and should become the behaviour text at closure: "the baseline is adopted as an authorized replacement from EMPTY at cursor -1; the guest mirror is replaced by the view's baseline rather than reset per binding; a guarded refresh does not announce `saving`"."
- For P2CF2 closure: "For P2CF2 closure (behaviour text): N1; record M2 and m7/m8 as known gaps with the tests named."
- Task 13 completeness (section 10): "Task 13 is complete as a whole at the level the plan allows in this phase: callable, mounted, proven primitives and consumer with production traffic kept legacy (clarification 2924). What remains before P2CG1: this slice's closure (independent review receipt, merge, exact-main mainProof) with the N1 behaviour-text amendment; the Task 14 preconditions CF7 (M1), CF9 (bind every creator), CF10, CF11 (M2) and the P2CE3 Task 14 items (C1 readiness doors, C2 seat read, N4 backfill, refusal write-check, binder extraction, `preparePublicCut` budget); and the test gaps m7/m8, which should ride with whichever unit next opens the hook or the GM suite."

M2 and M1 are dormant and fail-closed: no production creator binds expectedCampaignId and server.js composes no applicationReceipts.
CF1 and CF3 above correct the P2CF1 closure receipt's CF1 and CF3; that receipt is not edited. CF7-CF9 stand unchanged.
Notes N2-N5 are in the review receipt. N1 (amend the P2CF2 behavior text with the two judged deviations and the saving difference)
is not applied, because behavior is a contract field rather than a lifecycle field; it stays open with M2 and the m7/m8 test gaps.

All 31 checks on the merged head succeeded. The [merge receipt](evidence/p2cf2-merge-20261016.json)
binds both ordered parents and the matching integration tree. The [main proof](evidence/p2cf2-mainproof-20261016.json)
is a fresh run at the merge before any closure edit: the three edited P2CF2 suites (62 tests), the P2CF2 registration
selector (seven suites, 155 tests), the plan Task 13 selector (three suites, 54 tests),
typecheck and the validator passed. It references the attempt logs by hash.

P2CF2 has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CF2 therefore releases
its in-flight src/components/campaign/coop and src/stores/campaign reservations at main-verified, while
P2CG1, P2C and all other unit states remain unchanged.
Selection is not downstream admission.
This closure metadata still requires its own review, CI and parent merge.

---

## 2026-10-16 P2CF1 source verified on main; closure metadata proposed

P2CF1 advances from implementing to main-verified for source PR #2159,
head 000295a1d9e1b28d5f98dd5aea6f58b5bc65d6f3, merge 4895b2c3664a9d1f802ef947f05b90aac29862a0.
Its baseline remains the admission base a1d2293b941b5aaf2b618f451294cbb2dae4f1b4.
The owner explicitly authorized this ruling in chat, and it was posted as [comment 6215650627](https://github.com/SwiggitySwerve/MekStation/pull/2159#issuecomment-6215650627);
its exact UTF-8 body, without an added newline, hashes to 6da52f0be8d97896824189d053f99337b1ea2db77c0344b24cee71d9a61beed3.
The merge (12:37:05Z) preceded the ruling (12:37:09Z); this record preserves that chronology.
PK-p2cf1-ruling is first recorded here, after both the merge and the ruling.

P2CF1 is the first of the two P2CF slices of plan Task 13; Task 13 is not complete until P2CF2 lands.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2cf1-review-20261016.json) binds the Fable 5.1 review of the exact merged head, preserved byte for byte
(APPROVE-WITH-NOTES, no blockers, one dormant contract-level major M1, six minors; author Opus 5.5; sha256 bc16d36d9a510192b98bd0a6afa7149290abcaa774274731a70e3ec931156e5e).
The reviewer re-ran the three test leaves (87 tests), the P2CF1 selector (5 suites, 103 tests), the plan Task 13 selector
(3 suites, 32 tests), the 26 unmodified caller suites (179 tests) and RED (25 failed / 62 passed) on the head.
The author's stable run (2796 suites, 37143 passed) ran on source and test bytes equal to the committed blobs.
campaignSyncTransport.ts keeps its pre-existing max-lines warning (669 physical lines at head).
The reserved p2cf1-admission-review-20261016.md slot stays unwritten.

The review's carry-forward wording, verbatim (section 9, with M1 and the minors from sections 4 and 8), is recorded under successorNotes in the review receipt:

- P2CF2 CF1 (per-binding fold reset): "On every change of the component's binding (matchId, roomCode, role or campaignId) and before the new transport opens, reset the host fold to `EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD` and the guest mirror through `beginMirror(peers, localPeerId)`, so the join quotes no stale cursor and the first baseline is adopted from EMPTY. This is P2CF2's sole production-visible behaviour change (registration review note 6): record it in the admission receipt and prove it in `CampaignCoopRouteSurfaceConnected.hostProjection.test.tsx` (a `roomCode` change without unmount must not keep `hostFold`)."
- P2CF2 CF2 (refusal routing and recovery): "At both frame handlers, before `setLastRefusalCode`/`setLastRefusalAction`, return early for any `Error` whose `reason?.startsWith('campaign-application-')`; no such reason may set `lastRefusalCode` or gate GM controls. Treat every transport `onError` whose message starts with `Campaign application recovery required:` (application-refused, application-failed, prefix-conflict, pending-overflow, send-failed) and every socket close as an automatic, idempotent rejoin: close the transport, reset fold/mirror per CF1, reconnect and adopt the new baseline as a replacement. Do not surface these as user-facing refusals."
- P2CF2 CF3 (replacement authorization and bundle passing): "A baseline offer (`appliedView.previousReceiptId === null`) is adopted with `replacement = true`: `foldCampaignHydration(fold, frame.event, frame.hydrationFacts, true, 0)` for the host, `applySnapshot(frame.event, 0, true, frame.hydrationFacts)` for the guest. Never pass `undefined` for `hydrationFacts` on an offered baseline, and never use the non-replacement path for a new view. A `null` result is `confirmApplied(offer, { status: 'failed', reason: 'fold-rejected' })` and sends no ACK. Track the view's `viewId` with the held fold so a baseline of another view is recognised as a replacement, not as a conflict."
- P2CF2 CF4 (confirmations): "`onAppliedViewConfirmed` is cumulative and at-least-once: a confirmation naming receipt R covers every earlier receipt of the same `viewId`; duplicates occur; an ACK superseded by a later offer before its confirmation arrived, and a rebaseline whose cut the stored row already covers, receive no confirmation at all. Never block UI, persistence or progression on a per-ACK confirmation; never wait after a rebaseline ACK."
- P2CF2 CF5 (adjunct retention and persistence): "Before `confirmApplied(offer, { status: 'applied' })`: for a baseline offer, the fold/mirror result's `launchFacts` must deep-equal `frame.hydrationFacts`; for a `CampaignMissionLaunched` offer, the result's `launchFacts` must end with `frame.event`; otherwise report `adjunct-failed`. Launch facts live only in the fold and the mirror store (in memory); the persistence store must not write `launchFacts` into the saved campaign record, and the staged maxima prepare ignores them."
- P2CF2 CF6 (ACK discipline): "Call `confirmApplied` in receipt order and exactly once per offer; the transport ACKs only `latest` once the whole pending prefix is applied, which is the cumulative ACK the server expects."
- Task 14 hard precondition CF7 (M1 precondition): "Before `applicationReceipts` is composed into `bindCampaignSyncConnection` and `expectedCampaignId` is bound at every creator (CampaignCoopEntryPanel.tsx 328, CampaignCoopRouteSurfaceConnected.tsx 156 and 268, launch.tsx), close M1 by one of: (a) the client ignores `campaign-application-unknown-receipt` when a newer offer has been registered since the refused ACK (`latest !== sent`) and otherwise rejoins; (b) the binder admits an ACK of any established receipt of the live view as `stale` (no frame) and reserves `unknown-receipt` for receipts the view never issued, or names the refused `appliedView` in the refusal frame. Record the choice in the owning unit's contract before source execution."
- Task 14 CF8 (bounds): "Decide the client bound for head-drift re-sends (m1) and for a lost refusal (P2CE3 Task14 item 4): either route typed refusals through `sendConfirmed` or have the consumer rejoin after a bounded wait without confirmation or refusal."
- Task 14 CF9 (binding at creators): "`connectStoredCampaignSyncTransport` returns `null` when an existing transport's `campaignId` differs from the supplied `expectedCampaignId`; bind at every creator in the same change, or the mounted surface detaches from the entry panel's transport."
- Major M1 (closure is a hard Task 14 precondition): "**M1. Superseded-ACK refusal tears down a live view** (section 4). Contract-level, inherited from P2CE3's admission rule plus the Task 13/P2CF1 refusal wording; P2CF1 is conformant. Owner decision required: option (a) in this PR or P2CF2, or option (b) in Task 14; in all cases before `applicationReceipts` is composed. Recorded as a hard Task 14 precondition in CF7."
- M1 resolution: "Resolution options, owner's call, to be closed before Task 14 activation:"
- M1 option (a): "(a) Client rule in the transport leaf (this PR or P2CF2's transport touch, three lines + one test): *"On `campaign-application-unknown-receipt`, if a newer offer has been registered since the refused ACK was sent (`latest !== sent`), the refusal concerns a superseded ACK: ignore it and let `drain` ACK the latest offer; otherwise end the view as recovery-required. Never re-send on unknown-receipt."* This keeps "never retried with the same frame" and "rejoin when the refusal concerns the current ACK"; it requires a one-sentence amendment of the P2CF1 behaviour text at closure."
- M1 option (b): "(b) Server rule in Task 14 (binder leaf): *"Admit an ACK naming any receipt of the live view's established chain; for a receipt older than `latest` return `stale` and send nothing (cumulative commit already covers it). Reserve `unknown-receipt` for receipts the view never issued."* Or: *"Typed refusal frames carry the refused `appliedView` so the client can discard refusals of superseded ACKs."*"
- M1, either way: "Either way, P2CF2's consumer must treat every `onError` recovery-required as an automatic, idempotent rejoin (CF2), so the cost of M1 is bounded until it is fixed."
- Correction of P2CE3 optional Task 13 item 5: "My own P2CE3 optional item 5 ("never a server-side timing race") was too strong: it holds for ACKs the client sends after receiving Y, not for an ACK already in flight when Y is established. I correct it here."
- Minor m1: "**m1. No client-side bound on head-drift re-sends** (P8). Each cycle is gated by a server refusal after three commit attempts, so it is not a tight loop, and a visible new offer ends it; but a hidden-only tail under sustained churn re-sends indefinitely. Decide a bound or rely on the Task 14 "bound its wait and rejoin" wording (P2CE3 Task14 item 4)."
- Minor m2: "**m2. Untested branch: `socket.send` throwing inside the re-send** -> `recover('send-failed')` (author concern 4; probe P5 confirms the behaviour). Worth one registered case the next time the transport leaf is open."
- Minor m3: "**m3. Re-send has no `socket.readyState !== 1` guard**, unlike `drain`. On a CLOSING socket browsers discard silently; `onclose` then marks the transport closed, so no incorrect state results. Cosmetic consistency."
- Minor m4: "**m4. Held-fact equality is byte equality** (`JSON.stringify`), so a re-sent fact with a different payload key order is refused on a non-replacement bundle (F1). Fail-closed and only reachable on a non-replacement rebaseline, which `registerOffer` does not admit on a live connection; a reconnect uses `replacement`. Record in CF3 so P2CF2 never relies on the non-replacement path for a new view."
- Minor m5: "**m5. The fold does not check the snapshot's `campaignId` on non-replacement adoption** (F3; pre-existing P2CD). Guarded by the mirror store and by `registerOffer` (`prefix-conflict` on a foreign `event.campaignId`); the host fold path in the component relies on the transport. No change needed in P2CF1; note for P2CF2's consumer gate (`transport.campaignId === campaignId`)."
- Minor m6: "**m6. A confirmation of `sent` is dropped when a newer offer is already registered** (P3; pre-existing P2CD filter, now also leaves `confirmed` false). Harmless for the re-send rule (the same condition blocks the re-send), but the consumer never hears that confirmation and must rely on cumulative semantics (CF4)."
- Note N1 (for this closure, not applied): "**N1.** Amend the P2CF1 behaviour text at closure to the eleven-reason wording in section 7 and to mention `foldCampaignHydration`'s signature `(fold, snapshot, hydrationFacts, replacement?, resumeSequence?)` and the mirror's fourth positional argument."

M1 is dormant and fail-closed: no production creator binds expectedCampaignId and server.js composes no applicationReceipts.
The P2CE3 review receipt is not edited; the correction above supersedes its optional Task 13 item 5 for an ACK already in flight
when the next offer is established. Notes N2-N5 are in the review receipt. N1 (amend the P2CF1 behavior text) is not applied,
because behavior is a contract field rather than a lifecycle field; it stays open.

Two registration review minors stay open (docs/audits/2026-10-16-p2cf-split-registration-fable-review.md):
P2CE3.successors and P2CE.successors still name P2CF, and P2CF1's successorNotes do not name the unregistered callers
CampaignCoopEntryPanel.tsx and CampaignCoopRouteSurfaceConnected.tsx whose signatures must stay compatible.
Both are other-unit or contract fields and are not edited here; the reviewer confirmed both callers compile and pass unedited.

All 31 checks on the merged head succeeded. The [merge receipt](evidence/p2cf1-merge-20261016.json)
binds both ordered parents and the matching integration tree. The [main proof](evidence/p2cf1-mainproof-20261016.json)
is a fresh run at the merge before any closure edit: the three P2CF1 leaves (87 tests), the P2CF1 registration
selector (five suites, 103 tests), the plan Task 13 selector (three suites, 32 tests),
typecheck and the validator passed. It references the attempt logs by hash.

P2CF1 has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CF1 therefore releases
its in-flight src/lib/campaign and campaignMirrorStore reservations at main-verified, while
P2CF2, P2C and all other unit states remain unchanged.
Selection is not downstream admission.
This closure metadata still requires its own review, CI and parent merge.

---

## 2026-10-16 P2CE3 source verified on main; Task 12 complete; closure metadata proposed

P2CE3 advances from implementing to main-verified for source PR #2155,
head b0077efae37a69e555a1b39062fd8438a2ce9a38, merge 285e710d6316bb212c23b3f7275c547132cab245.
Its baseline remains the admission base 842257c0b664138c560ef17f36df40c0c8e220da.
The owner explicitly authorized this ruling in chat, and it was posted as [comment 6212872642](https://github.com/SwiggitySwerve/MekStation/pull/2155#issuecomment-6212872642);
its exact UTF-8 body, without an added newline, hashes to f5ecc01a508d38683104d26cd9879496d886eefc1d7be827a411f7b3609c2d64.
The merge (09:52:16Z) preceded the ruling (09:52:19Z); this record preserves that chronology.
PK-p2ce3-ruling is first recorded here, after both the merge and the ruling.

With P2CE3 main-verified, plan Task 12 is complete: all three P2CE slices
(P2CE1 #2147, P2CE2 #2150, P2CE3 #2155) are main-verified, and the plan Task 12
selector passes at this merge (6 suites, 154 tests).

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2ce3-review-20261016.json) binds both Fable 5.1 review rounds, preserved byte for byte:
round 1 on b803b5d1 (REQUEST-CHANGES, blocker B1: a written offer was refused during the previous offer's commit)
and round 2 on the exact merged head (APPROVE-WITH-NOTES, B1 fixed, no blockers or majors; author Opus 5.5).
The reviewer re-ran the two test leaves (100/100), the registered QA selector (7 suites, 174 tests)
and the plan Task 12 selector (6 suites, 154 tests) on the final head.
The author's fix-round stable run (2795 suites, 37114 passed) ran on leaf bytes equal to the committed blobs.
bindCampaignSyncConnection.ts keeps its pre-existing max-lines warning (2197 physical / 1773 counted lines).
The reserved p2ce3-admission-review-20261016.md slot stays unwritten.

The review's carry-forward wording, verbatim (round 1 section 8 with the round 2 updates), is recorded under successorNotes in the review receipt:

- Task 13 (client): "The client MUST NOT wait for a confirmation of a rebaseline ACK. When the stored `campaign_public_applied_view` row already covers the new baseline's cut (returning member, or rejoin after `campaign-application-confirmation-failed`), P2CA returns `stale` and the server sends nothing. Absence of a confirmation after a rebaseline means covered, never pending."
- Task 13 (client): "Confirmations are cumulative and at-least-once per committed receipt, not one per ACK. An ACK superseded in the single early-ACK slot by a later exact ACK of the same view receives neither a confirmation nor a refusal, and two racing ACKs of one receipt may produce one confirmation. A confirmation naming receipt R covers every earlier receipt of the same `viewId`."
- Task 13 (client): "`campaign-application-head-drift` leaves the view live and commits nothing; the client MUST re-send the same ACK (or ACK the next offer) to retry. `unknown-receipt`, `not-offered`, `receipt-required` and `current-authority` MUST NOT be retried with the same frame; rejoin for a fresh view."
- Task 13 (client): "ACKs MUST be sent in receipt order on one connection; the server's slot and commit ordering assume it."
- Task 13 (client, optional, round 2): "While a connection's view is live, every offer whose bytes the client has received is admissible: the offer in flight (until its write and the previous offer's commit settle) or the latest established offer. A `campaign-application-unknown-receipt` refusal therefore means the view changed (rejoin, supersession, or an altered or foreign receipt), never a server-side timing race; the client MUST treat it as a rejoin signal, not a retry signal."
- Task 14 hard composition precondition (C1, convergence gate, unchanged): "Task 14 MUST NOT compose `applicationReceipts` into `bindCampaignSyncConnection` until the launch/readiness doors read `campaign_public_applied_view` rows for convergence; receipt-mode participants are not retained by `CampaignSyncSession` and the legacy numeric gate cannot see them."
- Task 14 hard composition precondition (C2/N3, same-connection seat read, now guarding two sites): "`ICampaignApplicationReceiptPort.database()` MUST return the same better-sqlite3 connection `getSQLiteService().getDatabase()` returns, or the participant store must gain a handle-taking seat read that P2CE3's `preparePublicCut` and `readCurrentContext` both use. Two seat reads now run on the singleton inside transactions on the port's handle (the capture in `preparePublicCut` and P2CA's `accept`); the same-cut and same-context guarantees depend on them being one connection."
- Task 14 hard composition precondition (N4, branch backfill, unchanged): "Every campaign served in receipt mode MUST have its effective-head branch backfilled before `applicationReceipts` is composed; otherwise joins fail closed with `campaign-application-unavailable`."
- Task 14 (refusal frames are not write-checked): "Typed refusals (`INVALID_INTENT campaign-application-*`) go through the legacy `send`, which swallows socket errors; a lost refusal is indistinguishable from a commit still in progress. Before composition either route refusals through `sendConfirmed` (closing on failure) or require the Task 13 client to bound its wait and rejoin."
- Task 14 (binder size, round 2 wording): "`bindCampaignSyncConnection.ts` is 2197 physical / 1773 counted lines (max-lines 400 warning). Register the move-only extraction of `CampaignApplicationConnection`, `preparePublicCut`, `IApplicationView` and `ICampaignApplicationReceiptPort` into `src/lib/multiplayer/server/campaignApplicationConnection.ts` (P2CE2 `successorNotes.afterP2CE3`) and land it before Task 14 touches the binder again."
- Task 14 (performance, P2CE2 C3, unchanged): "measure `preparePublicCut` per commit with N views before composition; P2CE3 runs it once more per ACK attempt."
- Follow-up (CI flake, round 2 section 7): "`ThreeContextPrivacyEvidence.test.ts`: journal revisions are asserted absent as bare decimal substrings (`71001`, `71003`, `72011`, `72012`) over a blob that contains random 32-hex ids (`opaqueRef`, `deliveryEpochId`). A random id containing one of those digit runs fails the suite (CI run 38874217230, PR #2155, about 2e-4 per run). Fix: assert revision absence structurally (walk the parsed history page, timeline and export and require no number or numeric string equal to a forbidden revision), or match JSON-delimited tokens (`:71003,`/`:71003}`/`"71003"`) instead of raw substrings; keep substring scans for the marker strings and `RAW_FIELD_NAMES`. Confirm with the forced-tail setup hook from the P2CE3 ci-flake attempt (`force-710036.setup.js`) that the fixed test passes with the colliding tail and still fails if a real `committedLastRevision` is injected."

The CI flake is pre-existing and unrelated to P2CE3. The suite forbids bare revision
substrings such as 71003 in output that contains a random 16-byte hex opaqueRef, so about
1-2 runs in 10,000 fail. It failed one shard on b803b5d1. The fix needs its own registered
scope that matches revisions as JSON-delimited tokens; nothing is registered or changed here.
The binder extraction (P2CE2 successorNotes.afterP2CE3) is now due, and it must land before any further binder work.
P2CE2's other successorNotes stay in force and are not restated.

All 31 checks on the merged head succeeded. The [merge receipt](evidence/p2ce3-merge-20261016.json)
binds both ordered parents and the matching integration tree. The [main proof](evidence/p2ce3-mainproof-20261016.json)
is a fresh run at the merge before any closure edit: the two P2CE3 leaves (100 tests), the registered
QA selector (seven suites, 174 tests), the plan Task 12 selector (six suites, 154 tests),
typecheck and the validator passed. It references the attempt logs by hash.

P2CE3 has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CE3 therefore releases
its in-flight src/lib/multiplayer/server reservation at main-verified, while
P2CF, P2C and all other unit states remain unchanged.
Selection is not downstream admission.
This closure metadata still requires its own review, CI and parent merge.

---

## 2026-10-16 P2CE2 source verified on main; closure metadata proposed

P2CE2 advances from implementing to main-verified for source PR #2150,
head c6d7293642e2c923c7f244a32464c942f0f4db36, merge 38f3c125925baa254f27788b30efa88d5915648c.
Its baseline remains the admission base 249779306c1f6336bf2b5ffa23cf7f453b5aa228.
The owner explicitly authorized this ruling in chat, and it was posted as [comment 6209504917](https://github.com/SwiggitySwerve/MekStation/pull/2150#issuecomment-6209504917);
its exact UTF-8 body, without an added newline, hashes to 98f5b94ce953243cd900038c2b318bd4ef9b19180f2b5d00394124ee34b5f1a0.
The merge (06:25:57Z) preceded the ruling (06:26:05Z); this record preserves that chronology.
PK-p2ce2-ruling is first recorded here, after both the merge and the ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2ce2-review-20261016.json) binds the Fable 5.1 review
of the exact merged head (APPROVE-WITH-NOTES, no blockers or majors; author Opus 5.5), preserved byte for byte.
The reviewer re-ran the two test leaves (45/45) and the registered QA selector (7 suites, 155 tests).
The author's stable run (2795 suites, 37095 passed) ran on leaf bytes equal to the committed blobs.
bindCampaignSyncConnection.ts keeps its pre-existing max-lines warning (1585 counted lines).
The reserved p2ce2-admission-review-20261016.md slot stays unwritten.

The review's carry-forward wording, verbatim, is recorded under successorNotes in the review receipt:

- Task 14 hard composition precondition (C1, convergence gate): "Task 14 MUST NOT compose `applicationReceipts` into `bindCampaignSyncConnection` until the launch/readiness doors read `campaign_public_applied_view` rows for convergence; receipt-mode participants are not retained by `CampaignSyncSession` and the legacy numeric gate cannot see them."
- Task 14 hard composition precondition and P2CE3 (C2/N3, same-connection seat read): "`ICampaignApplicationReceiptPort.database()` MUST return the same better-sqlite3 connection `getSQLiteService().getDatabase()` returns (or P2CE3 must pass the handle into the seat read); the same-cut guarantee of `preparePublicCut` depends on it."
- Task 14 hard composition precondition (N4, branch backfill): "Every campaign served in receipt mode MUST have its effective-head branch backfilled before `applicationReceipts` is composed; otherwise joins fail closed."
- P2CE3 (N1): "P2CE3 ACK admission MUST re-prepare the verified cut (head, generation, path, seat, committed removal) before P2CA `accept`, and MUST refuse an ACK naming a `viewId` other than the live view's."
- P2CE3 (N2): "A one-line fix in P2CE3 (return without the Error when `application` is set, since `fail` has already closed on a real failure) fits P2CE3's binder leaf; not required here."
- Task 13/14 (C3): "Before production composition, measure `preparePublicCut` on a long campaign with N views and either accept a budget or replace the per-commit full materialization with a tail read from the last offered cut under the same digest check."
- Task 13 or later (C5): "When a production re-seat/re-bind path lands (Task 13 or later), add a reconnect test that drives it instead of the `bound_at` fixture."
- After P2CE3 (C4): "After P2CE3 main-verifies, register a narrow move-only unit that extracts `CampaignApplicationConnection`, `preparePublicCut` and `ICampaignApplicationReceiptPort` into `src/lib/multiplayer/server/campaignApplicationConnection.ts` with no behavior change."

P2CE3 has no notes field and stays blocked; it is not edited here.

All 31 checks on the merged head succeeded. The [merge receipt](evidence/p2ce2-merge-20261016.json)
binds both ordered parents and the matching integration tree. The [main proof](evidence/p2ce2-mainproof-20261016.json)
is a fresh run at the merge before any closure edit: seven suites, 155 tests,
typecheck and the validator passed. It references the attempt logs by hash.

P2CE2 has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CE2 therefore releases
its in-flight src/lib/multiplayer/server reservation at main-verified, while
P2CE3, P2C and all other unit states remain unchanged.
Selection is not downstream admission.
This closure metadata still requires its own review, CI and parent merge.

---

## 2026-10-16 P2CE1 source verified on main; closure metadata proposed

P2CE1 advances from implementing to main-verified for source PR #2147,
head ad30b4384a1ae05d185f217b600a1a0481770989, merge 86d4b69a71633e68f71eebe3fac4981706567ce6.
Its baseline remains the admission base cb4af3aafb81790c33455fc2304ebb5cf3c36a87.
The owner explicitly authorized this ruling in chat, and it was posted as [comment 6207925274](https://github.com/SwiggitySwerve/MekStation/pull/2147#issuecomment-6207925274);
its exact UTF-8 body, without an added newline, hashes to 92a65a16e6b50b8df1ddaef28fc90f2eb5083243f185a7166f2cfdd95ba324f7.
The merge (04:13:52Z) preceded the ruling (04:14:01Z); this record preserves that chronology.
PK-p2ce1-ruling is first recorded here, after both the merge and the ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2ce1-review-20261016.json) binds the Fable 5.1 review
of the exact merged head (APPROVE-WITH-NOTES; author Opus 5.5), preserved byte for byte.
The reviewer re-ran the leaf (20/20) and the registered QA selector (7 suites, 138 tests).
The author's stable run (2795 suites, 37078 passed) ran on bytes equal to the committed blobs.
The reserved p2ce1-admission-review-20261016.md slot stays unwritten.

Two review notes carry forward. sendConfirmed does not advance deliveredSeq, so a
sequenced match Event frame must not go through it unless the frame type is narrowed or
the cursor is recorded on sent (P2CE2/P2CE3). P2CE2 must send through the binder's stored
paired broadcaster, never a fresh ServerMatchBroadcaster. P2CE2 has no notes field and
stays blocked; it is not edited here.

All 31 checks on the merged head succeeded. The [merge receipt](evidence/p2ce1-merge-20261016.json)
binds both ordered parents and the matching integration tree. The [main proof](evidence/p2ce1-mainproof-20261016.json)
is a fresh run at the merge before any closure edit: seven suites, 138 tests,
typecheck and the validator passed. It references the attempt logs by hash.

P2CE1 has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CE1 therefore releases
its in-flight src/lib/multiplayer/server reservation at main-verified, while
P2CE2, P2CE3, P2C and all other unit states remain unchanged.
Selection is not downstream admission.
This closure metadata still requires its own review, CI and parent merge.

---

## 2026-10-16 P2CB source verified on main; closure metadata proposed

P2CB advances from implementing to main-verified for source PR #2143,
head fcf0261a6903fd7c619ca350fab752e7c7c01636, merge b352a8e3c2b05a9295882aff76017a25e499e170.
Its baseline remains the admission base 42e3554bdd1d36426877f6d9100d93dc7e92782f.
The owner explicitly authorized this transcription of [comment 6205924360](https://github.com/SwiggitySwerve/MekStation/pull/2143#issuecomment-6205924360);
its exact UTF-8 body, without an added newline, hashes to 23cd480ff400f67045d962cb40bac7f2974d6076594cab1200b2ee3a58a85e97.
The merge (01:27:01Z) preceded the ruling (01:27:15Z); this record preserves that chronology.
PK-p2cb-ruling is first recorded here, after both the merge and the ruling.

The admission, red and local receipts came with the source PR and are unchanged.
The [review receipt](evidence/p2cb-review-20261016.json) binds the Fable 5.1 review
of the exact merged head (APPROVE-WITH-NOTES; author Opus 5.5), preserved byte for byte.
The reviewer re-ran the three leaves and both caller suites (5 suites, 108 tests).
The author's stable run (2795 suites, 37067 passed) ended 44 seconds before
fcf0261a was committed, so it covers the pre-commit tree, not the commit object.
campaignPublicAppliedView.ts (488 counted lines) is a registered-owner exception;
a facade-preserving split is a future successor and is not registered here.
The reserved p2cb-admission-review-20261016.md slot stays unwritten.

All 31 checks on the merged head succeeded. The [merge receipt](evidence/p2cb-merge-20261016.json)
binds both ordered parents and the matching integration tree. The [main proof](evidence/p2cb-mainproof-20261016.json)
is a fresh run at the merge before any closure edit: five suites, 108 tests,
typecheck and the validator passed. It references the attempt logs by hash.

P2CB has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CB therefore releases
its in-flight src/lib/campaign and src/lib/multiplayer/server reservation at
main-verified, while P2/U38 and all other unit states remain unchanged.
Selection is not downstream admission.
This closure metadata still requires its own review, CI and parent merge.

---

## 2026-10-16 P2CD source verified on main; closure metadata proposed

P2CD advances from planned to main-verified for source PR #2139,
head e97cfef1c8c82b3a8747e3554e64a612e42d3223, merge bfce3c00f7ee84cd09573f2909ee3211d8613c85.
Its baseline is the round-3 admission base f87430aa1f10cef5eac55848939663de0d86cfb0.
The owner explicitly authorized this transcription of [comment 6204331678](https://github.com/SwiggitySwerve/MekStation/pull/2139#issuecomment-6204331678);
its exact UTF-8 body, without an added newline, hashes to bfe52c1ec1e59ad4937fe7f3c492d431667d9372470d9ab7a45f34de2c8a722d.
The ruling followed the merge; this record preserves that chronology.
PK-p2cd-ruling is first recorded here, after both the merge and the ruling.

The [admission](evidence/p2cd-admission-20261016.json), [red](evidence/p2cd-red-20261016.json)
and [local](evidence/p2cd-local-20261016.json) receipts transcribe the existing
round-3 census, RED log (36 failed / 59 passed) and green, validation and round-4
logs by hash. No separate admission review exists. The round-4 stable run
(2795 suites, 37049 tests) ran on the tree just before f97208a9 was committed.

The [review receipt](evidence/p2cd-review-20261016.json) binds the Opus review of
f97208a9ecc4ea563d6437f453d3edc8cd7a900e. The merged head adds one drain fix
from that review, which was not separately re-reviewed. Its failing-then-passing
test was reproduced at the merge and is preserved in the local receipt.
All 31 checks on the merged head succeeded. The [merge receipt](evidence/p2cd-merge-20261016.json)
binds both ordered parents and the matching integration tree. The [main proof](evidence/p2cd-mainproof-20261016.json)
preserves the existing summary and adds a fresh run at the merge: three suites,
101 tests and typecheck passed.

P2CD has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CD therefore releases
its in-flight path reservation at main-verified, while P2/U38 and all other
unit states remain unchanged. Selection is not downstream admission.
This closure metadata still requires its own review, CI and parent merge.

---

## 2026-10-16 P2CA source verified on main; closure metadata proposed

P2CA advances from local-verified to main-verified for source PR #2135,
head 293ae722b06a1c5349d77673778a1c3f35f14a62, merge 230bad2bfaa01f94ea9bfd877c7f8d8acc7118ff.
The owner explicitly authorized this transcription of [comment 6203331102](https://github.com/SwiggitySwerve/MekStation/pull/2135#issuecomment-6203331102);
its exact UTF-8 body, without an added newline, hashes to 9be55710da8fb3a0793bf9f60a7c4a00cf4fa64464de683b74a4ee4b4091623a.
The ruling followed the merge; this record preserves that chronology.

The [review receipt](evidence/p2ca-review-20261016.json) preserves both source
reviews and their hashes. The final source head has 31 successful checks.
The [merge receipt](evidence/p2ca-merge-20261016.json) binds both ordered parents
and the matching native integration tree. The [main proof](evidence/p2ca-mainproof-20261016.json)
preserves the existing exact-merge proof and logs: four suites, 41 tests and
typecheck passed. It claims no new runtime run or modern identity archive.

P2CA has no task keys. Its tick remains null because source/closure cleanup
is not established here; no tasks.md row is changed. P2CA therefore releases
its in-flight path reservation at main-verified, while P2/U38 and all other
unit states remain unchanged. Selection is not downstream admission.
This closure metadata still requires its own review, CI and parent merge.

---

## 2026-10-09 P2C implementation chain registered prospectively (Task8 candidate)

> **Status:** Registration candidate; delivery acceptance pending
> **Updated:** 2026-10-09

The [four-file registration](evidence/p2c-chain-registration-20261009.json) starts
from accepted Task4 main f77 and adds rowless P2CA/P2CB/P2CD/P2CE/P2CF/P2CG1/P2CG2/
P2CH/P2C immediately before P2. Source scopes use existing R2.authority-live;
the documentary aggregate uses existing R0.publish, restricted to its own
units.json lifecycle and this PROGRESS.md. Nine new records have null source
IDs and seven null stages. P2CA/P2CD are prospective planned candidates; the
remaining chain and aggregate are blocked by genuine predecessor closure.

Existing units, relative order, holders, packets, node lifecycle and historical
receipts are preserved. P2/U38 remain blocked. Exact node aliases carry named
source/test restrictions; source/stage/helper grants remain non-effective until
normal finite admission measures the complete literal manifest under unchanged
15-file/500-product-line caps. Known subtotals prove neither fit nor breach;
later genuine closure outputs use the existing separate G-OWN freeze.

P2CA also names the existing replay-checkpoint migration test that explicitly
pins catalog head31; Task9 must preserve that coverage after genuine source RED.
P2CF has exactly the connected component, its two existing host projection/refresh
tests and authoritative fold. No source/test edit, runtime failure, browser
proof, aggregate closure, source admission or P2/U38 release is claimed here.

---

## 2026-10-02 P2CC exact canonical receipt publication proposed (task 70)

**Registration amendment only; source remains unadmitted.** The [prospective amendment](evidence/p2cc-canonical-receipt-publication-registration-20261002.json) raises only P2CC ordinary maxFiles3 to6 and appends exactly its canonical admission/red/local-20261002.json evidence paths. Two named normative source files, exact own-lifecycle units.json and those three receipts count as six actual files. All source and lifecycle metadata additions stay within300; canonical evidence additions are separately reported under unchanged line accounting, never exempted from file count. No capException, broad directory grant, other date/stage or product path is authorized.

Live foldStages copies these three receipt files into planning evidence and records their paths; the consumer's evidence-directory skip is not editing authority. The accepted three-file grant cannot fit six. R6.umbrella already permits15files/500lines, so no owning-node amendment is needed. Original Task66 wording/history remains byte-preserved; the new own-P2CC documentary record prospectively supersedes only its three-file accounting sentences after acceptance. All other scope and admission guards remain binding.

P2CC stays planned with null baseline/head/merge and all seven stages null; PK-p2cc-ruling stays decision-free. Authority, privacy, replay, idempotency and concurrency remain required. Both normative source files are untouched; the original actor's blocked97-line draft and failed QA remain historical and withheld. P2C is unregistered; P2 and U38 remain blocked. No source fold, lifecycle admission, runtime PASS or completion is manufactured.

This registration itself remains within three files/150 counted added lines, with evidence additions separately reported. Independent exact-head review/all31CI/standing parent ruling, parent-only pinned merge, all postmerge workflows, fresh independent exact-main proof and genuine owned teardown precede parent Task70 acceptance. Only then may the parent re-admit Task67 on the then-current registered base after fresh prerequisite, ancestry and overlap checks. Selection remains distinct from admission.

## 2026-10-02 P2CC applied-view source-contract prerequisite proposed (task 66)

**Registration only: P2CC is planned, not admitted or complete.** It is inserted immediately before P2 on R6.umbrella, rowless, with the existing verbatim change-path ownership. Parent option1 adds the exact units.json exception for authentic own-P2CC lifecycle fields only: the two normative source files plus one lifecycle file count together within ordinary three-file/300-added-non-generated-line caps. Shared metadata additions count; no capException or broad node grant exists. This permission becomes effective only after independent registration review, all 31 required CI checks, parent pinned merge and independent exact-main proof. It permits no other-unit, packet, holder, prerequisite, historical receipt or P2-release edit. The earlier missing-permission blocker and prior QA epochs remain historical, not rescored.

Future normative source work is still limited to the active coop-campaign-sync requirement and design crosswalk: authenticated application at the current branch/effective generation, successful baseline/checkpoint application before acknowledgment, durable recovery, explicit GM/player retention, safe hidden-only advancement without hidden payload disclosure, revocation and reconnect. Authority, privacy, replay, idempotency and concurrency review obligations are retained. Existing convergence, N+1 and privacy rules remain intact. Epoch-local grant delivery sequences are not journal revisions; join, signed ownership, participation, delivery or maximum cursor do not prove application.

Fresh fetched main is 716d09b829bcf079dcb7e06de3465dfdedaf1522. P2B, PAIC, P2A and audited PRI retain complete/PASS mainProof receipts and native merge ancestry. The original replacement predecessor author stopped tooling-blocked before setup, edits or QA; the current author separately proved the session-only native editing capability. No historical identity or failed outcome is rewritten. [Registration provenance](evidence/p2cc-registration-20261002.json) binds the immutable public launch blocker and independent source assessment.

**P2 returns from planned to blocked; U38 stays blocked.** All P2 paths, 15-file/500-line caps, prior releases, retained predecessor receipts and both dirty P2 checkouts remain unchanged. P2 adds P2CC as a prospective documentary prerequisite, but P2CC closure alone cannot release it: a separately registered implemented current-lineage convergence repair also requires exact-main PASS, ancestry and truthful closure before parent rechecks every retained guard and explicitly releases P2. P2C is not registered, no storage/schema ownership is guessed, and no cursor or lifecycle receipt is fabricated. NEXT does not enforce documentary unit predecessors; the parent must compare proof receipts and ancestry explicitly.

PK-p2cc-ruling is decision-free with null decision/ruling until a genuinely independently approved green exact source-contract head exists. Standing parent owner-ruling authority is unchanged; this author posts no ruling/comment/label and never merges. Registration still requires independent exact-head review, required CI, parent-only pinned merge and independent exact-main registration proof before source admission. No source contract, product behavior, task row or completion tick changes here.

## 2026-10-01 P2B historical source closure candidate after Task65; metadata acceptance pending (task 57)

Source PR #2106, reviewed d13e4a34236568c0e8688a0f10336a70d3d5be88 and historical source merge 0a4448597b36900084c45e9ca9dc070a862e7acd are unchanged. This candidate starts from accepted Task65 registration main 684fda156f500fe3a32120ebdc58f86bba056556 and preserves its exact source0a-only lifecycle ownership exception. Eight source paths, two product seams, ordinary caps, all unrelated units and the Task65 registration documents remain unchanged. Metadata added lines still count.

Closure receipts and identity archives are byte-identical outputs of the original shipped producer native0, not a new producer or product execution on this metadata base. Authentic source author st_01a0f5d2 and source reviewer st_01a0f704 retain distinct observed tasks/sessions and source finishers []; metadata author st_01a0f82e is not a source finisher. Existing source owner comment 5929838477 retains its full original body/hash and standing-orchestration disclosure; it does not approve this metadata head. Source taskKeys remain empty and producer tickedOnMain remains null.

Original completed-ledger default/github/next native0 and git native1 remain literal historical outcomes. Task65 registration resolves the omitted exact source lifecycle permission; qualification here requires all four unchanged consumers, including --git against real source0a, on the actual integrated ledger. Historical runtime, seven failed whole production epochs, public wrapper failures/timeouts, scoped R06 PASS versus whole native1, R07 adoption, warnings and qualified absent references are retained without replay or rescoring.

This is a metadata candidate, not accepted canonical Task57 completion or P2/U38 admission. Fresh independent exact-head metadata APPROVE, all31 CI, parent-only pinned merge, required postmerge workflows and delegated exact-main acceptance remain mandatory. The original closure checkout and retained source/proof leases are preserved.

## 2026-10-01 P2B lifecycle ownership exception proposed; closure held (task 65)

**Registration only, not P2B closure.** The [amendment](evidence/p2b-lifecycle-ownership-exception-amendment-20261001.json) adds only the exact units.json ownership exception to existing P2B. Its original eight ordered product/test paths, ordinary 8-file/300-added-line caps, local-verified state and original admission/red/local receipts remain unchanged. No unit, holder, packet, order, node alias, consumer or product behavior changes.

The original source grant omitted this exception. The authentic completed-ledger --git consumer refused immutable source merge 0a4448597b36900084c45e9ca9dc070a862e7acd; producer/default/GitHub/NEXT success did not cover that predicate. Original --git1, source proof and historical APPROVE remain immutable; the independent addendum holds closure readiness. This proposed prospective authorization covers only that merge and reviewed head d13e4a34236568c0e8688a0f10336a70d3d5be88: P2B blocked -> local-verified, baseline 2fa51ed00eb28d1752384765101ac8cc230ec235 and authentic admission/red/local receipts and source-author census.

The machine predicate is exact-path-only, not JSON-subtree/SHA enforcing. Independent review must enforce this narrower historical grant; future general shared-file edits are excluded. Native first-parent accounting includes 117 product additions plus 28 lifecycle metadata additions, 145 counted additions under the unchanged 300 cap; metadata is not uncounted. U1 exact-path and U41 measured-history exceptions are precedents, not retroactive original P2B permission.

Fresh registration consumers and existing docs/registry checks, whole-ledger invariants and a separate disposable completed-ledger fixture exercising unchanged --git against real source0a precede candidate publication. Independent exact-registration-head APPROVE, all 31 CI, parent-only guarded squash, required postmerge workflows and fresh delegated exact-main registration proof still precede closure resumption. The held uncommitted closure checkout and all source/proof leases stay untouched. Task57, P2 and U38 remain incomplete/unreleased; no closure receipt, owner ruling, canonical tick or downstream admission is published here.

## 2026-10-01 P2B announcement retry test ownership amended; source paused (task 64)

**P2B stays blocked.** The [test ownership amendment](evidence/p2b-announcement-test-ownership-amendment-20261001.json) appends only the existing announcement test as path eight, with the task 61 seven paths verbatim and in order. Ordinary maxFiles changes from seven to eight; the 300-added-product-line cap and the same two product paths stay unchanged. R2.authority-live receives the required exact leaf alias under its existing server parent, with no effective node ownership widening. Behavior, P2BC contract, six predecessors, holders, pending decision-free packet, historical fields and null stage/head/merge receipts remain unchanged.

Source author st_01a0f5d2 holds unpublished local candidate 05b4bfff0e46ad47ed390c88c7fba9ef9bec21d2, not a reviewed PR or main PASS. Its actual native public CLI and broader runtime both exit 1: 142 tests passed, one failed, zero pending across eight suites (seven passed). The failing append-recovery test writes playerIds [FORGED], empty side assignments and an empty persisted bootstrap, then expects 201. The settled immutable-roster check instead returns 409 COOP_MISSION_IDENTITY_CONFLICT before recovery or announcement. Original failure and raw logs stay immutable; this is not an unrelated baseline failure.

Future test work must retain an explicit corrupt-bootstrap refusal with no recovery, announcement or writes and separately prove append-failure recovery using the original valid persisted bootstrap, exactly one announcement and idempotent retries. The owned refusal cases test divergent incoming requests, not erased persisted bootstrap after failed announcement. The native local source diff measures five files, two product files and 117 added product lines; an eight-path completion is planning, not an implemented fix or preapproval of future over-cap work. No test or source is edited here. No third product path, fixture/helper path, API, domain, transport, schema, harness, native repair, weakened check, skipped test or cap exception is granted.

**Literal NEXT remains U24b, not selection permission.** Independent exact-head REGISTRATION ONLY review, all 31 CI, parent-only guarded merge, three postmerge workflows and fresh independent exact-main registration proof precede the same source author resuming task 57 after fresh prerequisite PASS/ancestry checks. Task 61 is complete at baseline c0d55ab86e005f797c23da89b7d842ed341adc46; task 57 is unfinished and P2/U38 remain blocked. This records no source PASS, owner ruling, main proof, closure, canonical tick or downstream release. Source custody, partial P2 work and unknown-owned legacy TEMP remain untouched.

## 2026-10-01 P2B fingerprint ownership amendment registered; product still blocked (task 61)

**P2B remains blocked and unimplemented by this registration.** The [amendment](evidence/p2b-fingerprint-ownership-amendment-20261001.json) appends only `src/lib/multiplayer/server/coopMissionCreate.ts` to the original six exact paths, preserving their order and every settled behavior clause. Ordinary maxFiles changes from six to seven; the 300-added-product-line cap stays unchanged. Fresh source at main `c719050993f04627c109ba461fa731675e0d0904` measures creation at 167 lines and admission at 160. Creation hashes raw client bootstrap before admission and skips admission for stored retries, so admission alone can't bind the fingerprint or validate divergent assertions on that path. The two-product-file mechanism is projected at 250 added product lines, not an executed implementation diff or P2B QA. Parent must measure the actual future diff against the grant.

The validator requires verbatim node aliases. An isolated proposal without the creation alias fails with exactly one ownership error; adding that alias beneath R2.authority-live's existing `src/lib/multiplayer/server` parent passes. The required `roadmap.json` metadata correction adds only the exact existing leaf, not broader node authority; node state, receipts, dependencies and holders stay unchanged. No new unit, API/domain path, source/spec change, harness edit, caller-parameter mutation, match retrofit or opponent reroll is granted. New creation must fingerprint the server-derived roster; identical/concurrent retries must return one match, divergent assertions must refuse, and stored retry/cold recovery must reuse persisted roster and opening events without selecting again.

**Literal NEXT stays U24b, not P2B.** P1A/P1C/PAI/P2A/P2BC/PMP remain the same six predecessors. Their complete/PASS mainProof blobs and merge ancestry were freshly checked at c719; PMP/task59 and U17e/task63 are parent-accepted complete there. Historical b171/b034 runtime/publication stays historical, and this entry doesn't rewrite prior progress snapshots. Independent exact-head registration review, all 31 CI, parent-only pinned merge and independent exact-main registration proof still precede any parent prerequisite recheck or P2B release. P2 and U38 remain blocked. The partial P2 worktree is preserved; the original red SHA is historical, not assumed current. No implementation receipt, owner ruling, canonical checkbox or downstream admission is claimed.

## 2026-10-01 PMP historical source closed through current producer; metadata delivery pending (task 59)

**PMP source PR #2099** is receipted by the accepted closed-U17e producer from current main 20781ffe31ed43fe92cc972ed7f1e6546f43a755. Reviewed source head b17186d0ad70a0285a5bd050b4e4a4192c2bb079 and actual historical merge b0340bb363a0589739bd7e615348a6626f7f1404 are unchanged. Fresh native Git witnesses confirm exactly two ordered parents: main-side d9ae8b9c28f50756145708c05111ab94f286d68e, then reviewed b171. Conflict-free native merge-tree exits 0 and equals the WHOLE actual tree 10f167214a31bedb61a1038867f7e95bf136f0ad. Source scope remains two files, 52 counted added product lines/150 and 322 separately excluded test additions under the original three-file grant. No source, test, ownership or other-unit change accompanies this metadata closure.

The admission/red/local stage receipts are explicit retrospective indexes of sealed genuine source evidence, not new source work. The source-local publication remains unchanged: frozen-source-candidate-ci-corrected.json, SHA-256 dc85ffefd39174fb3f74ee84c8bd425822bc3e22f0b8da76fd97da4265184713. Original RED retains unchanged-runner aggregate exit 0 hiding actual runtime exit 1. The audited modern pair binds source author st_01a0f1d2 and genuinely independent source reviewer st_01a0f2f0, distinct actual tasks/sessions, truthful Sol models and source finishers []. The unchanged 6,937-byte source review has SHA-256 ac1d846099a7730ee3dfdcc122f30ace1d5903d2645bd9117813a589103ab770; it was published post-merge and approves SOURCE ONLY, never this closure head. Original pre-merge reviewer266 report and original refused metadata-author2e3 packet remain untouched. Metadata author st_01a0f52a is not a source finisher.

The [main proof](evidence/pmp-mainproof-20260930.json) reopens accepted historical exact-b034 public QA from 2026-09-30T14:51:43.424Z to 14:56:48.060Z: original public exit 0, 119 Jest tests/two suites, Node consumer 62, strict OpenSpec 229, QC pins 30 and three registered Chromium smoke tests. Original runtime/build/marker/smoke logs and identities stay literal. They were NOT executed at current producer main, closure date or closure head. A separately owned clean exact-b034 checkout supplies only native Git integration and historical producer repo-root; no false reproof-commit or history rewrite is used.

Current producer exit 0 includes genuine live minimal identity comparison and whole prospective-ledger validation before publication. [Preservation](evidence/pmp-logs-20260930.json) retains 14 reopened original files/3,245,702 bytes in a new independently owned external archive. Current base/git/github consumers pass unchanged 75 nodes/13 packages/381 tasks/40 triage rows. U17e/PRI/U41/P2BC and required predecessor PASS/ancestry were freshly checked. PMP holds no live task rows; tick taskKeys is empty and tickedOnMain null. Null ownerGate and routine policy remain unchanged; no external owner comment or rowless ruling is invented.

**Candidate NEXT is U24b; no downstream admission is granted.** This records source lifecycle closure, not main-side acceptance of this metadata PR or completion of canonical task 59. Parent alone owns fresh independent closure-head review, all 31 required checks, pinned merge, independently delegated fresh exact-main closure proof and the canonical task tick. Task 61/P2B/P2/U38 remain gated, with all other unit states unchanged. Bounded current metadata QA is separate from the historical source proof. Known 39 unassigned global TEMP fixtures are preserved, not deleted or claimed as historical cleanup PASS.

## 2026-09-30 U17e source closed through audited producer; metadata delivery pending (task 63)

**U17e source PR #2101** is receipted through the shipped fold and modern closure producer: reviewed head 13ce444324f49400316dd77d87d5f7171cbe7114, actual source squash 90a4de1b5147e3f04a5323f8c9f5232df8de112c, sole parent acbfc11dc71576263ffb3ffc41372295486506fc, and equal native expected/actual WHOLE tree 8d6f68b04b9ab6023ea46387075d8717bfff3e5d. The four source paths retain 35 counted added lines/150 and 289 separately excluded test additions; no source change accompanies this common-metadata closure. U17d/PRI/U41 PASS receipts and ancestry were freshly checked, not inferred from NEXT.

The [genuine local receipt](evidence/u17e-local-20260930.json) remains exactly 3,448 bytes, SHA-256 b03f42cf063ad93ceedbbe71b8d19f9df76a7297ee547da0f95a3fd6a2e1bdc5. Admission/red indexes retain the real source admission and unchanged-producer MERGE_PARENT_COUNT refusal, not a new execution. Audited v2 binds sole source author st_01a0f381 and independent source reviewer st_01a0f3ee, distinct actual tasks/sessions and truthful models, with no source finishers. QA st_01a0f457 and this metadata author st_01a0f488 are not source contributors. The source review is SOURCEONLY, never approval of the future closure delivery head.

The [main proof](evidence/u17e-mainproof-20260930.json) consumes accepted exact90a4 public evidence: all 13 steps exit 0 and measured U17e PROOF RUNTIME PASSED: 172 passed (145.442s), three suites/zero failures; QC pins 30 and strict OpenSpec 229. Chromium strict-smoke executed once in the initial exact90a4 build epoch (BUILD_ID 1790806536860); corrected epoch bindings distinguish the recovery build 1790807437005 and reopening of that same three-pass smoke. Failed initial strict/helper/cleanup epochs remain immutable. No source build, runtime or smoke is replayed or relabeled for this metadata delivery.

Actual producer exit 0 includes whole prospective-ledger acceptance before publication, genuine live allowlisted identity comparison, and [preservation](evidence/u17e-logs-20260930.json) of 14 reopened logs/135,959 bytes in a new external owned archive. Base/git/github consumers pass unchanged 75 nodes/13 packages/381 tasks/40 triage rows. U17e holds no live task rows; tick taskKeys is empty and tickedOnMain null. Historical evidence, unrelated unit states, holders, caps, node grants and source bytes remain unchanged.

**Candidate NEXT is PMP; PMP is not admitted.** This branch records source closure, not completion of main-side metadata delivery or plan task 63. Parent still requires a fresh independent review of the frozen closure head, all 31 checks, explicit head-guarded squash, actual one-parent/WHOLE integration witnesses and fresh exact-main closure validation before ticking task 63. No PMP/task 59/task 61/P2B/P2/U38 release, owner ruling or main completion is claimed.

## 2026-09-30 U17e two-parent closure attestation registered (task 62)

**U17e is planned, not admitted or implemented**, immediately before planned PMP on R6.loop-harness. Its future grant is exactly the closure producer, its existing closure-proof Jest file, GOAL and DELIVERY: four files / 150 added counted product-and-instruction lines, with tests separately excluded under unchanged U41. Exact node aliases already exist; no roadmap/node, consumer/library/fold, other test, package, WORKERS, workflow or game edit is granted. [Registration provenance and measured guards](evidence/u17e-registration-20260930.json) distinguish estimates from implementation.

The parent mistakenly merged source PR #2099 at b0340bb363a0589739bd7e615348a6626f7f1404 using --merge. Its ordered parents are main-side d9ae8b9c28f50756145708c05111ab94f286d68e then exact reviewed head b17186d0ad70a0285a5bd050b4e4a4192c2bb079. The producer has two one-parent restrictions: initial refusal and PASS predicate. The consumer does not duplicate them. Future repair requires exact parent2/head binding, unchanged ancestry, conflict-free native git merge-tree --write-tree --no-messages parent1 head and single-40-hex expected-tree equality with the WHOLE actual tree. Original one-parent branch/receipt stays intact; no count-only relaxation, skip, unit exception or touched-path shortcut.

The genuine independent modern review of unchanged b171 is published and parent-audited **post-merge**, not pretended pre-merge; actual producer consumption remains pending. It approves the source only, not U17e. Original 266 review, 31-check source CI, sealed fresh b034 source-main PASS, source bytes and historical proofs remain immutable; none is rerun or replaced here.

**Measured baseline NEXT is PMP; registered NEXT is U17e.** Removing only U17e restores all old relative order. Old states, holders, receipts and caps stay unchanged. PMP adds a documentary **CLOSURE ONLY** requirement, not a retroactive source-admission prerequisite or replacement for P2BC/U17b/U39/PRI. NEXT does not enforce unit predecessors. Parent freshly checks U17d/PRI/U41 complete/PASS Git receipt blobs and ancestry, then requires independent exact-head docs review, all 31 CI, explicit pinned squash with observed one-parent/tree and delegated exact-main registration proof before task 63. U17e itself uses that original one-parent bootstrap for source and true v2 closure; CLOSE it before PMP resumes. Standing user --admin authority applies only after every required gate, never a bypass or waiver; parent alone merges. PMP stays planned/unclosed with 3/150 caps; task 59/task 61 and P2B/P2/U38 remain withheld. No staged PASS, product red/green, checkbox, owner decision or release is claimed.

## 2026-09-29 Audited review-identity prerequisite registered (task 60)

**PRI** is a planned, rowless routine process/tooling prerequisite on `R6.loop-harness`, inserted immediately before PMP. Its eight exact future paths pair the closure producer/shared library, roadmap consumer and their existing focused pins with GOAL, DELIVERY and WORKERS. Five exact consumer/test/instruction aliases are added to the producer's actual node; no broad planning/root grant, node dependency/state change or R6.umbrella ownership change. Ordinary caps are eight files / 500 added non-generated product lines; tests remain separately reported and uncounted. [Registration and decision-complete future contract](evidence/pri-registration-20260929.json) identify the actual callers, data shapes, portable evidence and bootstrap gates.

The user selected **Amend review identity contract** on 2026-09-29, retaining GPT 6.1 Sol for every new worker, not an Opus exception. The current consumer rejects equal model strings and a reviewer equal to finisherModel; the current closure records reviewerModel from the review header and implementerModel from CLI input. No producer, validator, test or canonical instruction rule changes here. Future version 2 must bind real observed author/every-finisher/reviewer engine task AND child-session identities, accurate actual models, reviewed source head and review-output hash to immutable minimal non-secret evidence. Independent same-model actors can pass only the audited modern contract; self-review, shared task/session, missing/malformed/unbound/corrupt/stale evidence and downgrade fail closed. Valid historical unversioned cross-model receipts remain unchanged; invalid legacy same-model receipts still fail. Hashes preserve observed archives; they do not create cryptographic engine attestation. Parent/reviewer observation and contributor-census audit remain explicit.

**Actual baseline NEXT is PMP; registered NEXT is PRI** through authorized insertion, not invented priority. Removing only PRI restores every old unit's relative order. PMP remains planned/unadmitted, with only an appended documentary PRI prerequisite and admission guard; its runner/two pins, three-file/150-product-line cap and old predecessor prefix are unchanged. NEXT does not enforce unit predecessors. Parent must verify PRI complete with PASS exact-main proof, ancestry and truthful closure before PMP source admission, and continue the unchanged PMP/P2B/P2/U38 release guards. P2B/P2/U38 remain blocked.

Registration review/CI/pinned merge/exact-main proof precede separate source implementation. PRI's own later review and closure must pass its candidate version 2 producer/consumer with freshly observed independent GPT6.1 tasks/sessions, not a blanket exception or historical example approval. Red preserves unchanged-consumer rejection of truthful same-model review; green requires valid modern and legacy modes plus all adversarial refusals. Existing head/hash, ownership/cap, owner, CI, main/runtime, strict and idle/common-hold gates remain intact. No admission/completion receipt, live task/plan tick, fabricated owner decision, source change or downstream release is claimed.

## 2026-09-29 P2BC source contract closed; downstream still blocked (task 58)

## 2026-09-29 Main-proof fail-closed successor registered (task 59)

**PMP** is a separately owned routine tooling successor on `R6.loop-harness`, inserted immediately before P2B. It owns only `scripts/qc/roadmap-main-proof.mjs` and the two existing roadmap-loop test files, capped at three files / 150 added non-test product lines. The exact runner path is added to its shipped owning node; existing exact test paths are reused. R6.umbrella retains its existing parent ownership without widening this unit. U39 already shipped shell-free execution and the exact-main step; its historical receipts remain unchanged, but the runner still hides step failure in aggregate exit 0 and conditionally invokes destructive `git checkout -- next-env.d.ts`. [Registration provenance](evidence/pmp-registration-20260929.json) names the retained original failed P2BC proof.

PMP is **planned, not admitted** and implements nothing here. Its future contract requires process failure for failed/unspawnable steps, missing E2E marker or dirty final state, preserves tracked edits without destructive Git restoration, and retains runtime/exact-main/idle/strict gates. Red-first unchanged-runner CLI and green discriminating scratch cases (including pre-existing tracked content), existing pins and all serialized tooling gates precede independent review, CI, pinned merge, exact-main proof and truthful closure.

**Baseline actual NEXT is U24b; registered NEXT is PMP**, not P2B or NONE. The authorized insertion immediately before blocked P2B is at an earlier array position than U24b. PMP can therefore be selected under the existing first-planned/dependency-ready/path-free contract without moving or changing any existing unit. The parent must integrate registration review/CI/merge/mainproof and reconcile this measured transition before implementation or admission. No existing unit state/order or node dependency is changed. Documentary predecessors are not enforced by NEXT. P2BC remains complete; P2B adds PMP as a prerequisite and stays blocked, while P2 and U38 remain blocked/unadmitted. Registration review/CI/merge/mainproof alone is not tooling closure or downstream release. Original P2 partial work/red SHA `144dfb6effa612da69836aaa528d9ef713267821ac11f3afabaa9cf603ba3b4f`, failure logs, identities and historical comments are preserved. No task row, checkbox, owner decision or safety gate is edited.

**P2BC** source PR #2093 is closed through the shipped fold and closure CLIs: reviewed head `d65e686290ba8379e19a36469ab723d09cc3aa7c`, exact merge `ff318347e9eb1adcd61053f79fda0151e2279c4c`, two source files +46/-2 under the 2-file/150-line cap. Retrospective admission/red/local receipts retain their gaps: semantic RED is the contract-absence census, while baseline structural OpenSpec passed. The rejected malformed first head and historical wrapper/QC failures remain recorded. Historical implementer identity retains requested/resolved/session-selected GPT-5.6 Sol Fast, captured assistant-message GPT-5.6 Sol, medium and unverified historical wire tier; source reviewer is gpt-6-sol, closure writer gpt-6.1-sol. The existing exact-head ruling is transcribed, not newly chosen or posted: comment 5895840581, SwiggitySwerve, owner-ruled, body SHA-256 `d86f3c2c60fbc665681290b1d704ab94e2c5a850c660a5e6b309d5379ded38e1`. It applies the prior standing Checks + review instruction following the 30-minute unanswered-question rule, not a separate personal owner inspection or downstream approval.

The [mainProof](evidence/p2bc-mainproof-20260929.json) combines **two attributed measurements at the same exact merge**, not one successful original harness run: original source gates plus later independently registered production smoke, 3 passed/0 failed/exit 0 with SATISFIED ladder receipt. The original official aggregate exit 0 hid internal ladder exit 1; that failure and its logs are preserved unchanged beside the later real SATISFIED output. The [merge receipt](evidence/p2bc-merge-20260929.json) records native whole-tree integration equality. Historical PAIC build exit 1 remains explicit and is not reclassified as all-green. [Closure provenance](evidence/p2bc-closure-provenance-20260929.json) binds inputs, copied logs and actual argv/exits. No new opponent-bootstrap implementation, production rebuild for this ledger delta, or browser behavior is claimed.

**P2B, P2 and U38 remain blocked.** Task 59 must be registered, implemented, reviewed, merged, proven on exact main and truthfully closed before any P2B readmission. Fresh predecessor PASS/ancestry, exact ownership and caps are rechecked then; this closure is no release. P2BC holds no task rows: taskKeys remain empty and tickedOnMain null, with no tasks.md or orchestration checkbox edit. Original P2 partial work and red SHA-256 `144dfb6effa612da69836aaa528d9ef713267821ac11f3afabaa9cf603ba3b4f` remain preserved. NEXT now emits `U24b`; that validator result does not override the task-59/P2B boundary.

## 2026-09-29 P2BC source-contract prerequisite registered (task 58)

**P2BC** is registered immediately before P2B as a rowless product-class unit on `R6.umbrella`, using the node's existing verbatim `openspec/changes/harden-gm-two-player-campaign-sessions` ownership path. It is bounded to two files and 150 added source lines: amend the active `coop-campaign-sync` MODIFIED co-op mission requirement and design crosswalk to specify server-derived default opponents from signed admitted deployers and the campaign/mission seed, stable unique ownerless IDs, the combined 24-entry cap with 13+13 refusal, assertions-only client opponents, pre-write reference resolution, immutable stored-roster retry/recovery, and no client grant. It preserves PAIC's server AI, owner, publication, replay and disconnect/pause rules, invents no authored scenario-specific force, and acknowledges unchanged REST metadata exposure.

P2BC depends on completed PAIC, P1A and PAI; it does not depend on blocked P2B. P2B moves from planned to blocked and adds P2BC as a predecessor. It is released only after P2BC is complete with a PASS exact-main proof, ancestry and closure. P2 remains blocked on P2B and U38 remains blocked on P2. `PK-p2bc-ruling` is pending with `decision` and `ruling` null. This registration changes no OpenSpec source, product file, historical source row, P2B receipt or `roadmap.json`; [registration evidence](evidence/p2bc-registration-20260929.json) records the measured commands while remaining `PROGRESS` for task 58 source delivery.

The shipped validator still does not enforce documentary unit predecessors. The isolated invalid-predecessor fixture is expected to exit 0 and must be reported honestly; parent admission/release checks compare PASS receipts and Git ancestry on fresh main instead of expanding validator scope in this registration.

## 2026-09-29 P2B registered; P2 blocked on authoritative opponent bootstrap (tasks 56/57)

P2's public shared mission create currently carries only admitted player rows, so its route-created combat match has no opposing roster for PAI to drive. PAI's own proof injects an opponent fixture. Generic encounter opponent-force REST rows are not bound to the signed campaign, session, mission and accepted head, and are not substituted as authority.

**P2B** is registered immediately before P2 on `R2.authority-live`, rowless, with predecessors P1A, P1C, PAI and P2A. It owns six exact existing paths: one product file (`coopMissionAdmission.ts`) and five tests/fixtures. The bounded estimate is six files and 220 added product lines under hard caps of six files / 300 product lines; the parent must remeasure and verify exact node ownership before implementation. The server policy derives one opponent per admitted deploying player unit through existing `selectOpponentUnits`, seeded by `${campaignId}:${missionId}`; creates stable unique ownerless opponent IDs; treats optional client opponents as exact-match assertions; resolves all references before write; applies the 24-entry cap to the full derived roster (13+13 refuses); and preserves deterministic retry, concurrency and recovery. Route-created player -> PAI opponent -> player advancement is required. Existing publication and REST metadata exposure are unchanged, and no browser opponent grant or stronger privacy promise is invented.

P2 returns to blocked with P2B appended to its predecessors and admission gate. Its earlier `releasedAfterP2A20260929` record remains historical provenance, while a new blocked reason names this defect. P2 still owns the local-launcher dependency removal, shared navigation and two-browser proof; its uncommitted partial worktree and original red SHA-256 `144dfb6effa612da69836aaa528d9ef713267821ac11f3afabaa9cf603ba3b4f` remain preserved. U38 stays blocked on P2. Finding `FN-p2-public-launch-missing-authoritative-opfor` is held by P2B without resolution. `PK-p2b-ruling` is pending and decision-free; no owner decision or ruling is claimed.

No OpenSpec path is added here. The existing co-op mission source contract needs a separately registered and reviewed server-derived roster amendment before P2B product admission. `roadmap.json` changes only at `R2.authority-live`: the validator requires every unit path verbatim on its node, so the same six exact aliases are added beneath the node's existing `src/lib/multiplayer/server` and `src/lib/campaign` parents. This does not widen effective node scope. The validator does not inspect documentary predecessors: the measured invalid-predecessor fixture exits 0, as corrected plan task 56 records, so the parent must manually verify the seven retained P2-chain predecessor PASS mainProof receipts and Git ancestry on fresh main before product admission. No existing failing test is waived and no validator change belongs to this registration. Registration evidence: [p2b-registration-20260929.json](evidence/p2b-registration-20260929.json).

## 2026-09-29 P2A complete; P2 conditionally released (task 55)

**P2A** (#2089) is complete through the shipped closure tool. Registration #2088 landed first. Product baseline `cf9c269d5261753c18520e61ac2e9f5f43e0615b`; corrected reviewed head `fbd0ac4bcacae52634b073e471f31a41edf8a409`; pinned squash merge and exact-main proof `845ea72b7e2af190a162c6cca546dfcb57cb1007`. The reviewed and merged whole trees are both `aa795f981d9bba7f86554c4b59175a3180b42f9d`. Scope is the four registered files, 274/400 added product lines and 1,145 test lines.

The chronology remains explicit. First head `69a67d084` had 31 successful CI checks but independent gpt-6-sol review **REJECTED** it after cold active signed membership with erased mission claims returned HTTP 200 with placeholder owners. That report and database archive remain unchanged (inventory SHA-256 `bffd8bc8...`). Corrected head `fbd0ac4bc` received a fresh gpt-6-sol **APPROVE** (report SHA-256 `95b7e3a5989739412124eef65f2a240bda555e7c91989e9465d3d9a3991d640a`; archive inventory `00c466b9...`), 31/31 successful checks and the existing standing-instruction ruling in `PK-p2a-ruling` (comment 5886681165, author SwiggitySwerve, `owner-ruled`, body SHA-256 `ab9b89a3...`). The packet records that the parent posted under the quoted standing instruction and does not pretend a separate personal owner review; no new comment or label was posted for closure.

The [exact-main proof](evidence/p2a-mainproof-20260929.json) passes with `P2A PROOF RUNTIME PASSED: 225 passed (187 registered Jest tests + 38 production HTTP preflights; 0 failed)`. It includes 12 Jest suites, signed live deploy/deploy and GM-HQ/guest-deploy, the formerly failing cold signed case returning 409, and genuine legacy-only controls returning 200. The route does not authenticate its HTTP caller: contributor authentication is the signed campaign socket plus durable membership/claims. If every signed membership row and mission claim is deleted, legacy-only state is indistinguishable without a new durable persistence marker; this no-schema unit does not claim otherwise. All product-proof QA resources were cleaned.

**P2 is released from blocked to planned only after the explicit prerequisite check.** P1A, P1B1, P1B2, P1B3, P1C, PAI and P2A are complete with PASS mainProof receipts, and every recorded merge is an ancestor of `845ea72b7`; [the release receipt](evidence/p2-release-after-p2a-20260929.json) records hashes and ancestry. The original P2 external red test remains byte-identical at SHA-256 `144dfb6effa612da69836aaa528d9ef713267821ac11f3afabaa9cf603ba3b4f`. U38 remains blocked on P2. P2A holds no task keys, so this closure does not tick plan task 55; the parent owns that checkbox after publication. NEXT selects P2.

## 2026-09-29 P2A registered; P2 blocked on signed-owner preflight (tasks 54/55)

P2's real-route red-first probe reached the current converged head with accepted signed mission claims, but launch preflight returned 409 STALE_OWNERSHIP when creation placeholders existed and 409 UNOWNED_SLOT without them. Both cases left the match/event/receipt census unchanged. The original wave-B failing test (SHA-256 144dfb6effa612da69836aaa528d9ef713267821ac11f3afabaa9cf603ba3b4f) and all its evidence remain untouched; the defect is not fixed by this registration.

**P2A** is a new planned authority-live precursor immediately before P2, owning four exact existing materializer/route files and their neighboring tests. Its repair combines durable membership/claims with fresh server-accepted participation, excludes HQ from deployed ownership, and retains current head, progression, resolvability and legitimate placeholder/non-co-op rules. Claims alone do not persist deploy/HQ choice, so missing accepted participation must not become a deployment. Its four-file/400-product-line cap bounds an estimated 260 added product lines; tests are counted separately. No schema, migration, client identity field, new HTTP authentication contract, PAI bootstrap or U38 guard is included.

P2 is blocked until P2A has a PASS exact-main proof and closure and the parent explicitly releases it after rechecking all prior prerequisites. U38 remains blocked transitively through P2. NEXT does not enforce unit predecessor metadata; the blocked state and parent gate are intentional. No existing behavior, holder, receipt or packet was rewritten. Existing planned U104 owns correction-saga visibility proof, not this signed-owner defect. Registration evidence and the bounded repair contract: [p2a-registration-20260929.json](evidence/p2a-registration-20260929.json).

## 2026-09-29 P2 ownership amendment prepared (plan task 53)

P2 remains planned and selected by `validate-roadmap.mjs --next`; U38 remains blocked. Read-only admission found that the complete client cutover needs four existing files outside P2's unit paths plus one new multiplayer route. This docs-only amendment adds the existing launch helper/test and mounted launch page/test to P2, adds the mounted page/test verbatim to `R2.multiplayer-client`, and registers the smallest existing verbatim parent `src/pages/multiplayer` for the future `src/pages/multiplayer/mission/[matchId].tsx` route. That parent is explicitly restricted to the one named new leaf: it grants no unrelated page ownership and no placeholder source file is added.

P2's review classes are corrected from routine to authority, privacy, replay, idempotency and concurrency. Its behavior also clarifies that guest disconnect grants no opponent control but does not invent a guest-disconnect pause requirement; PAIC/PAI preserve the existing host-disconnect pause rule. Caps stay 15 files / 500 non-generated product lines. The projected implementation remains an **estimate** of 11 implementation/test files and 315 added non-test product lines; no future diff has been measured. No unit, holder, predecessor, receipt, task key or state changes. Evidence: [p2-ownership-amendment-20260929.json](evidence/p2-ownership-amendment-20260929.json).

## 2026-09-29 U17d and PAI complete; P2 released

**U17d** (#2085, reviewed head `33ebc856765438e574ac9d74518754bfb033dcb4`, merge `166e8eb78598425b621b527728d4c6141d7e45f3`) delivers plan task 52's strict merge-aware closure attestation. Git integrates the exact reviewed head onto the actual sole merge parent and the tool compares whole trees, retaining conflict, identity, review, ruling, runtime and validator refusals. Independent gpt-6-sol review approved the exact head and all 31 checks passed. The [exact-main proof](evidence/u17d-mainproof-20260929.json) passed: 2 runtime suites/66 tests, strict-smoke 3 tests, QC pins 30 tests, build/marker, tsc, OpenSpec 229 items, QC validation, all four roadmap validator modes, lint (84 warnings/0 errors), lint:units (17899/17899) and format. Its generated merge receipt records parent/base `7b7dd05b4cf9dec5eef6af960fc29c2fcdc101b7` and equal expected/actual tree `147ac7517b67ab9228c510cbedc6171b54d54aa6`.

**PAI** (#2083, reviewed head `ec00717c474a909af0ae53afaa758eeac33614a7`, merge `d5c1ada3dae4076a6081e668ed9045f1458a08a9`) is now closed through the shipped tool. Its original admission/red/local receipts and `PK-pai-ruling` fields were copied unchanged, including actual owner comment 5875452398 and the disclosed parent transcription under standing authorization. Independent gpt-6-sol re-review approved the corrected head; all 31 checks passed. The [historical exact-main proof](evidence/pai-mainproof-20260928.json) ran at `d5c1ada` on 2026-09-28: 174 server suites/1320 tests, build/marker, exact-main ladder, tsc, validators, OpenSpec, QC and supplemental gates passed. These runtime logs were not rerun for this closure. The current tooling checkout is `166e8eb`; `--reproof-commit` identifies that invocation checkout, while the receipt explicitly records the historical proof's actual origin.

The earlier PAI closure truthfully refused `MAIN_PROOF_NOT_PASS` with `blobDiff=2` because intervening U24a changed a `ServerMatchHost.ts` comment. Wave-A's dirty fold, three untracked receipts and `.omo/ulw-execute/pai/refused-run-1-*` remain untouched. No FAIL was edited into PASS. The new [merge receipt](evidence/pai-merge-20260928.json) instead proves native integration onto parent `8c1bfdb674dbc8757445e074fb56a473333683f1`, base `51fa88740a40bd98f3146f52d8ec47d80f8f2f5e`, with whole expected/actual tree `5182cffdc0347c5d02eb3983f0ccf458b63612f8`. Both official closure invocations exited 0 with postwrite validation passing.

**Only P2 is released from blocked to planned.** Each named predecessor (P1A, P1B1, P1B2, P1B3, P1C and PAI) is complete with a PASS mainProof and its exact merge is an ancestor of fetched main `166e8eb`; [the release receipt](evidence/p2-release-20260929.json) records the six checks and proof hashes. U38 remains blocked on P2. U17d's successor PAI and task 52 relation are unchanged. The closure units hold no task keys, so no live task row was ticked. `validate-roadmap.mjs --next` now prints P2.

## 2026-09-29 U17d registered for merge-aware closure attestation

PAI PR #2083 was reviewed at `ec00717c474a909af0ae53afaa758eeac33614a7` and squash-merged as `d5c1ada3dae4076a6081e668ed9045f1458a08a9`. The closure tool truthfully refused its raw reviewed-head-versus-merge comparison because intervening U24a changed a comment in `ServerMatchHost.ts`. The reviewed PAI delta and the merge's first-parent delta name the same twelve files; this is an integration-attestation limitation, not permission to hand-author a PASS or weaken review, owner-ruling, CI, runtime, ancestry, or validator gates.

**U17d** is a bounded R6.loop-harness successor to U17c, inserted immediately before PAI so NEXT selects the correction first. It owns exactly the closure script, its shared ledger library, and the two existing roadmap-loop test files. The future implementation computes Git's expected three-way integration of the exact reviewed head onto the actual sole merge parent, refuses conflicts, missing objects and invalid ancestry, and compares the actual merge's whole tree with the expected tree. Whole-tree comparison is intentional: it proves both that parent-side content survived and that no unexplained merge-only drift appeared outside the reviewed touched paths.

The unit is routine tooling, capped at four files and 300 non-generated lines. It adds no product or closure algorithm code in this registration PR. Historical receipts, holders, frozen occurrences, roadmap ordering, and PAI's merged-but-unclosed ledger state are unchanged. Registration evidence is in [u17d-registration-20260929.json](evidence/u17d-registration-20260929.json).

`validate-roadmap.mjs --next` now prints U17d.

## 2026-09-28 U24a complete; U24b released; P1 aggregate proof; single-lane correction (parent)

U24a (#2081, head `37003e402c4e289d0e15fe296493438202157e84`, merge `9490590629c04efeb0051383289a1824cb071a99`) is the re-pin half of the U24 split. It makes the journal-authority suites and comments hold on both sides of the production flip:
- five suites select their fixture mode explicitly;
- a test helper awaits real persistence completion instead of fixed drains or polling;
- four history pins are proven writer-only, with a guard that fails on the global backfill;
- three production comments describe persisted heads.

The production constant, fixture wiring and mirror backfill are unchanged. Lane A (gpt-6-sol) first blocked a production comment that claimed a fresh match has a journal head before its first player command. That claim is false, because the host returns before its opening seed completes. The parent corrected the comment only (37003e4) and the re-gate approved it. PK-u24a-ruling records the owner's standing merge instruction, via comment 5865785264. The [exact-main proof](evidence/u24a-mainproof-20260928.json) passed: 19 runtime suites and 155 tests, the exact-main ladder (strict-smoke), tsc, the validator in four modes, openspec strict, qc:openspec-ci, the qc pin, lint (84 warnings, 0 errors), lint:units and format:check.

**U24b is released from blocked to planned.** U24a's PASS mainProof was checked explicitly, because the validator does not enforce predecessor completion for a planned state. U24b's admission must re-measure its files; the registration allocation is already at the 15-file cap.

**P1 aggregate proof (plan task 2).** Task 2 closes on its complete successor chain (P1A, P1B1-P1B3, P1C) plus an aggregate proof, which ran on exact main `51fa887`:
- `J(launchCoopMission|CampaignSessionForceClaim|multiplayer)`: 224 suites, 1820 tests;
- `verify:qc:coop-campaign-journey`: 144 Jest tests plus 2 Chromium runs;
- the three frozen CAMP-01D arrays: 22, 48, and 144 tests plus 2 Chromium runs.

The ledger P1 record stays a blocked, superseded record, and no P1 receipts are invented.

**Single-lane correction.** The approved plan runs one product unit at a time, in validator order. PAIC (task 41) and PAI (task 40) were started while U24 was in flight, and before task 2's aggregate proof, which the dependency matrix places first. PAIC had already merged. PAI was parked with its uncommitted state preserved, and U24a finished as the single lane. `validate-roadmap.mjs --next` prints PAI, which resumes next.

## 2026-09-28 PAIC complete; PAI released (parent)

PAIC (#2078, head `7daa013e2f2b7a53f86dc7fecdb1f0b717c35345`, merge `b4cef4671c269f7bf46ac568e0f14834f95b28ad`) delivers plan task 41's server-AI source contract. It is a MODIFIED "Co-op Mission Launch With Both Forces" requirement in the harden change. The archived text is restated byte for byte (1362/1362 bytes), so per-player same-side unit ownership is unchanged. The requirement adds:
- server-owned OpFor turns through the existing engine AI inside the host's serialized command lifecycle;
- no browser grant;
- a deterministic command identity from the match, the accepted head and the active unit;
- normal per-viewer publication;
- the existing disconnect and pause policy.

It comes with five scenarios and a design crosswalk mapping the delta to PAI. No product code changed.

The owner's standing merge instruction is recorded in PK-paic-ruling; the parent posted `OWNER-RULING` comment 5865062740 and applied `owner-ruled`. Lane A (gpt-6-sol) approved with no blocking finding. The [exact-main proof](evidence/paic-mainproof-20260928.json) ran at the merge commit: build with the e2e marker, the roadmap Jest suites (2 suites, 49 tests), the exact-main ladder (strict-smoke), tsc, the validator in four modes, openspec strict, qc:openspec-ci, the qc pin, lint, lint:units and format:check. This closure runs at current main `aaec40d` via `--reproof-commit`, because the ledger-only U24 split (#2079) merged after PAIC.

**PAI is released from blocked to planned.** All six predecessors (P1A, P1B1, P1B2, P1B3, P1C, PAIC) are complete with PASS exact-main mainProof receipts. The validator does not enforce predecessor completion for a planned state, so each receipt was checked explicitly before this edit. `validate-roadmap.mjs --next` prints PAI. U24a, the U24 re-pin later in ledger order, is already in flight on its own lane.

## 2026-09-28 U24 split into U24a and U24b (parent)

U24 (the production hard cutover) was re-admitted on `d3c2a88` after its ownership amendment. It stopped again with BLOCKED-SPLIT before any edit. A source-grounded census found it needs at least 19 files: 12 product, spec and config files and 7 tests. With the four writer-only history re-pins from rider (d) it needs 23, against its 15-file cap. The census covered the production constant, the fixture consumer, producer and forwarding, the mirror backfill, the four OpenSpec edits, five default-dependent server suites, and three production comments that claim the shipped default is off.

Following the unit's own rule ("park and split re-pin first, flip second") and the P1B precedent, U24 becomes a blocked, superseded record with no task keys:
- **U24a (planned; predecessors U19b, U23 and U43):** the re-pin, 12 files under `src/lib/multiplayer/server`. Comments are rewritten to stay true across the flip. The five suites make their fixture mode explicit, with exact signals replacing timing-based setup. The four history pins are proven writer-only, without the backfill.
- **U24b (blocked on U24a's exact-main proof):** the flip, 15 files under U24's full ownership, at the cap and re-measured at admission. It enables production mode with no override, retires the fixture consumer, producer and forwarding, removes the backfill, and makes the adopt change's hard-cutover amendments plus a new event-store delta. It also covers the default-create head, the typed missing-branch refusal and the multi-event drain.

U24b carries task key `#1.7@20`. Both slices keep the authority and migration review classes. Evidence: [u24-split-admission-20260928.json](evidence/u24-split-admission-20260928.json).

## 2026-09-28 U24 ownership amended for fixture retirement (parent)

U24's letter retires the combat fixture switch and requires rewriting every "mode off" comment that the production flip makes false. Its implementer stopped at the ownership boundary before editing anything. A read-only probe of the real QC runner's `buildRunPlan` shows four ladder groups (authority-recovery, privacy-pack, authority and all) still inject the fixture key. Three files produce, pin and forward that key, and all three sit outside U24's paths:
- `scripts/qc/gm-two-player-campaign-core.cjs`;
- `scripts/__tests__/gm-two-player-campaign-qc.test.ts`;
- `playwright.config.ts`.

Following the P1B1 precedent, U24 (`ownershipAmended20260928`) and node R4.S7 (`ownershipPathsAmended20260928`) gain exactly those paths, under the owner's OD-mvp-hard-cutover. The re-pin stays within U24's 15-file / 500-line caps and is not split. U24 is re-dispatched from this merged amendment. The evidence is in [u24-ownership-blocker-20260928.json](evidence/u24-ownership-blocker-20260928.json).

## 2026-09-28 PAIC registered: server-AI source contract before PAI (parent)

Plan task 41 needs a separately owned source contract for server-driven co-op opponents before PAI can be admitted. It is registered here as unit **PAIC** on R6.umbrella, the node that owns `openspec/changes/harden-gm-two-player-campaign-sessions`, placed immediately before PAI.

PAIC owns only that change. Its review classes are authority, privacy and replay. Its predecessors are P1A, P1B1, P1B2, P1B3 and P1C, all complete with exact-main proofs, so it is registered as planned.

Its letter is a MODIFIED co-op mission requirement:
- the server takes opposing-unit turns through existing engine AI inside the host's serialized command lifecycle, with no browser grant;
- each server turn has a deterministic command identity derived from the match, the accepted head and the active unit, so replay and cold reopen reproduce it and a duplicate trigger cannot append twice;
- output uses normal per-viewer publication;
- the existing disconnect and pause policy applies unchanged.

The contract also updates the change's design crosswalk. It leaves the per-player same-side ownership rule and the frozen occurrence keys unchanged, and it must not authorize a player-supplied internal AI command.

PAI now lists PAIC as a predecessor (`amended20260928`) and stays blocked until PAIC has an exact-main proof. With PAIC planned ahead of U24 in ledger order, `validate-roadmap.mjs --next` prints PAIC. U24 was admitted and dispatched earlier on `f2d09fe`, when `--next` printed U24, and continues on its own lane. The registration evidence and clause crosswalk are in [paic-registration-20260928.json](evidence/paic-registration-20260928.json).

## 2026-09-28 U43 complete (parent)

U43 (#2075, head `5983fb9ef5f3b423f7ff468aa067348cb8d234bb`, merge `4206a48bc797a59b33b2f48a8f73d22e24614da9`) makes boot recovery reach a commit-ready journal head for every match the store holds, at mode enabled. The create seed persists the opening batch as a `create:<matchId>` receipt over revisions 0..N-1, carrying the folded opening post-state digest, before mirroring it. Recovery reads the live-path journal head first and leaves complete journals unchanged, including pre-U43 matches that have no create receipt. For the missing range only, it validates full v2 or legacy fingerprints and recomputed post-state digests before any replay, then replays whole batches through `mirrorCommittedBatch`. Missing, gapped or corrupt receipts refuse with a typed `partial-history` block and no journal mutation, and no command identity is ever synthesized.

The owner's standing merge instruction of 2026-09-28 is recorded in PK-u43-ruling; the parent posted `OWNER-RULING` comment 5864527726 and applied `owner-ruled`. The head went through three rounds:
- **b37ee96:** Lane A (gpt-6-sol) blocked it because recovery checked only a fingerprint prefix, and CI on it caught a regression that refused pre-U43 matches at boot.
- **1aa120d:** fixed both, and was blocked because a nonempty corrupt post-state digest was accepted.
- **5983fb9:** validates the digest before replay, and was approved.

Every correction was a new commit with red rows on the prior head.

The [exact-main proof](evidence/u43-mainproof-20260928.json) passed: build with the e2e marker, 18 runtime suites and 167 tests, the exact-main ladder (strict-smoke), tsc, the validator in four modes, openspec strict, qc:openspec-ci, the qc pin, lint (84 warnings, 0 errors), lint:units and format:check. U43 was folded and closed in one PR because its ruling was already given. No unit is released; U24, the flip that U43 gates, was already planned. `validate-roadmap.mjs --next` prints U24.

## 2026-09-28 P1C complete; partial-success rejoin assigned to P2 (parent)

P1C (#2073, head `f474743c9aab2d6029e5c29a98218b215bb81e46`, merge `5433488de0fe7ef9ede71144463205e4b290c98c`) carries the mission identity and the original accepted campaign head (`branchId`, `revision`, `effectiveGeneration`) from the mission launch page into `launchCoopMission`. That function creates the shared mission through the authenticated mission-create route, using the stored co-op Bearer token, the approved force contributions and the deploying-unit bootstrap, before any local encounter side effect. It returns the route's `missionMatchId` separately from the local `gameSessionId`. A stale or failed create returns before the local launch and before navigation, and an identical retry keeps the same shared id. Encounter and command-HQ navigation are unchanged until P2.

The owner's standing merge instruction of 2026-09-28 is recorded in PK-p1c-ruling; the parent posted `OWNER-RULING` comment 5863723675 and applied `owner-ruled`. Lane A (gpt-6-sol) first returned REQUEST_CHANGES on a retry after partial success. If the local launch fails, or the tab closes, after the shared mission was created, the next click reads a head advanced by `CampaignMissionLaunched`, and the route refuses the no-longer-identical request with 409. No duplicate mission is created, but the mission cannot be relaunched from the page. On re-review against P1C's binding text ("identical retry never creates another shared mission") it withdrew the blocker, recorded the gap as a NOTE and approved. The owner was asked how to handle the gap and did not answer within 30 minutes, so the parent took the recommended option. The gap is tracked as FN-p1c-partial-success-rejoin, and P2's behavior is amended so that an already-launched mission rejoins its announced `missionMatchId` instead of re-creating it.

The [exact-main proof](evidence/p1c-mainproof-20260928.json) passed: build with the e2e marker, 7 runtime suites and 75 tests, the exact-main ladder (strict-smoke), tsc, the validator in four modes, openspec strict, qc:openspec-ci, the qc pin, lint (84 warnings, 0 errors), lint:units and format:check. P1C was folded and closed in one PR because its ruling was already given. No unit is released: PAI also needs the server-AI OpenSpec contract (plan task 41), and P2 and U38 wait on PAI. `validate-roadmap.mjs --next` prints U43.

## 2026-09-28 P1B3 complete; P1C released (parent)

P1B3 (#2071, head `1d9bdfbd7a23c7f612e047895f511ded0527807a`, merge `c3f83fd1aea062d5c9f7960dba7866fef9f9a5f9`) delivers each accepted co-op mission launch to a guest who reconnects cold. After the guest's safe baseline, the session replays the stored `CampaignMissionLaunched` facts that the guest's campaign scope admits, exactly as stored and without writing to the source journal. This covers durable-member join, adapter-unavailable large-gap resync (frames buffered before the cut, then the tail drained) and both room-code reconnect branches (history read after live attach, deduped per connection), so a launch committed during hydration arrives exactly once. Grant projection, the privacy latch, the wire gate, pause/invite policy, transport and the reducer are unchanged, and the stored private checkpoint and later live checkpoints stay withheld.

The owner's standing merge instruction of 2026-09-28 is recorded in PK-p1b3-ruling; the parent posted `OWNER-RULING` comment 5862784916 and applied `owner-ruled`. Lane A (gpt-6-sol) first returned REQUEST_CHANGES. On re-review of the same head it withdrew its send-failure cleanup concern, because the binder's send helper never throws and cleanup always runs, then recorded its per-file quality coverage directly and approved. The [exact-main proof](evidence/p1b3-mainproof-20260928.json) passed: build with the e2e marker, 30 runtime suites and 236 tests, the exact-main ladder (strict-smoke), tsc, the validator in four modes, openspec strict, qc:openspec-ci, the qc pin, lint (84 warnings, 0 errors), lint:units and format:check. Its first in-script `--github` run failed only because `gh` refused two PR reads; that log is preserved, and a rerun passed. P1B3 was folded and closed in one PR because its ruling was already given.

P1C is released from blocked to planned: its `admissionRequires` (P1A, P1B1, P1B2 and P1B3 complete with exact-main mainProof receipts) is met. P1B's split slices are now all complete.

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

## P2CC closure publication registration (recorded 2026-10-08)

Task71 registers nine exact future D20261002 closure paths. Task2 verified the 740-byte manifest SHA-256 `bac0b59a0096cacf5c70d83c1fc603e08209a94e7b31d2dda38a9b7d5ed063e4`; the other eight targets retain their admitted names. Separately admitted closure has a ten-file census (units.json plus nine artifacts), unchanged 300 counted added lines and unchanged R6 node15 limit. The historical six-file source/three-receipt grant remains intact.

This three-file registration supplies no closure artifacts or owner decision. P2CC remains local-verified with its original source actors, baseline and admission/red/local receipts; PK-p2cc-ruling decision/ruling remain null. Independent exact-head registration review, required CI, parent ruling/pinned merge, postmerge workflows and independent exact-main proof remain pending. Future source-head ruling recording and closure require separate admission; P2C, P2 and U38 remain unreleased. See evidence/p2cc-closure-publication-registration-20261002.json.

## L1 release point registered (recorded 2026-10-17)

PLAN.md Revision 2026-10-17 step 3 names L1 "first shared mission". Checked against units.json at c5172fdc7be7289172dc21304cfd7a2331bd0f21 (TS7 track complete: all eleven active TS7 units main-verified; L0 v2.1.0 published at e308fb2a4), the shortest chain that honours every registered predecessor edge and documentary gate is seventeen units in registered order: P2CG1B, C, D, E, F, G1, G2, H, I1, I2, I3, I4, P2CG2, P2CH, P2C, P2, U38. P2 is readmitted by P2C (Task 17) and U38 follows P2; no shorter set exists without an owner-approved contract amendment. The layer is registered under units.json layerRegistration20261017L1 with evidence/l1-release-point-registration-20261017.json. Acceptance is P2's registered proof (npm run verify:qc:coop-campaign-journey on exact Main) plus U38's selector; the release (v2.2.0) is a layer boundary inside an open P3. Nothing is admitted, released, readmitted or closed by this entry; every unit's contract, caps, review classes and edges are unchanged.

## Local-seat credentials L1 prerequisites registered (2026-10-18)

Root adopts identity-gap option B under the recorded standing owner instruction and 2026-10-18 recommendation approval. The byte-exact report is evidence/identity-gap-20261018.txt (SHA-256 e16d2a29ff0d5196b9b5c3962c9fa53d4272be4e086eea58dc1a225cb4aecc76). Today ordinary token minting uses the server-wide active vault identity, so three browsers cannot supply distinct players plus GM.

Register blocked sensitive LSC-0 contract/spec, LSC-1 repository/API/signing and LSC-2 selector/recovery/packaged proof, each capped at 15 files / 500 counted lines. L1 grows from 23 to 26: HP -> LSC-0 -> LSC-1 -> LSC-2 -> H. Exact literals and full census freeze at admission; G2/HP overlapping leaves require fresh Main closure and census. No source work or acceptance is supplied. LSC-2 must have genuine exact-main mainProof PASS, fetched-main ancestry and closure before P2 (Task 18) journey proof, U38 acceptance and the v2.2.0 two-players-plus-non-playing-GM human session.

Operator-managed seats permit operator impersonation; the shared OS offers no isolation. B15 remote holds and PRIV-1 remain. Owner questions stay pending with Root recommendations: local seats for v2.2.0, option A independent private accounts after L2; GM re-provisions/revokes and guest re-claims with a new password; revoked seats fail next mint/renewal, without a claim of immediate connected-session eviction. #2254 merged at 21b490fd24c11cf344b72cd62e480e0cb9ffac91 during registration. Rebased onto it, preserved its council-3 gates and updated l1ReleaseChecklist20261018 to 26 closures with LSC-2 exact-main closure explicitly required before the human session.

## L1 tail amendments registered (2026-10-18)

Root adopts TAIL-PREP under the standing owner instruction to continue recommended options and publish as needed, plus the 2026-10-18 recommendation approval. The byte-exact report is evidence/tail-prep-20261018.txt (SHA-256 7bd7dd724476ce533e0a567f760ff996ffd9623f94fefb046578caf3a2a51a2e). This is documentary registration only; no source admission, new runtime proof, closure or human acceptance is claimed.

Register blocked routine test-only P2J under R2.authority-live. Its registration must be merged and independently qualified before P2 admission; execution follows genuine P2 and U38 closure and all retained L1/LSC gates. Three isolated ordinary LSC identities (GM plus two players) on one loopback server must play real combat to terminal Results, apply the authoritative outcome once and reload to the same result. P2J has a prospective six-file source stage and unchanged 15-file/500-counted-addition caps. Its explicit QC selector is `node scripts/playwright/run-playwright.mjs test --project=chromium e2e/coop-campaign-two-browser-journey.spec.ts --workers=1`; the existing `npm run verify:qc:coop-campaign-journey` and U38 ownership selector remain required on the same exact RC. P2J closure and exact-RC PASS precede installer rehearsal and the v2.2.0 human session; checklist items stay pending. With #2257 LSC-1DB/LSC-2P registration, the L1 closure count grows from 28 to 29 and the tail order is P2 -> U38 -> P2J. Task18 original contract is unchanged.

P2CG2 gains exactly `src/lib/multiplayer/server/campaignApplicationConnection.ts` for durable settlement notification and receipt attachment invalidation across retained-seat/paused-recovery/removal cases. Its prospective stage is 12/15 files; caps and original behavior remain unchanged. No wire/schema/numeric-readiness expansion; additional required scope needs a separately registered successor.

P2C gains a Task17 qualification note binding every P2CC obligation, all 27 explicit source predecessors and newer B14/HP/LSC gates to actual assertions, tested heads, commands/exits, artifact hashes, mainProof, fetched-Main ancestry and closure. Freeze the six-file documentary stage and explicit original P2/U38 readmission fields separately; retain original contract text and prerequisites. Missing/non-PASS/non-ancestor/unclosed evidence, omitted matrix cells, absent LSC acceptance or absent P2J registration must refuse qualification. The ordinary ledger validator is not semantic enforcement. No G2/R or other existing unit fields change.

## B14 capability-seam split registered (2026-10-18)

Parent adopts Option A from the byte-exact evidence/b14-prep2-20261018.txt (SHA-256 1b3b2c2d6c860ad9ef1f9eafff56406e136fd1dce01e15fa5859bd21d83ed507) under the standing owner instruction and 2026-10-18 recommendation approval. The prep census found 15 existing passing suites broken by refusal (14 WebSocket plus multiplayerMatchMeta.test.ts); the aggregate repair would need about 30 files. This is docs-only registration, with no source admission, implementation proof or closure.

Register blocked sensitive B14-0A (15 files: predicate, HTTP refusals/proof and four documented legacy-filter seams) and B14-0B (15 files: ten remaining test-only seams). B14-0B remains sensitive because the mocks affect privacy-proof reachability; RED is honestly N/A and before/after passes are required. B14-0 shrinks to 11 files for WebSocket refusals, the unmocked default-refusal test/mutants and spec. The seam retains existing fog-filter and S sealed-choice assertions beneath refusal; it cannot substitute for the real default proof.

Effective order: P2CG1S -> B14-0A -> B14-0B -> B14-0 -> B14-HEAD -> P2CG1HP. B14-HEAD consumes B14-0A predicate/digest proof. All four B14 units require genuine exact-main PASS, fetched-main ancestry and closure for full privacy acceptance; H explicitly requires both new units. L1 grows from 29 to 31 with all checklist statuses pending. Ordinary 15-file/500-counted-addition caps and all existing sensitive review/OWNER-RULING gates remain.

Unreadable fog config during live delivery is infrastructure failure: WS 1011; fog-policy refusal stays 1008. Export/private-preview retains its existing HTTP 500 mapping with fixed fog-projection-unavailable reason. New ownership grants are literal multiplayerMatchMeta.test.ts and clientAgainstFogServer.integration.test.ts leaves, not parent directories. S spectator suite transfers to B14-0B only after S closes; securityBoundary.test.ts also has B15-PRIV reservation (and LSC-1 alias), requiring fresh admission census.

Parent ruling resolves the link coordination: change only P2CG1S.successors from B14-0 to B14-0A, retaining P2C and every R/S state, admission and proof field. The registered chain is symmetric; the draft coordination hold is removed.

## L1-SMOKE-A2 admission sizing stop (2026-10-20)

Fetched Main `c24bcedbb` includes closure #2312; all four A2 predecessors are main-verified with PASS mainProof and ancestor merges. A2 remains planned. Evidence `evidence/l1-smoke-a2-admission-20261020.json` freezes this three-file documentary diff, the read-only A1 controls and the current candidate leaves. It records 624 normally formatted lines in an incomplete sizing draft before the runner, legal phase/public-barrier provisioning, ordinary co-op mission setup and lifecycle work. No source admission, RED/GREEN or runtime acceptance is claimed.

Propose serial L1-SMOKE-A2F (trusted fixtures/provisioning), L1-SMOKE-A2M (all nine matrix/reconnect/restart controls), then a narrowed A2 (co-op restart/captured rolls, concurrent first sockets and final composition). These are proposals only; Root must register/qualify their manifests and edges, and every unit must independently fit the unchanged 15-file/500-counted-line caps. Original acceptance, A1 frozen modules and downstream B/H gates remain intact.

Correct A2's stale release text and omitted RECOVERY-2 predecessor. Restate CF-MPRU2-3/CF-MPHD-5 in A2 and CF-MPRU2-2 in U44; U44 carries OBS-MPRU2-1 conditionally for the next genuine MatchRecovery.ts owner. No other unit lifecycle, roadmap edge, historical receipt or packet changes.

## A2 serial split registered under Root ruling (2026-10-20)

Root accepts the 624/500 sizing stop in #2315 and adopts counting after normal repository oxfmt going forward; A1's historical receipt stands. The exact UTF-8 ruling is `evidence/l1-smoke-a2-split-root-ruling-20261020.txt` (SHA-256 `ac4730c6c143dc894729cc9cb1624144ffc0276297365a2e77a0ca660cc1cd81`); the hash-bound registration evidence is `evidence/l1-smoke-a2-split-registration-20261020.json`. Main `a2e2a7b8d` was merged first with its ledger/product bytes preserved.

Register L1-SMOKE-A2F (planned, four verified predecessors), then L1-SMOKE-A2M (blocked), then narrowed L1-SMOKE-A2 (blocked, A2M plus its original four direct predecessors). Each keeps 15 files/500 counted additions and full sensitive cadence. A2 id and B/H successors stay unchanged. All five original matrix/control/reconnect/restart acceptance rows are retained through F/M and final A2 composition, plus CF-MPRU2-3 real co-op mission restart/accepted action/captured rolls and CF-MPHD-5 concurrent first sockets. Current L1 closures grow 41 -> 43; all release/RC/installer/human statuses stay pending.

Registration only: Root must merge #2315 and qualify this registration before A2F admission. No source, test, stage receipt, packet, runtime PASS or task tick is supplied. A1 and historical source/ruling receipts stay unchanged; Main's LSC-2OP/P2CG1HP changes stand exactly.

## LSC-2 serial split registered under Root ruling (2026-10-20)

Root accepts the admission sizing stop: 682 normally formatted product additions before lifecycle (store267, chooser/renewal373, entry32, navigation10). No source admission, RED/GREEN or runtime acceptance. The frozen sizing receipt is `evidence/lsc-2-admission-20261018.json`; exact Root ruling is `evidence/lsc-2-split-root-ruling-20261020.txt` (SHA-256 `686e563df508c95237bca7d95ffd8a38c15d0a5c1a079cddee3c95e4558de873`), bound by `evidence/lsc-2-split-registration-20261020.json`. Branch starts from merged A2 registration #2315 at `a69540e25`; its ledger and all historical evidence stay intact.

Register planned LSC-2C (adapter), blocked LSC-2O (operator/server carries), then blocked narrowed LSC-2 (chooser/join/renewal and final integration). Symmetric chain: LSC-2OP -> LSC-2C -> LSC-2O -> LSC-2; LSC-2 retains its id and all successors. Each gets unchanged 15-file/500-counted-addition caps after normal oxfmt, full sensitive cadence and separate exact-main closure. Prospective stage counts are7/15/10; product sizing267/unknown/415 is not final admission fit. Current L1 closure inventory45; every release status remains pending.

CF-LSC2OP-1 routes to C/final UI; -2 to O plus final/packaged three-identity proof; -3 now has named server target O; -4 preserves password purposes with packaged autofill proof in2P; -7 explicitly requires unknown-outcome refresh and write disable on refresh failure in O, preserved by final integration. No original acceptance, primary/bearer controls, H/P2/U38/P2J/installer/human gate or salvage ownership is waived.

Registration only: no C admission commit until Root merges and independently qualifies this docs PR. Null source baselines/heads/stage receipts/ownerGate remain; no packet or future OWNER-RULING is invented. Reports/design remain outside source under `_reports/2026-10-19/lsc-2-fit-sol/`.


## MP-REWIND-DICE-1 closure (2026-10-20)

Source #2316 is main-verified: ruled/reviewed head `0b2e815e40a58f8ffafd97e5aa25b63dbc4fedc5`, merge `664f8c13f7d59dd3d53212309993fac9a23e655b`. Independent Opus review APPROVE and live OWNER-RULING comment 6301768235 are byte-copied, each with a SHA-256/base64 envelope. Review: 14244 bytes, SHA-256 `69c4361bacf66497dc9b1f167d79f746ecbb64534f6cb538a11e109b6406728a`; ruling: 2144 bytes, SHA-256 `bf4e69e52ac4bf900b247c428a0e6f938885cbeb498b3620e606a95c09fcad4d`.

Fresh npm ci and mainProof at clean exact `664f8c13f`: owned 2/2; multiplayer server 179 suites / 1595 tests; strict root/scripts typecheck PASS, all through heavy-run lane rewind-dice. Source CI was 32/32 SUCCESS. Original admission/RED/local evidence and product bytes are unchanged by this metadata-only closure. No task tick, browser/build proof or release acceptance is claimed.

CARRY-FORWARD routing (no added source permission):

- CF-MPRD-1 (Low) -> U44: Debug-seeded post-rewind dice lack capture/stamping coverage. The seeded reset replaces the whole capture object; production is unaffected. The next frozen host owner must test dynamic capture after replacement and per-intent swaps, carrying this onward if U44 does not freeze the file.
- CF-MPRD-2 (Low) -> U44: Prove journal-mode post-rewind captured dice with a fixture that records a journal head. Existing owned coverage uses a legacy-compatible fixture; the journal-mode production fix is not independently pinned by it.
- CF-MPRD-3 (Info) -> U44: Refresh stale reseed/config.seed comments in ServerMatchHostRewindRebuild.ts (reviewed lines 172-174 and 195-197). U44 already names this file; carry this onward if its freeze excludes the comment locations.
- CF-MPRD-4 (Info) -> Root registration follow-up: Pre-existing: CoopOpponentDriver.ts:130-140 uses a hash seed for co-op AI dice instead of crypto. Root must register a finite co-op AI owner and scope; this closure grants no source ownership or fix.
- CF-MPRD-5 (Info) -> Root registration follow-up: Pre-existing: ServerMatchHostJournalAuthority.ts:266-274 rebuilds after journal divergence without a dice roller. Root must register the journal-authority follow-up; U44 capability-DB routing is not permission for an unregistered divergence repair.

All three U44 items are in its behavior text. CF-MPRD-4 and CF-MPRD-5 remain open registration follow-ups for Root in the source unit, review receipt and ruling packet; no named finite target unit exists for those repairs. No successors are released: this unit declares no successor or reverse predecessor edge. Unrelated units and in-flight LSC-2/A2F lifecycle edits remain owned by their lanes and must be union-preserved before publication.

## L1-SMOKE-A2F admission sizing stop (2026-10-20)

Root opened F after #2315 merged as a69540e25 with Astra APPROVE and OWNER-RULING comment 6301741730. Fresh fetched Main 664f8c13f7d59dd3d53212309993fac9a23e655b contains that merge; all four predecessors have genuine mainProof PASS, main-verified state and ancestor merges. F remains planned and its prospective source leaves remain absent.

Evidence `evidence/l1-smoke-a2f-admission.json` freezes this two-file documentary manifest, protected controls and the complete active/open-PR census. The unexecuted sizing draft measures 646/500 normal repository oxfmt lines across provisioner, trusted fixture and runner before lifecycle additions (l1-built-server-spectator-context.mjs: 221; l1-built-server-spectator-trusted-fixtures.ts: 272; run-l1-built-server-spectator-fixture-proof.mjs: 153). Its bytes and hashes are retained for reproduction. This measures one candidate, not a lower bound on every implementation; unresolved activation/GM-positive/guard controls are listed explicitly. No source admission, RED, GREEN, packet, runtime acceptance or closure is claimed.

Recommend registering a serial ordinary-provisioning/read-only-witness predecessor, then narrowing the existing A2F to trusted brand/stale-assignment fixtures and final F composition. Preserve F's id and successor A2M, all four original predecessors, every acceptance row and the existing M -> A2 -> B/H obligations. Root must qualify a bounded split or supply a complete normally formatted fitting design before finite source admission resumes. No split, cap change, new edge, acceptance waiver or foreign source fix is made here.

The fresh worktree lacked generated Husky launchers, so the initial documentary commit did not execute pre-commit. Install them with wrapped npm run prepare and requalify this admission stop in a corrective commit that runs the live staged-file hook. No source is admitted.

## A2FP -> narrowed A2F registered under Root ruling (2026-10-20)

Root accepts #2318 at d0868008c: the unexecuted normally formatted candidate measures 646/500 lines (context 221, trusted fixture 272, runner 153). Register A2FP for ordinary provisioning/read-only reachability, activation-aware principal selection and strict CLI/precondition falsifiers; narrow existing A2F to trusted brands/stale assignments, observed non-spectating-GM declaration positive, real-image GM fixture qualification and full F composition. Original F acceptance rows are preserved verbatim with a four-row coverage map. Ruling `evidence/l1-smoke-a2f-partition-root-ruling-20261020.txt` has SHA-256 `040f76b7696c0dfcdeb888468c54f1dd372d15b27d6de532ab94cb140e84bb02`; registration source is `evidence/l1-smoke-a2f-partition-registration-20261020.json`. Main `434fdab1d5b0fbe107435a88985ce3eaaf753033` was union-merged first.

A2FP starts planned with F's four verified predecessors and successor F. F starts blocked, keeps its four original predecessors and successor M, and adds FP. FP/F each retain 15 files/500 formatted counted additions and full sensitive cadence. One additional exact-main closure changes the current L1 count 45 -> 46; no checklist status changes. M, final A2, B/H and all independent release gates remain; CF-MPRU2-3 and CF-MPHD-5 stay in final A2. Historical A1/registration/admission receipts and the hook correction remain unchanged.

Registration only. Do not start FP admission until Root merges #2318 and qualifies it. The 374-line ordinary context/runner subtotal is incomplete, not fit proof. If FP still does not fit when drafted, stop and tell Root before proposing a third split; Root is raising size-cap policy with the owner. No source/test leaf, stage receipt, packet, runtime acceptance or task tick is supplied.


## MP-CAMPAIGN-HOST-DEDUPE-1 closure (2026-10-24)

Source #2313 is main-verified: reviewed head `c3eb20afa28a6d5d630f55511e892e26c2b341cb`, merged PR head `f7c147688a4ed5f7538f42710d911efffa535466`, merge `6d180495883c057a4ed1cb91807cbb76a91a7223`. The Opus review APPROVE at the reviewed head and the live OWNER-RULING comment 6381509945 are preserved byte-exact: the review as a SHA-256/base64 envelope, the ruling as a raw copy plus envelope. Review: 12033 bytes, SHA-256 `33e79050864e5c2679e66663e0a919a0220b883907f358f55de8a052198f0d75`; ruling: 1329 bytes, SHA-256 `82ead69fe0ae9367563e24988437301df266e1796307c5a05a891a31b83a8546`. The two product files are byte-identical at the reviewed head, the PR head and the merge.

Fresh npm ci and mainProof at clean exact `6d180495`: owned 28/28; multiplayer server 179 suites / 1601 tests; strict root/scripts typecheck PASS, all through heavy-run lane step1-closure. Source CI at the PR head was 33/33 SUCCESS. Original admission/RED/local evidence and product bytes are unchanged by this metadata-only closure. No task tick, browser/build proof or release acceptance is claimed.

CARRY-FORWARD routing (no added source permission):

- CF-MPCHD-1 (Low) -> Root registration follow-up: Add a late-joiner concurrency test: gate register(), issue a second getOrCreate after the metadata read and prove it shares the pending creation. The owned suite does not kill mutant M2 (evict after metadata read, CampaignHostRegistry.ts:453); review probe P1 does.
- CF-MPCHD-2 (Low) -> Root registration follow-up: Lifecycle parity with MatchHostRegistry: _reset clears the in-flight map behind a generation guard (probe P3), and dispose awaits or cancels a pending creation and closes its result (probe P2; MatchHostRegistry.closeMatch awaits in-flight first).
- CF-MPCHD-3 (Low) -> Root registration follow-up: Route direct register() through the same per-key in-flight slot, or make register idempotent across its awaits, so the create-route registration cannot race a cold getOrCreate (probe P4; pre-existing, declared out of scope by the admission).
- CF-MPCHD-4 (Info) -> Root registration follow-up: Treat closed entries as absent in getOrCreate, mirroring the MatchHostRegistry isClosed check. Pre-existing; coopMissionCreate.ts guards itself today.
- CF-MPCHD-5 (Info) -> Root registration follow-up: CampaignHostRegistry.ts is 409 lines against the oxlint max-lines warn threshold of 400 (0 warnings at base 0372f9d1d). Bring it back under 400 when next touched. P2CG1H holds only a type-only grant and P2CG2 names the file in a draft stage census; neither grants this split, so no routing text was added to them.

No registered unit grants the CampaignHostRegistry.ts runtime or CampaignHostRegistry.test.ts scope these items need: P2CG1H holds a type-only grant and P2CG2 names the file only in a draft stage census. All five stay explicit open registration follow-ups in the source unit, review receipt and ruling packet. No successors are released: P2CG1H still has blocked predecessors (LSC-2P, L1-SMOKE-A2, L1-SMOKE-B). LSC-2C is not admitted by this closure.


## LSC-2C closure (2026-10-24)

Source #2326 is main-verified: reviewed and merged PR head `fceb4269c7e8d26153ed5df5033a8efcc3d433a2`, merge `59b8af58a9372a74191b253bd02d837f58dc390e`. The Opus exact-head review (APPROVE-WITH-IN-PR-FIXES) and the live OWNER-RULING comment 6383180420 are byte-copied as SHA-256/base64 envelopes. Review: 24814 bytes, SHA-256 `ca1cb8df7b5a0b259a7314c83883ee6f95c56657960a915b41ec80f5514cae4e`; ruling: 2005 bytes, SHA-256 `dcbed35bf330768756dc642886fbb6c7758281580821f7c0f547b615184fd73a`. The two product files are byte-identical at the head and the merge, and the merge commit message names the duplicate rule copies (review F1).

Fresh npm ci and mainProof at clean exact `59b8af58a`: owned plus guards Tests: 97 passed, 97 total; regression Tests: 280 passed, 280 total (Test Suites: 14 passed, 14 total); typecheck PASS, all through heavy-run lane lsc-2c-closure. Source CI at the PR head was 33/33 SUCCESS. Original admission/RED/local evidence and product bytes are unchanged by this metadata-only closure. No task tick, browser/packaged proof or release acceptance is claimed.

CARRY-FORWARD routing (no added source permission):

- CF-LSC2C-1 (Medium) -> LSC-2O: Pin the ten guards the owned suite leaves unpinned (review M-1/F2; probes M1-M7, M9, M10): replace-path expiry and wire/result expiry agreement, status and remember playerId agreement, the primary 6h cap, displayName 64, issued<=expires, forget without a match, and Retry-After 0. Append the verified review block (R1-R9, 61/61, kills 13/13), run oxfmt --write on the test, and add it to the LSC-2O mutation inventory. Optional nit N-1: drop the no-op finally { password = "" } in mintCoopCredential.
- CF-LSC2C-2 (Low) -> LSC-2: L-1: replace CampaignCoopEntryPanel.mintToken with mintCoopCredential(primary, ...) and delete mintToken (multiplayerPage.helpers.mintToken is a further pre-existing caller). L-2: map a primary 401 (Invalid password) to a wrong-password message and a 404 (no vault identity) to OPERATOR_IDENTITY_REQUIRED instead of LOCAL_SEAT_DENIED/REQUEST_FAILED. L-3: keep or explicitly accept the 10s browser-clock drift check on primary tokens; the current panel has none, and /auth/token is not loopback-only.
- CF-LSC2C-2R (Low) -> Root registration follow-up: Export PASSWORD_MAX_LENGTH, DISPLAY_NAME_MAX_LENGTH and the 6h primary / 1h seat token caps from their owners, plus a pure token time-sanity helper (expiry, issued<expires, 10s drift), so the client adapter imports them instead of mirroring them (review L-1, invariant 11).

LSC-2O is released from blocked to planned (release only). Its admission needs its own Root gate and PR; CF-LSC2C-1 goes into its mutation inventory there. LSC-2 stays blocked on LSC-2O. CF-LSC2C-2R remains an open Root registration follow-up.


## LSC-2O closure (2026-10-24)

Source #2329 is main-verified: reviewed and merged PR head `c1b97a3141a3b7dc1cc2b394a28bad41461c5220`, merge `e012028a945df0641089d946877c1192b51e9329`. The three Opus reviews (admission APPROVE-WITH-IN-PR-FIXES, implementation APPROVE-WITH-IN-PR-FIXES, delta APPROVE) and the live OWNER-RULING comment 6385425980 are byte-copied as SHA-256/base64 envelopes. Final review: 9868 bytes, SHA-256 `e278254d900f62d579f5f0811989ff310d8ab63d847a3405a8af4c6ee042c324`; ruling: 2215 bytes, SHA-256 `35c760c876dacb4fc3c27d1f7048521d51af21f4cd98e99afbcb45c501383bad`. All ten registered leaves are byte-identical at the head and the merge, and the merge has ordered parent2 equal to the head.

Fresh npm ci and mainProof at clean exact `e012028a9`: owned plus guards Tests: 246 passed, 246 total (Test Suites: 7 passed, 7 total); regression Tests: 174 passed, 174 total (Test Suites: 11 passed, 11 total); typecheck PASS; a built-server smoke returned 409 NOT_REVOCABLE for a fresh revoke of a revoked and an absent seat, all through heavy-run lane lsc-2o-closure. Source CI at the PR head was 33/33 SUCCESS. The review-round-3 notes N1 and N2 on the local receipt wording are recorded in the review receipt; the local receipt is unchanged. No task tick, browser/packaged proof or release acceptance is claimed.

CARRY-FORWARD routing (no added source permission):

- CF-LSC2C-2 (Low) -> LSC-2: Routing correction (supersedes the L-2/L-3 clauses of CF-LSC2C-2 in the LSC-2C records, which stay unedited): L-2 (primary 401 -> OPERATOR_DENIED, 404 -> OPERATOR_IDENTITY_REQUIRED) and the store side of L-3 (skip only the future-issuedAt 10s check for the primary choice) are DONE in LSC-2O. LSC-2 keeps L-1 (adopt mintCoopCredential(primary, ...) in CampaignCoopEntryPanel and delete the panel mintToken; multiplayerPage.helpers.mintToken is outside LSC-2 files) and the panel-side L-3 acceptance (explicitly accept or keep the primary clock behavior now that the store skips the future-drift check for primary).
- CF-LSC2OP-2 (Info) -> LSC-2P: Active-seat re-provision is relabelled and gated by an explicit confirmation (LSC-2O). LSC-2 retains new identity, GM readmission and ghost membership in the ordinary UI; LSC-2P owns the packaged proof and the CF-LSC2OP-4 password-manager/autofill proof.
- review-r2-I2 (Info) -> LSC-2: After an unknown outcome the operator alert reads "Local seat request failed." although the write may have applied. Consider "The result is unknown; the seats were refreshed. Check them before submitting again." in the final UI.
- CF-LSC2C-2R (Low) -> Root registration follow-up: Export PASSWORD_MAX_LENGTH, DISPLAY_NAME_MAX_LENGTH and the 6h primary / 1h seat token caps from their owners, plus a pure token time-sanity helper (expiry, issued<expires, 10s drift), so the client adapter imports them instead of mirroring them (review L-1, invariant 11).

LSC-2 is released from blocked to planned by this closure and admitted by the second commit of the same PR; its implementation starts only after this PR merges. CF-LSC2C-2R remains an open Root registration follow-up.


## LSC-2 closure (2026-10-24)

Source #2331 is main-verified: reviewed and merged PR head `56d530b207e00173ae9e5d127ca7cf127fed47e4`, merge `a7711ad136c70b3380788298414690b589ee8430`. The two Opus reviews (round 1 APPROVE-WITH-IN-PR-FIXES at `0985808d3d45032907c8603d23ea442a25e81aee`, round 2 APPROVE at the head), the PR #2330 review cited by the admission amendment, and the live OWNER-RULING comment 6387527112 are byte-copied as SHA-256/base64 envelopes. Final review: 12808 bytes, SHA-256 `b69f3736978d64604eb6c542a341ff705ff73ce14e27b635e9ea66ed65b35cea`; ruling: 2477 bytes, SHA-256 `293659e6e36e9e0a46a43486f3846757f8dc12c9afb31d2a29ac71ba4acd77fd`. All six registered leaves (the five manifest leaves and the RC-LSC2-1 leaf) are byte-identical at the head and the merge, and the merge has ordered parent2 equal to the head. The effective manifest is the 2026-10-20 manifest plus the RC-LSC2-1 leaf (11 files).

Fresh npm ci and mainProof at clean exact `a7711ad13`: owned plus guards Tests: 338 passed, 338 total (Test Suites: 10 passed, 10 total); regression and consumers Tests: 202 passed, 202 total (Test Suites: 17 passed, 17 total), including index.coop; typecheck PASS; a built-server smoke returned three distinct public playerIds, 401, 429 with Retry-After, a stable re-mint, a new playerId after re-provisioning, a 403 for a foreign Host and 200 for /gameplay/campaigns, all through heavy-run lane lsc-2-closure. Source CI at the PR head was 33/33 SUCCESS. R2-1 (a stale path label in the local receipt) and the LS13 qualification are recorded in the review receipt; the local receipt is unchanged. No task tick, browser/packaged proof or release acceptance is claimed.

CARRY-FORWARD routing (no added source permission):

- CF-LSC2-L1-DUP (Low) -> Root registration follow-up: Consolidate the two remaining primary mint client copies onto mintCoopCredential or a shared helper.
- CF-LSC2-STORE-RULES (Low) -> Root registration follow-up: Three rules live in presentation because the store is frozen: the choice-to-seat-id mapping (LocalSeatCredentialPanel.tsx and the store mint body), the renewal-window and expiry classification in CoopCredentialRenewal, and the join-time never-replace-a-bearer-with-a-different-identity guard in CampaignCoopEntryPanel.tsx (mirrors replaceCoopCredential IDENTITY_CHANGED). The store should export seatIdForChoice, a renewal-state classifier and a join-time bearer-adoption guard, and the panels call them.
- LSC2-F6-IDENTITY-CHANGED-RECOVERY (Low) -> LSC-2P journey or CF-LSC2-STORE-RULES: At entry, the IDENTITY_CHANGED message says to forget the sign-in and reclaim through co-op entry, but the only per-match forget control is inside CoopCredentialRenewal, which renders nothing while the bearer has more than four minutes left. In the same tab a user who rejoins a match with a different credential has no reachable forget until the window opens (workaround: a new tab). LSC-2P records the journey consequence; a fix needs a registered owner.
- LSC2-G5-GHOST-REMOVAL-CONTROL (Info) -> LSC-2P: No ordinary-UI GM ghost-removal control exists and LSC-2 adds none (RemoveParticipant reaches the host only through the transport intent, hosted by LS21c). LSC-2P records the step as absent and does not claim it, unless a UI leaf is registered.
- CF-LSC2OP-2 (Info) -> LSC-2P: LSC-2 proves re-provision, new playerId, refusal while the ghost holds a seat, GM RemoveParticipant, then admission in jsdom with real routes and SQLite. LSC-2P proves the same sequence on the installed app and records the ghost-removal step per G5.
- CF-LSC2OP-4 (Info) -> LSC-2P: LSC-2 renders create, join and renewal password inputs as uncontrolled unnamed type=password with autocomplete current-password. LSC-2P records the packaged password-manager/autofill observation (manual, not observable by Playwright; stated as a gap).
- CF-LSC2C-2R (Low) -> Root registration follow-up: Export PASSWORD_MAX_LENGTH, DISPLAY_NAME_MAX_LENGTH and the 6h primary / 1h seat token caps from their owners, plus a pure token time-sanity helper, so the client adapter imports them instead of mirroring them. Unchanged by LSC-2.
- review-r2-I2 (Info) -> closed: The operator alert wording after an unknown outcome stays informational; LSC-2 did not take it.
- RC-LSC2-1-census-lesson (Info) -> every admission census (Root): The LSC-2 census missed src/__tests__/pages/gameplay/campaigns/index.coop.test.tsx, a page-level consumer of CampaignCoopEntryPanel whose stale mint fixtures failed CI. A census of a component change must also search importers and page-level tests of every changed module, not only its sibling tests. Registered after the fact as RC-LSC2-1.

LSC-2P is released from blocked to planned by this closure. This PR folds LSC-2PE into LSC-2P by registration correction RC-LSC2P-1 (commit 2) and admits LSC-2P (commit 3); its implementation starts only after this PR merges.


## RC-LSC2P-1 and LSC-2P admission (2026-10-24)

Root registration correction RC-LSC2P-1 folds the proposed LSC-2PE into LSC-2P, as the OWNER-RULING on #2330 (comment 6386308308) directs: five exact ownershipExceptions (scripts/qc/v220-evidence.mjs, scripts/__tests__/v220-evidence.test.mjs, v220-steps.json, V220-EVIDENCE.md and the generated page) and a registrationCorrection20261024 record. Registration only: no v220 file, test, script or evidence byte changes in this PR; the local-seat-proof kind and the Step 2 done-test flip land in the LSC-2P implementation PR. Step 2 stays at 8 PRs.

LSC-2P is admitted on baseline `a7711ad136c70b3380788298414690b589ee8430` (frozen receipt `evidence/lsc-2p-admission-20261018.json`, proofClass full): effective manifest of 13 literal leaves, census (no literal collision; draft #2327 shares the page and, later, v220-steps.json in a different hunk), the S0-S7 and N1-N6 inventory, the selector table frozen from the merged LSC-2 source (59 rows), nine environment and harness mutants including the pre-LSC-2 RED installer, and a measured fit for the implementation PR of 11 of 15 files and about 256-328 of 500 counted lines. Q1-Q2 are adopted pending Root, Q3-Q5 and Q7 resolved or answered, Q6 (Step 8 re-run on the RC installer) and the new Q8 are open: the ordinary UI has no ghost-removal control, so the packaged S5 journey can only record that the new identity is refused while the ghost holds a seat (G5). The NSIS steps are not rehearsed here; three probes (G-P1 to G-P3) gate RED. LSC-2P implementation starts only after this PR merges. No PK packet until GREEN.

# H prerequisite registration design - 2026-10-17

Prepared locally from origin/main at 526cf6d063d6639118aa7056c511bf17fc3c0f65. Branch: codex/register-h-prereqs-20261017. Worktree: E:/Projects/Personal/MekStation-wt/register-h-prereqs-20261017. No fetch, product edit, push, PR, source admission or release is claimed. The root checkout is read-only except this explicitly requested audit copy; a byte-identical copy is included in the prepared commit. node_modules is a junction to the root checkout's node_modules. Validation used Node v24.15.0 and the installed global OpenSpec CLI; no dependency installation was required.

Register two new blocked finite supporting units of the P2CG1 package on R2.authority-live: P2CG1R for H-OPEN-1 / CF-E1 (reservation cleanup), and P2CG1S for B10 (spectator sealed-choice privacy). Both retain caps of 15 files / 500 U41 counted added lines. This chooses the repair branch of H-OPEN-1, not its historical residual-acceptance option.

The prepared change consists of units.json, roadmap.json, evidence/h-prereq-registration-20261017.json under openspec/planning/2026-09-12-roadmap-completion, and this audit. The evidence receipt records baseline and source hashes, ledger pre/post images, literal leaves, per-leaf estimates, validation log hashes and authority limits. It does not impersonate an admission, independent review or owner ruling.

1. Registration precedent and authority

The P2CG1A1/A2 split is the closest unit-shape precedent: finite buildable slices, explicit literal restrictions, blocked documentary successors, untouched aggregate task holders, null stage receipts and fresh measured admissions. Its correction receipt shows that missing leaves/subtotals must be registered explicitly. The TS7 mid-chain registration supplies the blocked-supporting-track and parent-enforced one-lane sequencing precedent. residualRegistration20261016 supplies the residual inventory and named-proof precedent; its specialized validator applies only to that dated registration, so these units use a new marker rather than masquerading as Task 57 rows.

The #2220 grant-helper amendment was appropriate for a single required test-literal fix inside D's already approved behavior. Neither present obligation is that kind of incidental leaf: the append cleanup changes failure semantics, and B10 changes a live privacy boundary and needs independent regression evidence. Reopening completed B/D or enlarging E/H would mix obligations and consume their reserved files. Separate units keep the original source receipts and caps truthful. No new roadmap node or OpenSpec task holder is needed: R2.authority-live already owns the required campaign and server directories, and existing P2CG1 subunits use empty taskKeys while P2C retains aggregate reconciliation.

Source correction: at this baseline, H-OPEN-1 is not inline under units.json successorNotes. It is in evidence/p2cg1d-review-20261017.json, successorNotes.P2CG1H.openNotesForActivation, reached through P2CG1D.stageReceipts.review. Its owner condition and CF-E1 wording are preserved byte-for-byte. The local source reviews are docs/audits/2026-10-17-p2cg1d-review.md (decision point 1 / CF-E1), 2026-10-17-pr2212-review-r2.md (note 3 and section 1 repro), and 2026-10-17-pr2220-review.md; their hashes are in the receipt.

2. Ordering and release holds

Execution order: E -> F -> G1 -> G2 -> R -> S -> H -> I1/I2/I3/I4 -> P2CG2 -> P2CH -> P2C, following the existing downstream chain. R also names B and D as implementation prerequisites. G2 names R as a successor; R names S and H; S names H; H explicitly depends on both R and S as well as G2. P2C's aggregate predecessors include both new units, so their closure cannot disappear in reconciliation.

E remains the next planned unit. E/F/G1/G2 behavior, order, restrictions and states are unchanged. Their separate leaves cannot carry the repair. Waiting until after G2 minimizes interference with the current chain and places both repairs immediately before activation. B10 is already live, so this sequencing is not a statement that the privacy defect is harmless until H: the registration also records a no-spectator-shipment / no-P3-exit hold until S has exact-main PASS. If a spectator-bearing shipment comes earlier, Root must explicitly resequence the serialized S repair ahead of it. No product-policy waiver is made here.

Both new units start blocked; registration releases nothing. Parent must verify predecessor mainProof PASS, actual fetched-main ancestry, closure and reservations before releasing the next unit to planned. NEXT enforces node dependencies and existing-path overlap, but not these ordinary unit predecessor/successor arrays or exception-only reservations. The explicit parent hold is therefore essential; passing validation is not an admission gate by itself.

The L1 marker gains a labelled amendment treating R/S as supporting L1 prerequisites under the existing one-product-writing-lane rule. No parallel implementation or closure is authorized. The original marker called H the first behavior-changing merge; that historical description now needs qualification because S repairs an already-live boundary. H's activation checkpoint, review obligations, L1 release acceptance and original task ownership remain intact. P3 is a phase exit, not an existing unit ID at this baseline; selecting the earlier H gate avoids inventing a P3 unit dependency.

3. P2CG1R scope and proof

Literal source/test leaves (7):

- src/lib/campaign/sync/ICampaignEventStore.ts
- src/lib/campaign/sync/JournalCampaignEventStore.ts
- src/lib/multiplayer/server/CampaignMatchHost.ts
- src/lib/multiplayer/server/bindCampaignSyncConnection.ts
- src/lib/campaign/sync/__tests__/JournalCampaignEventStore.test.ts
- src/lib/multiplayer/server/__tests__/bindCampaignSyncConnection.test.ts
- src/lib/multiplayer/server/__tests__/CampaignMatchHost.pipeline.test.ts

Add the optional synchronous server-only onNotCommitted callback, detect it as a controlled append, invoke it synchronously when append returns a non-committed result or throws, and wire the binder's existing idempotent release function. Keep the successful outer-commit notification, late cleanup and microtask fallback. Callback identity never enters a command fingerprint, payload or wire frame. Preserve duplicate-first behavior and typed outcomes.

A material finding beyond the review's shorthand: ICampaignCommitControls extends ICampaignAppendControls (campaignHostBatchCommit.ts:90), but CampaignMatchHost.commitEvents at lines 627-640 destructures and reconstructs only guard/onCommitted. The three-file interface/adapter/binder patch would silently lose the new hook. CampaignMatchHost.ts is therefore a necessary fourth product leaf: include the hook in capability selection and forward it unchanged. CampaignMatchHost.doors.ts and campaignHostBatchCommit.ts need no planned edit; they already pass the control object or inherit its interface. The Journal implementation's append extension is at lines 354-391; binder release/wiring is at 836-886.

Estimate by product leaf: interface 3-8 added lines, adapter 20-50, host 6-15, binder 2-7 = 31-80. Allow 16-35 counted units.json lifecycle additions: 47-115 counted total, plus 180-300 test additions reported separately. Known source/test/lifecycle subtotal is 8. Seven leaves + units.json + admission/red/local receipts + admission-review slot = 12 source-stage files, leaving 3 before the 15-file cap. Later review/identity/closure outputs still require separate G-OWN freezing and a full actual census; these reserves are not an exemption.

Required red-first proof: real SQLite guard-admits-then-revision-conflict and append-throw trails must show M:BEGIN IMMEDIATE:C-open=true, guard, M:ROLLBACK:C-open=true, tick. A queued foreign M write must not nest and be discarded. Removing the hook must fail the regression. Test actual binder host AdvanceDay, auto-approval and pending-proposal approval, idempotent release, no premature proposal consumption, refusal/no-reservation branches, success notification once, duplicates and unsupported/hook-only control capability. Run the three named suites, typecheck, lint/format, applicable exact-head sensitive review/owner gates and exact-main proof before H. The registration does not claim those product proofs have run.

4. P2CG1S scope and proof

Literal source/test leaves (5):

- src/lib/multiplayer/server/projection/MatchWireSealedChoices.ts
- src/lib/multiplayer/server/ServerMatchHostReplay.ts
- src/lib/multiplayer/server/ServerMatchHostEvents.ts
- src/lib/multiplayer/server/__tests__/ServerMatchHost.spectator.test.ts
- src/lib/multiplayer/server/__tests__/sealedChoiceDelivery.test.ts

The review repro is fog on + spectator seat + stale opponent side assignment naming that spectator + an unrevealed opponent AttackDeclared + actual ServerMatchHost.sendReplay. Reported baseline result: live replay contains six events including attack_declared#e10; the corrected HTTP export contains five public events and withholds it. This design statically traces that result; it does not claim to have rerun the probe.

ServerMatchHostReplay deliberately passes sealed declarations through its fog gather (lines 453-455), leaving the shared publication boundary to apply the hold. MatchWireSealedChoices.isActorOwnedByViewer (68-81) trusts gm role or stale sideAssignments without seat exclusion. MatchSeatMembershipSource derives player/gm roles, not a spectator role; a viewer.role === spectator patch would miss the defect. FogAwareMatchProjection already uses isSpectatorPlayer(meta.seats, principalId) before allowing actor ownership (233-246).

Use that same seat exclusion in the shared sealed-choice context before both gm and assignment shortcuts, passing current meta.seats from replay and live Event broadcasting. In ServerMatchHostEvents use meta seats even when fog is disabled, not its fogMeta-only seats variable. The context can receive an optional seat argument while its existing HTTP caller retains its explicit seat guard, avoiding an unnecessary export edit. Preserve ordinary human actors, non-spectating GM policy, authoritative reveals and all other privacy filters. Do not rewrite the generic publication boundary or introduce a new viewer role.

Estimate: shared helper 7-18 added lines, replay 4-11, broadcast 4-11 = 15-40 product additions. With 16-35 units.json lifecycle additions: 31-75 counted lines, plus 160-280 test additions. Known source/test/lifecycle subtotal is 6; five leaves + five lifecycle/evidence slots = 10 source-stage files, leaving 5 before the cap.

Required red-first proof runs the actual replay and Event broadcast with stale spectator assignments, all three sealed declaration types, fog on/off and player/gm brands. Assert secret IDs/payloads are absent, public events remain, current actors still receive their own sealed facts, displaced players gain no privilege, authoritative reveals still work, and withheld events produce no placeholder/sequence/cursor leak. Remove the seat exclusion to kill the regression. Compare the same fixture's HTTP export event set where applicable; matchHistoryFog is a read-only proof suite, not an edit grant. Run spectator, sealedChoiceDelivery, fog integration, gmNoPromotion, publication-boundary and matchHistoryFog suites, typecheck/lint/format, full exact-head CI and sensitive review/owner gates, then exact-main built-server socket smoke. No product run is claimed by this design.

5. Ledger requirements, risks and permission boundary

New entries carry unique IDs, node, empty taskKeys, behavior, existing parent-owned ownershipPaths, one exact units.json lifecycle exception, lifecycleOwnershipLimit, product ciClass, accepted reviewClasses, ordinary caps, blocked state, null baseline/prHead/mergeSha, all seven null stageReceipts, ownerGate null, admissionRequires, predecessor/successor lists and named proof lists. No fictitious snapshot keys or receipts are created. Node ownership aliases already exist; literal restrictions and known subtotals are added under ownershipPathsAmended20261009P2C. The dated registration/proof marker is documentary; the generic validator does not independently enforce its proof list or graph.

U41 counts added lines, never deletion credit. Tests/generated files and ledger evidence are excluded from the line count, but all actual files count; units.json additions count. The estimates are static sizing guidance, not cap-fit evidence. Admission must remeasure against its real future baseline and stop for explicit registration if another source/test/helper leaf is required. This commit does not change validator source, GOAL, DELIVERY, frozen activation predicate, owner decisions, caps or OpenSpec contracts.

Risks: R's hook cannot be delayed until after await. Preserve error identity if cleanup throws; do not classify known durable commit as non-commit. Inspect extension afterCommit throws and outer COMMIT failure at admission: the narrow requested hook around append does not by itself prove every possible writer failure path, and any required writer-level repair needs explicit registration. R's inherited host control reconstruction must remain in the manifest. S must exclude spectator seats before gm shortcuts and across fog-off delivery, while preserving permitted post-reveal behavior. No HTTP parity test may substitute for a real live-wire regression.

Additional H carry-forwards remain open: CF-E5 boot order and CF-E6 single port type. H's present literal manifest does not include every CF-E6 proposed importer, so H admission must reconcile that separately; this registration grants none of those edits. Concurrent E work, future main changes and broad parent path aliases require fresh ownership/ancestry checks. Registration and passing ledger checks do not close either defect or authorize a spectator shipment.

No new owner approval is required to prepare this local registration under the existing contracts and explicit user instruction. Registering finite repairs under existing ownership/caps does not change a product or delivery contract. Future implementation retains its existing sensitive review and owner gates; no owner ruling is forged by ownerGate null. Waiving H-OPEN-1/B10, changing activation/spectator privacy policy, relaxing caps, weakening proof or shortening the chain would be a separate contract/risk decision requiring explicit authority. The adopted DELIVERY ledger lane applies to this preparation; no future merge, administrative bypass or publication is performed.

6. Validation and reproducibility

All required checks passed after the final ledger correction (Node v24.15.0):

- validate-roadmap.mjs: exit 0, 80 nodes / 13 packages / 381 tasks / 40 triage rows.
- validate-roadmap.mjs --git: exit 0, same summary; existing historical cap/ownership/evidence checks pass.
- validate-roadmap.mjs --next: exit 0, P2CG1E (unchanged).
- node --test validate-roadmap.test.mjs: 86 passed / 0 failed.
- openspec validate --all --strict: 230 passed / 0 failed.
- scripts/qc/validate-openspec-ci-quality.mjs: exit 0, errors=0.
- Scope audit: only the intended predecessor/successor/admission text, two new units, literal restrictions/subtotals and labelled registration/L1 amendments changed; existing states/heads/receipts/holders/caps and original unit order preserved. git diff --check passes.

No build, whole-product Jest run, typecheck, browser, product mutation test, dependency installation or remote CI was run. QC here means scripts/qc/validate-openspec-ci-quality.mjs, matching #2220's registration proof; it is not the heavy verify:qc aggregate. The node_modules junction remains available for future CLIs, but the root dependency tree did not expose a local OpenSpec executable, so the installed global CLI was used explicitly.

Validation logs and their command/exit/hash JSON records are retained at E:/Projects/Personal/MekStation-wt/register-h-prereqs-evidence-20261017/. The evidence receipt hashes the final ledger postimages and validation logs. The local commit identity and this document's SHA-256 are reported with the handoff rather than embedded in their own hashed artifacts.

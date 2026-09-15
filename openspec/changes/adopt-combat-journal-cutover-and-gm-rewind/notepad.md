# Acceptance scenario inventory

Source review dated 2026-09-13T09:47:03.254Z. Baseline: fetched origin/main 44b94adbbb333a9d4965e057b34290e19fc0e781; root be7f85b867aa3e8576e5e3d27e309276203bc24b. The mapped GM test files match that fetched main. No fresh fetch or runtime pass is claimed.

All 80 scenario rows are classified: **34 real, 6 strict expected failures, 40 missing complete assertions**. Here, real means active scenario assertions exist. It does not mean the strict three-context contract, every evidence artifact, or production cutover has passed.

The historical 34-of-80 reachable count at the September 4 split is retained in tasks.md. Its numerical similarity to this source inventory is coincidental; the definitions, date and proof surface differ.

Every row still needs current-head behavioral evidence under its owner. R6.umbrella owns integrated acceptance. Source tags are not acceptance: E2E-31/32 require semantic cross-references, and partial assertions remain visible below. The six rewind expected-failure markers remain intact.

The runner has 22 implemented group plans and nine reserved names. Its all group contains 19 unique spec files; it is not a promise that all 80 requirements are implemented. Campaign, combat and visibility umbrella names remain reserved. Authority recovery opts into a test-only campaign journal flag.

Shared limits: many tactical packs use two player surfaces rather than independently proving the full GM/P1/P2 envelope. The complete evidence-bundle requirement is unproved where packs allow incomplete evidence. Existing performance assertions must be rerun on the recorded controlled runner; no latency result is inferred here. Missing assertions do not establish a product defect.

Detailed local review and source hashes: [parent receipt](../../planning/2026-09-12-roadmap-completion/evidence/r4-matrix-local-verification-20260913.json). Raw reviewer outputs and the normalized matrix remain under the ignored .sisyphus/roadmap-completion-20260912/r4-matrix-parent-20260913 directory; they are local artifacts, not files included in Git.

| Scenario | Classification | Exact test declaration or absent surface | Gap or proof limit | Successor |
| --- | --- | --- | --- | --- |
| E2E-01 durable campaign cold recovery | real | e2e/gm-two-player-authority-recovery.pack.spec.ts:47; e2e/gm-two-player-authority-recovery.pack.spec.ts:66 | Genesis assertions require the authority-recovery fixture opt-in; production cutover is not proved. | R2.authority-live |
| E2E-02 participant ownership survives restart | real | e2e/gm-two-player-authority-recovery.pack.spec.ts:85; e2e/gm-two-player-authority-recovery.pack.spec.ts:114 | Genesis assertions require the authority-recovery fixture opt-in; production cutover is not proved. | R2.authority-live |
| E2E-03 campaign fact commits before render | real | e2e/gm-two-player-authority.pack1.spec.ts:115 | Active source assertions only; fresh runtime evidence pending. | R2.authority-cutover |
| E2E-04 multi-event combat batch is atomic | real | e2e/gm-two-player-authority-order.pack.spec.ts:163 | Active source assertions only; fresh runtime evidence pending. | R4.S1 |
| E2E-05 crash before commit is invisible | real | e2e/gm-two-player-restart.pack.spec.ts:306 | Active source assertions only; fresh runtime evidence pending. | R4.S4 |
| E2E-06 crash after commit replays | real | e2e/gm-two-player-restart.pack.spec.ts:364 | Active source assertions only; fresh runtime evidence pending. | R4.S4 |
| E2E-07 concurrent player commands serialize | real | e2e/gm-two-player-authority-order.pack.spec.ts:225 | Active source assertions only; fresh runtime evidence pending. | R4.S6 |
| E2E-08 duplicate intent has one effect | real | e2e/gm-two-player-authority.pack1.spec.ts:153 | Active source assertions only; fresh runtime evidence pending. | R2.authority-live |
| E2E-09 duplicate frame applies once | real | e2e/gm-two-player-exactly-once.pack.spec.ts:57 | Active source assertions only; fresh runtime evidence pending. | R6.umbrella |
| E2E-10 replay-live overlap applies once | real | e2e/gm-two-player-exactly-once.pack.spec.ts:89 | Active source assertions only; fresh runtime evidence pending. | R6.umbrella |
| E2E-11 delivery gap triggers resync | real | e2e/gm-two-player-exactly-once.pack.spec.ts:121 | Active source assertions only; fresh runtime evidence pending. | R6.umbrella |
| E2E-12 delivery collision blocks | real | e2e/gm-two-player-exactly-once.pack.spec.ts:154 | Active source assertions only; fresh runtime evidence pending. | R6.umbrella |
| E2E-13 persistence failure is truthful | real | e2e/gm-two-player-fault.pack.spec.ts:45 | Active source assertions only; fresh runtime evidence pending. | R4.S1 |
| E2E-14 slow client is isolated | real | e2e/gm-two-player-resilience.pack.spec.ts:588 | Active source assertions only; fresh runtime evidence pending. | R6.umbrella |
| E2E-15 restart restores full authority | missing | e2e/gm-two-player-resilience.pack.spec.ts:767 | campaign, match, participants, receipts, cursors, outbox, and projections asserted; active branch explicitly deferred No test.skip; resilience header documents deferred active-branch clause. | R4.S4 |
| E2E-16 token expiry reauthenticates safely | real | e2e/gm-two-player-token.pack.spec.ts:153 | Active source assertions only; fresh runtime evidence pending. | R6.umbrella |
| E2E-17 active route uses durable identity | real | e2e/gm-two-player-token.pack.spec.ts:336 | Active source assertions only; fresh runtime evidence pending. | R6.umbrella |
| E2E-18 quiet heartbeat keeps clients connected | real | e2e/gm-two-player-authority.pack1.spec.ts:78 | Active source assertions only; fresh runtime evidence pending. | R6.umbrella |
| E2E-19 GM draft remains private | missing | No complete test mapped | No complete strict scenario assertion is mapped for this correction/privacy requirement; old source-header claims about absent production writers are not accepted as current behavior. | R4.rewind |
| E2E-20 Player 1 sealed choice is private | real | e2e/gm-two-player-privacy.pack.spec.ts:208 | Active source assertions only; fresh runtime evidence pending. | R6.umbrella |
| E2E-21 Player 2 sealed choice is private | real | e2e/gm-two-player-privacy.pack.spec.ts:303 | Active source assertions only; fresh runtime evidence pending. | R6.umbrella |
| E2E-22 finalization reveals together | real | e2e/gm-two-player-privacy.pack.spec.ts:402 | Active source assertions only; fresh runtime evidence pending. | R6.umbrella |
| E2E-23 public combat fact publishes immediately | real | e2e/gm-two-player-privacy.pack.spec.ts:208 | only an authored public fact type is asserted | R6.umbrella |
| E2E-24 fog yields distinct projections | missing | e2e/gm-two-player-privacy.pack.spec.ts:208 | frames, DOM, and viewer digests are asserted; pre-serialization projector objects are not captured/asserted No test.skip; missing literal projector-object clause. | R6.umbrella |
| E2E-25 public correction redacts private reason | missing | No complete test mapped | No complete strict scenario assertion is mapped for this correction/privacy requirement; old source-header claims about absent production writers are not accepted as current behavior. | R4.rewind |
| E2E-26 reconnect preserves visibility | real | e2e/gm-two-player-privacy.pack.spec.ts:466 | Active source assertions only; fresh runtime evidence pending. | R6.umbrella |
| E2E-27 player surfaces contain no GM-private data | missing | e2e/gm-two-player-privacy.pack.spec.ts:357 | frames, rendered DOM, and browser history are scanned; projector objects, recovery payloads, and export are not scanned/asserted No test.skip; missing literal artifact-surface clauses. | R6.umbrella |
| E2E-28 unauthorized access fails before fan-out | missing | e2e/gm-two-player-privacy.pack.spec.ts:545 | API and export asserted; required WS and GM-command variants lack a literal assertion Privacy header limits this test to API/export. | R6.umbrella |
| E2E-29 veto and timeout commit nothing | real | e2e/gm-two-player-proposals.pack.spec.ts:177 | Active source assertions only; fresh runtime evidence pending. | R2.authority-live |
| E2E-30 simultaneous proposals remain attributable | real | e2e/gm-two-player-proposals.pack.spec.ts:49 | Active source assertions only; fresh runtime evidence pending. | R2.authority-live |
| E2E-31 player commands owned unit | real | e2e/gm-two-player-combat.pack1.spec.ts:355 | semantic cross-anchor: source tag says E2E-32 although behavior covers owned-unit acceptance | R6.umbrella |
| E2E-32 cross-player command rejects | real | e2e/gm-two-player-combat.pack1.spec.ts:298 | semantic cross-anchor: source tag says E2E-31 although behavior asserts cross-player refusal before append | R6.umbrella |
| E2E-33 concurrent choices resolve deterministically | missing | e2e/gm-two-player-combat.pack1.spec.ts:355 | one concurrent run only; no repeated seeded determinism or digest comparison assertion | R6.umbrella |
| E2E-34 server RNG provenance is authoritative | real | e2e/gm-two-player-combat.pack1.spec.ts:424 | Active source assertions only; fresh runtime evidence pending. | R6.umbrella |
| E2E-35 player disconnect follows delivery and progression policy | missing | No complete test mapped | no active literal declaration for disconnect policy | R6.umbrella |
| E2E-36 GM pause and resume are durable | missing | No complete test mapped | no active literal declaration for pause/resume | R6.umbrella |
| E2E-37 terminal outcome publishes once | missing | No complete test mapped | no active literal declaration for terminal one-outbox outcome | R5.E6 |
| E2E-38 duplicate outcome reconciliation is idempotent | missing | No complete test mapped | no active literal declaration for duplicate outcome idempotency | R5.E7 |
| E2E-39 GM combat correction is durable and safe | missing | No complete test mapped | no active literal declaration for correction restart/redaction | R4.rewind |
| E2E-40 combat rewind creates replacement branch | strict-expected-failure | e2e/gm-two-player-rewind.pack.spec.ts:39 | assertion body exists but test declares test.fail(true) Expected failure is active; it cannot count as real. | R4.rewind |
| E2E-41 stale branch command rejects | strict-expected-failure | e2e/gm-two-player-rewind.pack.spec.ts:72 | Asserts STALE_BRANCH, no append, and resync, but unconditional test.fail until journal cutover. | R4.S2 |
| E2E-42 all contexts converge on new head | strict-expected-failure | e2e/gm-two-player-rewind.pack.spec.ts:115 | Unconditional test.fail; partial lineage reads host/guest/spectator, not rendered GM/P1/P2 convergence. | R4.rewind |
| E2E-43 fog restores after rewind | strict-expected-failure | e2e/gm-two-player-rewind.pack.spec.ts:197 | Unconditional test.fail; partial host/guest token-projection checkpoint comparison. | R4.rewind |
| E2E-44 offline player catches up after rewind | strict-expected-failure | e2e/gm-two-player-rewind.pack.spec.ts:247 | Unconditional test.fail; reload/replay and head checks do not prove no superseded-secret leakage. | R4.rewind |
| E2E-45 applied outcome uses coordinated correction | missing | No complete test mapped | No active E2E assertion for post-receipt coordinated correction, higher outcome version, and exactly-once campaign rebuild. | R6.B5 |
| E2E-46 one-day advance commits one version | missing | No complete test mapped | No campaign-day command/revision/viewer assertion. | R2.authority-live |
| E2E-47 multi-effect day cascade is atomic | missing | No complete test mapped | No multi-domain day-cascade atomicity assertion. | R2.authority-live |
| E2E-48 rewind rebuilds derived state | missing | No complete test mapped | No campaign derived-family rewind/rebuild assertion. | R6.B4 |
| E2E-49 contract correction rebuilds linked domains | missing | No complete test mapped | No linked-domain contract-correction comparison. | R6.B4 |
| E2E-50 rewind invalidates later artifacts | missing | No complete test mapped | No later-artifact invalidation plus supersession-linkage assertion. | R6.B4 |
| E2E-51 stale artifact cannot be used | missing | No complete test mapped | No invalidated scenario/force launch refusal with active branch/revision assertion. | R5.E9 |
| E2E-52 next scenario retains roles and version | missing | No complete test mapped | No reconciled next-scenario role/ownership/revision continuity assertion. | R5.E9 |
| E2E-53 customized unit stays exact | missing | No complete test mapped | No exact customized-unit checkpoint journey assertion. | R2.journey |
| E2E-54 ten scenarios survive restarts | missing | No complete test mapped | No ten-scenario periodic refresh/reconnect/restart assertion. | R6.umbrella |
| E2E-55 checkpoint replay equals full replay | missing | No complete test mapped | No full-history versus immutable-checkpoint-plus-tail equality assertion for authority and every viewer digest. | R6.B7 |
| E2E-56 outcome linkage remains once | missing | No complete test mapped | No long-campaign outcome identity/version to exactly-one active receipt assertion. | R5.E7 |
| E2E-57 audit records complete provenance | missing | No complete test mapped | No representative accepted/rejected/vetoed/corrected/rewound provenance completeness assertion. | R6.B6 |
| E2E-58 player audit excludes private fields | missing | No complete test mapped | No player audit/export privacy assertion across campaign timeline. | R6.B6 |
| E2E-59 GM audit preserves prior branches | missing | No complete test mapped | No GM effective-plus-superseded timeline lineage/receipt/causality assertion. | R6.B6 |
| E2E-60 rewind preview lists blast radius | missing | No complete test mapped | No campaign blast-radius preview assertion; combat-only preview is not this campaign requirement. | R6.B4 |
| E2E-61 malformed intent has no effect | real | e2e/gm-two-player-failure.pack.spec.ts:420 | Actively injects unknown kind and malformed payload; asserts typed frames and unchanged scoped durable counts. | R6.umbrella |
| E2E-62 replay attack cannot duplicate | missing | e2e/gm-two-player-failure.pack.spec.ts:476 | Active same-session replay asserts unchanged counts/sequences, but no reconnect occurs; reconnect behavior is unasserted. | R6.umbrella |
| E2E-63 command-batch failure is atomic | real | e2e/gm-two-player-failure.pack.spec.ts:544 | Active rows cover middle event, outbox insert, and head update; assert unchanged counts/sequences and no rendered success. | R6.umbrella |
| E2E-64 projection failure fails closed | missing | No complete test mapped | Failure-pack header says no projection-fault seam; no raw-payload/nonpublication/blocked-viewer assertion. | R6.umbrella |
| E2E-65 GM loss pauses without migration | missing | No complete test mapped | Header identifies liveness-idle gate; no GM-loss/no-player-promotion assertion. | R6.umbrella |
| E2E-66 partitioned player catches up once | missing | e2e/gm-two-player-failure.pack.spec.ts:603; e2e/gm-two-player-failure.pack.spec.ts:668 | Active partition/replay assertions prove delivery paths, but neither asserts the literal durable viewer-cursor source. | R6.umbrella |
| E2E-67 pre-rewind client cannot diverge | missing | No complete test mapped | Failure header says branch/rewind-gated; no typed upgrade/resync and old-state refusal assertion. | R4.S2 |
| E2E-68 corruption quarantines one session | missing | No complete test mapped | Header identifies absent write-capable corruption fixture; no quarantine/control-session assertion. | R6.B7 |
| E2E-69 large tail is bounded | missing | No complete test mapped | Performance supplies cold-tail partial evidence but no literal authorized-player bounded-tail row. | R6.umbrella |
| E2E-70 socket failure preserves authority | real | e2e/gm-two-player-failure.pack.spec.ts:757 | Active fault asserts durable census, healthy continuity, replay recovery, and contiguous delivery. | R6.umbrella |
| E2E-71 p95 meets controlled budget | real | e2e/gm-two-player-performance.pack.spec.ts:109 | Active controlled fixture records warm-up/measured windows and runner evaluation gates archived p95. | R6.umbrella |
| E2E-72 p99 meets long-log budget | real | e2e/gm-two-player-performance.pack.spec.ts:109 | Active long-tail build and archived runner evaluation gate p99. | R6.umbrella |
| E2E-73 cold catch-up meets budget | real | e2e/gm-two-player-performance.pack.spec.ts:109 | Active cold context targets 1,000 events and gates elapsed, chunk, queue, and memory observations. | R6.umbrella |
| E2E-74 slow-client backpressure stays bounded | missing | No complete test mapped | Queue observation exists, but no controlled Player 2 slowdown or separate healthy GM/P1 p95/p99 assertion. | R6.umbrella |
| E2E-75 lifecycle states are distinct and accessible | missing | No complete test mapped | No strict test drives all nine lifecycle states with locator, text, non-color semantics, gating, and announcement. | R6.umbrella |
| E2E-76 rewind confirmation prevents accidental invalidation | strict-expected-failure | e2e/gm-two-player-rewind.pack.spec.ts:311 | Unconditional test.fail; desktop/narrow confirmation and keyboard assertions are not active passing coverage. | R4.rewind |
| E2E-77 conflict message is actionable and safe | missing | No complete test mapped | No strict UI assertion covers all conflict classes, safe branch/revision detail, recovery action, and privacy. | R6.umbrella |
| E2E-78 evidence bundle is complete | missing | e2e/gm-two-player-fixture.smoke.spec.ts:123 | Fixture proves incomplete refusal and synthetic complete finalization, but strict packs opt into incomplete evidence; it does not prove every strict run bundle. | R6.umbrella |
| E2E-79 cleanup is ownership-scoped | real | e2e/gm-two-player-cleanup-ownership.spec.ts:305; e2e/gm-two-player-cleanup-ownership.spec.ts:403; e2e/gm-two-player-cleanup-ownership.spec.ts:408; e2e/gm-two-player-cleanup-ownership.spec.ts:413 | Active finish/abort/crash cleanup plus ambient preservation; two ambient rows skip without runId, supplied by qc runner. | R6.umbrella |
| E2E-80 major merges trigger exact-main regression | missing | No complete test mapped | Registered groups and all union do not enforce exact-main reruns before dependent PRs or archive milestone receipts. | R6.umbrella |

## 0. CAMP-00 — packaged loopback listener prerequisite

- [ ] 0.1 Add a red process-level test or bounded injected listener seam proving `HOSTNAME=127.0.0.1` currently binds the unspecified address.
- [ ] 0.2 Pass the configured hostname to the production HTTP listener and prove the actual bound address is `127.0.0.1`, not `0.0.0.0` or `::`.
- [ ] 0.3 Replace or supplement the packaged-security static environment assertion with the live listener-address gate.
- [ ] 0.4 Run targeted server/desktop security tests plus applicable gates and independent reviews; publish within 4 files/180 lines, merge with SHA guard, audit exact main, and prune before CAMP-01A.

## 1. CAMP-01A — trusted catalog/readiness boundary

- [ ] 1.1 Add one shared `canonical | custom` roster-source type on the persisted roster projection and tests proving legacy projections with an absent field normalize to `canonical`, while present unknown values remain invalid/non-launchable without name/id-prefix inference.
- [ ] 1.2 Add a runtime-only `loading | ready | unavailable` canonical-combat catalog snapshot: validated browser loading from `/api/units?includeBV=true`, Node fast-forward loading from `NodeCanonicalUnitService`, explicit retryable failure, and no silent empty-success fallback.
- [ ] 1.3 Add one shared exact-ref guard to readiness and materializer input; validation is the first materializer operation before diagnostics, scenario lookup/reuse return, catalog I/O, or mutation, while readiness preserves visible/recoverable blockers.
- [ ] 1.4 Add direct loader/readiness/materializer regressions, including a persisted `scenarioIds` reuse candidate, proving custom/invalid/forged/stale/loading/unavailable inputs cause no lookup, reuse result, routing, or mutation.
- [ ] 1.5 Run targeted/applicable gates and independent reviews; publish within 10 files/400 lines, merge with SHA guard, audit exact main, and prune before CAMP-01B.

## 2. CAMP-01B — authoritative co-op snapshot

- [ ] 2.1 Extend `CampaignSync` with revision-bound source-bearing roster records and authoritative `forceId -> unitIds`; build them from real roster/forces in `CampaignCoopEntryPanel`, preserve them through match registration and `CampaignHostRegistry`, and hydrate the guest mirror.
- [ ] 2.2 Test host/guest canonical success, custom identity, force membership, bootstrap/registration, malformed projection, and stale/mismatched snapshot rejection; run gates/reviews and publish within 14 files/480 lines, merge, audit, and prune before CAMP-01C.

## 3. CAMP-01C — participation authorization

- [ ] 3.1 Replace protocol/local-runtime participation with `{ missionId, forceId, choice }`; derive match/player/role in the binder from verified connection/registry state and reject full `IForce`, client-authored identity, foreign/missing force, and stale revision.
- [ ] 3.2 Test forged player/role, full-force payload, foreign/missing force, stale/mismatched snapshot, and canonical authorized choice; run gates/reviews and publish within 12 files/450 lines, merge, audit, and prune before CAMP-01D.

## 4. CAMP-01D — all launch-path enforcement

- [ ] 4.1 Inject the trusted snapshot into mission launch, dashboard, Mech Bay readiness, fast-forward, and every materializer caller with explicit loading/unavailable recovery.
- [ ] 4.2 Make co-op launch resolve force membership and unit sources through the accepted host snapshot before applying the guard inside `launchCoopMission`.
- [ ] 4.3 Prove blocked inputs make zero lookup/create/launch calls while canonical paths work; run gates/reviews and publish within 12 files/450 lines, merge, audit, and prune before CAMP-01E.

## 5. CAMP-01E — saved-design picker and roster identity

- [ ] 5.1 Runtime-validate saved BattleMech index entries and test exact id/source/display/tonnage mapping plus honest invalid-record exclusion.
- [ ] 5.2 Render named Stock Templates and Saved Designs groups with loading, empty, failure/retry, keyboard, feedback, desktop, and 390×844 behavior.
- [ ] 5.3 Propagate stable source plus fresh roster-instance identity into the root force without stock substitution or construction payload; cover duplicates, run gates/reviews, and publish within 10 files/450 lines, merge, audit, and prune before CAMP-01F.

## 6. CAMP-01F — durable creation commit

- [ ] 6.1 Require accepted production wizard persistence with honest error/conflict and same-id retry; test accepted identity, suppression, retry, and no `409` overwrite, then run gates/reviews and publish within 8 files/400 lines, merge, audit, and prune before CAMP-01G.

## 7. CAMP-01G — downstream Mech Bay resolution

- [ ] 7.1 Resolve by `unitSource` plus `unitRef` without borrowing stock metadata or hiding unresolved/deleted custom rows; cover name/tonnage, absent BV, reload, and unavailable metadata, then run gates/reviews and publish within 7 files/350 lines, merge, audit, and prune before CAMP-01H.

## 8. CAMP-01H — authority journey and audit receipt

- [ ] 8.1 Add the third production-submit handoff; cold reload dashboard, Forces, Mech Bay, and readiness; capture inspected desktop/390×844 evidence plus synthetic authority receipts; run required QC/reviews and publish within 5 files/300 lines, merge, audit, and prune.

## 9. Change completion

- [ ] 9.1 Reconcile all nine exact-main receipts, confirm no CAMP-01 Critical/Major remains silently pending, record tenant authentication/ownership as the remote/shared-deployment blocker, and archive only after the full authority journey is clean.

## 0. CAMP-00 — packaged loopback listener prerequisite

- [ ] 0.1 Add a red process-level test or bounded injected listener seam proving `HOSTNAME=127.0.0.1` currently binds the unspecified address.
- [ ] 0.2 Pass the configured hostname to the production HTTP listener and prove the actual bound address is `127.0.0.1`, not `0.0.0.0` or `::`.
- [ ] 0.3 Replace or supplement the packaged-security static environment assertion with the live listener-address gate.
- [ ] 0.4 Run targeted server/desktop security tests plus applicable gates and independent reviews; publish within 4 files/180 lines, merge with SHA guard, audit exact main, and prune before CAMP-01A.

## 1. CAMP-01A — trusted catalog/readiness boundary

- [ ] 1.1 Add one shared `canonical | custom` roster-source type on the persisted roster projection and tests proving legacy projections with an absent field normalize to `canonical`, while present unknown values remain invalid/non-launchable without name/id-prefix inference.
- [ ] 1.2 Add a runtime-only `loading | ready | unavailable` canonical-combat catalog snapshot: validated browser loading from `/api/units?includeBV=true`, Node fast-forward loading from `NodeCanonicalUnitService`, explicit retryable failure, and no silent empty-success fallback.
- [ ] 1.3 Add one shared exact-ref guard to readiness and materializer input with no catalog I/O inside materializer, preserving visible blockers, deselection recovery, and canonical-only mixed-roster selection.
- [ ] 1.4 Add direct loader/readiness/materializer regressions for honest loading/unavailable state and zero side effects for selected custom, invalid, forged, or unresolved refs.
- [ ] 1.5 Run targeted/applicable gates and independent reviews; publish within 10 files/400 lines, merge with SHA guard, audit exact main, and prune before CAMP-01B.

## 2. CAMP-01B — all launch-path enforcement

- [ ] 2.1 Inject the trusted snapshot into mission launch, dashboard, Mech Bay readiness, fast-forward, and every materializer caller with explicit loading/unavailable recovery.
- [ ] 2.2 Make co-op launch map every contributed force `unitId` to the campaign roster projection and apply the shared guard inside `launchCoopMission` before composition or campaign encounter launch; block missing mappings.
- [ ] 2.3 Add caller/co-op regressions proving custom, invalid, unresolved, loading, and unavailable cases make zero `createEncounter`/`launchEncounter` calls while canonical launch still works.
- [ ] 2.4 Run targeted/applicable gates and independent reviews; publish within 12 files/450 lines, merge with SHA guard, audit exact main, and prune before CAMP-01C.

## 3. CAMP-01C — saved-design picker and roster identity

- [ ] 3.1 Runtime-validate saved BattleMech index entries and test exact id/source/display/tonnage mapping plus honest exclusion of invalid records.
- [ ] 3.2 Render named Stock Templates and Saved Designs groups with loading, empty, failure/retry, keyboard, feedback, desktop, and 390×844 behavior.
- [ ] 3.3 Propagate `unitRef`/`unitSource`, mint a fresh roster-instance id per add, add that instance to the root force without stock substitution, and copy no construction payload.
- [ ] 3.4 Test duplicate instances sharing one custom ref plus draft/root-force identity; run gates/reviews and publish within 10 files/450 lines, merge, exact-main audit, and prune before CAMP-01D.

## 4. CAMP-01D — durable creation commit

- [ ] 4.1 Require production wizard submit to await the accepted server record; suppress success/navigation on error/conflict, retry the same id, and never auto-overwrite a `409`.
- [ ] 4.2 Test accepted identity, failure suppression, same-id retry, and unchanged intervening conflict state; run gates/reviews and publish within 8 files/400 lines, merge, audit, and prune before CAMP-01E.

## 5. CAMP-01E — downstream Mech Bay resolution

- [ ] 5.1 Resolve by `unitSource` plus `unitRef` without borrowing stock metadata or hiding unresolved/deleted custom rows; cover name/tonnage, absent BV, reload, and unavailable metadata.
- [ ] 5.2 Run targeted/applicable gates and independent reviews; publish within 7 files/350 lines, merge, audit exact main, and prune before CAMP-01F.

## 6. CAMP-01F — authority journey and audit receipt

- [ ] 6.1 Add the third production-submit handoff scenario; cold reload dashboard, Forces, Mech Bay, and readiness and reconcile exact roster/source identities with zero blocked-path mutations.
- [ ] 6.2 Capture inspected desktop/390×844 screenshots paired with synthetic allowlisted route/API/store/persisted/reload receipts and no sensitive/raw payloads.
- [ ] 6.3 Run focused and required QC/gates plus independent exact-SHA reviews; publish within 5 files/300 lines, merge, audit exact main, and prune.

## 7. Change completion

- [ ] 7.1 Reconcile all seven exact-main receipts, confirm no CAMP-01 Critical/Major remains silently pending, and archive only after the full authority journey is clean.
- [ ] 7.2 Record tenant authentication/ownership as the explicit remote/shared-deployment blocker; do not present local-first proof as tenant isolation.

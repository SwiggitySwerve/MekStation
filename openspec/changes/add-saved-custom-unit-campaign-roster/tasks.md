## 0. CAMP-00 — packaged loopback listener prerequisite

- [ ] 0.1 Add a red process-level test or bounded injected listener seam proving `HOSTNAME=127.0.0.1` currently binds the unspecified address.
- [ ] 0.2 Pass the configured hostname to the production HTTP listener and prove the actual bound address is `127.0.0.1`, not `0.0.0.0` or `::`.
- [ ] 0.3 Replace or supplement the packaged-security static environment assertion with the live listener-address gate.
- [ ] 0.4 Run `npm run validate:multiplayer:packaged-socket`; write `.sisyphus/evidence/playtest/camp00-loopback-<sha>/listener-receipt.json` with bound/expected address and unspecified rejection; review, publish within 4 files/180 lines, merge with SHA guard, audit exact main, and prune before CAMP-01A.

## 1. CAMP-01A — trusted catalog/readiness boundary

- [ ] 1.1 Add `canonical | custom` plus a raw `unknown` persistence parser returning valid/legacy/invalid resolution; prove only absent normalizes to canonical, while present unknown remains invalid/non-launchable and is never auto-rewritten or inferred.
- [ ] 1.2 Add a runtime-only `loading | ready | unavailable` canonical-combat catalog snapshot: validated browser loading from `/api/units?includeBV=true`, Node fast-forward loading from `NodeCanonicalUnitService`, explicit retryable failure, and no silent empty-success fallback.
- [ ] 1.3 Add one shared exact-ref guard to readiness and materializer input; validation is the first materializer operation before diagnostics, scenario lookup/reuse return, catalog I/O, or mutation, while readiness preserves visible/recoverable blockers.
- [ ] 1.4 Add direct loader/readiness/materializer regressions, including a persisted `scenarioIds` reuse candidate, proving custom/invalid/forged/stale/loading/unavailable inputs cause no lookup, reuse result, routing, or mutation.
- [ ] 1.5 Run `npm.cmd test -- --runTestsByPath` over `src/types/campaign/__tests__/RosterUnitSource.test.ts`, `src/lib/campaign/readiness/__tests__/missionReadinessProjection.test.ts`, and `src/lib/campaign/encounter/__tests__/materializeCampaignMissionEncounter.test.ts`; write `.sisyphus/evidence/playtest/camp01a-catalog-<sha>/authority-receipt.json` with source/ref/blocker and lookup/reuse/create/mutate fields; review, publish within 10 files/400 lines, merge, audit, and prune before CAMP-01B.

## 2. CAMP-01B — authoritative co-op snapshot

- [ ] 2.1 Extend `CampaignSync` with revision-bound source-bearing roster records and authoritative `forceId -> unitIds`; build them from real roster/forces in `CampaignCoopEntryPanel`, preserve them through match registration and `CampaignHostRegistry`, and hydrate the guest mirror.
- [ ] 2.2 Test host/guest canonical success, source/membership, bootstrap/registration, malformed projection, and stale/mismatched rejection through `verify:qc:coop-campaign-journey`; write `.sisyphus/evidence/playtest/camp01b-snapshot-<sha>/authority-receipt.json` with campaign/match/revision/membership/source/hydration fields, review, publish within 14 files/480 lines, merge, audit, and prune before CAMP-01C.

## 3. CAMP-01C — participation authorization

- [ ] 3.1 Replace protocol/local-runtime participation with `{ missionId, forceId, choice }`; derive match/player/role in the binder from verified connection/registry state and reject full `IForce`, client-authored identity, foreign/missing force, and stale revision.
- [ ] 3.2 Test forged identity/role, full force, foreign/missing force, stale snapshot, and authorized choice through `src/types/multiplayer/__tests__/Protocol.test.ts`, `src/lib/multiplayer/server/__tests__/bindCampaignSyncConnection.test.ts`, `src/lib/campaign/coop/__tests__/coopRuntimeSession.test.ts`, and `verify:qc:coop-campaign-journey`; write `.sisyphus/evidence/playtest/camp01c-participation-<sha>/authority-receipt.json` with derived-identity and rejection booleans, review, publish within 12 files/450 lines, merge, audit, and prune before CAMP-01D.

## 4. CAMP-01D — all launch-path enforcement

- [ ] 4.1 Inject the trusted snapshot into mission launch, dashboard, Mech Bay readiness, fast-forward, and every materializer caller with explicit loading/unavailable recovery.
- [ ] 4.2 Make co-op launch resolve force membership and unit sources through the accepted host snapshot before applying the guard inside `launchCoopMission`.
- [ ] 4.3 Run `qc:command:readiness-stable:quick`, `verify:qc:coop-campaign-journey`, `src/lib/campaign/fastForward/__tests__/fastForwardCombatRunner.test.ts`, and `src/components/gameplay/pages/campaigns/dashboard/__tests__/CampaignDashboardPage.reactivity.test.tsx`; write `.sisyphus/evidence/playtest/camp01d-launch-<sha>/authority-receipt.json` with catalog/canonical result and blocked lookup/reuse/create/launch counts, review, publish within 12 files/450 lines, merge, audit, and prune before CAMP-01E.

## 5. CAMP-01E — saved-design picker and roster identity

- [ ] 5.1 Runtime-validate saved BattleMech index entries and test exact id/source/display/tonnage mapping plus honest invalid-record exclusion.
- [ ] 5.2 Render named Stock Templates and Saved Designs groups with loading, empty, failure/retry, keyboard, feedback, desktop, and 390×844 behavior.
- [ ] 5.3 Propagate stable source/fresh instance without substitution or construction payload; run `npm.cmd test -- --watchAll=false --runTestsByPath` over planned `src/components/gameplay/pages/campaigns/create/__tests__/savedCustomUnitCampaignAdapter.test.ts` plus existing `src/components/gameplay/pages/campaigns/create/__tests__/CreateCampaignPage.RosterStep.test.tsx` and `src/components/gameplay/pages/campaigns/create/__tests__/CreateCampaignPage.rosterPersistence.test.ts`; write `.sisyphus/evidence/playtest/camp01e-picker-<sha>/authority-receipt.json` with id/ref/source/root-force/a11y/390px booleans, review, publish within 10 files/450 lines, merge, audit exact main, and prune before CAMP-01F.

## 6. CAMP-01F — durable creation commit

- [ ] 6.1 Require accepted production wizard persistence with honest error/conflict and same-id retry; run `npm.cmd test -- --watchAll=false --runTestsByPath` over planned `src/components/gameplay/pages/campaigns/create/__tests__/CreateCampaignPage.submitPersistence.test.tsx` and existing `src/stores/campaign/__tests__/useCampaignPersistenceStore.test.ts`; write `.sisyphus/evidence/playtest/camp01f-persistence-<sha>/authority-receipt.json` with method/status/identity/suppression/retry/no-overwrite fields, review, publish within 8 files/400 lines, merge, audit exact main, and prune before CAMP-01G.

## 7. CAMP-01G — downstream Mech Bay resolution

- [ ] 7.1 Resolve by source/ref without stock borrowing or hidden unresolved rows; run `qc:command:readiness-stable:quick` and `src/components/campaign/bays/__tests__/MechBay.test.tsx`; write `.sisyphus/evidence/playtest/camp01g-mech-bay-<sha>/authority-receipt.json` with reload/identity/name/tonnage/BV/unresolved-source fields, review, publish within 7 files/350 lines, merge, audit, and prune before CAMP-01H.

## 8. CAMP-01H — authority journey and audit receipt

- [ ] 8.1 Add the third production-submit scenario to `e2e/campaign-customizer-handoff.spec.ts`; cold reload dashboard, Forces, Mech Bay, and readiness; run `qc:command:browser:quick`, `qc:campaign-long:browser`, and `verify:qc:viewport-sweep`; write `.sisyphus/evidence/playtest/camp01h-journey-<sha>/authority-receipt.json` with route/API/store/persistence/reload equality and desktop/390px artifact names, review, publish within 5 files/300 lines, merge, audit, and prune.

## 9. Change completion

- [ ] 9.1 Reconcile all nine exact-main receipts, confirm no CAMP-01 Critical/Major remains silently pending, record tenant authentication/ownership as the remote/shared-deployment blocker, and archive only after the full authority journey is clean.

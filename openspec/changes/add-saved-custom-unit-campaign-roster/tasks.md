## 0. CAMP-00 — packaged loopback listener prerequisite

- [ ] 0.1 Add a red process-level test or bounded injected listener seam proving `HOSTNAME=127.0.0.1` currently binds the unspecified address.
- [ ] 0.2 Pass the configured hostname to the production HTTP listener and prove the actual bound address is `127.0.0.1`, not `0.0.0.0` or `::`.
- [ ] 0.3 Replace or supplement the packaged-security static environment assertion with the live listener-address gate.
- [ ] 0.4 Run targeted server/desktop security tests plus applicable typecheck/lint/format/build/OpenSpec/QC and independent security/review lanes; publish one focused PR within 15 files/500 lines, wait for green checks, merge with SHA guard, audit exact main, and prune before CAMP-01A.

## 1. CAMP-01A — custom-source combat boundary

- [ ] 1.1 Add one shared `canonical | custom` roster-source type on the persisted roster projection and tests proving legacy projections with an absent field normalize to `canonical`, while present unknown values remain invalid/non-launchable without name/id-prefix inference.
- [ ] 1.2 Add a runtime-only `loading | ready | unavailable` canonical-combat catalog snapshot: validated browser loading from `/api/units?includeBV=true`, Node fast-forward loading from `NodeCanonicalUnitService`, explicit retryable failure, and no silent empty-success fallback.
- [ ] 1.3 Add one shared guard that requires `unitSource === canonical` plus exact ref membership in a ready snapshot; inject it into mission launch, dashboard, Mech Bay readiness, fast-forward, and materializer input with no catalog I/O inside materializer, while preserving recoverable canonical-only mixed-roster selection.
- [ ] 1.4 Add direct loader/readiness/materializer regressions proving loading/unavailable state is honest, selected custom/invalid/forged/unresolved refs are rejected before side-effecting fetches, and blocked paths cause zero encounter, force, or game-session mutations.
- [ ] 1.5 Run targeted tests plus applicable typecheck/lint/format/build/OpenSpec/QC and visual/review lanes; publish one focused PR within 15 files/500 lines, wait for green checks, merge with SHA guard, audit exact main, and prune before CAMP-01B.

## 2. CAMP-01B — durable saved-design roster entry

- [ ] 2.1 Add focused runtime-adapter tests proving a valid custom BattleMech API entry maps to its exact id, `custom` source kind, display name, and tonnage while empty identity, non-BattleMech, non-finite-tonnage, and non-positive-tonnage records are excluded and reported honestly.
- [ ] 2.2 Implement the saved-unit query/adapter and render named Stock Templates and Saved Designs groups while preserving the four representative stock controls.
- [ ] 2.3 Add explicit saved-design loading, empty, failure, retry, keyboard, programmatic-name, add/remove feedback, desktop, and 390×844 behavior without blocking stock selection.
- [ ] 2.4 Propagate `unitRef` and `unitSource` through draft/roster projection, mint a distinct roster-instance `unitId` per add, add that instance to the root force without template substitution, and copy no construction payload.
- [ ] 2.5 Make production wizard submit await an accepted server record with the same campaign/roster identities; suppress success/navigation on error or conflict, retry persistence for the same campaign id without duplicate creation, and never auto-overwrite a `409` server record with a full local snapshot.
- [ ] 2.6 Add focused draft/root-force/submit/persistence tests for two instances sharing one custom ref, accepted server state, failed-navigation suppression, same-id retry, and unchanged intervening server state after conflict without test-only persistence injection.
- [ ] 2.7 Run targeted tests plus applicable typecheck/lint/format/build/OpenSpec/QC and visual/review lanes; publish one focused PR within 15 files/500 lines, wait for green checks, merge with SHA guard, audit exact main, and prune before CAMP-01C.

## 3. CAMP-01C — downstream resolution and authority journey

- [ ] 3.1 Resolve Mech Bay metadata by `unitSource` plus `unitRef` without borrowing stock metadata or hiding unresolved/deleted custom rows.
- [ ] 3.2 Add focused Mech Bay tests for custom name/tonnage resolution, absent BV, server-reload input, and deleted/unavailable custom metadata.
- [ ] 3.3 Add a third scenario to `e2e/campaign-customizer-handoff.spec.ts` that saves a customized canonical BattleMech, captures its custom-unit API id, selects it in campaign creation, and observes the production wizard's accepted server PUT without a test-only save helper.
- [ ] 3.4 Cold reload dashboard, Forces, Mech Bay, and mission readiness from the server record; reconcile the same roster-instance id, custom `unitRef`, and `unitSource`, then prove the custom row is named/non-launchable while canonical rows remain usable and no force/encounter/session mutation occurs for it.
- [ ] 3.5 Capture inspected desktop and 390×844 screenshots paired with synthetic, allowlisted route/API/store/persisted/reload equality receipts; attach no raw construction, finance/narrative, private store, credential, or real-user data.
- [ ] 3.6 Run focused tests, all three campaign-customizer handoff scenarios, applicable deep UX/quick command-browser/long-campaign/viewport gates, TypeScript, lint, format, build, and strict OpenSpec/QC under Node 22; separate baseline failures from introduced regressions.
- [ ] 3.7 Run independent code, security/authority, goal, history, browser QA, and visual review against the exact commit; publish one focused PR within 15 files/500 lines, wait for terminal green checks, merge with SHA guard, audit exact main, and prune.

## 4. Change completion

- [ ] 4.1 Reconcile all four merged exact-main receipts in the gameplay audit, confirm no CAMP-01 Critical/Major remains silently pending, and archive this OpenSpec change only after the full authority journey is clean.
- [ ] 4.2 Record tenant authentication/ownership as an explicit remote/shared-deployment blocker governed by the future `api-layer` authentication capability; do not present CAMP-01's local-first server proof as tenant isolation.

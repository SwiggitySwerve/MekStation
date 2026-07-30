## 1. CAMP-01A — custom-source combat boundary

- [ ] 1.1 Add one shared `canonical | custom` roster-source type on the persisted roster projection and tests proving legacy projections without the field normalize to `canonical` without name/id-prefix inference.
- [ ] 1.2 Add one shared combat-adaptability predicate over `unitSource` and use it in readiness and materializer preflight.
- [ ] 1.3 Make readiness keep custom rows visible with a named blocker, exclude them from default selection, allow stale selected custom rows to be deselected, and preserve a usable canonical-only mixed-roster selection.
- [ ] 1.4 Add direct readiness/materializer regressions proving a selected custom source is rejected before the first fetch and causes zero encounter, force, or game-session mutations.
- [ ] 1.5 Run targeted tests plus applicable typecheck/lint/format/build/OpenSpec/QC and visual/review lanes; publish one focused PR within 15 files/500 lines, wait for green checks, merge with SHA guard, audit exact main, and prune before CAMP-01B.

## 2. CAMP-01B — durable saved-design roster entry

- [ ] 2.1 Add focused adapter tests proving a custom BattleMech API entry maps to its exact id, `custom` source kind, display name, and tonnage while non-BattleMech records are excluded.
- [ ] 2.2 Implement the saved-unit query/adapter and render named Stock Templates and Saved Designs groups while preserving the four representative stock controls.
- [ ] 2.3 Add explicit saved-design loading, empty, failure, retry, keyboard, programmatic-name, add/remove feedback, desktop, and 390×844 behavior without blocking stock selection.
- [ ] 2.4 Propagate `unitRef` and `unitSource` through draft/roster projection, mint a distinct roster-instance `unitId` per add, add that instance to the root force without template substitution, and copy no construction payload.
- [ ] 2.5 Make production wizard submit await an accepted server record with the same campaign/roster identities; suppress success/navigation on error or conflict and retry persistence for the same campaign id without duplicate creation.
- [ ] 2.6 Add focused draft/root-force/submit/persistence tests for two instances sharing one custom ref, accepted server state, failed-navigation suppression, and same-id retry without test-only persistence injection.
- [ ] 2.7 Run targeted tests plus applicable typecheck/lint/format/build/OpenSpec/QC and visual/review lanes; publish one focused PR within 15 files/500 lines, wait for green checks, merge with SHA guard, audit exact main, and prune before CAMP-01C.

## 3. CAMP-01C — downstream resolution and authority journey

- [ ] 3.1 Resolve Mech Bay metadata by `unitSource` plus `unitRef` without borrowing stock metadata or hiding unresolved/deleted custom rows.
- [ ] 3.2 Add focused Mech Bay tests for custom name/tonnage resolution, absent BV, server-reload input, and deleted/unavailable custom metadata.
- [ ] 3.3 Add a third scenario to `e2e/campaign-customizer-handoff.spec.ts` that saves a customized canonical BattleMech, captures its custom-unit API id, selects it in campaign creation, and observes the production wizard's accepted server PUT without a test-only save helper.
- [ ] 3.4 Cold reload dashboard, Forces, Mech Bay, and mission readiness from the server record; reconcile the same roster-instance id, custom `unitRef`, and `unitSource`, then prove the custom row is named/non-launchable while canonical rows remain usable and no force/encounter/session mutation occurs for it.
- [ ] 3.5 Capture inspected desktop and 390×844 screenshots paired with route, API, store, persisted campaign/force, and reload assertions.
- [ ] 3.6 Run focused tests, all three campaign-customizer handoff scenarios, applicable deep UX/quick command-browser/long-campaign/viewport gates, TypeScript, lint, format, build, and strict OpenSpec/QC under Node 22; separate baseline failures from introduced regressions.
- [ ] 3.7 Run independent code, security/authority, goal, history, browser QA, and visual review against the exact commit; publish one focused PR within 15 files/500 lines, wait for terminal green checks, merge with SHA guard, audit exact main, and prune.

## 4. Change completion

- [ ] 4.1 Reconcile all three merged exact-main receipts in the gameplay audit, confirm no CAMP-01 Critical/Major remains silently pending, and archive this OpenSpec change only after the full authority journey is clean.

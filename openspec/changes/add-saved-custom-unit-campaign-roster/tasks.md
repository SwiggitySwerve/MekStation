## 1. Lock the identity contract

- [ ] 1.1 Add focused adapter tests proving a custom BattleMech API entry maps to its exact id, `custom` source kind, display name, and tonnage while non-BattleMech records are excluded.
- [ ] 1.2 Add one shared `canonical | custom` roster-source type, persist it on draft/roster projections, and normalize legacy projections without the field to `canonical` without name/id-prefix inference.
- [ ] 1.3 Add campaign draft/submit regression coverage proving each add mints a distinct roster-instance `unitId`, preserves the custom id as `unitRef`, preserves `custom` as `unitSource`, and copies no construction payload.
- [ ] 1.4 Add root-force regression coverage proving custom and stock roster instances are admitted by instance id without stock-template substitution.

## 2. Present saved designs in the roster step

- [ ] 2.1 Implement the focused saved-unit query/adapter seam over the existing custom-unit API.
- [ ] 2.2 Render named Stock Templates and Saved Designs groups while preserving the four representative template controls.
- [ ] 2.3 Add explicit saved-design loading, empty, failure, and retry states without blocking stock selection.
- [ ] 2.4 Ensure saved-design add/remove controls are programmatically named, keyboard operable, and stable at desktop and 390×844.

## 3. Preserve campaign and Mech Bay identity

- [ ] 3.1 Carry custom `unitRef` and `unitSource` through wizard state, roster projection, campaign save/reload, and root-force membership.
- [ ] 3.2 Merge canonical and custom metadata for Mech Bay resolution without borrowing stock metadata or hiding unresolved roster rows.
- [ ] 3.3 Add focused Mech Bay tests for custom name/tonnage resolution, absent BV, reload input, and deleted/unavailable custom metadata.

## 4. Enforce the canonical combat boundary

- [ ] 4.1 Add one shared combat-adaptability predicate over `unitSource` and use it in readiness and materializer preflight.
- [ ] 4.2 Add readiness tests proving custom rows remain visible with a named blocker, default selection excludes them, stale selected custom rows can be deselected, and canonical-only mixed-roster selection can become launch-ready.
- [ ] 4.3 Add direct materializer tests proving a selected custom source is rejected before the first fetch and causes zero encounter, force, or game-session mutations.

## 5. Commit campaign creation to the server

- [ ] 5.1 Make the production wizard submit path await the existing campaign persistence store and report success/navigate only after a `saved` result containing the submitted campaign and roster identities.
- [ ] 5.2 Keep server error/conflict recovery on the creation surface and retry persistence for the same pending campaign id without duplicating campaign creation.
- [ ] 5.3 Add submit/persistence tests that exercise the production path, accepted server record, failed navigation suppression, and same-id retry without test-only persistence injection.

## 6. Authority-backed browser proof

- [ ] 6.1 Add a third scenario to `e2e/campaign-customizer-handoff.spec.ts` that saves a customized canonical BattleMech and captures its custom-unit API id.
- [ ] 6.2 Select that exact saved design during campaign creation, submit through the production path, and assert the real accepted server record plus browser roster/root-force state use the same instance id, custom ref, and source kind.
- [ ] 6.3 Cold reload dashboard, Forces, Mech Bay, and mission readiness from the server record; reconcile the same roster-instance id, custom `unitRef`, and `unitSource` after each navigation/reload.
- [ ] 6.4 Prove mission readiness names the custom unit and canonical-combat-unavailable reason, keeps it unselected, leaves canonical units usable, and issues no force/encounter request or session mutation for it.
- [ ] 6.5 Capture inspected desktop and 390×844 screenshots paired with route/API/store/persistence proof.

## 7. Verification and handoff

- [ ] 7.1 Run focused unit/component tests, all three campaign customizer handoff scenarios, TypeScript, lint, format, build, and strict OpenSpec/QC validation under Node 22.
- [ ] 7.2 Run applicable deep UX, quick command-browser, long-campaign, and viewport gates; record baseline failures separately from introduced regressions.
- [ ] 7.3 Run independent code, security/authority, goal, history, browser QA, and visual review against the exact commit; resolve every in-scope finding.
- [ ] 7.4 Publish one focused PR within 500 changed lines and 15 files, wait for terminal GitHub checks, merge with SHA guard, audit exact main, and prune before the next product wave.

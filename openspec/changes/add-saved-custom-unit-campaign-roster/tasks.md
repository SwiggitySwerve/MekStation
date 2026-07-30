## 1. Lock the identity contract

- [ ] 1.1 Add focused adapter tests proving a custom BattleMech API entry maps to its exact id, display name, and tonnage while non-BattleMech records are excluded.
- [ ] 1.2 Add campaign draft/submit regression coverage proving each add mints a distinct roster-instance `unitId`, preserves the custom id as `unitRef`, and copies no construction payload.
- [ ] 1.3 Add root-force regression coverage proving custom and stock roster instances are admitted by instance id without stock-template substitution.

## 2. Present saved designs in the roster step

- [ ] 2.1 Implement the focused saved-unit query/adapter seam over the existing custom-unit API.
- [ ] 2.2 Render named Stock Templates and Saved Designs groups while preserving the four representative template controls.
- [ ] 2.3 Add explicit saved-design loading, empty, failure, and retry states without blocking stock selection.
- [ ] 2.4 Ensure saved-design add/remove controls are programmatically named, keyboard operable, and stable at desktop and 390×844.

## 3. Preserve campaign and Mech Bay identity

- [ ] 3.1 Carry custom `unitRef` through wizard state, roster projection, campaign save/reload, and root-force membership.
- [ ] 3.2 Merge canonical and custom metadata for Mech Bay resolution without borrowing stock metadata or hiding unresolved roster rows.
- [ ] 3.3 Add focused Mech Bay tests for custom name/tonnage resolution, absent BV, reload input, and deleted/unavailable custom metadata.

## 4. Authority-backed browser proof

- [ ] 4.1 Extend `e2e/campaign-customizer-handoff.spec.ts` with one scenario that saves a customized canonical BattleMech and captures its custom-unit API id.
- [ ] 4.2 Select that exact saved design during campaign creation, submit, and assert browser roster/root-force state plus server-backed campaign/force data use the same custom id.
- [ ] 4.3 Cold reload dashboard, Forces, Mech Bay, and mission readiness; reconcile the same roster-instance id and custom `unitRef` after each navigation/reload.
- [ ] 4.4 Capture inspected desktop and 390×844 screenshots paired with route/API/store/persistence proof.

## 5. Verification and handoff

- [ ] 5.1 Run focused unit/component tests, the two campaign customizer handoff scenarios, TypeScript, lint, format, build, and strict OpenSpec/QC validation under Node 22.
- [ ] 5.2 Run applicable deep UX, quick command-browser, long-campaign, and viewport gates; record baseline failures separately from introduced regressions.
- [ ] 5.3 Run independent code, security/authority, goal, history, browser QA, and visual review against the exact commit; resolve every in-scope finding.
- [ ] 5.4 Publish one focused PR within 500 changed lines and 15 files, wait for terminal GitHub checks, merge with SHA guard, audit exact main, and prune before the next product wave.

## 1. Lock the Route and Authority Contract

- [ ] 1.1 Add focused route-identity and side-parser tests for concrete encounter ids, preserved campaign/mission linkage, `player`, `opponent`, missing side, and unsupported side values before adding the page.
- [ ] 1.2 Extend the encounter-store contract tests to prove `setPlayerForce` and `setOpponentForce` call only their side-specific APIs, reload encounter state after success, preserve failure state for retry, and do not report false success.

## 2. Implement the Focused Selection Route

- [ ] 2.1 Add `src/pages/gameplay/encounters/[id]/select-force.tsx` using `encounterRouteIdentityFromRouter`, strict `EncounterForceSide` parsing, existing force/encounter selectors, side-specific assignment actions, post-write validation, and linkage-preserving return navigation.
- [ ] 2.2 Add a focused `EncounterForceSelectionPage` presentation module that renders distinct loading, populated, empty, invalid-side, missing-encounter, load-error, assignment-pending, and assignment-error states without adding a parallel force or encounter model.
- [ ] 2.3 Render each existing force with its name, status, assigned unit count, total Battle Value, and readiness plus one native semantic assignment control; keep controls at least 44 CSS pixels high, visibly focused, disabled during save, and free of horizontal page overflow at narrow and desktop widths.
- [ ] 2.4 Preserve the existing encounter-detail selectors and links, add stable selection-route selectors for the heading, state messages, candidate list, side-specific assignment controls, and return/create recovery links, and make status feedback perceivable without color alone.

## 3. Prove Behavior at Component and Browser Boundaries

- [ ] 3.1 Add React Testing Library coverage for both side labels, semantic candidate controls, current-slot context, all explicit recovery states, duplicate-submit prevention, keyboard operation, and accessibility assertions.
- [ ] 3.2 Add one focused Playwright journey that follows the real player and opponent links, selects existing forces, inspects the side-specific requests and responses, checks the raw encounter API ids and rehydrated detail UI, proves the non-target slot is preserved, and repeats the proof after cold reload.
- [ ] 3.3 Extend the browser journey with the no-force and invalid-side cases, proving the create/return controls remain available and no encounter assignment request or persisted slot mutation occurs.
- [ ] 3.4 Register the focused journey in the applicable route/QC manifests without broadening unrelated journey coverage, and store screenshots only alongside route/API/store/reload evidence.

## 4. Verify and Hand Off the Single-Seam PR

- [ ] 4.1 Run the focused route, store, component, and Playwright tests under Node 22, then run TypeScript, oxlint, formatting, strict OpenSpec/QC validation, the production build, and the risk-appropriate viewport sweep.
- [ ] 4.2 Perform an independent visual/accessibility review at desktop and narrow viewports, re-run the clean encounter-detail-to-selection-to-reload journey, and record exact evidence paths plus any residual limitation.
- [ ] 4.3 Commit only the encounter force-selection seam, push one `codex/` branch, open one focused review-ready PR, wait for `gh pr checks` to reach a terminal result, and record the PR/head/check handoff before starting another product behavior.

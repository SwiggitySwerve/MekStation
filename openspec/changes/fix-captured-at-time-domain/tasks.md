## Implementation

- [x] Record the failing integration test first, through the real `deriveCombatOutcome` with no `capturedAt` override (36 of 42 failed on `main`; the two "ahead" rows and the controls passed).
- [x] Stamp `appliedOn` in `applyPostBattle`; count retention in calendar days from it; stop reading `capturedAt` in campaign code.
- [x] Stamp legacy entries at both deserializers and in the morale pass, with committed pre-change fixtures.
- [x] Show the field is accepted by the server PUT, the co-op genesis projection, storage and the local deserializers, and by a reader built before this change.
- [x] Add the guard that lists the only files allowed to name `capturedAt`.
- [x] Kill the mutants. (12 of 12 killed: read `capturedAt` again, stamp from the wall clock, retention boundary strict / 30 / 32 days, prune removed, shim missing in each deserializer, shim drops legacy entries, re-stamps an existing `appliedOn`, apply path does not stamp, morale pass does not stamp. Two survivors on the first run were test gaps and are fixed.)
- [x] Run whole-directory gates, both TypeScript configs, lint, unit lint and suite, oxfmt and the budget check. (Lint 62 warnings, ceiling 63; budget 57 unkeyable, unchanged; types/stores/lib campaign, API and integration green. **Not green: 5 tests in `mintFastForwardPack.test.ts`, see the STOP below.**)
- [ ] **STOP, awaiting Root: the pack minter.** Applied outcomes are now retained, and `canonicalizePackPayload` has no remap for `recentlyAppliedOutcomes[].report.log[].payload.config.campaignId` (`PackIdResidueError`). The all-pack recapture check passes on the base and FAILS for both fast-forward packs with this change. Every moved value is attributed (see the PR body). No pack, digest or committed fixture is changed by this change, and none is regenerated; the fix is a minter decision.
- [ ] Re-run the fast-forward, live-parity, golden and scenario-pack suites after the minter decision.

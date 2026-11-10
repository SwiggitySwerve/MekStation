## Implementation

- [x] Record the failing integration test first, through the real `deriveCombatOutcome` with no `capturedAt` override (36 of 42 failed on `main`; the two "ahead" rows and the controls passed).
- [x] Stamp `appliedOn` in `applyPostBattle`; count retention in calendar days from it; stop reading `capturedAt` in campaign code.
- [x] Stamp legacy entries at both deserializers and in the morale pass, with committed pre-change fixtures.
- [x] Show the field is accepted by the server PUT, the co-op genesis projection, storage and the local deserializers, and by a reader built before this change.
- [x] Add the guard that lists the only files allowed to name `capturedAt`.
- [x] Kill the mutants. (12 of 12 killed: read `capturedAt` again, stamp from the wall clock, retention boundary strict / 30 / 32 days, prune removed, shim missing in each deserializer, shim drops legacy entries, re-stamps an existing `appliedOn`, apply path does not stamp, morale pass does not stamp. Two survivors on the first run were test gaps and are fixed.)
- [x] Run whole-directory gates, both TypeScript configs, lint, unit lint and suite, oxfmt and the budget check. (Lint 62 warnings, ceiling 63; budget 57 unkeyable, unchanged; types, stores, lib campaign, scenario packs/replay/checkpoints, API and integration all green.)
- [x] Pack minter (Root ruling, option b): omit `recentlyAppliedOutcomes` before canonicalizing, with tests for the omitted key, 33-day downstream equivalence with the unstripped campaign, and dedupe safety (each guard and the strip fail the tests when removed). The all-pack recapture check passes both fast-forward packs, twice. No committed pack changes.
- [x] Run the fast-forward, live-parity, golden and scenario-pack suites before and after; every moved value is attributed to a newly counted outcome; no digest or fixture moved, none regenerated.

## Follow-up outside this change

- [x] Re-mint the committed maintenance-repairbay pack (its stored morale is stale since the pay-baseline change): completed by G8 #3319, merge `45a1c1d354352fa11116198da6824091e48fe1f7`.

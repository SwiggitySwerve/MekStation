## Implementation

- [x] Record the failing integration test first, through the real `deriveCombatOutcome` with no `capturedAt` override (36 of 42 failed on `main`; the two "ahead" rows and the controls passed).
- [x] Stamp `appliedOn` in `applyPostBattle`; count retention in calendar days from it; stop reading `capturedAt` in campaign code.
- [x] Stamp legacy entries at both deserializers and in the morale pass, with committed pre-change fixtures.
- [x] Show the field is accepted by the server PUT, the co-op genesis projection, storage and the local deserializers, and by a reader built before this change.
- [x] Add the guard that lists the only files allowed to name `capturedAt`.
- [ ] Kill the mutants (read `capturedAt` again, stamp from the wall clock, retention boundary, prune removed, field dropped by a serializer, shim missing, retry path unstamped).
- [ ] Run whole-directory gates, both TypeScript configs, lint, unit lint and suite, oxfmt and the budget check.
- [ ] Run the fast-forward, live-parity, golden and scenario-pack suites before and after; attribute every moved value to a newly counted outcome. Any other movement is a STOP, and no committed fixture is regenerated.

## Implementation

- [x] Record the failing tests first (the processor did not exist).
- [x] Add the `contract-morale` processor and register it (22 to 23 registered processors).
- [x] Per-reader tests of the writer-to-reader path at ROUTED, OVERWHELMING and a hold, through scenario generation on the same day.
- [x] Kill the mutants (12).
- [x] Run whole-directory gates, both TypeScript configs, lint, unit lint and suite, oxfmt and the budget check. (Lint 62 warnings, ceiling 63; budget 57 unkeyable, unchanged; `lint:units` src-tests 16,969 of 16,969, the +1 over M2-pre's measurement came from `main` merged after that run, M2's files add 0; types, stores, lib campaign, scenario packs/replay, API and integration green.)
- [x] Run the fast-forward, live-parity, golden and scenario-pack suites before and after (identical; processors 364 to 370 is the 6 new unit tests), and a month-boundary run that keeps an ACTIVE contract across the 1st with AtB scenarios on (fixture started 3025-06-27, one combat team, contract extended past July, seeds 1 and 2 with no battle): exactly one path moves per seed, the contract's `moraleLevel`.
- [ ] After G8's maintenance-repairbay re-mint merges: the all-pack recapture check and every e2e spec that loads that pack on a production build. Re-mint only if the check shows movement (a STOP).

## Follow-up outside this change

- [ ] The ROUTED lifecycle (early end, payout, rout end date, re-spike, enemy swap, prisoners), held with the payout packets.
- [ ] Reliability from enemy faction traits and skill, if MekStation gains that data.
- [ ] The pin's reinforcement-scenario odds modifiers (`StratConRulesManager.java:4499-4506`).

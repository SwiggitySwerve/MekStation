## Implementation

- [x] Record the failing tests first (`contractMorale.test.ts`, module absent).
- [x] Port the rally/waver table, thresholds, reliability, performance modifier and check as pure functions, citing the pinned lines.
- [x] Remove the inverted `updateMorale` and its tests.
- [x] Cross-check the tables against the pin's own source text (82 of 82), and kill the mutants. (10 mutants: 9 killed by the unit tests; the Clan skill cap at Legendary is an equivalent mutant, because a Clan enemy at the top skill gets -1 capped or not.)
- [x] Run whole-directory gates, both TypeScript configs, lint, unit lint and suite, oxfmt, and the budget check. (Lint 62 warnings, ceiling 63; budget 57 unkeyable, unchanged; `src/types/campaign`, `src/lib/campaign`, `src/stores/campaign`, scenario packs / replay / checkpoints and `src/__tests__/integration` all green.)

## Follow-up outside this change

- [ ] Monthly check on the 1st of the month for active contracts with a seeded roll (M2).
- [ ] The ROUTED lifecycle (early end and payout, rout end date, re-spike, enemy swap, prisoners).

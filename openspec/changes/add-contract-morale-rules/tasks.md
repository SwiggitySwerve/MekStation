## Implementation

- [x] Record the failing tests first (`contractMorale.test.ts`, module absent).
- [x] Port the rally/waver table, thresholds, reliability, performance modifier and check as pure functions, citing the pinned lines.
- [x] Remove the inverted `updateMorale` and its tests.
- [ ] Cross-check the tables against the pin's own source text, and kill the mutants (direction swap, thresholds, window start, decisive threshold, Clan cap, trait order, Pyrrhic count).
- [ ] Run whole-directory gates, both TypeScript configs, lint, unit lint and suite, oxfmt, and the budget check.

## Follow-up outside this change

- [ ] Monthly check on the 1st of the month for active contracts with a seeded roll (M2).
- [ ] The ROUTED lifecycle (early end and payout, rout end date, re-spike, enemy swap, prisoners).

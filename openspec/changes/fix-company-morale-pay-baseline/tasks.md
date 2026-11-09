## Implementation

- [x] Record the failing tests first: a real solvent daily-cost pipeline over repeated days, one victory counted once, a missed-pay day, save and reload.
- [x] Score paid costs 0 and missed pay -1 in the morale state machine; state in code and types that this is an application design rule, not MekHQ parity.
- [x] Drop "pay met" from the rise reason text.
- [ ] Run the fast-forward, live-parity and golden suites before and after; any digest movement is a STOP.
- [ ] Run whole-directory gates, both TypeScript configs, lint, unit lint and suite, oxfmt, and the budget check.

## Follow-up outside this change

- [ ] Give role-based-salary campaigns a missed-payment signal (they emit a `transaction` event, not `daily_costs`).

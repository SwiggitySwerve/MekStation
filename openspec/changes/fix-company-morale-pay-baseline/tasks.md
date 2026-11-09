## Implementation

- [x] Record the failing tests first: a real solvent daily-cost pipeline over repeated days, one victory counted once, a missed-pay day, save and reload.
- [x] Score paid costs 0 and missed pay -1 in the morale state machine; state in code and types that this is an application design rule, not MekHQ parity.
- [x] Drop "pay met" from the rise reason text.
- [x] Run the fast-forward, live-parity and golden suites before and after; any digest movement is a STOP. (Before on `590fbfbe9`, after on the change: fast-forward 85/85 and 7/7, scenario packs 53 passed 2 skipped, replay/digest/checkpoints 733/733, processors 345/345, all identical; prestige 34 to 41 from the new tests; no tracked file rewritten by either run. No digest moved.)
- [x] Run whole-directory gates, both TypeScript configs, lint, unit lint and suite, oxfmt, and the budget check. (On the merged head: `npm run typecheck` runs both configs; lint 62 warnings, ceiling 63; budget 57 unkeyable, unchanged; whole directories `src/types/campaign`, `src/stores/campaign`, `src/lib/campaign`, scenario packs/replay/checkpoints and `src/__tests__/integration` all green.)

## Follow-up outside this change

- [ ] Give role-based-salary campaigns a missed-payment signal (they emit a `transaction` event, not `daily_costs`).

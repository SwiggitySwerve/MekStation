## 1. Characterize the approved scope

- [x] 1.1 Prepare the eight-seed real-bot corpus and environment-free comparison harness for commit.
- [x] 1.2 Pin fired-weapon 15/32, phase-damage 10/32 and MASC/EMP key-presence differences.
- [x] 1.3 Verify ordered deterministic playback, roster, turn and terminal interpretation.
- [x] 1.4 Kill the omitted-TurnStarted mutant and restore production code.
- [x] 1.5 Correct the older stand-still characterization explanation.

## 2. Validate without changing committed behavior

- [x] 2.1 Run whole runner and integration directories plus replay/digest/golden before and after; stop on committed changes.
- [x] 2.2 Run exact validate:combat, both TypeScript configurations, lint, lint:units and its Jest suite.
- [x] 2.3 Run oxfmt, OpenSpec validation and the budget check without raising ceilings.
- [x] 2.4 Confirm only the approved tests and OpenSpec files change before opening a draft PR without merging.

## 1. Preserve and share P2P persistence behavior

- [x] 1.1 Verify delayed and rejected terminal append behavior before extraction.
- [x] 1.2 Extract append-then-complete into the match-log owner and verify unchanged P2P behavior.

## 2. Correct completion boundaries

- [x] 2.1 Record failing single-player completion and quick-game guard regressions.
- [x] 2.2 Adopt shared persistence for interactive events and guard endGame.
- [x] 2.3 Demonstrate deliberate mutants fail the new tests.

## 3. Verify

- [x] 3.1 Run full touched test directories, integration and required gameplay gates before and after.
- [x] 3.2 Run both TypeScript configurations, lint, lint:units and its suite, formatting, OpenSpec validation and CI budgets.

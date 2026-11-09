## 1. Test first

- [x] 1.1 Record failing historical recovery, pending receipt, reentrancy and atomic storage regressions.
- [x] 1.2 Run baseline runner, replay/digest/golden and combat gates.

## 2. Implement

- [x] 2.1 Extract retention orchestration with unchanged behavior and passing storage tests.
- [x] 2.2 Add the sidecar schema, migration, atomic pending writes, acknowledgement and cleanup.
- [x] 2.3 Replace the separate publication flag with journal transitions and recovery.
- [x] 2.4 Re-anchor affected runner citations by source content.
- [x] 2.5 Kill the historical-logs-as-pending mutant.

## 3. Verify

- [x] 3.1 Run full affected test directories, integration, multiplayer compatibility and gameplay gates.
- [x] 3.2 Run both TypeScript configs, root lint, lint:units and its Jest suite, formatting, OpenSpec and CI budgets.

## 1. Regression evidence

- [ ] 1.1 Capture runner, replay, digest, golden and combat-validation baseline.
- [ ] 1.2 Record failing store, command and dock tests for context cleanup and cancellation.

## 2. Implementation

- [ ] 2.1 Extract shared attack cleanup from finishCommit without changing attack-commit behavior.
- [ ] 2.2 Clear composers at context boundaries and route Cancel to local cleanup.
- [ ] 2.3 Remove dead UI fields and correct catalog descriptions and content-based source anchors.

## 3. Verification

- [ ] 3.1 Kill unit-change cleanup and Cancel-to-undo mutants, then restore the implementation.
- [ ] 3.2 Run whole touched test directories and integration, plus runner, replay, digest, golden and validate:combat; stop on fixture or digest drift.
- [ ] 3.3 Run both TypeScript configs, root lint, lint:units and its tests, formatting, OpenSpec and CI budgets.

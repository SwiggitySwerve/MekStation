## 1. Regression and extraction

- [x] 1.1 Record failing store tests for AI failure, stale attack drafts and queue reset.
- [x] 1.2 Extract common attack completion without changing caller cleanup behavior; verify characterization tests.

## 2. Recover presentation state

- [x] 2.1 Restore interactive state after every AI turn while preserving exceptions.
- [x] 2.2 Clear both attack drafts and targeting previews through shared completion.
- [x] 2.3 Cancel pending phase advances on queue reset without advancing the session.

## 3. Verification

- [x] 3.1 Kill mutants removing AI finalization, attack-plan cleanup and reset flag release.
- [x] 3.2 Run store and integration directories, both TypeScript configs, formatting, lint, unit-size checks and CI budgets.
- [ ] 3.3 Open a draft PR and record hosted CI results before marking it ready.

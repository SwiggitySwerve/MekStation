## 1. Regression evidence

- [x] 1.1 Record failing shell tests for undo, history replacement, rollover, and session clearing.
- [x] 1.2 Record failing dock tests for preview replacement and unmount; cover blocked freshness approval.

## 2. Implementation

- [x] 2.1 Derive current-turn spotters from the session event list.
- [x] 2.2 Cancel pending dock previews before replacement and on unmount; preserve blocked previews.
- [x] 2.3 Kill the forward-only projection, missing replacement cancel, and missing unmount cleanup mutants.

## 3. Validation

- [x] 3.1 Run full touched component directories and integration suites, plus the existing tactical intervention surface suite for D-6 compatibility.
- [x] 3.2 Run both TypeScript projects, root lint, unit lint and its Jest suite, formatting, OpenSpec, and CI budgets.
- [ ] 3.3 Open a draft PR and mark ready only after hosted CI passes.

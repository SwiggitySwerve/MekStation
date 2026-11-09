## 1. Regression proof

- [x] 1.1 Record failing departure, salary, readiness, and legacy-load tests.

## 2. Implementation

- [x] 2.1 Add terminal statuses and shared roster status rules.
- [x] 2.2 Guard settlement and exclude departed pilots from consumers.
- [x] 2.3 Normalize legacy departures on both load paths.

## 3. Verification

- [x] 3.1 Record green, killed settlement mutant, and restored green.
- [x] 3.2 Pass focused suites and fastForward integration suites.
- [x] 3.3 Pass both tsc configs, unit lint and its Jest suite, root lint
      at most 63 warnings, formatting, and unkeyableTests budget checks.
- [ ] 3.4 Keep the PR draft until hosted CI is green; Root monitors and merges.

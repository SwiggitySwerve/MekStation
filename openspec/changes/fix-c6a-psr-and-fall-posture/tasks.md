## 1. Regression proof

- [x] Record replay, digest, and fixture baselines before product edits.
- [x] Record failing interactive duplicate and three fall-posture regressions.

## 2. Implementation

- [x] Remove inline threshold emission; preserve separate qualifying phases.
- [x] Share fall-posture clearing across reducer and runner fall paths.
- [x] Kill restored-inline-emission and removed-hull-down-clear mutants.

## 3. Verification

- [x] Re-anchor affected catalog source references by content.
- [x] Pass focused and complete runner suites, and replay/digest/fixture suites.
- [x] Pass both TypeScript configs, lint:units and its Jest suite, root lint,
      formatting, and the unchanged unkeyable-test budget.
- [ ] Root verifies hosted CI and schedules C6b; the lane never merges.

## Evidence

- Red: four failures across eight tests: duplicate trigger plus all three fall
  paths retaining hull-down. Final focused regressions include a passing-PSR
  posture control.
- Green: full runner directory plus focused suites, 155 suites / 1489 tests.
- Mutants: restoring the inline producer fails the threshold regression;
  removing hull-down clearing fails the three fall regressions. Both reverted.
- Replay/digest/fixture baseline and after: 32 suites / 770 tests each on Node 22,
  with no fixture regeneration or committed fixture/digest changes.
- Both TypeScript configs pass. Root lint: 63 warnings / zero errors.
  lint:units: 17078/17085; its Jest suite: 33 tests. Unkeyable tests: 57/57.

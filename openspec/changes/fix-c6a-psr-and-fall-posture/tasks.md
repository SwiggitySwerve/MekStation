## 1. Regression proof

- [x] Record replay, digest, and fixture baselines before product edits.
- [x] Record failing interactive duplicate and three fall-posture regressions.

## 2. Implementation

- [x] Preserve inline emission and dedupe the phase-close producer by unit,
      turn, phase, and the existing canonical reasonCode.
- [x] Share fall-posture clearing across reducer and runner fall paths.
- [x] Pin auto-resolve emission and repeated scans; leave the AC/20 smoke test unchanged.
- [x] Kill removed-idempotency-check and removed-hull-down-clear mutants.

## 3. Verification

- [x] Re-anchor affected catalog source references by content.
- [x] Pass both complete gameplay test directories, runner, engine,
      quick-resolve, fastForward, and replay/digest/fixture suites.
- [x] Pass both TypeScript configs, lint:units and its Jest suite, root lint,
      formatting, and the unchanged unkeyable-test budget.
- [ ] Root verifies hosted CI and schedules C6b; the lane never merges.

## Evidence

- Red: four failures across eight tests: duplicate trigger plus all three fall
  paths retaining hull-down. Final focused regressions include a passing-PSR
  posture control.
- Revision red: repeated phase scans queue duplicates; runToCompletion emits
  no threshold trigger without the restored inline producer.
- Revision focused green: 3 suites / 38 tests, including the unchanged AC/20 smoke.
- Mutants: removing the idempotency guard fails with two threshold triggers;
  removing hull-down clearing fails the three fall regressions. Both reverted.
- Replay/digest/fixture baseline and after: 32 suites / 770 tests each on Node 22,
  with no fixture regeneration or committed fixture/digest changes.
- Expanded merged-main gates: full gameplay directories plus runner,
  349 suites / 7205 tests; engine, QuickResolve and fastForward,
  45 suites / 622 tests. Replay plus lint:units Jest: 33 suites / 803 tests.
- Both TypeScript configs pass. Root lint: 63 warnings / zero errors.
  lint:units: 17077/17085. Unkeyable tests: 57/57. Formatting and strict
  OpenSpec validation pass; every ledger entry from main is preserved.

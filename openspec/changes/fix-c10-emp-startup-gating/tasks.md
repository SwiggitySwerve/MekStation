## 1. Behavior-preserving extraction

- [ ] 1.1 Characterize startup eligibility and session EMP countdown.
- [ ] 1.2 Extract both rules, compare representative outputs, and verify existing
  replay/digest/golden suites unchanged before committing the extraction.

## 2. C10 correction

- [ ] 2.1 Record failing tests for EMP expiry in both paths and startup/shutdown
  branch exclusivity, including KO rolled-startup failure.
- [ ] 2.2 Implement EMP-Gated Heat Startup and Exclusive Heat Shutdown Checks,
  preserving recorded event replay and existing heat constants.
- [ ] 2.3 Verify interactive, engine, runToCompletion/QuickResolve/fast-forward,
  multiplayer journal authority, P2P translation/mirroring, and runner paths.
- [ ] 2.4 Kill and restore all three mutants: premature startup, disabled runner
  countdown, and restored second shutdown check. Record the killing tests.

## 3. Gates and delivery

- [ ] 3.1 Run full touched/consumer test directories and integration, plus runner,
  replay/digest/golden gates before/after. Stop on protected expectation changes.
- [ ] 3.2 Run validate:combat, both tsc configs, lint:units and its Jest suite,
  root lint <=63 warnings, oxfmt, OpenSpec validation, and budget check <=57.
- [ ] 3.3 Re-anchor shifted runner source citations by content and list every
  edited catalog in the draft PR. Open one draft PR and never merge.

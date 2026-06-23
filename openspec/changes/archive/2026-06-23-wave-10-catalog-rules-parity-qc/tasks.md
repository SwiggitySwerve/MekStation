## 1. Catalog QC Gate

- [x] 1.1 Add a combat catalog/rules QC validator for required surfaces, claim IDs, commands, active-change refs, source anchors, and expected out-of-scope counts.
- [x] 1.2 Add validator tests for pass output, JSON output, stale active refs, stale out-of-scope expectations, missing anchors, and missing surfaces.
- [x] 1.3 Wire the validator into `verify:qc`, `verify:rules`, and a focused combat catalog verification command.

## 2. Evidence Refresh

- [x] 2.1 Update combat QC registry commands to require the zero unresolved gap baseline and 147-row non-BattleMech out-of-scope split.
- [x] 2.2 Remove stale archived OpenSpec change names from combat `activeChangeRefs`.
- [x] 2.3 Refresh the QC map hot lane with the Wave 10 command and live out-of-scope count.

## 3. Validation and Archive

- [x] 3.1 Run `npm.cmd run qc:combat:catalog-rules:validate`.
- [x] 3.2 Run focused validator and combat catalog tests.
- [x] 3.3 Run `npm.cmd run verify:rules`, `npm.cmd run verify:qc`, `npm.cmd run typecheck`, `npm.cmd run format:check`, and `git diff --check`.
- [x] 3.4 Run `openspec.cmd validate wave-10-catalog-rules-parity-qc --strict`.
- [x] 3.5 Archive the change.

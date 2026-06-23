## 1. QC Validator

- [x] 1.1 Extract shared GM ledger QC manifest checks for surface, command, spec, stale-change, and source-anchor validation.
- [x] 1.2 Add a time-cascade QC validator for the `time` domain, `time-advance` family, day processors, campaign roots, source anchors, tests, and specs.
- [x] 1.3 Preserve the existing campaign-ledger validator output through the shared QC core.

## 2. Registry and Commands

- [x] 2.1 Add `qc:gm:time-cascade`, `qc:gm:time-cascade:validate`, and `verify:qc:gm:time-cascade` package scripts.
- [x] 2.2 Wire the time-cascade validator into the top-level `verify:qc` command.
- [x] 2.3 Add a `time-cascade-gm-ledger` QC registry surface and QC map command/graph/hot-lane entries.

## 3. Tests and Validation

- [x] 3.1 Add focused validator tests for pass output, JSON output, stale active change refs, missing source-anchor tokens, and missing surface failure.
- [x] 3.2 Run time-cascade and existing campaign-ledger focused validator suites.
- [x] 3.3 Run QC, type, format, and OpenSpec validation before archive.

## 4. Archive and PR Gate

- [x] 4.1 Archive the OpenSpec change only after implementation checks pass.
- [ ] 4.2 Commit with the repo Lore protocol, open a PR, wait for CI, merge, and prune local branch state.

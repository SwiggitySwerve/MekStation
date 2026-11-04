## Implementation

- [x] Replace the three PR browser jobs with `e2e-build` and the three-shard `e2e` matrix, and wire both into the `lint-and-test` aggregator.
- [x] Re-scope the job-scoped CI contract and its mutation tests to `e2e-build` and `e2e`, including the gate spec paths, shard selector, and shard matrix.
- [x] Verify actionlint, the CI quality validator and its tests, strict OpenSpec validation, and a green PR Checks run, plus a run whose failing gate fails `Lint and Test`.

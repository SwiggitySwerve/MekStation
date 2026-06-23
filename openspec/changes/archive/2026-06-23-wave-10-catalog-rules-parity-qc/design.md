## Context

The archived `expand-catalog-rules-parity` change added the catalog/rules parity matrix and validation expectations. Current live evidence shows unresolved BattleMech combat gaps remain zero, while the explicit non-BattleMech out-of-scope split is now 147 rows. QC docs still mentioned 140 rows and several archived change IDs as active refs.

## Approach

Add a lightweight manifest validator instead of changing combat runtime behavior. The validator reads the QC registry, checks the required combat surfaces and claim IDs, requires command tokens for the live zero-gap and 147-row out-of-scope gates, rejects stale `activeChangeRefs`, and checks source-anchor tokens in the existing catalog tests/support files.

The validator is intentionally static and fast. Deep behavioral proof remains in `validate:combat` and focused Jest catalog contracts; `verify:rules` now invokes both the new QC gate and live gap exporter expectations before running the full combat validation suite.

## Validation Strategy

- Unit-test the validator failure modes with temporary registry/anchor inputs.
- Run the validator directly for a quick QC manifest proof.
- Run the focused combat catalog verification command for validator plus catalog contract coverage.
- Run `verify:rules` and `verify:qc` to prove the new gate is part of both rules and QC top-level surfaces.

## Risks

- The validator checks command discoverability and source anchors, not every combat mechanic directly. That is deliberate; mechanics remain owned by `validate:combat`.
- Future catalog count changes must update the validator, registry, and `verify:rules` expectations together or QC will fail.

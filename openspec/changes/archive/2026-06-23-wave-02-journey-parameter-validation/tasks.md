## 1. Parameter Validation

- [x] 1.1 Add catalog-driven journey parameter validation in `scripts/qc/journey-qc-core.mjs`.
- [x] 1.2 Reject malformed integers, invalid booleans, unsupported enum values, empty explicit string lists, and numeric min/max violations before evidence execution.
- [x] 1.3 Ensure validation errors name the journey ID, parameter name, offending value, and expected constraint.

## 2. Regression Coverage

- [x] 2.1 Add journey QC tests for invalid integer, below-minimum integer, and invalid enum overrides.
- [x] 2.2 Add a journey QC test proving valid overrides are coerced and preserved in run-plan/artifact evidence.
- [x] 2.3 Confirm existing dry-run, all-smoke, strict backing, log search, bug reporting, and long-campaign stability tests still pass.

## 3. Documentation And Verification

- [x] 3.1 Update journey QC docs to describe parameter validation behavior.
- [x] 3.2 Run focused Jest coverage for `scripts/__tests__/journey-qc.test.ts`.
- [x] 3.3 Run `openspec validate wave-02-journey-parameter-validation --strict`.
- [x] 3.4 Run QC validation commands touched by this change.

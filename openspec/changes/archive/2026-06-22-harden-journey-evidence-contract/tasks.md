## 1. Evidence Contract

- [x] 1.1 Add per-step execution backing metadata to journey run plans, step results, diagnostics, reports, and generated artifacts.
- [x] 1.2 Add a `--require-domain-backed` runner option that fails required synthetic-backed steps.
- [x] 1.3 Ensure missing non-synthetic backing failures feed existing bug extraction and log search output.

## 2. Tests And Docs

- [x] 2.1 Extend journey QC script tests for backing metadata in normal smoke runs.
- [x] 2.2 Add a strict backing-required test proving synthetic-only steps fail with bug evidence.
- [x] 2.3 Update journey QC documentation with the backing metadata and strict gate workflow.

## 3. Validation

- [x] 3.1 Run `npm.cmd run qc:journeys:validate`.
- [x] 3.2 Run the focused journey QC Jest test.
- [x] 3.3 Run a representative smoke journey and strict backing-required failure command.

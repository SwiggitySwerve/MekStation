## 1. Bug Extraction Contract

- [x] 1.1 Add deterministic journey bug candidate deduplication in `scripts/qc/journey-qc-core.mjs`.
- [x] 1.2 Preserve highest severity, unique evidence references, unique log fingerprints, and richest triage packet when duplicates collapse.
- [x] 1.3 Add extraction diagnostic triage metadata for bug count, gated bug count, severity gate, bug packet path, and report path.

## 2. Reporter And Search Usability

- [x] 2.1 Expand `scripts/qc/report-journey-bugs.mjs` text output with actor, compact state before/after, rule decision, warnings, and existing triage fields.
- [x] 2.2 Preserve reporter compatibility for older bug evidence without triage packets.
- [x] 2.3 Ensure `qc:logs` can return the bug-extraction diagnostic by event and fingerprint.

## 3. Regression Coverage

- [x] 3.1 Add focused journey QC tests proving injected failed steps produce one canonical bug.
- [x] 3.2 Add tests for bug-extraction diagnostic triage and log-search fingerprint lookup.
- [x] 3.3 Add tests proving reporter text exposes the required triage context without raw log inspection.

## 4. Verification

- [x] 4.1 Run focused Jest coverage for `scripts/__tests__/journey-qc.test.ts`.
- [x] 4.2 Run `npm.cmd run verify:qc:journeys`.
- [x] 4.3 Run `npm.cmd run verify:qc`.
- [x] 4.4 Run `openspec.cmd validate wave-03-journey-bug-triage-logging --strict`.

## 1. Triage Context Contract

- [x] 1.1 Add shared triage context creation for journey step diagnostics.
- [x] 1.2 Add stable diagnostic fingerprints to structured journey logs.
- [x] 1.3 Preserve bounded state summaries and evidence references in log metadata.

## 2. Bug Packet Enrichment

- [x] 2.1 Copy triage context and log fingerprints from failing step diagnostics into bug candidates.
- [x] 2.2 Keep bug extraction compatible with older evidence that lacks triage packets.
- [x] 2.3 Extend text bug reports with action, validation result, failure cause, debugging hint, and log fingerprint.

## 3. Documentation And Validation

- [x] 3.1 Document the richer bug packet and log query workflow.
- [x] 3.2 Add focused tests for triage fields, reporter output, and fingerprint log lookup.
- [x] 3.3 Run focused journey tests, QC validation, OpenSpec strict validation, formatting, and diff checks.

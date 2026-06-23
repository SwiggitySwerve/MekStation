## ADDED Requirements

### Requirement: Journey bug extraction diagnostic context
The logging system SHALL require journey QC bug extraction diagnostics to carry standardized triage context. A `bug.candidate_extracted` diagnostic MUST include actor, action, stateBefore, stateAfter, ruleDecision, validationResult, warnings, evidenceRefs, and nextDebuggingHint metadata describing the extraction run, severity gate, generated bug packet, and generated report.

#### Scenario: Bug extraction log describes the bug packet
- **WHEN** `qc:journeys` extracts one or more bug candidates
- **THEN** `system.ndjson` includes a `journey.bugs` `bug.candidate_extracted` entry with a triage packet
- **AND** the triage packet identifies the bug count, gated bug count, severity gate, `bugs.json`, `report.md`, and the next command to inspect the bugs

#### Scenario: Search returns extraction triage by fingerprint
- **WHEN** the user searches journey logs by the extraction diagnostic fingerprint
- **THEN** the log search command returns the extraction diagnostic and its triage metadata

## ADDED Requirements

### Requirement: Bug Triage Packets
The system SHALL include a triage packet on each journey bug candidate. The packet MUST include actor, action, stateBefore, stateAfter, ruleDecision, validationResult, warnings, failureCause, logFingerprints, and nextDebuggingHint fields when the source evidence provides them. The packet MUST use compact summaries and artifact references rather than unbounded domain object dumps.

#### Scenario: Failed journey step produces actionable bug packet
- **WHEN** a journey step fails during `qc:journeys`
- **THEN** `bugs.json` records the failing actor, action, state before/after summary, validation result, failure cause, related log fingerprint, and next debugging hint for that bug
- **AND** the text bug reporter displays the failure cause, action, validation result, and log fingerprint without requiring manual inspection of `system.ndjson`

#### Scenario: Bug reporter remains compatible with older evidence
- **WHEN** the bug reporter reads a bug candidate that does not contain a triage packet
- **THEN** it still lists the bug using the existing summary, fingerprint, and evidence references

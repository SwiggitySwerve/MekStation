## ADDED Requirements

### Requirement: Deduplicated journey bug packets
The journey QC runner SHALL collapse duplicate bug candidates that describe the same failed journey step and failure cause before writing `bugs.json`, `report.md`, or the bug-extraction diagnostic. Deduplication MUST preserve the highest severity candidate, all unique evidence references, all unique log fingerprints, and the most complete triage packet.

#### Scenario: Failed step produces one canonical bug
- **WHEN** a required `combat-1v1` step fails and the matching error diagnostic also contains triage metadata
- **THEN** `bugs.json` contains one bug candidate for that journey step and failure cause
- **AND** the bug candidate keeps the step failure summary, high severity, related `system.ndjson` fingerprint, and triage packet

#### Scenario: Log-only bug remains reportable
- **WHEN** an error diagnostic has no matching failed step result
- **THEN** the runner keeps a log-derived bug candidate with its log fingerprint and triage metadata when present

### Requirement: Readable journey bug reporter triage
The journey bug reporter SHALL display compact triage context for every bug candidate that includes a triage packet. The reporter output MUST include actor, action, state before summary, state after summary, rule decision, validation result, warning list when present, failure cause when present, next debugging hint when present, and log fingerprints when present.

#### Scenario: Reporter shows failure context without raw log inspection
- **WHEN** the user runs `npm.cmd run qc:journeys:bugs -- --since=latest --min-severity=medium` after an injected combat journey failure
- **THEN** the reporter shows the actor, action, state before summary, state after summary, rule decision, validation status, failure cause, next debugging hint, and log fingerprint for the canonical bug
- **AND** the user does not need to open `system.ndjson` to identify the failed step context

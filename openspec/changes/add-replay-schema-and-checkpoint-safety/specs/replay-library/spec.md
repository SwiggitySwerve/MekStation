## ADDED Requirements

### Requirement: Replay Uses the Registered Authority Pipeline
Replay Library, cold recovery, snapshot hydration, and live catch-up SHALL use the same event validation, legacy-source attribution, upcast, and projector registrations for a given history. A replay surface SHALL identify its source format/version, stream, branch, event range, schema-pipeline fingerprint, projector version, and result digest.

#### Scenario: Replay and recovery inspect the same head
- **WHEN** Replay Library and cold recovery load the same authorized branch and revision
- **THEN** both SHALL apply the same registered pipeline
- **AND** both SHALL produce the same state digest and audience-safe projection digest

#### Scenario: Unsupported history is visible truthfully
- **WHEN** Replay Library encounters unsupported or quarantined history
- **THEN** it SHALL show a blocked state and recovery guidance
- **AND** it SHALL NOT silently skip the event or present a partial replay as complete

#### Scenario: Unknown legacy source format is blocked
- **WHEN** Replay Library loads a versionless event whose source format and format version do not match a registered legacy adapter
- **THEN** it SHALL report typed unsupported history with the source identity and recovery guidance
- **AND** it SHALL NOT assume baseline v1 or rewrite the replay file

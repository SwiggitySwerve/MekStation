## ADDED Requirements

### Requirement: Replay Uses the Registered Authority Pipeline
Replay Library, cold recovery, snapshot hydration, and live catch-up SHALL use the same event validation, upcast, and projector registrations for a given history. A replay surface SHALL identify its stream, branch, event range, projector version, and result digest.

#### Scenario: Replay and recovery inspect the same head
- **WHEN** Replay Library and cold recovery load the same authorized branch and revision
- **THEN** both SHALL apply the same registered pipeline
- **AND** both SHALL produce the same state digest and audience-safe projection digest

#### Scenario: Unsupported history is visible truthfully
- **WHEN** Replay Library encounters unsupported or quarantined history
- **THEN** it SHALL show a blocked state and recovery guidance
- **AND** it SHALL NOT silently skip the event or present a partial replay as complete

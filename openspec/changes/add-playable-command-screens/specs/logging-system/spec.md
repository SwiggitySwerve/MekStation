## ADDED Requirements

### Requirement: Command path diagnostic logging
Important command paths SHALL emit useful diagnostic logs for preview creation, malformed or rejected inputs, invalid actions, committed actions, persistence reload checks, and GM intervention outcomes.

#### Scenario: Invalid command is logged usefully
- **WHEN** a command preview or commit rejects malformed payload, illegal action, or stale state
- **THEN** the log SHALL include service, event name, level, command id, domain, subject ids when safe, reason code, and whether user-visible state changed

#### Scenario: Successful command is logged usefully
- **WHEN** travel, deployment, refit, combat action, or GM intervention commit succeeds
- **THEN** the log SHALL include the committed command id, affected entity ids, resulting-state summary, and persistence/ledger reference where available

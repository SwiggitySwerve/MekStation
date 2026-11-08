## ADDED Requirements

### Requirement: Vault Pilot Status Validation

Normal vault pilot updates SHALL accept supplied status only when it exactly matches `PilotStatus`. Invalid supplied status SHALL return HTTP 400 without changing any pilot field. Omitted status SHALL preserve the stored status. The public repository update boundary SHALL also reject invalid supplied status.

#### Scenario: Invalid status leaves a mixed update untouched
- **GIVEN** an existing vault pilot
- **WHEN** PUT supplies a new name and an invalid, null, or non-string status
- **THEN** the response is 400 with one short sentence-case error
- **AND** every persisted field remains unchanged

#### Scenario: Exact enum and omitted status
- **GIVEN** an existing non-KIA pilot
- **WHEN** an update supplies any exact `PilotStatus` value or omits status
- **THEN** the status is accepted or preserved respectively
- **AND** campaign-only spellings are rejected

### Requirement: Normal Vault KIA Terminality

Normal vault persistence updates SHALL refuse KIA to non-KIA transitions with HTTP 400 without mutation. They SHALL allow KIA to KIA and status-omitting updates. Existing healing behavior SHALL remain unchanged. An explicit GM revive operation is outside this requirement.

#### Scenario: Normal PUT cannot revive a pilot
- **GIVEN** a vault pilot whose status is KIA
- **WHEN** PUT supplies any other valid pilot status together with other changes
- **THEN** the response is 400
- **AND** no field changes

#### Scenario: Idempotent and unrelated edits remain possible
- **GIVEN** a KIA vault pilot
- **WHEN** an update retains KIA or omits status
- **THEN** the update can succeed without reviving the pilot

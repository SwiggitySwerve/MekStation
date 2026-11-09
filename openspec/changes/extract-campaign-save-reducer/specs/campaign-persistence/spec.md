## ADDED Requirements

### Requirement: Campaign save transition ownership

Internal campaign persistence updates SHALL pass named events through one pure
save-state reducer while preserving the existing public store fields, effect
ordering, and persistence formats.

#### Scenario: Save acknowledgment covers only its captured edits

- **GIVEN** a save captured edit sequence N and another edit advances it to N+1
- **WHEN** the save is acknowledged
- **THEN** the accepted version and persisted snapshot SHALL advance
- **AND** dirty SHALL remain true and saveState SHALL become idle
- **AND** the live campaign SHALL retain the later edit

#### Scenario: A newer loaded record outranks an older save answer

- **GIVEN** a load adopted a newer version of the same campaign during a save
- **WHEN** the older save answer arrives
- **THEN** its record payload SHALL NOT replace the loaded version or metadata
- **AND** the save status SHALL settle according to the current dirty value

#### Scenario: Typed co-op refusal retains pending edits

- **GIVEN** a pending campaign edit
- **WHEN** the server refuses its save with typed host authorization evidence
- **THEN** the store SHALL retain the edit and refusal evidence
- **AND** clearError SHALL clear error evidence only while saveState is error

#### Scenario: Conflict adoption preserves the existing recovery boundary

- **GIVEN** a save conflict carries a server record
- **WHEN** take-server succeeds
- **THEN** the record SHALL become the persisted baseline and dirty SHALL clear
- **AND** its save-conflict evidence SHALL clear together

#### Scenario: Launch-only recovery remains deferred

- **GIVEN** only a launch conflict and no conflict server record
- **WHEN** take-server is requested
- **THEN** it SHALL return false without fetching or clearing launch evidence

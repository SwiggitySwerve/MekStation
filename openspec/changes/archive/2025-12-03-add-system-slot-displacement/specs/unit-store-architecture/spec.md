## ADDED Requirements

### Requirement: Engine Type Change with Displacement

The setEngineType store action SHALL detect and unallocate equipment displaced by the new engine's slot requirements.

#### Scenario: Equipment displaced by engine change

- **GIVEN** equipment is allocated in side torso slots that new engine requires
- **WHEN** setEngineType action is called with an engine requiring more side torso slots
- **THEN** displaced equipment location SHALL be set to undefined
- **AND** displaced equipment slots SHALL be set to undefined
- **AND** engine type SHALL be updated to the new type
- **AND** isModified SHALL be set to true

#### Scenario: No displacement when engine requires fewer slots

- **GIVEN** equipment is allocated in side torso slots
- **WHEN** setEngineType action is called with an engine requiring fewer side torso slots
- **THEN** equipment allocation SHALL remain unchanged
- **AND** engine type SHALL be updated to the new type

### Requirement: Gyro Type Change with Displacement

The setGyroType store action SHALL detect and unallocate equipment displaced by the new gyro's slot requirements.

#### Scenario: Equipment displaced by gyro change

- **GIVEN** equipment is allocated in center torso slots that new gyro requires
- **WHEN** setGyroType action is called with a gyro requiring more slots
- **THEN** displaced equipment location SHALL be set to undefined
- **AND** displaced equipment slots SHALL be set to undefined
- **AND** gyro type SHALL be updated to the new type
- **AND** isModified SHALL be set to true

#### Scenario: No displacement when gyro requires fewer slots

- **GIVEN** equipment is allocated in center torso slots
- **WHEN** setGyroType action is called with a gyro requiring fewer slots
- **THEN** equipment allocation SHALL remain unchanged
- **AND** gyro type SHALL be updated to the new type

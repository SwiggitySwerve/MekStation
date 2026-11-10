## MODIFIED Requirements

### Requirement: Battle Type Modifier

The system SHALL NOT vary the scenario-type roll with contract morale. The roll that selects a scenario type from a combat role's table SHALL receive a fixed offset of 1, the same at every morale level. The pinned MekHQ has no morale modifier on a scenario-type roll: the weekly AtB generator that had one is retired.

#### Scenario: The offset is the same at every morale level

- **GIVEN** contracts at STALEMATE, WEAKENED, ADVANCING and OVERWHELMING
- **WHEN** the same base roll is made for the same combat role
- **THEN** each SHALL select the scenario type found at that base roll plus 1 in the role's table

#### Scenario: There is no morale-dependent formula

- **GIVEN** the scenario-type selection code
- **WHEN** it is inspected
- **THEN** it SHALL NOT compute a modifier from a morale level

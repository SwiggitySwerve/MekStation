## ADDED Requirements

### Requirement: Contract Morale Tracking

The system SHALL track morale levels per contract and update based on scenario outcomes.

#### Scenario: Initial morale level

- **GIVEN** a new contract is created
- **WHEN** checking the morale level
- **THEN** morale defaults to STALEMATE (value 0)

#### Scenario: Morale levels

- **GIVEN** the morale system
- **WHEN** listing available morale levels
- **THEN** levels SHALL be: ROUTED (-3), CRITICAL (-2), WEAKENED (-1), STALEMATE (0), ADVANCING (+1), DOMINATING (+2), OVERWHELMING (+3)

#### Scenario: Victory increases morale

- **GIVEN** a contract with morale STALEMATE
- **WHEN** a scenario is completed with outcome "victory"
- **THEN** morale increases to ADVANCING (+1)

#### Scenario: Defeat decreases morale

- **GIVEN** a contract with morale STALEMATE
- **WHEN** a scenario is completed with outcome "defeat"
- **THEN** morale decreases to WEAKENED (-1)

#### Scenario: Draw maintains morale

- **GIVEN** a contract with morale ADVANCING
- **WHEN** a scenario is completed with outcome "draw"
- **THEN** morale remains ADVANCING

#### Scenario: Morale clamping at maximum

- **GIVEN** a contract with morale OVERWHELMING (+3)
- **WHEN** a scenario is completed with outcome "victory"
- **THEN** morale remains OVERWHELMING (cannot exceed +3)

#### Scenario: Morale clamping at minimum

- **GIVEN** a contract with morale ROUTED (-3)
- **WHEN** a scenario is completed with outcome "defeat"
- **THEN** morale remains ROUTED (cannot go below -3)

### Requirement: Battle Type Modifier

The system SHALL calculate battle type modifiers based on morale level.

#### Scenario: Battle type modifier at STALEMATE

- **GIVEN** a contract with morale STALEMATE
- **WHEN** calculating battle type modifier
- **THEN** modifier = 1 + (3 - 3) × 5 = 1

#### Scenario: Battle type modifier at ROUTED

- **GIVEN** a contract with morale ROUTED (ordinal 0)
- **WHEN** calculating battle type modifier
- **THEN** modifier = 1 + (3 - 0) × 5 = 16

#### Scenario: Battle type modifier at OVERWHELMING

- **GIVEN** a contract with morale OVERWHELMING (ordinal 6)
- **WHEN** calculating battle type modifier
- **THEN** modifier = 1 + (3 - 6) × 5 = -14

## MODIFIED Requirements

### Requirement: Contract Entity

The system SHALL track contracts with comprehensive attributes including morale level.

#### Scenario: Contract has morale level

- **GIVEN** a contract in the campaign
- **WHEN** viewing contract properties
- **THEN** the contract has a moraleLevel field
- **AND** moraleLevel is of type AtBMoraleLevel
- **AND** moraleLevel defaults to STALEMATE if not specified

#### Scenario: Contract morale affects scenario generation

- **GIVEN** a contract with morale ROUTED
- **WHEN** generating scenarios for this contract
- **THEN** battle type modifier is calculated from morale
- **AND** scenario difficulty is influenced by morale level

## ADDED Requirements

### Requirement: Combat Team Assignment

The system SHALL support assigning forces to combat roles for scenario generation.

#### Scenario: Assign force to combat role

- **GIVEN** a force in an active campaign
- **WHEN** assigning the force to a combat team
- **THEN** the combat team has: forceId, role, battleChance
- **AND** role is one of the 7 CombatRole values
- **AND** battleChance is the base percentage for that role

#### Scenario: Multiple combat teams per contract

- **GIVEN** a contract with multiple assigned forces
- **WHEN** viewing combat teams
- **THEN** each force can have its own combat role
- **AND** each team independently checks for battles weekly

#### Scenario: Combat team battle chance

- **GIVEN** a combat team with role Patrol (60% base chance)
- **WHEN** checking for weekly battle
- **THEN** roll d100 and compare to 60
- **AND** roll ≤ 60 generates a scenario
- **AND** roll > 60 skips scenario generation

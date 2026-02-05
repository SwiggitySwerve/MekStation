# engine-system Spec Changes

## MODIFIED Requirements

### Requirement: Engine Rating System

The system SHALL enforce valid engine ratings based on unit type.

#### Scenario: Valid BattleMech engine rating

- **WHEN** selecting engine rating for a BattleMech
- **THEN** rating MUST be between 10 and 400
- **AND** rating MUST be a multiple of 5
- **AND** rating = Tonnage × Walk MP

#### Scenario: Engine rating for other unit types

- **WHEN** selecting engine rating for vehicles or spacecraft
- **THEN** rating MUST be between 10 and 500
- **AND** rating MUST be a multiple of 5

#### Scenario: Maximum practical Walk MP

- **GIVEN** a 100-ton BattleMech (maximum standard weight)
- **WHEN** calculating maximum Walk MP
- **THEN** max Walk MP = 400 / 100 = 4
- **AND** higher ratings are impractical due to engine weight

## ADDED Requirements

### Requirement: Engine Rating Context

The system SHALL treat engine ratings above 400 as intended for non-'Mech units.

#### Scenario: High rating usage

- **GIVEN** an engine rating above 400
- **WHEN** validating for unit type
- **THEN** rating is valid for vehicles and spacecraft
- **AND** rating is invalid for standard BattleMechs (20-100 tons)

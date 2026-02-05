# construction-rules-core Specification

## Purpose

TBD - created by archiving change implement-phase2-construction. Update Purpose after archive.

## Requirements

### Requirement: Construction Sequence

The system SHALL implement 12-step construction sequence.

#### Scenario: Construction steps

- **WHEN** constructing a BattleMech
- **THEN** follow: tonnage → structure → engine → gyro → cockpit → heat sinks → armor → weapons → equipment → slots → weight → finalize

### Requirement: Weight Budget

Total component weight MUST equal mech tonnage exactly.

#### Scenario: Weight validation

- **WHEN** validating construction
- **THEN** sum of all weights MUST equal tonnage
- **AND** overweight SHALL produce error
- **AND** underweight SHALL produce warning

### Requirement: Minimum Requirements

All mechs SHALL meet minimum requirements.

#### Scenario: Minimum heat sinks

- **WHEN** validating heat sinks
- **THEN** total MUST be >= 10
- **OR** total MUST be >= heat-generating weapons if higher

### Requirement: Maximum Limits

Component limits SHALL be enforced.

#### Scenario: Armor maximum

- **WHEN** validating armor
- **THEN** total SHALL not exceed maximum (2× structure per location)

#### Scenario: Slot maximum

- **WHEN** validating critical slots
- **THEN** total SHALL not exceed 78 available slots

### Requirement: BattleMech Tonnage Classes

The system SHALL recognize distinct BattleMech tonnage classes with different construction constraints.

#### Scenario: Standard BattleMech tonnage

- **WHEN** creating a standard BattleMech
- **THEN** tonnage MUST be between 20 and 100 tons
- **AND** tonnage MUST be a multiple of 5

#### Scenario: Ultralight BattleMech tonnage

- **WHEN** creating an ultralight BattleMech
- **THEN** tonnage MUST be between 10 and 15 tons
- **AND** special construction rules apply
- **AND** rules level MUST be Experimental or higher

#### Scenario: Superheavy BattleMech tonnage

- **WHEN** creating a superheavy BattleMech
- **THEN** tonnage MUST be between 105 and 200 tons
- **AND** special construction rules apply
- **AND** rules level MUST be Experimental or higher

### Requirement: Engine Rating by Unit Type

The system SHALL enforce engine rating limits based on unit type.

#### Scenario: BattleMech engine rating limit

- **GIVEN** a standard BattleMech (20-100 tons)
- **WHEN** validating engine rating
- **THEN** rating MUST NOT exceed 400
- **AND** rating = Tonnage × Walk MP (max 4 Walk MP practical)

#### Scenario: Vehicle engine rating limit

- **GIVEN** a combat vehicle
- **WHEN** validating engine rating
- **THEN** rating MAY be up to 500
- **AND** higher ratings are feasible due to different weight fractions

# engine-system Specification

## Purpose

TBD - created by archiving change implement-phase2-construction. Update Purpose after archive.

## Requirements

### Requirement: Engine Type Classification

The system SHALL support all standard BattleTech engine types with distinct characteristics.

#### Scenario: Standard Fusion Engine

- **WHEN** selecting Standard Fusion engine type
- **THEN** engine SHALL occupy only CT critical slots
- **AND** weight SHALL use standard fusion formula
- **AND** engine SHALL be available at Introductory rules level

#### Scenario: XL Engine variants

- **WHEN** selecting XL engine
- **THEN** Inner Sphere XL SHALL use 3 side torso slots per side
- **AND** Clan XL SHALL use 2 side torso slots per side
- **AND** weight SHALL be 50% of standard fusion weight

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

### Requirement: Engine Weight Calculation

The system SHALL calculate engine weight based on rating and engine type.

#### Scenario: Engine weight table lookup

- **WHEN** calculating engine weight
- **THEN** Standard weight is determined by ENGINE_WEIGHT_TABLE lookup based on rating
- **AND** XL weight = Standard × 0.5
- **AND** Light weight = Standard × 1.5
- **AND** XXL weight = Standard × 2.0
- **AND** Compact weight = Standard × 1.5
- **AND** weight SHALL be rounded to nearest 0.5 ton

### Requirement: Integral Heat Sinks

The system SHALL calculate integral heat sink capacity based on engine rating.

#### Scenario: Integral heat sink count

- **WHEN** calculating integral heat sinks
- **THEN** count = min(10, floor(rating / 25))
- **AND** integral heat sinks occupy no additional slots

### Requirement: Engine Rating Context

The system SHALL treat engine ratings above 400 as intended for non-'Mech units.

#### Scenario: High rating usage

- **GIVEN** an engine rating above 400
- **WHEN** validating for unit type
- **THEN** rating is valid for vehicles and spacecraft
- **AND** rating is invalid for standard BattleMechs (20-100 tons)

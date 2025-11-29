## ADDED Requirements

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
The system SHALL enforce valid engine ratings and calculate derived properties.

#### Scenario: Valid engine rating
- **WHEN** selecting engine rating
- **THEN** rating MUST be between 10 and 500
- **AND** rating MUST be a multiple of 5

### Requirement: Engine Weight Calculation
The system SHALL calculate engine weight based on rating and engine type.

#### Scenario: Engine weight formula
- **WHEN** calculating engine weight
- **THEN** Standard weight = (rating/100)² × 5 tons
- **AND** XL weight = Standard × 0.5
- **AND** weight SHALL be rounded to nearest 0.5 ton

### Requirement: Integral Heat Sinks
The system SHALL calculate integral heat sink capacity based on engine rating.

#### Scenario: Integral heat sink count
- **WHEN** calculating integral heat sinks
- **THEN** count = min(10, floor(rating / 25))
- **AND** integral heat sinks occupy no additional slots


# environmental-combat-modifiers Specification

## Purpose

TBD - created by archiving change full-combat-parity. Update Purpose after archive.

## Requirements

### Requirement: Light Condition Modifiers

The system SHALL apply to-hit modifiers based on ambient light conditions.

#### Scenario: Night combat modifier

- **WHEN** combat takes place during nighttime conditions
- **THEN** all attacks SHALL receive a +2 to-hit modifier

#### Scenario: Dawn/dusk combat modifier

- **WHEN** combat takes place during dawn or dusk conditions
- **THEN** all attacks SHALL receive a +1 to-hit modifier

#### Scenario: Normal daylight no modifier

- **WHEN** combat takes place during normal daylight
- **THEN** no light condition modifier SHALL apply

### Requirement: Precipitation Modifiers

The system SHALL apply to-hit and visibility modifiers based on precipitation.

#### Scenario: Light rain modifier

- **WHEN** combat takes place during light rain
- **THEN** all attacks SHALL receive a +1 to-hit modifier

#### Scenario: Heavy rain modifier

- **WHEN** combat takes place during heavy rain
- **THEN** all attacks SHALL receive a +2 to-hit modifier
- **AND** maximum visibility range SHALL be reduced

### Requirement: Fog Modifiers

The system SHALL apply to-hit modifiers based on fog conditions.

#### Scenario: Light fog modifier

- **WHEN** combat takes place in light fog
- **THEN** all attacks SHALL receive a +1 to-hit modifier

#### Scenario: Heavy fog modifier

- **WHEN** combat takes place in heavy fog
- **THEN** all attacks SHALL receive a +2 to-hit modifier
- **AND** maximum visibility range SHALL be reduced

### Requirement: Snow Modifiers

The system SHALL apply to-hit modifiers for snowfall conditions.

#### Scenario: Snowfall combat modifier

- **WHEN** combat takes place during snowfall
- **THEN** all attacks SHALL receive a +1 to-hit modifier
- **AND** terrain movement costs SHALL be increased per terrain-system snow rules

### Requirement: Wind Modifiers

The system SHALL apply modifiers for wind conditions affecting missile flight and jump distance.

#### Scenario: Moderate wind affects missiles

- **WHEN** combat takes place in moderate wind conditions
- **THEN** missile attacks SHALL receive a +1 to-hit modifier

#### Scenario: Strong wind affects missiles and jump

- **WHEN** combat takes place in strong wind conditions
- **THEN** missile attacks SHALL receive a +2 to-hit modifier
- **AND** jump distance SHALL be reduced by 1-2 MP depending on wind strength

### Requirement: Extreme Temperature Effects

The system SHALL modify heat dissipation based on extreme ambient temperatures.

#### Scenario: Extreme heat reduces cooling

- **WHEN** combat takes place in extreme heat conditions
- **THEN** heat dissipation SHALL be reduced (fewer effective heat sinks)

#### Scenario: Extreme cold improves cooling

- **WHEN** combat takes place in extreme cold conditions
- **THEN** heat dissipation SHALL be improved (additional effective heat sinks)

### Requirement: Vacuum Conditions

The system SHALL modify heat dissipation for vacuum environments.

#### Scenario: Vacuum removes atmospheric cooling

- **WHEN** combat takes place in a vacuum (space or airless moon)
- **THEN** the atmospheric heat dissipation bonus SHALL NOT apply
- **AND** heat sinks SHALL operate at reduced efficiency

### Requirement: Gravity Effects

The system SHALL modify fall damage and jump distance based on gravity.

#### Scenario: Low gravity increases jump distance

- **WHEN** combat takes place in low gravity (< 1.0g)
- **THEN** jump distance SHALL be increased proportionally

#### Scenario: High gravity reduces jump distance

- **WHEN** combat takes place in high gravity (> 1.0g)
- **THEN** jump distance SHALL be reduced proportionally

#### Scenario: Gravity affects fall damage

- **WHEN** a unit falls in non-standard gravity
- **THEN** fall damage SHALL be modified by the gravity factor

### Requirement: Environmental Conditions in Game State

The system SHALL store environmental conditions in the game session configuration.

#### Scenario: Environmental conditions set at game start

- **WHEN** a game session is initialized
- **THEN** environmental conditions (light, precipitation, fog, wind, temperature, gravity) SHALL be configurable
- **AND** default conditions SHALL be normal daylight, no precipitation, no fog, no wind, standard temperature, 1.0g

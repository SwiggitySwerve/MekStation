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
- **AND** jump distance SHALL be reduced by 2 MP

### Requirement: Extreme Temperature Effects

The system SHALL modify heat dissipation based on extreme ambient temperatures.

#### Scenario: Normal temperature no modifier

- **WHEN** combat takes place in normal temperature conditions
- **THEN** no temperature heat dissipation modifier SHALL apply

#### Scenario: Extreme heat reduces cooling

- **WHEN** combat takes place in extreme heat conditions
- **THEN** heat dissipation SHALL be reduced by 2 effective heat sinks

#### Scenario: Extreme cold improves cooling

- **WHEN** combat takes place in extreme cold conditions
- **THEN** heat dissipation SHALL be improved by 2 effective heat sinks

### Requirement: Atmosphere Conditions

The system SHALL modify heat dissipation based on atmospheric density.

#### Scenario: Standard atmosphere no modifier

- **WHEN** combat takes place in standard atmosphere
- **THEN** no atmosphere heat dissipation modifier SHALL apply

#### Scenario: Thin atmosphere reduces cooling

- **WHEN** combat takes place in thin atmosphere
- **THEN** heat dissipation SHALL be reduced by 2 effective heat sinks

#### Scenario: Trace atmosphere severely reduces cooling

- **WHEN** combat takes place in trace atmosphere
- **THEN** heat dissipation SHALL be reduced by 4 effective heat sinks

#### Scenario: Vacuum severely reduces cooling

- **WHEN** combat takes place in vacuum (space or airless moon)
- **THEN** heat dissipation SHALL be reduced by 4 effective heat sinks

### Requirement: Gravity Effects

The system SHALL modify fall damage and jump distance based on gravity.

#### Scenario: Standard gravity no modifier

- **WHEN** combat takes place in standard gravity (1.0g)
- **THEN** no gravity modifier SHALL apply to jump distance or fall damage

#### Scenario: Low gravity increases jump distance

- **WHEN** combat takes place in low gravity (< 1.0g)
- **THEN** jump distance SHALL be calculated as: `round(baseJumpMP / gravity)`
- **EXAMPLE**: 0.5g doubles jump distance (6 MP → 12 MP)

#### Scenario: High gravity reduces jump distance

- **WHEN** combat takes place in high gravity (> 1.0g)
- **THEN** jump distance SHALL be calculated as: `round(baseJumpMP / gravity)`
- **EXAMPLE**: 2.0g halves jump distance (6 MP → 3 MP)

#### Scenario: Gravity affects fall damage

- **WHEN** a unit falls in non-standard gravity
- **THEN** fall damage SHALL be calculated as: `round(baseDamage × gravity)`
- **EXAMPLE**: 2.0g doubles fall damage (10 damage → 20 damage)

### Requirement: Combined Environmental Calculations

The system SHALL provide functions to calculate combined environmental effects.

#### Scenario: Calculate all to-hit modifiers

- **WHEN** calculating to-hit modifiers for an attack
- **THEN** the system SHALL combine applicable modifiers from light, precipitation, fog, and wind (missiles only)
- **AND** return an array of modifier details for display

#### Scenario: Calculate total heat dissipation modifier

- **WHEN** calculating heat dissipation for a unit
- **THEN** the system SHALL combine atmosphere and temperature modifiers
- **AND** return the net heat dissipation adjustment
- **EXAMPLE**: Thin atmosphere (-2) + extreme heat (-2) = -4 total heat dissipation

### Requirement: Environmental Conditions in Game State

The system SHALL store environmental conditions in the game session configuration.

#### Scenario: Environmental conditions set at game start

- **WHEN** a game session is initialized
- **THEN** environmental conditions (light, precipitation, fog, wind, temperature, gravity, atmosphere) SHALL be configurable
- **AND** default conditions SHALL be: daylight, no precipitation, no fog, no wind, normal temperature, 1.0g, standard atmosphere

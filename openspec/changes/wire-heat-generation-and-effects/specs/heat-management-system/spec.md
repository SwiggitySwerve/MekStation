# heat-management-system (delta)

## ADDED Requirements

### Requirement: Per-Turn Heat Generation

The heat management system SHALL accumulate unit heat from all canonical sources each turn: movement, firing, engine damage, and environmental heat (e.g., fire/lava hexes).

#### Scenario: Movement heat applied

- **GIVEN** a unit that walked this turn
- **WHEN** the heat phase runs
- **THEN** the unit SHALL accumulate +1 heat from movement
- **AND** a `HeatGenerated` event SHALL include source = `Movement`, amount = 1

#### Scenario: Running heat

- **GIVEN** a unit that ran this turn
- **WHEN** the heat phase runs
- **THEN** the unit SHALL accumulate +2 heat

#### Scenario: Jump heat uses max(3, jumpMP)

- **GIVEN** a unit with 5 jump MP that jumped 5 hexes
- **WHEN** the heat phase runs
- **THEN** the unit SHALL accumulate +5 heat from jump

#### Scenario: Short jump still costs 3

- **GIVEN** a unit with 2 jump MP that jumped 2 hexes
- **WHEN** the heat phase runs
- **THEN** the unit SHALL accumulate +3 heat (floor at 3)

#### Scenario: Engine-hit contribution

- **GIVEN** a unit with 2 engine hits
- **WHEN** the heat phase runs
- **THEN** the unit SHALL accumulate +10 heat from engine damage (5 × 2)

### Requirement: Dissipation From Real Heat Sinks

Dissipation SHALL be computed from the unit's actual heat-sink count (engine-integrated + external, minus destroyed sinks), not a fixed constant.

#### Scenario: Standard mech with 10 single sinks

- **GIVEN** a mech with 10 single heat sinks, none destroyed
- **WHEN** dissipation is computed
- **THEN** dissipation SHALL be 10

#### Scenario: Double heat sinks

- **GIVEN** a mech with 10 double heat sinks (IS), none destroyed
- **WHEN** dissipation is computed
- **THEN** dissipation SHALL be 20

#### Scenario: Destroyed sinks excluded

- **GIVEN** a mech with 10 single sinks, 3 destroyed by crits
- **WHEN** dissipation is computed
- **THEN** dissipation SHALL be 7

### Requirement: Water Cooling Bonus Applied

When a unit stands in water terrain, the water-cooling bonus SHALL be added to dissipation.

#### Scenario: Water depth 1

- **GIVEN** a mech standing in water depth 1
- **WHEN** dissipation is computed
- **THEN** +2 SHALL be added to dissipation

#### Scenario: Water depth 2+

- **GIVEN** a mech standing in water depth 2 or greater
- **WHEN** dissipation is computed
- **THEN** +4 SHALL be added to dissipation

### Requirement: Heat Level Non-Negative

The unit's heat level SHALL never be negative; dissipation that would reduce heat below 0 SHALL clamp to 0.

#### Scenario: Overdissipation clamps

- **GIVEN** a unit at heat 3 with dissipation 10
- **WHEN** the heat phase ends
- **THEN** the unit's heat SHALL be 0 (not -7)

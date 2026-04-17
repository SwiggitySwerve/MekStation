# heat-overflow-effects Specification Delta

## MODIFIED Requirements

### Requirement: Heat Threshold Events For UI

The heat overflow system SHALL emit structured heat-threshold events
so the UI layer can subscribe to transitions without polling state.

#### Scenario: HeatChanged event carries old and new thresholds

- **GIVEN** a unit's heat changes
- **WHEN** `HeatChanged` is emitted
- **THEN** the payload SHALL contain `previousHeat`, `currentHeat`,
  `previousThreshold`, and `currentThreshold`
- **AND** threshold values SHALL be one of `normal | warm | hot |
overheat | critical`

#### Scenario: AmmoExplosionRiskEntered fires on threshold cross

- **GIVEN** a unit's heat enters the ammo-explosion-risk range
- **WHEN** the crossing happens
- **THEN** an `AmmoExplosionRiskEntered` event SHALL be emitted
- **AND** when heat drops out of the range, an
  `AmmoExplosionRiskExited` event SHALL be emitted

#### Scenario: Startup event carries pass/fail outcome

- **GIVEN** a shutdown unit attempts restart
- **WHEN** the `Startup` event is emitted
- **THEN** the payload SHALL contain `success: boolean`
- **AND** failure SHALL be distinguishable from success so the UI can
  pick the correct pulse variant

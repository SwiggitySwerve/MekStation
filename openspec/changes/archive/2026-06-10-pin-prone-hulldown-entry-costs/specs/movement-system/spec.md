# Spec Delta: Movement System

## ADDED Requirements

### Requirement: Prone Hull-Down Entry Uses Source-Backed Location Costs

Movement declaration SHALL price a prone Mek-style unit's `HULL_DOWN` posture
entry from represented per-location leg/support damage.

#### Scenario: Prone hull-down entry pays actuator and hip costs

- **GIVEN** a prone Mek-style unit has represented actuator critical damage on
  its support locations
- **WHEN** it commits the hull-down posture action
- **THEN** the movement declaration SHALL stay in the current hex/facing
- **AND** the declaration SHALL include `hullDownEntryAttempt: true`
- **AND** the hull-down step MP cost SHALL be 1 MP plus one MP per represented
  non-hip leg actuator crit and one MP per represented hip crit
- **AND** replay SHALL clear prone and set hull-down without emitting a stand-up
  PSR.

#### Scenario: Destroyed support location blocks prone hull-down entry

- **GIVEN** a prone Mek-style unit has a destroyed required support location
- **WHEN** it attempts the hull-down posture action
- **THEN** no movement declaration SHALL be emitted
- **AND** movement invalid metadata SHALL report an impossible-cost 99 MP
  support-location blocker.

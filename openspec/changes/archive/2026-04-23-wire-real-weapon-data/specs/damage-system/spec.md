# damage-system (delta)

## ADDED Requirements

### Requirement: Damage Value Flows From Weapon Catalog

The damage applied by the damage pipeline SHALL be the value sourced from the fired weapon's `IWeaponData.damage` field, not a placeholder constant.

#### Scenario: Attack event carries real damage

- **GIVEN** an AC/10 fires and hits
- **WHEN** the damage pipeline receives the hit
- **THEN** the damage amount entering the pipeline SHALL be 10

#### Scenario: Small Laser does 3 damage

- **GIVEN** a Small Laser fires and hits
- **WHEN** the damage pipeline receives the hit
- **THEN** the damage amount entering the pipeline SHALL be 3

#### Scenario: Test placeholder removed from production path

- **GIVEN** the production attack-resolution code path
- **WHEN** the path is statically searched for `damage: 5`
- **THEN** no occurrences SHALL remain outside of explicit test fixtures

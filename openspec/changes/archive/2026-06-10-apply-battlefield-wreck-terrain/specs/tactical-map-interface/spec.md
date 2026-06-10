# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Optional Battlefield Wreckage Terrain

When the represented TacOps battlefield wreckage optional rule is enabled, the tactical map SHALL apply source-pinned terrain conversion from destroyed unit events to the shared tactical grid used by movement projection.

#### Scenario: Destroyed heavy ground unit creates rough terrain

- **GIVEN** `tacops_battle_wreck` is enabled
- **AND** a non-infantry, non-battle-armor, non-protomek ground unit of at least 40 tons is destroyed
- **WHEN** the `UnitDestroyed` event is applied in a live interactive session
- **THEN** the destroyed unit's hex SHALL gain level-1 rough terrain if it does not already contain rough terrain
- **AND** later movement projection SHALL price that hex using the same mutated grid
- **AND** the wreck marker itself SHALL remain non-blocking for LOS

#### Scenario: Optional rule disabled leaves terrain unchanged

- **GIVEN** `tacops_battle_wreck` is disabled
- **WHEN** a unit is destroyed
- **THEN** the destroyed unit marker MAY render as a wreck visual
- **AND** the underlying hex terrain SHALL NOT change because of battlefield wreckage conversion

#### Scenario: Excluded or light units do not create rough terrain

- **GIVEN** `tacops_battle_wreck` is enabled
- **WHEN** infantry, battle armor, protomek, or a unit below 40 tons is destroyed
- **THEN** the destroyed unit's hex terrain SHALL NOT change because of battlefield wreckage conversion

#### Scenario: Large support tank can create level-2 rough terrain

- **GIVEN** `tacops_battle_wreck` is enabled
- **AND** a represented large support tank profile is destroyed
- **WHEN** the destroyed unit's hex contains no rough terrain or only level-1 rough terrain
- **THEN** the destroyed unit's hex SHALL contain level-2 rough terrain
- **AND** other stacked terrain features on that hex SHALL be preserved

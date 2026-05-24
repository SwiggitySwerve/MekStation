# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Optional Battlefield Wreckage Terrain

Battlefield wreckage terrain conversion SHALL be event-sourced. When a live conversion changes the grid, the session event log SHALL include `TerrainChanged` with the resolved hex, terrain, optional elevation, previous terrain/elevation when known, `reason: 'battlefield_wreckage'`, `sourceUnitId`, and `sourceEventId`.

#### Scenario: Battlefield wreck terrain survives recovery

- **GIVEN** `tacops_battle_wreck` is enabled
- **AND** a destroyed heavy ground unit changes its hex to rough terrain
- **WHEN** the session is recovered from its event-derived state
- **THEN** the recovered interactive grid SHALL contain the same rough terrain at the destroyed unit's hex
- **AND** the `TerrainChanged` event SHALL identify the `UnitDestroyed` event that caused the terrain mutation

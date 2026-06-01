# Spec Delta: Game Session Management

## MODIFIED Requirements

### Requirement: Interactive Session Terrain Ownership

The interactive session SHALL own and expose the canonical combat grid used by the current battle. The initial `GameCreated` event emitted for that session SHALL carry non-default starting terrain/elevation in `payload.hexTerrain` so recovery consumers can rebuild the same grid from the event log.

#### Scenario: Session seed carries configured grid terrain

**GIVEN** `GameEngine` is created with a configured `IHexGrid`
**WHEN** `createInteractiveSession()` is called
**THEN** the resulting `GameCreated` event SHALL include non-default terrain and elevation from that grid in `payload.hexTerrain`
**AND** flat clear hexes SHALL be omitted from the seed payload

#### Scenario: Recovery combines initial terrain with later overrides

**GIVEN** a persisted session whose `GameCreated` event carries initial terrain
**AND** later events derive terrain overrides from `TerrainChanged`
**WHEN** `InteractiveSession.fromSession()` or `fromSessionAsync()` rebuilds the session
**THEN** `getGrid()` SHALL include the initial terrain seed plus the later terrain overrides

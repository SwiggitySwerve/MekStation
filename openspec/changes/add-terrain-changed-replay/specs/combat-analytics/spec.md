# Spec Delta: Combat Analytics

## MODIFIED Requirements

### Requirement: Replay State-From-Events Reducer Contract

The covered event families and their mutations SHALL include:

| Event type | Mutation |
|---|---|
| `TerrainChanged` | Upserts the changed hex into `hexTerrain` using `payload.hex`, `payload.terrain`, and `payload.elevation`. The mutation applies only when `event.sequence <= currentSequence`; earlier cursors SHALL NOT include the terrain change. |

#### Scenario: TerrainChanged projects replay hex terrain

- **GIVEN** an event log containing `GameCreated` followed by `TerrainChanged { hex: { q: 2, r: -1 }, terrain: 'rough', elevation: 1 }`
- **WHEN** the replay reducer walks to `currentSequence` at or after the `TerrainChanged` sequence
- **THEN** `hexTerrain` SHALL include the changed hex with rough terrain and elevation 1
- **AND** walking to a cursor before the `TerrainChanged` sequence SHALL leave `hexTerrain` unchanged

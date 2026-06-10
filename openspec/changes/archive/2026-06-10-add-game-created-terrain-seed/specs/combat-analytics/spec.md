# Spec Delta: Combat Analytics

## MODIFIED Requirements

### Requirement: Replay State-From-Events Reducer Contract

The covered event families and their mutations SHALL include:

| Event type | Mutation |
|---|---|
| `GameCreated` | Seeds the initial `tokens` array from `payload.units` and sets `mapRadius = payload.config.mapRadius`. When `payload.hexTerrain` is present, it SHALL also seed `hexTerrain` before later terrain mutations apply. |

#### Scenario: GameCreated seeds initial replay terrain

- **GIVEN** an event log containing `GameCreated` with `payload.hexTerrain` for a heavy-woods elevation-2 hex
- **WHEN** the replay reducer walks to sequence 0
- **THEN** `hexTerrain` SHALL include that heavy-woods elevation-2 hex
- **AND** later `TerrainChanged` events for the same coordinate SHALL override the seeded terrain at or after their sequence

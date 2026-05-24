# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Top-Down Terrain And Elevation Readability

Top-down tactical map mode SHALL present terrain and elevation from the same replay/recovery terrain seed used by the game session, so saved matches render the opening battlefield with the same readable terrain and elevation information as live play.

#### Scenario: Replay starts with seeded terrain and elevation

- **GIVEN** a replay event log whose `GameCreated` event carries `payload.hexTerrain`
- **WHEN** the replay map renders at sequence 0
- **THEN** top-down mode SHALL show the seeded terrain type and elevation number for those hexes
- **AND** the map SHALL retain the same terrain/elevation data when switching to isometric presentation mode

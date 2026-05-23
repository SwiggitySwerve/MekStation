# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Top-Down Terrain And Elevation Readability

Top-down tactical map mode SHALL present a clear board-game hex view where terrain type and elevation are easy to reference during movement and combat planning.

Each rendered hex SHALL expose terrain type and elevation. Elevation SHALL be visible as a readable number on or near the hex at playable zoom levels, while terrain visuals and overlays remain distinguishable.

#### Scenario: Cover overlay exposes terrain and elevation source context

- **GIVEN** the cover overlay is enabled on the tactical map
- **WHEN** a cover overlay marker renders for a hex
- **THEN** the marker SHALL expose the cover level without relying only on color
- **AND** the marker SHALL expose the primary terrain and represented terrain features used by the overlay
- **AND** the marker SHALL expose the hex elevation
- **AND** the marker accessible label SHALL include cover level, terrain, and elevation context

# tactical-map-interface Specification Delta

## MODIFIED Requirements

### Requirement: Hex Cell Composition

Each hex cell SHALL compose a terrain art layer and an elevation
shading layer beneath the existing interaction polygon.

#### Scenario: Hex cell includes art layer

- **GIVEN** a hex cell renders
- **WHEN** its layers compose
- **THEN** a `TerrainArtLayer` SHALL render beneath the hex polygon
- **AND** the hex polygon SHALL remain the primary hit target
- **AND** elevation shading SHALL apply to the fill beneath all art

#### Scenario: Overlays still render above terrain

- **GIVEN** a selected hex with movement-cost overlay visible
- **WHEN** the hex renders
- **THEN** terrain art SHALL render beneath the overlay
- **AND** the overlay text SHALL remain legible
- **AND** the unit token layer SHALL still render above everything

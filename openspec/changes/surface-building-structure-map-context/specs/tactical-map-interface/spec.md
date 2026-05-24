# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Terrain Visualization

The system SHALL render terrain types with distinct visual treatments based on terrain data.

#### Scenario: Building rendering exposes structure metadata

- **GIVEN** a hex has building terrain with represented level or construction factor metadata
- **WHEN** the hex renders and the player inspects terrain context
- **THEN** the hex SHALL expose building level metadata
- **AND** the hex SHALL expose construction factor metadata when available
- **AND** hover terrain context SHALL show the building level and construction factor when available
- **AND** exposing structure metadata SHALL NOT change movement, combat, LOS, cover, or physical attack legality

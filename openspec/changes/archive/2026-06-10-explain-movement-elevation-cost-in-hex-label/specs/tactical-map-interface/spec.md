# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Terrain and Elevation Labels

The system SHALL show readable terrain type and elevation reference labels on
hexes in both top-down and isometric projection modes. When a movement
projection applies to a hex, the hex explanation SHALL include the movement MP
cost, terrain MP cost when known, elevation delta when known, elevation MP cost
when known, and heat impact when known.

#### Scenario: Movement explanation includes elevation MP cost

**GIVEN** a destination hex has terrain and elevation data
**AND** movement projection supplies MP cost, terrain cost, elevation delta,
elevation cost, and heat
**WHEN** the tactical map renders that hex with tactical overlays
**THEN** the hex explanation SHALL include the movement MP cost
**AND** it SHALL include the terrain MP cost
**AND** it SHALL include the elevation delta
**AND** it SHALL include the elevation MP cost
**AND** it SHALL include the heat impact

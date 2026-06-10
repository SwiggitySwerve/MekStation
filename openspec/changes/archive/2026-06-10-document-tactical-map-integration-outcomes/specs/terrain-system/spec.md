# Spec Delta: Terrain System

## ADDED Requirements

### Requirement: Integrated Terrain And Elevation Projection

Terrain and elevation projection SHALL come from shared battlefield state for
movement, combat, LOS, visibility, top-down labels, and isometric stack
rendering rather than duplicated view-only interpretations.

#### Scenario: Terrain and elevation remain consistent across projections

- **GIVEN** a battlefield hex has represented terrain features, water depth,
  building levels, smoke/fire levels, wreck state, or elevation
- **WHEN** movement, combat, LOS, top-down labels, hover explanations, or
  isometric rendering inspect that hex
- **THEN** each surface SHALL report compatible terrain/elevation facts
- **AND** top-down labels SHALL keep the elevation number readable
- **AND** isometric layers and occluder/depth metadata SHALL reflect the same
  represented vertical facts.

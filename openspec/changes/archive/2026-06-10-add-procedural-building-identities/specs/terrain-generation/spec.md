# Spec Delta: Terrain Generation

## MODIFIED Requirements

### Requirement: Structure Placement

The terrain generator SHALL place represented structure features
deterministically from seeded preset feature directives.

#### Scenario: Generated building components expose stable identity

**GIVEN** preset feature directives generate building terrain
**WHEN** the terrain feature overlay finishes applying buildings and road
carving
**THEN** every remaining generated building hex SHALL have a positive building
level
**AND** every remaining generated building hex SHALL expose a stable
`buildingId`
**AND** orthogonally connected building hexes SHALL share the same `buildingId`
**AND** separate connected building components SHALL use distinct `buildingId`
values

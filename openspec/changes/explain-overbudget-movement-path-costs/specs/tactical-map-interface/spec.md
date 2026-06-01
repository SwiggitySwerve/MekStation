# tactical-map-interface Delta - explain-overbudget-movement-path-costs

## ADDED Requirements

### Requirement: Over-Budget Movement Path Cost Explanation

The tactical map SHALL distinguish terrain-blocked movement destinations from
terrain-legal destinations whose cheapest path exceeds the selected movement
mode's available MP. A terrain-legal over-budget ground destination SHALL be
reported as `InsufficientMP` with the diagnostic path's total MP cost and the
final step's terrain cost, elevation delta, and elevation cost. A direct terrain
blocker SHALL remain `TerrainBlocked`.

#### Scenario: Passable elevation route exceeds walk MP

**GIVEN** a ground unit previews a walking move to an in-bounds destination
**AND** a legal path exists to that destination when the MP cap is ignored
**WHEN** the legal path's movement cost exceeds the unit's selected walk MP
**THEN** the map SHALL render the destination as not reachable with
`InsufficientMP`
**AND** the destination SHALL expose total MP, terrain cost, elevation delta,
and elevation cost metadata from the diagnostic path
**AND** committed movement validation SHALL reject the same destination with the
same reason, details, MP cost, and heat

#### Scenario: Direct terrain block remains terrain blocked

**GIVEN** a tracked or wheeled unit previews direct entry into an adjacent
elevation change that exceeds its motive limit
**WHEN** the destination projection is derived
**THEN** the map SHALL preserve the terrain-blocked elevation reason
**AND** it SHALL NOT replace the blocker with an over-budget alternate-route
explanation

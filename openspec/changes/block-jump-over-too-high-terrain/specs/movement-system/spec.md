# Spec Delta: Movement System

## MODIFIED Requirements

### Requirement: Reachable Hex Derivation by MP Type

The movement system SHALL provide a `deriveReachableHexes(unit, mpType)`
function that returns every hex reachable with the given movement type
(Walk, Run, Jump), including the MP cost to each hex, using the existing A*
pathfinder.

#### Scenario: Jump path clearance blocks too-high represented terrain

- **GIVEN** a unit with represented Jump MP
- **AND** a target landing hex is within jump distance and has an otherwise legal base elevation
- **AND** the straight jump path crosses represented terrain or building height above the unit's origin elevation plus available Jump MP
- **WHEN** movement projection evaluates the landing hex
- **THEN** the landing hex SHALL be blocked with an explicit jump-clearance terrain-blocked reason
- **AND** the blocked projection SHALL keep jump terrain and elevation costs at 0
- **AND** committed movement validation SHALL reject the same supplied jump path with the same blocked reason
- **AND** ordinary jump landings that clear intervening terrain SHALL continue to ignore ground terrain costs

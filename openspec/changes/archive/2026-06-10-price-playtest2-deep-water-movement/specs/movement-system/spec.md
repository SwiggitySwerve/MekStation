# Spec Delta: Movement System

## MODIFIED Requirements

### Requirement: Reachable Hex Derivation by MP Type

The movement system SHALL provide a `deriveReachableHexes(unit, mpType)`
function that returns every hex reachable with the given movement type
(Walk, Run, Jump), including the MP cost to each hex, using the existing A*
pathfinder.

#### Scenario: Playtest2 deep-water movement costs use the represented option

- **GIVEN** a non-exempt movement step enters represented depth-2+ water
- **WHEN** the Playtest2 optional rule is disabled
- **THEN** the water-depth MP component SHALL remain the standard +3 MP
- **WHEN** the same movement step is projected with the represented Playtest2
  optional rule enabled
- **THEN** the water-depth MP component SHALL be +2 MP
- **AND** depth-1 water, amphibious, frogman, hover, VTOL, WiGE, naval, swim,
  and UMU water movement pricing SHALL keep their existing costs
- **AND** committed movement validation SHALL agree with the previewed
  Playtest2 deep-water MP cost for the same supplied path

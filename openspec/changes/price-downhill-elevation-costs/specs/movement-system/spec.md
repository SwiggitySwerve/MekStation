# Spec Delta: Movement System

## MODIFIED Requirements

### Requirement: Reachable Hex Derivation by MP Type

The movement system SHALL provide a `deriveReachableHexes(unit, mpType)`
function that returns every hex reachable with the given movement type
(Walk, Run, Jump), including the MP cost to each hex, using the existing A*
pathfinder.

#### Scenario: Ground elevation costs use absolute elevation change

- **GIVEN** a non-exempt ground movement step changes elevation upward or
  downward
- **WHEN** movement projection computes the step cost
- **THEN** the elevation MP component SHALL be based on the absolute elevation
  delta
- **AND** represented ground vehicles and non-flying infantry SHALL double that
  elevation MP component
- **AND** over-limit downhill changes SHALL be blocked with the same explicit
  terrain-blocked projection reason as over-limit climbs
- **AND** committed ground movement validation SHALL agree with the previewed
  downhill MP cost or blocked reason for the same supplied path
- **AND** top-down movement cost badges SHALL show downhill steps as a paid
  positive elevation MP cost with a distinct down-direction delta label
- **AND** VTOL, WiGE, jump, naval, and swim movement SHALL keep their existing
  elevation-cost exemptions

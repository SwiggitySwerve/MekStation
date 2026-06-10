# Spec Delta: Movement System

## MODIFIED Requirements

### Requirement: Reachable Hex Derivation by MP Type

The movement system SHALL provide a `deriveReachableHexes(unit, mpType)`
function that returns every hex reachable with the given movement type
(Walk, Run, Jump), including the MP cost to each hex, using the existing A*
pathfinder.

#### Scenario: Playtest2 Mek-style running may enter water after the first step

- **GIVEN** represented Mek-style ground movement declares Run
- **AND** the run path enters water after its first step
- **WHEN** the Playtest2 optional rule is disabled
- **THEN** the movement projection SHALL block that path with the standard water
  terrain-blocked reason
- **WHEN** the same path is projected with the represented Playtest2 optional
  rule enabled
- **THEN** the movement projection SHALL allow the run-water path
- **AND** infantry-profile, vehicle, naval, hover, VTOL, WiGE, UMU, swim,
  amphibious, bridge, and ice water movement rules SHALL keep their existing
  legality behavior
- **AND** committed movement validation SHALL agree with the previewed
  Playtest2 run-water legality and MP cost for the same supplied path

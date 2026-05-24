# Spec Delta: Movement System

## MODIFIED Requirements

### Requirement: Reachable Hex Derivation by MP Type

The movement system SHALL provide a `deriveReachableHexes(unit, mpType)`
function that returns every hex reachable with the given movement type
(Walk, Run, Jump), including the MP cost to each hex, using the existing A*
pathfinder.

#### Scenario: Imported unit height feeds bridge clearance

- **GIVEN** a represented unit has an explicit imported entity height or a
  source-derived entity height for a supported Mek, VTOL, tank, small craft, or
  dropship class
- **AND** LAM and QuadVee conversion-mode data, when represented, can change the
  source-derived entity height
- **AND** the unit's movement capability is used for movement projection
- **WHEN** naval, hydrofoil, or submarine bridge-clearance movement is projected
  across represented water and bridge terrain
- **THEN** the projection SHALL use the imported entity height for the
  bridge-clearance decision
- **AND** the committed movement validation SHALL reject or accept the same
  supplied path with the same bridge-clearance result

# Spec Delta: Movement System

## MODIFIED Requirements

### Requirement: Reachable Hex Derivation by MP Type

The movement system SHALL provide a `deriveReachableHexes(unit, mpType)`
function that returns every hex reachable with the given movement type
(Walk, Run, Jump), including the MP cost to each hex, using the existing A*
pathfinder.

#### Scenario: Imported unit height feeds bridge clearance

- **GIVEN** a represented unit has an explicit imported entity height or a
  source-derived entity height for a supported Mek, VTOL, tank, small craft,
  dropship, or conventional infantry mount class
- **AND** LAM and QuadVee conversion-mode data, when represented, can change the
  source-derived entity height
- **AND** represented conventional infantry mount height, beast-size, or
  MegaMek mount identity data can source-derive the infantry entity height
- **AND** later runtime state may override the imported height directly, switch
  a LAM/QuadVee conversion mode, or mount/dismount conventional infantry
- **AND** the unit's movement capability is used for movement projection
- **WHEN** naval, hydrofoil, or submarine bridge-clearance movement is projected
  across represented water and bridge terrain
- **THEN** the projection SHALL use the runtime-resolved entity height, falling
  back to the imported entity height when no runtime override is present, for
  the bridge-clearance decision
- **AND** the committed movement validation SHALL reject or accept the same
  supplied path with the same bridge-clearance result

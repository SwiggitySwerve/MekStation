# hex-coordinate-system Delta — consolidate-equipment-and-hex-duplication

## MODIFIED Requirements

### Requirement: Distance Calculation

The system SHALL calculate hex distance using the axial distance formula, and
SHALL expose exactly one shared `hexDistance` implementation. Every consumer
SHALL import that single implementation; any other same-named distance export
SHALL be a re-export shim that delegates to it (adapting argument shape only),
never an independent copy.

#### Scenario: Distance from origin

- **WHEN** calculating distance from (0,0) to (3,2)
- **THEN** distance SHALL be 5 hexes

#### Scenario: Distance calculation formula

- **WHEN** calculating distance between two hexes
- **THEN** distance SHALL equal max(|dq|, |dr|, |dq + dr|)
- **AND** distance from (1,1) to (4,3) SHALL be 3
- **AND** distance from (-2,3) to (2,-1) SHALL be 6

#### Scenario: Zero distance

- **WHEN** calculating distance from (2,3) to (2,3)
- **THEN** distance SHALL be 0

#### Scenario: Cube distance equivalence

- **WHEN** calculating distance using cube coordinates
- **THEN** result SHALL equal axial distance calculation
- **AND** cube distance SHALL equal max(|dx|, |dy|, |dz|)

#### Scenario: Single shared distance implementation

- **GIVEN** multiple modules previously held their own `hexDistance` copy
- **WHEN** any module computes hex distance after this change
- **THEN** it SHALL call the single shared `hexDistance` implementation
- **AND** every alternative same-named export SHALL be a re-export shim returning
  the identical result for any coordinate pair.

## ADDED Requirements

### Requirement: Pixel-Hex Conversion

The system SHALL provide exactly one live pixel-to-hex picker and one live
hex-to-pixel converter, located in a single layout module. The live picker SHALL
round fractional coordinates through the cube constraint so that the selected
hex always satisfies q + r + s = 0. No dead or divergent pixel-conversion helper
SHALL remain; additional same-named exports SHALL be re-export shims.

#### Scenario: Picker preserves the cube constraint

- **GIVEN** a pixel position near a tile boundary whose independently rounded
  fractional q and r would violate q + r + s = 0
- **WHEN** the live pixel-to-hex picker converts that pixel
- **THEN** the returned hex SHALL satisfy q + r + s = 0
- **AND** the returned hex SHALL be the cube-correct nearest hex.

#### Scenario: Dead cube-rounding picker is removed

- **GIVEN** an unused cube-rounding picker existed alongside the live picker
- **WHEN** the codebase is inspected after this change
- **THEN** the dead picker SHALL be deleted
- **AND** its correct cube-rounding algorithm SHALL be the one the live picker
  uses.

#### Scenario: Single hex-to-pixel home

- **GIVEN** multiple components previously held their own `hexToPixel` copy
- **WHEN** any component converts a hex coordinate to a pixel position
- **THEN** it SHALL import the single layout `hexToPixel` export
- **AND** every alternative same-named export SHALL be a re-export shim.

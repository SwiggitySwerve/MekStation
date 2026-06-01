# tactical-map-interface Delta - pin-lam-airmek-movement-heat-projection

## ADDED Requirements

### Requirement: LAM AirMek Movement Heat Projection

The tactical map SHALL resolve represented LAM runtime AirMek conversion state to an AirMek-specific movement heat profile before deriving movement overlays and committed movement validation. AirMek walk and run heat SHALL be derived from used movement points divided by three, rounded to the nearest integer, with a minimum basis of three movement points for represented standard jump heat.

#### Scenario: Long AirMek cruise reports source-backed movement heat

**GIVEN** a tactical-map browser harness renders a LAM in represented AirMek conversion state
**AND** the selected destination is reachable at six AirMek movement points
**WHEN** the map derives walking movement projection for that destination
**THEN** the map SHALL render the destination as reachable with WiGE movement, 6 MP, and 2 generated heat
**AND** committed movement validation SHALL accept the same destination with the same path, MP cost, and generated heat

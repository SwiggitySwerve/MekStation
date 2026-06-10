# tactical-map-interface Delta — pin-lam-airmek-conversion-movement-projection

## ADDED Requirements

### Requirement: LAM AirMek Runtime Conversion Movement Projection

The tactical map SHALL resolve represented LAM runtime AirMek conversion state before deriving movement overlays and committed movement validation. AirMek conversion SHALL use WiGE movement for terrain/elevation projection, SHALL derive walking/cruise MP from Jump MP times three, SHALL derive running/flank MP from the AirMek cruise MP times 1.5 rounded up, and SHALL use unit height 0.

#### Scenario: LAM AirMek conversion changes movement projection and commit legality

**GIVEN** a tactical-map browser harness renders a LAM with a runtime conversion profile and a destination elevation route
**WHEN** the LAM remains in Mek mode
**THEN** the map shows the destination as blocked for walking with the Mek-mode movement reason and committed movement validation rejects the same destination with matching reason, MP, and heat
**WHEN** the same represented LAM is in AirMek mode
**THEN** the map shows WiGE movement, AirMek cruise/flank MP, elevation cost 0, and a reachable destination
**AND** committed movement validation accepts the same destination with matching MP, heat, and path

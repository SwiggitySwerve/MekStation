# tactical-map-interface Delta - pin-lam-fighter-grounded-movement-projection

## ADDED Requirements

### Requirement: Grounded LAM Fighter Runtime Conversion Movement Projection

The tactical map SHALL resolve represented LAM runtime Fighter conversion state before deriving movement overlays and committed movement validation. A grounded Fighter conversion SHALL use grounded aerospace terrain restrictions represented as wheeled/taxing movement, SHALL derive walking/cruise MP from current thrust halved while grounded, SHALL derive running/flank MP as equal to grounded cruise MP, SHALL make jump movement unavailable, and SHALL use unit height 0.

#### Scenario: Grounded LAM Fighter conversion blocks abrupt elevation entry

**GIVEN** a tactical-map browser harness renders a LAM in represented grounded Fighter conversion state
**AND** the selected destination is adjacent with an elevation increase greater than grounded wheeled/taxing movement allows
**WHEN** the map derives walking movement projection for that destination
**THEN** the map SHALL render the destination as not reachable with `TerrainBlocked`
**AND** the destination SHALL expose wheeled movement mode, zero terrain cost, elevation delta, elevation cost, and the elevation blocked reason
**AND** the movement legend SHALL expose grounded Fighter cruise/flank MP with jump unavailable
**AND** committed movement validation SHALL reject the same destination with the same reason, details, MP cost, and heat

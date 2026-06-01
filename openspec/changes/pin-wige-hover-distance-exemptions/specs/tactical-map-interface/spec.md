# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Movement Projection

Movement overlays SHALL be derived from shared movement projection data and
SHALL explain legal, blocked, and consequential movement outcomes before the
player commits them.

#### Scenario: WiGE hover and prior-distance exemptions match the engine

- **GIVEN** a selected represented positive-altitude WiGE unit has legal
  movement destinations in top-down or isometric mode
- **WHEN** the projected destination uses hover-style movement or the unit's
  accumulated movement distance already reaches the source-backed WiGE minimum
- **THEN** the destination SHALL NOT expose automatic-landing metadata
- **AND** the destination SHALL NOT render the automatic landing `LAND` badge
  or automatic-landing tooltip row
- **AND** committed movement to the same destination SHALL preserve altitude
  rather than replaying an automatic landing patch.

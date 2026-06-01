# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Movement Projection

Movement overlays SHALL be derived from shared movement projection data and
SHALL explain legal, blocked, and consequential movement outcomes before the
player commits them.

#### Scenario: WiGE building climb costs are visible before commit

- **GIVEN** a selected represented landed WiGE unit can enter a higher
  represented building-top hex
- **WHEN** the player previews the destination in top-down or isometric mode
- **THEN** the map's movement projection SHALL include the +2 MP WiGE
  climb-mode surcharge in the displayed destination cost
- **AND** over-budget destinations caused by that surcharge SHALL be shown as
  illegal with the same insufficient-MP reason the engine would return.

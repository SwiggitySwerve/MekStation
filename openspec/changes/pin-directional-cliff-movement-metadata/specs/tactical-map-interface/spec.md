# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Movement Projection

Movement overlays SHALL be derived from shared movement projection data and
SHALL explain legal, blocked, and consequential movement outcomes before the
player commits them.

#### Scenario: Encoded cliff movement appears in map projection

- **GIVEN** a selected represented unit previews movement across an encoded
  directional cliff edge
- **WHEN** the movement mode is WiGE, tracked, wheeled, or hover
- **THEN** the destination projection SHALL expose the same added cost or
  terrain-blocked reason that committed movement validation would apply
- **AND** ordinary elevation changes without cliff metadata SHALL continue to
  display as non-cliff movement.

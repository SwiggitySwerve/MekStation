# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rule-Backed Movement Highlight Projection

Movement highlights SHALL be sourced from shared movement projection metadata
that agrees with committed movement validation and resolution.

#### Scenario: Destroyed gyro stand-up explanation appears before commit

- **GIVEN** a prone Mek with a represented standard destroyed gyro is selected
- **WHEN** the player previews ground movement
- **THEN** affected hexes SHALL be rendered as blocked/unreachable
- **AND** the hex metadata, badge, and hover explanation SHALL expose
  `Cannot stand with a destroyed gyro`
- **AND** the map SHALL NOT present the destination as a rollable legal move

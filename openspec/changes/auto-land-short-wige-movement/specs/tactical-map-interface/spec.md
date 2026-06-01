# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

Positive-altitude WiGE-style movement projections SHALL expose MegaMek's
short-distance automatic landing rule as part of the same movement highlight
data used for MP, terrain, elevation, heat, and blocked reasons.

#### Scenario: Short elevated WiGE movement previews automatic landing

- **GIVEN** a selected positive-altitude WiGE-style unit has a legal non-jump
  movement path shorter than MegaMek's minimum airborne distance
- **WHEN** the tactical map projects that destination
- **THEN** the destination SHALL remain reachable when its MP cost is legal
- **AND** the projection SHALL explain that the unit will automatically land at
  movement end instead of requiring the player to infer that consequence.

#### Scenario: Exempt elevated WiGE movement does not preview automatic landing

- **GIVEN** a selected positive-altitude WiGE-style unit has jumped or just used
  represented altitude-control steps this movement phase
- **WHEN** the tactical map projects a destination
- **THEN** the movement projection SHALL NOT claim automatic landing will occur.

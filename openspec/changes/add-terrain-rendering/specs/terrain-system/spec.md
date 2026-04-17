# terrain-system Specification Delta

## MODIFIED Requirements

### Requirement: Terrain Type Visual Metadata

Each terrain type SHALL declare a `visualKey` that identifies the art
asset used for rendering.

#### Scenario: visualKey present on every terrain type

- **GIVEN** the terrain registry
- **WHEN** listing terrain types
- **THEN** every type SHALL expose a `visualKey` string
- **AND** the key SHALL match an entry in `terrainVisualMap`
- **AND** the key SHALL be stable across persistence (saved games still
  render correctly after art updates)

#### Scenario: Density variants expose distinct visualKeys

- **GIVEN** a terrain type with density variants (woods: light/heavy;
  building: light/medium/heavy/hardened)
- **WHEN** retrieving its `visualKey`
- **THEN** each density variant SHALL map to its own key
- **AND** the key SHALL NOT depend on runtime state

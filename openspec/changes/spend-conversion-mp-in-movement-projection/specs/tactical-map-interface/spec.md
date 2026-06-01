# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked. Runtime unit-state fields that alter rules height, motive behavior, or
same-activation movement budget SHALL be replayable gameplay state, and
movement projection plus commit validation SHALL consume the same replayed
state.

#### Scenario: Conversion MP is spent before later movement projection

- **GIVEN** a selected movement-phase unit has replayed a represented
  conversion action with conversion step count and MP cost metadata
- **WHEN** the map projects a later movement destination for that same unit
- **THEN** the destination MP cost SHALL include the pending conversion MP
- **AND** the destination legality SHALL be evaluated against the remaining MP
  after pending conversion steps
- **AND** committed movement validation SHALL accept or reject the destination
  using the same conversion-adjusted cost, path, heat, invalid reason, and
  details as the rendered projection
- **AND** the committed movement event SHALL expose represented conversion
  steps before later path movement and clear the pending conversion reserve from
  replayed unit state.

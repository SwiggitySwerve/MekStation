# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, pending conversion step/cost
metadata where applicable, and invalid reason when blocked.

#### Scenario: Pending conversion steps are visible on movement hexes

- **GIVEN** a projected movement destination includes pending conversion
  metadata such as `conversionStepCount` and `conversionMpCost`
- **WHEN** the top-down map renders the reachable movement hex and the player
  hovers it
- **THEN** the hex, movement badge, movement projection overlay, and tooltip
  SHALL expose the conversion step count and MP cost as non-color metadata
- **AND** the tooltip SHALL include a readable conversion row before path
  context so the player can understand that the destination movement follows
  represented conversion commands.

# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked.

#### Scenario: Runtime movement action availability matches commit capability

- **GIVEN** a unit was imported with static movement capability
- **AND** its represented runtime state changes movement capability before
  movement is declared, such as a LAM changing from Mek mode to AirMek mode
- **WHEN** the engine exposes available movement actions for that unit
- **THEN** available movement destinations SHALL be derived from the runtime
  capability used by movement projection and commit validation
- **AND** committing a destination from that available-action set SHALL produce
  matching path, MP cost, heat, and movement legality.

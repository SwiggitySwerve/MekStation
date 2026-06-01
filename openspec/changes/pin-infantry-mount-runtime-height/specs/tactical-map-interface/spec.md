# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked. Runtime unit-state fields that alter rules height SHALL be resolved
before movement projection and commit validation compute height-sensitive
movement legality.

#### Scenario: Infantry dismount state clears mounted height

- **GIVEN** a represented conventional infantry unit has an imported mounted
  height profile
- **AND** the live unit state later marks `infantryMounted` as `false`
- **AND** a stale runtime `unitHeight` still reflects the previous mounted
  silhouette
- **WHEN** the map projects a height-sensitive movement destination
- **THEN** the projection SHALL resolve the unit as height 0
- **AND** committed movement SHALL use the same resolved height and legality
  result.

#### Scenario: Mounted infantry keeps represented mount height

- **GIVEN** a represented conventional infantry unit has an imported mounted
  height profile
- **AND** the live unit state marks `infantryMounted` as `true`
- **WHEN** the map projects a height-sensitive movement destination
- **THEN** the projection SHALL use the explicit runtime mount height when
  present
- **AND** otherwise use the imported mounted height profile
- **AND** committed movement SHALL match the projection result.

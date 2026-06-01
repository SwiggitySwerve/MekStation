# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked. Runtime unit-state fields that alter rules height or motive behavior
SHALL be replayable gameplay state, and movement projection plus commit
validation SHALL consume the same replayed state. The movement command surface
SHALL expose supported runtime state controls when the active unit carries a
represented conversion or infantry mount profile, and those controls SHALL
dispatch through replayable runtime movement-state events.

#### Scenario: Conversion command refreshes movement projection state

- **GIVEN** a selected movement-phase unit has a represented LAM or QuadVee
  conversion profile
- **WHEN** the player chooses another conversion mode from the tactical command
  surface
- **THEN** the command SHALL dispatch a runtime movement-state event with
  `source: "conversion_action"`
- **AND** stale explicit `unitHeight` SHALL be cleared from the patch
- **AND** movement planning SHALL stay active for the selected unit so the map
  can recalculate legal destinations from the replayed mode.

#### Scenario: Infantry mount command refreshes movement projection state

- **GIVEN** a selected movement-phase conventional infantry unit has a
  represented infantry mount profile
- **WHEN** the player chooses mount or dismount from the tactical command
  surface
- **THEN** the command SHALL dispatch a runtime movement-state event with
  `source: "infantry_mount_action"`
- **AND** movement planning SHALL stay active for the selected unit so the map
  can recalculate legal destinations from the replayed mounted state.

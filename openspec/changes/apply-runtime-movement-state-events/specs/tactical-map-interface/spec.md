# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked. Runtime unit-state fields that alter rules height or motive behavior
SHALL be replayable gameplay state, and movement projection plus commit
validation SHALL consume the same replayed state.

#### Scenario: Runtime movement state event updates projection

- **GIVEN** a represented conventional infantry unit is mounted and has a
  height-sensitive movement destination
- **WHEN** a runtime movement-state event marks the unit as dismounted
- **THEN** replayed unit state SHALL carry `infantryMounted: false`
- **AND** the map movement projection SHALL resolve the unit as height 0
- **AND** committed movement validation SHALL use the same replayed state and
  legality result.

#### Scenario: Conversion event can clear stale explicit height

- **GIVEN** a represented conversion-capable unit has a stale generic
  `unitHeight` override
- **WHEN** a runtime movement-state event changes its conversion mode and
  clears `unitHeight`
- **THEN** replayed unit state SHALL remove the stale `unitHeight`
- **AND** later projection and commit validation SHALL derive height from the
  conversion profile instead of the stale explicit override.

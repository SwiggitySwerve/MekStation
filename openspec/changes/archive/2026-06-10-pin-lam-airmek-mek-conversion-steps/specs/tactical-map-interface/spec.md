# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked. Runtime conversion actions SHALL expose the represented conversion
step count and MP cost consumed by later movement projection and movement-event
serialization.

#### Scenario: LAM AirMek-to-Mek conversion carries two represented steps

- **GIVEN** a represented standard LAM is currently in AirMek conversion mode
- **WHEN** the player selects the conversion action back to Mek mode
- **THEN** the tactical command SHALL emit runtime movement-state metadata with
  `conversionMode` set to `mek`, `conversionStepCount` set to `2`, and
  `conversionMpCost` set to `0`
- **AND** the next movement projection SHALL retain those two pending
  conversion steps without adding MP cost
- **AND** the committed movement event SHALL serialize two `convertMode` steps
  before path movement so replay and UI explanation agree with the rules-backed
  conversion sequence.

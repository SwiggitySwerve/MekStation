# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode,
cumulative MP cost, terrain cost, elevation delta/cost, heat impact where
applicable, path/facing preview where applicable, and invalid reason when
blocked.

#### Scenario: Same-hex movement modes remain visible

- **GIVEN** a map receives more than one movement projection for the same hex
- **AND** the projections represent different movement types such as walk, run,
  or jump
- **WHEN** the hex is rendered and its shared tactical projection explanation is
  exposed
- **THEN** the primary projection SHALL remain deterministic and rules-backed
- **AND** the hex SHALL expose every same-hex movement option's type, MP cost,
  reachability, motive mode, and heat impact as metadata
- **AND** the movement badge SHALL identify that multiple movement types can
  reach or evaluate the same hex

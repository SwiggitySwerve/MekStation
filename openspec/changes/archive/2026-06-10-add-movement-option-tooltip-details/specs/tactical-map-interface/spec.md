# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Movement Projection Detail Surface

For each projected movement hex, the map SHALL expose at least movement mode, cumulative MP cost, terrain cost, elevation delta/cost, heat impact where applicable, path/facing preview where applicable, and invalid reason when blocked.

#### Scenario: Movement tooltip summarizes same-hex options

- **GIVEN** a map receives multiple movement projections for the same hex
- **AND** those options differ by movement type, motive mode, MP cost, terrain cost, elevation delta/cost, heat impact, reachability, or blocked reason
- **WHEN** the player hovers that movement hex
- **THEN** the movement tooltip SHALL list each movement option with its reachability, MP cost, terrain cost, elevation delta/cost, heat impact, and blocked reason when blocked
- **AND** blocked option rows SHALL expose stable invalid reason and invalid detail metadata from the movement projection
- **AND** the tooltip SHALL expose stable aggregate metadata for option count, types, costs, states, blocked reasons, invalid reasons, and invalid details
- **AND** the tooltip SHALL read those rows from the shared movement projection data rather than recalculating movement legality

#### Scenario: Combined tactical tooltip preserves movement options

- **GIVEN** a hex has both movement projection data and combat projection data
- **AND** the movement projection includes same-hex movement options
- **WHEN** the player hovers the combined tactical hex
- **THEN** the combined tactical tooltip SHALL include the same per-option movement rows without replacing combat context

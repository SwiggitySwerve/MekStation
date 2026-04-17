# movement-system (delta)

## ADDED Requirements

### Requirement: Movement Generates Heat

Movement SHALL generate heat per the canonical rules and add it to the unit's heat accumulator for the current turn.

#### Scenario: Walking adds 1 heat

- **GIVEN** a unit that walked any distance this turn
- **WHEN** movement resolves
- **THEN** +1 heat SHALL be added

#### Scenario: Running adds 2 heat

- **GIVEN** a unit that ran this turn
- **WHEN** movement resolves
- **THEN** +2 heat SHALL be added

#### Scenario: Jump heat is max(3, jumpMP used)

- **GIVEN** a unit that jumped using 5 jump MP
- **WHEN** movement resolves
- **THEN** +5 heat SHALL be added

#### Scenario: Minimum jump heat of 3

- **GIVEN** a unit that jumped using 2 jump MP
- **WHEN** movement resolves
- **THEN** +3 heat SHALL be added (clamped at 3)

#### Scenario: Stationary unit generates no movement heat

- **GIVEN** a unit that did not move
- **WHEN** movement resolves
- **THEN** no heat SHALL be added from movement

### Requirement: Heat Reduces Effective Movement

Effective walk and run MP SHALL be reduced by `floor(heat / 5)` each turn the unit has heat.

#### Scenario: Heat 9 reduces MP by 1

- **GIVEN** a unit with walk 5, run 8, heat 9
- **WHEN** effective MP is computed
- **THEN** effective walk SHALL be 4
- **AND** effective run SHALL be 7

#### Scenario: Heat 15 reduces MP by 3

- **GIVEN** a unit with walk 5, heat 15
- **WHEN** effective MP is computed
- **THEN** effective walk SHALL be 2

#### Scenario: TSM interaction

- **GIVEN** a unit with walk 5 and TSM active at heat 9
- **WHEN** effective MP is computed
- **THEN** effective walk SHALL be 6 (5 base + 2 TSM - 1 heat)

# movement-system Spec Delta

## MODIFIED Requirements

### Requirement: Heat MP Reduction

Heat SHALL reduce available walking movement points using the formula `floor(heat / 5)`. Available running and sprinting MP SHALL be re-derived from the heat-adjusted walk MP (`run = ceil(adjustedWalk * 1.5)`; `sprint = adjustedWalk * 2` without active MP boosters), never by subtracting the penalty from the pre-derived run or sprint values. Jump MP SHALL NOT be reduced by heat.

#### Scenario: Heat 9 reduces MP by 1

- **WHEN** a unit has heat level 9
- **THEN** available walking MP SHALL be reduced by `floor(9 / 5) = 1`
- **AND** available running MP SHALL be re-derived from the reduced walk MP

#### Scenario: Heat 15 reduces MP by 3

- **WHEN** a unit has heat level 15
- **THEN** available walking MP SHALL be reduced by `floor(15 / 5) = 3`
- **AND** available running MP SHALL be re-derived from the reduced walk MP

#### Scenario: Heat does not reduce MP below 0

- **WHEN** a unit with Walk 2 has heat level 15 (reduction of 3)
- **THEN** available Walk MP SHALL be 0 (not negative)
- **AND** the unit SHALL be unable to walk or run

#### Scenario: Run MP derives from heat-adjusted walk, not raw subtraction

- **WHEN** a unit with walk 5 and run 8 has heat level 10 (penalty 2)
- **THEN** available walk MP SHALL be 3
- **AND** available run MP SHALL be `ceil(3 * 1.5) = 5` (not `8 - 2 = 6`)

#### Scenario: Jump MP is heat-immune

- **WHEN** a unit with jump 4 has heat level 15 (penalty 3)
- **THEN** available jump MP SHALL remain 4

### Requirement: Heat Reduces Effective Movement

Effective walk MP SHALL be reduced by `floor(heat / 5)` each turn the unit has heat. Effective run and sprint MP SHALL be re-derived from the heat-adjusted walk MP (`run = ceil(adjustedWalk * 1.5)`; `sprint = adjustedWalk * 2` without active MP boosters). Effective jump MP SHALL NOT be reduced by heat.

#### Scenario: Heat 9 reduces effective MP by 1

- **GIVEN** a unit with walk 5, run 8, heat 9
- **WHEN** effective MP is computed
- **THEN** effective walk SHALL be 4
- **AND** effective run SHALL be `ceil(4 * 1.5) = 6`

#### Scenario: Heat 15 reduces effective MP by 3

- **GIVEN** a unit with walk 5, heat 15
- **WHEN** effective MP is computed
- **THEN** effective walk SHALL be 2

#### Scenario: TSM interaction

- **GIVEN** a unit with walk 5 and TSM active at heat 9
- **WHEN** effective MP is computed
- **THEN** effective walk SHALL be 6 (5 base + 2 TSM - 1 heat)

#### Scenario: Run derives from heat-adjusted walk at heat 10

- **GIVEN** a unit with walk 5, run 8, heat 10
- **WHEN** effective MP is computed
- **THEN** effective walk SHALL be 3
- **AND** effective run SHALL be `ceil(3 * 1.5) = 5` (not `8 - 2 = 6`)

#### Scenario: Jump MP unaffected by heat

- **GIVEN** a unit with walk 5, jump 5, heat 10
- **WHEN** effective MP is computed
- **THEN** effective jump SHALL remain 5

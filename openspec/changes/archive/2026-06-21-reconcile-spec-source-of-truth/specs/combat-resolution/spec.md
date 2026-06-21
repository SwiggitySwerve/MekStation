# combat-resolution Delta — reconcile-spec-source-of-truth

## MODIFIED Requirements

### Requirement: ACAR System

The system SHALL provide Auto-Calculate and Resolve (ACAR) combat resolution for scenarios
without tactical gameplay. ACAR victory probability SHALL be computed with the linear
Battle-Value odds model `playerBV / (playerBV + opponentBV)`, and the spec SHALL NOT assert a
victory probability the linear model cannot produce.

#### Scenario: Calculate force BV

- **GIVEN** a force with 4 units having BV values [1897, 1220, 1101, 432]
- **WHEN** calculateForceBV is called
- **THEN** total BV of 4650 is returned

#### Scenario: Calculate victory probability

- **GIVEN** player force BV 5000 and opponent force BV 5000
- **WHEN** calculateVictoryProbability is called
- **THEN** probability is approximately 0.5 (50% chance)

#### Scenario: Higher BV increases win chance

- **GIVEN** player force BV 8000 and opponent force BV 4000 (2:1 ratio)
- **WHEN** calculateVictoryProbability is called
- **THEN** probability SHALL equal `8000 / (8000 + 4000)`, i.e. approximately 0.667 (2/3)
- **AND** the result SHALL be greater than 0.5 (higher BV favours the player) but SHALL NOT
  exceed the linear ceiling — the previously documented `> 0.7` claim is removed because the
  shipped linear model at `src/lib/combat/acar.ts` cannot produce it for a 2:1 ratio.

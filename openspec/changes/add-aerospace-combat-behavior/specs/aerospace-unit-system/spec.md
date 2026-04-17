# aerospace-unit-system (delta)

## ADDED Requirements

### Requirement: Aerospace Combat State

Aerospace units SHALL carry a combat state struct updated by the combat engine.

#### Scenario: Combat state shape

- **GIVEN** any `IAerospaceUnit`
- **WHEN** combat begins
- **THEN** `unit.combatState.aero` SHALL contain `currentSI`, `armorByArc`, `heat`, `fuelRemaining`, `controlRollsFailed`, `thrustPenalty`, `offMap`, `offMapReturnTurn`

#### Scenario: SI capped by max

- **GIVEN** an ASF with construction SI 6 that takes negative-damage events (e.g., repair mid-combat, future)
- **WHEN** SI changes
- **THEN** `currentSI` SHALL never exceed the unit's construction SI

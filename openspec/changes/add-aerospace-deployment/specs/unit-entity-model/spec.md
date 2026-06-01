# Spec Delta: Unit Entity Model — Aerospace Altitude + Velocity

## MODIFIED Requirements

### Requirement: Component References

The unit entity SHALL reference components by type. Aerospace units' component references SHALL additionally include the runtime combat-state fields `altitude`, `currentVelocity`, `nextVelocity`, and `airborneState` introduced by the `aerospace-deployment` capability. These fields SHALL be part of the aerospace unit's combat-state slice (per the extended `IAerospaceCombatState` interface in `aerospace-deployment`).

#### Scenario: Component composition for non-aerospace units (unchanged)

- **WHEN** a unit contains components
- **THEN** engine, gyro, cockpit SHALL be single references
- **AND** equipment SHALL be array of placed items
- **AND** armor SHALL be allocation per location

#### Scenario: Aerospace unit combat-state includes altitude + velocity

- **GIVEN** an aerospace unit (`IAerospace | IConventionalFighter | ISmallCraft`) entering combat
- **WHEN** combat state is initialized
- **THEN** `unit.combatState.aero` SHALL include `altitude: number`, `currentVelocity: number`, `nextVelocity: number`, `airborneState: 'grounded' | 'taking-off' | 'airborne' | 'landing'`
- **AND** these fields SHALL be in addition to the existing `currentSI`, `armorByArc`, `heat`, `fuelRemaining`, `controlRollsFailed`, `thrustPenalty`, `offMap`, `offMapReturnTurn` fields per the existing `aerospace-unit-system → Aerospace Combat State` requirement

#### Scenario: Tactical map token projects current velocity

- **GIVEN** an aerospace unit combat state with `altitude = 4` and `currentVelocity = 7`
- **WHEN** the shared `unitStateToToken` adapter creates the tactical-map token
- **THEN** the token SHALL include `altitude: 4`
- **AND** the token SHALL include `velocity: 7`
- **AND** the tactical-map aerospace token SHALL render the altitude badge and velocity vector from those state-derived values

#### Scenario: Grounded aero default combat-state

- **GIVEN** an aerospace unit that has not yet taken off in a scenario
- **WHEN** combat state is initialized
- **THEN** `altitude` SHALL be 0
- **AND** `currentVelocity` SHALL be 0
- **AND** `nextVelocity` SHALL be 0
- **AND** `airborneState` SHALL be `'grounded'`

# combat-resolution (delta)

## ADDED Requirements

### Requirement: Vehicle Combat Dispatch

The combat resolution engine SHALL route vehicle targets to a vehicle-specific damage pipeline distinct from the BattleMech path.

#### Scenario: Vehicle target routing

- **GIVEN** an attack whose target has `unitType === UnitType.VEHICLE`, `VTOL`, or `SUPPORT_VEHICLE`
- **WHEN** the engine resolves the hit
- **THEN** `vehicleResolveDamage()` SHALL be invoked (not the mech `resolveDamage`)
- **AND** vehicle-specific hit-location and crit tables SHALL be used

#### Scenario: Mech target unchanged

- **GIVEN** an attack whose target is a BattleMech
- **WHEN** the engine resolves the hit
- **THEN** the existing BattleMech pipeline SHALL continue unchanged

### Requirement: Vehicle Motive Damage Roll

When damage exposes structure at a vehicle's Front, Side, or Rear location, the system SHALL roll for motive damage.

#### Scenario: Motive roll on structure exposure

- **GIVEN** a tracked vehicle whose Side location reaches internal structure
- **WHEN** the hit is resolved
- **THEN** the engine SHALL roll 2d6 against the motive-damage table
- **AND** the resulting motive penalty SHALL be applied to the vehicle's cruise MP

#### Scenario: Motive table outcomes

- **WHEN** the 2d6 roll is evaluated
- **THEN** 2-5 SHALL apply no effect
- **AND** 6-7 SHALL apply -1 cruise MP (minor)
- **AND** 8-9 SHALL apply -2 cruise MP (moderate)
- **AND** 10-11 SHALL apply -3 cruise MP (heavy)
- **AND** 12 SHALL immobilize the vehicle

#### Scenario: Hover motive sensitivity

- **GIVEN** a Hover vehicle
- **WHEN** any damage is taken (structure exposure not required)
- **THEN** a motive-damage roll SHALL be made

### Requirement: Vehicle Hit Location Tables

The system SHALL use vehicle-specific hit-location tables per attack direction.

#### Scenario: Front attack table

- **GIVEN** an attack from the Front arc
- **WHEN** 2d6 is rolled
- **THEN** 2 SHALL resolve to Front (TAC)
- **AND** 3-4 SHALL resolve to Right Side
- **AND** 5-7 SHALL resolve to Front
- **AND** 8-9 SHALL resolve to Left Side
- **AND** 10-11 SHALL resolve to Turret
- **AND** 12 SHALL resolve to Front (TAC)

#### Scenario: VTOL roll 12 hits Rotor

- **GIVEN** a VTOL target
- **WHEN** a Front or Rear hit location roll is 12
- **THEN** the hit SHALL land on Rotor instead of Turret

### Requirement: Vehicle Critical Hit Table

The system SHALL use a vehicle-specific critical-hit table.

#### Scenario: Crit table outcomes

- **WHEN** a vehicle critical hit is rolled (2d6)
- **THEN** outcomes SHALL map:
  - 2-5 = no critical
  - 6 = Crew Stunned
  - 7 = Weapon Destroyed
  - 8 = Cargo / Infantry Hit
  - 9 = Driver Hit
  - 10 = Fuel Tank Hit (ICE/FuelCell only; energy → reroll)
  - 11 = Engine Hit
  - 12 = Ammo Explosion (if ammo in crit slot)

#### Scenario: Crew Stunned effect

- **GIVEN** a vehicle that rolls Crew Stunned
- **WHEN** the effect is applied
- **THEN** a `VehicleCrewStunned` event SHALL fire
- **AND** the vehicle SHALL skip its next movement phase and next weapon-attack phase

#### Scenario: Engine Hit effect

- **GIVEN** a vehicle that takes its first Engine Hit
- **WHEN** the effect is applied
- **THEN** the vehicle SHALL be disabled for the current turn
- **AND** a second Engine Hit SHALL destroy the vehicle

## MODIFIED Requirements

### Requirement: Damage Distribution

The system SHALL distribute damage across units based on battle intensity and outcome.

#### Scenario: Victory results in light damage

- **GIVEN** a battle with outcome VICTORY and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 0-30% damage on average

#### Scenario: Defeat results in heavy damage

- **GIVEN** a battle with outcome DEFEAT and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 40-80% damage on average

#### Scenario: Draw results in moderate damage

- **GIVEN** a battle with outcome DRAW and 4 player units
- **WHEN** distributeDamage is called
- **THEN** units receive 20-50% damage on average

#### Scenario: Vehicle damage respects motive penalties

- **GIVEN** a battle that destroys a vehicle by motive immobilization
- **WHEN** damage is distributed
- **THEN** the immobilized-but-intact vehicle SHALL count as combat-eligible salvage, not wreckage

# battle-value-system (delta)

## ADDED Requirements

### Requirement: Vehicle BV Dispatch

The BV calculator SHALL route `IVehicleUnit` inputs to a vehicle-specific calculation path distinct from the BattleMech path.

#### Scenario: Vehicle unit dispatch

- **GIVEN** a combat vehicle with `unitType === UnitType.VEHICLE`
- **WHEN** `calculateBattleValue(unit)` is called
- **THEN** the vehicle calculator SHALL be invoked
- **AND** the return SHALL include an `IVehicleBVBreakdown` object with `defensive`, `offensive`, `pilotMultiplier`, and `final` fields

#### Scenario: Support vehicle dispatch

- **GIVEN** a support vehicle with BAR rating 7
- **WHEN** BV is calculated
- **THEN** the vehicle calculator SHALL run with BAR-adjusted armor BV

### Requirement: Vehicle Defensive BV

Vehicle defensive BV SHALL combine armor, structure, defensive equipment, and motive-type TMM.

#### Scenario: Defensive BV formula

- **WHEN** computing vehicle defensive BV
- **THEN** base defensive BV SHALL equal `armor × 2.5 × armorMult + structure × 1.5 × structureMult + defEquipBV − explosivePenalty`
- **AND** defensive factor SHALL equal `1 + ((TMM × 0.5) / 10)`
- **AND** final defensive BV SHALL equal `base × defensive factor`

#### Scenario: VTOL TMM bonus

- **GIVEN** a VTOL with flank MP 15
- **WHEN** TMM is computed
- **THEN** the TMM SHALL equal the 15-MP table value + 1 (altitude bonus)

#### Scenario: BAR armor scaling

- **GIVEN** a BAR-6 support vehicle with 40 armor points
- **WHEN** armor BV is computed
- **THEN** armor BV SHALL equal `40 × 2.5 × 1.0 × (6/10) = 60`

### Requirement: Vehicle Offensive BV

Vehicle offensive BV SHALL combine weapon BV, ammo BV, offensive equipment BV, turret multipliers, and speed factor.

#### Scenario: Turret multiplier

- **GIVEN** a vehicle with one Single turret containing 100 BV of weapons
- **WHEN** offensive BV is computed
- **THEN** the turret-mounted weapons SHALL receive a 1.05 multiplier (5% turret bonus)

#### Scenario: Sponson pair multiplier

- **GIVEN** a vehicle with a pair of Sponson turrets each holding 50 BV
- **WHEN** offensive BV is computed
- **THEN** each sponson SHALL receive a 1.025 multiplier (2.5% sponson bonus)

#### Scenario: Rear-arc weapon penalty

- **GIVEN** a combat vehicle with a rear-mounted AC/10 (no turret)
- **WHEN** offensive BV is computed
- **THEN** the rear-only weapon BV SHALL be multiplied by 0.5

### Requirement: Vehicle Speed Factor

Vehicle speed factor SHALL use flank MP with per-motion-type adjustments.

#### Scenario: Tracked vehicle speed factor

- **GIVEN** a tracked vehicle with flank MP 6
- **WHEN** speed factor is computed
- **THEN** `sf = round(pow(1 + (6 − 5) / 10, 1.2) × 100) / 100 = 1.12`

#### Scenario: VTOL speed factor

- **GIVEN** a VTOL with flank MP 15
- **WHEN** speed factor is computed
- **THEN** `sf = round(pow(1 + (15 − 5) / 10, 1.2) × 100) / 100 = 2.30`

### Requirement: Vehicle Pilot Skill Adjustment

Vehicle final BV SHALL apply the shared gunnery / piloting multiplier table identical to the mech calculator.

#### Scenario: Standard crew

- **GIVEN** a vehicle with gunnery 4 piloting 5
- **WHEN** final BV is computed
- **THEN** the pilot multiplier SHALL equal 1.00

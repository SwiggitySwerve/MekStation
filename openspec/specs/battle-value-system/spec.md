# battle-value-system Specification

## Purpose

Defines how Battle Value (BV) is calculated for BattleMech units following BV2 rules from the TechManual.

## Requirements

### Requirement: Defensive Battle Value

The system SHALL calculate defensive BV from armor, structure, gyro, and defensive speed factor.

#### Scenario: Defensive BV calculation

- **WHEN** calculating defensive BV
- **THEN** armor BV SHALL be calculated as total armor points × 2.5 × armor type multiplier
- **AND** structure BV SHALL be calculated as total structure points × 1.5 × structure type multiplier
- **AND** gyro BV SHALL be calculated as tonnage × gyro multiplier
- **AND** base defensive BV SHALL equal armorBV + structureBV + gyroBV
- **AND** explosive equipment penalties SHALL be subtracted
- **AND** defensive speed factor SHALL be calculated from maximum TMM
- **AND** final defensive BV SHALL equal base × defensive speed factor

#### Scenario: Gyro BV contribution

- **WHEN** calculating gyro BV
- **THEN** gyro BV SHALL equal mech tonnage × gyro multiplier
- **AND** gyro multiplier SHALL be 0.5 for Standard, XL, and Compact gyros
- **AND** gyro multiplier SHALL be 1.0 for Heavy-Duty gyro
- **AND** a 75-ton mech with Standard gyro SHALL contribute 37.5 gyro BV (75 × 0.5)
- **AND** a 75-ton mech with Heavy-Duty gyro SHALL contribute 75 gyro BV (75 × 1.0)

#### Scenario: Armor type BV multipliers

- **WHEN** calculating armor BV
- **THEN** Hardened armor SHALL use multiplier 2.0
- **AND** Reactive, Reflective, and Ballistic-Reinforced armor SHALL use multiplier 1.5
- **AND** Ferro-Lamellor and Anti-Penetrative Ablation armor SHALL use multiplier 1.2
- **AND** Heat-Dissipating armor SHALL use multiplier 1.1
- **AND** Standard and all other armor types SHALL use multiplier 1.0

#### Scenario: Structure type BV multipliers

- **WHEN** calculating structure BV
- **THEN** Industrial and Composite structure SHALL use multiplier 0.5
- **AND** Reinforced structure SHALL use multiplier 2.0
- **AND** Standard and all other structure types SHALL use multiplier 1.0

#### Scenario: Explosive equipment penalty categories

- **WHEN** calculating defensive BV
- **AND** unit has explosive equipment
- **THEN** penalties SHALL be applied per category:
  - **Standard** (15 BV/slot): most ammo types, Improved Heavy Lasers
  - **Reduced** (1 BV/slot): Gauss weapons, PPC Capacitors, Coolant Pods, B-Pods, M-Pods,
    TSEMP weapons, Prototype Improved Jump Jets, Emergency Coolant System,
    RISC Hyper Laser, RISC Laser Pulse Module, Mek Taser
  - **Gauss** (1 BV/slot): Gauss weapon crits (standard, Light, Heavy, HAG, Silver Bullet)
  - **HVAC** (1 BV total): Hyper-Velocity Autocannon (regardless of slot count)

#### Scenario: CASE protection by location

- **WHEN** calculating explosive equipment penalties
- **THEN** CASE II SHALL eliminate all penalties in the protected location
- **AND** standard CASE SHALL protect side torsos (if engine has <3 side torso crit slots)
- **AND** standard CASE SHALL protect arms (non-quad; otherwise check transfer torso)
- **AND** standard CASE SHALL NOT protect CT, HD, or Legs — only CASE II does
- **AND** Clan mechs SHALL have implicit CASE in all non-head locations (LT, RT, LA, RA, CT, LL, RL)
- **BUT** Clan implicit CASE follows standard CASE rules — it does NOT protect CT, HD, or Legs

#### Scenario: Defensive speed factor calculation

- **WHEN** calculating defensive speed factor
- **THEN** maximum TMM SHALL be determined from run MP, jump MP, and UMU MP
- **AND** defensive factor SHALL equal 1 + (maxTMM / 10.0)
- **AND** TMM 0 SHALL give factor 1.0
- **AND** TMM 2 SHALL give factor 1.2
- **AND** TMM 4 SHALL give factor 1.4

### Requirement: Offensive Battle Value

The system SHALL calculate offensive BV using incremental weapon heat tracking.

#### Scenario: Offensive BV calculation

- **WHEN** calculating offensive BV
- **THEN** front/rear weapon switching SHALL be determined first
- **AND** weapons SHALL be sorted by BV in descending order
- **AND** running heat (2) SHALL be added to initial heat pool
- **AND** each weapon SHALL be added incrementally with cumulative heat tracking
- **AND** weapons exceeding dissipation threshold SHALL receive 50% BV penalty
- **AND** ammo BV SHALL be added to weapon BV
- **AND** tonnage weight bonus SHALL be added
- **AND** offensive speed factor SHALL be applied to total

#### Scenario: Running heat contribution

- **WHEN** calculating heat pool for offensive BV
- **THEN** running heat of 2 SHALL be added before weapon heat
- **AND** this represents the heat cost of running movement

#### Scenario: Weapon heat penalty application

- **WHEN** adding a weapon to offensive BV
- **AND** cumulative heat (running + weapons so far) exceeds dissipation
- **THEN** the weapon BV SHALL be multiplied by 0.5
- **AND** subsequent weapons also exceeding dissipation SHALL receive 50% penalty

#### Scenario: Weight bonus

- **WHEN** calculating offensive BV
- **THEN** mech tonnage SHALL be added as weight bonus
- **AND** a 75-ton mech SHALL add 75 to offensive BV

#### Scenario: Front/rear weapon switching

- **WHEN** calculating offensive BV
- **THEN** front weapon BV SHALL be calculated first
- **AND** rear weapon BV SHALL be calculated second
- **AND** if front BV < rear BV, weapons SHALL be switched
- **AND** after switching, lower BV weapons SHALL receive 0.5× multiplier
- **AND** this ensures higher BV weapons are always counted at full value

#### Scenario: Heat tracking algorithm

- **WHEN** calculating offensive BV with heat tracking
- **THEN** weapons SHALL be sorted by BV descending (heatless weapons first)
- **AND** running heat of 2 SHALL be added to heat pool initially
- **AND** for each weapon in sorted order:
  - weapon heat SHALL be added to cumulative heat
  - if cumulative heat > heat dissipation capacity, weapon BV SHALL be multiplied by 0.5
  - weapon BV (modified or not) SHALL be added to offensive total
- **AND** this process continues for all weapons

#### Scenario: Offensive speed factor calculation

- **WHEN** calculating offensive speed factor
- **THEN** movement points SHALL be determined from run MP or jump MP
- **AND** speed factor SHALL equal round(pow(1 + ((mp - 5) / 10.0), 1.2) × 100.0) / 100.0
- **AND** 5 MP SHALL give factor 1.0
- **AND** 6 MP SHALL give factor 1.12
- **AND** 10 MP SHALL give factor 1.61

### Requirement: Speed Factor

Movement capability SHALL modify defensive and offensive BV using separate TMM-based speed factors.

#### Scenario: Speed factor from TMM

- **WHEN** calculating speed factor for BV2
- **THEN** TMM SHALL be calculated from the higher of run MP or jump MP
- **AND** speed factor SHALL be looked up from TMM-based table
- **AND** TMM 0 gives factor 1.0
- **AND** TMM 2 (Run 6 MP) gives factor 1.2
- **AND** factor increases by 0.1 per TMM level

#### Scenario: Defensive speed factor

- **WHEN** calculating defensive speed factor
- **THEN** TMM SHALL be calculated from run MP and jump MP
- **AND** speed factor SHALL be looked up from TMM-based table
- **AND** TMM 2 SHALL give defensive factor 1.2

#### Scenario: Offensive speed factor

- **WHEN** calculating offensive speed factor
- **THEN** a modified speed factor SHALL be used
- **AND** TMM 2 SHALL give offensive factor 1.12
- **AND** offensive factor SHALL be slightly lower than defensive factor

#### Scenario: TMM calculation from movement

- **WHEN** calculating Target Movement Modifier
- **THEN** effective MP SHALL be the higher of run MP or jump MP
- **AND** 0-2 MP SHALL give TMM 0
- **AND** 3-4 MP SHALL give TMM 1
- **AND** 5-6 MP SHALL give TMM 2
- **AND** 7-9 MP SHALL give TMM 3
- **AND** 10-17 MP SHALL give TMM 4
- **AND** 18-24 MP SHALL give TMM 5
- **AND** 25+ MP SHALL give TMM 6

### Requirement: Pilot Skill Adjustment

The system SHALL adjust final BV based on pilot gunnery and piloting skills using a 9×9 multiplier matrix.

#### Scenario: Pilot skill multiplier matrix

- **WHEN** applying pilot skill adjustment to BV
- **THEN** multiplier SHALL be looked up from gunnery (row) and piloting (column)
- **AND** the 9×9 matrix SHALL be:
  ```
  Gunnery/Piloting:  0     1     2     3     4     5     6     7     8
  0:               2.42  2.31  2.21  2.10  1.93  1.75  1.68  1.59  1.50
  1:               2.21  2.11  2.02  1.92  1.76  1.60  1.54  1.46  1.38
  2:               1.93  1.85  1.76  1.68  1.54  1.40  1.35  1.28  1.21
  3:               1.66  1.58  1.51  1.44  1.32  1.20  1.16  1.10  1.04
  4:               1.38  1.32  1.26  1.20  1.10  1.00  0.95  0.90  0.85
  5:               1.31  1.19  1.13  1.08  0.99  0.90  0.86  0.81  0.77
  6:               1.24  1.12  1.07  1.02  0.94  0.85  0.81  0.77  0.72
  7:               1.17  1.06  1.01  0.96  0.88  0.80  0.76  0.72  0.68
  8:               1.10  0.99  0.95  0.90  0.83  0.75  0.71  0.68  0.64
  ```
- **AND** gunnery 0 / piloting 0 SHALL give multiplier 2.42
- **AND** gunnery 4 / piloting 5 SHALL give multiplier 1.00 (standard pilot)
- **AND** gunnery 8 / piloting 8 SHALL give multiplier 0.64

### Requirement: Prototype Equipment BV

The system SHALL correctly resolve prototype weapon and equipment BV/heat values.

#### Scenario: Prototype weapon BV resolution

- **WHEN** calculating BV for a prototype weapon
- **THEN** prototype weapons SHALL use the same base BV as their standard counterparts
- **AND** prototype weapons MAY have different (typically higher) heat values
- **AND** resolution SHALL check CATALOG_BV_OVERRIDES before catalog lookup

#### Scenario: Prototype Double Heat Sink dissipation

- **WHEN** calculating heat dissipation
- **AND** unit has Prototype DHS (detected from crit slot names)
- **THEN** each Prototype DHS SHALL dissipate 2 heat (same as regular DHS)
- **AND** Prototype DHS SHALL always use IS sizing (3 crit slots each)
- **AND** unit's `heatSinks.type` MAY still be "SINGLE" even with Prototype DHS present

#### Scenario: Prototype Improved Jump Jets are explosive

- **WHEN** scanning for explosive equipment
- **AND** a crit slot contains Prototype Improved Jump Jets
- **THEN** the slot SHALL be classified as explosive with `reduced` penalty (1 BV/slot)

### Requirement: Industrial Mech Fire Control

The system SHALL apply a 0.9× offensive BV modifier for industrial mechs without advanced fire control.

#### Scenario: Industrial cockpit offensive modifier

- **WHEN** calculating offensive BV
- **AND** unit has an industrial cockpit type
- **THEN** offensive BV SHALL be multiplied by 0.9
- **AND** this reflects the reduced fire control capability of industrial designs

### Requirement: Registry Initialization Check

BV calculation SHALL handle uninitialized equipment registry gracefully.

#### Scenario: Registry not ready

- **WHEN** equipment registry is not initialized
- **THEN** offensive BV SHALL return 0
- **AND** registry initialization SHALL be triggered asynchronously
- **AND** calculation SHALL be retried when registry becomes ready

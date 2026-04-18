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

### Requirement: Aerospace BV Dispatch

The BV calculator SHALL route `IAerospaceUnit` inputs to an aerospace-specific calculation path.

#### Scenario: ASF dispatch

- **GIVEN** an aerospace fighter
- **WHEN** `calculateBattleValue` is called
- **THEN** the aerospace calculator SHALL be invoked
- **AND** the return SHALL include an `IAerospaceBVBreakdown`

#### Scenario: Conventional fighter multiplier

- **GIVEN** a conventional fighter
- **WHEN** final BV is computed
- **THEN** `(defensive + offensive)` SHALL be multiplied by 0.8 before pilot adjustment

### Requirement: Aerospace Defensive BV

Aerospace defensive BV SHALL use Structural Integrity in place of the mech gyro term.

#### Scenario: SI BV

- **GIVEN** a 50-ton ASF with SI 5
- **WHEN** SI BV is computed
- **THEN** siBV SHALL equal `5 × 0.5 × 50 = 125`

#### Scenario: Defensive factor uses Max Thrust

- **GIVEN** an ASF with maxThrust 9
- **WHEN** defensive factor is computed
- **THEN** defensive factor SHALL equal `1 + (9 / 10) = 1.9`

### Requirement: Aerospace Offensive BV Arc Fire Pool

Aerospace offensive BV SHALL combine arc-weighted weapon contributions.

#### Scenario: Primary arc contributes 100%

- **GIVEN** an ASF whose Nose arc holds the highest-BV weapon pool
- **WHEN** offensive BV is computed
- **THEN** the Nose arc SHALL contribute at 100%
- **AND** the Aft arc SHALL contribute at 25%
- **AND** the LeftWing and RightWing SHALL each contribute at 50%
- **AND** Fuselage weapons SHALL always contribute at 100%

#### Scenario: Primary arc not Nose

- **GIVEN** an ASF whose LeftWing arc has higher BV than Nose
- **WHEN** fire-pool weighting is applied
- **THEN** LeftWing SHALL contribute at 100%
- **AND** RightWing (opposite arc) SHALL contribute at 25%
- **AND** Nose / Aft SHALL contribute at 50% each

### Requirement: Aerospace Speed Factor

Aerospace speed factor SHALL use the average of Safe and Max Thrust.

#### Scenario: Speed factor calculation

- **GIVEN** an ASF with safeThrust 5, maxThrust 7
- **WHEN** speed factor is computed
- **THEN** avgThrust SHALL equal 6
- **AND** speed factor SHALL equal `round(pow(1 + (6 − 5) / 10, 1.2) × 100) / 100 = 1.12`

### Requirement: BattleArmor BV Dispatch

The BV calculator SHALL route `IBattleArmorUnit` inputs to a BA-specific calculation path.

#### Scenario: BA dispatch

- **GIVEN** a BA squad
- **WHEN** `calculateBattleValue` is called
- **THEN** the BA calculator SHALL be invoked
- **AND** the return SHALL include an `IBABreakdown`

### Requirement: Per-Trooper Defensive BV

BA defensive BV SHALL combine armor points, movement, and anti-mech equipment per trooper.

#### Scenario: Armor BV with Standard armor

- **GIVEN** a trooper with 5 points Standard BA armor
- **WHEN** defensive BV is computed
- **THEN** armorBV SHALL equal `5 × 2.5 × 1.0 = 12.5`

#### Scenario: Stealth armor multiplier

- **GIVEN** a trooper with 5 points Basic Stealth BA armor
- **WHEN** defensive BV is computed
- **THEN** armorBV SHALL equal `5 × 2.5 × 1.5 = 18.75`

#### Scenario: Magnetic Clamp anti-mech bonus

- **GIVEN** a trooper equipped with Magnetic Clamps
- **WHEN** defensive BV is computed
- **THEN** an additional 5 BV SHALL be added per trooper

#### Scenario: Move BV by class

- **GIVEN** a Medium-class trooper with ground MP 2
- **WHEN** move BV is computed
- **THEN** moveBV SHALL equal `2 × 0.75 = 1.5`

### Requirement: Per-Trooper Offensive BV

BA offensive BV SHALL combine weapon, ammo, and manipulator BV per trooper.

#### Scenario: Manipulator melee BV

- **GIVEN** a trooper with Vibro-Claws on both arms
- **WHEN** offensive BV is computed
- **THEN** manipulator BV SHALL contribute `3 × 2 = 6` BV

#### Scenario: Weapon BV identical to catalog

- **GIVEN** a trooper with an SRM-2 (catalog BV 21)
- **WHEN** offensive BV is computed
- **THEN** weaponBV SHALL equal 21

### Requirement: Squad-Scale BV

BA BV SHALL scale linearly with squad size.

#### Scenario: Clan 5-trooper squad

- **GIVEN** a Clan squad with trooperBV = 100 and squadSize = 5
- **WHEN** squad BV is computed
- **THEN** squadBV SHALL equal 500 (before pilot skill)

#### Scenario: IS 4-trooper squad

- **GIVEN** an IS squad with trooperBV = 80 and squadSize = 4
- **WHEN** squad BV is computed
- **THEN** squadBV SHALL equal 320 (before pilot skill)

### Requirement: BA Pilot Skill Multiplier

The shared gunnery × piloting table SHALL apply to BA final BV.

#### Scenario: Elite BA crew

- **GIVEN** a BA squad with gunnery 3 piloting 4
- **WHEN** final BV is computed
- **THEN** the pilot multiplier SHALL be read from the table row g=3 p=4

### Requirement: Infantry BV Dispatch

The BV calculator SHALL route `IInfantryUnit` inputs to an infantry-specific calculation path.

#### Scenario: Infantry dispatch

- **GIVEN** an infantry platoon
- **WHEN** `calculateBattleValue` is called
- **THEN** the infantry calculator SHALL be invoked
- **AND** the return SHALL include an `IInfantryBVBreakdown`

### Requirement: Infantry Per-Trooper BV

Infantry per-trooper BV SHALL combine primary weapon, secondary weapon (ratio-adjusted), and armor kit modifier.

#### Scenario: Primary weapon contribution

- **GIVEN** a trooper with primary Laser Rifle (BV 12, damageDivisor 1.0)
- **WHEN** per-trooper BV is computed
- **THEN** primary contribution SHALL equal `12 / 1.0 = 12`

#### Scenario: Secondary ratio scaling

- **GIVEN** a platoon with secondary SRM Launcher (BV 25) at ratio 1-per-4
- **WHEN** per-trooper secondary is computed
- **THEN** secondary contribution SHALL equal `25 × (1 / 4) = 6.25`

#### Scenario: Armor kit modifier

- **GIVEN** a trooper wearing Sneak Camo
- **WHEN** per-trooper BV is computed
- **THEN** an additional 3 BV SHALL be added from the kit modifier

### Requirement: Infantry Platoon BV with Motive Multiplier

Infantry platoon BV SHALL scale by trooper count with a motive-type multiplier.

#### Scenario: Foot platoon BV

- **GIVEN** a 28-trooper Foot platoon with perTrooperBV 15
- **WHEN** platoon BV is computed
- **THEN** platoonBV SHALL equal `15 × 28 × 1.0 = 420`

#### Scenario: Mechanized multiplier

- **GIVEN** a 20-trooper Mechanized-Tracked platoon with perTrooperBV 20
- **WHEN** platoon BV is computed
- **THEN** platoonBV SHALL equal `20 × 20 × 1.15 = 460`

### Requirement: Infantry Anti-Mech Training Multiplier

Platoons with anti-mech training SHALL have final BV multiplied by 1.1.

#### Scenario: Anti-mech trained platoon

- **GIVEN** an anti-mech-trained Foot platoon with platoonBV 420
- **WHEN** final BV is computed (before pilot multiplier)
- **THEN** BV SHALL equal `420 × 1.1 = 462`

### Requirement: Infantry Field Gun BV Addition

A field gun's BV SHALL be added to the platoon BV using the mech-scale equipment resolver.

#### Scenario: AC/5 field gun

- **GIVEN** a Foot platoon crewing an AC/5 field gun with 20 rounds of ammo
- **WHEN** BV is computed
- **THEN** field gun contribution SHALL equal `AC/5 BV (70) + ammo BV` per catalog
- **AND** this SHALL be added to platoonBV before pilot multiplier

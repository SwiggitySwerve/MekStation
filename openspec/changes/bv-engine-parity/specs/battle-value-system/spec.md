# battle-value-system Spec Delta

## ADDED Requirements

### Requirement: Engine BV Multiplier on Structure

The system SHALL apply engine-specific multipliers to structure BV calculation.

#### Scenario: Engine multiplier on structure BV

- **WHEN** calculating structure BV
- **THEN** structure BV SHALL equal `internalStructure × 1.5 × structureTypeMultiplier × engineMultiplier`
- **AND** Standard Fusion engine SHALL use multiplier 1.0
- **AND** XL Engine (Inner Sphere) SHALL use multiplier 0.5
- **AND** XL Engine (Clan) SHALL use multiplier 0.75
- **AND** Light Engine SHALL use multiplier 0.75
- **AND** XXL Engine SHALL use multiplier 0.33
- **AND** Compact Engine SHALL use multiplier 1.0

#### Scenario: XL Engine structure penalty

- **WHEN** calculating structure BV for a mech with IS XL Engine
- **AND** mech has 114 internal structure points
- **AND** structure type is Standard (multiplier 1.0)
- **THEN** structure BV SHALL equal `114 × 1.5 × 1.0 × 0.5 = 85.5`
- **AND** this reflects the vulnerability of XL Engine side torso destruction

#### Scenario: Clan XL Engine structure penalty

- **WHEN** calculating structure BV for a mech with Clan XL Engine
- **AND** mech has 114 internal structure points
- **AND** structure type is Standard (multiplier 1.0)
- **THEN** structure BV SHALL equal `114 × 1.5 × 1.0 × 0.75 = 128.25`
- **AND** this reflects the reduced vulnerability compared to IS XL Engine

### Requirement: Defensive Equipment BV

The system SHALL add BV for defensive equipment including AMS, ECM, BAP, and shields.

#### Scenario: Defensive equipment BV contribution

- **WHEN** calculating defensive BV
- **THEN** Anti-Missile System (AMS) BV SHALL be added from equipment catalog
- **AND** ECM Suite BV SHALL be added from equipment catalog
- **AND** Beagle Active Probe (BAP) BV SHALL be added from equipment catalog
- **AND** Physical shields BV SHALL be added from equipment catalog
- **AND** all defensive equipment BV SHALL be read from equipment catalog `battleValue` field

#### Scenario: AMS ammo BV capping

- **WHEN** calculating defensive BV
- **AND** unit has AMS equipment
- **AND** unit has AMS ammo
- **THEN** AMS ammo BV SHALL be capped at AMS weapon BV
- **AND** excessive AMS ammo SHALL NOT contribute additional defensive BV

### Requirement: Explosive Equipment Penalty Per Location

The system SHALL calculate explosive equipment penalties per location with CASE/CASE II protection rules.

#### Scenario: Explosive equipment penalty without protection

- **WHEN** calculating defensive BV
- **AND** a location has explosive equipment
- **AND** location has no CASE or CASE II protection
- **THEN** each critical slot of explosive equipment SHALL subtract from defensive BV
- **AND** most explosive equipment SHALL subtract 15 per slot
- **AND** Gauss weapons SHALL subtract 1 per slot
- **AND** HVAC weapons SHALL subtract 1 total (regardless of slots)
- **AND** PPC weapons with capacitors SHALL subtract 1 per slot

#### Scenario: CASE II protection eliminates penalty

- **WHEN** calculating defensive BV
- **AND** a location has explosive equipment
- **AND** location has CASE II protection
- **THEN** explosive equipment penalty SHALL be 0 for that location

#### Scenario: CASE protection reduces penalty

- **WHEN** calculating defensive BV
- **AND** a location has explosive equipment
- **AND** location has CASE protection (not CASE II)
- **THEN** explosive equipment penalty SHALL be reduced (not eliminated)
- **AND** penalty reduction SHALL follow MegaMek CASE rules

### Requirement: Stealth and Chameleon TMM Bonuses

The system SHALL add TMM bonuses for Stealth Armor and Chameleon LPS to defensive speed factor.

#### Scenario: Stealth Armor TMM bonus

- **WHEN** calculating defensive speed factor
- **AND** unit has Stealth Armor
- **THEN** TMM SHALL be increased by 2
- **AND** defensive speed factor SHALL be recalculated with increased TMM

#### Scenario: Chameleon LPS TMM bonus

- **WHEN** calculating defensive speed factor
- **AND** unit has Chameleon Light Polarization Shield (LPS)
- **THEN** TMM SHALL be increased by 2
- **AND** defensive speed factor SHALL be recalculated with increased TMM

#### Scenario: Stealth and Chameleon stack

- **WHEN** calculating defensive speed factor
- **AND** unit has both Stealth Armor and Chameleon LPS
- **THEN** TMM SHALL be increased by 4 (2 + 2)
- **AND** defensive speed factor SHALL be recalculated with increased TMM

### Requirement: Weapon Sort Order for Heat Allocation

The system SHALL sort weapons in optimal order for heat allocation before calculating offensive BV.

#### Scenario: Weapon sort order algorithm

- **WHEN** sorting weapons for offensive BV calculation
- **THEN** weapons SHALL be sorted by:
  1. Heatless weapons first (heat = 0)
  2. By BV descending (highest BV first)
  3. By heat ascending for BV ties (lowest heat breaks ties)
- **AND** this ensures maximum BV weapons are allocated before heat threshold

#### Scenario: Heatless weapons prioritized

- **WHEN** sorting weapons for offensive BV calculation
- **AND** unit has mix of heatless and heat-generating weapons
- **THEN** all heatless weapons SHALL appear first in sorted order
- **AND** heatless weapons SHALL be sorted by BV descending among themselves

### Requirement: Weapon BV Modifiers

The system SHALL apply equipment modifiers to weapon BV before heat allocation.

#### Scenario: Artemis IV modifier

- **WHEN** calculating weapon BV
- **AND** weapon has Artemis IV fire control system
- **THEN** weapon BV SHALL be multiplied by 1.2

#### Scenario: Artemis V modifier

- **WHEN** calculating weapon BV
- **AND** weapon has Artemis V fire control system
- **THEN** weapon BV SHALL be multiplied by 1.3

#### Scenario: Targeting Computer modifier

- **WHEN** calculating weapon BV
- **AND** weapon benefits from Targeting Computer
- **THEN** weapon BV SHALL be multiplied by 1.25

#### Scenario: Actuator Enhancement System modifier

- **WHEN** calculating weapon BV
- **AND** weapon is in an arm with Actuator Enhancement System (AES)
- **THEN** weapon BV SHALL be multiplied by 1.25
- **AND** if both arms have AES, weapons in both arms receive modifier

#### Scenario: Multiple modifiers stack multiplicatively

- **WHEN** calculating weapon BV
- **AND** weapon has multiple modifiers (e.g., Artemis IV + Targeting Computer)
- **THEN** modifiers SHALL stack multiplicatively
- **AND** weapon BV SHALL equal `baseBV × 1.2 × 1.25 = baseBV × 1.5`

### Requirement: Ultra AC / Rotary AC / Streak SRM Heat Adjustments

The system SHALL use BV-context heat values for specific weapon types that differ from firing heat.

#### Scenario: Ultra AC heat for BV calculation

- **WHEN** calculating offensive BV heat tracking
- **AND** weapon is Ultra Autocannon
- **THEN** weapon heat SHALL be multiplied by 2 for BV context
- **AND** this reflects the sustained fire heat generation

#### Scenario: Rotary AC heat for BV calculation

- **WHEN** calculating offensive BV heat tracking
- **AND** weapon is Rotary Autocannon
- **THEN** weapon heat SHALL be multiplied by 6 for BV context
- **AND** this reflects the maximum sustained fire heat generation

#### Scenario: Streak SRM heat for BV calculation

- **WHEN** calculating offensive BV heat tracking
- **AND** weapon is Streak SRM
- **THEN** weapon heat SHALL be multiplied by 0.5 for BV context
- **AND** this reflects the conditional fire (only when lock achieved)

### Requirement: Ammo BV with Excessive Ammo Rule

The system SHALL sum ammo BV by weapon type and rack size, capping at weapon BV.

#### Scenario: Ammo BV grouping by type and rack size

- **WHEN** calculating ammo BV
- **THEN** ammo SHALL be grouped by `weaponType:rackSize` key
- **AND** ammo BV SHALL be summed within each group
- **AND** each group's total SHALL be capped at corresponding weapon BV

#### Scenario: Excessive ammo capping

- **WHEN** calculating ammo BV
- **AND** unit has 4 tons of LRM-20 ammo (BV = 60 per ton = 240 total)
- **AND** LRM-20 weapon BV is 181
- **THEN** ammo BV contribution SHALL be capped at 181
- **AND** excessive ammo (240 - 181 = 59) SHALL NOT contribute to BV

#### Scenario: Multiple weapon types ammo independence

- **WHEN** calculating ammo BV
- **AND** unit has ammo for multiple weapon types
- **THEN** each weapon type's ammo SHALL be capped independently
- **AND** LRM-20 ammo capped at LRM-20 weapon BV
- **AND** SRM-6 ammo capped at SRM-6 weapon BV

### Requirement: Offensive Equipment BV

The system SHALL add BV for offensive equipment including melee weapons.

#### Scenario: Melee weapon BV contribution

- **WHEN** calculating offensive BV
- **THEN** Hatchet BV SHALL be added from equipment catalog
- **AND** Sword BV SHALL be added from equipment catalog
- **AND** Club BV SHALL be added from equipment catalog
- **AND** Vibroblade BV SHALL be added from equipment catalog
- **AND** all offensive equipment BV SHALL be read from equipment catalog `battleValue` field

### Requirement: Weight Modifiers for Offensive BV

The system SHALL apply weight modifiers to tonnage bonus based on enhancement systems.

#### Scenario: TSM weight modifier

- **WHEN** calculating offensive BV tonnage bonus
- **AND** unit has Triple-Strength Myomer (TSM)
- **THEN** tonnage bonus SHALL be multiplied by 1.5
- **AND** a 75-ton mech with TSM SHALL add `75 × 1.5 = 112.5` to offensive BV

#### Scenario: Industrial TSM weight modifier

- **WHEN** calculating offensive BV tonnage bonus
- **AND** unit has Industrial Triple-Strength Myomer
- **THEN** tonnage bonus SHALL be multiplied by 1.15
- **AND** a 75-ton mech with Industrial TSM SHALL add `75 × 1.15 = 86.25` to offensive BV

#### Scenario: AES weight modifier

- **WHEN** calculating offensive BV tonnage bonus
- **AND** unit has Actuator Enhancement System (AES)
- **THEN** additional weight bonus SHALL be added
- **AND** AES weight bonus SHALL follow MegaMek AES rules

### Requirement: Offensive Type Modifier

The system SHALL apply offensive type modifiers based on mech classification.

#### Scenario: Industrial Mech offensive modifier

- **WHEN** calculating offensive BV
- **AND** unit is classified as Industrial Mech
- **THEN** offensive BV SHALL be multiplied by 0.9
- **AND** this reflects reduced combat effectiveness of industrial designs

### Requirement: Cockpit BV Modifier

The system SHALL apply cockpit-specific BV modifiers to final BV.

#### Scenario: Small Cockpit modifier

- **WHEN** calculating final BV
- **AND** unit has Small Cockpit
- **THEN** final BV SHALL be multiplied by 0.95

#### Scenario: Torso-Mounted Cockpit modifier

- **WHEN** calculating final BV
- **AND** unit has Torso-Mounted Cockpit
- **THEN** final BV SHALL be multiplied by 0.95

#### Scenario: Interface Cockpit modifier

- **WHEN** calculating final BV
- **AND** unit has Interface Cockpit
- **THEN** final BV SHALL be multiplied by 1.3

### Requirement: Equipment Catalog as Single Source of Truth

The system SHALL read all equipment BV and heat values from the equipment catalog at runtime.

#### Scenario: Equipment BV resolution from catalog

- **WHEN** calculating weapon BV
- **THEN** weapon BV SHALL be read from equipment catalog `battleValue` field
- **AND** equipment catalog path SHALL be `public/data/equipment/official/`
- **AND** catalog contains 1,057 items with `battleValue` field
- **AND** NO hardcoded weapon BV maps SHALL be used

#### Scenario: Equipment heat resolution from catalog

- **WHEN** calculating weapon heat for BV context
- **THEN** weapon heat SHALL be read from equipment catalog `heat` field
- **AND** heat adjustments (Ultra AC ×2, Rotary AC ×6, Streak SRM ×0.5) SHALL be applied after reading catalog value
- **AND** NO hardcoded weapon heat maps SHALL be used

## MODIFIED Requirements

### Requirement: Heat Efficiency Formula

The system SHALL calculate heat efficiency using the correct MegaMek formula.

#### Scenario: Heat efficiency calculation

- **WHEN** calculating heat efficiency for offensive BV
- **THEN** heat efficiency SHALL equal `6 + heatCapacity - moveHeat`
- **AND** `heatCapacity` is total heat dissipation from heat sinks
- **AND** `moveHeat` is 2 for running movement
- **AND** base heat of 6 represents mech baseline heat generation

#### Scenario: Heat efficiency example

- **WHEN** calculating heat efficiency
- **AND** unit has 20 double heat sinks (40 heat dissipation)
- **AND** running movement generates 2 heat
- **THEN** heat efficiency SHALL equal `6 + 40 - 2 = 44`
- **AND** weapons generating up to 44 heat receive full BV
- **AND** weapons exceeding 44 cumulative heat receive 50% BV penalty

#### Scenario: Incorrect formula removed

- **WHEN** calculating heat efficiency
- **THEN** raw `heatSinkCapacity` SHALL NOT be used
- **AND** formula MUST include base heat of 6 and movement heat of 2

### Requirement: Single Final Rounding

The system SHALL accumulate all BV components as floating-point and round once at the end.

#### Scenario: Float accumulation throughout calculation

- **WHEN** calculating BV
- **THEN** defensive BV SHALL be accumulated as float
- **AND** offensive BV SHALL be accumulated as float
- **AND** NO intermediate rounding SHALL occur
- **AND** final BV SHALL equal `Math.round(defensiveBV + offensiveBV)`

#### Scenario: Precision preservation

- **WHEN** calculating BV components
- **AND** defensive BV is 802.2
- **AND** offensive BV is 908.32
- **THEN** final BV SHALL equal `Math.round(802.2 + 908.32) = Math.round(1710.52) = 1711`
- **AND** intermediate values SHALL NOT be rounded to 802 and 908

## REMOVED Requirements

None. All existing requirements remain valid; this delta adds 15 new calculation phases.

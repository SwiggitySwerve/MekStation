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

### Requirement: Improved Jump Jet Detection (EC-37)

The system SHALL detect Improved Jump Jets using flexible crit name matching.

#### Scenario: Improved Jump Jet crit name variants

- **WHEN** scanning critical slots for jump jet type
- **THEN** detection SHALL match all known crit name patterns:
  - `"Improved Jump Jet"` (standard)
  - `"ImprovedJump Jet"` (no space variant)
  - `"ISImprovedJumpJet"` (IS prefix, no spaces)
  - `"CLImprovedJumpJet"` (Clan prefix, no spaces)
- **AND** detection SHALL be case-insensitive
- **AND** Improved Jump Jets SHALL use `Math.ceil(jumpMP / 2)` for effective jump MP in heat calculation

### Requirement: Rear-Facing Weapon Detection (EC-38, EC-39)

The system SHALL detect rear-facing weapons with case-insensitive and normalization-tolerant matching.

#### Scenario: Case-insensitive (R) marker detection

- **WHEN** identifying rear-facing weapons from crit slot names
- **THEN** detection SHALL match `(R)` case-insensitively (e.g., `(r)`, `(R)`)
- **AND** rear-facing weapons SHALL receive BV × 0.5 modifier

#### Scenario: Rear-facing name normalization tolerance

- **WHEN** matching weapon equipment IDs to crit slot names for rear-facing determination
- **AND** word order differs between ID and crit name (e.g., `"improved-heavy-medium-laser"` vs `"CLImprovedMediumHeavyLaser"`)
- **THEN** matching SHALL fall back to sorted-character comparison
- **AND** both strings SHALL be normalized, sorted by character, and compared
- **AND** a match SHALL correctly apply the rear-facing modifier

### Requirement: Clan Implicit CASE for MIXED Tech Units (EC-42)

The system SHALL determine Clan implicit CASE eligibility for MIXED tech base units using structural component analysis.

#### Scenario: Clan chassis detection via structural components

- **WHEN** calculating explosive penalties for a MIXED tech base unit
- **AND** unit critical slots contain Clan structural components:
  - `"Clan Endo Steel"`
  - `"Clan Ferro-Fibrous"`
  - `"CLDouble Heat Sink"` or `"Clan Double Heat Sink"`
- **THEN** unit SHALL be treated as Clan chassis for CASE purposes
- **AND** all torso and arm locations SHALL receive implicit CASE protection

#### Scenario: Clan engine detection for implicit CASE

- **WHEN** calculating explosive penalties for a MIXED tech base unit
- **AND** unit engine type string contains "CLAN"
- **THEN** unit SHALL be treated as Clan chassis for CASE purposes

#### Scenario: Per-location Clan ammo CASE for IS-chassis MIXED units

- **WHEN** calculating explosive penalties for a MIXED tech base unit
- **AND** unit is NOT a Clan chassis (no Clan engine or structural components)
- **AND** a specific location contains Clan-prefixed ammo (e.g., `"CLStreakSRM6Ammo"`)
- **THEN** that specific location SHALL receive implicit CASE protection
- **AND** other locations without Clan ammo SHALL NOT receive implicit CASE

### Requirement: Rifle Weapon and Ammo Resolution (EC-41)

The system SHALL correctly resolve Heavy, Medium, and Light Rifle weapons and their ammunition.

#### Scenario: Rifle weapon BV values

- **WHEN** calculating weapon BV for rifle weapons
- **THEN** Heavy Rifle BV SHALL be 91
- **AND** Medium Rifle BV SHALL be 35
- **AND** Light Rifle BV SHALL be 21

#### Scenario: Rifle ammo BV values

- **WHEN** calculating ammo BV for rifle ammunition
- **THEN** Heavy Rifle Ammo BV SHALL be 11 per ton
- **AND** Medium Rifle Ammo BV SHALL be 6 per ton
- **AND** Light Rifle Ammo BV SHALL be 3 per ton

#### Scenario: Rifle ammo-weapon type aliasing

- **WHEN** applying excessive ammo cap
- **AND** weapon type is `heavy-rifle` or `rifle-cannon`
- **THEN** ammo matching SHALL treat `heavy-rifle` and `rifle-cannon` as equivalent weapon types
- **AND** `AMMO_WEAPON_TYPE_ALIASES` SHALL map between these types

### Requirement: MUL BV Reference Overrides (EC-43)

The system SHALL support overriding MUL reference BV values when they are known to be stale or incorrect.

#### Scenario: MUL BV override application

- **WHEN** validating BV calculations
- **AND** a unit ID exists in `MUL_BV_OVERRIDES` map
- **THEN** the override value SHALL be used instead of the MUL index value
- **AND** the original MUL value SHALL be logged as overridden

#### Scenario: Override justification

- **WHEN** adding a MUL BV override
- **THEN** the override value MUST match MegaMek runtime BV exactly
- **AND** a comment SHALL document why the override was added
- **AND** overrides SHALL only be used for confirmed MUL/MegaMek divergences

### Requirement: PPC Capacitor BV Contribution (EC-45)

The system SHALL calculate PPC Capacitor BV contribution by matching capacitors to PPCs by shared location.

#### Scenario: PPC Capacitor BV by location

- **WHEN** calculating weapon BV
- **AND** a PPC Capacitor is found in crit slots
- **THEN** the capacitor SHALL be matched to the PPC in the same location
- **AND** IS ER PPC + Capacitor SHALL add +114 BV
- **AND** Clan ER PPC + Capacitor SHALL add +136 BV
- **AND** IS Light PPC + Capacitor SHALL add proportional BV

### Requirement: Clan Chassis CASE for MIXED Tech Units (EC-46)

The system SHALL determine implicit CASE for MIXED tech units using a three-tier detection hierarchy, NOT a blanket per-location Clan ammo heuristic.

#### Scenario: MIXED unit with Clan engine gets full CASE

- **WHEN** calculating defensive BV for a MIXED tech unit
- **AND** the engine type contains "CLAN" (e.g., CLAN_XL, CLAN_XXL)
- **THEN** implicit CASE SHALL be applied to ALL non-head locations (LT, RT, LA, RA, CT, LL, RL)

#### Scenario: MIXED unit with Clan structural components gets full CASE

- **WHEN** calculating defensive BV for a MIXED tech unit without a Clan engine
- **AND** critical slots contain Clan structural components ("Clan Endo Steel", "Clan Ferro-Fibrous", "CLDouble Heat Sink", "Clan Double Heat Sink")
- **THEN** implicit CASE SHALL be applied to ALL non-head locations

#### Scenario: Verified Clan-chassis MIXED unit gets per-location CASE

- **WHEN** calculating defensive BV for a MIXED tech unit
- **AND** the unit has no Clan engine and no Clan structural components
- **AND** the unit ID is in the `CLAN_CHASSIS_MIXED_UNITS` verified set
- **THEN** per-location implicit CASE SHALL be applied ONLY to torso/arm locations
  that contain Clan ammo (crit names starting with "Clan " and containing "ammo")

#### Scenario: IS-chassis MIXED unit gets no implicit CASE

- **WHEN** calculating defensive BV for a MIXED tech unit
- **AND** the unit has no Clan engine, no Clan structural components
- **AND** the unit ID is NOT in the `CLAN_CHASSIS_MIXED_UNITS` verified set
- **THEN** NO implicit CASE SHALL be applied
- **AND** explosive penalties SHALL be calculated normally for all locations

#### Scenario: MegaMek TechBase distinction

- **NOTE** MegaMek uses "Mixed (Clan Chassis)" vs "Mixed (IS Chassis)" in MTF files
- **AND** our MTFParserService normalizes both to "MIXED", losing the chassis distinction
- **THEN** the `CLAN_CHASSIS_MIXED_UNITS` set serves as the authoritative lookup
  until `chassisTechBase` is added to the unit data model

### Requirement: Explosive Penalty CASE Protection for CT and Legs (EC-47)

The system SHALL correctly apply CASE protection to Center Torso and leg locations
for explosive equipment BV penalty calculations.

#### Scenario: CT with CASE has no explosive penalty

- **WHEN** calculating explosive equipment penalties
- **AND** the Center Torso has CASE or CASE II
- **THEN** no explosive penalty SHALL be applied to CT
- **BECAUSE** CASE vents the explosion, preventing mech destruction

#### Scenario: Leg explosive transfers to side torso

- **WHEN** calculating explosive equipment penalties for a leg location
- **THEN** the leg SHALL transfer the penalty check to the adjacent side torso
- **AND** Left Leg SHALL transfer to Left Torso
- **AND** Right Leg SHALL transfer to Right Torso
- **AND** if the receiving torso has no penalty, the leg SHALL have no penalty

#### Scenario: Clan implicit CASE covers all non-head locations

- **WHEN** a Clan or Clan-chassis MIXED unit has implicit CASE
- **THEN** CASE SHALL be applied to ALL non-head locations: LT, RT, LA, RA, CT, LL, RL
- **AND** this eliminates explosive penalties for ALL non-head ammo locations
- **NOTE** Previously only LT, RT, LA, RA received implicit CASE, causing false
  penalties for ammo in CT and legs (confirmed by MegaMek stat block for Marauder IIC 4)

#### Scenario: MUL BV staleness from CT/leg CASE rule change

- **NOTE** MUL (Master Unit List) BV values for ~46 Clan units still reflect the
  older calculation that penalized CT and leg ammo regardless of CASE
- **AND** our calculation now matches MegaMek's current runtime behavior
- **THEN** these units appear as overcalculations vs MUL but are correct per MegaMek
- **AND** this causes exact match regression from 90.0% to 88.8% (MUL staleness, not error)

## REMOVED Requirements

None. All existing requirements remain valid; this delta adds 15 original + 10 additional calculation phases.

## MODIFIED Requirements

### Requirement: Defensive Battle Value
The system SHALL calculate defensive BV from armor, structure, and heat dissipation using BV 2.0 formulas.

#### Scenario: Defensive BV calculation
- **WHEN** calculating defensive BV
- **THEN** armor factor = total_armor_points × 2.5
- **AND** structure factor = total_internal_structure × 1.5
- **AND** defensive_BV = (armor_factor + structure_factor) × defensive_modifier

#### Scenario: Defensive modifier calculation
- **GIVEN** a mech with heat sinks and defensive equipment
- **WHEN** calculating defensive modifier
- **THEN** base modifier = 1.0
- **AND** modifier increases with heat sink count above minimum
- **AND** modifier increases with defensive equipment (AMS, ECM, BAP)

### Requirement: Offensive Battle Value
The system SHALL calculate offensive BV from weapons and ammunition using BV 2.0 formulas.

#### Scenario: Offensive BV calculation
- **WHEN** calculating offensive BV
- **THEN** each weapon SHALL contribute its base BV from equipment database
- **AND** ammunition SHALL contribute based on shots × damage potential
- **AND** offensive_BV = sum(weapon_BV × modifiers) + ammo_BV

#### Scenario: Heat-adjusted weapon BV
- **GIVEN** weapons generate more heat than can be dissipated
- **WHEN** calculating weapon BV contribution
- **THEN** excess heat weapons receive reduced BV contribution
- **AND** reduction factor based on heat overflow

#### Scenario: Targeting computer modifier
- **GIVEN** a mech has targeting computer
- **WHEN** calculating BV for direct-fire weapons
- **THEN** apply 1.25× modifier to those weapons

### Requirement: Speed Factor
Movement capability SHALL modify total BV using Target Movement Modifier table.

#### Scenario: Speed factor calculation
- **WHEN** calculating speed factor
- **THEN** TMM 0 (Walk 1-2) = 1.0
- **AND** TMM 1 (Walk 3-4) = 1.1
- **AND** TMM 2 (Walk 5-6) = 1.2
- **AND** TMM 3 (Walk 7-9) = 1.3
- **AND** TMM 4 (Walk 10-12) = 1.4
- **AND** TMM 5 (Walk 13-17) = 1.5
- **AND** TMM 6 (Walk 18-24) = 1.6
- **AND** TMM 7+ (Walk 25+) = 1.7

#### Scenario: Jump MP contribution
- **GIVEN** a mech has jump capability
- **WHEN** calculating speed factor
- **THEN** add +0.1 per jump MP above walk MP
- **AND** maximum speed factor = 2.24

### Requirement: Total Battle Value
The system SHALL calculate total BV as the product of defensive, offensive, and speed factors.

#### Scenario: Total BV calculation
- **GIVEN** defensive_BV, offensive_BV, and speed_factor are calculated
- **WHEN** calculating total BV
- **THEN** total_BV = (defensive_BV + offensive_BV) × speed_factor
- **AND** result SHALL be rounded to nearest integer

#### Scenario: Example BV calculation
- **GIVEN** Atlas AS7-D mech
- **WHEN** calculating BV
- **THEN** total BV SHALL equal 1897


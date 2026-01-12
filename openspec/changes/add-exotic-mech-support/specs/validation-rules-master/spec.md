## MODIFIED Requirements

### Requirement: Validation Rule Registration
The system SHALL register all validation rules with configuration applicability.

#### Scenario: Rule registration with configuration filter
- **WHEN** registering a validation rule
- **THEN** rule SHALL include appliesTo array of MechConfiguration values
- **AND** empty appliesTo SHALL mean rule applies to all configurations

#### Scenario: Rule execution filtering
- **WHEN** executing validation for a unit
- **THEN** validator SHALL filter rules by unit's configuration
- **AND** only rules where appliesTo includes unit configuration SHALL execute
- **AND** rules with empty appliesTo SHALL always execute

## ADDED Requirements

### Requirement: Quad-Specific Validation Rules
The system SHALL validate quad mech construction rules.

#### Scenario: Quad no hand actuators
- **GIVEN** unit is QUAD configuration
- **WHEN** validation runs
- **THEN** validator SHALL verify no hand actuators are present
- **AND** validator SHALL verify no lower arm actuators are present
- **AND** violation SHALL generate ERROR severity

#### Scenario: Quad no hand weapons
- **GIVEN** unit is QUAD configuration
- **WHEN** equipment includes hand weapons (hatchet, sword, claw, mace)
- **THEN** validator SHALL reject equipment
- **AND** error message SHALL indicate "Hand weapons cannot be mounted on quad mechs"

#### Scenario: Quad turret mounting
- **GIVEN** unit is QUAD configuration
- **WHEN** weapons are mounted facing rear arc
- **THEN** validator SHALL check turret mounting rules
- **AND** rear-facing weapons without turret SHALL generate WARNING

#### Scenario: Quad leg equipment distribution
- **GIVEN** unit is QUAD configuration
- **WHEN** equipment requires leg mounting (tracks, talons, jump boosters)
- **THEN** validator SHALL verify equipment is distributed across all 4 legs
- **AND** uneven distribution SHALL generate ERROR

### Requirement: LAM-Specific Validation Rules
The system SHALL validate LAM construction rules.

#### Scenario: LAM Landing Gear required
- **GIVEN** unit is LAM configuration
- **WHEN** validation runs
- **THEN** validator SHALL verify Landing Gear is present in CT, LT, RT
- **AND** missing Landing Gear SHALL generate ERROR
- **AND** error message SHALL indicate required locations

#### Scenario: LAM Avionics required
- **GIVEN** unit is LAM configuration
- **WHEN** validation runs
- **THEN** validator SHALL verify Avionics is present in Head, LT, RT
- **AND** missing Avionics SHALL generate ERROR

#### Scenario: LAM prohibited equipment
- **GIVEN** unit is LAM configuration
- **WHEN** equipment includes LAM-prohibited items
- **THEN** validator SHALL reject equipment
- **AND** prohibited items include: heavy gauss rifle, supercharger, modular armor, jump boosters

#### Scenario: LAM mode weapon restrictions
- **GIVEN** LAM unit has weapons mounted
- **WHEN** displaying mode-specific validation
- **THEN** Fighter mode SHALL show warnings for leg-mounted weapons
- **AND** AirMech mode SHALL show warnings for melee weapons

### Requirement: Tripod-Specific Validation Rules
The system SHALL validate tripod mech construction rules.

#### Scenario: Tripod center leg equipment
- **GIVEN** unit is TRIPOD configuration
- **WHEN** equipment requires leg mounting (tracks, talons, jump boosters)
- **THEN** validator SHALL verify equipment is distributed across all 3 legs
- **AND** center leg SHALL be included in distribution

#### Scenario: Tripod environmental sealing
- **GIVEN** unit is TRIPOD configuration
- **WHEN** Environmental Sealing is equipped
- **THEN** validator SHALL verify 1 slot in each location including CENTER_LEG
- **AND** total slots SHALL be 8 (one more than biped)

#### Scenario: Tripod stealth armor
- **GIVEN** unit is TRIPOD configuration
- **WHEN** Stealth Armor is equipped
- **THEN** validator SHALL verify slots in all limb locations including CENTER_LEG

### Requirement: QuadVee-Specific Validation Rules
The system SHALL validate QuadVee construction rules.

#### Scenario: QuadVee inherits quad rules
- **GIVEN** unit is QUADVEE configuration
- **WHEN** validation runs
- **THEN** all QUAD validation rules SHALL apply
- **AND** additional QuadVee-specific rules SHALL also apply

#### Scenario: QuadVee conversion equipment
- **GIVEN** unit is QUADVEE configuration
- **WHEN** validation runs
- **THEN** validator SHALL verify conversion equipment is present
- **AND** missing conversion equipment SHALL generate ERROR

### Requirement: Configuration Change Validation
The system SHALL validate configuration changes.

#### Scenario: Configuration change equipment check
- **GIVEN** user changes unit configuration
- **WHEN** new configuration has different equipment restrictions
- **THEN** validator SHALL check existing equipment against new rules
- **AND** incompatible equipment SHALL generate WARNING
- **AND** user SHALL be prompted to remove incompatible equipment

#### Scenario: Configuration change location mapping
- **GIVEN** user changes configuration (e.g., BIPED to QUAD)
- **WHEN** equipment is allocated to locations
- **THEN** validator SHALL check if equipment locations are valid in new config
- **AND** equipment in invalid locations SHALL be unallocated

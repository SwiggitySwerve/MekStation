# infantry-unit-system (delta)

## ADDED Requirements

### Requirement: Platoon Composition Defaults

The system SHALL initialize a platoon composition based on motive type with defaults drawn from TechManual.

#### Scenario: Foot default

- **GIVEN** a new Foot-motive infantry platoon
- **WHEN** composition is initialized
- **THEN** `platoonComposition.squads` SHALL equal 7
- **AND** `platoonComposition.troopersPerSquad` SHALL equal 4
- **AND** total troopers SHALL equal 28

#### Scenario: Jump default

- **GIVEN** a new Jump-motive platoon
- **WHEN** composition is initialized
- **THEN** total troopers SHALL equal 25 (5 × 5)

#### Scenario: Mechanized default

- **GIVEN** a new Mechanized-Tracked platoon
- **WHEN** composition is initialized
- **THEN** total troopers SHALL equal 20 (4 × 5)

#### Scenario: Out-of-range platoon size

- **GIVEN** a platoon with 35 troopers
- **WHEN** validation runs
- **THEN** `VAL-INF-PLATOON` SHALL emit "platoon size 35 exceeds maximum 30"

### Requirement: Motive Type Movement Points

The system SHALL assign movement points based on motive type.

#### Scenario: Foot MP

- **GIVEN** a Foot platoon
- **WHEN** MP is computed
- **THEN** ground MP SHALL equal 1 and jump MP SHALL equal 0

#### Scenario: Jump MP

- **GIVEN** a Jump platoon
- **WHEN** MP is computed
- **THEN** ground MP SHALL equal 3 and jump MP SHALL equal 3

#### Scenario: Mechanized Hover MP

- **GIVEN** a Mechanized-Hover platoon
- **WHEN** MP is computed
- **THEN** ground MP SHALL equal 5

#### Scenario: VTOL troop cap

- **GIVEN** a Mechanized-VTOL platoon
- **WHEN** troopers exceed 10
- **THEN** `VAL-INF-MOTIVE` SHALL emit "VTOL motive supports up to 10 troopers"

### Requirement: Armor Kit Selection

The system SHALL support armor kits that modify survival and combat without adding mech-scale armor points.

#### Scenario: Flak kit modifier

- **GIVEN** an infantry platoon wearing Flak armor
- **WHEN** incoming damage is computed
- **THEN** damage divisor SHALL be applied per TW flak rules (ballistic resistance)

#### Scenario: Sneak suit motive restriction

- **GIVEN** a Motorized platoon
- **WHEN** armor kit is set to Sneak Camo
- **THEN** `VAL-INF-ARMOR-KIT` SHALL emit "Sneak suits require Foot motive"

#### Scenario: Environmental Sealing enables vacuum

- **GIVEN** a platoon with Environmental Sealing kit
- **WHEN** a vacuum / underwater scenario is started
- **THEN** the platoon SHALL be allowed to deploy

### Requirement: Primary and Secondary Weapon Selection

The platoon SHALL select one primary weapon (carried by every trooper) and optionally a secondary (carried by 1 per N troopers).

#### Scenario: Primary weapon applied uniformly

- **GIVEN** a 28-trooper Foot platoon with primary weapon Laser Rifle
- **WHEN** squad fire is computed
- **THEN** all 28 troopers SHALL contribute Laser Rifle damage

#### Scenario: Secondary weapon ratio

- **GIVEN** a 28-trooper platoon with secondary SRM Launcher at ratio 1-per-4
- **WHEN** secondary count is computed
- **THEN** 7 troopers SHALL carry the secondary (28 / 4)

#### Scenario: Heavy primary weapon on Foot

- **GIVEN** a Foot platoon
- **WHEN** primary weapon is set to Support Heavy MG (heavy weapon)
- **THEN** `VAL-INF-WEAPON` SHALL emit an error — heavy primary requires Mechanized / Motorized motive

### Requirement: Field Gun Integration

The system SHALL allow a platoon to crew one field gun from the approved list.

#### Scenario: Field gun crew

- **GIVEN** a 20-trooper platoon crewing an AC/5 field gun (crew 3)
- **WHEN** effective combat-ready trooper count is computed
- **THEN** 17 troopers SHALL contribute personal weapons
- **AND** 3 troopers SHALL operate the field gun

#### Scenario: Over-crew field gun

- **GIVEN** a 5-trooper platoon with an AC/20 field gun (crew 5)
- **WHEN** validation runs
- **THEN** `VAL-INF-FIELD-GUN` SHALL emit "field gun crew ≥ platoon size"

### Requirement: Anti-Mech Training

The system SHALL support an anti-mech training flag enabling leg / swarm attacks in combat.

#### Scenario: Anti-mech enabled

- **GIVEN** a Foot platoon with `antiMechTraining = true`
- **WHEN** combat options are enumerated
- **THEN** Leg Attack and Swarm Attack SHALL be available options
- **AND** the BV multiplier for anti-mech training SHALL be recorded for the BV calculator

#### Scenario: Motorized cannot train anti-mech

- **GIVEN** a Motorized platoon with `antiMechTraining = true`
- **WHEN** validation runs
- **THEN** `VAL-INF-ANTI-MECH` SHALL emit "anti-mech training requires Foot, Jump, or Mechanized motive"

### Requirement: Infantry Construction Validation Rule Set

The validation registry SHALL include the `VAL-INF-*` rule group.

#### Scenario: Rule ids registered

- **WHEN** the validation registry initializes
- **THEN** `VAL-INF-PLATOON`, `VAL-INF-MOTIVE`, `VAL-INF-ARMOR-KIT`, `VAL-INF-WEAPON`, `VAL-INF-FIELD-GUN`, and `VAL-INF-ANTI-MECH` SHALL be registered

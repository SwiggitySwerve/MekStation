# aerospace-unit-system (delta)

## ADDED Requirements

### Requirement: Aerospace Thrust Derivation

The system SHALL derive Safe Thrust and Max Thrust from engine rating and tonnage.

#### Scenario: ASF safe-thrust calculation

- **GIVEN** a 50-ton aerospace fighter with engine rating 250
- **WHEN** thrust is computed
- **THEN** `safeThrust` SHALL equal 5 (250 / 50)
- **AND** `maxThrust` SHALL equal 7 (floor(5 × 1.5))

#### Scenario: Conventional fighter fusion exclusion

- **GIVEN** a conventional fighter
- **WHEN** engine type is set to Fusion
- **THEN** validation SHALL emit an error — conventional fighters require ICE or Fuel Cell engines

#### Scenario: Exceeds class thrust cap

- **GIVEN** a 5-ton aerospace fighter with rating 100 → safeThrust 20
- **WHEN** thrust is validated
- **THEN** validation SHALL cap safeThrust at the class maximum from the thrust-by-tonnage table

### Requirement: Structural Integrity Calculation

The system SHALL compute and validate Structural Integrity (SI) per aerospace sub-type.

#### Scenario: Default SI

- **GIVEN** a 60-ton ASF with no SI override
- **WHEN** SI is computed
- **THEN** `structuralIntegrity` SHALL equal `ceil(60 / 10) = 6`

#### Scenario: SI weight cost

- **GIVEN** a 50-ton ASF with SI = 7 (one above default 5)
- **WHEN** SI weight is computed
- **THEN** the weight cost SHALL reflect `(7 − 5) × (50 / 10) × 0.5 = 5.0 tons` of additional mass
- **AND** the calculator SHALL charge this mass against total tonnage

#### Scenario: SI over class max

- **GIVEN** a CF with SI requested 20 (class max 15)
- **WHEN** SI is validated
- **THEN** `VAL-AERO-SI` SHALL emit an error

### Requirement: Fuel Tonnage Minimum

Each aerospace sub-type SHALL enforce a minimum fuel tonnage, with fuel points derived from engine type.

#### Scenario: ASF minimum fuel

- **GIVEN** an aerospace fighter configured with 4 tons of fuel
- **WHEN** validation runs
- **THEN** `VAL-AERO-FUEL` SHALL emit an error — ASF requires minimum 5 tons

#### Scenario: Fusion fuel points

- **GIVEN** a fusion-engined ASF with 5 tons of fuel
- **WHEN** fuel points are computed
- **THEN** `fuelPoints` SHALL equal `5 × 80 = 400`

#### Scenario: Small craft minimum fuel

- **GIVEN** a small craft with 15 tons of fuel
- **WHEN** validation runs
- **THEN** `VAL-AERO-FUEL` SHALL emit an error — small craft require minimum 20 tons

### Requirement: Armor Allocation per Firing Arc

The system SHALL split armor across aerospace arcs and enforce per-arc maxima.

#### Scenario: ASF four-arc maxima

- **GIVEN** a 50-ton ASF
- **WHEN** per-arc armor max is computed
- **THEN** Nose, LeftWing, RightWing, and Aft SHALL each have a defined max derived from tonnage × arc-factor
- **AND** total armor SHALL NOT exceed the sum of arc maxima

#### Scenario: Exceed arc max

- **GIVEN** a 50-ton ASF where the Nose max is 40 points
- **WHEN** the user sets Nose armor to 45
- **THEN** `VAL-AERO-ARC-MAX` SHALL emit an error

#### Scenario: Small craft side arcs

- **GIVEN** a small craft
- **WHEN** armor arcs are listed
- **THEN** the four arcs SHALL be Nose, LeftSide, RightSide, Aft (not LeftWing / RightWing)

### Requirement: Equipment Mounting per Arc

The system SHALL mount equipment to legal aerospace arcs and enforce slot counts.

#### Scenario: Nose slot count

- **GIVEN** an ASF
- **WHEN** the user tries to mount 7 weapons in the Nose
- **THEN** mounting SHALL fail — Nose arc holds at most 6

#### Scenario: Fuselage unlimited slots

- **GIVEN** an ASF with 8 tons of equipment destined for Fuselage
- **WHEN** mounting is attempted
- **THEN** mounting SHALL succeed if total tonnage fits
- **AND** Fuselage SHALL have no arc-slot count limit

### Requirement: Small Craft Crew Quarters

Small craft SHALL require crew and passenger quarters weight in construction.

#### Scenario: Minimum crew

- **GIVEN** a 150-ton small craft
- **WHEN** minimum crew is computed
- **THEN** the minimum SHALL equal the small-craft-crew table value (≥ 3)
- **AND** quarters weight SHALL equal crew × 5 tons (Standard quarters)

#### Scenario: No quarters → validation error

- **GIVEN** a small craft with 0 tons quarters
- **WHEN** validation runs
- **THEN** `VAL-AERO-CREW` SHALL emit an error

### Requirement: Wing-Mounted Heavy Weapon Cap

The system SHALL cap the total tonnage of heavy weapons (PPC family, Gauss family, AC/20) mounted in any single wing arc of an ASF or CF at `floor(unitTonnage / 10)`. Small craft are exempt — `VAL-AERO-WING-HEAVY` SHALL NOT fire for sub-type Small Craft.

#### Scenario: Wing cap exceeded on ASF

- **GIVEN** a 65t ASF (cap = 6t per wing)
- **WHEN** a 15t Gauss Rifle is mounted in the right wing
- **THEN** `VAL-AERO-WING-HEAVY` SHALL emit an error

#### Scenario: Small craft exempt

- **GIVEN** a 100t small craft with 20t of PPCs in a side arc
- **WHEN** validation runs
- **THEN** `VAL-AERO-WING-HEAVY` SHALL NOT fire

### Requirement: Small Craft Bomb Bay Configuration

Small craft SHALL support multiple configurable bomb bays. Each bay SHALL cost `1 + capacityBombs` tons (1 ton structure + 1 ton per bomb of capacity). Total bomb-bay tonnage SHALL NOT exceed `floor(unitTonnage / 2)`. ASF and CF SHALL NOT declare configurable bomb bays — `VAL-AERO-BOMB-BAY` SHALL emit an error if they do.

#### Scenario: Bomb bays exceed cap

- **GIVEN** a 100t small craft (cap = 50t)
- **WHEN** two bays totalling 56t are configured
- **THEN** `VAL-AERO-BOMB-BAY` SHALL emit an error

#### Scenario: ASF declares bomb bays

- **GIVEN** a 65t ASF with a bomb bay declared
- **WHEN** validation runs
- **THEN** `VAL-AERO-BOMB-BAY` SHALL emit an error — only small craft may use configurable bays

### Requirement: Aerospace Construction Validation Rules

The validation registry SHALL include the `VAL-AERO-*` rule group.

#### Scenario: Rule ids registered

- **WHEN** the validation registry initializes
- **THEN** `VAL-AERO-TONNAGE`, `VAL-AERO-THRUST`, `VAL-AERO-SI`, `VAL-AERO-FUEL`, `VAL-AERO-ARC-MAX`, `VAL-AERO-CREW`, `VAL-AERO-WING-HEAVY`, and `VAL-AERO-BOMB-BAY` SHALL be registered

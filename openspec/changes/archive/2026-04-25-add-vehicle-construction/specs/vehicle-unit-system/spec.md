# vehicle-unit-system (delta)

## ADDED Requirements

### Requirement: Engine Selection and Weight

The system SHALL compute engine weight and validate engine rating against vehicle tonnage and motion type.

#### Scenario: Fusion engine weight

- **GIVEN** a 40-ton tracked vehicle with cruise MP 4
- **WHEN** engine is set to Fusion
- **THEN** engine rating SHALL equal 160 (tonnage × cruiseMP)
- **AND** engine weight SHALL equal the Fusion rating-to-tons entry (5.5 t for 160)

#### Scenario: XL engine half-weight

- **GIVEN** the same 40-ton tracked vehicle
- **WHEN** engine is set to XL
- **THEN** engine weight SHALL equal Fusion weight × 0.5 (rounded to nearest half-ton)

#### Scenario: Engine rating exceeds maximum

- **WHEN** requested engine rating exceeds 400
- **THEN** validation SHALL emit `VAL-VEHICLE-ENGINE` error "Engine rating 420 exceeds maximum 400"

#### Scenario: Motion-type engine exclusions

- **GIVEN** a Hover vehicle
- **WHEN** engine type is set to Internal Combustion
- **THEN** validation SHALL emit an error — Hover requires Fusion, XL, Light, or Fuel Cell engines

### Requirement: Internal Structure Calculation

The system SHALL compute vehicle internal structure weight as 10% of tonnage rounded to the nearest half-ton.

#### Scenario: 40-ton vehicle structure weight

- **GIVEN** a 40-ton combat vehicle with Standard structure
- **WHEN** internal structure weight is computed
- **THEN** the result SHALL equal 4.0 tons

#### Scenario: Endo-Steel structure weight

- **GIVEN** a 50-ton combat vehicle with Endo-Steel structure
- **WHEN** internal structure weight is computed
- **THEN** the result SHALL equal 2.5 tons (5.0 × 0.5)

### Requirement: Armor Allocation with Per-Location Maximum

The system SHALL enforce armor points per location ≤ 2 × internal structure at that location.

#### Scenario: Armor cap on turret

- **GIVEN** a vehicle with turret structure 5
- **WHEN** user sets turret armor to 11
- **THEN** validation SHALL emit `VAL-VEHICLE-ARMOR-LOC` error "Turret armor 11 exceeds maximum 10"

#### Scenario: VTOL Rotor armor

- **GIVEN** a VTOL with rotor structure 2
- **WHEN** rotor armor is set above 4
- **THEN** validation SHALL emit an armor-cap error

#### Scenario: Support vehicle BAR armor

- **GIVEN** a support vehicle with BAR rating 7
- **WHEN** armor weight is computed
- **THEN** points per ton SHALL follow the BAR-7 row of the support-armor table
- **AND** the `barRating` SHALL be recorded on the unit

### Requirement: Turret System Weight Rule

The system SHALL compute turret weight as 10% of turret-mounted equipment weight, rounded up to the nearest half-ton.

#### Scenario: Single turret weight

- **GIVEN** a turret holding 6 tons of weapons + ammo
- **WHEN** turret weight is computed
- **THEN** turret weight SHALL equal 1.0 ton (0.6 rounded up to 1.0 — half-ton increments)

#### Scenario: Dual turret tonnage gate

- **GIVEN** a 45-ton combat vehicle
- **WHEN** the user selects Dual turret
- **THEN** validation SHALL emit an error — dual turrets require ≥ 50 tons

#### Scenario: VTOL chin turret

- **GIVEN** a VTOL
- **WHEN** turret config is set to Chin
- **THEN** turret weight SHALL equal 5% of chin-mounted equipment weight
- **AND** Standard / Dual / Sponson turret options SHALL be disabled

### Requirement: Crew Size Derivation

The system SHALL derive minimum crew size from tonnage and motion type and reject understaffed configurations.

#### Scenario: Tracked 40-ton crew

- **GIVEN** a 40-ton tracked combat vehicle
- **WHEN** minimum crew is computed
- **THEN** the result SHALL equal 3 (driver + gunner + commander)

#### Scenario: VTOL crew

- **GIVEN** any VTOL
- **WHEN** minimum crew is computed
- **THEN** the result SHALL equal at least 2 (pilot + gunner)

#### Scenario: Understaffed vehicle validation

- **GIVEN** a vehicle with configured crew below its minimum
- **WHEN** validation runs
- **THEN** `VAL-VEHICLE-CREW` error SHALL fire

### Requirement: Power Amplifier Requirement

The system SHALL require power amplifiers for energy weapons when the engine is ICE or Fuel Cell.

#### Scenario: Power amps required

- **GIVEN** an ICE-powered vehicle with 4 tons of energy weapons
- **WHEN** power-amp weight is computed
- **THEN** the result SHALL equal 0.5 tons (10% rounded up to half-ton)
- **AND** that weight SHALL be counted against total tonnage

#### Scenario: No power amps for fusion

- **GIVEN** a Fusion-engined vehicle with any energy weapons
- **WHEN** power-amp requirement is evaluated
- **THEN** power amps SHALL NOT be required

### Requirement: Weapon and Equipment Mounting Arcs

The system SHALL mount weapons and equipment to legal vehicle locations and reject arc violations.

#### Scenario: Legal turret mount

- **GIVEN** a combat vehicle with Single turret
- **WHEN** a PPC is mounted in the Turret location
- **THEN** mounting SHALL succeed

#### Scenario: Rear-only sponson rejection

- **GIVEN** a combat vehicle with Sponson turrets
- **WHEN** equipment is mounted to a sponson in the Rear arc
- **THEN** mounting SHALL fail — sponsons fire forward-side only

### Requirement: Construction Validation Rule Set

The system SHALL register the `VAL-VEHICLE-*` rule group covering tonnage, engine, turret, armor, crew, and power-amp validations.

#### Scenario: Validation rule ids present

- **WHEN** the validation registry initializes
- **THEN** rule ids `VAL-VEHICLE-TONNAGE`, `VAL-VEHICLE-ENGINE`, `VAL-VEHICLE-TURRET`, `VAL-VEHICLE-ARMOR-LOC`, `VAL-VEHICLE-CREW`, and `VAL-VEHICLE-POWER-AMP` SHALL be registered

#### Scenario: Legal vehicle passes all rules

- **GIVEN** a legally constructed 40-ton Manticore
- **WHEN** validation runs
- **THEN** no `VAL-VEHICLE-*` errors SHALL be emitted

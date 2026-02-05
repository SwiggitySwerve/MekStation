# equipment-services Specification Delta

## MODIFIED Requirements

### Requirement: Formula Type System

The system SHALL define a structured formula type system for variable equipment calculations.

**Rationale**: Data-driven formulas enable extensibility without code changes. Extended to support physical weapon damage calculations.

**Priority**: Critical

#### Scenario: Define formula types

- **WHEN** defining a variable equipment formula
- **THEN** formula type MUST be one of: FIXED, CEIL_DIVIDE, FLOOR_DIVIDE, MULTIPLY, MULTIPLY_ROUND, EQUALS_WEIGHT, EQUALS_FIELD, MIN, MAX, PLUS
- **AND** each type has specific required fields

#### Scenario: PLUS combinator

- **GIVEN** a formula with type PLUS and a base formula with a bonus value
- **WHEN** evaluating the formula
- **THEN** return the result of the base formula plus the bonus value

#### Scenario: MIN combinator

- **GIVEN** a formula with type MIN and formulas array
- **WHEN** evaluating the formula
- **THEN** return the minimum value of all sub-formula evaluations

#### Scenario: MAX combinator

- **GIVEN** a formula with type MAX and formulas array
- **WHEN** evaluating the formula
- **THEN** return the maximum value of all sub-formula evaluations

---

### Requirement: Variable Equipment Property Calculation

The system SHALL calculate properties for equipment whose values depend on mech context, using the formula registry and evaluator.

**Rationale**: Data-driven calculation replaces hardcoded switch statements. Extended to support physical weapon damage.

**Priority**: Critical

#### Scenario: Calculate Targeting Computer weight

- **GIVEN** a mech with 10 tons of direct-fire weapons
- **WHEN** calculateProperties("targeting-computer-is", context) is called
- **THEN** look up formulas in registry
- **AND** evaluate weight formula: ceil(10 / 4) = 3 tons
- **AND** evaluate slots formula: EQUALS_WEIGHT = 3
- **AND** evaluate cost formula: 3 × 10000 = 30000
- **AND** return { weight: 3, criticalSlots: 3, cost: 30000 }

#### Scenario: Calculate MASC weight

- **GIVEN** a mech with engine rating 300 and 75 tons
- **WHEN** calculateProperties("masc-is", { engineRating: 300, tonnage: 75 }) is called
- **THEN** look up formulas in registry
- **AND** evaluate weight formula: ceil(300 / 20) = 15 tons
- **AND** return weight = 15, criticalSlots = 15

#### Scenario: Calculate physical weapon properties with damage

- **GIVEN** a 75-ton mech
- **WHEN** calculateProperties("hatchet", { tonnage: 75 }) is called
- **THEN** evaluate weight formula: ceil(75 / 15) = 5 tons
- **AND** evaluate slots formula: EQUALS_WEIGHT = 5
- **AND** evaluate damage formula: floor(75 / 5) = 15
- **AND** return { weight: 5, criticalSlots: 5, cost: 25000, damage: 15 }

#### Scenario: Calculate Sword damage with bonus

- **GIVEN** a 50-ton mech
- **WHEN** calculateProperties("sword", { tonnage: 50 }) is called
- **THEN** evaluate damage formula: floor(50 / 10) + 1 = 6
- **AND** return damage = 6

#### Scenario: Calculate custom equipment

- **GIVEN** custom formulas registered for "my-custom-equipment"
- **WHEN** calculateProperties("my-custom-equipment", context) is called
- **THEN** use custom formulas from registry
- **AND** return calculated properties

#### Scenario: Unknown equipment

- **GIVEN** no formulas exist for "unknown-equipment"
- **WHEN** calculateProperties("unknown-equipment", context) is called
- **THEN** throw ValidationError "Unknown variable equipment: unknown-equipment"

---

## ADDED Requirements

### Requirement: Physical Weapon Formula Definitions

The system SHALL define data-driven formulas for all standard physical weapons.

**Rationale**: Physical weapons have variable weight, slots, and damage based on mech tonnage. Using the unified formula system enables custom physical weapons.

**Priority**: High

#### Scenario: Hatchet formula

- **GIVEN** builtin formulas include "hatchet"
- **THEN** weight formula = CEIL_DIVIDE(tonnage, 15)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** cost formula = MULTIPLY(weight, 5000)
- **AND** damage formula = FLOOR_DIVIDE(tonnage, 5)
- **AND** requiredContext = ["tonnage"]

#### Scenario: Sword formula

- **GIVEN** builtin formulas include "sword"
- **THEN** weight formula = CEIL_DIVIDE(tonnage, 15)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** cost formula = MULTIPLY(weight, 10000)
- **AND** damage formula = PLUS(FLOOR_DIVIDE(tonnage, 10), 1)
- **AND** requiredContext = ["tonnage"]

#### Scenario: Mace formula

- **GIVEN** builtin formulas include "mace"
- **THEN** weight formula = CEIL_DIVIDE(tonnage, 10)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** cost formula = MULTIPLY(weight, 7500)
- **AND** damage formula = FLOOR_DIVIDE(tonnage, 4)
- **AND** requiredContext = ["tonnage"]

#### Scenario: Claws formula (Clan)

- **GIVEN** builtin formulas include "claws"
- **THEN** weight formula = CEIL_DIVIDE(tonnage, 15)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** damage formula = FLOOR_DIVIDE(tonnage, 7)
- **AND** requiredContext = ["tonnage"]

#### Scenario: Lance formula

- **GIVEN** builtin formulas include "lance"
- **THEN** weight formula = CEIL_DIVIDE(tonnage, 20)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** damage formula = PLUS(FLOOR_DIVIDE(tonnage, 5), 1)
- **AND** requiredContext = ["tonnage"]

#### Scenario: Talons formula (Clan)

- **GIVEN** builtin formulas include "talons"
- **THEN** weight formula = CEIL_DIVIDE(tonnage, 15)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** damage formula = FLOOR_DIVIDE(tonnage, 7)
- **AND** requiredContext = ["tonnage"]

#### Scenario: Retractable Blade formula

- **GIVEN** builtin formulas include "retractable-blade"
- **THEN** weight formula = MULTIPLY_ROUND(tonnage, 0.05, 0.5)
- **AND** slots formula = FIXED(1) per arm
- **AND** damage formula = FLOOR_DIVIDE(tonnage, 10)
- **AND** requiredContext = ["tonnage"]

#### Scenario: Flail formula

- **GIVEN** builtin formulas include "flail"
- **THEN** weight formula = CEIL_DIVIDE(tonnage, 5)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** damage formula = PLUS(FLOOR_DIVIDE(tonnage, 4), 2)
- **AND** requiredContext = ["tonnage"]

#### Scenario: Wrecking Ball formula

- **GIVEN** builtin formulas include "wrecking-ball"
- **THEN** weight formula = CEIL_DIVIDE(tonnage, 10)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** damage formula = PLUS(FLOOR_DIVIDE(tonnage, 5), 3)
- **AND** requiredContext = ["tonnage"]

---

### Requirement: Damage Formula Support

The system SHALL support optional damage calculation in variable equipment formulas.

**Rationale**: Physical weapons require damage calculation based on mech tonnage, fitting the same pattern as weight/slots/cost.

**Priority**: High

#### Scenario: Formula set with damage

- **GIVEN** a formula definition with damage field
- **WHEN** evaluating the formula set
- **THEN** calculate damage using the provided formula
- **AND** include damage in returned properties

#### Scenario: Formula set without damage

- **GIVEN** a formula definition without damage field (e.g., Targeting Computer)
- **WHEN** evaluating the formula set
- **THEN** do not include damage in returned properties
- **AND** return undefined for damage field

---

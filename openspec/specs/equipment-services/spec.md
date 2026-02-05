# equipment-services Specification

## Purpose

Provides services for equipment lookup, filtering, and variable property calculations. Uses a data-driven formula registry to calculate weight, slots, cost, and damage for variable equipment like Targeting Computers, MASC, and physical weapons.

## Requirements

### Requirement: Equipment Lookup by ID

The system SHALL retrieve equipment by unique identifier.

**Rationale**: Core operation for loading equipment details.

**Priority**: Critical

#### Scenario: Get existing equipment

- **GIVEN** equipment with ID "weapon-er-large-laser-is" exists
- **WHEN** EquipmentLookupService.getById("weapon-er-large-laser-is") is called
- **THEN** return the complete IEquipmentItem

#### Scenario: Equipment not found

- **GIVEN** no equipment with the given ID
- **WHEN** getById("nonexistent") is called
- **THEN** return undefined

---

### Requirement: Equipment Lookup by Category

The system SHALL retrieve all equipment in a given category.

**Rationale**: Users need to browse equipment by type (e.g., all energy weapons).

**Priority**: High

#### Scenario: Get energy weapons

- **GIVEN** multiple energy weapons exist
- **WHEN** getByCategory(EquipmentCategory.ENERGY_WEAPON) is called
- **THEN** return array of all energy weapon equipment items

#### Scenario: Empty category

- **GIVEN** no equipment in a category
- **WHEN** getByCategory(emptyCategory) is called
- **THEN** return empty array

---

### Requirement: Equipment Lookup by Tech Base

The system SHALL retrieve equipment compatible with a tech base.

**Rationale**: Users building IS or Clan mechs need filtered equipment lists.

**Priority**: High

#### Scenario: Get Clan equipment

- **GIVEN** equipment with various tech bases
- **WHEN** getByTechBase(TechBase.CLAN) is called
- **THEN** return only equipment with Clan tech base

#### Scenario: Get Inner Sphere equipment

- **GIVEN** equipment with various tech bases
- **WHEN** getByTechBase(TechBase.INNER_SPHERE) is called
- **THEN** return only equipment with Inner Sphere tech base

---

### Requirement: Equipment Lookup by Era

The system SHALL retrieve equipment available in a given year.

**Rationale**: Era-appropriate builds require filtering by introduction year.

**Priority**: High

#### Scenario: Get 3050 equipment

- **GIVEN** equipment with various introduction years
- **WHEN** getByEra(3050) is called
- **THEN** return only equipment with introductionYear <= 3050

#### Scenario: Extinct equipment excluded

- **GIVEN** equipment that went extinct before the target year
- **WHEN** getByEra(year) is called
- **THEN** exclude equipment where extinctionYear < year AND reintroductionYear > year

---

### Requirement: Equipment Name Search

The system SHALL search equipment by name substring.

**Rationale**: Users need to find equipment quickly by typing part of the name.

**Priority**: High

#### Scenario: Search by name

- **GIVEN** equipment named "ER Large Laser" and "Large Laser"
- **WHEN** search("Large Laser") is called
- **THEN** return both matching equipment items

#### Scenario: Case insensitive search

- **GIVEN** equipment named "ER Large Laser"
- **WHEN** search("er large") is called
- **THEN** return the matching equipment

#### Scenario: No matches

- **GIVEN** no equipment matching the query
- **WHEN** search("xyznonexistent") is called
- **THEN** return empty array

---

### Requirement: Combined Equipment Filter

The system SHALL filter equipment by multiple criteria simultaneously.

**Rationale**: Users need to narrow down equipment lists by tech base, category, era, and name together.

**Priority**: High

#### Scenario: Filter by tech base and category

- **GIVEN** equipment with various tech bases and categories
- **WHEN** query({ techBase: TechBase.CLAN, category: EquipmentCategory.ENERGY_WEAPON }) is called
- **THEN** return only Clan energy weapons

#### Scenario: Filter by era and tech base

- **GIVEN** equipment with various introduction years
- **WHEN** query({ techBase: TechBase.INNER_SPHERE, year: 3025 }) is called
- **THEN** return only Inner Sphere equipment available in 3025

#### Scenario: Filter with name search

- **GIVEN** equipment matching "laser"
- **WHEN** query({ nameQuery: "laser", techBase: TechBase.CLAN }) is called
- **THEN** return only Clan equipment with "laser" in the name

#### Scenario: All filters combined

- **GIVEN** diverse equipment database
- **WHEN** query({ category: EquipmentCategory.MISSILE_WEAPON, techBase: TechBase.INNER_SPHERE, year: 3050, nameQuery: "LRM" }) is called
- **THEN** return only IS LRM weapons available in 3050

---

### Requirement: Get All Weapons

The system SHALL provide access to all weapon definitions.

**Rationale**: Construction UI needs complete weapon lists.

**Priority**: High

#### Scenario: Get all weapons

- **WHEN** getAllWeapons() is called
- **THEN** return array of all IWeapon objects
- **AND** include energy, ballistic, missile, artillery, and capital weapons

---

### Requirement: Get All Ammunition

The system SHALL provide access to all ammunition definitions.

**Rationale**: Ammunition selection depends on equipped weapons.

**Priority**: High

#### Scenario: Get all ammunition

- **WHEN** getAllAmmunition() is called
- **THEN** return array of all IAmmunition objects

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

### Requirement: Check Variable Equipment

The system SHALL identify whether equipment has variable properties by checking registry presence.

**Rationale**: Derived from registry rather than hardcoded list.

**Priority**: Medium

#### Scenario: Builtin variable equipment

- **WHEN** isVariable("targeting-computer-is") is called
- **THEN** return true (formulas exist in registry)

#### Scenario: Custom variable equipment

- **GIVEN** custom formulas registered for "my-custom-tc"
- **WHEN** isVariable("my-custom-tc") is called
- **THEN** return true

#### Scenario: Non-variable equipment

- **WHEN** isVariable("weapon-medium-laser-is") is called
- **THEN** return false (no formulas in registry)

---

### Requirement: Get Required Context

The system SHALL report what context fields are needed for variable equipment, extracted from formula definitions.

**Rationale**: Required context defined alongside formulas, not separately.

**Priority**: Medium

#### Scenario: Targeting Computer context

- **WHEN** getRequiredContext("targeting-computer-is") is called
- **THEN** return formulas.requiredContext = ["directFireWeaponTonnage"]

#### Scenario: MASC context

- **WHEN** getRequiredContext("masc-is") is called
- **THEN** return formulas.requiredContext = ["engineRating", "tonnage"]

#### Scenario: Unknown equipment

- **WHEN** getRequiredContext("unknown-equipment") is called
- **THEN** return empty array []

---

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

### Requirement: Formula Evaluator

The system SHALL provide a generic formula evaluator that interprets formula definitions.

**Rationale**: Single evaluation engine for all variable equipment.

**Priority**: Critical

#### Scenario: Evaluate CEIL_DIVIDE formula

- **GIVEN** a formula { type: 'CEIL_DIVIDE', field: 'directFireWeaponTonnage', divisor: 4 }
- **AND** context { directFireWeaponTonnage: 10 }
- **WHEN** FormulaEvaluator.evaluate(formula, context) is called
- **THEN** return ceil(10 / 4) = 3

#### Scenario: Evaluate MULTIPLY_ROUND formula

- **GIVEN** a formula { type: 'MULTIPLY_ROUND', field: 'tonnage', multiplier: 0.05, roundTo: 0.5 }
- **AND** context { tonnage: 75 }
- **WHEN** FormulaEvaluator.evaluate(formula, context) is called
- **THEN** return 4.0 (75 × 0.05 = 3.75, rounded up to nearest 0.5)

#### Scenario: Evaluate nested MIN formula

- **GIVEN** a formula { type: 'MIN', formulas: [{ type: 'FIXED', value: 10 }, { type: 'CEIL_DIVIDE', field: 'rating', divisor: 25 }] }
- **AND** context { rating: 300 }
- **WHEN** evaluating the formula
- **THEN** return min(10, ceil(300/25)) = min(10, 12) = 10

#### Scenario: Missing context field

- **GIVEN** a formula referencing field 'engineRating'
- **AND** context without engineRating
- **WHEN** evaluating the formula
- **THEN** throw ValidationError with message indicating missing field

---

### Requirement: Formula Registry

The system SHALL provide a layered formula registry supporting both builtin and custom formulas.

**Rationale**: Builtin formulas are versioned with code; custom formulas support user-defined equipment.

**Priority**: Critical

#### Scenario: Get builtin formulas

- **GIVEN** builtin formulas are defined for "targeting-computer-is"
- **WHEN** FormulaRegistry.getFormulas("targeting-computer-is") is called
- **THEN** return the builtin formula definitions

#### Scenario: Custom overrides builtin

- **GIVEN** builtin formulas exist for "targeting-computer-is"
- **AND** custom formulas are registered for "targeting-computer-is"
- **WHEN** FormulaRegistry.getFormulas("targeting-computer-is") is called
- **THEN** return the custom formula definitions (not builtin)

#### Scenario: Get custom-only formulas

- **GIVEN** custom formulas are registered for "custom-equipment-123"
- **AND** no builtin formulas exist for that ID
- **WHEN** FormulaRegistry.getFormulas("custom-equipment-123") is called
- **THEN** return the custom formula definitions

#### Scenario: No formulas exist

- **GIVEN** no builtin or custom formulas for "unknown-equipment"
- **WHEN** FormulaRegistry.getFormulas("unknown-equipment") is called
- **THEN** return undefined

---

### Requirement: Custom Formula Registration

The system SHALL allow runtime registration of custom equipment formulas.

**Rationale**: Users can define variable formulas for custom equipment.

**Priority**: High

#### Scenario: Register custom formulas

- **GIVEN** a new custom equipment "my-custom-tc"
- **WHEN** FormulaRegistry.registerCustomFormulas("my-custom-tc", formulas) is called
- **THEN** formulas are stored in memory
- **AND** formulas are persisted to IndexedDB

#### Scenario: Update custom formulas

- **GIVEN** custom formulas exist for "my-custom-tc"
- **WHEN** registerCustomFormulas("my-custom-tc", newFormulas) is called
- **THEN** replace existing formulas with new formulas

#### Scenario: Unregister custom formulas

- **GIVEN** custom formulas exist for "my-custom-tc"
- **WHEN** FormulaRegistry.unregisterCustomFormulas("my-custom-tc") is called
- **THEN** formulas are removed from memory
- **AND** formulas are removed from IndexedDB

---

### Requirement: Custom Formula Persistence

The system SHALL persist custom formulas in IndexedDB across sessions.

**Rationale**: User-defined formulas must survive page refresh.

**Priority**: High

#### Scenario: Load custom formulas on initialization

- **GIVEN** custom formulas were previously saved to IndexedDB
- **WHEN** FormulaRegistry.initialize() is called
- **THEN** load all custom formulas into memory

#### Scenario: Persist on registration

- **GIVEN** FormulaRegistry is initialized
- **WHEN** registerCustomFormulas is called
- **THEN** save formulas to IndexedDB 'custom-formulas' store

---

### Requirement: Builtin Variable Equipment Formulas

The system SHALL define data-driven formulas for all standard variable equipment.

**Rationale**: Replaces hardcoded calculation methods with declarative definitions.

**Priority**: Critical

#### Scenario: Targeting Computer IS formula

- **GIVEN** builtin formulas include "targeting-computer-is"
- **THEN** weight formula = CEIL_DIVIDE(directFireWeaponTonnage, 4)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** cost formula = MULTIPLY(weight, 10000)
- **AND** requiredContext = ["directFireWeaponTonnage"]

#### Scenario: Targeting Computer Clan formula

- **GIVEN** builtin formulas include "targeting-computer-clan"
- **THEN** weight formula = CEIL_DIVIDE(directFireWeaponTonnage, 5)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** cost formula = MULTIPLY(weight, 10000)

#### Scenario: MASC IS formula

- **GIVEN** builtin formulas include "masc-is"
- **THEN** weight formula = ROUND_DIVIDE(tonnage, 20)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** cost formula = MULTIPLY(tonnage, 1000)
- **AND** requiredContext = ["tonnage"]
- **AND** example: 85t → 4 tons, 90t → 5 tons (rounds to nearest)

#### Scenario: MASC Clan formula

- **GIVEN** builtin formulas include "masc-clan"
- **THEN** weight formula = ROUND_DIVIDE(tonnage, 25)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** cost formula = MULTIPLY(tonnage, 1000)
- **AND** requiredContext = ["tonnage"]

#### Scenario: Supercharger formula

- **GIVEN** builtin formulas include "supercharger"
- **THEN** weight formula = MULTIPLY_ROUND(engineWeight, 0.1, roundTo: 0.5)
- **AND** slots formula = FIXED(1)
- **AND** cost formula = MULTIPLY(engineWeight, 10000)
- **AND** requiredContext = ["engineWeight"]

#### Scenario: Partial Wing formula

- **GIVEN** builtin formulas include "partial-wing"
- **THEN** weight formula = MULTIPLY_ROUND(tonnage, 0.05, roundTo: 0.5)
- **AND** slots formula = FIXED(6)
- **AND** cost formula = MULTIPLY(weight, 50000)
- **AND** requiredContext = ["tonnage"]

#### Scenario: TSM formula

- **GIVEN** builtin formulas include "tsm"
- **THEN** weight formula = FIXED(0)
- **AND** slots formula = FIXED(6)
- **AND** cost formula = MULTIPLY(tonnage, 16000)
- **AND** requiredContext = ["tonnage"]

---

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

### Requirement: JSON Equipment Loading

The system SHALL load equipment definitions from JSON files at runtime.

**Rationale**: Data-driven equipment enables updates without code changes and supports user customization.

**Priority**: Critical

#### Scenario: Load official equipment

- **GIVEN** the application is initializing
- **WHEN** EquipmentLoaderService.loadOfficialEquipment() is called
- **THEN** load all JSON files from `public/data/equipment/official/`
- **AND** register each item in the EquipmentRegistry
- **AND** return IEquipmentLoadResult with success status and item count

#### Scenario: Load weapon categories

- **GIVEN** official equipment is being loaded
- **WHEN** processing weapon files
- **THEN** load `weapons/energy.json`, `weapons/ballistic.json`, `weapons/missile.json`, `weapons/physical.json`
- **AND** convert raw JSON to typed IWeapon objects

#### Scenario: Load other equipment

- **GIVEN** official equipment is being loaded
- **WHEN** processing non-weapon files
- **THEN** load `ammunition.json`, `electronics.json`, `miscellaneous.json`
- **AND** convert to appropriate typed objects (IAmmunition, IElectronics, IMiscEquipment)

#### Scenario: Equipment load failure

- **GIVEN** a JSON file is malformed or missing
- **WHEN** loading equipment
- **THEN** log error with file path and details
- **AND** continue loading remaining files
- **AND** include error in IEquipmentLoadResult.errors array

---

### Requirement: Custom Equipment Loading

The system SHALL load user-defined equipment from custom JSON files.

**Rationale**: Users can extend the equipment database with custom or homebrew items.

**Priority**: High

#### Scenario: Load custom equipment from file

- **GIVEN** a user provides a custom equipment JSON file
- **WHEN** EquipmentLoaderService.loadCustomEquipment(file) is called
- **THEN** parse and validate the JSON content
- **AND** register valid items in the EquipmentRegistry
- **AND** return IEquipmentLoadResult with details

#### Scenario: Custom equipment validation

- **GIVEN** custom equipment data is provided
- **WHEN** validating the data
- **THEN** check required fields (id, name, weight, criticalSlots, techBase)
- **AND** validate enum values (TechBase, RulesLevel)
- **AND** return validation errors for invalid data

#### Scenario: Custom equipment ID conflicts

- **GIVEN** custom equipment has same ID as official equipment
- **WHEN** loading custom equipment
- **THEN** custom equipment SHALL override official equipment
- **AND** log a warning about the override

---

### Requirement: Equipment Registry

The system SHALL maintain an in-memory registry of all loaded equipment.

**Rationale**: Fast lookup by ID or name without repeated file access.

**Priority**: Critical

#### Scenario: Register equipment

- **GIVEN** equipment data is loaded from JSON
- **WHEN** EquipmentRegistry.register(item) is called
- **THEN** store the item indexed by ID
- **AND** create name-to-ID mapping for lookup

#### Scenario: Get by ID

- **GIVEN** equipment is registered
- **WHEN** EquipmentRegistry.getById("medium-laser") is called
- **THEN** return the equipment object
- **AND** return null if ID not found

#### Scenario: Get by name

- **GIVEN** equipment is registered
- **WHEN** EquipmentRegistry.getByName("Medium Laser") is called
- **THEN** return the equipment object
- **AND** support case-insensitive matching

#### Scenario: Search equipment

- **GIVEN** equipment is registered
- **WHEN** EquipmentRegistry.search({ category: "Energy", techBase: "CLAN" }) is called
- **THEN** return array of matching equipment
- **AND** support filtering by category, techBase, rulesLevel, and name

---

### Requirement: Equipment Name Mapping

The system SHALL map MTF equipment names to canonical IDs.

**Rationale**: MegaMek files use various naming conventions that must resolve to canonical equipment.

**Priority**: High

#### Scenario: Load name mappings

- **GIVEN** the application is initializing
- **WHEN** EquipmentNameMapper is initialized
- **THEN** load mappings from `public/data/equipment/name-mappings.json`

#### Scenario: Resolve canonical ID

- **GIVEN** an MTF equipment name "Medium Laser"
- **WHEN** EquipmentNameMapper.getCanonicalId("Medium Laser") is called
- **THEN** return "medium-laser"

#### Scenario: Resolve legacy names

- **GIVEN** an MTF uses legacy name "AC/20"
- **WHEN** EquipmentNameMapper.getCanonicalId("AC/20") is called
- **THEN** return "autocannon-20"

#### Scenario: Unknown equipment name

- **GIVEN** an unrecognized equipment name
- **WHEN** EquipmentNameMapper.getCanonicalId("Unknown Weapon") is called
- **THEN** return null
- **AND** log a warning for later review

#### Scenario: Add custom mapping

- **GIVEN** a user wants to add a custom name mapping
- **WHEN** EquipmentNameMapper.addMapping("Custom Laser", "custom-laser-id") is called
- **THEN** store the mapping for future lookups

---

### Requirement: Equipment Schema Validation

The system SHALL validate equipment data against JSON Schema definitions.

**Rationale**: Schema validation ensures data integrity and catches errors early.

**Priority**: Medium

#### Scenario: Validate weapon data

- **GIVEN** weapon JSON data is loaded
- **WHEN** validation is performed
- **THEN** check against `public/data/equipment/_schema/weapon-schema.json`
- **AND** return validation errors if schema violations found

#### Scenario: Validate ammunition data

- **GIVEN** ammunition JSON data is loaded
- **WHEN** validation is performed
- **THEN** check against `public/data/equipment/_schema/ammunition-schema.json`

#### Scenario: Validation result structure

- **GIVEN** equipment data is validated
- **WHEN** returning validation result
- **THEN** return IEquipmentValidationResult with isValid boolean and errors array

---

### Requirement: Equipment Loader Initialization State

The EquipmentLoaderService SHALL track its loading state and provide status information.

**Rationale**: Consumers need to know if equipment data is available before querying.

**Priority**: High

#### Scenario: Check loaded state

- **GIVEN** the equipment loader has been instantiated
- **WHEN** calling `getIsLoaded()`
- **THEN** return `true` if `loadOfficialEquipment()` completed successfully
- **AND** return `false` before loading or if loading failed

#### Scenario: Get total count

- **GIVEN** the equipment loader has loaded data
- **WHEN** calling `getTotalCount()`
- **THEN** return sum of all loaded equipment items across all categories

#### Scenario: Get load errors

- **GIVEN** the equipment loader attempted to load data
- **WHEN** calling `getLoadErrors()`
- **THEN** return array of error messages from failed file loads
- **AND** return empty array if no errors occurred

---

### Requirement: Equipment Lookup Service Initialization

The EquipmentLookupService SHALL support async initialization and track data source.

**Rationale**: Service must coordinate JSON loading and fallback selection.

**Priority**: High

#### Scenario: Initialize service

- **GIVEN** a new EquipmentLookupService instance
- **WHEN** calling `initialize()`
- **THEN** system SHALL attempt to load from EquipmentLoaderService
- **AND** system SHALL be idempotent (subsequent calls return same promise)
- **AND** system SHALL set `initialized` flag to true when complete

#### Scenario: Check initialization state

- **GIVEN** the lookup service exists
- **WHEN** calling `isInitialized()`
- **THEN** return `true` if `initialize()` has completed
- **AND** return `false` if not yet initialized

#### Scenario: Get data source

- **GIVEN** the lookup service has initialized
- **WHEN** calling `getDataSource()`
- **THEN** return `'json'` if JSON loader provided sufficient items (≥100)
- **AND** return `'fallback'` if using hardcoded fallback data

#### Scenario: Get load result

- **GIVEN** the lookup service has initialized
- **WHEN** calling `getLoadResult()`
- **THEN** return the IEquipmentLoadResult from the loader
- **AND** return null if not yet initialized

---

### Requirement: Equipment Lookup Fallback Behavior

Equipment utility functions SHALL fall back to hardcoded definitions when JSON data is unavailable.

**Rationale**: Construction utilities must work immediately without waiting for async loading.

**Priority**: Critical

#### Scenario: Heat sink equipment lookup

- **GIVEN** heat sink equipment is requested
- **WHEN** calling `getHeatSinkEquipment(type)`
- **THEN** system SHALL first try `equipmentLoaderService.getMiscEquipmentById(id)`
- **AND** if not found, return from `HEAT_SINK_FALLBACKS[id]`
- **AND** fallback SHALL include all standard heat sink types

#### Scenario: Jump jet equipment lookup

- **GIVEN** jump jet equipment is requested
- **WHEN** calling `getJumpJetEquipment(tonnage, type)`
- **THEN** system SHALL first try `equipmentLoaderService.getMiscEquipmentById(id)`
- **AND** if not found, return from `JUMP_JET_FALLBACKS[id]`
- **AND** fallback SHALL include light/medium/heavy standard and improved jets

#### Scenario: Targeting computer equipment lookup

- **GIVEN** targeting computer equipment is requested
- **WHEN** calling `getTargetingComputerEquipment(techBase)`
- **THEN** system SHALL first try `equipmentLoaderService.getElectronicsById(id)`
- **AND** if not found, return from `TARGETING_COMPUTER_FALLBACKS[id]`
- **AND** fallback SHALL include IS and Clan targeting computers

#### Scenario: Enhancement equipment lookup

- **GIVEN** movement enhancement equipment is requested (MASC, TSM, Supercharger)
- **WHEN** calling `getEnhancementEquipment(type, techBase)`
- **THEN** system SHALL first try `equipmentLoaderService.getMiscEquipmentById(id)`
- **AND** if not found, return from `ENHANCEMENT_FALLBACKS[id]`
- **AND** fallback SHALL include MASC (IS/Clan), TSM, and Supercharger

---

### Requirement: Equipment Filter Functions with Hardcoded IDs

Equipment filter functions SHALL use hardcoded ID lists for filtering equipment from unit loadouts.

**Rationale**: Filter functions need to identify equipment types without async loading.

**Priority**: High

#### Scenario: Filter out heat sinks

- **GIVEN** a unit's equipment list
- **WHEN** calling `filterOutHeatSinks(equipment)`
- **THEN** system SHALL use `HEAT_SINK_EQUIPMENT_IDS` constant
- **AND** constant SHALL include all heat sink IDs
- **AND** return equipment array without heat sink entries

#### Scenario: Filter out jump jets

- **GIVEN** a unit's equipment list
- **WHEN** calling `filterOutJumpJets(equipment)`
- **THEN** system SHALL use `JUMP_JET_EQUIPMENT_IDS` constant
- **AND** constant SHALL include all jump jet IDs
- **AND** return equipment array without jump jet entries

#### Scenario: Filter out targeting computers

- **GIVEN** a unit's equipment list
- **WHEN** calling `filterOutTargetingComputer(equipment)`
- **THEN** system SHALL use `TARGETING_COMPUTER_IDS` constant
- **AND** constant SHALL include IS and Clan targeting computer IDs
- **AND** return equipment array without targeting computer entries

#### Scenario: Filter out enhancements

- **GIVEN** a unit's equipment list
- **WHEN** calling `filterOutEnhancementEquipment(equipment)`
- **THEN** system SHALL use `ENHANCEMENT_EQUIPMENT_IDS` constant
- **AND** constant SHALL include MASC, TSM, and Supercharger IDs
- **AND** return equipment array without enhancement entries

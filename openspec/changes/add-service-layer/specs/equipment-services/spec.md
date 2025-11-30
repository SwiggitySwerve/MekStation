# Equipment Services Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2025-11-30
**Dependencies**: equipment-database, core-entity-types
**Affects**: construction-services

---

## Overview

### Purpose

Provides access to equipment definitions and calculation services. Wraps the existing equipment type system with a service interface for consistent access patterns.

### Scope

**In Scope:**
- Equipment lookup by ID, category, tech base, era
- Equipment search by name
- Variable equipment property calculations
- Equipment filtering for mech construction

**Out of Scope:**
- Equipment placement in mech locations (see equipment-placement)
- Equipment validation in context of a build (see construction-services)
- Equipment database modification (equipment is read-only)

### Key Concepts

- **Equipment Item**: Unified representation of any equipment (weapon, ammo, electronics, etc.)
- **Variable Equipment**: Equipment whose properties depend on mech context (e.g., Targeting Computer)
- **Equipment Category**: Classification (Energy Weapon, Ballistic, Missile, Ammunition, Electronics, etc.)

---

## ADDED Requirements

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

The system SHALL calculate properties for equipment whose values depend on mech context.

**Rationale**: Equipment like Targeting Computer and MASC have variable weight/slots based on mech configuration.

**Priority**: Critical

#### Scenario: Calculate Targeting Computer weight
- **GIVEN** a mech with 10 tons of direct-fire weapons
- **WHEN** calculateProperties("targeting-computer-is", context) is called
- **THEN** return weight = ceil(10 / 4) = 3 tons
- **AND** return criticalSlots = 3

#### Scenario: Calculate MASC weight
- **GIVEN** a mech with engine rating 300 and 75 tons
- **WHEN** calculateProperties("masc-is", { engineRating: 300, tonnage: 75 }) is called
- **THEN** return weight = ceil(300 / 20) = 15 tons
- **AND** return criticalSlots = 15

---

### Requirement: Check Variable Equipment

The system SHALL identify whether equipment has variable properties.

**Rationale**: UI needs to know when to request additional context for calculations.

**Priority**: Medium

#### Scenario: Targeting Computer is variable
- **WHEN** isVariable("targeting-computer-is") is called
- **THEN** return true

#### Scenario: Medium Laser is not variable
- **WHEN** isVariable("weapon-medium-laser-is") is called
- **THEN** return false

---

### Requirement: Get Required Context

The system SHALL report what context fields are needed for variable equipment.

**Rationale**: UI needs to gather correct inputs for calculation.

**Priority**: Medium

#### Scenario: Targeting Computer context
- **WHEN** getRequiredContext("targeting-computer-is") is called
- **THEN** return ["directFireWeaponTonnage"]

#### Scenario: MASC context
- **WHEN** getRequiredContext("masc-is") is called
- **THEN** return ["engineRating", "tonnage"]

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Equipment filter criteria for combined queries
 */
interface IEquipmentQueryCriteria {
  readonly category?: EquipmentCategory;
  readonly techBase?: TechBase;
  readonly year?: number;
  readonly nameQuery?: string;
  readonly rulesLevel?: RulesLevel;
  readonly maxWeight?: number;
  readonly maxSlots?: number;
}

/**
 * Equipment lookup service interface
 */
interface IEquipmentLookupService {
  // Single-criterion lookups (convenience methods)
  getById(id: string): IEquipmentItem | undefined;
  getByCategory(category: EquipmentCategory): IEquipmentItem[];
  getByTechBase(techBase: TechBase): IEquipmentItem[];
  getByEra(year: number): IEquipmentItem[];
  search(query: string): IEquipmentItem[];
  
  // Combined filter query
  query(criteria: IEquipmentQueryCriteria): IEquipmentItem[];
  
  // Bulk accessors
  getAllWeapons(): IWeapon[];
  getAllAmmunition(): IAmmunition[];
}

/**
 * Context for variable equipment calculations
 */
interface IVariableEquipmentContext {
  readonly tonnage?: number;
  readonly engineRating?: number;
  readonly engineWeight?: number;
  readonly directFireWeaponTonnage?: number;
  readonly techBase?: TechBase;
}

/**
 * Calculated equipment properties
 */
interface ICalculatedEquipmentProperties {
  readonly weight: number;
  readonly criticalSlots: number;
  readonly cost: number;
}

/**
 * Equipment calculator service interface
 */
interface IEquipmentCalculatorService {
  calculateProperties(
    equipmentId: string,
    context: IVariableEquipmentContext
  ): ICalculatedEquipmentProperties;
  
  isVariable(equipmentId: string): boolean;
  
  getRequiredContext(equipmentId: string): string[];
}
```

---

## Dependencies

### Depends On
- **equipment-database**: Equipment definitions and data
- **core-entity-types**: Base interfaces

### Used By
- **construction-services**: Equipment selection and validation
- **UI components**: Equipment browser, mech builder

---

## Implementation Notes

### Performance Considerations
- Equipment data is static; cache aggressively
- Search should use case-insensitive substring matching

### Edge Cases
- Handle unknown equipment IDs gracefully
- Variable equipment with missing context should throw descriptive error

---

## References

### Related Documentation
- `docs/architecture/SERVICE_LAYER_PLAN.md`
- `src/types/equipment/index.ts`
- `src/utils/equipment/EquipmentCalculator.ts`


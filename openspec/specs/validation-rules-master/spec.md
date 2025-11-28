# Validation Rules Master Document

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-28
**Dependencies**: All Phase 1 & Phase 2 specifications
**Affects**: Validation services, unit construction, error messaging, testing

---

## Overview

### Purpose
This document consolidates ALL validation rules from all BattleTech Editor specifications into a single, comprehensive reference. It provides a complete catalog of validation requirements, error messages, severity levels, and cross-references to source specifications.

### Scope
**In Scope:**
- Complete validation rules matrix with unique IDs
- Error message templates for all validation scenarios
- Validation severity levels (Critical Error, Error, Warning)
- Validation dependencies and order requirements
- Cross-references to source specifications
- Validation category organization

**Out of Scope:**
- Validation implementation code (covered in validation services)
- UI-specific validation display logic
- Performance optimization strategies
- Test case specifications

### Key Statistics
- **Total Rules Cataloged**: 89 validation rules
- **Source Specifications**: 18 specifications analyzed
- **Rule Categories**: 12 major categories
- **Severity Levels**: 3 levels (Critical Error, Error, Warning)

---

## Validation Rules Matrix

### Category Index
1. [Property Validation](#property-validation) (9 rules)
2. [Range Validation](#range-validation) (8 rules)
3. [Enum Validation](#enum-validation) (6 rules)
4. [Tech Base Compatibility](#tech-base-compatibility) (5 rules)
5. [Era Availability](#era-availability) (3 rules)
6. [Rules Level Validation](#rules-level-validation) (3 rules)
7. [Weight Budget Validation](#weight-budget-validation) (5 rules)
8. [Critical Slot Validation](#critical-slot-validation) (8 rules)
9. [Structural Validation](#structural-validation) (10 rules)
10. [Component Requirements](#component-requirements) (12 rules)
11. [Construction Sequence](#construction-sequence) (10 rules)
12. [Placement Validation](#placement-validation) (10 rules)

---

## Property Validation

### VAL-PROP-001: Entity ID Required
**Rule**: All entities must have non-empty unique identifiers

**Severity**: Error

**Condition**: `!entity.id || entity.id.trim() === ''`

**Error Message**: `"Entity must have non-empty id"`

**Source**: Core Entity Types (spec.md, lines 334-344)

**User Action**: Provide valid id for the entity

---

### VAL-PROP-002: Entity Name Required
**Rule**: All entities must have non-empty display names

**Severity**: Error

**Condition**: `!entity.name || entity.name.trim() === ''`

**Error Message**: `"Entity must have non-empty name"`

**Source**: Core Entity Types (spec.md, lines 334-344)

**User Action**: Provide valid name for the entity

---

### VAL-PROP-003: Weight Non-Negative
**Rule**: Weight must be finite and non-negative

**Severity**: Error

**Condition**: `!Number.isFinite(component.weight) || component.weight < 0`

**Error Message**: `"Component weight must be a non-negative finite number"`

**Source**:
- Core Entity Types (spec.md, lines 348-362)
- Physical Properties System (spec.md, lines 507-545)
- Validation Patterns (spec.md, lines 507-545)

**User Action**: Correct the weight value to be >= 0 and finite

---

### VAL-PROP-004: Critical Slots Non-Negative Integer
**Rule**: Critical slots must be non-negative integer

**Severity**: Error

**Condition**: `!Number.isInteger(component.criticalSlots) || component.criticalSlots < 0`

**Error Message**: `"Critical slots must be a non-negative integer"`

**Source**:
- Core Entity Types (spec.md, lines 364-378)
- Physical Properties System (spec.md, lines 547-585)
- Validation Patterns (spec.md, lines 547-585)

**User Action**: Correct slots to be a whole number >= 0

---

### VAL-PROP-005: Temporal Consistency
**Rule**: Extinction year must be after introduction year

**Severity**: Error

**Condition**: `entity.extinctionYear !== undefined && entity.extinctionYear < entity.introductionYear`

**Error Message**: `"Extinction year must be after introduction year"`

**Source**:
- Core Entity Types (spec.md, lines 380-395)
- Era & Temporal System (spec.md, lines 478-494)
- Validation Patterns (spec.md, lines 478-494)

**User Action**: Correct the year values to maintain temporal consistency

---

### VAL-PROP-006: Cost Non-Negative
**Rule**: Cost must be non-negative finite number

**Severity**: Error

**Condition**: `!Number.isFinite(component.cost) || component.cost < 0`

**Error Message**: `"Cost must be a non-negative finite number"`

**Source**: Core Entity Types (spec.md, lines 229-242)

**User Action**: Correct the cost value

---

### VAL-PROP-007: Battle Value Non-Negative
**Rule**: Battle Value must be non-negative finite number

**Severity**: Error

**Condition**: `!Number.isFinite(component.battleValue) || component.battleValue < 0`

**Error Message**: `"Battle Value must be a non-negative finite number"`

**Source**: Core Entity Types (spec.md, lines 229-242)

**User Action**: Correct the battle value

---

### VAL-PROP-008: Page Reference Positive Integer
**Rule**: Page reference must be positive integer if present

**Severity**: Warning

**Condition**: `component.pageReference !== undefined && (!Number.isInteger(component.pageReference) || component.pageReference <= 0)`

**Error Message**: `"Page reference must be a positive integer"`

**Source**: Core Entity Types (spec.md, lines 269-286)

**User Action**: Correct page reference to positive integer

---

### VAL-PROP-009: Property Naming Standard
**Rule**: Use standardized property names (weight, not tons; criticalSlots, not slots)

**Severity**: Error

**Condition**: Object has properties 'tons', 'mass', 'tonnage', 'slots', or 'critSlots'

**Error Message**: `"Use standardized property name: 'weight' for mass, 'criticalSlots' for slots"`

**Source**: Physical Properties System (spec.md, lines 386-417)

**User Action**: Rename properties to standard names

---

## Range Validation

### VAL-RANGE-001: BattleMech Tonnage Range
**Rule**: Tonnage must be 20-100 tons and divisible by 5

**Severity**: Critical Error

**Condition**: `tonnage < 20 || tonnage > 100 || tonnage % 5 !== 0`

**Error Message**: `"BattleMech tonnage must be between 20 and 100 tons and divisible by 5"`

**Source**:
- Validation Patterns (spec.md, lines 587-625)
- Construction Rules Core (spec.md, lines 54-65)

**Constraint**: `20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100`

**User Action**: Set tonnage to valid value (20, 25, 30, ..., 95, 100)

---

### VAL-RANGE-002: Percentage Range
**Rule**: Percentage must be 0-100

**Severity**: Error

**Condition**: `percentage < 0 || percentage > 100 || !Number.isFinite(percentage)`

**Error Message**: `"Percentage must be between 0 and 100"`

**Source**: Validation Patterns (spec.md, lines 627-665)

**Constraint**: `0 <= value <= 100`

**User Action**: Set percentage to value within 0-100 range

---

### VAL-RANGE-003: Introduction Year Range
**Rule**: Introduction year must be within timeline (2443-3250)

**Severity**: Error

**Condition**: `!Number.isInteger(component.introductionYear) || component.introductionYear < 2443 || component.introductionYear > 3250`

**Error Message**: `"Component must have a valid introduction year (2443-3250)"`

**Source**: Era & Temporal System (spec.md, lines 460-477)

**Constraint**: `2443 <= year <= 3250`

**User Action**: Provide a valid introduction year within the timeline

---

### VAL-RANGE-004: Engine Rating Range
**Rule**: Engine rating must be 10-500 in multiples of 5

**Severity**: Critical Error

**Condition**: `rating < 10 || rating > 500 || rating % 5 !== 0`

**Error Message**: `"Engine rating must be between 10 and 500 in multiples of 5"`

**Source**: Engine System (spec.md, lines 134-147)

**Constraint**: `10, 15, 20, ..., 495, 500`

**User Action**: Select valid engine rating

---

### VAL-RANGE-005: Head Armor Maximum
**Rule**: Head armor cannot exceed 9 points

**Severity**: Error

**Condition**: `headArmor > 9`

**Error Message**: `"Head armor maximum is 9 points"`

**Source**: Armor System (spec.md, lines 186-190)

**Constraint**: `0 <= headArmor <= 9`

**User Action**: Reduce head armor to 9 or less

---

### VAL-RANGE-006: Location Armor Maximum
**Rule**: Location armor cannot exceed 2× internal structure (except head)

**Severity**: Error

**Condition**: `locationArmor > (structurePoints * 2)`

**Error Message**: `"Location armor exceeds maximum (max: {2 × structurePoints})"`

**Source**: Armor System (spec.md, lines 178-203)

**Constraint**: `armor <= structure × 2`

**User Action**: Reduce armor to structural maximum

---

### VAL-RANGE-007: Jump MP Maximum
**Rule**: Jump MP cannot exceed walk MP (standard jets) or run MP (extended jets)

**Severity**: Error

**Condition**: `jumpMP > walkMP` (standard) or `jumpMP > runMP` (extended)

**Error Message**: `"Jump MP cannot exceed walk MP (standard jets) or run MP (extended jets)"`

**Source**: Movement System (spec.md, lines 125-157)

**Constraint**: `jumpMP <= walkMP` or `jumpMP <= runMP`

**User Action**: Reduce number of jump jets or change jump jet type

---

### VAL-RANGE-008: Numeric Range Custom
**Rule**: Value must be within specified range

**Severity**: Error

**Condition**: `!Number.isFinite(value) || value < min || value > max`

**Error Message**: `"{Field} must be between {min} and {max}"`

**Source**: Validation Patterns (spec.md, lines 853-897)

**Constraint**: `min <= value <= max`

**User Action**: Correct value to be within specified range

---

## Enum Validation

### VAL-ENUM-001: TechBase Valid
**Rule**: Component tech base must be valid enum value

**Severity**: Error

**Condition**: `!isValidTechBase(component.techBase)`

**Error Message**: `"Component must have a valid TechBase value (INNER_SPHERE or CLAN)"`

**Source**:
- Core Enumerations (spec.md, lines 607-627)
- Validation Patterns (spec.md, lines 607-627)

**Valid Values**: `INNER_SPHERE`, `CLAN`

**User Action**: Assign a valid enum value from TechBase

---

### VAL-ENUM-002: RulesLevel Valid
**Rule**: Component rules level must be valid enum value

**Severity**: Error

**Condition**: `!isValidRulesLevel(component.rulesLevel)`

**Error Message**: `"Component must have a valid rules level (INTRODUCTORY, STANDARD, ADVANCED, or EXPERIMENTAL)"`

**Source**:
- Core Enumerations (spec.md, lines 607-627)
- Rules Level System (spec.md, lines 209-225)

**Valid Values**: `INTRODUCTORY`, `STANDARD`, `ADVANCED`, `EXPERIMENTAL`

**User Action**: Assign a valid RulesLevel to the component

---

### VAL-ENUM-003: Era Valid
**Rule**: Component era must be valid enum value

**Severity**: Error

**Condition**: `!isValidEra(component.era)`

**Error Message**: `"Component must have a valid Era value"`

**Source**: Core Enumerations (spec.md, lines 607-627)

**Valid Values**: `AGE_OF_WAR`, `STAR_LEAGUE`, `EARLY_SUCCESSION_WAR`, `LATE_SUCCESSION_WAR`, `CLAN_INVASION`, `CIVIL_WAR`, `JIHAD`, `DARK_AGE`

**User Action**: Assign a valid Era enum value

---

### VAL-ENUM-004: Component Tech Base Not Mixed
**Rule**: Component tech base must be binary (not MIXED)

**Severity**: Error

**Condition**: `component.techBase === 'Mixed'`

**Error Message**: `"Components must have binary tech base (Inner Sphere or Clan). Mixed applies only to units."`

**Source**: Core Enumerations (spec.md, lines 629-643)

**User Action**: Assign either INNER_SPHERE or CLAN to components

---

### VAL-ENUM-005: Unit Tech Base Consistency
**Rule**: Unit tech base must match component composition

**Severity**: Warning

**Condition**: Mixed composition doesn't match declared unit tech base

**Error Message**: `"Unit tech base does not match component composition"`

**Source**: Core Enumerations (spec.md, lines 645-674)

**User Action**: Correct unit tech base to match components or adjust components

---

### VAL-ENUM-006: Era Alignment
**Rule**: Era should align with introduction year

**Severity**: Warning

**Condition**: `getEraFromYear(component.introductionYear) !== component.era`

**Error Message**: `"Era classification does not match introduction year"`

**Source**: Era & Temporal System (spec.md, lines 496-511)

**User Action**: Verify era classification matches the introduction year

---

## Tech Base Compatibility

### VAL-TECH-001: Tech Base Compatibility
**Rule**: Component tech base must be compatible with unit

**Severity**: Error

**Condition**: `componentTechBase !== unitTechBase && componentTechBase !== TechBase.BOTH` (non-mixed units)

**Error Message**: `"Component tech base {componentTechBase} is incompatible with unit tech base {unitTechBase}"`

**Source**:
- Validation Patterns (spec.md, lines 667-706)
- Tech Base Integration (spec.md, lines 118-150)

**User Action**: Select component with compatible tech base or change unit to Mixed tech base

---

### VAL-TECH-002: Structural Component Locking
**Rule**: Pure IS/Clan units cannot use opposite tech base structural components

**Severity**: Error

**Condition**: Unit is pure IS/Clan and structural component is opposite tech base

**Error Message**: `"Inner Sphere unit cannot use Clan structural components (or vice versa)"`

**Source**: Tech Base Integration (spec.md, lines 118-150)

**User Action**: Change structural component or declare unit as Mixed Tech

---

### VAL-TECH-003: XL Engine Tech Variant
**Rule**: XL Engine must use tech base-appropriate variant

**Severity**: Error

**Condition**: IS unit uses Clan XL or Clan unit uses IS XL

**Error Message**: `"XL Engine variant does not match unit tech base"`

**Source**:
- Engine System (spec.md, lines 343-383)
- Tech Base Integration (spec.md, lines 195-251)

**User Action**: Select correct XL Engine variant for tech base

---

### VAL-TECH-004: Heat Sink System Consistency
**Rule**: All heat sinks on unit must be same type (cannot mix IS and Clan DHS)

**Severity**: Error

**Condition**: Unit has both IS Double Heat Sinks and Clan Double Heat Sinks

**Error Message**: `"Cannot mix Inner Sphere and Clan Double Heat Sinks on same unit"`

**Source**: Heat Sink System (spec.md, lines 310-343)

**User Action**: Choose one heat sink type for entire unit

---

### VAL-TECH-005: Gyro Tech Base Restriction
**Rule**: Clan cannot use advanced gyro types (XL, Compact, Heavy-Duty)

**Severity**: Error

**Condition**: Clan unit attempts to use XL/Compact/Heavy-Duty gyro

**Error Message**: `"Clan units can only use Standard Gyro"`

**Source**: Gyro System (spec.md, lines 182-203)

**User Action**: Select Standard Gyro for Clan units

---

## Era Availability

### VAL-ERA-001: Component Not Yet Invented
**Rule**: Component must be available in campaign year (not future tech)

**Severity**: Error

**Condition**: `campaignYear < component.introductionYear`

**Error Message**: `"{Component} not yet invented in year {campaignYear} (introduced {introductionYear})"`

**Source**:
- Era & Temporal System (spec.md, lines 167-181)
- Validation Patterns (spec.md, lines 708-754)

**User Action**: Change campaign year or select different component

---

### VAL-ERA-002: Component Extinct
**Rule**: Component must not be extinct in campaign year

**Severity**: Error

**Condition**: `component.extinctionYear !== undefined && campaignYear > component.extinctionYear`

**Error Message**: `"{Component} is extinct/unavailable in year {campaignYear} (extinct {extinctionYear})"`

**Source**:
- Era & Temporal System (spec.md, lines 182-187)
- Validation Patterns (spec.md, lines 708-754)

**User Action**: Change campaign year or select different component

---

### VAL-ERA-003: Era Filtering
**Rule**: Components must be available in construction era

**Severity**: Error

**Condition**: Component introduction year exceeds construction era end year

**Error Message**: `"Component not available in selected era"`

**Source**: Era & Temporal System (spec.md, lines 121-143)

**User Action**: Select appropriate era or different component

---

## Rules Level Validation

### VAL-RULES-001: Rules Level Required
**Rule**: All tech base entities must have valid rules level

**Severity**: Error

**Condition**: `!Object.values(RulesLevel).includes(component.rulesLevel)`

**Error Message**: `"Component must have a valid rules level"`

**Source**: Rules Level System (spec.md, lines 209-225)

**User Action**: Assign a valid RulesLevel to the component

---

### VAL-RULES-002: Tournament Legality
**Rule**: Experimental components cannot be used in tournament play

**Severity**: Warning

**Condition**: `unit.isTournamentUnit && component.rulesLevel === RulesLevel.EXPERIMENTAL`

**Error Message**: `"Experimental components are not legal for tournament play"`

**Source**: Rules Level System (spec.md, lines 227-240)

**User Action**: Remove experimental components or disable tournament mode

---

### VAL-RULES-003: Rules Level Filter Exceeded
**Rule**: Component rules level must not exceed filter

**Severity**: Error

**Condition**: `!matchesRulesFilter(component.rulesLevel, filter)`

**Error Message**: `"Component rules level {componentLevel} exceeds allowed level {filter}"`

**Source**: Validation Patterns (spec.md, lines 756-809)

**User Action**: Change rules level filter or select different component

---

## Weight Budget Validation

### VAL-WEIGHT-001: Exact Weight Matching
**Rule**: Total component weight must equal exactly the mech's tonnage

**Severity**: Critical Error

**Condition**: `totalAllocated !== tonnage`

**Error Message**: `"Total weight ({totalAllocated} tons) must equal exactly {tonnage} tons. Difference: {diff} tons"`

**Source**: Construction Rules Core (spec.md, lines 66-90)

**User Action**: Adjust component weights to match tonnage exactly

---

### VAL-WEIGHT-002: Overweight Design
**Rule**: Design cannot exceed tonnage limit

**Severity**: Critical Error

**Condition**: `totalAllocated > tonnage`

**Error Message**: `"Design is overweight by {totalAllocated - tonnage} tons"`

**Source**: Construction Rules Core (spec.md, lines 78-84)

**User Action**: Remove or lighten components

---

### VAL-WEIGHT-003: Underweight Design
**Rule**: Design cannot be under tonnage limit

**Severity**: Critical Error

**Condition**: `totalAllocated < tonnage`

**Error Message**: `"Design is underweight by {tonnage - totalAllocated} tons"`

**Source**: Construction Rules Core (spec.md, lines 85-90)

**User Action**: Add components or increase armor

---

### VAL-WEIGHT-004: Engine Weight Valid
**Rule**: Engine weight must not exceed tonnage

**Severity**: Critical Error

**Condition**: `engine.weight > tonnage`

**Error Message**: `"Engine weight ({engine.weight} tons) exceeds mech tonnage ({tonnage} tons)"`

**Source**: Engine System (spec.md, lines 162-216)

**User Action**: Select smaller engine rating or increase mech tonnage

---

### VAL-WEIGHT-005: Armor Weight Within Budget
**Rule**: Armor weight must fit within remaining tonnage budget

**Severity**: Error

**Condition**: `armorWeight > remainingTonnage`

**Error Message**: `"Armor allocation ({armorWeight} tons) exceeds remaining tonnage budget"`

**Source**: Armor System (spec.md, lines 269-294)

**User Action**: Reduce armor points or free up tonnage

---

## Critical Slot Validation

### VAL-SLOT-001: Single Slot Occupancy
**Rule**: Each slot must be occupied by at most one component

**Severity**: Error

**Condition**: Slot contains multiple components

**Error Message**: `"Slot already occupied by {component}"`

**Source**: Critical Slot Allocation (spec.md, lines 264-293)

**User Action**: Remove conflicting component or find empty slot

---

### VAL-SLOT-002: Location Capacity Not Exceeded
**Rule**: Equipment cannot exceed available slots in location

**Severity**: Error

**Condition**: `requiredSlots > availableSlots`

**Error Message**: `"Insufficient slots in {location}. Required: {requiredSlots}, Available: {availableSlots}"`

**Source**: Critical Slot Allocation (spec.md, lines 294-321)

**User Action**: Remove equipment or select different location

---

### VAL-SLOT-003: Contiguous Slot Requirement
**Rule**: Multi-slot equipment must occupy consecutive slots

**Severity**: Error

**Condition**: Slots are not consecutive

**Error Message**: `"Multi-slot equipment requires {n} consecutive slots"`

**Source**: Critical Slot Allocation (spec.md, lines 380-392)

**User Action**: Find location with consecutive empty slots

---

### VAL-SLOT-004: No Split Components
**Rule**: Equipment requiring multiple slots cannot be split across locations

**Severity**: Error

**Condition**: Component slots span multiple locations

**Error Message**: `"Components cannot be split across different locations"`

**Source**: Critical Slot Allocation (spec.md, lines 374-400)

**User Action**: Place all component slots in same location

---

### VAL-SLOT-005: Location Restriction Compliance
**Rule**: Equipment must be placed in allowed locations only

**Severity**: Error

**Condition**: `!component.allowedLocations.includes(selectedLocation)`

**Error Message**: `"Component cannot be placed in {location}. Allowed locations: {allowedLocations}"`

**Source**: Critical Slot Allocation (spec.md, lines 322-341)

**User Action**: Select allowed location for component

---

### VAL-SLOT-006: Head Slot Availability
**Rule**: Head has only 1 available slot (slot 3) for equipment with standard cockpit

**Severity**: Error

**Condition**: Attempt to place equipment in occupied head slots

**Error Message**: `"Head has only 1 available equipment slot (slot 3 with standard cockpit)"`

**Source**:
- Critical Slot Allocation (spec.md, lines 84-115)
- Cockpit System (spec.md, lines 94-105)

**User Action**: Use available slot or select different location

---

### VAL-SLOT-007: Engine Slots Reserved
**Rule**: Engine critical slots are fixed and cannot be used for equipment

**Severity**: Error

**Condition**: Attempt to place equipment in engine slots

**Error Message**: `"Slots {slotIndices} are occupied by engine and cannot be used"`

**Source**:
- Engine System (spec.md, lines 248-306)
- Critical Slot Allocation (spec.md, lines 116-165)

**User Action**: Use slots outside engine allocation

---

### VAL-SLOT-008: Gyro Slots Reserved
**Rule**: Gyro critical slots are fixed and cannot be used for equipment

**Severity**: Error

**Condition**: Attempt to place equipment in gyro slots

**Error Message**: `"Slots {slotIndices} are occupied by gyro and cannot be used"`

**Source**:
- Gyro System (spec.md, lines 144-181)
- Critical Slot Allocation (spec.md, lines 150-177)

**User Action**: Use slots outside gyro allocation

---

## Structural Validation

### VAL-STRUCT-001: Maximum Armor Per Location
**Rule**: Location armor cannot exceed 2× internal structure

**Severity**: Error

**Condition**: `frontArmor + rearArmor > structurePoints * 2`

**Error Message**: `"Total armor ({front + rear}) exceeds maximum ({structure × 2}) for {location}"`

**Source**: Armor System (spec.md, lines 172-236)

**User Action**: Reduce armor allocation for location

---

### VAL-STRUCT-002: Head Armor Special Case
**Rule**: Head armor limited to 9 points regardless of structure

**Severity**: Error

**Condition**: `headArmor > 9`

**Error Message**: `"Head armor cannot exceed 9 points"`

**Source**: Armor System (spec.md, lines 186-190)

**User Action**: Reduce head armor to 9 or less

---

### VAL-STRUCT-003: Rear Armor Torso Only
**Rule**: Rear armor only allowed on torso locations

**Severity**: Error

**Condition**: Rear armor on non-torso location

**Error Message**: `"Rear armor only allowed on torso locations (CT, LT, RT)"`

**Source**: Armor System (spec.md, lines 206-236)

**User Action**: Remove rear armor from non-torso location

---

### VAL-STRUCT-004: Rear Armor Counts Toward Total
**Rule**: Front + rear armor must not exceed location maximum

**Severity**: Error

**Condition**: `frontArmor + rearArmor > locationMaximum`

**Error Message**: `"Total armor (front {front} + rear {rear} = {total}) exceeds maximum ({max}) for {location}"`

**Source**: Armor System (spec.md, lines 230-236)

**User Action**: Reduce front or rear armor

---

### VAL-STRUCT-005: Total Maximum Armor
**Rule**: Total mech armor cannot exceed sum of location maximums

**Severity**: Error

**Condition**: `totalArmor > sumOfLocationMaximums`

**Error Message**: `"Total armor ({totalArmor}) exceeds structural maximum ({maxArmor})"`

**Source**: Armor System (spec.md, lines 237-268)

**User Action**: Reduce overall armor allocation

---

### VAL-STRUCT-006: Structure Points Multiplier
**Rule**: Reinforced structure doubles points, Composite halves points

**Severity**: Validation

**Condition**: Calculated structure points don't match multiplier

**Error Message**: `"Structure points for {location} don't match multiplier for {structureType}"`

**Source**: Internal Structure System (spec.md, lines 229-256)

**User Action**: Recalculate structure points with correct multiplier

---

### VAL-STRUCT-007: Structure Weight Percentage
**Rule**: Structure weight must match type-specific percentage of tonnage

**Severity**: Error

**Condition**: `structureWeight !== calculatedWeight`

**Error Message**: `"Structure weight ({actual}) doesn't match calculated weight ({expected}) for {tonnage}-ton {structureType}"`

**Source**: Internal Structure System (spec.md, lines 116-160)

**User Action**: Recalculate structure weight

---

### VAL-STRUCT-008: Endo Steel Rounding
**Rule**: Endo Steel weight rounds up to nearest 0.5 ton

**Severity**: Validation

**Condition**: Weight calculation error

**Error Message**: `"Endo Steel weight must be rounded up to nearest 0.5 ton"`

**Source**: Internal Structure System (spec.md, lines 129-135)

**User Action**: Apply correct rounding (CEIL to 0.5)

---

### VAL-STRUCT-009: Gyro Weight Calculation
**Rule**: Gyro weight = CEIL(engineRating / 100) × weightMultiplier

**Severity**: Error

**Condition**: `gyroWeight !== CEIL(engineRating / 100) * multiplier`

**Error Message**: `"Gyro weight ({actual}) doesn't match calculated weight ({expected}) for {engineRating} rating {gyroType}"`

**Source**: Gyro System (spec.md, lines 80-110)

**User Action**: Recalculate gyro weight

---

### VAL-STRUCT-010: Engine Weight Formula
**Rule**: Engine weight follows type-specific formula

**Severity**: Error

**Condition**: Weight doesn't match formula

**Error Message**: `"Engine weight ({actual}) doesn't match calculated weight ({expected}) for {rating} {engineType}"`

**Source**: Engine System (spec.md, lines 162-216)

**User Action**: Recalculate engine weight using correct formula

---

## Component Requirements

### VAL-COMP-001: Minimum Heat Sinks
**Rule**: All BattleMechs must have at least 10 heat sinks

**Severity**: Critical Error

**Condition**: `totalHeatSinks < 10`

**Error Message**: `"Unit must have at least 10 heat sinks (current: {count})"`

**Source**:
- Construction Rules Core (spec.md, lines 91-109)
- Heat Sink System (spec.md, lines 148-174)

**User Action**: Add heat sinks to reach minimum 10

---

### VAL-COMP-002: Engine Required
**Rule**: All BattleMechs must have an engine

**Severity**: Critical Error

**Condition**: `!unit.engine`

**Error Message**: `"Engine required"`

**Source**: Construction Rules Core (spec.md, lines 110-131)

**User Action**: Select an engine

---

### VAL-COMP-003: Gyro Required
**Rule**: All BattleMechs must have a gyro

**Severity**: Critical Error

**Condition**: `!unit.gyro`

**Error Message**: `"Gyro required"`

**Source**: Construction Rules Core (spec.md, lines 110-131)

**User Action**: Select a gyro

---

### VAL-COMP-004: Cockpit Required
**Rule**: All BattleMechs must have a cockpit

**Severity**: Critical Error

**Condition**: `!unit.cockpit`

**Error Message**: `"Cockpit required"`

**Source**: Construction Rules Core (spec.md, lines 110-131)

**User Action**: Select a cockpit

---

### VAL-COMP-005: Internal Structure Required
**Rule**: All BattleMechs must have internal structure

**Severity**: Critical Error

**Condition**: `!unit.structure`

**Error Message**: `"Internal structure required"`

**Source**: Construction Rules Core (spec.md, lines 110-131)

**User Action**: Select internal structure type

---

### VAL-COMP-006: Armor Type Selected
**Rule**: Armor type must be selected (may have 0 points but type required)

**Severity**: Critical Error

**Condition**: `!unit.armor`

**Error Message**: `"Armor type must be selected"`

**Source**: Construction Rules Core (spec.md, lines 110-131)

**User Action**: Select armor type

---

### VAL-COMP-007: Shoulder Actuators Fixed
**Rule**: Shoulder actuators cannot be removed

**Severity**: Error

**Condition**: Attempt to remove shoulder actuator

**Error Message**: `"Shoulder actuators are fixed and cannot be removed"`

**Source**: Critical Slot Allocation (spec.md, lines 180-217)

**User Action**: Shoulder must remain

---

### VAL-COMP-008: Upper Arm Actuators Fixed
**Rule**: Upper arm actuators cannot be removed

**Severity**: Error

**Condition**: Attempt to remove upper arm actuator

**Error Message**: `"Upper arm actuators are fixed and cannot be removed"`

**Source**: Critical Slot Allocation (spec.md, lines 180-217)

**User Action**: Upper arm must remain

---

### VAL-COMP-009: Hand Requires Lower Arm
**Rule**: Hand actuator requires lower arm actuator to be present

**Severity**: Error

**Condition**: `hasHand && !hasLowerArm`

**Error Message**: `"Hand actuator requires lower arm actuator to be present"`

**Source**: Critical Slot Allocation (spec.md, lines 194-217)

**User Action**: Add lower arm actuator before hand

---

### VAL-COMP-010: Leg Actuators Fixed
**Rule**: Leg actuators (Hip, Upper, Lower, Foot) cannot be removed

**Severity**: Error

**Condition**: Attempt to remove any leg actuator

**Error Message**: `"Leg actuators are fixed and cannot be removed"`

**Source**: Critical Slot Allocation (spec.md, lines 218-238)

**User Action**: All leg actuators must remain

---

### VAL-COMP-011: Stealth Armor Requires ECM
**Rule**: Stealth armor requires Guardian ECM equipment

**Severity**: Error

**Condition**: `armorType === 'Stealth' && !hasGuardianECM`

**Error Message**: `"Stealth armor requires Guardian ECM equipment"`

**Source**: Armor System (spec.md, lines 105-113, 337-350)

**User Action**: Add Guardian ECM or change armor type

---

### VAL-COMP-012: Stealth Armor Requires Double Heat Sinks
**Rule**: Stealth armor requires Double Heat Sinks

**Severity**: Error

**Condition**: `armorType === 'Stealth' && heatSinkType === 'Single'`

**Error Message**: `"Stealth armor requires Double Heat Sinks"`

**Source**: Armor System (spec.md, lines 105-113, 343-350)

**User Action**: Change to Double Heat Sinks or different armor type

---

## Construction Sequence

### VAL-SEQ-001: Tonnage First
**Rule**: Tonnage must be selected before other components

**Severity**: Error

**Condition**: Attempt to select components without tonnage

**Error Message**: `"Select tonnage before choosing components"`

**Source**: Construction Rules Core (spec.md, lines 348-357)

**User Action**: Select tonnage first

---

### VAL-SEQ-002: Engine Before Gyro
**Rule**: Engine must be selected before gyro (gyro weight depends on engine)

**Severity**: Error

**Condition**: Gyro selected before engine

**Error Message**: `"Select engine before gyro (gyro weight depends on engine rating)"`

**Source**: Construction Rules Core (spec.md, lines 437-457)

**User Action**: Select engine first, then gyro

---

### VAL-SEQ-003: Structure Before Armor
**Rule**: Internal structure must be selected before armor allocation

**Severity**: Error

**Condition**: Armor allocated before structure selected

**Error Message**: `"Select internal structure before allocating armor (maximum armor depends on structure)"`

**Source**: Construction Rules Core (spec.md, lines 408-436)

**User Action**: Select structure type first

---

### VAL-SEQ-004: Fixed Components Before Equipment
**Rule**: All fixed components (engine, gyro, actuators, cockpit) before equipment

**Severity**: Warning

**Condition**: Equipment placed before all fixed components allocated

**Error Message**: `"Complete fixed component allocation before adding equipment"`

**Source**: Critical Slot Allocation (spec.md, lines 239-265)

**User Action**: Finish fixed components first

---

### VAL-SEQ-005: Gyro Depends on Engine Rating
**Rule**: Changing engine rating invalidates gyro (must recalculate weight)

**Severity**: Warning

**Condition**: Engine rating changed after gyro selected

**Error Message**: `"Engine rating change requires gyro weight recalculation"`

**Source**: Gyro System (spec.md, lines 80-110)

**User Action**: Gyro weight will be recalculated automatically

---

### VAL-SEQ-006: Tech Base Before Structural Components
**Rule**: Tech base declaration should precede structural component selection

**Severity**: Warning

**Condition**: Structural components selected before tech base declared

**Error Message**: `"Declare tech base before selecting structural components"`

**Source**:
- Construction Rules Core (spec.md, lines 360-377)
- Tech Base Integration (spec.md, lines 46-85)

**User Action**: Declare tech base first

---

### VAL-SEQ-007: Component Change Displaces Equipment
**Rule**: Changing engine/gyro type may displace equipment in affected slots

**Severity**: Warning

**Condition**: Engine or gyro type change affects occupied slots

**Error Message**: `"Component change will displace equipment in slots {slotIndices}. Equipment to be removed: {components}"`

**Source**: Critical Slot Allocation (spec.md, lines 436-466)

**User Action**: Review and reallocate displaced equipment

---

### VAL-SEQ-008: Construction Year Affects Availability
**Rule**: Construction year must be set to determine component availability

**Severity**: Warning

**Condition**: Components selected before construction year set

**Error Message**: `"Set construction year to filter available components by era"`

**Source**:
- Era & Temporal System (spec.md, lines 121-143)
- Tech Base Integration (spec.md, lines 254-287)

**User Action**: Set construction year first

---

### VAL-SEQ-009: Rules Level Filter Affects Options
**Rule**: Rules level filter should be set before component selection

**Severity**: Info

**Condition**: Rules level not set

**Error Message**: `"Set rules level filter to limit component complexity (Introductory, Standard, Advanced, Experimental)"`

**Source**: Rules Level System (spec.md, lines 82-103)

**User Action**: Set rules level filter as needed

---

### VAL-SEQ-010: Validation Before Complete
**Rule**: All validation rules must pass before unit is considered complete

**Severity**: Critical Error

**Condition**: Validation errors present

**Error Message**: `"Cannot complete unit with {errorCount} validation errors"`

**Source**: Construction Rules Core (spec.md, lines 280-293)

**User Action**: Fix all validation errors

---

## Placement Validation

### VAL-PLACE-001: Jump Jets Torso/Legs Only
**Rule**: Jump jets can only be placed in torso and leg locations

**Severity**: Error

**Condition**: Jump jet placed in Head, Left Arm, or Right Arm

**Error Message**: `"Jump jets can only be placed in torso (CT, LT, RT) or legs (LL, RL)"`

**Source**: Movement System (spec.md, lines 238-274)

**User Action**: Place jump jets in valid locations

---

### VAL-PLACE-002: Rear Weapons Torso Only
**Rule**: Rear-facing weapons only allowed in torso locations

**Severity**: Error

**Condition**: Rear-facing weapon in non-torso location

**Error Message**: `"Rear-facing weapons only allowed in torso locations (CT, LT, RT)"`

**Source**: Critical Slot Allocation (spec.md, lines 342-373)

**User Action**: Place rear weapon in torso or change to front-facing

---

### VAL-PLACE-003: Torso-Mounted Cockpit Gyro Incompatibility
**Rule**: Torso-mounted cockpit incompatible with XL Gyro

**Severity**: Error

**Condition**: `cockpitType === 'Torso-Mounted' && gyroType === 'XL'`

**Error Message**: `"Torso-mounted cockpit incompatible with XL Gyro (slot conflict in CT slot 11)"`

**Source**: Cockpit System (spec.md, lines 246-253)

**User Action**: Change cockpit or gyro type

---

### VAL-PLACE-004: Actuator Placement Fixed
**Rule**: Actuators must be in specific slots (0-3 for arms, 0-3 for legs)

**Severity**: Error

**Condition**: Actuator placed in wrong slot

**Error Message**: `"Actuators must occupy slots 0-3 in limb locations"`

**Source**: Critical Slot Allocation (spec.md, lines 180-238)

**User Action**: System places actuators automatically

---

### VAL-PLACE-005: Engine Placement Center Torso
**Rule**: Engine primary slots must be in Center Torso

**Severity**: Error

**Condition**: Engine placed outside CT (except XL/XXL/Light side torso slots)

**Error Message**: `"Engine primary slots must be in Center Torso"`

**Source**:
- Engine System (spec.md, lines 248-306)
- Critical Slot Allocation (spec.md, lines 116-149)

**User Action**: System places engine automatically

---

### VAL-PLACE-006: Gyro Placement Center Torso
**Rule**: Gyro must be placed in Center Torso after engine

**Severity**: Error

**Condition**: Gyro placed outside CT

**Error Message**: `"Gyro must be placed in Center Torso slots 3-6 (Standard), 3-8 (XL), or 3-4 (Compact)"`

**Source**:
- Gyro System (spec.md, lines 144-181)
- Critical Slot Allocation (spec.md, lines 150-177)

**User Action**: System places gyro automatically

---

### VAL-PLACE-007: XL Engine Side Torso Slots
**Rule**: XL Engine must occupy side torso slots (3 IS, 2 Clan)

**Severity**: Error

**Condition**: XL engine without side torso allocation

**Error Message**: `"XL Engine requires {3 IS or 2 Clan} slots in each side torso"`

**Source**:
- Engine System (spec.md, lines 63-77, 259-277)
- Critical Slot Allocation (spec.md, lines 131-141)

**User Action**: System allocates side torso slots automatically

---

### VAL-PLACE-008: Head Equipment Limit
**Rule**: Only 1 equipment slot available in head (slot 3) with standard cockpit

**Severity**: Warning

**Condition**: Attempt to place equipment beyond slot 3

**Error Message**: `"Head has limited equipment space (1 slot with standard cockpit, 0 with command console/primitive)"`

**Source**:
- Cockpit System (spec.md, lines 94-183)
- Critical Slot Allocation (spec.md, lines 84-115)

**User Action**: Use other locations for additional equipment

---

### VAL-PLACE-009: Partial Wing Side Torso Split
**Rule**: Partial wings must be split between left and right torso (3 slots each)

**Severity**: Error

**Condition**: Partial wing not properly split

**Error Message**: `"Partial wing requires 3 slots in Left Torso and 3 slots in Right Torso"`

**Source**: Movement System (spec.md, lines 229-237, 266-274)

**User Action**: Allocate 3 slots per side torso

---

### VAL-PLACE-010: Endo Steel Slot Distribution
**Rule**: Endo Steel/Composite slots must be distributed across locations

**Severity**: Validation

**Condition**: All structure slots in one location

**Error Message**: `"Endo Steel slots should be distributed across multiple locations"`

**Source**: Internal Structure System (spec.md, lines 260-299)

**User Action**: Distribute structure slots per construction rules

---

## Validation Severity Levels

### Critical Error
**Definition**: Prevents save/export of configuration. Unit is non-functional.

**Examples**:
- Exact weight mismatch
- Invalid tonnage
- Missing required components (engine, gyro, cockpit)
- Less than 10 heat sinks
- Engine rating outside 10-500 range

**User Experience**: Red error icon, save button disabled, clear error message with fix instructions

---

### Error
**Definition**: Invalid configuration that violates construction rules. Unit cannot be used.

**Examples**:
- Armor exceeding structural maximum
- Equipment in incompatible location
- Tech base incompatibility
- Component not available in era
- Critical slot capacity exceeded

**User Experience**: Red error icon, warnings list, cannot mark unit as complete

---

### Warning
**Definition**: Legal but unusual configuration. Unit is valid but may have issues.

**Examples**:
- Zero armor on location
- Minimal rear armor (<10%)
- Head armor below maximum (9)
- Tournament legality concerns
- Experimental components
- Mixed tech configuration

**User Experience**: Yellow warning icon, unit can be saved, warnings displayed for review

---

## Validation Dependencies

### Dependency Graph

```
1. Tonnage Selection
   └─> 2. Tech Base Declaration
       └─> 3. Engine Selection
           ├─> 4. Gyro Selection (depends on engine rating)
           ├─> 5. Structure Selection
           │   └─> 7. Armor Allocation (depends on structure points)
           └─> 6. Heat Sink Base Count (depends on engine rating)
               └─> 8. Additional Heat Sinks (minimum 10 total)
                   └─> 9. Equipment & Weapons
                       └─> 10. Critical Slot Validation
                           └─> 11. Final Weight Validation
                               └─> 12. Complete Validation
```

### Validation Order

1. **Property Level**: Individual property validation (weight >= 0, slots >= 0)
2. **Component Level**: Component-specific rules (engine rating valid, armor type valid)
3. **Compatibility Level**: Tech base, era, rules level compatibility
4. **Structural Level**: Armor vs structure, weight calculations
5. **Integration Level**: Critical slots, placement rules
6. **Budget Level**: Total weight, total slots
7. **Requirements Level**: Minimum heat sinks, required components
8. **Completeness Level**: All validation passes, unit complete

---

## Error Message Templates

### Standard Format

**Property Errors**:
```
"{Property} must be {constraint}. Got: {actualValue}"
Example: "Weight must be a non-negative finite number. Got: -1.5"
```

**Range Errors**:
```
"{Property} must be between {min} and {max}. Got: {actualValue}"
Example: "Tonnage must be between 20 and 100 tons. Got: 47"
```

**Compatibility Errors**:
```
"{Component} {reason} with {context}"
Example: "Component tech base CLAN is incompatible with unit tech base INNER_SPHERE"
```

**Requirement Errors**:
```
"{Requirement} {status}"
Example: "Unit must have at least 10 heat sinks (current: 8)"
```

**Placement Errors**:
```
"{Component} cannot be placed in {location}. {reason}"
Example: "Jump jets cannot be placed in Head. Jump jets only allowed in torso and legs"
```

### Contextual Information

All error messages should include:
- **What**: Clear description of the problem
- **Why**: Brief reason (if not obvious)
- **How**: Suggested fix or user action
- **Context**: Actual values causing the issue

Example Complete Error:
```json
{
  "ruleId": "VAL-WEIGHT-001",
  "severity": "critical-error",
  "message": "Total weight must equal exactly 50 tons",
  "details": {
    "expected": 50.0,
    "actual": 50.5,
    "difference": 0.5,
    "status": "overweight"
  },
  "userAction": "Remove or lighten components by 0.5 tons",
  "affectedComponents": ["Armor", "Equipment"],
  "source": "Construction Rules Core"
}
```

---

## Validation by Category Summary

| Category | Rule Count | Critical | Error | Warning |
|----------|------------|----------|-------|---------|
| Property Validation | 9 | 0 | 8 | 1 |
| Range Validation | 8 | 2 | 6 | 0 |
| Enum Validation | 6 | 0 | 4 | 2 |
| Tech Base Compatibility | 5 | 0 | 5 | 0 |
| Era Availability | 3 | 0 | 3 | 0 |
| Rules Level Validation | 3 | 0 | 1 | 2 |
| Weight Budget Validation | 5 | 3 | 2 | 0 |
| Critical Slot Validation | 8 | 0 | 8 | 0 |
| Structural Validation | 10 | 0 | 10 | 0 |
| Component Requirements | 12 | 7 | 5 | 0 |
| Construction Sequence | 10 | 1 | 2 | 7 |
| Placement Validation | 10 | 0 | 7 | 3 |
| **TOTAL** | **89** | **13** | **61** | **15** |

---

## Validation Cross-Reference

### By Source Specification

| Specification | Rule Count | Categories Covered |
|---------------|------------|-------------------|
| Core Entity Types | 12 | Property, Enum |
| Core Enumerations | 8 | Enum, Tech Base |
| Era & Temporal System | 6 | Era, Range |
| Physical Properties System | 8 | Property, Range |
| Rules Level System | 5 | Rules Level, Enum |
| Validation Patterns | 15 | All categories |
| Engine System | 8 | Range, Component, Weight |
| Gyro System | 6 | Structural, Component, Sequence |
| Heat Sink System | 7 | Component, Tech Base, Range |
| Internal Structure System | 8 | Structural, Weight, Range |
| Armor System | 14 | Structural, Range, Component |
| Cockpit System | 8 | Component, Placement |
| Movement System | 7 | Range, Placement, Component |
| Critical Slot Allocation | 15 | Slot, Placement, Sequence |
| Construction Rules Core | 12 | Weight, Component, Sequence |
| Tech Base Integration | 10 | Tech Base, Compatibility |

---

## References

### Official BattleTech Rules
- **TechManual**: Various pages - Component specifications and constraints
- **Total Warfare**: Construction rules and validation requirements
- **BattleMech Manual**: Quick reference for component limits

### Source Specifications
All 18 specifications analyzed:
- Phase 1 Foundation: Core Entity Types, Core Enumerations, Era & Temporal System, Physical Properties System, Rules Level System, Validation Patterns
- Phase 2 Construction: Armor System, Cockpit System, Construction Rules Core, Critical Slot Allocation, Engine System, Gyro System, Heat Sink System, Internal Structure System, Movement System, Tech Base Integration

---

## Changelog

### Version 1.0 (2025-11-28)
- Initial release
- Cataloged 89 validation rules from 18 specifications
- Organized into 12 major categories
- Defined 3 severity levels with clear criteria
- Established error message templates and formats
- Created validation dependency graph
- Added comprehensive cross-reference tables
- Documented all rule sources and user actions

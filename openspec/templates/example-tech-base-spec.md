# Technology Base System Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-01-27
**Dependencies**: Core Entity Types
**Affects**: ALL subsystems (Structure, Armor, Engine, Equipment, etc.)

---

## Overview

### Purpose

The Technology Base System defines how units are constructed using Inner Sphere or Clan technology. A unit's tech base (Inner Sphere, Clan, or Mixed) is **declared by the user** and determines which component tech bases are available for structural components. Equipment is constrained by year/era only.

### Scope

**In Scope:**

- Tech Base enum definitions and valid values
- Component compatibility rules
- Mixed tech construction rules
- Tech base validation logic
- Filtering and availability rules

**Out of Scope:**

- Era/temporal availability (separate spec)
- Specific component statistics (covered in component specs)
- Battle Value calculations
- Campaign-specific restrictions

### Key Concepts

- **Component Tech Base**: Every component (Structure, Engine, Gyro, etc.) is ONLY Inner Sphere OR Clan, never both.
- **Unit Tech Base Declaration**: User declares unit as Inner Sphere, Clan, or Mixed at construction start.
- **Structural Components**: Components that define the unit's construction (Structure, Engine, Gyro, Heat Sinks, Armor, Myomer, Movement). These are locked or unlocked based on unit tech base declaration.
- **Equipment**: Weapons, ammo, electronics - constrained by year/era only, NOT by unit tech base.
- **Mixed Tech Construction**: When unit is declared "Mixed", each structural component category can be toggled between IS and Clan.
- **Tech Base Filter**: UI-only filtering mechanism with options "Inner Sphere", "Clan", "Mixed", and "All" to filter displayed items.

---

## Requirements

### Requirement: Unit Tech Base Declaration

Users SHALL declare a unit's tech base as Inner Sphere, Clan, or Mixed at the start of construction, which determines component availability constraints.

**Rationale**: The unit tech base declaration controls which component tech bases are available for structural components during construction.

**Priority**: Critical

#### Scenario: User declares Inner Sphere unit

**GIVEN** a user is creating a new unit
**WHEN** the user declares the unit as Inner Sphere
**THEN** all structural component categories SHALL be locked to Inner Sphere tech base
**AND** the user SHALL NOT be able to select Clan components

#### Scenario: User declares Clan unit

**GIVEN** a user is creating a new unit
**WHEN** the user declares the unit as Clan
**THEN** all structural component categories SHALL be locked to Clan tech base
**AND** the user SHALL NOT be able to select Inner Sphere components

#### Scenario: User declares Mixed tech unit

**GIVEN** a user is creating a new unit
**WHEN** the user declares the unit as Mixed
**THEN** each structural component category CAN be toggled between Inner Sphere and Clan
**AND** the user SHALL have freedom to mix IS and Clan structural components

### Requirement: Component Tech Base Classification

ALL components (structural and equipment) SHALL have a tech base of either Inner Sphere or Clan.

**Rationale**: Components are manufactured as either IS or Clan technology, never both.

**Priority**: Critical

#### Scenario: Component must be either IS or Clan only

**GIVEN** any component (Structure, Engine, Gyro, weapon, etc.)
**WHEN** the component's tech base is assigned
**THEN** it MUST be either `TechBase.INNER_SPHERE` or `TechBase.CLAN`
**AND** it MUST NOT be any other value

### Requirement: Structural Component Constraints

The system SHALL enforce structural component tech base constraints based on the unit's declared tech base.

**Rationale**: Structural components must match the unit's tech base declaration, unless the unit is Mixed.

**Priority**: Critical

#### Scenario: Inner Sphere unit forces IS structural components

**GIVEN** a unit declared as Inner Sphere
**WHEN** selecting any structural component (Structure, Engine, Gyro, etc.)
**THEN** ONLY Inner Sphere variants SHALL be available
**AND** Clan variants SHALL be hidden/disabled

#### Scenario: Clan unit forces Clan structural components

**GIVEN** a unit declared as Clan
**WHEN** selecting any structural component
**THEN** ONLY Clan variants SHALL be available
**AND** Inner Sphere variants SHALL be hidden/disabled

#### Scenario: Mixed unit allows toggling per component category

**GIVEN** a unit declared as Mixed
**WHEN** selecting a structural component category (e.g., Engine)
**THEN** the user SHALL be able to toggle between IS and Clan variants
**AND** each category can be set independently

#### Scenario: Equipment not constrained by unit tech base

**GIVEN** a unit with any tech base declaration
**WHEN** selecting equipment (weapons, ammo, electronics)
**THEN** both IS and Clan equipment SHALL be available
**AND** equipment SHALL be constrained by year/era only

### Requirement: Mixed Tech Construction Rules

When a unit is declared as Mixed, the system SHALL allow mixing Inner Sphere and Clan structural components while enforcing mixed tech construction rules.

**Rationale**: Mixed tech construction is an advanced feature allowing optimization but comes with rules constraints.

**Priority**: High

#### Scenario: Mixed tech requires Advanced rules level

**GIVEN** a user is creating a new unit
**WHEN** the user declares the unit as Mixed
**THEN** the unit rules level MUST be Advanced or Experimental
**AND** the system SHALL prevent Mixed selection if rules level is Introductory or Standard

#### Scenario: Mixed tech enables component category toggling

**GIVEN** a unit declared as Mixed with Advanced rules level
**WHEN** the user selects a structural component category
**THEN** the user SHALL be able to toggle that category between IS and Clan
**AND** other categories remain independently toggleable

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

/\*\*

- Technology base for components
- All components are ONLY Inner Sphere or Clan
  _/
  enum TechBase {
  /\*\* Inner Sphere technology _/
  INNER_SPHERE = 'Inner Sphere',

/\*_ Clan technology _/
CLAN = 'Clan'
}

/\*\*

- Unit tech base declaration
- User declares this at construction start
  _/
  enum UnitTechBase {
  /\*\* Inner Sphere - all structural components locked to IS _/
  INNER_SPHERE = 'Inner Sphere',

/\*_ Clan - all structural components locked to Clan _/
CLAN = 'Clan',

/\*_ Mixed - structural components can be toggled IS/Clan per category _/
MIXED = 'Mixed'
}

/\*\*

- Tech base filter for UI filtering only
- This is NOT used for component classification, only for filtering UI lists
  \*/
  enum TechBaseFilter {
  INNER_SPHERE = 'Inner Sphere', // Show only IS items
  CLAN = 'Clan', // Show only Clan items
  MIXED = 'Mixed', // Show mixed tech units
  ALL = 'All' // Show everything
  }

/\*\*

- Component tech base interface
- All components (structural and equipment) have a tech base
  \*/
  interface IComponent {
  /\*\*
  - Technology base classification
  - @example TechBase.INNER_SPHERE
    \*/
    readonly techBase: TechBase;
    }

/\*\*

- Unit interface
  \*/
  interface IUnit {
  /\*\*
  - Unit tech base declaration (user sets this)
  - Determines component availability constraints
  - @example UnitTechBase.MIXED
    \*/
    techBase: UnitTechBase;

/\*\*

- Rules complexity level
- @example RulesLevel.ADVANCED
  \*/
  rulesLevel: RulesLevel;

/\*\*

- Structural components (each has IS or Clan tech base)
  \*/
  structure: IStructure;
  engine: IEngine;
  gyro: IGyro;
  heatSinks: IHeatSinkSystem;
  armor: IArmor;
  // ... other structural components
  }

````

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `techBase` (Component) | `TechBase` | Yes | Component technology | INNER_SPHERE, CLAN | N/A |
| `techBase` (Unit) | `UnitTechBase` | Yes | Unit declaration | INNER_SPHERE, CLAN, MIXED | N/A |
| `rulesLevel` | `RulesLevel` | Yes | Complexity level | INTRODUCTORY, STANDARD, ADVANCED, EXPERIMENTAL | N/A |

### Type Constraints

- **Components**:
  - `techBase` MUST be either `TechBase.INNER_SPHERE` or `TechBase.CLAN`
  - `techBase` MUST NOT be `null` or `undefined`
  - Components NEVER have `UnitTechBase` type

- **Units**:
  - `techBase` MUST be `UnitTechBase.INNER_SPHERE`, `UnitTechBase.CLAN`, or `UnitTechBase.MIXED`
  - When unit `techBase` is `INNER_SPHERE`:
    - All structural components MUST have `TechBase.INNER_SPHERE`
  - When unit `techBase` is `CLAN`:
    - All structural components MUST have `TechBase.CLAN`
  - When unit `techBase` is `MIXED`:
    - Structural components CAN have either `TechBase.INNER_SPHERE` or `TechBase.CLAN`
    - Each component category can be set independently
  - When unit `techBase` is `MIXED`:
    - `rulesLevel` MUST be `RulesLevel.ADVANCED` or `RulesLevel.EXPERIMENTAL`

---

## Validation Rules

### Validation: Structural Component Tech Base Constraint

**Rule**: Structural components must match unit tech base declaration constraints

**Severity**: Error

**Condition**:
```typescript
function validateStructuralComponent(
  unit: IUnit,
  component: IComponent,
  isStructural: boolean
): ValidationResult {
  // Equipment is not constrained by unit tech base
  if (!isStructural) {
    return { isValid: true };
  }

  // Structural components must be IS or Clan only
  if (component.techBase !== TechBase.INNER_SPHERE &&
      component.techBase !== TechBase.CLAN) {
    return {
      isValid: false,
      error: 'Component tech base must be Inner Sphere or Clan'
    };
  }

  // If unit is Mixed, any tech base is allowed
  if (unit.techBase === UnitTechBase.MIXED) {
    return { isValid: true };
  }

  // If unit is IS, component must be IS
  if (unit.techBase === UnitTechBase.INNER_SPHERE) {
    if (component.techBase !== TechBase.INNER_SPHERE) {
      return {
        isValid: false,
        error: `Clan ${component.name} not allowed on Inner Sphere unit`
      };
    }
  }

  // If unit is Clan, component must be Clan
  if (unit.techBase === UnitTechBase.CLAN) {
    if (component.techBase !== TechBase.CLAN) {
      return {
        isValid: false,
        error: `Inner Sphere ${component.name} not allowed on Clan unit`
      };
    }
  }

  return { isValid: true };
}
````

**Error Message**: "[Component Type] must be [Unit Tech Base] on [Unit Tech Base] units"

**User Action**:

- Select a component matching the unit tech base
- OR change unit tech base to Mixed (requires Advanced rules level)

### Validation: Mixed Tech Rules Level

**Rule**: Mixed tech requires Advanced or Experimental rules level

**Severity**: Error

**Condition**:

```typescript
function validateMixedTech(unit: IUnit): ValidationResult {
  if (unit.techBase === UnitTechBase.MIXED) {
    if (
      unit.rulesLevel === RulesLevel.INTRODUCTORY ||
      unit.rulesLevel === RulesLevel.STANDARD
    ) {
      return {
        isValid: false,
        error:
          'Mixed tech construction requires Advanced or Experimental rules level',
      };
    }
  }
  return { isValid: true };
}
```

**Error Message**: "Mixed tech construction requires Advanced or Experimental rules level"

**User Action**:

- Change rules level to Advanced or Experimental
- OR change unit tech base to Inner Sphere or Clan

---

## Technology Base Variants

### Inner Sphere Implementation

**Component Characteristics**:

- Heavier components (higher weight multipliers)
- More critical slots for advanced components
- Lower heat efficiency (energy weapons)
- Shorter weapon ranges

**Examples**:

- Endo Steel: 14 critical slots
- Ferro-Fibrous Armor: 14 critical slots, 17.92 pts/ton
- XL Engine: 6 side torso slots (3 per side), destroyed if 1 side torso lost
- Double Heat Sink: 3 critical slots

### Clan Implementation

**Component Characteristics**:

- Lighter components (lower weight multipliers)
- Fewer critical slots for advanced components
- Higher heat efficiency
- Longer weapon ranges

**Examples**:

- Endo Steel: 7 critical slots
- Ferro-Fibrous Armor: 7 critical slots, 19.2 pts/ton
- XL Engine: 4 side torso slots (2 per side), survives 1 side torso loss
- Double Heat Sink: 2 critical slots

### Mixed Tech Rules

**When unit tech base is Mixed**:

- Can use both IS and Clan components
- Each component retains its tech base characteristics
- Mixed tech penalties apply to Battle Value
- Must use Advanced or Experimental rules level
- Base tech base (IS or Clan) determines primary classification

---

## Dependencies

### Depends On

- **Core Entity Types**: Provides `IEntity` base interface
- **Rules Level System**: Provides `RulesLevel` enum

### Used By

- **Internal Structure**: Structure types have tech base variants
- **Armor System**: Armor types have tech base variants
- **Engine System**: Engine types have tech base variants
- **Equipment**: All equipment has tech base
- **Heat Sinks**: Heat sink types have tech base variants
- **ALL subsystems**: Every component has tech base

### Construction Sequence

1. Tech base must be determined FIRST (foundational property)
2. Rules level must be set
3. Then other subsystems can validate component compatibility

---

## Implementation Notes

### Performance Considerations

- Tech base validation is called frequently during construction
- Consider caching compatibility checks for frequently used component pairs
- Validation logic should be optimized for O(1) lookups

### Edge Cases

- **Mixed Tech Units**: Must track both IS and Clan components separately for accurate weight/slot calculations since IS and Clan versions have different stats
- **Legacy Data**: May have string values instead of enum; conversion utilities required
- **UI Filtering vs Component Classification**: TechBaseFilter is for UI only; components themselves are only IS or Clan

### Common Pitfalls

- **Pitfall**: Thinking unit tech base is derived from components
  - **Solution**: Unit tech base is DECLARED by user, then constrains component selection

- **Pitfall**: Constraining equipment by unit tech base
  - **Solution**: Equipment is constrained by year/era only, not unit tech base

- **Pitfall**: Allowing Mixed tech with Standard rules level
  - **Solution**: Always validate that Mixed requires Advanced or Experimental rules level

- **Pitfall**: Confusing `TechBase` (component) with `UnitTechBase` (unit declaration)
  - **Solution**: Use separate enums; components never use `UnitTechBase`

- **Pitfall**: Using string comparison instead of enum comparison
  - **Solution**: Use enum values exclusively

---

## Examples

### Example 1: Inner Sphere Unit Construction

**Input**:

```typescript
const unit: IUnit = {
  techBase: UnitTechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  structure: {
    name: 'Standard Structure',
    techBase: TechBase.INNER_SPHERE,
  },
  engine: {
    name: 'Fusion Engine 300',
    techBase: TechBase.INNER_SPHERE,
  },
};
```

**Result**: All structural components MUST be Inner Sphere. Clan options are hidden in UI.

### Example 2: Clan Unit Construction

**Input**:

```typescript
const unit: IUnit = {
  techBase: UnitTechBase.CLAN,
  rulesLevel: RulesLevel.STANDARD,
  structure: {
    name: 'Clan Endo Steel',
    techBase: TechBase.CLAN,
    criticalSlots: 7,
  },
  engine: {
    name: 'Clan XL Engine 300',
    techBase: TechBase.CLAN,
  },
};
```

**Result**: All structural components MUST be Clan. IS options are hidden in UI.

### Example 3: Mixed Tech Unit Construction

**Input**:

```typescript
const unit: IUnit = {
  techBase: UnitTechBase.MIXED,
  rulesLevel: RulesLevel.ADVANCED, // Required for Mixed

  // User can mix and match per category
  structure: {
    name: 'Clan Endo Steel',
    techBase: TechBase.CLAN, // User chose Clan for Structure
    criticalSlots: 7,
  },
  engine: {
    name: 'Fusion Engine 300',
    techBase: TechBase.INNER_SPHERE, // User chose IS for Engine
  },
  armor: {
    name: 'Ferro-Fibrous Armor',
    techBase: TechBase.INNER_SPHERE, // User chose IS for Armor
  },
};
```

**Result**: Each structural component category can be toggled IS/Clan independently.

### Example 4: Equipment Not Constrained by Unit Tech Base

**Input**:

```typescript
const unit: IUnit = {
  techBase: UnitTechBase.INNER_SPHERE, // IS unit
  rulesLevel: RulesLevel.STANDARD,
  year: 3050, // Construction year
};

// Weapons from 3050 era
const isWeapon = {
  name: 'Medium Laser',
  techBase: TechBase.INNER_SPHERE,
  introYear: 2300,
};

const clanWeapon = {
  name: 'Clan ER Large Laser',
  techBase: TechBase.CLAN,
  introYear: 2825, // Available in 3050
};
```

**Validation**:

```typescript
// Both weapons can be added - constrained by year only
const validIS = validateEquipment(unit, isWeapon); // true
const validClan = validateEquipment(unit, clanWeapon); // true (year 3050 >= 2825)
```

**Result**: Equipment is year/era constrained, NOT unit tech base constrained.

### Example 5: UI Filtering

**UI Filter** (for showing components in browser):

```typescript
// User selects filter
const filter = TechBaseFilter.CLAN;

// Filter structural components for display
const filteredComponents = allComponents.filter((comp) => {
  if (filter === TechBaseFilter.ALL) return true;
  if (filter === TechBaseFilter.INNER_SPHERE)
    return comp.techBase === TechBase.INNER_SPHERE;
  if (filter === TechBaseFilter.CLAN) return comp.techBase === TechBase.CLAN;
  if (filter === TechBaseFilter.MIXED) {
    // Show components that could be used in mixed construction
    return true; // Or filter based on other criteria
  }
  return false;
});
```

---

## References

### Official BattleTech Rules

- **TechManual**: Pages 30-32 - Tech Base and Mixed Tech
- **Total Warfare**: Page 134 - Tech Base restrictions
- **Interstellar Operations**: Pages 78-82 - Advanced Mixed Tech rules

### Related Documentation

- Rules Level System spec
- Core Entity Types spec
- Equipment Database spec

---

## Changelog

### Version 1.0 (2025-01-27)

- Initial specification
- Defined core tech base requirements
- Added compatibility validation rules
- Added mixed tech construction rules

# Rules Level System Specification

**Status**: Active
**Version**: 1.1
**Last Updated**: 2025-11-28
**Dependencies**: Core Enumerations, Core Entity Types
**Affects**: All component and equipment specifications

---

## Overview

### Purpose
Defines the rules complexity classification system for BattleTech components and equipment. Rules levels categorize technology by complexity and competitive play legality, ranging from basic introductory rules to advanced experimental technology.

### Scope
**In Scope:**
- Component classification by rules level
- Filtering and validation based on rules level
- Rules level progression and hierarchy
- Competitive play legality

**Out of Scope:**
- Rules level enumeration definitions (see Core Enumerations)
- Specific component implementations (covered in component specs)
- Tournament organization rules
- Campaign-specific house rules
- Custom technology levels

### Key Concepts
- **Rules Level**: Classification of technology complexity (Introductory, Standard, Advanced, Experimental)
- **Competitive Legality**: Whether technology is allowed in tournament play
- **Rules Progression**: Increasing complexity from Introductory → Standard → Advanced → Experimental
- **Rules Level Filter**: UI mechanism to filter components by maximum allowed complexity

---

## Requirements

### Requirement: Rules Level Enumeration
The system SHALL define four distinct rules levels with clear hierarchy.

**Rationale**: Official BattleTech rules define four complexity levels. This classification affects game balance and competitive play.

**Priority**: Critical

#### Scenario: Rules level definition
**GIVEN** a component is being classified
**WHEN** assigning rules level
**THEN** it MUST use one of: INTRODUCTORY, STANDARD, ADVANCED, EXPERIMENTAL
**AND** the value MUST be immutable
**AND** only one rules level SHALL be assigned

#### Scenario: Rules level hierarchy
**GIVEN** a rules level filter setting
**WHEN** filtering components
**THEN** INTRODUCTORY components SHALL always be available
**AND** STANDARD SHALL include INTRODUCTORY
**AND** ADVANCED SHALL include STANDARD and INTRODUCTORY
**AND** EXPERIMENTAL SHALL include all levels

### Requirement: Component Classification
All components SHALL declare a rules level via ITechBaseEntity interface.

**Rationale**: Every component has a defined complexity level in official rules.

**Priority**: Critical

#### Scenario: Component with rules level
**GIVEN** a new component is defined
**WHEN** implementing the interface
**THEN** it MUST include rulesLevel property
**AND** rulesLevel MUST be a valid RulesLevel enum value
**AND** rulesLevel SHALL be readonly

#### Scenario: Missing rules level
**GIVEN** a component without rules level
**WHEN** validating the component
**THEN** validation SHALL fail with error
**AND** error message SHALL indicate missing rulesLevel

### Requirement: Rules Level Filtering
The system SHALL support filtering components by maximum allowed rules level.

**Rationale**: Players and game masters need to limit technology complexity for different game types.

**Priority**: High

#### Scenario: Filter to Standard rules
**GIVEN** rules level filter set to STANDARD
**WHEN** displaying available components
**THEN** show INTRODUCTORY components
**AND** show STANDARD components
**AND** hide ADVANCED components
**AND** hide EXPERIMENTAL components

#### Scenario: Filter to Introductory
**GIVEN** rules level filter set to INTRODUCTORY
**WHEN** displaying available components
**THEN** show only INTRODUCTORY components
**AND** hide all other levels

### Requirement: Competitive Play Validation
The system SHALL validate tournament legality based on rules level.

**Rationale**: Tournament play has specific rules about allowed technology levels.

**Priority**: Medium

#### Scenario: Tournament validation
**GIVEN** a unit configured for tournament play
**WHEN** validating component legality
**THEN** INTRODUCTORY components SHALL be valid
**AND** STANDARD components SHALL be valid
**AND** ADVANCED components SHALL be valid
**AND** EXPERIMENTAL components SHALL be invalid

#### Scenario: Experimental warning
**GIVEN** a component with EXPERIMENTAL rules level
**WHEN** adding to a unit
**THEN** system SHOULD display warning
**AND** warning SHALL indicate tournament illegality

---


## Rules Level Enumeration

The `RulesLevel` and `RulesLevelFilter` enumerations are defined in the [Core Enumerations](../core-enumerations/spec.md) specification. This specification defines the classification logic, hierarchy relationships, tournament legality rules, and filtering patterns that use these enumerations.

For the complete enumeration definitions, see: `openspec/specs/phase-1-foundation/core-enumerations/spec.md`

**Summary of Enumeration Values:**

**RulesLevel**: INTRODUCTORY, STANDARD, ADVANCED, EXPERIMENTAL

**RulesLevelFilter**: INTRODUCTORY, STANDARD, ADVANCED, ALL

---

## Data Model Requirements

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `rulesLevel` | `RulesLevel` | Yes | Component rules complexity | INTRODUCTORY, STANDARD, ADVANCED, EXPERIMENTAL | - |

### Type Constraints

- `rulesLevel` MUST be one of the four defined RulesLevel enum values
- `rulesLevel` MUST NOT be null or undefined for ITechBaseEntity
- `rulesLevel` SHALL be immutable once set

---

## Validation Rules

### Validation: Rules Level Required
**Rule**: All tech base entities must have a valid rules level

**Severity**: Error

**Condition**:
```typescript
if (!Object.values(RulesLevel).includes(component.rulesLevel)) {
  // invalid - emit error
}
```

**Error Message**: "Component must have a valid rules level"

**User Action**: Assign a valid RulesLevel to the component

### Validation: Tournament Legality
**Rule**: Experimental components cannot be used in tournament play

**Severity**: Warning

**Condition**:
```typescript
if (unit.isTournamentUnit && component.rulesLevel === RulesLevel.EXPERIMENTAL) {
  // invalid - emit warning
}
```

**Error Message**: "Experimental components are not legal for tournament play"

**User Action**: Remove experimental components or disable tournament mode

---

## Rules Level Definitions

### Introductory Level

**Description**: Basic components available in introductory boxed sets. Simplified rules for new players.

**Characteristics**:
- Simplest game mechanics
- No special rules overhead
- Always tournament legal
- Limited technology options

**Example Components**:
- Standard Fusion Engine
- Standard Armor
- Standard Heat Sinks
- Medium Laser
- Autocannon/5
- SRM 6

**Usage**: Recommended for new players, teaching games, and quick play scenarios.

### Standard Level

**Description**: Common technology found in standard BattleTech gameplay. Represents the majority of components.

**Characteristics**:
- Standard game complexity
- Widely available technology
- Always tournament legal
- Balanced for competitive play

**Example Components**:
- Endo Steel Structure
- Ferro-Fibrous Armor
- Double Heat Sinks
- ER Medium Laser
- LB-X Autocannon
- Streak SRM

**Usage**: Standard competitive play, campaigns, and most game scenarios.

### Advanced Level

**Description**: Advanced technology with additional rules complexity. Requires knowledge of advanced rules.

**Characteristics**:
- Increased rules complexity
- Specialized equipment
- Tournament legal but complex
- Requires rulebook references

**Example Components**:
- XL Engine
- Light Ferro-Fibrous Armor
- Targeting Computer
- ER PPC with Capacitor
- Rotary AC/5
- Arrow IV Artillery

**Usage**: Experienced players, tournament play, and advanced campaigns.

### Experimental Level

**Description**: Cutting-edge prototype technology. Playtest and experimental rules.

**Characteristics**:
- Highest complexity
- Prototype/experimental status
- NOT tournament legal
- Subject to rule changes
- May have special restrictions

**Example Components**:
- Primitive Fusion Engine
- Reactive Armor
- Coolant Pod
- Plasma Rifle
- Thunderbolt (missile)
- Experimental weaponry

**Usage**: Special campaigns, playtesting, and non-tournament scenarios only.

---

## Filtering Logic

### Filter Implementation

```typescript
/**
 * Determines if a component matches the rules level filter
 */
function matchesRulesFilter(
  component: ITechBaseEntity,
  filter: RulesLevelFilter
): boolean {
  switch (filter) {
    case RulesLevelFilter.INTRODUCTORY:
      return component.rulesLevel === RulesLevel.INTRODUCTORY;

    case RulesLevelFilter.STANDARD:
      return (
        component.rulesLevel === RulesLevel.INTRODUCTORY ||
        component.rulesLevel === RulesLevel.STANDARD
      );

    case RulesLevelFilter.ADVANCED:
      return (
        component.rulesLevel === RulesLevel.INTRODUCTORY ||
        component.rulesLevel === RulesLevel.STANDARD ||
        component.rulesLevel === RulesLevel.ADVANCED
      );

    case RulesLevelFilter.ALL:
      return true;

    default:
      return false;
  }
}
```

### Hierarchy Table

| Filter Setting | Introductory | Standard | Advanced | Experimental |
|---------------|--------------|----------|----------|--------------|
| INTRODUCTORY  | ✓            | ✗        | ✗        | ✗            |
| STANDARD      | ✓            | ✓        | ✗        | ✗            |
| ADVANCED      | ✓            | ✓        | ✓        | ✗            |
| ALL           | ✓            | ✓        | ✓        | ✓            |

---

## Technology Base Variants

### Inner Sphere Implementation
**No special rules** - Inner Sphere components use the same rules level classifications.

### Clan Implementation
**No special rules** - Clan components use the same rules level classifications.

**Note**: A Clan component may have a different rules level than its Inner Sphere equivalent (e.g., Clan ER Medium Laser is STANDARD while IS ER Medium Laser is ADVANCED).

### Mixed Tech Rules
**When unit tech base is Mixed**: Rules level filtering applies the same regardless of unit tech base. A STANDARD filter shows all STANDARD components from both IS and Clan.

---

## Dependencies

### Defines
- **Rules level classification logic**: How components are classified by complexity
- **Rules level hierarchy**: Establishes progression from basic to advanced complexity (Introductory → Standard → Advanced → Experimental)
- **Tournament legality rules**: Experimental components not tournament legal
- **Filtering logic**: How to match components against rules level filters
- **Complexity progression**: Increasing rules overhead from simplest to most complex

### Depends On
- [Core Enumerations](../core-enumerations/spec.md) - Defines RulesLevel and RulesLevelFilter enums (authoritative source)
- [Core Entity Types](../core-entity-types/spec.md) - Uses ITechBaseEntity interface (which includes rulesLevel property)

### Used By
- [Engine System](../../phase-2-construction/engine-system/spec.md) - Classifies engine types by rules level
- [Gyro System](../../phase-2-construction/gyro-system/spec.md) - Classifies gyro types by rules level
- [Heat Sink System](../../phase-2-construction/heat-sink-system/spec.md) - Classifies heat sink types by rules level
- [Internal Structure System](../../phase-2-construction/internal-structure-system/spec.md) - Classifies structure types by rules level
- [Armor System](../../phase-2-construction/armor-system/spec.md) - Classifies armor types by rules level
- [Cockpit System](../../phase-2-construction/cockpit-system/spec.md) - Classifies cockpit types by rules level
- [Movement System](../../phase-2-construction/movement-system/spec.md) - Classifies movement equipment by rules level
- [Construction Rules Core](../../phase-2-construction/construction-rules-core/spec.md) - Validates tournament legality
- **Equipment database**: Filtering and sorting by rules level
- **UI filters**: Component selection filtering

### Construction Sequence
1. Define RulesLevel and RulesLevelFilter enumerations (Core Enumerations spec)
2. Define classification logic and hierarchy (this spec)
3. Define ITechBaseEntity with rulesLevel property (Core Entity Types)
4. Implement components with assigned rules levels
5. Implement filtering logic in UI

---

## Implementation Notes

### Performance Considerations
- Rules level filtering is O(1) comparison
- Cache filter results for large component lists
- Pre-filter database queries when possible

### Edge Cases
- **Components changing rules level**: When official rules update changes a component's level, existing designs may need validation
- **Campaign custom rules**: Some campaigns may allow experimental components - provide override mechanism
- **Unknown rules level**: Treat missing/invalid rules level as error, not default to any level

### Common Pitfalls
- **Pitfall**: Defaulting to STANDARD when rules level is unknown
  - **Solution**: Require explicit rules level, fail validation if missing
- **Pitfall**: Filtering after loading all components
  - **Solution**: Filter at database query level when possible
- **Pitfall**: Allowing experimental in tournament mode
  - **Solution**: Hard validate tournament legality, don't just warn

---

## Examples

### Example 1: Component with Rules Level
```typescript
interface IWeapon extends ITechBaseEntity, IPlaceableComponent {
  readonly damage: number;
}

const mediumLaser: IWeapon = {
  id: 'med-laser-is',
  name: 'Medium Laser',
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.INTRODUCTORY,  // Introductory level
  weight: 1,
  criticalSlots: 1,
  damage: 5
};

const erMediumLaser: IWeapon = {
  id: 'er-med-laser-is',
  name: 'ER Medium Laser',
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.ADVANCED,  // Advanced level
  weight: 1,
  criticalSlots: 1,
  damage: 5
};
```

### Example 2: Filtering Components
```typescript
const allWeapons: IWeapon[] = loadWeaponDatabase();

// Filter to Standard rules (Intro + Standard)
const standardWeapons = allWeapons.filter(weapon =>
  matchesRulesFilter(weapon, RulesLevelFilter.STANDARD)
);

// Filter to Introductory only
const introWeapons = allWeapons.filter(weapon =>
  weapon.rulesLevel === RulesLevel.INTRODUCTORY
);
```

### Example 3: Tournament Validation
```typescript
function validateTournamentLegality(unit: IUnit): ValidationResult {
  const errors: ValidationError[] = [];

  // Check all equipment
  for (const item of unit.equipment) {
    if (item.rulesLevel === RulesLevel.EXPERIMENTAL) {
      errors.push({
        severity: 'error',
        message: `${item.name} is Experimental and not tournament legal`,
        location: 'equipment'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: []
  };
}
```

### Example 4: Progressive Disclosure UI
```typescript
// UI dropdown for rules level selection
const rulesLevelOptions = [
  { value: RulesLevelFilter.INTRODUCTORY, label: 'Introductory Only', description: 'Basic components for new players' },
  { value: RulesLevelFilter.STANDARD, label: 'Standard Rules', description: 'Standard gameplay (Intro + Standard)' },
  { value: RulesLevelFilter.ADVANCED, label: 'Advanced Rules', description: 'All tournament legal components (Intro + Standard + Advanced)' },
  { value: RulesLevelFilter.ALL, label: 'All Components', description: 'Include experimental technology' }
];

// User selects filter, components update
function onRulesFilterChange(filter: RulesLevelFilter) {
  const filtered = components.filter(c => matchesRulesFilter(c, filter));
  updateComponentList(filtered);
}
```

---

## References

### Official BattleTech Rules
- **Total Warfare**: Pages 6-7 - Rules levels overview
- **TechManual**: Pages 11-12 - Technology progression and rules levels
- **Tactical Operations**: Advanced rules clarification

### Related Documentation
- `openspec/specs/phase-1-foundation/core-enumerations/spec.md` - RulesLevel and RulesLevelFilter enum definitions
- `openspec/specs/core-entity-types/spec.md` - ITechBaseEntity interface
- `openspec/specs/tech-base-system/spec.md` - Technology base classification
- `openspec/specs/era-temporal-system/spec.md` - Technology availability by era

### Code References
- Enums: `src/types/core/BaseTypes.ts`
- Filtering: `src/utils/filters/rulesLevelFilter.ts`
- Validation: `src/services/validation/tournamentValidator.ts`

---

## Changelog

### Version 1.0 (2025-11-27)
- Initial specification
- Defined RulesLevel enum with four levels
- Defined RulesLevelFilter for component filtering
- Established hierarchy and tournament legality rules
- Added filtering logic and validation rules

### Version 1.1 (2025-11-28)
- Removed duplicate RulesLevel and RulesLevelFilter enum definitions
- Added reference to Core Enumerations specification as authoritative source
- Updated "Defines" section to clarify this spec defines usage and rules, not enumerations
- Updated "Depends On" section to include Core Enumerations dependency
- Updated construction sequence to reflect enum definition in Core Enumerations
- Updated scope to clarify enumeration definitions are out of scope
- Fixed note about IS ER Medium Laser being ADVANCED (not TOURNAMENT)
- Updated metadata to reflect Core Enumerations dependency

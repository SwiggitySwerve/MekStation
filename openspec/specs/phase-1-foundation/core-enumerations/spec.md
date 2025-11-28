# Core Enumerations Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-28
**Dependencies**: None (Foundation)
**Affects**: All specifications

---

## Overview

### Purpose
Defines the core enumeration types used throughout the BattleTech Editor specifications. Establishes a single source of truth for shared enumerations including technology base classification, rules complexity levels, historical eras, and filtering options.

### Scope
**In Scope:**
- Technology base enumerations (TechBase, UnitTechBase, TechBaseFilter)
- Rules complexity enumerations (RulesLevel, RulesLevelFilter)
- Historical era enumeration (Era)
- Enumeration validation and type guards
- Enumeration display values and constants

**Out of Scope:**
- Specific component implementations using these enums
- Business logic for filtering or validation (defined in respective specs)
- UI components or rendering logic
- Database schema or persistence format

### Key Concepts
- **TechBase**: Binary classification of component origin (Inner Sphere or Clan)
- **UnitTechBase**: Unit-level classification supporting mixed technology (Inner Sphere, Clan, or Mixed)
- **RulesLevel**: Complexity classification of components (Introductory, Standard, Advanced, Experimental)
- **Era**: Historical timeline period in BattleTech universe
- **Filter Enumerations**: Extended enumerations with "ALL" option for UI filtering

---

## Requirements

### Requirement: Technology Base Core Enumerations
The system SHALL define technology base enumerations for components and units.

**Rationale**: BattleTech distinguishes between Inner Sphere and Clan technology. Components have binary tech base while units can be mixed.

**Priority**: Critical

#### Scenario: Component tech base
**GIVEN** a component is being classified
**WHEN** assigning tech base
**THEN** it MUST use TechBase enum (INNER_SPHERE or CLAN)
**AND** the value MUST be immutable
**AND** only one tech base SHALL be assigned

#### Scenario: Unit tech base with mixed technology
**GIVEN** a unit contains both IS and Clan components
**WHEN** determining unit tech base
**THEN** it MUST use UnitTechBase.MIXED
**AND** MIXED SHALL only apply to units, not components

#### Scenario: Tech base filtering
**GIVEN** a UI filter for technology selection
**WHEN** user selects filter option
**THEN** filter MUST use TechBaseFilter enum
**AND** filter SHALL support INNER_SPHERE, CLAN, MIXED, or ALL options

### Requirement: Rules Level Enumerations
The system SHALL define rules complexity classification enumerations.

**Rationale**: BattleTech components have different complexity levels affecting gameplay and tournament legality.

**Priority**: Critical

#### Scenario: Component rules level
**GIVEN** a component is being classified
**WHEN** assigning rules level
**THEN** it MUST use RulesLevel enum
**AND** value MUST be one of: INTRODUCTORY, STANDARD, ADVANCED, EXPERIMENTAL
**AND** the value MUST be immutable

#### Scenario: Rules level hierarchy
**GIVEN** a rules level filter setting
**WHEN** filtering components
**THEN** INTRODUCTORY filter SHALL show only INTRODUCTORY components
**AND** STANDARD filter SHALL show INTRODUCTORY and STANDARD
**AND** ADVANCED filter SHALL show INTRODUCTORY, STANDARD, and ADVANCED
**AND** ALL filter SHALL show all components including EXPERIMENTAL

#### Scenario: Rules level filter
**GIVEN** a UI filter for component selection
**WHEN** user selects maximum allowed complexity
**THEN** filter MUST use RulesLevelFilter enum
**AND** filter SHALL support INTRODUCTORY, STANDARD, ADVANCED, or ALL options

### Requirement: Era Enumeration
The system SHALL define canonical BattleTech historical eras.

**Rationale**: Technology availability is tied to specific historical periods in the BattleTech timeline.

**Priority**: Critical

#### Scenario: Era classification
**GIVEN** a component with introduction year
**WHEN** determining its era
**THEN** era MUST use Era enum
**AND** era SHALL match one of the 8 canonical periods
**AND** eras SHALL be ordered chronologically

#### Scenario: Era enumeration completeness
**GIVEN** the complete BattleTech timeline from 2005-3150+
**WHEN** classifying any technology
**THEN** it SHALL map to exactly one Era value
**AND** eras SHALL cover: AGE_OF_WAR, STAR_LEAGUE, EARLY_SUCCESSION_WAR, LATE_SUCCESSION_WAR, CLAN_INVASION, CIVIL_WAR, JIHAD, DARK_AGE

### Requirement: Enumeration Immutability
All enumeration values SHALL be immutable constants.

**Rationale**: Enumerations represent fixed classifications that should never change at runtime.

**Priority**: Critical

#### Scenario: Enumeration value assignment
**GIVEN** an enum value is assigned to a property
**WHEN** attempting to modify the property
**THEN** TypeScript SHALL prevent modification (readonly)
**AND** enum values themselves SHALL be string constants

#### Scenario: Enum validation
**GIVEN** an unknown string value
**WHEN** checking if it matches an enum
**THEN** type guard functions SHALL return false
**AND** validation SHALL be type-safe

---

## Data Model Requirements

### Required Enumerations

```typescript
/**
 * Technology base classification for components
 *
 * Binary classification of component origin. Every component is either
 * Inner Sphere or Clan technology.
 */
enum TechBase {
  /**
   * Inner Sphere technology
   * Technology developed by Inner Sphere factions
   */
  INNER_SPHERE = 'Inner Sphere',

  /**
   * Clan technology
   * Technology developed by Clan factions
   */
  CLAN = 'Clan'
}

/**
 * Technology base classification for units
 *
 * Extends TechBase to support mixed technology units that contain
 * both Inner Sphere and Clan components.
 */
enum UnitTechBase {
  /**
   * Pure Inner Sphere unit
   * All components are Inner Sphere technology
   */
  INNER_SPHERE = 'Inner Sphere',

  /**
   * Pure Clan unit
   * All components are Clan technology
   */
  CLAN = 'Clan',

  /**
   * Mixed technology unit
   * Contains components from both Inner Sphere and Clan
   */
  MIXED = 'Mixed'
}

/**
 * Technology base filter for UI component selection
 *
 * Supports filtering components by tech base with an ALL option
 * to show components from all tech bases.
 */
enum TechBaseFilter {
  /**
   * Show only Inner Sphere components
   */
  INNER_SPHERE = 'Inner Sphere',

  /**
   * Show only Clan components
   */
  CLAN = 'Clan',

  /**
   * Show mixed technology units or components usable in mixed units
   */
  MIXED = 'Mixed',

  /**
   * Show all components regardless of tech base
   */
  ALL = 'All'
}

/**
 * Rules complexity classification
 *
 * Defines the complexity level and competitive play legality of components.
 * Levels form a hierarchy: INTRODUCTORY < STANDARD < ADVANCED < EXPERIMENTAL
 */
enum RulesLevel {
  /**
   * Introductory rules - basic game components
   * Used for new players and simplified gameplay
   * Always tournament legal
   */
  INTRODUCTORY = 'Introductory',

  /**
   * Standard rules - common components
   * Most widely used in standard gameplay
   * Always tournament legal
   */
  STANDARD = 'Standard',

  /**
   * Advanced rules - complex components
   * Advanced technology with additional rules overhead
   * Tournament legal but adds complexity
   */
  ADVANCED = 'Advanced',

  /**
   * Experimental rules - bleeding edge technology
   * Experimental or prototype technology
   * NOT tournament legal - playtest/campaign only
   */
  EXPERIMENTAL = 'Experimental'
}

/**
 * Rules level filter for UI component selection
 *
 * Supports filtering by maximum allowed rules complexity with an ALL option
 * to include experimental technology.
 */
enum RulesLevelFilter {
  /**
   * Show only Introductory components
   */
  INTRODUCTORY = 'Introductory',

  /**
   * Show Introductory and Standard components
   */
  STANDARD = 'Standard',

  /**
   * Show Introductory, Standard, and Advanced components (tournament legal)
   */
  ADVANCED = 'Advanced',

  /**
   * Show all components including Experimental
   */
  ALL = 'All'
}

/**
 * BattleTech historical eras
 *
 * Canonical timeline periods with approximate year ranges.
 * Used for categorization and filtering of technology availability.
 */
enum Era {
  /**
   * Age of War (2005-2570)
   * Early interstellar conflict and technology development
   */
  AGE_OF_WAR = 'Age of War',

  /**
   * Star League (2571-2780)
   * Golden age of technology and prosperity
   */
  STAR_LEAGUE = 'Star League',

  /**
   * Early Succession Wars (2781-2900)
   * Technology regression and loss following Star League collapse
   */
  EARLY_SUCCESSION_WAR = 'Early Succession Wars',

  /**
   * Late Succession Wars (2901-3049)
   * Continued conflict with limited technology
   * Classic BattleTech era (3025)
   */
  LATE_SUCCESSION_WAR = 'Late Succession Wars',

  /**
   * Clan Invasion (3050-3061)
   * Clan arrival in Inner Sphere and technology renaissance
   */
  CLAN_INVASION = 'Clan Invasion',

  /**
   * Civil War (3062-3067)
   * FedCom Civil War and political upheaval
   */
  CIVIL_WAR = 'Civil War',

  /**
   * Jihad (3068-3085)
   * Word of Blake Jihad and massive conflicts
   */
  JIHAD = 'Jihad',

  /**
   * Dark Age (3086-3150+)
   * HPG blackout and technological chaos
   */
  DARK_AGE = 'Dark Age'
}
```

### Type Guard Functions

```typescript
/**
 * Type guard for TechBase enum
 */
function isValidTechBase(value: unknown): value is TechBase {
  return (
    typeof value === 'string' &&
    (value === TechBase.INNER_SPHERE || value === TechBase.CLAN)
  );
}

/**
 * Type guard for UnitTechBase enum
 */
function isValidUnitTechBase(value: unknown): value is UnitTechBase {
  return (
    typeof value === 'string' &&
    (value === UnitTechBase.INNER_SPHERE ||
      value === UnitTechBase.CLAN ||
      value === UnitTechBase.MIXED)
  );
}

/**
 * Type guard for TechBaseFilter enum
 */
function isValidTechBaseFilter(value: unknown): value is TechBaseFilter {
  return (
    typeof value === 'string' &&
    (value === TechBaseFilter.INNER_SPHERE ||
      value === TechBaseFilter.CLAN ||
      value === TechBaseFilter.MIXED ||
      value === TechBaseFilter.ALL)
  );
}

/**
 * Type guard for RulesLevel enum
 */
function isValidRulesLevel(value: unknown): value is RulesLevel {
  return (
    typeof value === 'string' &&
    (Object.values(RulesLevel) as string[]).includes(value)
  );
}

/**
 * Type guard for RulesLevelFilter enum
 */
function isValidRulesLevelFilter(value: unknown): value is RulesLevelFilter {
  return (
    typeof value === 'string' &&
    (Object.values(RulesLevelFilter) as string[]).includes(value)
  );
}

/**
 * Type guard for Era enum
 */
function isValidEra(value: unknown): value is Era {
  return (
    typeof value === 'string' &&
    (Object.values(Era) as string[]).includes(value)
  );
}
```

### Required Properties

**When used in component interfaces:**

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `techBase` | `TechBase` | Yes | Component tech base | INNER_SPHERE, CLAN | - |
| `rulesLevel` | `RulesLevel` | Yes | Rules complexity | INTRODUCTORY, STANDARD, ADVANCED, EXPERIMENTAL | - |
| `era` | `Era` | Yes (temporal) | Introduction era | Valid Era enum value | - |

**When used in unit interfaces:**

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `techBase` | `UnitTechBase` | Yes | Unit tech base | INNER_SPHERE, CLAN, MIXED | - |

**When used in filter interfaces:**

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `techBaseFilter` | `TechBaseFilter` | No | Tech base filter | INNER_SPHERE, CLAN, MIXED, ALL | ALL |
| `rulesLevelFilter` | `RulesLevelFilter` | No | Rules level filter | INTRODUCTORY, STANDARD, ADVANCED, ALL | ALL |

### Type Constraints

- All enum values MUST be readonly string constants
- TechBase MUST NOT include MIXED (use UnitTechBase for mixed units)
- UnitTechBase values MUST match TechBase for non-mixed units
- Filter enums MUST include an ALL option
- Era values MUST be chronologically ordered in definition
- Enum comparisons MUST use strict equality (`===`)

---

## Enumeration Definitions

### TechBase Enumeration

**INNER_SPHERE**
- Display Value: "Inner Sphere"
- Description: Technology developed by Inner Sphere factions (Federated Suns, Lyran Commonwealth, Draconis Combine, Free Worlds League, Capellan Confederation, etc.)
- Typical Characteristics: Generally heavier, less efficient, more readily available
- Usage: Binary classification for all components

**CLAN**
- Display Value: "Clan"
- Description: Technology developed by Clan factions (Clan Wolf, Jade Falcon, Ghost Bear, etc.)
- Typical Characteristics: Generally lighter, more efficient, superior performance
- Usage: Binary classification for all components

### UnitTechBase Enumeration

**INNER_SPHERE**
- Display Value: "Inner Sphere"
- Description: Unit contains only Inner Sphere components
- Rules: All equipment must have `techBase: TechBase.INNER_SPHERE`
- Usage: Pure Inner Sphere units

**CLAN**
- Display Value: "Clan"
- Description: Unit contains only Clan components
- Rules: All equipment must have `techBase: TechBase.CLAN`
- Usage: Pure Clan units

**MIXED**
- Display Value: "Mixed"
- Description: Unit contains both Inner Sphere and Clan components
- Rules: May contain components with either tech base
- Restrictions: Subject to mixed tech availability rules and era restrictions
- Usage: Units with components from both tech bases

### TechBaseFilter Enumeration

**INNER_SPHERE**
- Display Value: "Inner Sphere"
- Filter Behavior: Shows only components with `techBase: TechBase.INNER_SPHERE`
- Usage: Filter to Inner Sphere components only

**CLAN**
- Display Value: "Clan"
- Filter Behavior: Shows only components with `techBase: TechBase.CLAN`
- Usage: Filter to Clan components only

**MIXED**
- Display Value: "Mixed"
- Filter Behavior: Shows components from both tech bases
- Usage: Show all available components for mixed tech units

**ALL**
- Display Value: "All"
- Filter Behavior: Shows all components regardless of tech base
- Usage: No tech base filtering applied

### RulesLevel Enumeration

**INTRODUCTORY**
- Display Value: "Introductory"
- Complexity: Lowest
- Tournament Legal: Yes
- Description: Basic components for new players
- Hierarchy Level: 1

**STANDARD**
- Display Value: "Standard"
- Complexity: Low-Medium
- Tournament Legal: Yes
- Description: Common components in standard play
- Hierarchy Level: 2

**ADVANCED**
- Display Value: "Advanced"
- Complexity: Medium-High
- Tournament Legal: Yes
- Description: Complex components with additional rules
- Hierarchy Level: 3

**EXPERIMENTAL**
- Display Value: "Experimental"
- Complexity: Highest
- Tournament Legal: No
- Description: Prototype/experimental technology
- Hierarchy Level: 4

### RulesLevelFilter Enumeration

**INTRODUCTORY**
- Display Value: "Introductory"
- Shows: INTRODUCTORY only
- Usage: Simplest gameplay

**STANDARD**
- Display Value: "Standard"
- Shows: INTRODUCTORY + STANDARD
- Usage: Normal gameplay

**ADVANCED**
- Display Value: "Advanced"
- Shows: INTRODUCTORY + STANDARD + ADVANCED
- Usage: Tournament legal components

**ALL**
- Display Value: "All"
- Shows: All rules levels including EXPERIMENTAL
- Usage: Campaign play with experimental technology

### Era Enumeration

**AGE_OF_WAR**
- Display Value: "Age of War"
- Year Range: 2005-2570
- Description: Early interstellar expansion and BattleMech development
- Technology: Primitive and early standard technology

**STAR_LEAGUE**
- Display Value: "Star League"
- Year Range: 2571-2780
- Description: Golden age of technology
- Technology: Peak advancement, advanced systems

**EARLY_SUCCESSION_WAR**
- Display Value: "Early Succession Wars"
- Year Range: 2781-2900
- Description: Star League collapse and technology regression
- Technology: Massive technology loss, extinction of advanced systems

**LATE_SUCCESSION_WAR**
- Display Value: "Late Succession Wars"
- Year Range: 2901-3049
- Description: Continued conflict with limited technology
- Technology: Basic technology only, classic 3025 era
- Note: Year 3025 is the iconic BattleTech setting

**CLAN_INVASION**
- Display Value: "Clan Invasion"
- Year Range: 3050-3061
- Description: Clan arrival and technology renaissance
- Technology: Clan technology introduction, rediscovered lostech

**CIVIL_WAR**
- Display Value: "Civil War"
- Year Range: 3062-3067
- Description: FedCom Civil War
- Technology: Advanced prototypes, experimental variants

**JIHAD**
- Display Value: "Jihad"
- Year Range: 3068-3085
- Description: Word of Blake Jihad
- Technology: Experimental weapons, advanced systems

**DARK_AGE**
- Display Value: "Dark Age"
- Year Range: 3086-3150+
- Description: HPG blackout and regional isolation
- Technology: Mixed availability, regional variants

---

## Validation Rules

### Validation: Enum Value Required
**Rule**: Properties using these enums must have valid enum values

**Severity**: Error

**Condition**:
```typescript
// For TechBase
if (!isValidTechBase(component.techBase)) {
  // invalid - emit error
}

// For RulesLevel
if (!isValidRulesLevel(component.rulesLevel)) {
  // invalid - emit error
}
```

**Error Message**: "Component must have a valid [enum type] value"

**User Action**: Assign a valid enum value from the appropriate enumeration

### Validation: Tech Base Consistency
**Rule**: Component tech base must be binary (not MIXED)

**Severity**: Error

**Condition**:
```typescript
if (component.techBase === 'Mixed') {
  // invalid - components cannot be mixed
}
```

**Error Message**: "Components must have binary tech base (Inner Sphere or Clan). Mixed applies only to units."

**User Action**: Assign either INNER_SPHERE or CLAN to components

### Validation: Unit Tech Base Consistency
**Rule**: Unit tech base must match component composition

**Severity**: Warning

**Condition**:
```typescript
const hasIS = unit.components.some(c => c.techBase === TechBase.INNER_SPHERE);
const hasClan = unit.components.some(c => c.techBase === TechBase.CLAN);

if (hasIS && hasClan && unit.techBase !== UnitTechBase.MIXED) {
  // invalid - should be MIXED
}

if (!hasIS && !hasClan) {
  // invalid - no components
}

if (hasIS && !hasClan && unit.techBase !== UnitTechBase.INNER_SPHERE) {
  // invalid - should be INNER_SPHERE
}

if (hasClan && !hasIS && unit.techBase !== UnitTechBase.CLAN) {
  // invalid - should be CLAN
}
```

**Error Message**: "Unit tech base does not match component composition"

**User Action**: Correct unit tech base to match components or adjust components

---

## Filter Matching Logic

### Tech Base Filter Logic

```typescript
/**
 * Determines if a component matches the tech base filter
 */
function matchesTechBaseFilter(
  component: { techBase: TechBase },
  filter: TechBaseFilter
): boolean {
  switch (filter) {
    case TechBaseFilter.INNER_SPHERE:
      return component.techBase === TechBase.INNER_SPHERE;

    case TechBaseFilter.CLAN:
      return component.techBase === TechBase.CLAN;

    case TechBaseFilter.MIXED:
    case TechBaseFilter.ALL:
      return true;

    default:
      return false;
  }
}
```

### Rules Level Filter Logic

```typescript
/**
 * Determines if a component matches the rules level filter
 */
function matchesRulesLevelFilter(
  component: { rulesLevel: RulesLevel },
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

### Combined Filter Logic

```typescript
/**
 * Determines if a component matches all filter criteria
 */
function matchesFilters(
  component: { techBase: TechBase; rulesLevel: RulesLevel },
  filters: {
    techBase?: TechBaseFilter;
    rulesLevel?: RulesLevelFilter;
  }
): boolean {
  const techBaseMatch = filters.techBase
    ? matchesTechBaseFilter(component, filters.techBase)
    : true;

  const rulesLevelMatch = filters.rulesLevel
    ? matchesRulesLevelFilter(component, filters.rulesLevel)
    : true;

  return techBaseMatch && rulesLevelMatch;
}
```

---

## Dependencies

### Defines
- **TechBase enum**: Binary technology classification (INNER_SPHERE, CLAN) - authoritative source
- **UnitTechBase enum**: Unit technology classification (INNER_SPHERE, CLAN, MIXED) - authoritative source
- **TechBaseFilter enum**: UI filtering for tech base (INNER_SPHERE, CLAN, MIXED, ALL) - authoritative source
- **RulesLevel enum**: Rules complexity levels (INTRODUCTORY, STANDARD, ADVANCED, EXPERIMENTAL) - authoritative source
- **RulesLevelFilter enum**: UI filtering for rules levels (INTRODUCTORY, STANDARD, ADVANCED, ALL) - authoritative source
- **Era enum**: Historical eras (AGE_OF_WAR through DARK_AGE) - authoritative source
- **Type guard functions**: isValidTechBase(), isValidUnitTechBase(), isValidTechBaseFilter(), isValidRulesLevel(), isValidRulesLevelFilter(), isValidEra()
- **Enum display values and constants**: Display strings for all enumerations

### Depends On
None - This is a foundation specification that other specs depend on.

### Used By
- **All Component Specifications**: Use TechBase and RulesLevel enums
- **All Unit Specifications**: Use UnitTechBase enum
- **Era & Temporal System**: Uses Era enum for technology availability
- **Rules Level System**: Extends RulesLevel enum definitions
- **Tech Base System**: Extends TechBase enum definitions
- **UI Filter Components**: Use filter enumerations (TechBaseFilter, RulesLevelFilter)
- **Validation Systems**: Use enums for validation rules

### Construction Sequence
1. Define core enumerations (this spec)
2. Define core interfaces using these enums (Core Entity Types spec)
3. Implement specific systems that extend enum usage (Tech Base System, Rules Level System, Era System)
4. Implement components and units using enums
5. Implement UI filters and validation using enums

---

## Implementation Notes

### Performance Considerations
- Enum comparisons are O(1) string comparisons
- Type guard functions should be inlined by TypeScript compiler
- Cache enum value arrays (`Object.values(Enum)`) if used frequently
- Filter functions are lightweight and suitable for real-time filtering

### Edge Cases
- **Unknown string values**: Always validate using type guards before assignment
- **Case sensitivity**: Enum values are case-sensitive; "inner sphere" ≠ "Inner Sphere"
- **Null/undefined**: Enums should never be null/undefined; use validation to ensure values exist
- **Legacy data**: When migrating data, use normalization functions to map old values to enums

### Common Pitfalls
- **Pitfall**: Using string literals instead of enum values
  - **Solution**: Always use enum constants (`TechBase.INNER_SPHERE` not `"Inner Sphere"`)
- **Pitfall**: Comparing enums with loose equality (`==`)
  - **Solution**: Always use strict equality (`===`)
- **Pitfall**: Allowing MIXED tech base on components
  - **Solution**: Enforce TechBase (binary) for components, UnitTechBase for units
- **Pitfall**: Forgetting to handle ALL filter option
  - **Solution**: ALL filter should always return true in filter functions
- **Pitfall**: Creating new enum values at runtime
  - **Solution**: Enums are fixed at compile time; extend enums requires code changes

---

## Examples

### Example 1: Component Definition with Enums
```typescript
interface IWeapon {
  readonly id: string;
  readonly name: string;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly era: Era;
  readonly introductionYear: number;
}

const mediumLaser: IWeapon = {
  id: 'weapon-medium-laser-is',
  name: 'Medium Laser',
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.INTRODUCTORY,
  era: Era.AGE_OF_WAR,
  introductionYear: 2443
};

const clanERMediumLaser: IWeapon = {
  id: 'weapon-er-medium-laser-clan',
  name: 'ER Medium Laser',
  techBase: TechBase.CLAN,
  rulesLevel: RulesLevel.STANDARD,
  era: Era.CLAN_INVASION,
  introductionYear: 2820  // Available to Clans, IS gets it in 3037
};
```

### Example 2: Unit with Tech Base Classification
```typescript
interface IUnit {
  readonly id: string;
  readonly name: string;
  readonly techBase: UnitTechBase;
  readonly components: ReadonlyArray<{ techBase: TechBase }>;
}

// Pure Inner Sphere unit
const shadowHawk: IUnit = {
  id: 'mech-shadow-hawk-2h',
  name: 'Shadow Hawk SHD-2H',
  techBase: UnitTechBase.INNER_SPHERE,
  components: [
    { techBase: TechBase.INNER_SPHERE },  // All IS components
    { techBase: TechBase.INNER_SPHERE }
  ]
};

// Mixed tech unit
const customMech: IUnit = {
  id: 'mech-custom-mixed',
  name: 'Custom Mixed Tech Mech',
  techBase: UnitTechBase.MIXED,
  components: [
    { techBase: TechBase.INNER_SPHERE },  // IS engine
    { techBase: TechBase.CLAN },          // Clan weapon
    { techBase: TechBase.INNER_SPHERE }   // IS armor
  ]
};
```

### Example 3: UI Filter Implementation
```typescript
interface ComponentFilter {
  techBase: TechBaseFilter;
  rulesLevel: RulesLevelFilter;
  era?: Era;
}

// User selects filters
const userFilters: ComponentFilter = {
  techBase: TechBaseFilter.CLAN,
  rulesLevel: RulesLevelFilter.STANDARD,
  era: Era.CLAN_INVASION
};

// Apply filters
const allComponents: IWeapon[] = loadComponentDatabase();
const filteredComponents = allComponents.filter(component =>
  matchesFilters(component, {
    techBase: userFilters.techBase,
    rulesLevel: userFilters.rulesLevel
  }) &&
  (userFilters.era ? component.era === userFilters.era : true)
);

// filteredComponents now contains only:
// - Clan components
// - Introductory or Standard rules level
// - From Clan Invasion era (if era filter specified)
```

### Example 4: Type Guard Validation
```typescript
function validateComponentData(data: unknown): IWeapon | null {
  // Type guard checks
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  const obj = data as any;

  if (!isValidTechBase(obj.techBase)) {
    console.error(`Invalid tech base: ${obj.techBase}`);
    return null;
  }

  if (!isValidRulesLevel(obj.rulesLevel)) {
    console.error(`Invalid rules level: ${obj.rulesLevel}`);
    return null;
  }

  if (!isValidEra(obj.era)) {
    console.error(`Invalid era: ${obj.era}`);
    return null;
  }

  // Data is valid
  return obj as IWeapon;
}

// Usage
const rawData = loadFromDatabase();
const weapon = validateComponentData(rawData);
if (weapon) {
  // weapon is type-safe IWeapon
  console.log(`Loaded ${weapon.name} (${weapon.techBase})`);
}
```

### Example 5: Filter UI Component
```typescript
interface FilterDropdownProps {
  onFilterChange: (filter: TechBaseFilter) => void;
}

function TechBaseFilterDropdown({ onFilterChange }: FilterDropdownProps) {
  const options = [
    { value: TechBaseFilter.ALL, label: 'All Technologies' },
    { value: TechBaseFilter.INNER_SPHERE, label: 'Inner Sphere Only' },
    { value: TechBaseFilter.CLAN, label: 'Clan Only' },
    { value: TechBaseFilter.MIXED, label: 'Mixed Tech' }
  ];

  return (
    <select onChange={e => onFilterChange(e.target.value as TechBaseFilter)}>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
```

### Example 6: Rules Level Hierarchy Check
```typescript
/**
 * Determines if a component is allowed at a given rules level
 */
function isAllowedAtRulesLevel(
  component: { rulesLevel: RulesLevel },
  maxLevel: RulesLevel
): boolean {
  const hierarchy = {
    [RulesLevel.INTRODUCTORY]: 1,
    [RulesLevel.STANDARD]: 2,
    [RulesLevel.ADVANCED]: 3,
    [RulesLevel.EXPERIMENTAL]: 4
  };

  return hierarchy[component.rulesLevel] <= hierarchy[maxLevel];
}

// Usage
const experimentalWeapon = {
  name: 'Plasma Rifle',
  rulesLevel: RulesLevel.EXPERIMENTAL
};

console.log(
  isAllowedAtRulesLevel(experimentalWeapon, RulesLevel.ADVANCED)
); // false - experimental not allowed in advanced

console.log(
  isAllowedAtRulesLevel(experimentalWeapon, RulesLevel.EXPERIMENTAL)
); // true - experimental allowed when max is experimental
```

### Example 7: Era-Based Technology Availability
```typescript
function getTechnologyEra(introductionYear: number): Era {
  if (introductionYear >= 2005 && introductionYear <= 2570)
    return Era.AGE_OF_WAR;
  if (introductionYear >= 2571 && introductionYear <= 2780)
    return Era.STAR_LEAGUE;
  if (introductionYear >= 2781 && introductionYear <= 2900)
    return Era.EARLY_SUCCESSION_WAR;
  if (introductionYear >= 2901 && introductionYear <= 3049)
    return Era.LATE_SUCCESSION_WAR;
  if (introductionYear >= 3050 && introductionYear <= 3061)
    return Era.CLAN_INVASION;
  if (introductionYear >= 3062 && introductionYear <= 3067)
    return Era.CIVIL_WAR;
  if (introductionYear >= 3068 && introductionYear <= 3085)
    return Era.JIHAD;
  if (introductionYear >= 3086)
    return Era.DARK_AGE;

  // Default fallback
  return Era.LATE_SUCCESSION_WAR;
}

// Usage
const gaussRifle = {
  name: 'Gauss Rifle',
  introductionYear: 2590
};

const era = getTechnologyEra(gaussRifle.introductionYear);
console.log(`${gaussRifle.name} was introduced in the ${era}`);
// Output: "Gauss Rifle was introduced in the Star League"
```

---

## References

### Official BattleTech Rules
- **TechManual**: Pages 6-10 - Technology base and rules level definitions
- **Total Warfare**: Pages 6-7 - Rules levels overview
- **Era Digest**: Complete era definitions and technology availability
- **Interstellar Operations**: Pages 20-30 - Historical timelines

### Related Documentation
- `openspec/specs/phase-1-foundation/core-entity-types/spec.md` - Interfaces using these enums
- `openspec/specs/phase-1-foundation/tech-base-system/spec.md` - Extended tech base logic
- `openspec/specs/phase-1-foundation/rules-level-system/spec.md` - Extended rules level logic
- `openspec/specs/phase-1-foundation/era-temporal-system/spec.md` - Extended era logic

### Code References
- Primary Definition: `src/types/TechBase.ts`
- Legacy Compatibility: `src/types/core/BaseTypes.ts`
- Type Guards: `src/types/core/BaseTypes.ts`
- Utilities: `src/utils/TechBaseUtils.ts`

---

## Changelog

### Version 1.0 (2025-11-28)
- Initial specification
- Defined TechBase enum (INNER_SPHERE, CLAN)
- Defined UnitTechBase enum (INNER_SPHERE, CLAN, MIXED)
- Defined TechBaseFilter enum (INNER_SPHERE, CLAN, MIXED, ALL)
- Defined RulesLevel enum (INTRODUCTORY, STANDARD, ADVANCED, EXPERIMENTAL)
- Defined RulesLevelFilter enum (INTRODUCTORY, STANDARD, ADVANCED, ALL)
- Defined Era enum (8 canonical eras from Age of War through Dark Age)
- Established type guard functions for all enumerations
- Defined filter matching logic
- Provided comprehensive examples for all enum usage patterns
- Documented that ADVANCED (not TOURNAMENT) is the correct rules level

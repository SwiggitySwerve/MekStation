# Tech Base Integration System Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-27
**Dependencies**: Tech Base System (Phase 1)
**Affects**: Construction Rules, Validation System, Component Database, Equipment Filtering, UI Component Selection

---

## Overview

### Purpose
The Tech Base Integration System defines how a unit's declared tech base affects component availability, construction constraints, and validation rules. It enforces the fundamental BattleTech rule that structural components are constrained by unit tech base declaration, while equipment availability is determined solely by year/era.

### Scope
**In Scope:**
- Unit tech base declaration (Inner Sphere, Clan, Mixed)
- Structural component locking rules based on unit tech base
- Mixed Tech toggle mechanics for structural component categories
- Tech base compatibility validation
- Component availability matrices
- Tech Rating calculation with Mixed Tech effects
- Tournament legality assessment
- Component substitution rules during tech base changes

**Out of Scope:**
- Individual component specifications (covered in separate specs)
- Equipment database structure (covered in Equipment System spec)
- Year/era progression mechanics (covered in Tech Progression spec)
- Battle Value calculations (covered in BV Calculation spec)
- Critical slot allocation (covered in Critical Slots spec)

### Key Concepts
- **Unit Tech Base Declaration**: User-selected tech base that determines structural component constraints (Inner Sphere, Clan, or Mixed)
- **Structural Components**: Core systems whose tech base is constrained by unit declaration (Structure, Engine, Gyro, Heat Sinks, Armor, Myomer, Actuators)
- **Equipment**: Weapons, electronics, and optional systems whose availability is year-based only, not affected by unit tech base
- **Mixed Tech Unit**: Unit declared as "Mixed" that can independently select IS or Clan for each structural component category
- **Tech Base Locking**: Automatic constraint where IS units can only use IS structural components, Clan units only Clan structural
- **Tech Rating**: Availability rating (A-X) that increases when mixing IS and Clan components
- **Tournament Legality**: Units with Mixed Tech or certain advanced components may be restricted in tournament play

---

## Requirements

### Requirement: Unit Tech Base Declaration
The system SHALL allow users to declare a unit's tech base as one of three options: Inner Sphere, Clan, or Mixed.

The tech base declaration determines structural component constraints and affects tech rating calculation.

**Rationale**: This is the fundamental choice that drives all component availability and validation rules in BattleTech construction.

**Priority**: Critical

#### Scenario: Declaring Inner Sphere tech base
**GIVEN** a user is creating a new unit
**WHEN** they select "Inner Sphere" as the tech base
**THEN** the unit's techBase property SHALL be set to TechBase.INNER_SPHERE
**AND** all structural component categories SHALL be locked to Inner Sphere options only
**AND** equipment filtering SHALL be based on year/era only (not tech base)

#### Scenario: Declaring Clan tech base
**GIVEN** a user is creating a new unit
**WHEN** they select "Clan" as the tech base
**THEN** the unit's techBase property SHALL be set to TechBase.CLAN
**AND** all structural component categories SHALL be locked to Clan options only
**AND** equipment filtering SHALL be based on year/era only (not tech base)

#### Scenario: Declaring Mixed tech base
**GIVEN** a user is creating a new unit
**WHEN** they select "Mixed" as the tech base
**THEN** the unit's techBase property SHALL be set to TechBaseFilter.MIXED
**AND** each structural component category SHALL be independently toggleable between IS and Clan
**AND** the unit's tech rating SHALL be calculated with Mixed Tech penalties
**AND** tournament legality SHALL be marked as potentially restricted

#### Scenario: Changing tech base on existing unit
**GIVEN** a unit with existing structural components
**WHEN** the user changes the tech base declaration
**THEN** all structural components SHALL be validated against the new tech base
**AND** incompatible components SHALL be substituted with compatible equivalents
**AND** if no equivalent exists, components SHALL be set to the default for that category
**AND** equipment SHALL remain unchanged (year-based only)

---

### Requirement: Structural Component Categories
The system SHALL define and enforce eight structural component categories that are constrained by unit tech base declaration.

**Rationale**: These are the core systems that define a unit's construction and are intrinsically tied to the manufacturing tech base.

**Priority**: Critical

#### Scenario: Identifying structural components
**GIVEN** a component in the unit configuration
**WHEN** determining if it is a structural component
**THEN** the system SHALL classify it as structural if it belongs to one of these categories:
- Internal Structure (chassis)
- Engine
- Gyro
- Heat Sinks (base system)
- Armor
- Myomer/Enhancements (MASC, TSM)
- Actuators (shoulders, hips, upper/lower arms/legs)
- Movement Systems (jump jets)

#### Scenario: Non-structural components
**GIVEN** a component that is a weapon, ammunition, electronics, or optional equipment
**WHEN** determining availability constraints
**THEN** the system SHALL NOT apply unit tech base restrictions
**AND** availability SHALL be determined by year/era only
**AND** the component MAY be used on any unit regardless of tech base declaration

---

### Requirement: Tech Base Locking Rules
The system SHALL enforce tech base locking rules where structural components are restricted based on unit tech base declaration.

**Rationale**: BattleTech construction rules mandate that pure IS or Clan units cannot mix structural component tech bases.

**Priority**: Critical

#### Scenario: Inner Sphere unit structural lock
**GIVEN** a unit with techBase = TechBase.INNER_SPHERE
**WHEN** selecting any structural component
**THEN** only Inner Sphere variants SHALL be available
**AND** Clan structural components SHALL be filtered out
**AND** attempting to manually set a Clan structural component SHALL trigger a validation error

#### Scenario: Clan unit structural lock
**GIVEN** a unit with techBase = TechBase.CLAN
**WHEN** selecting any structural component
**THEN** only Clan variants SHALL be available
**AND** Inner Sphere structural components SHALL be filtered out
**AND** attempting to manually set an IS structural component SHALL trigger a validation error

#### Scenario: Available component filtering
**GIVEN** a structural component category (e.g., "Engine")
**AND** a unit tech base declaration (e.g., "Inner Sphere")
**WHEN** requesting available component options
**THEN** the system SHALL return only components matching the tech base
**EXAMPLE**: For IS unit, engine options: ["Standard", "XL", "Light", "Compact"]
**EXAMPLE**: For Clan unit, engine options: ["Standard", "XL (Clan)", "Light (Clan)"]

---

### Requirement: Mixed Tech Toggle Mechanics
The system SHALL allow Mixed Tech units to independently toggle each structural component category between Inner Sphere and Clan.

**Rationale**: Mixed Tech provides flexibility to optimize designs by selecting the best tech base for each structural category independently.

**Priority**: High

#### Scenario: Independent category toggles
**GIVEN** a unit with techBase = TechBaseFilter.MIXED
**WHEN** the user accesses structural component selections
**THEN** each of the eight structural categories SHALL have an independent tech base selector
**AND** each category MAY be set to either TechBase.INNER_SPHERE or TechBase.CLAN
**AND** changing one category's tech base SHALL NOT affect other categories

#### Scenario: Valid Mixed Tech configuration
**GIVEN** a Mixed Tech unit
**WHEN** the user configures:
- Internal Structure: Endo Steel (IS)
- Engine: XL (Clan)
- Gyro: Standard (IS)
- Heat Sinks: Double (Clan)
- Armor: Ferro-Fibrous (IS)
- Myomer: MASC (IS)
- Actuators: Standard (IS)
- Jump Jets: Standard (Clan)
**THEN** this configuration SHALL be valid
**AND** the tech rating SHALL reflect the mixing of IS and Clan components

#### Scenario: Category toggle updates available options
**GIVEN** a Mixed Tech unit with Structure set to "Inner Sphere"
**WHEN** the user toggles Structure category to "Clan"
**THEN** available structure options SHALL change from IS variants to Clan variants
**AND** the current selection SHALL be replaced with the Clan equivalent or default
**AND** critical slot allocations SHALL be recalculated for the new component

#### Scenario: Tech base memory per category
**GIVEN** a Mixed Tech unit
**WHEN** the user toggles a structural category from IS to Clan
**AND** selects a specific Clan component (e.g., "XL (Clan)")
**AND** later toggles back to IS
**THEN** the system SHALL restore the previous IS component selection for that category
**AND** the Clan selection SHALL be remembered in case of future toggle back to Clan

---

### Requirement: Component Availability Matrices
The system SHALL maintain availability matrices defining which specific components are available for each tech base and structural category.

**Rationale**: Different tech bases have access to different component variants, and some components are exclusive to one tech base.

**Priority**: Critical

#### Scenario: Structure availability by tech base
**GIVEN** the structural component category "Internal Structure"
**WHEN** querying available components by tech base
**THEN** the system SHALL return:
- Inner Sphere: ["Standard", "Endo Steel", "Composite", "Reinforced"]
- Clan: ["Standard", "Endo Steel (Clan)"]

#### Scenario: Engine availability by tech base
**GIVEN** the structural component category "Engine"
**WHEN** querying available components by tech base
**THEN** the system SHALL return:
- Inner Sphere: ["Standard", "XL", "Light", "Compact", "ICE", "Fuel Cell"]
- Clan: ["Standard", "XL (Clan)", "Light (Clan)"]

#### Scenario: Gyro availability by tech base
**GIVEN** the structural component category "Gyro"
**WHEN** querying available components by tech base
**THEN** the system SHALL return:
- Inner Sphere: ["Standard", "XL", "Compact", "Heavy-Duty"]
- Clan: ["Standard"]
**NOTE**: Clan cannot use advanced gyro types

#### Scenario: Heat Sink availability by tech base
**GIVEN** the structural component category "Heat Sinks"
**WHEN** querying available components by tech base
**THEN** the system SHALL return:
- Inner Sphere: ["Single", "Double"]
- Clan: ["Double (Clan)"]
**NOTE**: Clan does not use single heat sinks

#### Scenario: Armor availability by tech base
**GIVEN** the structural component category "Armor"
**WHEN** querying available components by tech base
**THEN** the system SHALL return:
- Inner Sphere: ["Standard", "Ferro-Fibrous", "Light Ferro", "Heavy Ferro", "Stealth"]
- Clan: ["Standard", "Ferro-Fibrous (Clan)", "Stealth (Clan)"]

#### Scenario: Myomer/Enhancement availability by tech base
**GIVEN** the structural component category "Myomer"
**WHEN** querying available components by tech base
**THEN** the system SHALL return:
- Inner Sphere: ["None", "Triple Strength Myomer", "MASC"]
- Clan: ["None", "MASC"]
**NOTE**: Clan cannot use Triple Strength Myomer

#### Scenario: Jump Jet availability by tech base
**GIVEN** the structural component category "Jump Jets"
**WHEN** querying available components by tech base
**THEN** the system SHALL return:
- Inner Sphere: ["Standard Jump Jets", "Improved Jump Jets"]
- Clan: ["Jump Jets (Clan)", "Improved Jump Jets (Clan)"]

---

### Requirement: Equipment Year-Based Availability
The system SHALL enforce that equipment (weapons, electronics, optional systems) is available based solely on year/era, NOT on unit tech base.

**Rationale**: Equipment can be salvaged, captured, or traded between factions, so availability is determined by when the technology was invented, not the unit's declared tech base.

**Priority**: Critical

#### Scenario: Equipment available to all tech bases
**GIVEN** a weapon "ER Large Laser (Clan)" introduced in 2824
**AND** the current construction year is 3050
**WHEN** equipping this on an Inner Sphere unit
**THEN** the equipment SHALL be available
**AND** no tech base restriction error SHALL be raised
**AND** the unit MAY use Clan weapons regardless of being declared IS
**AND** this SHALL affect the unit's tech rating and tournament legality

#### Scenario: Equipment filtered by year only
**GIVEN** a unit with construction year 3025
**AND** unit tech base "Inner Sphere"
**WHEN** filtering available equipment
**THEN** equipment SHALL be filtered by introduction year ≤ 3025
**AND** equipment SHALL NOT be filtered by tech base
**AND** both IS and Clan equipment (if invented by 3025) SHALL be available

#### Scenario: Mixed equipment on pure tech base unit
**GIVEN** an Inner Sphere unit (techBase = TechBase.INNER_SPHERE)
**WHEN** the unit equips both IS and Clan weapons
**THEN** this SHALL be allowed
**AND** the unit's tech rating SHALL increase due to mixing
**AND** the unit MAY be flagged for tournament restrictions
**BUT** structural components SHALL remain locked to Inner Sphere only

---

### Requirement: Tech Rating Calculation with Mixed Tech
The system SHALL calculate tech ratings that reflect the complexity and rarity of mixing Inner Sphere and Clan technologies.

**Rationale**: Mixed Tech units are more complex to maintain and operate, which is reflected in higher tech ratings and reduced availability.

**Priority**: High

#### Scenario: Pure Inner Sphere tech rating
**GIVEN** a unit with techBase = TechBase.INNER_SPHERE
**AND** all structural components are Inner Sphere
**AND** all equipment is Inner Sphere
**WHEN** calculating the tech rating
**THEN** the base tech rating SHALL be calculated without Mixed Tech penalty
**AND** the rating SHALL be determined by the rarest component (e.g., 'D' for Endo Steel)

#### Scenario: Pure Clan tech rating
**GIVEN** a unit with techBase = TechBase.CLAN
**AND** all structural components are Clan
**AND** all equipment is Clan
**WHEN** calculating the tech rating
**THEN** the base tech rating SHALL be calculated without Mixed Tech penalty
**AND** the rating SHALL be determined by the rarest component

#### Scenario: Mixed Tech structural components
**GIVEN** a unit with techBase = TechBaseFilter.MIXED
**AND** structural components include both IS and Clan:
- Structure: Endo Steel (IS) - rating 'D'
- Engine: XL (Clan) - rating 'E'
- Gyro: Standard (IS) - rating 'D'
**WHEN** calculating the tech rating
**THEN** the overall rating SHALL be the worst individual rating ('E')
**AND** a Mixed Tech penalty SHALL be applied (rating may increase)
**AND** the battle value modifier SHALL be 1.25x

#### Scenario: Equipment mixing affects rating
**GIVEN** an Inner Sphere unit (pure IS structural)
**AND** the unit equips Clan weapons (e.g., "Clan ER PPC")
**WHEN** calculating the tech rating
**THEN** the mixing of IS structural + Clan equipment SHALL increase the tech rating
**AND** the unit SHALL be treated as Mixed Tech for rating purposes
**AND** tournament legality MAY be affected

#### Scenario: Tech rating by era
**GIVEN** a unit with Mixed Tech components
**AND** introduction year 3050
**WHEN** calculating tech rating for different eras
**THEN** the system SHALL return ratings for all four eras:
- 2100-2800: 'X' (unavailable before Clan emergence)
- 2801-3050: 'E' (extremely rare during this period)
- 3051-3082: 'D' (rare during Clan Invasion)
- 3083-Now: 'D' (rare in modern era)

---

### Requirement: Component Substitution Rules
The system SHALL automatically substitute components when tech base changes, selecting equivalent or default components as needed.

**Rationale**: When changing tech base, existing components may become invalid and need automatic replacement to maintain a valid configuration.

**Priority**: High

#### Scenario: Substituting IS to Clan equivalent
**GIVEN** an Inner Sphere unit with:
- Engine: XL
- Structure: Endo Steel
- Armor: Ferro-Fibrous
**WHEN** the user changes tech base to Clan
**THEN** components SHALL be substituted:
- Engine: XL → XL (Clan)
- Structure: Endo Steel → Endo Steel (Clan)
- Armor: Ferro-Fibrous → Ferro-Fibrous (Clan)

#### Scenario: Substituting with no equivalent
**GIVEN** an Inner Sphere unit with:
- Gyro: XL
- Myomer: Triple Strength Myomer
**WHEN** the user changes tech base to Clan
**THEN** components SHALL be substituted with defaults:
- Gyro: XL → Standard (Clan has no XL gyro)
- Myomer: Triple Strength Myomer → None (Clan has no TSM)
**AND** the user SHALL be notified of these changes

#### Scenario: Preserving equipment during tech base change
**GIVEN** an Inner Sphere unit with weapons and equipment
**WHEN** the user changes tech base to Clan
**THEN** all equipment SHALL remain unchanged
**AND** only structural components SHALL be affected by the substitution

#### Scenario: Mixed Tech category changes
**GIVEN** a Mixed Tech unit with Engine set to "Inner Sphere"
**AND** current engine selection is "Light"
**WHEN** the user toggles Engine category to "Clan"
**THEN** the engine SHALL be substituted to "Light (Clan)"
**AND** if Light (Clan) is not available, substitute to "Standard"

---

### Requirement: Tech Base Compatibility Validation
The system SHALL validate that structural components match their declared tech base and report violations.

**Rationale**: Invalid tech base combinations must be detected and reported to prevent illegal unit configurations.

**Priority**: Critical

#### Scenario: Valid IS unit validation
**GIVEN** a unit with techBase = TechBase.INNER_SPHERE
**AND** all structural components are Inner Sphere variants
**WHEN** running tech base validation
**THEN** validation SHALL pass with no errors
**AND** complianceScore SHALL be 100

#### Scenario: Invalid IS unit validation
**GIVEN** a unit with techBase = TechBase.INNER_SPHERE
**AND** Engine is set to "XL (Clan)"
**WHEN** running tech base validation
**THEN** validation SHALL fail
**AND** a conflict SHALL be reported:
- component: "XL (Clan) Engine"
- unitTechBase: "Inner Sphere"
- componentTechBase: "Clan"
- conflictType: "requires_mixed"
- resolution: "Replace with Inner Sphere equivalent or enable mixed tech"
- severity: "major"

#### Scenario: Valid Mixed Tech validation
**GIVEN** a unit with techBase = TechBaseFilter.MIXED
**AND** structural components include both IS and Clan
**WHEN** running tech base validation
**THEN** validation SHALL pass
**AND** the unit SHALL be flagged as "isMixed: true"

#### Scenario: Equipment does not trigger tech base violations
**GIVEN** an Inner Sphere unit (pure IS structural)
**AND** the unit equips Clan weapons
**WHEN** running tech base validation for structural components
**THEN** no violation SHALL be reported for equipment
**AND** structural validation SHALL pass
**NOTE**: Equipment mixing affects tech rating and legality, not structural validation

---

### Requirement: Tournament Legality Assessment
The system SHALL assess and report tournament legality based on tech base mixing and component selections.

**Rationale**: Many BattleTech tournaments restrict Mixed Tech units or certain advanced technologies.

**Priority**: Medium

#### Scenario: Standard tournament legal unit
**GIVEN** a unit with techBase = TechBase.INNER_SPHERE
**AND** all components are Standard rules level
**AND** no Clan equipment
**WHEN** assessing tournament legality
**THEN** the unit SHALL be marked as "Tournament Legal: Standard"

#### Scenario: Mixed Tech tournament restriction
**GIVEN** a unit with techBase = TechBaseFilter.MIXED
**WHEN** assessing tournament legality
**THEN** the unit SHALL be marked as "Tournament Legal: Advanced/Experimental"
**AND** a note SHALL indicate "Mixed Tech may be restricted in some tournaments"

#### Scenario: Clan equipment on IS unit
**GIVEN** an Inner Sphere unit with Clan weapons
**WHEN** assessing tournament legality
**THEN** the unit SHALL be flagged as potentially restricted
**AND** the reason SHALL be "Uses technology from multiple tech bases"

---

### Requirement: Tech Base Memory System
The system SHALL remember component selections for each structural category when toggling between tech bases in Mixed Tech units.

**Rationale**: Users should be able to experiment with different tech base combinations without losing their selections when toggling back and forth.

**Priority**: Medium

#### Scenario: Remembering IS selections
**GIVEN** a Mixed Tech unit with Engine category set to "Inner Sphere"
**AND** user selects "Light" engine
**WHEN** user toggles Engine to "Clan" and selects "XL (Clan)"
**AND** later toggles back to "Inner Sphere"
**THEN** the engine SHALL be restored to "Light" (the previous IS selection)

#### Scenario: Memory across all categories
**GIVEN** a Mixed Tech unit
**WHEN** the user configures each category with specific IS and Clan selections
**THEN** the system SHALL maintain two memory states per category:
- TechBaseMemory.engine[INNER_SPHERE] = "Light"
- TechBaseMemory.engine[CLAN] = "XL (Clan)"
**AND** toggling the category SHALL swap between these remembered selections

---

## Data Model Requirements

### Required Interfaces

The implementation MUST provide the following TypeScript interfaces:

```typescript
/**
 * Unit tech base declaration and structural component constraints
 */
interface IUnitTechBaseConfiguration {
  /**
   * Declared tech base for the unit
   * Determines structural component constraints
   */
  readonly techBase: TechBase | TechBaseFilter;

  /**
   * Tech base selection for each structural category (Mixed Tech only)
   * For pure IS or Clan units, all categories locked to unit tech base
   * @example { engine: TechBase.CLAN, structure: TechBase.INNER_SPHERE }
   */
  readonly structuralTechBases?: Readonly<Record<StructuralComponentCategory, TechBase>>;

  /**
   * Whether this is a Mixed Tech unit
   */
  readonly isMixedTech: boolean;

  /**
   * Construction year for equipment availability
   */
  readonly constructionYear: number;

  /**
   * Tournament legality status
   */
  readonly tournamentLegality: TournamentLegalityStatus;
}

/**
 * Structural component categories constrained by tech base
 */
enum StructuralComponentCategory {
  STRUCTURE = 'structure',
  ENGINE = 'engine',
  GYRO = 'gyro',
  HEAT_SINKS = 'heatSinks',
  ARMOR = 'armor',
  MYOMER = 'myomer',
  ACTUATORS = 'actuators',
  MOVEMENT = 'movement',
}

/**
 * Tech base constraints for component availability
 */
interface ITechBaseConstraints {
  /**
   * Unit's declared tech base
   */
  readonly unitTechBase: TechBase | TechBaseFilter;

  /**
   * Whether structural components are locked (true for pure IS/Clan)
   */
  readonly structuralLocked: boolean;

  /**
   * Available structural components by category
   */
  readonly availableStructural: Readonly<Record<StructuralComponentCategory, readonly string[]>>;

  /**
   * Whether equipment is constrained by tech base (always false)
   */
  readonly equipmentConstrained: false;

  /**
   * Allowed structural component tech bases per category
   */
  readonly allowedTechBases: Readonly<Record<StructuralComponentCategory, readonly TechBase[]>>;
}

/**
 * Component availability matrix
 */
interface IComponentAvailability {
  /**
   * Component category
   */
  readonly category: StructuralComponentCategory;

  /**
   * Available components by tech base
   */
  readonly byTechBase: Readonly<Record<TechBase, readonly IComponentOption[]>>;
}

/**
 * Individual component option
 */
interface IComponentOption {
  /**
   * Component name (e.g., "XL", "Endo Steel")
   */
  readonly name: string;

  /**
   * Tech base this component belongs to
   */
  readonly techBase: TechBase;

  /**
   * Introduction year for availability
   */
  readonly introductionYear: number;

  /**
   * Rules level (Introductory, Standard, Advanced, Experimental)
   */
  readonly rulesLevel: RulesLevel;

  /**
   * Critical slots required (if applicable)
   */
  readonly criticalSlots?: number;

  /**
   * Weight multiplier or fixed weight
   */
  readonly weight?: number | ((tonnage: number) => number);
}

/**
 * Tech base validation result
 */
interface ITechBaseValidationResult {
  /**
   * Whether all structural components match constraints
   */
  readonly isValid: boolean;

  /**
   * List of tech base conflicts
   */
  readonly conflicts: readonly ITechBaseConflict[];

  /**
   * Compliance score (0-100)
   */
  readonly complianceScore: number;

  /**
   * Suggested resolutions for conflicts
   */
  readonly resolutions: readonly string[];
}

/**
 * Tech base conflict details
 */
interface ITechBaseConflict {
  /**
   * Component with conflict
   */
  readonly component: string;

  /**
   * Component's category
   */
  readonly category: StructuralComponentCategory;

  /**
   * Unit's declared tech base
   */
  readonly unitTechBase: TechBase | TechBaseFilter;

  /**
   * Component's actual tech base
   */
  readonly componentTechBase: TechBase;

  /**
   * Type of conflict
   */
  readonly conflictType: 'incompatible' | 'restricted' | 'requires_mixed';

  /**
   * Suggested resolution
   */
  readonly resolution: string;

  /**
   * Severity level
   */
  readonly severity: 'critical' | 'major' | 'minor';
}

/**
 * Tournament legality status
 */
interface ITournamentLegalityStatus {
  /**
   * Overall legality level
   */
  readonly level: 'Standard' | 'Advanced' | 'Experimental' | 'Restricted';

  /**
   * Whether unit can be used in standard tournaments
   */
  readonly standardTournamentLegal: boolean;

  /**
   * Reasons for restrictions
   */
  readonly restrictions: readonly string[];

  /**
   * Notes about legality
   */
  readonly notes: string;
}

/**
 * Tech rating calculation with Mixed Tech effects
 */
interface ITechRatingCalculation {
  /**
   * Overall tech rating (worst component)
   */
  readonly overallRating: TechRating;

  /**
   * Ratings by era
   */
  readonly byEra: Readonly<Record<TechEra, TechRating>>;

  /**
   * Whether Mixed Tech penalty was applied
   */
  readonly mixedTechPenalty: boolean;

  /**
   * Battle value modifier for mixing
   */
  readonly battleValueModifier: number;

  /**
   * Component ratings breakdown
   */
  readonly componentRatings: readonly {
    readonly category: StructuralComponentCategory | 'equipment';
    readonly component: string;
    readonly techBase: TechBase;
    readonly rating: TechRating;
  }[];
}

/**
 * Tech base memory for Mixed Tech units
 */
interface ITechBaseMemory {
  /**
   * Remembered selections for each category by tech base
   */
  readonly memory: Readonly<Record<StructuralComponentCategory, Readonly<Record<TechBase, string>>>>;

  /**
   * Last updated timestamp
   */
  readonly lastUpdated: number;

  /**
   * Version for migration
   */
  readonly version: string;
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `techBase` | `TechBase \| TechBaseFilter` | Yes | Unit's declared tech base | INNER_SPHERE, CLAN, MIXED | INNER_SPHERE |
| `isMixedTech` | `boolean` | Yes | Whether unit is Mixed Tech | true, false | false |
| `structuralTechBases` | `Record<Category, TechBase>` | No | Tech base per category (Mixed only) | Per-category selections | undefined |
| `constructionYear` | `number` | Yes | Year for equipment availability | 2000-3200 | 3025 |
| `tournamentLegality` | `ITournamentLegalityStatus` | Yes | Tournament legality status | Object with level and restrictions | Standard level |
| `structuralLocked` | `boolean` | Yes | Whether structural locked to one tech base | true for pure IS/Clan, false for Mixed | true |

### Type Constraints

- `techBase` MUST be one of TechBase.INNER_SPHERE, TechBase.CLAN, or TechBaseFilter.MIXED
- `structuralTechBases` MUST only contain TechBase values (not TechBaseFilter.MIXED)
- When `techBase` is INNER_SPHERE or CLAN, `structuralLocked` MUST be true
- When `techBase` is MIXED, `structuralLocked` MUST be false
- When `techBase` is MIXED, `structuralTechBases` MUST be defined with selections for all eight categories
- `constructionYear` MUST be a valid BattleTech year (typically 2000-3200)
- Equipment availability MUST NOT be constrained by `techBase`, only by `constructionYear`

---

## Validation Rules

### Validation: Structural Component Tech Base Match

**Rule**: All structural components must match their declared or selected tech base

**Severity**: Error

**Condition**:
```typescript
// For pure Inner Sphere units
if (unit.techBase === TechBase.INNER_SPHERE) {
  for (const category of StructuralComponentCategory.values) {
    if (component[category].techBase !== TechBase.INNER_SPHERE) {
      // ERROR: Structural component tech base mismatch
    }
  }
}

// For pure Clan units
if (unit.techBase === TechBase.CLAN) {
  for (const category of StructuralComponentCategory.values) {
    if (component[category].techBase !== TechBase.CLAN) {
      // ERROR: Structural component tech base mismatch
    }
  }
}

// For Mixed Tech units
if (unit.techBase === TechBaseFilter.MIXED) {
  for (const category of StructuralComponentCategory.values) {
    const declaredTechBase = unit.structuralTechBases[category];
    if (component[category].techBase !== declaredTechBase) {
      // ERROR: Component doesn't match selected category tech base
    }
  }
}
```

**Error Message**: "Structural component '{component}' has tech base '{componentTechBase}' but unit requires '{requiredTechBase}' for {category} category"

**User Action**: Replace component with compatible variant or change tech base declaration

### Validation: Equipment Tech Base Independence

**Rule**: Equipment must NOT be validated against unit tech base, only against year/era

**Severity**: Info (not an error)

**Condition**:
```typescript
// Equipment validation
for (const equipment of unit.equipment) {
  // Check year availability
  if (equipment.introductionYear > unit.constructionYear) {
    // ERROR: Equipment not yet invented
  }

  // DO NOT check tech base compatibility for equipment
  // Equipment can be used regardless of unit tech base
}
```

**Error Message**: N/A (no error for tech base, only for year)

**User Action**: N/A

### Validation: Mixed Tech Declaration Consistency

**Rule**: Mixed Tech units must have structuralTechBases defined for all categories

**Severity**: Error

**Condition**:
```typescript
if (unit.techBase === TechBaseFilter.MIXED) {
  const requiredCategories = Object.values(StructuralComponentCategory);
  for (const category of requiredCategories) {
    if (!unit.structuralTechBases[category]) {
      // ERROR: Missing tech base selection for category
    }
    if (unit.structuralTechBases[category] === TechBaseFilter.MIXED) {
      // ERROR: Category selections must be concrete (IS or Clan), not Mixed
    }
  }
}
```

**Error Message**: "Mixed Tech unit missing tech base selection for {category} category"

**User Action**: Select Inner Sphere or Clan for each structural category

### Validation: Component Availability

**Rule**: Selected components must be available for their declared tech base

**Severity**: Error

**Condition**:
```typescript
function validateComponentAvailability(
  component: string,
  category: StructuralComponentCategory,
  techBase: TechBase
): boolean {
  const availableComponents = getAvailableComponents(category, techBase);
  return availableComponents.includes(component);
}
```

**Error Message**: "Component '{component}' is not available for {techBase} in {category} category"

**User Action**: Select a different component from available options

---

## Technology Base Variants

This specification IS the authoritative source for tech base integration and mixed tech rules.

See [Tech Base Variants Reference](../tech-base-variants-reference/spec.md) for detailed philosophy, patterns, and cross-component tech base differences.

### Integration-Specific Guidance

**This Spec Covers**:
- Validation rules for tech base compatibility
- Mixed tech unit construction rules
- Tech rating calculations incorporating tech base
- Overall tech base selection and enforcement

**Other Specs Cover**:
- Component-specific tech base differences (see individual component specs)
- Weight and slot variations by tech base (see individual component specs)
- Introduction year gaps (see Era & Temporal System spec)

**Cross-Reference**:
All component specifications reference the Tech Base Variants Reference for common patterns, then document component-specific differences in their own "Technology Base Variants" sections.


---

## Dependencies

### Defines
- **Unit tech base declaration**: Three options (Inner Sphere, Clan, Mixed)
- **Structural component categories**: 8 categories locked by tech base (Structure, Engine, Gyro, Heat Sinks, Armor, Myomer, Actuators, Cockpit)
- **Tech base locking rules**: IS units use only IS structural, Clan only Clan structural
- **Mixed Tech toggle mechanics**: Independent IS/Clan selection per structural category
- **Equipment filtering rule**: Year/era based only, NOT affected by unit tech base
- **Tech rating penalties**: Mixed Tech increases rating (affects tournament legality)
- **Tournament legality rules**: Mixed Tech may be restricted in tournament play
- **Component substitution rules**: How to handle tech base changes

### Depends On
- [Tech Base System (Phase 1)] - Core tech base enumerations and utilities (spec referenced but doesn't exist yet)
- [Rules Level System](../../phase-1-foundation/rules-level-system/spec.md) - Tournament legality tied to rules levels
- [Era & Temporal System](../../phase-1-foundation/era-temporal-system/spec.md) - Equipment availability depends on year-based filtering
- **All Phase 2 Component Specs**: Individual component specs define tech base variants

### Used By
- [Construction Rules Core](../construction-rules-core/spec.md) - Enforces tech base constraints, validates compliance
- **Validation System**: Validates tech base compliance and reports violations
- **Component Database**: Filters available components by tech base
- **Equipment Browser**: Shows/hides equipment based on year (not tech base)
- **UI Component Selectors**: Provides filtered options based on tech base locks
- **Tech Rating Calculator**: Calculates ratings with Mixed Tech penalties
- **Battle Value Calculator**: Applies 1.25x multiplier for Mixed Tech
- **Unit Serialization**: Persists tech base selections and memory

### Construction Sequence
1. User declares unit tech base (Inner Sphere, Clan, or Mixed)
2. System determines structural constraints (locked or toggleable)
3. User selects structural components (filtered by tech base)
4. System validates tech base compliance (structural only)
5. User adds equipment (year-based filtering only)
6. System calculates tech rating (with Mixed Tech penalties if applicable)
7. System assesses tournament legality (based on mixing and advanced components)

---

## Implementation Notes

### Performance Considerations
- Cache component availability matrices per tech base to avoid repeated filtering
- Pre-calculate available components for each category/tech base combination
- Use memoization for tech rating calculations as they can be expensive
- Store tech base memory in efficient data structure (Map<Category, Map<TechBase, string>>)

### Edge Cases
- **Tech base change with invalid components**: Handle gracefully with substitution, notify user
- **Mixed Tech with all IS or all Clan**: Still considered Mixed, affects rating and legality
- **Equipment mixing on pure units**: Allowed but affects tech rating, not structural validation
- **Legacy data migration**: Old units may not have structuralTechBases, must be derived from components
- **Component with "Both" tech base**: Some universal components available to both, treat as matching both

### Common Pitfalls
- **Pitfall**: Filtering equipment by unit tech base
  - **Solution**: Equipment availability is ONLY year-based, never filter by unit tech base

- **Pitfall**: Allowing structural components to ignore tech base on pure units
  - **Solution**: Enforce strict locking on IS/Clan units, only Mixed allows flexibility

- **Pitfall**: Losing component selections when toggling in Mixed Tech
  - **Solution**: Implement tech base memory to preserve selections per category per tech base

- **Pitfall**: Forgetting to apply Mixed Tech penalties to tech rating
  - **Solution**: Always check isMixedTech flag and apply 1.25x BV modifier and rating increase

- **Pitfall**: Not substituting components on tech base change
  - **Solution**: Implement substitution rules with fallback to defaults when no equivalent exists

---

## Examples

### Example 1: Pure Inner Sphere Unit

**Input**:
```typescript
const unit = {
  techBase: TechBase.INNER_SPHERE,
  constructionYear: 3050,
  chassis: 45, // tonnage
  components: {
    structure: { name: 'Endo Steel', techBase: TechBase.INNER_SPHERE },
    engine: { name: 'XL', rating: 270, techBase: TechBase.INNER_SPHERE },
    gyro: { name: 'Standard', techBase: TechBase.INNER_SPHERE },
    heatSinks: { name: 'Double', techBase: TechBase.INNER_SPHERE },
    armor: { name: 'Ferro-Fibrous', techBase: TechBase.INNER_SPHERE },
    myomer: { name: 'None', techBase: TechBase.INNER_SPHERE }
  },
  equipment: [
    { name: 'ER PPC', techBase: TechBase.INNER_SPHERE, introYear: 3037 },
    { name: 'Medium Pulse Laser', techBase: TechBase.INNER_SPHERE, introYear: 2609 }
  ]
};
```

**Processing**:
```typescript
// Tech base validation
const validation = validateTechBase(unit);
// Result: { isValid: true, conflicts: [], complianceScore: 100 }

// Component availability check
const engineOptions = getAvailableComponents('engine', TechBase.INNER_SPHERE);
// Result: ['Standard', 'XL', 'Light', 'Compact']

// Tech rating calculation
const techRating = calculateTechRating(unit);
// Result: { overallRating: 'D', mixedTechPenalty: false, battleValueModifier: 1.0 }
```

**Output**:
```typescript
{
  isValid: true,
  isMixedTech: false,
  tournamentLegality: {
    level: 'Standard',
    standardTournamentLegal: true,
    restrictions: [],
    notes: 'Pure Inner Sphere unit with standard components'
  },
  techRating: {
    overallRating: 'D',
    byEra: { '3051-3082': 'D', '3083-Now': 'D' }
  }
}
```

### Example 2: Pure Clan Unit

**Input**:
```typescript
const unit = {
  techBase: TechBase.CLAN,
  constructionYear: 3050,
  chassis: 75, // tonnage
  components: {
    structure: { name: 'Endo Steel (Clan)', techBase: TechBase.CLAN },
    engine: { name: 'XL (Clan)', rating: 375, techBase: TechBase.CLAN },
    gyro: { name: 'Standard', techBase: TechBase.CLAN },
    heatSinks: { name: 'Double (Clan)', techBase: TechBase.CLAN },
    armor: { name: 'Ferro-Fibrous (Clan)', techBase: TechBase.CLAN },
    myomer: { name: 'None', techBase: TechBase.CLAN }
  },
  equipment: [
    { name: 'ER Large Laser (Clan)', techBase: TechBase.CLAN, introYear: 2824 },
    { name: 'LRM 20 (Clan)', techBase: TechBase.CLAN, introYear: 2824 }
  ]
};
```

**Processing**:
```typescript
// Tech base validation
const validation = validateTechBase(unit);
// Result: { isValid: true, conflicts: [], complianceScore: 100 }

// Gyro options check (Clan restricted)
const gyroOptions = getAvailableComponents('gyro', TechBase.CLAN);
// Result: ['Standard'] - No XL, Compact, or Heavy-Duty for Clan

// Heat sink check (Clan no singles)
const heatSinkOptions = getAvailableComponents('heatSinks', TechBase.CLAN);
// Result: ['Double (Clan)'] - Singles not available
```

**Output**:
```typescript
{
  isValid: true,
  isMixedTech: false,
  tournamentLegality: {
    level: 'Standard',
    standardTournamentLegal: true,
    restrictions: [],
    notes: 'Pure Clan unit with standard components'
  },
  techRating: {
    overallRating: 'D',
    byEra: { '3051-3082': 'D', '3083-Now': 'D' }
  }
}
```

### Example 3: Mixed Tech Unit with Optimal Configuration

**Input**:
```typescript
const unit = {
  techBase: TechBaseFilter.MIXED,
  constructionYear: 3060,
  chassis: 75,
  structuralTechBases: {
    structure: TechBase.INNER_SPHERE,  // IS Endo Steel (more slots, but acceptable)
    engine: TechBase.CLAN,              // Clan XL (more resilient)
    gyro: TechBase.INNER_SPHERE,       // IS XL Gyro (saves weight)
    heatSinks: TechBase.CLAN,          // Clan Double (more efficient)
    armor: TechBase.INNER_SPHERE,      // IS Ferro-Fibrous
    myomer: TechBase.INNER_SPHERE,     // IS MASC (Clan can't use TSM anyway)
    actuators: TechBase.INNER_SPHERE,
    movement: TechBase.CLAN            // Clan Improved Jump Jets
  },
  components: {
    structure: { name: 'Endo Steel', techBase: TechBase.INNER_SPHERE },
    engine: { name: 'XL (Clan)', rating: 375, techBase: TechBase.CLAN },
    gyro: { name: 'XL', techBase: TechBase.INNER_SPHERE },
    heatSinks: { name: 'Double (Clan)', techBase: TechBase.CLAN },
    armor: { name: 'Ferro-Fibrous', techBase: TechBase.INNER_SPHERE },
    myomer: { name: 'MASC', techBase: TechBase.INNER_SPHERE }
  },
  equipment: [
    { name: 'ER Large Laser (Clan)', techBase: TechBase.CLAN, introYear: 2824 },
    { name: 'ER PPC', techBase: TechBase.INNER_SPHERE, introYear: 3037 },
    { name: 'Ultra AC/5 (Clan)', techBase: TechBase.CLAN, introYear: 2825 }
  ]
};
```

**Processing**:
```typescript
// Mixed Tech validation
const validation = validateTechBase(unit);
// Result: { isValid: true, isMixed: true, conflicts: [] }

// Toggle engine category to IS
const engineOptions = getAvailableComponents('engine', TechBase.INNER_SPHERE);
// Result: ['Standard', 'XL', 'Light', 'Compact']

// Tech rating with Mixed Tech penalty
const techRating = calculateTechRating(unit);
// Result: { overallRating: 'D', mixedTechPenalty: true, battleValueModifier: 1.25 }
```

**Output**:
```typescript
{
  isValid: true,
  isMixedTech: true,
  mixedTechAnalysis: {
    innerSphereComponents: 5,
    clanComponents: 3,
    mixingRatio: '62% IS / 38% Clan'
  },
  tournamentLegality: {
    level: 'Advanced',
    standardTournamentLegal: false,
    restrictions: [
      'Mixed Tech restricted in standard tournaments',
      'Requires Advanced rules for tournament play'
    ],
    notes: 'Optimized Mixed Tech configuration combining best of both tech bases'
  },
  techRating: {
    overallRating: 'D',
    mixedTechPenalty: true,
    battleValueModifier: 1.25,
    byEra: {
      '2100-2800': 'X',
      '2801-3050': 'E',
      '3051-3082': 'D',
      '3083-Now': 'D'
    }
  }
}
```

### Example 4: Tech Base Change with Component Substitution

**Input** (Before):
```typescript
const originalUnit = {
  techBase: TechBase.INNER_SPHERE,
  components: {
    engine: { name: 'XL', techBase: TechBase.INNER_SPHERE },
    structure: { name: 'Endo Steel', techBase: TechBase.INNER_SPHERE },
    gyro: { name: 'XL', techBase: TechBase.INNER_SPHERE },
    armor: { name: 'Ferro-Fibrous', techBase: TechBase.INNER_SPHERE },
    myomer: { name: 'Triple Strength Myomer', techBase: TechBase.INNER_SPHERE }
  }
};
```

**Processing**:
```typescript
// User changes tech base to Clan
changeTechBase(originalUnit, TechBase.CLAN);

// System performs component substitution
const substitutions = [
  { category: 'engine', from: 'XL', to: 'XL (Clan)', reason: 'Equivalent exists' },
  { category: 'structure', from: 'Endo Steel', to: 'Endo Steel (Clan)', reason: 'Equivalent exists' },
  { category: 'gyro', from: 'XL', to: 'Standard', reason: 'No Clan equivalent for XL Gyro' },
  { category: 'armor', from: 'Ferro-Fibrous', to: 'Ferro-Fibrous (Clan)', reason: 'Equivalent exists' },
  { category: 'myomer', from: 'Triple Strength Myomer', to: 'None', reason: 'No Clan equivalent for TSM' }
];
```

**Output** (After):
```typescript
const convertedUnit = {
  techBase: TechBase.CLAN,
  components: {
    engine: { name: 'XL (Clan)', techBase: TechBase.CLAN },
    structure: { name: 'Endo Steel (Clan)', techBase: TechBase.CLAN },
    gyro: { name: 'Standard', techBase: TechBase.CLAN },
    armor: { name: 'Ferro-Fibrous (Clan)', techBase: TechBase.CLAN },
    myomer: { name: 'None', techBase: TechBase.CLAN }
  },
  substitutionNotifications: [
    'Gyro changed from XL to Standard (Clan has no XL Gyro)',
    'Myomer changed from Triple Strength Myomer to None (Clan has no TSM)'
  ]
};
```

### Example 5: Equipment Mixing on Pure IS Unit

**Input**:
```typescript
const unit = {
  techBase: TechBase.INNER_SPHERE, // Pure IS structural
  constructionYear: 3055,
  components: {
    // All IS structural components
    structure: { name: 'Endo Steel', techBase: TechBase.INNER_SPHERE },
    engine: { name: 'XL', techBase: TechBase.INNER_SPHERE },
    // ... other IS structural
  },
  equipment: [
    // Mix of IS and Clan equipment (salvage scenario)
    { name: 'ER Large Laser (Clan)', techBase: TechBase.CLAN, introYear: 2824 },
    { name: 'ER Medium Laser (Clan)', techBase: TechBase.CLAN, introYear: 2824 },
    { name: 'Medium Pulse Laser', techBase: TechBase.INNER_SPHERE, introYear: 2609 },
    { name: 'LRM 15', techBase: TechBase.INNER_SPHERE, introYear: 2300 }
  ]
};
```

**Processing**:
```typescript
// Structural validation - passes (all IS)
const structuralValidation = validateStructuralComponents(unit);
// Result: { isValid: true, conflicts: [] }

// Equipment validation - no tech base errors (year-based only)
const equipmentValidation = validateEquipment(unit);
// Result: { isValid: true, allAvailableByYear: true }

// Tech rating - affected by mixing equipment
const techRating = calculateTechRating(unit);
// Result: Mixed equipment increases rating, acts as pseudo-Mixed Tech
```

**Output**:
```typescript
{
  isValid: true,
  structurallyPure: true, // All structural components are IS
  equipmentMixed: true,   // Equipment includes Clan weapons
  isMixedTech: false,     // Not declared Mixed, but has mixing

  tournamentLegality: {
    level: 'Advanced',
    standardTournamentLegal: false,
    restrictions: [
      'Uses Clan weapons on Inner Sphere chassis',
      'Equipment mixing may be restricted in some tournaments'
    ],
    notes: 'Structurally pure IS, but uses salvaged Clan equipment'
  },

  techRating: {
    overallRating: 'D',
    mixedTechPenalty: false, // Not declared Mixed
    equipmentMixingPenalty: true, // But equipment mixing still affects rating
    battleValueModifier: 1.0, // No BV penalty for equipment mixing on pure structural
    notes: 'Clan ER Large Lasers increase tech rating to D'
  }
}
```

---

## References

### Official BattleTech Rules
- **TechManual**: Pages 207-208 - Mixed Tech Rules
- **TechManual**: Pages 109-111 - Tech Base and Technology Advancement
- **Strategic Operations**: Pages 128-131 - Advanced Tech Base Rules
- **Campaign Operations**: Pages 42-45 - Tournament Legality and Tech Ratings
- **Interstellar Operations**: Pages 68-70 - Tech Base Progression Tables

### Related Documentation
- Tech Base System Specification (Phase 1)
- Component Database Specification
- Equipment System Specification
- Tech Progression Specification
- Validation System Architecture
- Construction Rules Engine Documentation

---

## Changelog

### Version 1.0 (2025-11-27)
- Initial specification for Tech Base Integration System
- Defined unit tech base declaration (IS, Clan, Mixed)
- Specified structural component locking rules
- Documented Mixed Tech toggle mechanics for 8 structural categories
- Created component availability matrices by tech base
- Defined equipment year-based availability (tech base independent)
- Specified tech rating calculation with Mixed Tech penalties
- Documented tournament legality assessment
- Defined component substitution rules for tech base changes
- Created comprehensive examples for all scenarios

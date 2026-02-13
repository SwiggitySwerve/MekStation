# tech-base-integration Specification

## Purpose

TBD - created by archiving change implement-phase2-construction. Update Purpose after archive.

## Requirements

### Requirement: Unit Tech Base Declaration

Units SHALL declare their tech base and manage per-component tech base settings.

#### Scenario: Tech base types

- **WHEN** declaring unit tech base
- **THEN** unit MAY be INNER_SPHERE
- **OR** unit MAY be CLAN
- **OR** unit MAY be MIXED

#### Scenario: Tech base mode management

- **WHEN** unit is in `inner_sphere` mode
- **THEN** all components default to Inner Sphere tech base
- **AND** component-level tech base toggles are disabled

#### Scenario: Clan mode management

- **WHEN** unit is in `clan` mode
- **THEN** all components default to Clan tech base
- **AND** component-level tech base toggles are disabled

#### Scenario: Mixed mode management

- **WHEN** unit is in `mixed` mode
- **THEN** each component has its own tech base setting
- **AND** component-level tech base toggles are enabled
- **AND** user can independently select IS or Clan for each component

### Requirement: Structural Component Validation

Structural components SHALL be validated against their configured tech base.

#### Scenario: Pure tech base

- **WHEN** unit is not MIXED
- **THEN** all structural components MUST match unit tech base
- **AND** equipment MAY have different tech base

#### Scenario: Component filtering by tech base

- **WHEN** component tech base is set
- **THEN** only compatible options are shown in dropdowns
- **AND** incompatible options are hidden

#### Scenario: Auto-correction on tech base change

- **WHEN** component tech base changes
- **AND** current selection is incompatible with new tech base
- **THEN** selection is automatically replaced with default compatible option
- **AND** user is not interrupted

### Requirement: Mixed Tech Toggle

Mixed tech mode SHALL enable cross-tech-base components.

#### Scenario: Mixed tech enabled

- **WHEN** unit is MIXED tech base
- **THEN** both IS and Clan structural components allowed
- **AND** tech rating SHALL reflect highest complexity

#### Scenario: Mode switch from mixed to pure

- **WHEN** user switches from Mixed to Inner Sphere or Clan
- **THEN** all component tech bases are set to match the new mode
- **AND** all incompatible selections are replaced with defaults

### Requirement: Component Validator Registry

A registry SHALL provide type-safe validation for each component type.

#### Scenario: Validator interface

- **WHEN** validating a component selection
- **THEN** validator provides:
  - `getValidTypes(techBase)` - returns array of valid options
  - `isValid(value, techBase)` - checks if selection is valid
  - `getDefault(techBase)` - returns default option for tech base
  - `fallbackDefault` - ultimate fallback if no options available

#### Scenario: Per-component validators

- **WHEN** validation system is initialized
- **THEN** validators exist for:
  - Engine type (IS XL vs Clan XL)
  - Gyro type (all universal)
  - Internal structure (IS Endo vs Clan Endo)
  - Cockpit type (all universal)
  - Heat sink type (IS Double vs Clan Double)
  - Armor type (IS Ferro vs Clan Ferro)

### Requirement: Tech Base Filtering Functions

The system SHALL provide filtering functions for each component type.

#### Scenario: Engine filtering

- **WHEN** filtering engines for Inner Sphere
- **THEN** include: Standard, XL (IS), Light, XXL, Compact, non-fusion engines
- **AND** exclude: XL (Clan)

#### Scenario: Engine filtering for Clan

- **WHEN** filtering engines for Clan
- **THEN** include: Standard, XL (Clan), XXL, Compact
- **AND** exclude: XL (IS), Light, non-fusion engines

#### Scenario: Structure filtering

- **WHEN** filtering internal structure for Inner Sphere
- **THEN** include: Standard, Endo Steel (IS), Endo-Composite, Reinforced, Composite, Industrial
- **AND** exclude: Endo Steel (Clan)

#### Scenario: Structure filtering for Clan

- **WHEN** filtering internal structure for Clan
- **THEN** include: Standard, Endo Steel (Clan)
- **AND** exclude: Endo Steel (IS), Endo-Composite, Reinforced, Composite, Industrial

#### Scenario: Heat sink filtering

- **WHEN** filtering heat sinks for Inner Sphere
- **THEN** include: Single, Double (IS), Compact
- **AND** exclude: Double (Clan), Laser

#### Scenario: Heat sink filtering for Clan

- **WHEN** filtering heat sinks for Clan
- **THEN** include: Single, Double (Clan), Laser
- **AND** exclude: Double (IS), Compact

### Requirement: Tech Base Sync Hook

The system SHALL provide a hook for filtering component options based on tech base settings.

**Source**: `src/hooks/useTechBaseSync.ts:206-326`

#### Scenario: Filtered component options

- **GIVEN** component tech base settings
- **WHEN** useTechBaseSync hook is invoked
- **THEN** hook returns filtered options for all 6 component categories
- **AND** each category contains only tech-base-compatible options
- **AND** engines filtered by componentTechBases.engine
- **AND** gyros filtered by componentTechBases.gyro
- **AND** structures filtered by componentTechBases.chassis
- **AND** cockpits filtered by componentTechBases.chassis
- **AND** heat sinks filtered by componentTechBases.heatsink
- **AND** armors filtered by componentTechBases.armor

#### Scenario: Component defaults

- **GIVEN** filtered component options
- **WHEN** useTechBaseSync hook computes defaults
- **THEN** default for each category is first valid option
- **AND** defaults.engineType is first engine in filtered list
- **AND** defaults.gyroType is first gyro in filtered list
- **AND** defaults.structureType is first structure in filtered list
- **AND** defaults.cockpitType is first cockpit in filtered list
- **AND** defaults.heatSinkType is first heat sink in filtered list
- **AND** defaults.armorType is first armor in filtered list

#### Scenario: Validation functions

- **GIVEN** filtered component options
- **WHEN** useTechBaseSync hook provides validation functions
- **THEN** isEngineValid(type) returns true if type in filtered engines
- **AND** isGyroValid(type) returns true if type in filtered gyros
- **AND** isStructureValid(type) returns true if type in filtered structures
- **AND** isCockpitValid(type) returns true if type in filtered cockpits
- **AND** isHeatSinkValid(type) returns true if type in filtered heat sinks
- **AND** isArmorValid(type) returns true if type in filtered armors

#### Scenario: Validated selections

- **GIVEN** current component selections
- **AND** filtered component options
- **WHEN** getValidatedSelections is called
- **THEN** valid selections are preserved
- **AND** invalid selections are replaced with defaults
- **AND** engineType replaced if not in filtered engines
- **AND** gyroType replaced if not in filtered gyros
- **AND** internalStructureType replaced if not in filtered structures
- **AND** cockpitType replaced if not in filtered cockpits
- **AND** heatSinkType replaced if not in filtered heat sinks
- **AND** armorType replaced if not in filtered armors

#### Scenario: Inner Sphere to Clan switch

- **GIVEN** unit with Inner Sphere engine (XL IS)
- **WHEN** engine tech base changes to Clan
- **THEN** isEngineValid(XL_IS) returns false
- **AND** getValidatedSelections replaces XL_IS with defaults.engineType
- **AND** defaults.engineType is Standard or XL_CLAN

#### Scenario: Mixed Tech allows both

- **GIVEN** unit with Mixed Tech base
- **WHEN** engine tech base is Inner Sphere
- **AND** structure tech base is Clan
- **THEN** filtered engines include XL (IS) but not XL (Clan)
- **AND** filtered structures include Endo Steel (Clan) but not Endo Steel (IS)
- **AND** each component category filters independently

### Requirement: Tech Base Sync Effect Hook

The system SHALL provide a hook for automatically updating component selections when tech base changes.

**Source**: `src/hooks/useTechBaseSyncEffect.ts:73-164`

#### Scenario: Auto-replacement on tech base change

- **GIVEN** component selections and tech base settings
- **WHEN** a component's tech base changes
- **AND** current selection is incompatible with new tech base
- **THEN** selection is automatically replaced with default
- **AND** setter function is called with new default value
- **AND** user is not interrupted

#### Scenario: Engine tech base change

- **GIVEN** engine type is XL (IS)
- **AND** engine tech base is Inner Sphere
- **WHEN** engine tech base changes to Clan
- **THEN** isEngineValid(XL_IS) returns false
- **AND** setEngineType is called with defaults.engineType
- **AND** new engine type is Clan-compatible

#### Scenario: Structure tech base change

- **GIVEN** structure type is Endo Steel (IS)
- **AND** chassis tech base is Inner Sphere
- **WHEN** chassis tech base changes to Clan
- **THEN** isStructureValid(ENDO_STEEL_IS) returns false
- **AND** setInternalStructureType is called with defaults.structureType
- **AND** new structure type is Clan-compatible

#### Scenario: Heat sink tech base change

- **GIVEN** heat sink type is Double (IS)
- **AND** heatsink tech base is Inner Sphere
- **WHEN** heatsink tech base changes to Clan
- **THEN** isHeatSinkValid(DOUBLE_IS) returns false
- **AND** setHeatSinkType is called with defaults.heatSinkType
- **AND** new heat sink type is Clan-compatible

#### Scenario: Valid selection preserved

- **GIVEN** engine type is Standard
- **AND** engine tech base is Inner Sphere
- **WHEN** engine tech base changes to Clan
- **THEN** isEngineValid(STANDARD) returns true
- **AND** setEngineType is NOT called
- **AND** engine type remains Standard

#### Scenario: Multiple tech base changes

- **GIVEN** multiple component tech bases change simultaneously
- **WHEN** useTechBaseSyncEffect detects changes
- **THEN** each changed component is validated independently
- **AND** only invalid selections are replaced
- **AND** all setters are called in same render cycle

#### Scenario: No change detection

- **GIVEN** component tech bases have not changed
- **WHEN** useTechBaseSyncEffect runs
- **THEN** no validation is performed
- **AND** no setters are called
- **AND** performance is optimized

## Data Model Requirements

### IComponentSelections

Component selections interface for unit construction.

**Source**: `src/stores/useMultiUnitStore.ts` (referenced in useTechBaseSync.ts:12)

```typescript
interface IComponentSelections {
  readonly engineType: EngineType;
  readonly gyroType: GyroType;
  readonly internalStructureType: InternalStructureType;
  readonly cockpitType: CockpitType;
  readonly heatSinkType: HeatSinkType;
  readonly armorType: ArmorTypeEnum;
}
```

### IComponentTechBases

Per-component tech base settings for Mixed Tech units.

**Source**: `src/types/construction/TechBaseConfiguration.ts:43-50`

```typescript
interface IComponentTechBases {
  readonly engine: TechBase;
  readonly gyro: TechBase;
  readonly chassis: TechBase; // Affects both structure and cockpit
  readonly heatsink: TechBase;
  readonly armor: TechBase;
}
```

### TechBaseComponent

Enumeration of component categories that can have independent tech base settings.

**Source**: `src/types/construction/TechBaseConfiguration.ts:19-25`

```typescript
enum TechBaseComponent {
  ENGINE = 'engine',
  GYRO = 'gyro',
  CHASSIS = 'chassis',
  HEATSINK = 'heatsink',
  ARMOR = 'armor',
}
```

### FilteredComponentOptions

Filtered component options based on tech base settings.

**Source**: `src/hooks/useTechBaseSync.ts:50-57`

```typescript
interface FilteredComponentOptions {
  readonly engines: EngineDefinition[];
  readonly gyros: GyroDefinition[];
  readonly structures: InternalStructureDefinition[];
  readonly cockpits: CockpitDefinition[];
  readonly heatSinks: HeatSinkDefinition[];
  readonly armors: ArmorDefinition[];
}
```

### ComponentDefaults

Default component selections (first valid option for each category).

**Source**: `src/hooks/useTechBaseSync.ts:59-66`

```typescript
interface ComponentDefaults {
  readonly engineType: EngineType;
  readonly gyroType: GyroType;
  readonly structureType: InternalStructureType;
  readonly cockpitType: CockpitType;
  readonly heatSinkType: HeatSinkType;
  readonly armorType: ArmorTypeEnum;
}
```

### TechBaseSyncResult

Return type of useTechBaseSync hook.

**Source**: `src/hooks/useTechBaseSync.ts:68-97`

```typescript
interface TechBaseSyncResult {
  /** Filtered component options based on current tech base settings */
  readonly filteredOptions: FilteredComponentOptions;

  /** Default values for each component type (first valid option) */
  readonly defaults: ComponentDefaults;

  /** Check if a specific engine type is valid for current tech base */
  readonly isEngineValid: (engineType: EngineType) => boolean;

  /** Check if a specific gyro type is valid for current tech base */
  readonly isGyroValid: (gyroType: GyroType) => boolean;

  /** Check if a specific structure type is valid for current tech base */
  readonly isStructureValid: (structureType: InternalStructureType) => boolean;

  /** Check if a specific cockpit type is valid for current tech base */
  readonly isCockpitValid: (cockpitType: CockpitType) => boolean;

  /** Check if a specific heat sink type is valid for current tech base */
  readonly isHeatSinkValid: (heatSinkType: HeatSinkType) => boolean;

  /** Check if a specific armor type is valid for current tech base */
  readonly isArmorValid: (armorType: ArmorTypeEnum) => boolean;

  /** Get validated selections (replaces invalid selections with defaults) */
  readonly getValidatedSelections: (
    current: IComponentSelections,
  ) => IComponentSelections;
}
```

### ComponentSetters

Setter functions for updating component selections.

**Source**: `src/hooks/useTechBaseSyncEffect.ts:40-47`

```typescript
interface ComponentSetters {
  readonly setEngineType: (type: EngineType) => void;
  readonly setGyroType: (type: GyroType) => void;
  readonly setInternalStructureType: (type: InternalStructureType) => void;
  readonly setCockpitType: (type: CockpitType) => void;
  readonly setHeatSinkType: (type: HeatSinkType) => void;
  readonly setArmorType: (type: ArmorTypeEnum) => void;
}
```

## Non-Goals

This specification does NOT cover:

- Equipment tech base filtering (weapons, electronics, ammunition)
- Tech rating calculation
- Battle value calculation
- Construction rules validation
- Critical slot allocation
- Weight budget calculation
- UI component implementation

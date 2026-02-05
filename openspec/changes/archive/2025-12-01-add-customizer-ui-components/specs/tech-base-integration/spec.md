## MODIFIED Requirements

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

## ADDED Requirements

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

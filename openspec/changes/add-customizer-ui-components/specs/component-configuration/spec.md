## ADDED Requirements

### Requirement: Component Selection Persistence
The system SHALL persist all component selections for each unit tab.

#### Scenario: Engine selection persistence
- **WHEN** user selects an engine type on the Structure tab
- **THEN** selection is stored in the unit's tab state
- **AND** selection persists when navigating to other tabs
- **AND** selection persists across browser sessions via localStorage

#### Scenario: Gyro selection persistence
- **WHEN** user selects a gyro type on the Structure tab
- **THEN** selection is stored in the unit's tab state
- **AND** selection persists when navigating to other tabs

#### Scenario: Structure selection persistence
- **WHEN** user selects an internal structure type on the Structure tab
- **THEN** selection is stored in the unit's tab state
- **AND** selection persists when navigating to other tabs

#### Scenario: Cockpit selection persistence
- **WHEN** user selects a cockpit type on the Structure tab
- **THEN** selection is stored in the unit's tab state
- **AND** selection persists when navigating to other tabs

#### Scenario: Armor type selection persistence
- **WHEN** user selects an armor type
- **THEN** selection is stored in the unit's tab state
- **AND** selection persists when navigating to other tabs

#### Scenario: Heat sink selection persistence
- **WHEN** user selects a heat sink type
- **THEN** selection is stored in the unit's tab state
- **AND** selection persists when navigating to other tabs

### Requirement: Tech Base Filtering
Available component options SHALL be filtered based on the component's tech base setting.

#### Scenario: Inner Sphere component filtering
- **WHEN** component tech base is set to Inner Sphere
- **THEN** only IS-compatible options appear in dropdowns
- **AND** Clan-exclusive options are hidden

#### Scenario: Clan component filtering
- **WHEN** component tech base is set to Clan
- **THEN** only Clan-compatible options appear in dropdowns
- **AND** IS-exclusive options are hidden

#### Scenario: Mixed mode filtering
- **WHEN** tech base mode is Mixed
- **THEN** each component filters independently based on its own tech base setting

### Requirement: Tech Base Change Validation
The system SHALL validate current selections when tech base changes.

#### Scenario: Valid selection after tech base change
- **WHEN** tech base changes
- **AND** current selection is compatible with new tech base
- **THEN** selection is preserved

#### Scenario: Invalid selection after tech base change
- **WHEN** tech base changes
- **AND** current selection is incompatible with new tech base
- **THEN** selection is automatically replaced with default compatible option
- **AND** user is not interrupted

#### Scenario: Global mode change to non-mixed
- **WHEN** user switches from Mixed to Inner Sphere or Clan
- **THEN** all component tech bases are set to match
- **AND** all incompatible selections are replaced with defaults

### Requirement: Weight and Slot Recalculation
The system SHALL recalculate weights and critical slots when component selections change.

#### Scenario: Engine change triggers recalculation
- **WHEN** engine type or rating changes
- **THEN** engine weight is recalculated
- **AND** gyro weight is recalculated (depends on engine rating)
- **AND** total weight is updated in UnitInfoBanner
- **AND** critical slot count is updated

#### Scenario: Gyro change triggers recalculation
- **WHEN** gyro type changes
- **THEN** gyro weight is recalculated
- **AND** gyro critical slots are updated
- **AND** totals in UnitInfoBanner are updated

#### Scenario: Structure change triggers recalculation
- **WHEN** internal structure type changes
- **THEN** structure weight is recalculated
- **AND** structure critical slots are updated
- **AND** totals in UnitInfoBanner are updated

#### Scenario: Heat sink change triggers recalculation
- **WHEN** heat sink type or count changes
- **THEN** heat sink weight is recalculated
- **AND** heat dissipation is recalculated
- **AND** totals in UnitInfoBanner are updated

### Requirement: Configuration Panel Sync
The Configuration panel SHALL reflect actual component selections from other tabs.

#### Scenario: Engine selection shown in Configuration
- **WHEN** user views Configuration panel on Overview tab
- **THEN** Engine row shows the actual selected engine type name
- **AND** value updates in real-time when changed on Structure tab

#### Scenario: All component selections shown
- **WHEN** user views Configuration panel
- **THEN** each row shows the actual selected component type
- **AND** values include: Engine type + rating, Gyro type, Structure type, Heat sink type + count, Armor type

### Requirement: Default Component Values
New units SHALL have sensible default component selections.

#### Scenario: Default selections for new Inner Sphere unit
- **WHEN** user creates a new Inner Sphere unit
- **THEN** defaults are: Standard Fusion engine, Standard gyro, Standard structure, Standard cockpit, Single heat sinks, Standard armor

#### Scenario: Default selections for new Clan unit
- **WHEN** user creates a new Clan unit
- **THEN** defaults are: Standard Fusion engine, Standard gyro, Standard structure, Standard cockpit, Single heat sinks, Standard armor

#### Scenario: Default engine rating based on walk MP
- **WHEN** user creates a new unit with specified walk MP
- **THEN** engine rating is calculated as tonnage × walkMP

### Requirement: Selection Memory on Tech Base Switch
The system SHALL remember component selections per tech base and restore them when switching back.

#### Scenario: Save selection before tech base switch
- **WHEN** user switches a component's tech base (e.g., engine from IS to Clan)
- **THEN** current selection is saved to memory for the OLD tech base
- **AND** memory is keyed by component type and tech base (e.g., `engine.IS`)

#### Scenario: Restore selection from memory
- **WHEN** user switches a component's tech base back to a previously used value
- **AND** a selection exists in memory for that tech base
- **AND** the remembered selection is still valid for that tech base
- **THEN** the remembered selection is restored

#### Scenario: Fall back to default if no memory
- **WHEN** user switches a component's tech base
- **AND** no selection exists in memory for the new tech base
- **THEN** the system uses the default selection for that tech base

#### Scenario: Memory persistence across sessions
- **WHEN** user refreshes the page or reopens the application
- **THEN** selection memory is restored from localStorage
- **AND** previously remembered selections are available for restoration

#### Scenario: Memory for global mode switch
- **WHEN** user switches global tech base mode (e.g., IS to Clan)
- **THEN** all component selections are saved to memory for the OLD mode
- **AND** selections are restored from memory for the NEW mode (if available)
- **AND** invalid selections fall back to defaults


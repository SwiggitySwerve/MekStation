# unit-store-architecture Specification

## Purpose
TBD - created by archiving change add-customizer-ui-components. Update Purpose after archive.
## Requirements
### Requirement: Isolated Unit Stores
Each unit SHALL have its own isolated Zustand store instance with independent persistence.

#### Scenario: Unit store creation
- **WHEN** a new unit tab is created
- **THEN** a new Zustand store instance is created for that unit
- **AND** the store is registered in the unit store registry
- **AND** the store persists to localStorage with key `unit-{id}`

#### Scenario: Unit store isolation
- **WHEN** multiple units are open in tabs
- **THEN** each unit has its own store instance
- **AND** changes to one unit do not affect other units
- **AND** each unit persists independently

#### Scenario: Unit store destruction
- **WHEN** a unit tab is closed
- **THEN** the store instance may be cleaned up from the registry
- **AND** localStorage entry may optionally be preserved or deleted

### Requirement: Tab Manager Store
A separate store SHALL manage tab lifecycle without containing unit data.

#### Scenario: Tab manager state
- **WHEN** the application loads
- **THEN** TabManagerStore contains only:
  - `tabIds: string[]` - ordered list of open tab IDs
  - `activeTabId: string | null` - currently selected tab
- **AND** no unit configuration data is stored in TabManagerStore

#### Scenario: Tab creation via TabManager
- **WHEN** user creates a new tab
- **THEN** TabManagerStore adds the new tab ID to `tabIds`
- **AND** TabManagerStore sets `activeTabId` to the new tab
- **AND** a new unit store is created in the registry

#### Scenario: Tab selection
- **WHEN** user clicks a tab
- **THEN** TabManagerStore updates `activeTabId`
- **AND** the UnitStoreProvider switches to the corresponding unit store

#### Scenario: Tab manager persistence
- **WHEN** tab order changes
- **THEN** TabManagerStore persists to `localStorage['tab-manager']`
- **AND** only tab IDs and active tab are persisted (not unit data)

### Requirement: Unit Store Context
A React Context SHALL provide the active unit's store to components.

#### Scenario: Context provision
- **WHEN** the customizer page renders
- **THEN** UnitStoreProvider wraps the content
- **AND** the provider supplies the active unit's store based on `activeTabId`

#### Scenario: Store switching
- **WHEN** user switches tabs
- **THEN** UnitStoreProvider updates to provide the new active unit's store
- **AND** all child components automatically re-render with new unit data

#### Scenario: Hook usage
- **WHEN** a component calls `useUnitStore((s) => s.engineType)`
- **THEN** the hook reads from the contextual store
- **AND** no tabId parameter is needed

### Requirement: Simplified Component API
Components SHALL access unit state without explicit tab references.

#### Scenario: Reading state
- **WHEN** component needs unit state
- **THEN** it calls `useUnitStore((s) => s.property)`
- **AND** selector reads from the active unit's store

#### Scenario: Writing state
- **WHEN** component needs to update unit state
- **THEN** it calls `useUnitStore((s) => s.setProperty)`
- **AND** action updates the active unit's store
- **AND** no tabId is passed to the action

#### Scenario: No tabId prop drilling
- **WHEN** implementing tab components (StructureTab, OverviewTab, etc.)
- **THEN** components do NOT receive tabId as a prop
- **AND** components do NOT pass tabId to child components

### Requirement: Unit State Interface
A complete interface SHALL define all unit configuration state.

#### Scenario: Unit identity
- **WHEN** unit state is defined
- **THEN** it includes:
  - `id: string` - unique identifier
  - `name: string` - display name
  - `tonnage: number` - unit weight class
  - `techBase: TechBase` - base technology

#### Scenario: Unit configuration
- **WHEN** unit state is defined
- **THEN** it includes:
  - `unitType: UnitType`
  - `configuration: MechConfiguration`
  - `techBaseMode: TechBaseMode`
  - `componentTechBases: IComponentTechBases`

#### Scenario: Component selections
- **WHEN** unit state is defined
- **THEN** it includes:
  - `engineType: EngineType`
  - `engineRating: number`
  - `gyroType: GyroType`
  - `internalStructureType: InternalStructureType`
  - `cockpitType: CockpitType`
  - `heatSinkType: HeatSinkType`
  - `heatSinkCount: number`
  - `armorType: ArmorTypeEnum`
  - `selectionMemory: ISelectionMemory` - remembered selections per tech base

#### Scenario: Unit metadata
- **WHEN** unit state is defined
- **THEN** it includes:
  - `isModified: boolean` - dirty flag
  - `createdAt: number` - creation timestamp
  - `lastModifiedAt: number` - modification timestamp

### Requirement: Store Registry
A registry SHALL manage all active unit store instances.

#### Scenario: Store registration
- **WHEN** a unit store is created
- **THEN** it is added to the registry Map keyed by unit ID

#### Scenario: Store lookup
- **WHEN** a tab becomes active
- **THEN** the registry provides the corresponding store instance

#### Scenario: Store hydration
- **WHEN** application loads with persisted tabs
- **THEN** stores are lazily created from localStorage data as tabs are accessed

#### Scenario: Store hydration with invalid ID
- **WHEN** localStorage contains unit data with missing or invalid UUID
- **THEN** a new valid UUID is generated for the unit
- **AND** a warning is logged indicating ID repair occurred
- **AND** the store is registered with the new valid ID

#### Scenario: Store ID integrity
- **WHEN** a store is created or hydrated
- **THEN** the store ID is validated as a proper UUID format
- **AND** invalid IDs are replaced with generated UUIDs before registration

### Requirement: Selection Memory Interface
A typed interface SHALL define the structure for remembering selections per tech base.

#### Scenario: Memory structure per component
- **WHEN** selection memory is defined
- **THEN** it includes entries for each component type:
  - `engine: { IS?: EngineType; CLAN?: EngineType }`
  - `gyro: { IS?: GyroType; CLAN?: GyroType }`
  - `structure: { IS?: InternalStructureType; CLAN?: InternalStructureType }`
  - `cockpit: { IS?: CockpitType; CLAN?: CockpitType }`
  - `heatSink: { IS?: HeatSinkType; CLAN?: HeatSinkType }`
  - `armor: { IS?: ArmorTypeEnum; CLAN?: ArmorTypeEnum }`

#### Scenario: Memory initialization
- **WHEN** a new unit is created
- **THEN** selection memory is initialized as empty objects for each component
- **AND** memory values are populated only when user switches tech bases

#### Scenario: Memory persistence
- **WHEN** selection memory is updated
- **THEN** it is included in the persisted unit state via localStorage
- **AND** memory is restored when the unit is loaded

### Requirement: Chassis State Management
The unit store SHALL support editable chassis configuration including tonnage, motive type, Omni status, and enhancement selection.

#### Scenario: Tonnage editing with engine sync
- **WHEN** setTonnage action is called
- **THEN** tonnage is updated to the new value
- **AND** engine rating is recalculated to maintain current Walk MP
- **AND** engine rating is clamped to valid range (10-500)

#### Scenario: Configuration editing
- **WHEN** setConfiguration action is called
- **THEN** configuration (MechConfiguration) is updated
- **AND** isModified is set to true

#### Scenario: Omni status editing
- **WHEN** setIsOmni action is called
- **THEN** isOmni boolean is updated
- **AND** isModified is set to true

#### Scenario: Enhancement selection
- **WHEN** setEnhancement action is called
- **THEN** enhancement field is updated (MovementEnhancementType or null)
- **AND** isModified is set to true

#### Scenario: State persistence
- **WHEN** unit state is persisted
- **THEN** isOmni, configuration, and enhancement are included
- **AND** state is restored correctly on hydration

### Requirement: Engine Type Change with Displacement
The setEngineType store action SHALL detect and unallocate equipment displaced by the new engine's slot requirements.

#### Scenario: Equipment displaced by engine change
- **GIVEN** equipment is allocated in side torso slots that new engine requires
- **WHEN** setEngineType action is called with an engine requiring more side torso slots
- **THEN** displaced equipment location SHALL be set to undefined
- **AND** displaced equipment slots SHALL be set to undefined
- **AND** engine type SHALL be updated to the new type
- **AND** isModified SHALL be set to true

#### Scenario: No displacement when engine requires fewer slots
- **GIVEN** equipment is allocated in side torso slots
- **WHEN** setEngineType action is called with an engine requiring fewer side torso slots
- **THEN** equipment allocation SHALL remain unchanged
- **AND** engine type SHALL be updated to the new type

### Requirement: Gyro Type Change with Displacement
The setGyroType store action SHALL detect and unallocate equipment displaced by the new gyro's slot requirements.

#### Scenario: Equipment displaced by gyro change
- **GIVEN** equipment is allocated in center torso slots that new gyro requires
- **WHEN** setGyroType action is called with a gyro requiring more slots
- **THEN** displaced equipment location SHALL be set to undefined
- **AND** displaced equipment slots SHALL be set to undefined
- **AND** gyro type SHALL be updated to the new type
- **AND** isModified SHALL be set to true

#### Scenario: No displacement when gyro requires fewer slots
- **GIVEN** equipment is allocated in center torso slots
- **WHEN** setGyroType action is called with a gyro requiring fewer slots
- **THEN** equipment allocation SHALL remain unchanged
- **AND** gyro type SHALL be updated to the new type


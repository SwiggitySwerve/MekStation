# unit-services Specification

## Purpose

Provides services for loading, browsing, searching, and managing BattleMech units. Supports both canonical (official) units loaded from static JSON files and custom user-created units stored in IndexedDB. Includes unit factory service for converting serialized data to runtime objects.

## Requirements

### Requirement: Canonical Unit Index Loading

The system SHALL load a lightweight unit index on application startup for search and browsing.

**Rationale**: Loading full unit data for all units is too slow; index enables fast filtering.

**Priority**: Critical

#### Scenario: Load index on startup

- **GIVEN** the application is starting
- **WHEN** CanonicalUnitService.getIndex() is called
- **THEN** return array of UnitIndexEntry objects
- **AND** each entry contains id, name, chassis, variant, tonnage, techBase, era, weightClass, unitType, filePath

#### Scenario: Index is cached

- **GIVEN** the index has been loaded once
- **WHEN** getIndex() is called again
- **THEN** return cached data without network request

---

### Requirement: Canonical Unit Lazy Loading

The system SHALL lazy-load full unit data on demand by ID.

**Rationale**: Avoids loading megabytes of unit data until actually needed.

**Priority**: Critical

#### Scenario: Load single unit

- **GIVEN** a valid unit ID exists in the index
- **WHEN** CanonicalUnitService.getById(id) is called
- **THEN** fetch the unit JSON from the file path
- **AND** convert ISerializedUnit to IBattleMech via UnitFactoryService
- **AND** return the complete IBattleMech object

#### Scenario: Unit not found

- **GIVEN** an invalid or unknown unit ID
- **WHEN** getById(unknownId) is called
- **THEN** return null

#### Scenario: Load multiple units

- **GIVEN** multiple valid unit IDs
- **WHEN** getByIds([id1, id2, id3]) is called
- **THEN** return array of IBattleMech objects in parallel
- **AND** skip any IDs that don't exist

---

### Requirement: Canonical Unit Querying

The system SHALL filter the unit index by criteria.

**Rationale**: Users need to browse units by tech base, era, weight class, etc.

**Priority**: High

#### Scenario: Filter by tech base

- **GIVEN** the unit index is loaded
- **WHEN** query({ techBase: TechBase.CLAN }) is called
- **THEN** return only units with Clan tech base

#### Scenario: Filter by multiple criteria

- **GIVEN** the unit index is loaded
- **WHEN** query({ techBase: TechBase.INNER_SPHERE, weightClass: WeightClass.HEAVY }) is called
- **THEN** return only Inner Sphere heavy mechs

#### Scenario: Empty result

- **GIVEN** no units match the criteria
- **WHEN** query(impossible criteria) is called
- **THEN** return empty array

---

### Requirement: Custom Unit CRUD Operations

The system SHALL provide create, read, update, and delete operations for custom units via API.

**Rationale**: Users need to save their custom mech builds persistently with version tracking.

**Priority**: Critical

#### Scenario: Create custom unit

- **GIVEN** a valid IFullUnit object
- **WHEN** CustomUnitService.create(unit) is called
- **THEN** POST to /api/units/custom endpoint
- **AND** return the generated unique ID
- **AND** unit is stored as version 1

#### Scenario: Read custom unit

- **GIVEN** a custom unit exists with ID "custom-123"
- **WHEN** CustomUnitService.getById("custom-123") is called
- **THEN** GET from /api/units/custom/custom-123
- **AND** return the complete IFullUnit with version metadata

#### Scenario: Update custom unit (save)

- **GIVEN** a custom unit exists with ID "custom-123" at version 3
- **WHEN** CustomUnitService.save("custom-123", modifiedUnit) is called
- **THEN** PUT to /api/units/custom/custom-123
- **AND** increment version to 4
- **AND** store previous version in history

#### Scenario: Delete custom unit

- **GIVEN** a custom unit exists with ID "custom-123"
- **WHEN** CustomUnitService.delete("custom-123") is called
- **THEN** DELETE /api/units/custom/custom-123
- **AND** remove unit and all version history

---

### Requirement: Custom Unit Listing

The system SHALL list all custom units as index entries.

**Rationale**: Users need to browse their saved custom units.

**Priority**: High

#### Scenario: List all custom units

- **GIVEN** the user has saved 5 custom units
- **WHEN** CustomUnitService.list() is called
- **THEN** GET /api/units/custom
- **AND** return array of 5 UnitIndexEntry objects with version info

#### Scenario: Empty custom units

- **GIVEN** no custom units have been created
- **WHEN** CustomUnitService.list() is called
- **THEN** return empty array

---

### Requirement: Unit Search Initialization

The system SHALL initialize a full-text search index on startup.

**Rationale**: Fast search requires pre-built index structure.

**Priority**: High

#### Scenario: Initialize search

- **GIVEN** the application is starting
- **WHEN** UnitSearchService.initialize() is called
- **THEN** build MiniSearch index from canonical units
- **AND** add any existing custom units to the index

---

### Requirement: Full-Text Unit Search

The system SHALL search units by text query across name, chassis, and variant.

**Rationale**: Users need to quickly find units by name or partial match.

**Priority**: High

#### Scenario: Search by name

- **GIVEN** the search index is initialized
- **WHEN** search("Warhammer") is called
- **THEN** return units with "Warhammer" in name or chassis

#### Scenario: Fuzzy search

- **GIVEN** the search index is initialized
- **WHEN** search("Warhmmer") is called with typo
- **THEN** return Warhammer units via fuzzy matching

#### Scenario: No results

- **GIVEN** the search index is initialized
- **WHEN** search("xyznonexistent") is called
- **THEN** return empty array

---

### Requirement: Dynamic Search Index Updates

The system SHALL update the search index when custom units change.

**Rationale**: Custom units must be searchable immediately after creation.

**Priority**: Medium

#### Scenario: Add to index

- **GIVEN** a new custom unit is created
- **WHEN** addToIndex(unitEntry) is called
- **THEN** the unit is immediately searchable

#### Scenario: Remove from index

- **GIVEN** a custom unit is deleted
- **WHEN** removeFromIndex(id) is called
- **THEN** the unit no longer appears in search results

---

### Requirement: Unit Factory Service

The system SHALL convert ISerializedUnit data to runtime IBattleMech objects.

**Rationale**: JSON files store serialized data; runtime requires fully typed objects with calculated values.

**Priority**: Critical

#### Scenario: Create from serialized data

- **GIVEN** valid ISerializedUnit JSON data
- **WHEN** UnitFactoryService.createFromSerialized(data) is called
- **THEN** return IUnitFactoryResult with success=true and unit object
- **AND** unit SHALL be a complete IBattleMech

#### Scenario: Parse engine configuration

- **GIVEN** serialized engine { type: "XL", rating: 300 }
- **WHEN** converting to IBattleMech
- **THEN** parse engine type string to EngineType enum
- **AND** calculate engine weight based on type and rating
- **AND** populate IEngineConfiguration

#### Scenario: Parse gyro configuration

- **GIVEN** serialized gyro { type: "STANDARD" }
- **WHEN** converting to IBattleMech
- **THEN** parse gyro type string to GyroType enum
- **AND** calculate gyro weight based on engine rating
- **AND** populate IGyroConfiguration

#### Scenario: Build armor allocation

- **GIVEN** serialized armor with location values
- **WHEN** converting to IBattleMech
- **THEN** map string locations to MechLocation enum
- **AND** handle front/rear armor for torso locations
- **AND** populate IArmorAllocation

#### Scenario: Resolve equipment references

- **GIVEN** serialized equipment array with IDs
- **WHEN** converting to IBattleMech
- **THEN** resolve each equipment ID via EquipmentRegistry
- **AND** create IMountedEquipment for each item
- **AND** log warnings for unresolved equipment

#### Scenario: Build critical slots

- **GIVEN** serialized critical slots per location
- **WHEN** converting to IBattleMech
- **THEN** map string locations to MechLocation enum
- **AND** create ICriticalSlotAssignment for each location
- **AND** maintain correct slot counts (6 for head/legs, 12 for arms/torsos)

#### Scenario: Calculate derived values

- **GIVEN** a complete ISerializedUnit
- **WHEN** creating IBattleMech
- **THEN** calculate total weight from components
- **AND** determine weight class from tonnage
- **AND** calculate structure points per location

#### Scenario: Factory error handling

- **GIVEN** invalid or incomplete serialized data
- **WHEN** UnitFactoryService.createFromSerialized(data) is called
- **THEN** return IUnitFactoryResult with success=false
- **AND** include descriptive error messages
- **AND** unit SHALL be null

---

### Requirement: Era-Based Unit Organization

The system SHALL organize canonical units by era with numbered prefixes.

**Rationale**: Numbered prefixes ensure correct chronological sorting in file browsers and APIs.

**Priority**: High

#### Scenario: Era folder structure

- **GIVEN** units are stored in `public/data/units/battlemechs/`
- **WHEN** accessing the directory
- **THEN** era folders SHALL have numbered prefixes:
  - `1-age-of-war/`
  - `2-star-league/`
  - `3-succession-wars/`
  - `4-clan-invasion/`
  - `5-civil-war/`
  - `6-dark-age/`
  - `7-ilclan/`

#### Scenario: Rules level sub-folders

- **GIVEN** an era folder exists
- **WHEN** accessing units within the era
- **THEN** units SHALL be organized by rules level:
  - `standard/` - Rules Level 1
  - `advanced/` - Rules Level 2
  - `experimental/` - Rules Level 3

#### Scenario: Unit file naming

- **GIVEN** a unit with chassis "Atlas" and model "AS7-D"
- **WHEN** storing the unit file
- **THEN** filename SHALL be `Atlas AS7-D.json`
- **AND** invalid characters SHALL be replaced with `-`

---

### Requirement: Unit Index Structure

The system SHALL maintain a master index of all canonical units.

**Rationale**: Index enables fast browsing without loading full unit data.

**Priority**: Critical

#### Scenario: Master index location

- **GIVEN** units are stored in `public/data/units/battlemechs/`
- **WHEN** accessing the index
- **THEN** index SHALL be at `public/data/units/battlemechs/index.json`

#### Scenario: Index entry format

- **GIVEN** a unit in the index
- **THEN** entry SHALL contain:
  - `id` - Unique unit identifier (e.g., "atlas-as7-d")
  - `chassis` - Base chassis name (e.g., "Atlas")
  - `model` - Variant designation (e.g., "AS7-D")
  - `tonnage` - Unit weight in tons (e.g., 100)
  - `techBase` - INNER_SPHERE, CLAN, or MIXED
  - `year` - Introduction year (e.g., 2755)
  - `role` - Combat role (e.g., "Juggernaut")
  - `path` - Relative path to full JSON file

#### Scenario: Index metadata

- **GIVEN** the index.json file
- **THEN** metadata SHALL include:
  - `version` - Format version string
  - `generatedAt` - ISO timestamp of generation
  - `totalUnits` - Total count of units in index

---

### Requirement: MTF Import Service

The system SHALL import and validate pre-converted unit JSON data.

**Rationale**: Units converted from MTF format need validation and equipment resolution.

**Priority**: High

#### Scenario: Import from JSON

- **GIVEN** valid ISerializedUnit JSON data
- **WHEN** MTFImportService.importFromJSON(data) is called
- **THEN** validate the data structure
- **AND** resolve equipment references
- **AND** return IImportResult with success status

#### Scenario: Validate unit data

- **GIVEN** ISerializedUnit data
- **WHEN** MTFImportService.validate(data) is called
- **THEN** check required fields (id, chassis, model, tonnage)
- **AND** validate enum values (techBase, rulesLevel, era)
- **AND** return IValidationResult with errors array

#### Scenario: Resolve equipment

- **GIVEN** unit with equipment IDs
- **WHEN** MTFImportService.resolveEquipment(equipmentIds) is called
- **THEN** look up each ID in EquipmentRegistry
- **AND** return IEquipmentResolution with found and missing lists

---

### Requirement: Canonical Unit Protection

The system SHALL prevent overwriting canonical (official) units.

**Rationale**: Canonical units are read-only source data that must remain immutable.

**Priority**: Critical

#### Scenario: Save modified canonical unit

- **GIVEN** user has loaded and modified canonical unit "Atlas AS7-D"
- **WHEN** user attempts to save
- **THEN** system SHALL reject save with original name
- **AND** prompt for new name with suggested default

#### Scenario: Generate clone name

- **GIVEN** canonical unit "Atlas AS7-D" is being cloned
- **WHEN** generating default clone name
- **THEN** suggest "Atlas AS7-D-Custom-1"
- **AND** if that exists, suggest "Atlas AS7-D-Custom-2"
- **AND** continue incrementing until unique name found

#### Scenario: Detect canonical vs custom

- **GIVEN** a unit with ID
- **WHEN** checking if unit is canonical
- **THEN** return true if ID exists in canonical index
- **AND** return false otherwise

---

### Requirement: Version History Access

The system SHALL provide access to unit version history.

**Rationale**: Users need to view and potentially revert to previous versions.

**Priority**: High

#### Scenario: List version history

- **GIVEN** unit "custom-123" has 5 versions
- **WHEN** CustomUnitService.getVersionHistory("custom-123") is called
- **THEN** GET /api/units/custom/custom-123/versions
- **AND** return array of version metadata (version number, saved timestamp, notes)

#### Scenario: Get specific version

- **GIVEN** unit "custom-123" has version 3 in history
- **WHEN** CustomUnitService.getVersion("custom-123", 3) is called
- **THEN** GET /api/units/custom/custom-123/versions/3
- **AND** return full unit data as it was at version 3

---

### Requirement: Version Revert

The system SHALL allow reverting a unit to a previous version.

**Rationale**: Users may need to undo changes and restore earlier configurations.

**Priority**: High

#### Scenario: Revert to previous version

- **GIVEN** unit "custom-123" is at version 5
- **AND** version 3 exists in history
- **WHEN** CustomUnitService.revert("custom-123", 3) is called
- **THEN** POST /api/units/custom/custom-123/revert/3
- **AND** create new version 6 with data from version 3
- **AND** current version becomes 6 (not 3)

#### Scenario: Revert to non-existent version

- **GIVEN** unit "custom-123" only has versions 1-5
- **WHEN** CustomUnitService.revert("custom-123", 10) is called
- **THEN** return error "Version 10 not found"

---

### Requirement: JSON Export

The system SHALL export custom units as JSON files.

**Rationale**: Users need to share units and create backups.

**Priority**: High

#### Scenario: Export single unit

- **GIVEN** a custom unit "custom-123"
- **WHEN** CustomUnitService.export("custom-123") is called
- **THEN** GET /api/units/custom/custom-123/export
- **AND** return JSON file with ISerializedUnitEnvelope format
- **AND** filename defaults to "{chassis}-{variant}.json"

#### Scenario: Export envelope format

- **GIVEN** unit is being exported
- **THEN** envelope SHALL include:
  - formatVersion: schema version string
  - savedAt: ISO timestamp
  - application: "mekstation"
  - applicationVersion: current app version
  - unit: ISerializedUnit data

---

### Requirement: JSON Import

The system SHALL import units from JSON files.

**Rationale**: Users need to load shared units and restore backups.

**Priority**: High

#### Scenario: Import valid JSON

- **GIVEN** a valid unit JSON file
- **WHEN** CustomUnitService.import(file) is called
- **THEN** POST /api/units/import with file content
- **AND** validate JSON structure
- **AND** check for name conflicts
- **AND** create new custom unit with version 1

#### Scenario: Import with name conflict

- **GIVEN** a JSON file with unit named "Atlas Custom-1"
- **AND** a unit with that name already exists
- **WHEN** importing the file
- **THEN** prompt user to rename or skip
- **AND** suggest next available name "Atlas Custom-2"

#### Scenario: Import invalid JSON

- **GIVEN** an invalid or corrupted JSON file
- **WHEN** CustomUnitService.import(file) is called
- **THEN** return error with validation details
- **AND** do not create any unit

---

### Requirement: Save Shortcut Integration

The system SHALL support keyboard shortcut for quick save.

**Rationale**: Users expect Ctrl+S to save their work without dialogs.

**Priority**: Medium

#### Scenario: Save existing custom unit

- **GIVEN** user is editing custom unit "custom-123"
- **WHEN** user presses Ctrl+S
- **THEN** save current state as new version
- **AND** show brief save confirmation toast

#### Scenario: Save modified canonical unit

- **GIVEN** user is editing modified canonical unit
- **WHEN** user presses Ctrl+S
- **THEN** open Save As dialog with clone name suggestion
- **AND** require user to confirm new name

#### Scenario: Save new unsaved unit

- **GIVEN** user has created new unit not yet saved
- **WHEN** user presses Ctrl+S
- **THEN** open Save dialog to enter chassis/variant name
- **AND** create new custom unit on confirm

---

### Requirement: Unit Context Hook

The system SHALL provide a React hook for accessing the active unit context.

**Rationale**: Components need access to current unit state and operations without prop drilling.

**Priority**: Critical

**Source**: `src/hooks/useUnit.ts:1-180`

#### Scenario: Access active unit tab

- **GIVEN** a unit tab is active in the customizer
- **WHEN** useUnit() is called
- **THEN** return UnitContext with current tab data
- **AND** include isLoading, hasUnsavedChanges flags
- **AND** include allTabs array and activeTabId

#### Scenario: Create new unit

- **GIVEN** useUnit() hook is active
- **WHEN** createNewUnit(tonnage, techBase) is called
- **THEN** find matching UNIT_TEMPLATES entry
- **AND** create new tab with template data
- **AND** return new tab ID

#### Scenario: Duplicate current unit

- **GIVEN** an active unit tab exists
- **WHEN** duplicateCurrentUnit() is called
- **THEN** clone active tab state
- **AND** create new tab with cloned data
- **AND** return new tab ID

#### Scenario: Rename unit

- **GIVEN** an active unit tab exists
- **WHEN** renameUnit(name) is called
- **THEN** update active tab name
- **AND** mark tab as modified

#### Scenario: Mark modified

- **GIVEN** an active unit tab exists
- **WHEN** markModified() is called
- **THEN** set isModified flag to true
- **AND** update lastModifiedAt timestamp

#### Scenario: Mark saved

- **GIVEN** an active unit tab exists with unsaved changes
- **WHEN** markSaved() is called
- **THEN** set isModified flag to false
- **AND** clear unsaved changes indicator

---

### Requirement: Unit Calculations Hook

The system SHALL compute derived values from component selections.

**Rationale**: Weight, slots, heat, and movement calculations must stay synchronized with component changes.

**Priority**: Critical

**Source**: `src/hooks/useUnitCalculations.ts:1-244`

#### Scenario: Calculate engine weight

- **GIVEN** engine type and rating are selected
- **WHEN** useUnitCalculations(tonnage, selections) is called
- **THEN** calculate engine weight via calculateEngineWeight()
- **AND** return engineWeight in UnitCalculations

#### Scenario: Calculate gyro weight

- **GIVEN** gyro type and engine rating are selected
- **WHEN** useUnitCalculations() is called
- **THEN** calculate gyro weight via calculateGyroWeight()
- **AND** return gyroWeight in UnitCalculations

#### Scenario: Calculate heat sink weight

- **GIVEN** heat sink type and count are selected
- **WHEN** useUnitCalculations() is called
- **THEN** calculate integral heat sinks (engine-integrated)
- **AND** calculate external heat sinks (count - integral)
- **AND** apply weight only to heat sinks beyond first 10
- **AND** return heatSinkWeight in UnitCalculations

#### Scenario: Calculate armor weight

- **GIVEN** armor tonnage is set by user
- **WHEN** useUnitCalculations(tonnage, selections, armorTonnage) is called
- **THEN** use armorTonnage directly (not calculated from points)
- **AND** return armorWeight in UnitCalculations

#### Scenario: Calculate jump jet weight

- **GIVEN** jump MP and jump jet type are selected
- **WHEN** useUnitCalculations() is called
- **THEN** calculate jump jet weight via calculateJumpJetWeight()
- **AND** calculate jump jet slots via calculateJumpJetSlots()
- **AND** return jumpJetWeight and jumpJetSlots

#### Scenario: Calculate total structural weight

- **GIVEN** all component selections are made
- **WHEN** useUnitCalculations() is called
- **THEN** sum engine + gyro + structure + cockpit + heat sinks + armor + jump jets
- **AND** return totalStructuralWeight

#### Scenario: Calculate critical slots

- **GIVEN** all component selections are made
- **WHEN** useUnitCalculations() is called
- **THEN** calculate engine slots (CT + side torsos)
- **AND** calculate gyro slots
- **AND** calculate cockpit slots (head + other)
- **AND** calculate actuator slots (16 fixed)
- **AND** return totalSystemSlots (excludes equipment array items)

#### Scenario: Calculate movement points

- **GIVEN** engine rating and tonnage are selected
- **WHEN** useUnitCalculations() is called
- **THEN** calculate walkMP = floor(rating / tonnage)
- **AND** calculate runMP = ceil(walkMP × 1.5)
- **AND** return walkMP, runMP, jumpMP

#### Scenario: Calculate heat dissipation

- **GIVEN** heat sink type and count are selected
- **WHEN** useUnitCalculations() is called
- **THEN** calculate dissipation per sink from heat sink definition
- **AND** calculate totalHeatDissipation = count × dissipation
- **AND** return integralHeatSinks, externalHeatSinks, totalHeatDissipation

---

### Requirement: Unit Validation Hook

The system SHALL provide real-time validation with debouncing.

**Rationale**: Validation must run automatically but not on every keystroke to avoid performance issues.

**Priority**: Critical

**Source**: `src/hooks/useUnitValidation.ts:1-452`

#### Scenario: Initialize validation rules

- **GIVEN** useUnitValidation() is called for first time
- **WHEN** component mounts
- **THEN** call initializeUnitValidationRules() once
- **AND** set hasInitialized flag to prevent re-initialization

#### Scenario: Debounce validation

- **GIVEN** user is making rapid changes to unit
- **WHEN** component selections change
- **THEN** set isValidating flag to true
- **AND** debounce validation snapshot by 300ms (default)
- **AND** clear isValidating flag when debounced snapshot updates

#### Scenario: Build validatable unit

- **GIVEN** debounced snapshot is ready
- **WHEN** validation runs
- **THEN** extract metadata, weightData, armorData, equipmentData, structureData
- **AND** build IValidatableUnit object
- **AND** call validateUnit() from UnitValidationOrchestrator

#### Scenario: Map validation result

- **GIVEN** validation completes successfully
- **WHEN** result is returned
- **THEN** count critical errors separately from regular errors
- **AND** map to ValidationStatus (error/warning/info/valid)
- **AND** return UnitValidationState with status, counts, isValid, hasCriticalErrors

#### Scenario: Handle validation error

- **GIVEN** validation throws exception
- **WHEN** error is caught
- **THEN** log warning via logger
- **AND** return error state with errorCount=1, hasCriticalErrors=true

#### Scenario: Disable validation

- **GIVEN** useUnitValidation({ disabled: true }) is called
- **WHEN** validation runs
- **THEN** return DEFAULT_STATE immediately
- **AND** skip validation logic

#### Scenario: Custom debounce delay

- **GIVEN** useUnitValidation({ debounceMs: 500 }) is called
- **WHEN** component selections change
- **THEN** debounce validation by 500ms instead of default 300ms

---

### Requirement: Unit Store Architecture

The system SHALL provide a Zustand store with context provider and action slices.

**Rationale**: Unit state management requires isolated stores per unit with domain-specific action slices.

**Priority**: Critical

**Source**: `src/stores/useUnitStore.ts:1-19`, `src/stores/unit/useUnitStore.ts:1-140`

#### Scenario: Create unit store

- **GIVEN** initial UnitState is provided
- **WHEN** createUnitStore(initialState) is called
- **THEN** create Zustand store with persist middleware
- **AND** compose armor, equipment, structure, tech base action slices
- **AND** configure persistence with name `megamek-unit-${id}`
- **AND** return StoreApi<UnitStore>

#### Scenario: Create new unit store

- **GIVEN** CreateUnitOptions are provided
- **WHEN** createNewUnitStore(options) is called
- **THEN** call createDefaultUnitState(options)
- **AND** call createUnitStore(initialState)
- **AND** return StoreApi<UnitStore>

#### Scenario: Use unit store in component

- **GIVEN** component is wrapped in UnitStoreProvider
- **WHEN** useUnitStore(selector) is called
- **THEN** get store from UnitStoreContext
- **AND** throw error if context is null
- **AND** return selected state via useStore(store, selector)

#### Scenario: Access store API

- **GIVEN** component is wrapped in UnitStoreProvider
- **WHEN** useUnitStoreApi() is called
- **THEN** get store from UnitStoreContext
- **AND** throw error if context is null
- **AND** return StoreApi<UnitStore>

#### Scenario: Persist unit state

- **GIVEN** unit store is created with persist middleware
- **WHEN** state changes
- **THEN** serialize partialize() fields to localStorage
- **AND** use clientSafeStorage for SSR safety
- **AND** skip hydration (manual hydration via registry)

---

### Requirement: Unit Store Action Slices

The system SHALL decompose unit actions into domain-specific slices.

**Rationale**: Large stores become unmaintainable; slices provide clear separation of concerns.

**Priority**: High

**Source**: `src/stores/unit/useUnitArmorStore.ts:1-100`, `src/stores/unit/useUnitEquipmentStore.ts:1-100`, `src/stores/unit/useUnitStructureStore.ts:1-100`

#### Scenario: Armor slice actions

- **GIVEN** armor slice is composed into unit store
- **WHEN** setArmorTonnage(tonnage) is called
- **THEN** clamp tonnage to >= 0
- **AND** set isModified flag and lastModifiedAt timestamp

#### Scenario: Set location armor

- **GIVEN** armor slice is active
- **WHEN** setLocationArmor(location, front, rear) is called
- **THEN** clamp front armor to [0, maxArmor]
- **AND** clamp rear armor to [0, maxArmor - front] for torso locations
- **AND** update armorAllocation object

#### Scenario: Auto-allocate armor

- **GIVEN** armor tonnage is set
- **WHEN** autoAllocateArmor() is called
- **THEN** calculate available points from armor tonnage
- **AND** call calculateOptimalArmorAllocation()
- **AND** update armorAllocation with optimal distribution

#### Scenario: Equipment slice actions

- **GIVEN** equipment slice is composed into unit store
- **WHEN** addEquipment(item) is called
- **THEN** create IMountedEquipmentInstance with unique ID
- **AND** recalculate targeting computers if item is weapon
- **AND** append to equipment array

#### Scenario: Remove equipment

- **GIVEN** equipment instance exists
- **WHEN** removeEquipment(instanceId) is called
- **THEN** filter out instance from equipment array
- **AND** recalculate targeting computers if removed item was weapon

#### Scenario: Update equipment location

- **GIVEN** equipment instance exists
- **WHEN** updateEquipmentLocation(instanceId, location, slots) is called
- **THEN** find instance in equipment array
- **AND** update location and slots fields
- **AND** set isModified flag

#### Scenario: Link ammo to weapon

- **GIVEN** weapon and ammo instances exist
- **WHEN** linkAmmo(weaponInstanceId, ammoInstanceId) is called
- **THEN** update weapon instance with linkedAmmoId
- **AND** set isModified flag

#### Scenario: Structure slice actions

- **GIVEN** structure slice is composed into unit store
- **WHEN** setEngineType(type) is called
- **THEN** check for equipment displacement via getEquipmentDisplacedByEngineChange()
- **AND** apply displacement via applyDisplacement()
- **AND** update engineType

#### Scenario: Set gyro type

- **GIVEN** structure slice is active
- **WHEN** setGyroType(type) is called
- **THEN** check for equipment displacement via getEquipmentDisplacedByGyroChange()
- **AND** apply displacement via applyDisplacement()
- **AND** update gyroType

#### Scenario: Set heat sink count

- **GIVEN** structure slice is active
- **WHEN** setHeatSinkCount(count) is called
- **THEN** filter out existing heat sink equipment
- **AND** create new heat sink equipment list via createHeatSinkEquipmentList()
- **AND** append to equipment array

#### Scenario: Set jump MP

- **GIVEN** structure slice is active
- **WHEN** setJumpMP(jumpMP) is called
- **THEN** clamp jumpMP to [0, maxJumpMP]
- **AND** filter out existing jump jet equipment
- **AND** create new jump jet equipment list via createJumpJetEquipmentList()
- **AND** append to equipment array

---

## Data Model Requirements

### UnitContext

**Source**: `src/hooks/useUnit.ts:27-50`

```typescript
interface UnitContext {
  // Current unit tab
  readonly tab: UnitTab | null;
  readonly isLoading: boolean;
  readonly hasUnsavedChanges: boolean;

  // All tabs
  readonly allTabs: readonly UnitTab[];
  readonly activeTabId: string | null;

  // Actions
  readonly selectTab: (tabId: string) => void;
  readonly createNewUnit: (tonnage: number, techBase?: TechBase) => string;
  readonly duplicateCurrentUnit: () => string | null;
  readonly closeTab: (tabId: string) => void;
  readonly renameUnit: (name: string) => void;
  readonly markModified: () => void;
  readonly markSaved: () => void;

  // Modal state
  readonly isNewTabModalOpen: boolean;
  readonly openNewTabModal: () => void;
  readonly closeNewTabModal: () => void;
}
```

**Requirements**:

- All fields SHALL be readonly to prevent external mutation
- `tab` SHALL be null when no unit is active
- `allTabs` SHALL be readonly array of all open unit tabs
- `activeTabId` SHALL be null when no tab is selected
- `createNewUnit()` SHALL return new tab ID
- `duplicateCurrentUnit()` SHALL return null if no active tab

---

### IComponentSelections

**Source**: `src/stores/useMultiUnitStore.ts` (referenced in `src/hooks/useUnitCalculations.ts:12`)

```typescript
interface IComponentSelections {
  engineType: EngineType;
  engineRating: number;
  gyroType: GyroType;
  internalStructureType: InternalStructureType;
  cockpitType: CockpitType;
  heatSinkType: HeatSinkType;
  heatSinkCount: number;
  armorType: ArmorTypeEnum;
  jumpMP?: number;
  jumpJetType?: JumpJetType;
}
```

**Requirements**:

- All structural component selections SHALL be included
- `engineRating` SHALL be positive integer
- `heatSinkCount` SHALL be >= 10 (minimum requirement)
- `jumpMP` SHALL be optional (0 if not jumping)
- `jumpJetType` SHALL be optional (defaults to STANDARD)

---

### UnitCalculations

**Source**: `src/hooks/useUnitCalculations.ts:37-67`

```typescript
interface UnitCalculations {
  // Weights
  engineWeight: number;
  gyroWeight: number;
  structureWeight: number;
  cockpitWeight: number;
  heatSinkWeight: number;
  armorWeight: number;
  jumpJetWeight: number;
  totalStructuralWeight: number;

  // Critical Slots
  engineSlots: number;
  gyroSlots: number;
  structureSlots: number;
  cockpitSlots: number;
  heatSinkSlots: number;
  armorSlots: number;
  jumpJetSlots: number;
  totalSystemSlots: number;

  // Heat
  integralHeatSinks: number;
  externalHeatSinks: number;
  totalHeatDissipation: number;

  // Movement
  walkMP: number;
  runMP: number;
  jumpMP: number;
}
```

**Requirements**:

- All weight values SHALL be in tons (fractional allowed)
- All slot values SHALL be non-negative integers
- `totalStructuralWeight` SHALL equal sum of all component weights
- `totalSystemSlots` SHALL exclude equipment array items (only fixed systems)
- `integralHeatSinks` SHALL be floor(engineRating / 25)
- `externalHeatSinks` SHALL be max(0, heatSinkCount - integralHeatSinks)
- `walkMP` SHALL be floor(engineRating / tonnage)
- `runMP` SHALL be ceil(walkMP × 1.5)

---

### IValidatableUnit

**Source**: `src/types/validation/UnitValidationInterfaces.ts` (referenced in `src/hooks/useUnitValidation.ts:18`)

```typescript
interface IValidatableUnit {
  // Identity
  id: string;
  name: string;
  unitType: UnitType;
  techBase: TechBase;
  rulesLevel: RulesLevel;
  era: Era;
  introductionYear?: number;
  extinctionYear?: number;

  // Economics
  weight: number;
  cost?: number;
  battleValue?: number;

  // Components
  engineType: EngineType;
  gyroType: GyroType;
  cockpitType: CockpitType;
  internalStructureType: InternalStructureType;
  heatSinkCount: number;
  heatSinkType: HeatSinkType;

  // Armor
  totalArmorPoints: number;
  maxArmorPoints: number;
  armorByLocation: Record<MechLocation, number>;

  // Weight validation
  allocatedWeight: number;
  maxWeight: number;

  // Slot validation
  slotsByLocation: Record<MechLocation, number>;
}
```

**Requirements**:

- All required fields SHALL be present for validation
- `weight` SHALL equal `maxWeight` for valid units
- `allocatedWeight` SHALL not exceed `maxWeight`
- `totalArmorPoints` SHALL not exceed `maxArmorPoints`
- `armorByLocation` SHALL contain entries for all valid locations
- `slotsByLocation` SHALL contain slot counts per location

---

### IUnitValidationResult

**Source**: `src/types/validation/UnitValidationInterfaces.ts` (referenced in `src/hooks/useUnitValidation.ts:20`)

```typescript
interface IUnitValidationResult {
  isValid: boolean;
  hasCriticalErrors: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  results: IUnitValidationRuleResult[];
}

interface IUnitValidationRuleResult {
  ruleId: string;
  passed: boolean;
  errors: IUnitValidationError[];
  warnings: IUnitValidationWarning[];
  infos: IUnitValidationInfo[];
}

interface IUnitValidationError {
  ruleId: string;
  severity: UnitValidationSeverity;
  message: string;
  details?: Record<string, unknown>;
}

enum UnitValidationSeverity {
  CRITICAL_ERROR = 'critical_error',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}
```

**Requirements**:

- `isValid` SHALL be true only if errorCount === 0 and hasCriticalErrors === false
- `hasCriticalErrors` SHALL be true if any error has severity CRITICAL_ERROR
- `errorCount` SHALL include both CRITICAL_ERROR and ERROR severities
- `results` SHALL contain one entry per validation rule executed
- Each `IUnitValidationRuleResult` SHALL include ruleId and passed flag
- `errors`, `warnings`, `infos` arrays SHALL be empty if rule passed

---

### UnitValidationState

**Source**: `src/hooks/useUnitValidation.ts:36-55`

```typescript
interface UnitValidationState {
  /** Overall validation status for badge display */
  status: ValidationStatus;
  /** Number of critical and regular errors */
  errorCount: number;
  /** Number of warnings */
  warningCount: number;
  /** Number of info messages */
  infoCount: number;
  /** Whether the unit is fully valid (no errors) */
  isValid: boolean;
  /** Whether validation has critical errors (prevents save/export) */
  hasCriticalErrors: boolean;
  /** Full validation result for detailed display */
  result: IUnitValidationResult | null;
  /** Whether validation is still initializing */
  isLoading: boolean;
  /** Whether validation is pending (during debounce period) */
  isValidating: boolean;
}

type ValidationStatus = 'valid' | 'error' | 'warning' | 'info';
```

**Requirements**:

- `status` SHALL be 'error' if errorCount > 0 or hasCriticalErrors === true
- `status` SHALL be 'warning' if errorCount === 0 and warningCount > 0
- `status` SHALL be 'info' if errorCount === 0 and warningCount === 0 and infoCount > 0
- `status` SHALL be 'valid' if all counts are 0
- `isValid` SHALL be true only if errorCount === 0 and hasCriticalErrors === false
- `isLoading` SHALL be true during initial rule initialization
- `isValidating` SHALL be true during debounce period
- `result` SHALL be null if validation has not run yet

---

### UnitStore Architecture

**Source**: `src/stores/unit/useUnitStore.ts:1-140`, `src/stores/unitState.ts`

```typescript
// Store factory
function createUnitStore(initialState: UnitState): StoreApi<UnitStore>;
function createNewUnitStore(options: CreateUnitOptions): StoreApi<UnitStore>;

// Context provider
const UnitStoreContext: Context<StoreApi<UnitStore> | null>;
function useUnitStore<T>(selector: (state: UnitStore) => T): T;
function useUnitStoreApi(): StoreApi<UnitStore>;

// Action slices
interface UnitArmorActions {
  setArmorTonnage: (tonnage: number) => void;
  setLocationArmor: (
    location: MechLocation,
    front: number,
    rear?: number,
  ) => void;
  autoAllocateArmor: () => void;
  maximizeArmor: () => void;
  clearAllArmor: () => void;
}

interface UnitEquipmentActions {
  addEquipment: (item: IEquipmentItem) => string;
  removeEquipment: (instanceId: string) => void;
  updateEquipmentLocation: (
    instanceId: string,
    location: MechLocation,
    slots: readonly number[],
  ) => void;
  bulkUpdateEquipmentLocations: (
    updates: ReadonlyArray<{
      instanceId: string;
      location: MechLocation;
      slots: readonly number[];
    }>,
  ) => void;
  clearEquipmentLocation: (instanceId: string) => void;
  setEquipmentRearMounted: (instanceId: string, isRearMounted: boolean) => void;
  linkAmmo: (
    weaponInstanceId: string,
    ammoInstanceId: string | undefined,
  ) => void;
  clearAllEquipment: () => void;
}

interface UnitStructureActions {
  // Identity
  setName: (name: string) => void;
  setChassis: (chassis: string) => void;
  setModel: (model: string) => void;
  setYear: (year: number) => void;
  setRulesLevel: (rulesLevel: RulesLevel) => void;

  // Components (with cascade/displacement)
  setEngineType: (type: EngineType) => void;
  setEngineRating: (rating: number) => void;
  setGyroType: (type: GyroType) => void;
  setInternalStructureType: (type: InternalStructureType) => void;
  setCockpitType: (type: CockpitType) => void;
  setHeatSinkType: (type: HeatSinkType) => void;
  setHeatSinkCount: (count: number) => void;
  setArmorType: (type: ArmorTypeEnum) => void;
  setJumpMP: (jumpMP: number) => void;
  setJumpJetType: (jumpJetType: JumpJetType) => void;

  // Metadata
  markModified: (modified?: boolean) => void;
}

interface UnitTechBaseActions {
  setTechBaseMode: (mode: TechBaseMode) => void;
  setComponentTechBase: (
    component: ComponentCategory,
    techBase: TechBase,
  ) => void;
  // ... selection memory actions
}

type UnitStore = UnitState &
  UnitArmorActions &
  UnitEquipmentActions &
  UnitStructureActions &
  UnitTechBaseActions;
```

**Requirements**:

- `createUnitStore()` SHALL compose all 4 action slices
- `createUnitStore()` SHALL configure persist middleware with `megamek-unit-${id}` name
- `createUnitStore()` SHALL use clientSafeStorage for SSR safety
- `createUnitStore()` SHALL skip hydration (manual via registry)
- `useUnitStore()` SHALL throw error if called outside UnitStoreProvider
- `useUnitStoreApi()` SHALL throw error if called outside UnitStoreProvider
- All action slices SHALL set `isModified: true` and `lastModifiedAt: Date.now()` on state changes
- Equipment actions SHALL recalculate targeting computers when weapons change
- Structure actions SHALL check for equipment displacement when engine/gyro changes

---

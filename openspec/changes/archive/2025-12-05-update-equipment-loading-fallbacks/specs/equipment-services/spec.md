## ADDED Requirements

### Requirement: Equipment Loader Initialization State

The EquipmentLoaderService SHALL track its loading state and provide status information.

**Rationale**: Consumers need to know if equipment data is available before querying.

**Priority**: High

#### Scenario: Check loaded state

- **GIVEN** the equipment loader has been instantiated
- **WHEN** calling `getIsLoaded()`
- **THEN** return `true` if `loadOfficialEquipment()` completed successfully
- **AND** return `false` before loading or if loading failed

#### Scenario: Get total count

- **GIVEN** the equipment loader has loaded data
- **WHEN** calling `getTotalCount()`
- **THEN** return sum of all loaded equipment items across all categories

#### Scenario: Get load errors

- **GIVEN** the equipment loader attempted to load data
- **WHEN** calling `getLoadErrors()`
- **THEN** return array of error messages from failed file loads
- **AND** return empty array if no errors occurred

---

### Requirement: Equipment Lookup Service Initialization

The EquipmentLookupService SHALL support async initialization and track data source.

**Rationale**: Service must coordinate JSON loading and fallback selection.

**Priority**: High

#### Scenario: Initialize service

- **GIVEN** a new EquipmentLookupService instance
- **WHEN** calling `initialize()`
- **THEN** system SHALL attempt to load from EquipmentLoaderService
- **AND** system SHALL be idempotent (subsequent calls return same promise)
- **AND** system SHALL set `initialized` flag to true when complete

#### Scenario: Check initialization state

- **GIVEN** the lookup service exists
- **WHEN** calling `isInitialized()`
- **THEN** return `true` if `initialize()` has completed
- **AND** return `false` if not yet initialized

#### Scenario: Get data source

- **GIVEN** the lookup service has initialized
- **WHEN** calling `getDataSource()`
- **THEN** return `'json'` if JSON loader provided sufficient items (≥100)
- **AND** return `'fallback'` if using hardcoded fallback data

#### Scenario: Get load result

- **GIVEN** the lookup service has initialized
- **WHEN** calling `getLoadResult()`
- **THEN** return the IEquipmentLoadResult from the loader
- **AND** return null if not yet initialized

---

### Requirement: Equipment Lookup Fallback Behavior

Equipment utility functions SHALL fall back to hardcoded definitions when JSON data is unavailable.

**Rationale**: Construction utilities must work immediately without waiting for async loading.

**Priority**: Critical

#### Scenario: Heat sink equipment lookup

- **GIVEN** heat sink equipment is requested
- **WHEN** calling `getHeatSinkEquipment(type)`
- **THEN** system SHALL first try `equipmentLoaderService.getMiscEquipmentById(id)`
- **AND** if not found, return from `HEAT_SINK_FALLBACKS[id]`
- **AND** fallback SHALL include all standard heat sink types

#### Scenario: Jump jet equipment lookup

- **GIVEN** jump jet equipment is requested
- **WHEN** calling `getJumpJetEquipment(tonnage, type)`
- **THEN** system SHALL first try `equipmentLoaderService.getMiscEquipmentById(id)`
- **AND** if not found, return from `JUMP_JET_FALLBACKS[id]`
- **AND** fallback SHALL include light/medium/heavy standard and improved jets

#### Scenario: Targeting computer equipment lookup

- **GIVEN** targeting computer equipment is requested
- **WHEN** calling `getTargetingComputerEquipment(techBase)`
- **THEN** system SHALL first try `equipmentLoaderService.getElectronicsById(id)`
- **AND** if not found, return from `TARGETING_COMPUTER_FALLBACKS[id]`
- **AND** fallback SHALL include IS and Clan targeting computers

#### Scenario: Enhancement equipment lookup

- **GIVEN** movement enhancement equipment is requested (MASC, TSM, Supercharger)
- **WHEN** calling `getEnhancementEquipment(type, techBase)`
- **THEN** system SHALL first try `equipmentLoaderService.getMiscEquipmentById(id)`
- **AND** if not found, return from `ENHANCEMENT_FALLBACKS[id]`
- **AND** fallback SHALL include MASC (IS/Clan), TSM, and Supercharger

---

### Requirement: Equipment Filter Functions with Hardcoded IDs

Equipment filter functions SHALL use hardcoded ID lists for filtering equipment from unit loadouts.

**Rationale**: Filter functions need to identify equipment types without async loading.

**Priority**: High

#### Scenario: Filter out heat sinks

- **GIVEN** a unit's equipment list
- **WHEN** calling `filterOutHeatSinks(equipment)`
- **THEN** system SHALL use `HEAT_SINK_EQUIPMENT_IDS` constant
- **AND** constant SHALL include all heat sink IDs
- **AND** return equipment array without heat sink entries

#### Scenario: Filter out jump jets

- **GIVEN** a unit's equipment list
- **WHEN** calling `filterOutJumpJets(equipment)`
- **THEN** system SHALL use `JUMP_JET_EQUIPMENT_IDS` constant
- **AND** constant SHALL include all jump jet IDs
- **AND** return equipment array without jump jet entries

#### Scenario: Filter out targeting computers

- **GIVEN** a unit's equipment list
- **WHEN** calling `filterOutTargetingComputer(equipment)`
- **THEN** system SHALL use `TARGETING_COMPUTER_IDS` constant
- **AND** constant SHALL include IS and Clan targeting computer IDs
- **AND** return equipment array without targeting computer entries

#### Scenario: Filter out enhancements

- **GIVEN** a unit's equipment list
- **WHEN** calling `filterOutEnhancementEquipment(equipment)`
- **THEN** system SHALL use `ENHANCEMENT_EQUIPMENT_IDS` constant
- **AND** constant SHALL include MASC, TSM, and Supercharger IDs
- **AND** return equipment array without enhancement entries

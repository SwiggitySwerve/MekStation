# Tasks: Add OmniMech Support

## Phase 1: Data Model (Foundation) - COMPLETED

### 1.1 Type Definitions

- [x] Add `baseChassisHeatSinks: number` to `UnitState` interface in `src/stores/unitState.ts`
- [x] Add `isOmniPodMounted: boolean` to `IMountedEquipmentInstance` interface
- [x] Add `setBaseChassisHeatSinks` action to `UnitActions` interface
- [x] Add `clanName` field to unit metadata (for Clan reporting names)
- [x] Update `IOmniMech` interface with required fields in `BattleMechInterfaces.ts`

### 1.2 Store Implementation

- [x] Implement `setBaseChassisHeatSinks` action in `useUnitStore.ts`
- [x] Add `setClanName` action for Clan reporting name
- [x] Update equipment mounting to track `isOmniPodMounted` status
- [x] Add `resetChassis()` action to remove all pod-mounted equipment
- [x] Add initial state defaults for new OmniMech fields

### 1.3 Helper Functions

- [x] Create `canPodMount(unit, equipment)` function in new `src/utils/omnimech/` directory
- [x] Create `calculatePodSpace(unit, location)` function
- [x] Create `getFixedEquipment(unit)` and `getPodEquipment(unit)` helpers
- [x] Add unit tests for all helper functions

## Phase 2: MTF Parsing/Export - COMPLETED

### 2.1 MTF Parser Updates

- [x] Parse `Base Chassis Heat Sinks:` field from MTF files
- [x] Parse `clanname:` field for Clan reporting name
- [x] Detect and strip `(omnipod)` suffix from equipment lines
- [x] Set `isOmniPodMounted` based on presence of `(omnipod)` marker
- [x] Add tests for OmniMech MTF parsing with real Mad Cat/Dire Wolf files

### 2.2 MTF Export Updates

- [x] Export `Base Chassis Heat Sinks:` when `isOmni === true`
- [x] Export `clanname:` when present
- [x] Append `(omnipod)` suffix to pod-mounted equipment in export
- [x] Add tests for OmniMech MTF export round-trip

### 2.3 Unit Loader Updates

- [x] Set `baseChassisHeatSinks` from parsed MTF data
- [x] Set `clanName` from parsed MTF data
- [x] Preserve `isOmniPodMounted` flags through load/save cycle

## Phase 3: UI Controls - COMPLETED

### 3.1 Overview Tab - OmniMech Checkbox

- [x] Add "OmniMech" checkbox to chassis configuration section
- [x] Wire checkbox to `setIsOmni` action
- [x] Implement cascade effects when toggling OmniMech status
- [x] Show/hide OmniMech-specific controls based on `isOmni` state

### 3.2 Structure Tab - Base Heat Sinks

- [x] Add "Base Chassis Heat Sinks" label and spinner control
- [x] Set spinner min=-1 (auto), max=total heat sinks
- [x] Wire spinner to `setBaseChassisHeatSinks` action
- [x] Only visible when `isOmni === true`

### 3.3 Overview Tab - Reset Chassis

- [x] Add "Reset Chassis" button next to OmniMech checkbox
- [x] Wire button to `resetChassis` action
- [x] Add confirmation dialog before clearing pod equipment
- [x] Only visible when `isOmni === true`

### 3.4 Critical Slots Display Updates

- [x] Show "(Fixed)" indicator for fixed equipment in critical slots
- [x] Show "(Pod)" indicator for pod equipment in critical slots
- [x] Prevent drag/removal of fixed equipment when in OmniMech mode
- [x] Apply visual distinction (60% opacity) for fixed equipment
- [x] Show fixed/pod indicators in GlobalLoadoutTray (equipment list)

## Phase 4: Validation Rules - COMPLETED

### 4.1 Heat Sink Validation

- [x] Create `OmniMechBaseHeatSinksRule` validation rule
- [x] Validate: base chassis heat sinks <= total heat sinks
- [x] Create `OmniMechBaseHeatSinksValidRule` for value validation
- [x] Add to configuration validation rules

### 4.2 Fixed Equipment Validation

- [x] Create `OmniMechFixedEquipmentRule` validation rule
- [x] Warn if no fixed equipment defined for OmniMech

### 4.3 Integration

- [x] Register OmniMech validation rules in `ConfigurationValidationRules.ts`
- [x] Add `isOmni` condition to rule applicability
- [x] Add unit tests for all OmniMech validation rules

## Phase 5: Documentation & Polish - COMPLETED

### 5.1 Spec Updates

- [x] Create `openspec/specs/omnimech-system/spec.md` with requirements
- [x] Update `serialization-formats` spec with OmniMech fields
- [x] Update `heat-sink-system` spec with base chassis concept
- [x] Update `equipment-placement` spec with pod mounting rules

### 5.2 Testing

- [x] Add integration tests loading real OmniMech MTF files (MTFParserService tests)
- [x] Test round-trip: load OmniMech → edit → save → reload (MTFExportService round-trip tests)
- [x] Test variant workflow: load Prime → reset chassis → configure A variant (MTFExportService variant workflow tests)

### 5.3 Archive Change

- [x] Run `openspec archive add-omnimech-support` after deployment

## Dependencies

- Phase 2 depends on Phase 1 (data model must exist before parsing)
- Phase 3 depends on Phase 1 (UI needs store actions)
- Phase 4 depends on Phase 1 (validation needs type definitions)
- Phases 2, 3, 4 can run in parallel after Phase 1

## Parallelizable Work

After Phase 1 completes:

- **Stream A**: MTF parsing/export (Phase 2) - COMPLETED
- **Stream B**: UI controls (Phase 3) - COMPLETED
- **Stream C**: Validation rules (Phase 4) - COMPLETED

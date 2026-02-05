# omnimech-system Specification

## Purpose

Defines OmniMech-specific functionality including the distinction between fixed and pod-mounted equipment, base chassis heat sinks, and variant configuration workflows. OmniMechs are modular BattleMechs that allow rapid equipment reconfiguration while maintaining a fixed base chassis.

## Requirements

### Requirement: OmniMech Unit Flag

The system SHALL track whether a unit is an OmniMech via the `isOmni` flag.

**Rationale**: OmniMechs have different construction and configuration rules than standard BattleMechs.

**Priority**: Critical

#### Scenario: OmniMech detection from flag

- **GIVEN** a unit with `isOmni: true`
- **THEN** the unit SHALL be treated as an OmniMech
- **AND** OmniMech-specific UI controls SHALL be displayed
- **AND** OmniMech validation rules SHALL apply

#### Scenario: OmniMech detection from MTF Config

- **GIVEN** an MTF file with Config field containing "Omnimech"
- **WHEN** parsing the file
- **THEN** `isOmni` SHALL be set to true
- **AND** configuration SHALL be normalized (e.g., "Biped Omnimech" -> "Biped")

#### Scenario: Standard BattleMech (non-OmniMech)

- **GIVEN** a unit with `isOmni: false` or undefined
- **THEN** the unit SHALL be treated as a standard BattleMech
- **AND** OmniMech-specific controls SHALL be hidden

---

### Requirement: Fixed vs Pod-Mounted Equipment

OmniMech equipment SHALL be classified as either fixed (base chassis) or pod-mounted.

**Rationale**: Fixed equipment is permanent to the chassis; pod equipment can be swapped between variants.

**Priority**: Critical

#### Scenario: Fixed equipment characteristics

- **GIVEN** equipment with `isOmniPodMounted: false`
- **THEN** equipment SHALL be considered fixed to the base chassis
- **AND** equipment SHALL NOT be removable in OmniMech mode
- **AND** equipment SHALL be displayed with 60% opacity visual distinction
- **AND** equipment SHALL show "(Fixed)" suffix in displays

#### Scenario: Pod-mounted equipment characteristics

- **GIVEN** equipment with `isOmniPodMounted: true`
- **THEN** equipment SHALL be considered pod-mounted
- **AND** equipment MAY be removed and replaced
- **AND** equipment SHALL show "(Pod)" suffix in displays
- **AND** equipment SHALL be cleared during chassis reset

#### Scenario: Equipment mounting in MTF format

- **GIVEN** an OmniMech MTF file
- **WHEN** equipment line contains "(omnipod)" suffix
- **THEN** `isOmniPodMounted` SHALL be set to true
- **AND** "(omnipod)" SHALL be stripped from equipment name

#### Scenario: Equipment export to MTF format

- **GIVEN** an OmniMech being exported
- **WHEN** equipment has `isOmniPodMounted: true`
- **THEN** "(omnipod)" suffix SHALL be appended to equipment name
- **AND** fixed equipment SHALL NOT have the suffix

---

### Requirement: Base Chassis Heat Sinks

OmniMechs SHALL track base chassis heat sink count separately from total heat sinks.

**Rationale**: Base chassis heat sinks are fixed and not part of pod space calculations.

**Priority**: High

#### Scenario: Base chassis heat sinks field

- **GIVEN** an OmniMech unit
- **THEN** `baseChassisHeatSinks` field SHALL indicate fixed heat sink count
- **AND** value of -1 SHALL indicate auto-calculation mode

#### Scenario: Heat sink validation

- **GIVEN** an OmniMech with `baseChassisHeatSinks` set
- **WHEN** validating configuration
- **THEN** base chassis heat sinks MUST NOT exceed total heat sink count
- **AND** validation error SHALL be raised if exceeded

#### Scenario: MTF base chassis heat sinks

- **GIVEN** an OmniMech MTF file
- **WHEN** "Base Chassis Heat Sinks:" field is present
- **THEN** value SHALL be parsed as `baseChassisHeatSinks`

#### Scenario: Export base chassis heat sinks

- **GIVEN** an OmniMech being exported
- **WHEN** `baseChassisHeatSinks` is set and not -1
- **THEN** "Base Chassis Heat Sinks:" line SHALL be output

---

### Requirement: Chassis Reset Functionality

OmniMechs SHALL support resetting to base chassis configuration.

**Rationale**: Enables rapid variant reconfiguration by clearing all pod-mounted equipment.

**Priority**: High

#### Scenario: Reset chassis action

- **WHEN** user triggers chassis reset
- **THEN** all equipment with `isOmniPodMounted: true` SHALL be removed
- **AND** equipment with `isOmniPodMounted: false` SHALL be preserved
- **AND** model name MAY be updated to indicate new variant

#### Scenario: Reset confirmation

- **WHEN** user initiates chassis reset
- **THEN** confirmation dialog SHALL be displayed
- **AND** dialog SHALL warn that pod equipment will be removed
- **AND** reset SHALL only proceed on user confirmation

---

### Requirement: OmniMech UI Controls

The UI SHALL provide OmniMech-specific controls when `isOmni: true`.

**Rationale**: Users need intuitive controls for OmniMech configuration.

**Priority**: High

#### Scenario: OmniMech checkbox

- **GIVEN** the Overview tab chassis configuration section
- **THEN** "OmniMech" checkbox SHALL be displayed
- **AND** checking the box SHALL set `isOmni: true`
- **AND** unchecking SHALL set `isOmni: false`

#### Scenario: Reset Chassis button

- **GIVEN** an OmniMech unit (`isOmni: true`)
- **THEN** "Reset Chassis" button SHALL be visible
- **AND** button SHALL trigger chassis reset workflow
- **AND** button SHALL be hidden for non-OmniMechs

#### Scenario: Base Heat Sinks spinner

- **GIVEN** an OmniMech unit on Structure tab
- **THEN** "Base Chassis Heat Sinks" spinner SHALL be visible
- **AND** spinner range SHALL be -1 (auto) to total heat sinks
- **AND** spinner SHALL be hidden for non-OmniMechs

#### Scenario: Critical slots visual distinction

- **GIVEN** an OmniMech viewing critical slots
- **THEN** fixed equipment SHALL show "(Fixed)" indicator
- **AND** pod equipment SHALL show "(Pod)" indicator
- **AND** fixed equipment SHALL have reduced opacity (60%)
- **AND** fixed equipment drag/removal SHALL be prevented

---

### Requirement: Clan Name (Reporting Name)

The system SHALL support optional Clan reporting names for OmniMechs.

**Rationale**: Clan OmniMechs often have Inner Sphere reporting names (e.g., "Mad Cat" for "Timber Wolf").

**Priority**: Medium

#### Scenario: Clan name field

- **GIVEN** an OmniMech unit
- **THEN** `clanName` field MAY contain the Clan reporting name
- **AND** field is optional and may be undefined

#### Scenario: MTF clanname parsing

- **GIVEN** an MTF file with "clanname:" field
- **WHEN** parsing the file
- **THEN** value SHALL be stored in `clanName`

#### Scenario: MTF clanname export

- **GIVEN** an OmniMech with `clanName` set
- **WHEN** exporting to MTF
- **THEN** "clanname:" line SHALL be output with the value

---

### Requirement: OmniMech Validation Rules

The system SHALL enforce OmniMech-specific validation rules.

**Rationale**: Ensures OmniMech configurations comply with construction rules.

**Priority**: High

#### Scenario: Base heat sinks validation

- **GIVEN** an OmniMech with `baseChassisHeatSinks` greater than total
- **WHEN** validating configuration
- **THEN** ERROR validation result SHALL be returned
- **AND** message SHALL indicate base cannot exceed total

#### Scenario: Fixed equipment recommendation

- **GIVEN** an OmniMech with no fixed equipment
- **WHEN** validating configuration
- **THEN** WARNING validation result MAY be returned
- **AND** message SHALL suggest defining fixed equipment

---

### Requirement: Data Persistence

OmniMech-specific fields SHALL be preserved through save/load cycles.

**Rationale**: User configuration must not be lost when saving and loading files.

**Priority**: Critical

#### Scenario: JSON serialization round-trip

- **GIVEN** an OmniMech saved to JSON format
- **WHEN** loaded back
- **THEN** `isOmni` flag SHALL be preserved
- **AND** `baseChassisHeatSinks` SHALL be preserved
- **AND** `clanName` SHALL be preserved
- **AND** equipment `isOmniPodMounted` flags SHALL be preserved

#### Scenario: MTF round-trip

- **GIVEN** an OmniMech exported to MTF format
- **WHEN** re-imported
- **THEN** OmniMech status SHALL be detected from Config
- **AND** base chassis heat sinks SHALL be preserved
- **AND** equipment pod status SHALL be preserved via "(omnipod)" parsing

# mtf-parity-validation Specification

## Purpose

TBD - created by archiving change add-mtf-parity-validation. Update Purpose after archive.

## Requirements

### Requirement: MTF Parsing from Raw Text

The system SHALL parse raw MTF text files from mm-data into ISerializedUnit format.

**Rationale**: Direct parsing of canonical MTF files enables round-trip validation without intermediate conversions.

**Priority**: Critical

#### Scenario: Parse standard BattleMech MTF

- **GIVEN** a valid MTF file from mm-data (e.g., `data/mekfiles/meks/3039u/Archer ARC-2R.mtf`)
- **WHEN** parsing the file
- **THEN** the system SHALL extract chassis, model, tonnage, era, and tech base
- **AND** the system SHALL extract engine type and rating
- **AND** the system SHALL extract armor type and per-location allocation
- **AND** the system SHALL extract equipment list with locations
- **AND** the system SHALL extract critical slot assignments per location

#### Scenario: Parse actuator configuration

- **GIVEN** an MTF file with non-standard actuators
- **WHEN** parsing the file
- **THEN** the system SHALL detect missing Hand Actuator
- **AND** the system SHALL detect missing Lower Arm Actuator
- **AND** these absences SHALL be reflected in the critical slots

---

### Requirement: MTF Serialization from ISerializedUnit

The system SHALL serialize ISerializedUnit back to MTF text format matching MegaMek conventions.

**Rationale**: Round-trip serialization enables diff-based validation against original files.

**Priority**: Critical

#### Scenario: Serialize to MTF format

- **GIVEN** a valid ISerializedUnit object
- **WHEN** serializing to MTF format
- **THEN** output SHALL include header fields (chassis, model, config, techbase, era)
- **AND** output SHALL include mass, engine, structure, myomer
- **AND** output SHALL include heat sinks, walk mp, jump mp
- **AND** output SHALL include armor type and per-location values
- **AND** output SHALL include weapons list with locations
- **AND** output SHALL include critical slot sections per location

#### Scenario: Match MegaMek naming conventions

- **GIVEN** equipment in ISerializedUnit with canonical ID "medium-laser"
- **WHEN** serializing to MTF format
- **THEN** equipment name SHALL be "Medium Laser" in weapons section
- **AND** equipment name SHALL be "Medium Laser" in critical slots section

---

### Requirement: Round-Trip Parity Validation

The system SHALL validate unit data by round-trip comparison: parse MTF, serialize back, diff against original.

**Rationale**: Round-trip testing reveals data loss or transformation errors in the conversion pipeline.

**Priority**: Critical

#### Scenario: Validate single unit

- **GIVEN** an MTF file path and output directory
- **WHEN** running parity validation
- **THEN** the system SHALL parse the MTF to ISerializedUnit
- **AND** the system SHALL serialize back to MTF format
- **AND** the system SHALL compare generated MTF with original
- **AND** the system SHALL categorize any discrepancies found

#### Scenario: Validate all BattleMechs

- **GIVEN** a path to mm-data repository
- **WHEN** running full parity validation
- **THEN** the system SHALL discover all MTF files in `data/mekfiles/meks/`
- **AND** the system SHALL validate each unit
- **AND** the system SHALL generate summary statistics

---

### Requirement: Discrepancy Categorization

The system SHALL categorize discrepancies by type for targeted remediation.

**Rationale**: Categories guide developers to the appropriate fix location (parser, serializer, or equipment catalog).

**Priority**: High

#### Scenario: Equipment discrepancy categories

- **GIVEN** a discrepancy in equipment handling
- **THEN** the system SHALL categorize as one of:
  - `UNKNOWN_EQUIPMENT` - Equipment ID not found in catalog
  - `EQUIPMENT_MISMATCH` - Equipment name differs between original and generated

#### Scenario: Actuator discrepancy categories

- **GIVEN** a discrepancy in actuator handling
- **THEN** the system SHALL categorize as one of:
  - `MISSING_ACTUATOR` - Actuator in MTF not present in generated output
  - `EXTRA_ACTUATOR` - Actuator in generated output not present in MTF

#### Scenario: Critical slot discrepancy categories

- **GIVEN** a discrepancy in critical slot allocation
- **THEN** the system SHALL categorize as one of:
  - `SLOT_MISMATCH` - Slot contents differ at specific index
  - `SLOT_COUNT_MISMATCH` - Number of filled slots differs

#### Scenario: Structural discrepancy categories

- **GIVEN** a discrepancy in structural components
- **THEN** the system SHALL categorize as one of:
  - `ARMOR_MISMATCH` - Armor values differ
  - `ENGINE_MISMATCH` - Engine type or rating differs
  - `MOVEMENT_MISMATCH` - Walk or jump MP differs

---

### Requirement: Per-Unit Issue Reports

The system SHALL generate individual issue files for each unit with discrepancies.

**Rationale**: Per-unit files enable agent-driven iteration and progress tracking.

**Priority**: High

#### Scenario: Issue file structure

- **GIVEN** a unit with discrepancies
- **WHEN** generating reports
- **THEN** the system SHALL create `issues/{unit-id}.json` containing:
  - `id` - Unit identifier
  - `chassis` - Chassis name
  - `model` - Model designation
  - `mtfPath` - Path to original MTF file
  - `generatedPath` - Path to generated MTF file
  - `issues` - Array of categorized discrepancies

#### Scenario: Issue entry structure

- **GIVEN** a discrepancy in a unit
- **THEN** each issue entry SHALL contain:
  - `category` - Discrepancy category
  - `location` - Affected location (if applicable)
  - `expected` - Value from original MTF
  - `actual` - Value from generated MTF
  - `suggestion` - Actionable fix suggestion

---

### Requirement: Validation Manifest

The system SHALL generate a manifest file indexing all validated units.

**Rationale**: Manifest enables querying units by status and issue type.

**Priority**: Medium

#### Scenario: Manifest structure

- **GIVEN** completed validation run
- **WHEN** generating manifest
- **THEN** `manifest.json` SHALL contain:
  - `generatedAt` - ISO timestamp
  - `mmDataCommit` - Git commit hash of mm-data
  - `units` - Array of unit entries with status and primary issue category

---

### Requirement: Console Output Summary

The system SHALL output summary statistics to console during validation.

**Rationale**: Immediate feedback on validation progress and results.

**Priority**: Medium

#### Scenario: Summary output

- **WHEN** validation completes
- **THEN** console SHALL display:
  - Total units validated
  - Units passed (no discrepancies)
  - Units with issues
  - Breakdown by issue category
  - Path to generated report files

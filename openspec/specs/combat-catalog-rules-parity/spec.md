# combat-catalog-rules-parity Specification

## Purpose

Defines the BattleMech combat catalog parity matrix that keeps official ranged weapons, ammunition entries, physical weapons, and special combat families tied to source-backed runtime support, explicit gaps, and repeatable validation gates.

## Requirements

### Requirement: Official Combat Catalog Parity Matrix

The system SHALL maintain a BattleMech combat catalog parity matrix for official ranged weapons, ammunition entries, physical weapons, and special combat families. Each official row SHALL include a source-backed identifier, runtime mapping status, support level, evidence reference, and explicit gap text when not fully integrated.

#### Scenario: Every official row is classified
- **WHEN** the combat catalog parity validator runs
- **THEN** every official BattleMech ranged weapon, ammunition entry, and physical weapon row is classified exactly once
- **AND** each classification is integrated, partial, helper-only, modifier-only, unsupported, or out-of-scope

#### Scenario: Missing official row is visible
- **WHEN** an official catalog row has no runtime mapping
- **THEN** the gap inventory includes a named unresolved row for that catalog entry
- **AND** the row includes evidence and source references sufficient to decide whether to implement or defer it

### Requirement: Catalog Fallback Guard

Static, synthetic, or fixture-only fallback data SHALL NOT satisfy official combat catalog parity unless the row is explicitly classified as fixture-only and non-gating.

#### Scenario: Synthetic fallback cannot hide catalog failure
- **WHEN** a runtime behavior uses fallback equipment data for an official row
- **THEN** the catalog parity validator fails or emits an unresolved gap for that row
- **AND** the row is not counted as integrated support

#### Scenario: Fixture-only data is marked non-gating
- **WHEN** a test fixture uses synthetic equipment data
- **THEN** the fixture declares that it is not official catalog evidence
- **AND** catalog parity remains based on official loaded catalog rows

### Requirement: Catalog Parity Validation Commands

The system SHALL expose repeatable validation commands that report catalog parity coverage, unresolved gaps, out-of-scope rows, and expectation failures.

#### Scenario: Gap command reports catalog parity state
- **WHEN** `npm.cmd run validate:combat:gaps -- --format=summary` runs
- **THEN** the output includes total unresolved rows and counts by level, scope, and section
- **AND** expectation flags can require specific rows to be present or absent

#### Scenario: Combat validation suite proves supported rows
- **WHEN** `npm.cmd run validate:combat` runs
- **THEN** focused catalog parity tests prove that integrated rows are loaded and consumed by runtime behavior
- **AND** unsupported rows remain visible in the gap inventory

### Requirement: Known Limitation Suppression Audit

Known limitation suppression SHALL remain a legacy-detector filter, not a catalog support signal. Catalog parity tests SHALL bypass or trap broad suppressions for targeted official rows.

#### Scenario: Known limitation cannot suppress targeted catalog failure
- **WHEN** a targeted official catalog row fails parity validation
- **THEN** broad `knownLimitations` suppression does not remove the failure from the catalog gap inventory
- **AND** the failure remains visible until a source-backed support row or explicit out-of-scope split replaces it

### Requirement: Non-BattleMech Boundary

Catalog parity for this wave SHALL cover BattleMech combat rows. Non-BattleMech, aerospace, vehicle, battle armor, infantry, ProtoMech, or construction-only entries SHALL be split into explicit out-of-scope rows or separate future matrices.

#### Scenario: Non-BattleMech entry is not counted as BattleMech support
- **WHEN** an official row belongs to a non-BattleMech runtime family
- **THEN** the BattleMech catalog parity matrix classifies it as out-of-scope or routes it to a separate matrix
- **AND** the BattleMech support count does not include it as integrated behavior

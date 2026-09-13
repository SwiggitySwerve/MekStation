# battlemech-chassis-index Specification

## Purpose

Defines deterministic BattleMech chassis identities, canonical variant membership, explicit alternate names, read-only API access, and searchable Compendium navigation without implying model availability or reuse permission.

## Source and proof boundary

Defining candidate source: `buildChassisIndex` / `searchChassisIndex` in `src/services/units/chassis/chassisIndex.ts`; `loadChassisIndex` in `src/services/units/chassis/chassisIndex.server.ts`; `IChassisIndex` in `src/types/unit/ChassisIndex.ts`; `GET /api/chassis` in `src/pages/api/chassis.ts`; Compendium `/compendium/chassis` in `src/pages/compendium/chassis.tsx` with `ChassisBrowser` and `ChassisDetail`. Curated aliases are `CHASSIS_ALIASES` in `src/services/units/chassis/chassisAliases.ts` (exact catalog names only, including Mad Cat → Timber Wolf). Duplicate unit IDs and chassis-ID collisions throw.

Proof boundary: that grouping, API, and navigation source exists in this candidate. The requirements below remain the desired contract. This spec does not claim model assets, preview rendering, or reuse permission. An untracked root archive copy is provenance only and is not merged archive closure. No new runtime or keyboard-matrix proof is recorded here.

## Requirements

### Requirement: Deterministic chassis identities

The system SHALL derive one chassis entry per exact catalog chassis name from the bundled BattleMech index and preserve every canonical variant exactly once. Each entry MUST have a deterministic chassis ID independent of variant order, weight, and alternate names.

#### Scenario: Complete catalog grouping

- **WHEN** the chassis index is built from a valid bundled catalog
- **THEN** every canonical unit ID occurs in exactly one chassis entry
- **AND** variant tech base, weight, introduction year, and rules level remain intact

#### Scenario: Identity ambiguity

- **WHEN** distinct chassis names produce the same chassis ID or a unit ID occurs twice
- **THEN** index creation fails with a diagnostic instead of merging or dropping records

### Requirement: Explicit alternate names

The system SHALL make curated alternate chassis names searchable without merging successor designs or inferring geometry compatibility.

#### Scenario: Clan alternate name

- **WHEN** a user searches for Timber Wolf
- **THEN** the Mad Cat chassis is discoverable through its alternate name
- **AND** it retains its catalog identity and variant links

#### Scenario: Successor distinction

- **WHEN** Marauder, Marauder II, and Marauder IIC occur in the catalog
- **THEN** each has a separate chassis ID and variant collection

### Requirement: Read-only chassis access

The system SHALL expose the versioned chassis index through a read-only API with source metadata and optional exact chassis-ID lookup. Missing or invalid source data MUST produce an error rather than successful empty data.

#### Scenario: Exact lookup

- **WHEN** a GET request supplies a known chassis ID
- **THEN** the API returns that chassis with its canonical variants
- **AND** an unknown ID returns 404

#### Scenario: Invalid request or source

- **WHEN** a request uses an unsupported method, a repeated ID parameter, or an invalid source catalog
- **THEN** the API returns 405, 400, or 500 respectively

### Requirement: Chassis discovery and variant navigation

The Compendium SHALL provide searchable chassis browsing with weight-class filtering, pagination, shareable chassis selection, and canonical variant links. The page MUST expose loading, error/retry, and empty states, remain keyboard usable on narrow viewports, and distinguish chassis records from available model previews.

#### Scenario: Search and reopen

- **WHEN** a user searches an alternate name and selects its chassis
- **THEN** the page shows that chassis and its variants
- **AND** reloading the selected URL restores the same chassis

#### Scenario: No model attached

- **WHEN** a chassis has no attached preview
- **THEN** the page states that no preview has been added without displaying a fabricated model or rights approval

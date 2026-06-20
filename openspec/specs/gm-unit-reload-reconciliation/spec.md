# gm-unit-reload-reconciliation Specification

## Purpose

Defines how a GM can reload an active encounter unit from its source unit and pilot definitions while preserving compatible live encounter overlays and requiring manual handling for conflicts.
## Requirements
### Requirement: Active Encounter Unit Reload Implementer

The system SHALL provide a reload intervention implementer that rehydrates construction/loadout-derived fields from the current source unit definition into an active encounter without resetting the encounter.

#### Scenario: Reload uses source references
- **GIVEN** an active encounter unit has `unitRef` and `pilotRef`
- **WHEN** the GM previews a unit reload intervention
- **THEN** the reload implementer SHALL read the current source unit definition by `unitRef`
- **AND** the reload implementer SHALL read the current pilot data by `pilotRef` when pilot data is required

### Requirement: Reload Preserves Compatible Live Overlays

The reload implementer SHALL preserve compatible live combat overlays by default while replacing construction/loadout-derived fields from the source unit.

#### Scenario: Reload preserves live overlays by default
- **GIVEN** an active encounter unit has a source unit reference and live combat overlays
- **WHEN** the GM previews a unit reload intervention
- **THEN** the preview SHALL replace construction/loadout-derived fields from the source unit
- **AND** the preview SHALL preserve position, facing, initiative state, phase state, damage state, heat, ammo, pilot state, movement locks, and committed action state where compatible

### Requirement: Reload Conflict Manual Takeover

The reload implementer SHALL identify conflicts where live overlays cannot be safely preserved and SHALL require GM manual takeover before commit.

#### Scenario: Reload conflict escalates to manual takeover
- **GIVEN** a source unit update removes or changes data needed to preserve live overlays
- **WHEN** the GM previews a unit reload intervention
- **THEN** the preview SHALL identify the conflicting fields
- **AND** the preview SHALL require GM manual takeover before commit

### Requirement: Reload Does Not Reset Encounter

The reload implementer SHALL update only the targeted active unit and SHALL preserve unrelated units, encounter status, and prior event history.

#### Scenario: Reload does not reset encounter
- **GIVEN** an active encounter with multiple units and an event history
- **WHEN** the GM approves a reload intervention for one unit
- **THEN** the encounter SHALL remain active
- **AND** unrelated units and prior event history SHALL remain present

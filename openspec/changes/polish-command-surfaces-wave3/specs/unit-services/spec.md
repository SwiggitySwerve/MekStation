# unit-services — Delta for polish-command-surfaces-wave3

## ADDED Requirements

### Requirement: Merged Unit Lookup Accessor

The UnitSearchService SHALL expose an accessor over the merged canonical + custom unit index it already builds during initialization, so that consumers can resolve any unit id — canonical or `custom-*` — to its index entry (including display name) without performing a separate fetch or re-merging the two sources. The service SHALL provide `getAllUnits()` returning all merged entries and `getUnitById(id)` returning a single entry by id. The merged set SHALL reflect both canonical units and existing custom units only after `initialize()` has resolved.

**Rationale**: Custom units (ids `custom-*`) live outside the static canonical index, so consumers resolving names from the canonical index alone miss them. The merged map already exists inside the service; exposing it avoids each consumer independently re-querying and re-merging the custom-unit source.

**Priority**: Medium

#### Scenario: getAllUnits returns merged canonical and custom entries

- **GIVEN** the unit search service has been initialized with canonical units and at least one saved custom unit
- **WHEN** getAllUnits() is called
- **THEN** the returned entries SHALL include both canonical index entries and the `custom-*` entries
- **AND** each custom entry SHALL carry its `${chassis} ${variant}` display name

#### Scenario: getUnitById resolves a custom unit id

- **GIVEN** an initialized unit search service with a custom unit whose id is `custom-…`
- **WHEN** getUnitById("custom-…") is called
- **THEN** the merged entry for that custom unit SHALL be returned with its display name
- **AND** getUnitById of an unknown id SHALL return undefined

#### Scenario: Accessor reflects the merged index only after initialization

- **GIVEN** a unit search service whose initialize() has not yet resolved
- **WHEN** getAllUnits() is called
- **THEN** it SHALL return an empty set rather than throwing
- **AND** after initialize() resolves, getAllUnits() SHALL return the full merged canonical + custom set

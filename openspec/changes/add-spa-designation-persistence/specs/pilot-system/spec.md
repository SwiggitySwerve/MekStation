# pilot-system Specification Delta

## ADDED Requirements

### Requirement: SPA Designation Data Shape

The pilot system SHALL define a single `ISPADesignation` discriminated
union that captures every designation supported by the SPA catalog.

#### Scenario: Weapon-type designation

- **GIVEN** an SPA with `designationType === "weapon_type"`
- **WHEN** a designation is constructed for it
- **THEN** the designation SHALL be `{ type: "weapon_type", value:
string }` where `value` is a weapon type id from the weapon catalog

#### Scenario: Target designation

- **GIVEN** an SPA with `designationType === "target"`
- **WHEN** a designation is constructed for it
- **THEN** the designation SHALL be `{ type: "target", value: string }`
  where `value` is a unit id

#### Scenario: Range-bracket designation

- **GIVEN** an SPA with `designationType === "range_bracket"`
- **WHEN** a designation is constructed for it
- **THEN** the designation SHALL be `{ type: "range_bracket", value:
"short" | "medium" | "long" }`

#### Scenario: Union covers every catalog designation type

- **GIVEN** the canonical SPA catalog lists the following
  `designationType` values: weapon_type, weapon_category, target,
  range_bracket, skill, terrain
- **WHEN** `ISPADesignation` is defined
- **THEN** the union SHALL include a variant for every one of those
  types
- **AND** no catalog entry SHALL reference a type absent from the union

### Requirement: Designation Persistence on Pilot Record

The pilot system SHALL persist each ability's designation alongside the
ability id on the pilot record.

#### Scenario: Ability ref carries designation

- **GIVEN** a pilot purchases `weapon_specialist` with designation
  `{ type: "weapon_type", value: "medium_laser" }`
- **WHEN** the purchase completes
- **THEN** the pilot's `abilities` array SHALL contain an
  `IPilotAbilityRef` whose `abilityId === "weapon_specialist"` and
  whose `designation === { type: "weapon_type", value: "medium_laser"
}`

#### Scenario: Absent designation permitted for non-designating SPAs

- **GIVEN** a pilot purchases `iron_man` (no designation required)
- **WHEN** the purchase completes
- **THEN** the stored ability ref SHALL have `designation === undefined`

#### Scenario: Designation required when catalog says so

- **GIVEN** a pilot attempts to purchase
  `weapon_specialist` without supplying a designation
- **WHEN** `PilotService.purchaseSPA` is called
- **THEN** the service SHALL reject with error "Designation required
  for Weapon Specialist"
- **AND** the pilot record SHALL remain unchanged

#### Scenario: Designation type must match SPA

- **GIVEN** a pilot attempts to purchase `weapon_specialist` with a
  designation of type `range_bracket`
- **WHEN** `PilotService.purchaseSPA` is called
- **THEN** the service SHALL reject with error "Designation type
  mismatch"

### Requirement: Designation Retrieval Helper

The pilot system SHALL expose a pure `getPilotDesignation(pilot,
spaId)` helper that the combat layer uses to resolve designations.

#### Scenario: Helper returns stored designation

- **GIVEN** a pilot that owns `range_master` with designation
  `{ type: "range_bracket", value: "medium" }`
- **WHEN** `getPilotDesignation(pilot, "range_master")` is called
- **THEN** it SHALL return `{ type: "range_bracket", value: "medium" }`

#### Scenario: Helper resolves legacy alias ids

- **GIVEN** a pilot that owns `range_master` and the caller passes the
  legacy alias id registered in `SPA_LEGACY_ALIASES`
- **WHEN** `getPilotDesignation(pilot, legacyId)` is called
- **THEN** the helper SHALL resolve the legacy id to the canonical id
  first, then return the stored designation

#### Scenario: Helper returns undefined when SPA not owned

- **GIVEN** a pilot that does not own the requested SPA
- **WHEN** `getPilotDesignation(pilot, spaId)` is called
- **THEN** the helper SHALL return `undefined`

#### Scenario: Helper returns undefined when designation absent

- **GIVEN** a pilot that owns the SPA but whose stored ref has
  `designation === undefined`
- **WHEN** `getPilotDesignation(pilot, spaId)` is called
- **THEN** the helper SHALL return `undefined`

### Requirement: Backward Compatibility for Stored Pilots

The pilot system SHALL treat existing stored pilots (written before this
change) as valid, with missing designations interpreted as "not yet
designated".

#### Scenario: Legacy pilot loads without error

- **GIVEN** a stored pilot JSON predating this change, where every
  `IPilotAbilityRef` has no `designation` field
- **WHEN** the pilot is loaded from persistence
- **THEN** the load SHALL succeed
- **AND** `getPilotDesignation(pilot, spaId)` SHALL return `undefined`
  for each of those abilities
- **AND** the combat layer SHALL fall back to its existing placeholder
  behaviour for designation-dependent SPAs until a designation is set

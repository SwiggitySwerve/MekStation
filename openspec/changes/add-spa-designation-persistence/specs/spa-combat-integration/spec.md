# spa-combat-integration Specification Delta

## MODIFIED Requirements

### Requirement: Gunnery SPA — Weapon Specialist

The Weapon Specialist SPA SHALL grant a -2 to-hit modifier when firing the
weapon type stored as the pilot's Weapon Specialist designation on the
pilot record. The combat layer SHALL obtain the designated weapon type
via `getPilotDesignation(pilot, "weapon_specialist")`.

#### Scenario: Weapon Specialist with stored weapon-type designation

- **GIVEN** a pilot owns `weapon_specialist` with designation
  `{ type: "weapon_type", value: "medium_laser" }`
- **WHEN** the pilot fires a Medium Laser
- **THEN** the combat layer SHALL call `getPilotDesignation` to resolve
  the weapon type
- **AND** the attack SHALL receive a -2 to-hit modifier

#### Scenario: Weapon Specialist with non-matching weapon

- **GIVEN** a pilot owns `weapon_specialist` with designation
  `{ type: "weapon_type", value: "medium_laser" }`
- **WHEN** the pilot fires an AC/10
- **THEN** no Weapon Specialist modifier SHALL apply

#### Scenario: Weapon Specialist without a designation recorded

- **GIVEN** a pilot owns `weapon_specialist` but the pilot record has
  no designation (legacy pilot)
- **WHEN** the pilot fires any weapon
- **THEN** the combat layer SHALL fall back to its placeholder
  behaviour (no Weapon Specialist modifier applied) and SHALL NOT
  throw

### Requirement: Gunnery SPA — Gunnery Specialist

The Gunnery Specialist SPA SHALL grant -1 to-hit for attacks with the
weapon category stored as the pilot's Gunnery Specialist designation
and +1 for all other categories. The combat layer SHALL obtain the
designated category via `getPilotDesignation(pilot,
"gunnery_specialist")`.

#### Scenario: Gunnery Specialist with stored Energy designation

- **GIVEN** a pilot owns `gunnery_specialist` with designation
  `{ type: "weapon_category", value: "energy" }`
- **WHEN** the pilot fires an energy weapon
- **THEN** the attack SHALL receive -1 to-hit

#### Scenario: Gunnery Specialist with stored Energy designation on ballistic weapon

- **GIVEN** a pilot owns `gunnery_specialist` with designation
  `{ type: "weapon_category", value: "energy" }`
- **WHEN** the pilot fires a ballistic weapon
- **THEN** the attack SHALL receive +1 to-hit

### Requirement: Gunnery SPA — Blood Stalker

The Blood Stalker SPA SHALL grant -1 to-hit against the target stored as
the pilot's Blood Stalker designation and +2 against all other targets.
The combat layer SHALL obtain the designated target id via
`getPilotDesignation(pilot, "blood_stalker")`.

#### Scenario: Blood Stalker against stored target

- **GIVEN** a pilot owns `blood_stalker` with designation
  `{ type: "target", value: "unit-abc-123" }`
- **WHEN** the pilot attacks unit-abc-123
- **THEN** the attack SHALL receive -1 to-hit

#### Scenario: Blood Stalker against a different target

- **GIVEN** a pilot owns `blood_stalker` with designation
  `{ type: "target", value: "unit-abc-123" }`
- **WHEN** the pilot attacks a unit other than unit-abc-123
- **THEN** the attack SHALL receive +2 to-hit

### Requirement: Gunnery SPA — Range Master

The Range Master SPA SHALL zero the range modifier for the range bracket
stored as the pilot's Range Master designation. The combat layer SHALL
obtain the designated bracket via `getPilotDesignation(pilot,
"range_master")`.

#### Scenario: Range Master with stored medium designation

- **GIVEN** a pilot owns `range_master` with designation
  `{ type: "range_bracket", value: "medium" }`
- **WHEN** the pilot fires at medium range
- **THEN** the range to-hit modifier SHALL be 0 (instead of +2)

#### Scenario: Range Master with stored medium designation at long range

- **GIVEN** a pilot owns `range_master` with designation
  `{ type: "range_bracket", value: "medium" }`
- **WHEN** the pilot fires at long range
- **THEN** the normal long range modifier SHALL apply

## ADDED Requirements

### Requirement: Designation Lookup Contract

The combat modifier layer SHALL obtain every designation-dependent value
by calling `getPilotDesignation(pilot, spaId)` and SHALL NOT reach into
the pilot record directly.

#### Scenario: Modifier layer uses the helper

- **GIVEN** any designation-dependent SPA is being evaluated for an
  attack
- **WHEN** the modifier calculation needs the designated value
- **THEN** the code SHALL read the designation only via
  `getPilotDesignation(pilot, spaId)`
- **AND** code reviews SHALL reject any direct traversal of
  `pilot.abilities[].designation`

#### Scenario: Missing designation produces neutral result

- **GIVEN** a designation-dependent SPA is evaluated for a pilot where
  `getPilotDesignation` returns `undefined`
- **WHEN** the modifier calculation runs
- **THEN** the modifier SHALL evaluate to zero (no-op) rather than
  throwing
- **AND** a debug-level log SHALL note the missing designation

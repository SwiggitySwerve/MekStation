# weapon-resolution-system Specification Delta

## ADDED Requirements

### Requirement: UI Weapon State Projection

The weapon resolution system SHALL expose an `IUIWeaponState` projection
per weapon on a given unit that the attack-phase UI uses to render the
weapon selector without querying multiple subsystems.

#### Scenario: Projection contains range, ammo, status

- **GIVEN** a BattleMech with a Medium Laser in the right arm
- **WHEN** the UI requests the projection for that mech at a target 5
  hexes away
- **THEN** the projection SHALL contain `{weaponId, name, location,
damage, heat, rangeBracket, inRange, ammoRemaining, status}`
- **AND** `rangeBracket` SHALL be one of `Short | Medium | Long |
OutOfRange`

#### Scenario: Projection reflects destroyed weapons

- **GIVEN** a weapon whose location has been destroyed
- **WHEN** the projection is requested
- **THEN** the `status` field SHALL be `"destroyed"`
- **AND** the UI SHALL render the row as disabled

#### Scenario: Projection reflects jammed weapons

- **GIVEN** a weapon with `jammed = true`
- **WHEN** the projection is requested
- **THEN** the `status` field SHALL be `"jammed"`

#### Scenario: Projection reflects ammo exhaustion

- **GIVEN** an ammo-consuming weapon with `ammoRemaining = 0`
- **WHEN** the projection is requested
- **THEN** the `ammoRemaining` field SHALL be 0
- **AND** `status` SHALL include `"no_ammo"` marker

### Requirement: Attack Declaration Event Emission

The weapon resolution system SHALL, on UI-confirmed fire, append an
`AttackDeclared` event to the session event stream whose payload contains
the attacker id, target id, and ordered list of weapon ids selected for
the attack.

#### Scenario: Confirm Fire appends AttackDeclared

- **GIVEN** a Player-side unit with an attack plan (target locked, at
  least one weapon selected)
- **WHEN** the player clicks "Confirm Fire"
- **THEN** an `AttackDeclared` event SHALL be appended with
  `{attackerId, targetId, weaponIds}`
- **AND** the attacker SHALL be marked as "attack_locked" until phase
  reveal

#### Scenario: Confirm Fire with empty weapons rejected

- **GIVEN** an attack plan with an empty `selectedWeapons` set
- **WHEN** the player clicks "Confirm Fire"
- **THEN** no event SHALL be appended
- **AND** the confirm button SHALL be disabled

#### Scenario: Confirm Fire with out-of-range-only weapons rejected

- **GIVEN** an attack plan whose selected weapons are all out of range
- **WHEN** the player clicks "Confirm Fire"
- **THEN** no event SHALL be appended
- **AND** an inline error `"All selected weapons are out of range"`
  SHALL display

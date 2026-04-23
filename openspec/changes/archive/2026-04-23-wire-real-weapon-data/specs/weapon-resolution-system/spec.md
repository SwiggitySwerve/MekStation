# weapon-resolution-system (delta)

## ADDED Requirements

### Requirement: Resolve Weapon Stats from Catalog

When an attack is resolved, the system SHALL read damage, heat, and range fields from the fired weapon's `IWeaponData` in the catalog. Hardcoded placeholders (`damage: 5`, `heat: 3`, range tuple `(3, 6, 9)`) SHALL NOT be used in the attack-resolution path.

#### Scenario: AC/20 fires with real damage

- **GIVEN** an AC/20 weapon with catalog damage = 20
- **WHEN** the weapon fires and hits
- **THEN** the attack-resolved event payload `damage` field SHALL be 20

#### Scenario: PPC fires with real heat

- **GIVEN** a PPC with catalog heat = 10
- **WHEN** the weapon fires
- **THEN** the firing unit's heat generated SHALL include +10 from this weapon

#### Scenario: LRM-20 range brackets read from catalog

- **GIVEN** an LRM-20 with catalog ranges short 7, medium 14, long 21
- **WHEN** computing the range bracket for a target at 15 hexes
- **THEN** the bracket SHALL be `LONG`
- **AND** the range modifier SHALL be +4

#### Scenario: Missing weapon data throws

- **GIVEN** an attack references a weapon id that is not in the catalog
- **WHEN** the attack resolver tries to read weapon stats
- **THEN** an error SHALL be thrown (or a warning logged and the attack invalidated)
- **AND** the attack SHALL NOT fall back to a silent default damage value

### Requirement: Per-Weapon Range Bracket Resolution

The system SHALL compute the range bracket using the fired weapon's catalog ranges, not a single global bracket tuple.

#### Scenario: Short vs medium boundary

- **GIVEN** a Medium Laser with catalog short 3, medium 6, long 9
- **WHEN** the target is at 3 hexes
- **THEN** the bracket SHALL be `SHORT` (+0)
- **AND** a target at 4 hexes SHALL be `MEDIUM` (+2)

#### Scenario: Extreme range when supported

- **GIVEN** an ER PPC with catalog extreme range defined
- **WHEN** the target is in the extreme bracket
- **THEN** the bracket SHALL be `EXTREME` (+6)

#### Scenario: Out of range rejects attack

- **GIVEN** a Small Laser with long range 3
- **WHEN** the target is at 10 hexes
- **THEN** the attack SHALL be rejected with `OutOfRange`

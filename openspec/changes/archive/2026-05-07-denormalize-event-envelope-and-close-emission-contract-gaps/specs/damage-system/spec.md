## ADDED Requirements

### Requirement: DamageApplied Event Emission Contract

Every armor or structure mutation that occurs during weapon-attack, physical-attack, mid-move terrain, ammo-explosion, or heat-damage resolution SHALL produce exactly one `damage_applied` event with the post-mutation `armorRemaining` and `structureRemaining` values populated. The event payload SHALL include:

- `unitId` — the unit that took damage
- `location` — the location enum value (e.g. `'center_torso'`, `'right_leg'`)
- `damage` — the amount of damage applied at this location (after partial-cover / hardening / etc. adjustments, before any transfer)
- `armorRemaining` — armor remaining at the location AFTER application (may be 0)
- `structureRemaining` — structure remaining at the location AFTER application (may be 0)
- `locationDestroyed` — `true` if the structure dropped to 0 in this event
- `sourceUnitId` — the unit that caused the damage (`null` for self/environment damage)

The runner SHALL NOT emit `damage_applied` events with stale armor/structure values; the event SHALL be emitted AFTER the mutation lands so consumers can replay the unit's HP curve directly from the event log.

#### Scenario: Damage event reports post-application armor and structure

- **GIVEN** a unit with 25 armor / 14 structure on the center_torso
- **AND** an incoming hit of 5 damage to the center_torso
- **WHEN** the damage is applied
- **THEN** the emitted `damage_applied` event SHALL have `armorRemaining: 20` and `structureRemaining: 14`

#### Scenario: Self/environment damage carries sourceUnitId=null

- **GIVEN** a heat-induced ammo-explosion damage event
- **WHEN** the damage is applied via the ammo-explosion side-effect chain
- **THEN** the emitted `damage_applied.sourceUnitId` SHALL be `null`

### Requirement: Transfer Damage and Location Destruction Event Contract

When damage exceeds a location's combined armor + structure, the runner SHALL emit a `location_destroyed` event followed by a `transfer_damage` event before applying the residual damage to the parent location. The `location_destroyed.viaTransfer` flag distinguishes:

- `viaTransfer: false` — the location was destroyed by the original directly-incoming hit
- `viaTransfer: true` — the location was destroyed by residual damage cascading from a child location

The runner SHALL emit `transfer_damage` with `unitId`, `fromLocation`, `toLocation`, and `damage` (residual amount), even if the residual is 0 (so consumers can audit cascade termination).

#### Scenario: Direct-hit destruction emits viaTransfer=false

- **GIVEN** a unit with 5 armor / 3 structure on the right_arm
- **AND** an incoming hit of 12 damage to the right_arm
- **WHEN** the damage is applied
- **THEN** the events SHALL include `damage_applied` (right_arm, locationDestroyed=true), `location_destroyed` (right_arm, viaTransfer=false), `transfer_damage` (right_arm → right_torso, damage=4)

#### Scenario: Cascade destruction emits viaTransfer=true on the parent

- **GIVEN** a unit with 0 armor / 0 structure on the right_arm (already destroyed)
- **AND** 5 armor / 3 structure remaining on the right_torso
- **AND** an incoming residual transfer of 12 damage from the right_arm
- **WHEN** the cascade resolves
- **THEN** the events SHALL include `damage_applied` (right_torso), `location_destroyed` (right_torso, viaTransfer=true), `transfer_damage` (right_torso → center_torso, damage=4)

# ammo-tracking Specification

## Purpose

TBD - created by archiving change full-combat-parity. Update Purpose after archive.
## Requirements
### Requirement: Per-Bin Ammo State

The system SHALL track ammunition on a per-bin basis, where each ton of ammo constitutes a separate bin with its own state.

#### Scenario: Ammo bin state structure

- **WHEN** initializing ammo state for a unit
- **THEN** each ammo bin SHALL have: binId, weaponType, location, remainingRounds, maxRounds, and isExplosive flag
- **AND** each ton of the same ammo type SHALL be tracked as a separate bin

#### Scenario: Initialize ammo from construction data

- **WHEN** a game starts and units are loaded
- **THEN** ammo bins SHALL be initialized from the unit's construction data
- **AND** remainingRounds SHALL equal maxRounds for each bin
- **AND** the location of each bin SHALL match its critical slot assignment

### Requirement: Ammo Consumption Per Firing

The system SHALL consume 1 round per weapon firing from an appropriate ammo bin, or the volley size for cluster weapons.

#### Scenario: Single-shot weapon firing

- **WHEN** a single-shot weapon (e.g., AC/10) fires
- **THEN** 1 round SHALL be consumed from an ammo bin matching the weapon type
- **AND** the bin's remainingRounds SHALL decrease by 1

#### Scenario: Cluster weapon firing

- **WHEN** a cluster weapon (e.g., LRM-20) fires
- **THEN** 1 round (salvo) SHALL be consumed from a matching ammo bin
- **AND** the bin's remainingRounds SHALL decrease by 1

#### Scenario: Multiple bins of same type

- **WHEN** a weapon fires and multiple bins of matching ammo exist
- **THEN** ammo SHALL be consumed from the first non-empty matching bin
- **AND** if the first bin is depleted, the next bin SHALL be used

### Requirement: Prevent Firing Without Ammo

The system SHALL prevent weapons from firing when no ammo is available.

#### Scenario: Weapon cannot fire with 0 ammo

- **WHEN** all ammo bins for a weapon type have remainingRounds = 0
- **THEN** the weapon SHALL NOT be permitted to fire
- **AND** the weapon SHALL be excluded from available weapon selections

#### Scenario: Energy weapons unaffected by ammo

- **WHEN** an energy weapon (laser, PPC, flamer) is selected to fire
- **THEN** no ammo check SHALL be required
- **AND** the weapon SHALL always be permitted to fire (ammo-independent)

### Requirement: Ammo Bin Destruction Tracking

When an ammo bin is destroyed (critical hit or explosion), the system SHALL mark it as destroyed and zero its remaining rounds.

#### Scenario: Ammo bin destroyed by critical hit

- **WHEN** an ammo bin receives a critical hit
- **THEN** the bin's remainingRounds SHALL be set to 0
- **AND** the bin SHALL be marked as destroyed
- **AND** an ammo explosion SHALL be triggered (handled by ammo-explosion-system)

#### Scenario: Destroyed bin excluded from consumption

- **WHEN** an ammo bin is destroyed
- **THEN** the bin SHALL NOT be available for ammo consumption
- **AND** weapons SHALL draw from remaining functional bins of the same type

### Requirement: Ammo Event Tracking

The system SHALL emit AmmoConsumed events when ammunition is used.

#### Scenario: AmmoConsumed event emitted

- **WHEN** a weapon fires and consumes ammo
- **THEN** an AmmoConsumed event SHALL be emitted
- **AND** the event SHALL include binId, weaponId, roundsConsumed, and remainingRounds

### Requirement: Ammo State Immutability

Ammo state changes SHALL follow the event-sourced immutable pattern.

#### Scenario: Ammo state updated via events

- **WHEN** ammo is consumed
- **THEN** a new ammo state record SHALL be produced
- **AND** the original ammo state SHALL NOT be mutated
- **AND** the reducer SHALL apply the AmmoConsumed event to produce the new state

### Requirement: Ammo Bins Initialized From Construction Data

At session start, the system SHALL create one `IAmmoBin` per ton of ammo present in each unit's construction data. Each bin SHALL start with `remainingRounds = maxRounds` for its weapon type.

#### Scenario: Two tons of AC/10 ammo produces two bins

- **GIVEN** a mech with 2 tons of AC/10 ammo in its construction
- **WHEN** the game session is created
- **THEN** the unit's `ammoBins` SHALL contain exactly two `IAmmoBin` entries
- **AND** each bin SHALL have `weaponType = 'AC10'`, `remainingRounds = 10`, `maxRounds = 10`

#### Scenario: Explosive flag propagates from construction

- **GIVEN** a mech with an AC/20 ammo ton
- **WHEN** the game session is created
- **THEN** the corresponding bin SHALL have `isExplosive = true`

### Requirement: Ammo Consumption Wired Into Firing

Every firing of an ammo-consuming weapon SHALL decrement a matching bin and emit an `AmmoConsumed` event. Firing with no matching non-empty bin SHALL invalidate the attack without resolving damage or heat.

#### Scenario: Firing consumes 1 round from matching bin

- **GIVEN** a unit with an AC/10 bin containing 10 rounds
- **WHEN** the AC/10 fires
- **THEN** the bin's `remainingRounds` SHALL decrement to 9
- **AND** an `AmmoConsumed` event SHALL be emitted with `binId`, `weaponId`, and `remainingRounds = 9`

#### Scenario: Firing with empty bin is invalid

- **GIVEN** a unit whose AC/10 bins all have `remainingRounds = 0`
- **WHEN** the AC/10 attempts to fire
- **THEN** an `AttackInvalid` event SHALL be emitted with `reason: 'OutOfAmmo'`
- **AND** no damage SHALL be resolved
- **AND** no heat SHALL be charged for this weapon
- **AND** no `AmmoConsumed` event SHALL be emitted
- **AND** no `AttackResolved` event SHALL be emitted

#### Scenario: Multi-bin selection consumes first non-empty

- **GIVEN** a unit with two AC/10 bins, the first empty and the second full
- **WHEN** the AC/10 fires
- **THEN** consumption SHALL draw from the second bin
- **AND** the second bin's `remainingRounds` SHALL decrement

#### Scenario: Bin selection is deterministic

- **GIVEN** a unit with three AC/10 bins and a seeded random source
- **WHEN** the AC/10 fires twice, then a third time after replaying from an event log
- **THEN** the same bins SHALL be consumed in the same order on replay as on first run

### Requirement: Energy Weapons Bypass Ammo

Energy weapons (lasers, PPCs, flamers) SHALL NOT consume ammo, SHALL NOT touch any bin, and SHALL NOT emit `AmmoConsumed` events.

#### Scenario: Medium Laser fires without touching bins

- **GIVEN** a unit firing a Medium Laser
- **WHEN** the weapon fires
- **THEN** no `IAmmoBin.remainingRounds` SHALL change
- **AND** no `AmmoConsumed` event SHALL be emitted

#### Scenario: Mixed-load unit fires mixed weapons

- **GIVEN** a unit firing 1 PPC (energy) and 1 AC/10 (ammo-consuming) in the same turn
- **WHEN** both weapons fire
- **THEN** exactly one `AmmoConsumed` event SHALL be emitted (from the AC/10)
- **AND** the PPC firing SHALL produce no bin-state change

### Requirement: Cluster Weapons Consume One Salvo Per Firing

Cluster weapons (LRMs, SRMs, MRMs, streaks) SHALL decrement their bin by exactly 1 salvo per firing, regardless of how many missiles the cluster roll produces.

#### Scenario: LRM-20 decrements by 1 per firing

- **GIVEN** an LRM-20 with a full bin (6 salvos per ton)
- **WHEN** the LRM-20 fires
- **THEN** the bin's `remainingRounds` SHALL decrement by 1 (to 5)
- **AND** NOT by 20 (the missile count)

### Requirement: Attack Resolved Payload Carries Bin Reference

The `AttackResolved` event payload SHALL include `ammoBinId: string | null` — null for energy weapons, set to the consumed bin's id for ammo-consuming weapons.

#### Scenario: Energy weapon payload has null ammoBinId

- **GIVEN** a PPC fires and hits
- **WHEN** the `AttackResolved` event is emitted
- **THEN** `payload.ammoBinId` SHALL be `null`

#### Scenario: AC/10 payload has the consumed bin id

- **GIVEN** an AC/10 fires and hits, drawing from bin `bin-abc123`
- **WHEN** the `AttackResolved` event is emitted
- **THEN** `payload.ammoBinId` SHALL equal `'bin-abc123'`


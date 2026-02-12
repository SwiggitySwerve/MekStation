## ADDED Requirements

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

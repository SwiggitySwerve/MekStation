# ammo-tracking (delta)

## ADDED Requirements

### Requirement: Ammo Consumption Wired Into Firing

The ammo-tracking system SHALL be connected to the attack-resolution path so that each weapon firing consumes rounds from a matching bin and prevents firing when no matching non-empty bin exists.

#### Scenario: Firing consumes 1 round from matching bin

- **GIVEN** a unit with an AC/10 bin containing 10 rounds
- **WHEN** the AC/10 fires
- **THEN** the bin's `remainingRounds` SHALL decrement to 9
- **AND** an `AmmoConsumed` event SHALL be emitted with binId and newCount

#### Scenario: Firing with empty bin is invalid

- **GIVEN** a unit whose AC/10 bins all have `remainingRounds = 0`
- **WHEN** the AC/10 attempts to fire
- **THEN** the attack SHALL be invalidated with reason `OutOfAmmo`
- **AND** no damage SHALL be resolved
- **AND** no `AmmoConsumed` event SHALL be emitted

#### Scenario: Multi-bin selection consumes first non-empty

- **GIVEN** a unit with two AC/10 bins, the first empty and the second full
- **WHEN** the AC/10 fires
- **THEN** consumption SHALL draw from the second bin
- **AND** the second bin's `remainingRounds` SHALL decrement

#### Scenario: Energy weapons do not consume ammo

- **GIVEN** a unit firing a Medium Laser
- **WHEN** the weapon fires
- **THEN** no ammo bin SHALL be touched
- **AND** no `AmmoConsumed` event SHALL be emitted

#### Scenario: Session start populates ammo bins

- **GIVEN** a mech construction that includes 2 tons of AC/10 ammo
- **WHEN** the game session is created from the construction
- **THEN** two separate `IAmmoBin` entries SHALL exist in unit state
- **AND** each bin SHALL start with `remainingRounds = maxRounds` (10 for AC/10)

#### Scenario: Cluster weapon consumes 1 salvo

- **GIVEN** an LRM-20 with a full bin (6 salvos per ton)
- **WHEN** the LRM-20 fires
- **THEN** the bin's `remainingRounds` SHALL decrement by 1 (salvo count, not missile count)

# critical-hit-resolution (delta)

## ADDED Requirements

### Requirement: Critical Resolution Invoked From Damage Pipeline

When damage exposes internal structure at a location, the system SHALL call `resolveCriticalHits()` on that location. TAC triggers (hit-location roll of 2) SHALL also call `resolveCriticalHits` regardless of remaining armor.

#### Scenario: Exposed structure triggers crit roll

- **GIVEN** an attack that reduces armor to 0 and damages structure at the target location
- **WHEN** the damage pipeline processes the hit
- **THEN** `resolveCriticalHits` SHALL be invoked for that location
- **AND** the result SHALL be translated into `CriticalHit` and `ComponentDestroyed` events

#### Scenario: TAC triggers crit regardless of armor

- **GIVEN** a hit-location roll of 2
- **WHEN** the damage pipeline processes the hit
- **THEN** `resolveCriticalHits` SHALL be invoked for the TAC location (CT for front/rear, LT for left, RT for right)
- **AND** the crit check SHALL occur even if the location still has armor

### Requirement: Critical Slot Selection Via Seeded RNG

Critical slot selection SHALL use the seeded `IDiceRoller`, not `Math.random`, so that replay is deterministic.

#### Scenario: Replay reproduces same slot

- **GIVEN** two identical replays of an event log with the same seed
- **WHEN** a critical hit is resolved in both
- **THEN** both replays SHALL select the same slot
- **AND** both SHALL emit the same `ComponentDestroyed` event

#### Scenario: No slot selectable

- **GIVEN** a location where every occupied slot is already destroyed
- **WHEN** `resolveCriticalHits` tries to select a slot
- **THEN** the critical SHALL be discarded (no effect)
- **AND** no `ComponentDestroyed` event SHALL be emitted

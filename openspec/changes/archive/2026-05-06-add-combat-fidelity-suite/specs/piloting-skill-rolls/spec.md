# Piloting Skill Rolls (delta)

## ADDED Requirements

### Requirement: PSR Trigger Events Emitted Before Resolution

When a unit accumulates a condition requiring a Piloting Skill Roll (≥20 damage in a single turn, actuator hit, gyro hit, leg destruction, fall recovery), the engine SHALL emit `PSRTriggered { unitId, reason, baseTargetNumber, modifiers[] }` in the same turn-phase the trigger occurred. The trigger event MUST emit BEFORE the corresponding `PSRResolved` event. The reason field MUST be one of `'damage_threshold' | 'actuator_hit' | 'gyro_hit' | 'leg_destroyed' | 'fall_recovery'`.

#### Scenario: 20+ damage in one turn triggers PSR

- **GIVEN** an Atlas takes 22 damage from a single attack
- **WHEN** the post-combat PSR phase processes the unit
- **THEN** `PSRTriggered { unitId, reason: 'damage_threshold', baseTargetNumber: <pilot-skill> }` MUST emit
- **AND** `PSRResolved { unitId, rolled, hit: bool }` MUST follow

#### Scenario: Multiple PSR triggers in same turn produce multiple events

- **GIVEN** a unit takes 30 damage AND loses an actuator AND has gyro destroyed in the same turn
- **WHEN** the PSR phase resolves
- **THEN** three `PSRTriggered` events MUST emit (one per reason)
- **AND** the resolution rules apply the worst single PSR (per BT Total Warfare) — only one `PSRResolved` MUST follow with `modifiers[]` aggregating across triggers

### Requirement: PSR Resolution Uses Injected Roller

`resolveAllPSRs()` and any per-PSR resolution helper SHALL accept and use the injected `D6Roller` per the determinism contract in `simulation-system`. The current implementation that uses unseeded `roll2d6()` MUST be updated to thread the roller through.

#### Scenario: Two seeded runs produce identical PSR outcomes

- **GIVEN** two seeded `SeededD6Roller` instances with seed `42`
- **AND** identical Atlas state with pending PSR for damage threshold
- **WHEN** PSR resolution runs against each roller
- **THEN** both MUST produce byte-identical `PSRResolved` events (same rolled value, same hit/miss outcome)

### Requirement: Fall Sequence Emits Full Event Chain

When a PSR fails and the unit falls, the engine SHALL emit `UnitFell { unitId, fromHex, toFacing }` followed by any cascading events (`PilotHit` if pilot takes damage from fall, `PSRTriggered { reason: 'fall_recovery' }` for next turn's recovery PSR). The current implementation emits `UnitFell` but does NOT emit follow-on events.

#### Scenario: Pilot takes damage from fall

- **GIVEN** a unit fails a PSR and falls
- **AND** the fall damage rules indicate the pilot takes 1 wound
- **WHEN** the fall resolves
- **THEN** `UnitFell` MUST emit
- **AND** `PilotHit { unitId, wounds: 1, source: 'fall' }` MUST follow
- **AND** `PSRTriggered { reason: 'fall_recovery' }` MUST emit at the start of the unit's next turn

### Requirement: Pending PSR State Carries Through Phase Transitions

The `IUnitGameState.pendingPSRs[]` queue (referenced in `combat-resolution` Tier-5 work) MUST persist across all combat phases within the same turn — damage in weapon attack phase queues a PSR, damage in physical attack phase queues another, the post-combat PSR phase resolves all queued PSRs in one batch. The queue MUST clear at turn boundary (start of next turn) per the existing post-archive contract.

#### Scenario: PSRs queued in both attack phases resolve in one batch

- **GIVEN** a unit takes 12 damage in weapon attack phase (no PSR yet)
- **AND** takes 10 damage in physical attack phase (now 22 cumulative — triggers PSR)
- **WHEN** the post-combat PSR phase runs
- **THEN** `PSRTriggered { reason: 'damage_threshold' }` MUST emit once
- **AND** the trigger's `damage` modifier MUST account for the cumulative 22 damage

#### Scenario: Pending PSRs clear at turn boundary

- **GIVEN** a unit with a pending PSR that resolved successfully (no fall)
- **WHEN** the next turn's start phase begins
- **THEN** the unit's `pendingPSRs[]` queue MUST be empty

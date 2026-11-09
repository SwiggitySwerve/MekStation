## ADDED Requirements

### Requirement: Idempotent Phase Damage PSR Queueing

The interactive phase-close pass SHALL NOT duplicate a canonical damage PSR
already pending for that unit in the same turn and phase. Both the inline
and phase-close producers SHALL use PSRTrigger.PhaseDamage20Plus as their
reasonCode. Existing trigger-event envelopes SHALL identify the phase of
pending entries without adding persisted fields. Separate qualifying weapon
and physical phases SHALL retain separate PSRs. The existing inline producer
and runner threshold deduplication SHALL remain unchanged.

#### Scenario: Weapon damage crosses the threshold

- **GIVEN** real weapon damage raises a unit's phase total from 15 to 20
- **WHEN** the weapon phase damage-PSR pass runs
- **THEN** exactly one damage-threshold PSR SHALL be queued for that unit
- **AND** resolving that queue SHALL roll that PSR exactly once

#### Scenario: Auto-resolve preserves inline threshold emission

- **GIVEN** runToCompletion resolves a hit that crosses 20 phase damage
- **WHEN** the engine advances without a phase-close damage-PSR scan
- **THEN** the inline producer SHALL emit exactly one damage-threshold trigger
- **AND** auto-resolve phase orchestration SHALL remain unchanged

#### Scenario: Repeated phase checks are idempotent

- **GIVEN** a unit already has a canonical damage PSR pending for this phase
- **WHEN** the phase-close producer runs again
- **THEN** no additional damage-threshold trigger SHALL be emitted

#### Scenario: Independent phases and controls

- **GIVEN** a unit takes at least 20 damage in each attack phase
- **WHEN** each phase closes
- **THEN** each phase SHALL queue its own damage-threshold PSR
- **AND** units below 20 damage and unrelated PSRs SHALL remain unchanged

### Requirement: Falls Clear Hull-Down Posture

The reducer and runner SHALL set prone to true and hull-down to false on
a fall, including a runner DFA miss. Facing, damage, pilot consequences,
and pending-PSR handling SHALL retain their existing behavior. Per-turn
movement resets SHALL preserve persistent posture and stuck state.

#### Scenario: A hull-down unit falls

- **GIVEN** a unit is hull-down
- **WHEN** a UnitFell event, runner PSR fall, or runner DFA miss is applied
- **THEN** the resulting unit SHALL be prone and SHALL NOT be hull-down
- **AND** unrelated units SHALL remain unchanged

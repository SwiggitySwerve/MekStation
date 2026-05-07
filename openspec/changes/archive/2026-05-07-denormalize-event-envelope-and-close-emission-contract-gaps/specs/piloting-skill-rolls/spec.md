## ADDED Requirements

### Requirement: PSRTriggered Carries Base Piloting Skill

Every `psr_triggered` event SHALL include the unit's `basePilotingSkill` (the unmodified piloting skill value before per-trigger and cumulative modifiers) in its payload. Consumers SHALL use this field to render the full PSR target-number arithmetic (`basePilotingSkill + additionalModifier + cumulative-mods = targetNumber`) without separately joining to the unit's pilot record.

The `basePilotingSkill` field is OPTIONAL on the payload to preserve compatibility with NDJSON event streams written before this change.

#### Scenario: PSR-triggered event carries base piloting skill from the unit

- **GIVEN** a unit with `pilot.piloting: 4`
- **AND** the runner triggers a PSR with `additionalModifier: 2` for reason `'gyro-hit'`
- **WHEN** the `psr_triggered` event is emitted
- **THEN** the event payload SHALL have `basePilotingSkill: 4`
- **AND** the event payload SHALL have `additionalModifier: 2`

#### Scenario: Legacy event streams without basePilotingSkill replay

- **GIVEN** an NDJSON event log written before this change (no `basePilotingSkill` on `psr_triggered` events)
- **WHEN** consumers process the events
- **THEN** processing SHALL succeed
- **AND** consumers MAY render the missing field as `'-'` or fall back to a separate unit-record lookup

### Requirement: UnitFell Carries Location and Reason

Every `unit_fell` event SHALL include the location at which the fall happened and a free-string `reason` describing the fall cause. Both fields are OPTIONAL on `IUnitFellPayload` for back-compat. The `reason` field is typed as `string` in this change; PR E (`structure-psr-reason-as-discriminated-code`) tightens it to a `PSRReasonCode` discriminated union.

The `location` field SHALL be populated from the runner's PSR resolution context (the hex coordinate or unit-internal location associated with the trigger) — for example `'left_leg'` when leg-damage caused the fall, `'center_torso'` for damage-PSR falls, or the hex-coordinate string when the fall was triggered by terrain.

#### Scenario: Damage-induced fall carries the structure location

- **GIVEN** a unit takes 20+ damage in a phase, triggering a damage-PSR
- **AND** the PSR fails, causing the unit to fall
- **WHEN** the `unit_fell` event is emitted
- **THEN** the event payload SHALL have a populated `location` (e.g. `'center_torso'` referencing the damaged location)
- **AND** the event payload SHALL have a populated `reason` (e.g. `'took-20-damage'`)

#### Scenario: Gyro-hit-induced fall carries the gyro location

- **GIVEN** a critical hit destroys a gyro slot
- **AND** the resulting PSR fails, causing the unit to fall
- **WHEN** the `unit_fell` event is emitted
- **THEN** the event payload SHALL have `location` populated with the gyro-bearing location (typically `'center_torso'` for standard mechs)
- **AND** the event payload SHALL have `reason` populated with a string identifying the gyro cause (e.g. `'gyro-hit'`)

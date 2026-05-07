## ADDED Requirements

### Requirement: Movement-Step PSR Trigger-Source Stamping

When the simulation runner triggers a `psr_triggered` event during the resolution of a movement step (skid on ice, leaping leg damage on elevation drop, jump landing on rough terrain, AttemptStand from a `'standUp'` step, swarm-dislodge from a `'shakeOffSwarm'` step, etc.), the runner SHALL populate `IPSRTriggeredPayload.triggerSource` with the string `'movement-step:<index>'` where `<index>` is the 0-based ordinal of the step in the corresponding `movement_declared.payload.steps` array.

This contract lets consumers correlate per-step PSR events back to the originating step without joining on hex coordinate or timing alone. The `triggerSource` field is REQUIRED on `IPSRTriggeredPayload` (already in the type), so this requirement narrows the value space for movement-induced PSRs without adding a new field.

For PSRs that fire OUTSIDE of movement-step resolution (damage-induced, heat-induced, recovery-induced), `triggerSource` SHALL retain its existing free-string semantics — for example `'damage-20-threshold'`, `'heat-26'`, `'gyro-destroyed'`, `'cockpit-recovery'`. PR E (`structure-psr-reason-as-discriminated-code`) tightens these into a discriminated `PSRReasonCode` union; this requirement does NOT depend on PR E.

#### Scenario: Skid PSR fired during a forward step references that step

- **GIVEN** a unit running across an ice hex at step index 2 of its movement chain
- **AND** the runner triggers a Skid PSR
- **WHEN** the `psr_triggered` event is emitted
- **THEN** the event payload SHALL have `triggerSource: 'movement-step:2'`
- **AND** the corresponding `movement_declared.payload.steps[2]` SHALL be a `'forward'` step entering an ice hex

#### Scenario: AttemptStand PSR from a stand-up step references the stand-up step's index

- **GIVEN** a prone unit whose movement chain begins with a `'standUp'` step at index 0
- **AND** the runner triggers an AttemptStand PSR (always fires for stand-up)
- **WHEN** the `psr_triggered` event is emitted
- **THEN** the event payload SHALL have `triggerSource: 'movement-step:0'`

#### Scenario: Damage-induced PSR retains its original trigger-source string

- **GIVEN** a unit takes 21+ damage in a phase, triggering a damage-PSR via the existing damage-threshold check
- **WHEN** the `psr_triggered` event is emitted
- **THEN** the event payload SHALL NOT have `triggerSource` starting with `'movement-step:'`
- **AND** the event payload's `triggerSource` SHALL retain its existing free-string value (e.g. `'damage-20-threshold'`)

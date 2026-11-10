## ADDED Requirements

### Requirement: Interim correction availability

The tactical GM surface SHALL disable gm.set-position-facing, gm.set-damage, gm.set-heat-ammo, gm.set-initiative, gm.set-lifecycle and gm.set-objective until [D-8 R10 correction events](../../proposal.md#d-8-r10-follow-up) preserve their effects. It SHALL display a visible explanation that the next game action would discard corrections until correction events are implemented, and associate that explanation with each disabled control.

#### Scenario: Each non-event correction is unavailable

- **GIVEN** a GM tactical dock with a selected active unit
- **WHEN** any of the six correction controls is rendered or activated by mouse or keyboard
- **THEN** it is disabled, its explanation is visible and accessible, and no preview or action is dispatched

### Requirement: Interim correction approval

The tactical surface SHALL return a typed blocked result with appended false for the six non-event commands, including stale ready previews, before state application or ledger writes. Unrecognized preview IDs SHALL be blocked rather than falling back to state correction. Existing authority and freshness checks SHALL remain enforced for supported commands.

#### Scenario: Direct or stale correction approval is refused

- **GIVEN** a preview for any disabled correction, including a formerly ready preview
- **WHEN** approval is invoked programmatically or repeatedly
- **THEN** it returns blocked with the temporary explanation, currentState is unchanged, and neither the engine setter, session update nor either ledger appends

#### Scenario: Unknown ready preview is refused

- **GIVEN** a ready preview ID that the surface did not issue
- **WHEN** approval is invoked
- **THEN** it returns blocked without engine or ledger mutation

### Requirement: Event-backed advance remains available

The tactical surface SHALL keep gm.advance-phase available through InteractiveSession.advancePhase. Already unsupported or deferred attack correction, unit reload and resource grant commands SHALL retain their existing refusal reasons.

#### Scenario: Advance Phase applies

- **GIVEN** a fresh authorized Advance Phase preview and live interactive session
- **WHEN** approved
- **THEN** the event-backed phase command runs, advances the phase and records approval without invoking applyCorrectedState

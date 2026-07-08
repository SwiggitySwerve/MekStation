## MODIFIED Requirements

### Requirement: Tactical GM intervention surface
The tactical command surface SHALL provide owner or host GM users with combat intervention commands for correcting combat state, undoing or repairing actions, withdrawing or rescuing units, reloading unit configuration, and resolving manual conflicts.

#### Scenario: GM previews combat correction
- **WHEN** a GM selects a combat intervention during an active battle
- **THEN** the surface SHALL show before/after state, affected units, public net effect, private rationale field, conflict warnings, and approval controls before commit

#### Scenario: Player cannot access GM commands
- **WHEN** a non-GM player views the tactical command surface
- **THEN** GM intervention controls SHALL be hidden or disabled and SHALL NOT expose private GM context

## ADDED Requirements

### Requirement: Approved tactical interventions commit to the live session

An approved tactical GM intervention SHALL apply its projected effects to the live interactive engine session before reporting success. Display projections (turn rail, pending badges) SHALL reconcile to the committed engine state, and subsequent player actions SHALL validate against the post-intervention state. A correction family whose projected effects cannot be applied to live state SHALL return an explicit deferred or unsupported response and SHALL NOT report approval success.

#### Scenario: Approved phase advance changes the engine phase
- **GIVEN** an interactive session in the Initiative phase and a ready "Advance Phase (GM)" preview
- **WHEN** the GM approves the intervention
- **THEN** the live engine session's phase SHALL advance (Initiative rolls initiative and enters Movement)
- **AND** a subsequent legal player action for the new phase SHALL succeed without a phase-validation error

#### Scenario: Approval applies effects exactly once
- **WHEN** a GM approves a tactical intervention whose effects are already shown as a pending projection
- **THEN** the committed state SHALL reflect the effect exactly once (the projection is replaced by, not stacked on, the committed state)

#### Scenario: Uncommittable family is explicit
- **GIVEN** a correction family whose projected effects are not yet appliable to the live session
- **WHEN** the GM attempts approval
- **THEN** the surface SHALL return an explicit deferred or unsupported response, append nothing, and leave the session unchanged

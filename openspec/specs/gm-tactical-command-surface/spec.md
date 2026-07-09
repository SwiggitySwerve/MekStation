# gm-tactical-command-surface Specification

## Purpose

Defines how tactical GM command controls route through intervention preview, confirmation, manual takeover, and player-public log surfaces without treating shell mode as authority.
## Requirements
### Requirement: Tactical GM Commands Use Intervention Preview Pipeline

The tactical command dock SHALL replace GM command stub dispatches with GM intervention preview requests. Shell mode MAY control whether GM controls are visible, but it SHALL NOT be treated as service-level authority.

#### Scenario: GM command produces preview intent
- **GIVEN** the tactical dock is rendered in GM shell mode
- **WHEN** a GM command is committed without a mounted preview service
- **THEN** the command SHALL dispatch a structured GM intervention preview intent
- **AND** it SHALL NOT dispatch legacy stub action ids

#### Scenario: Service authority rejects exposed controls
- **GIVEN** a GM command is visible because the shell is in GM mode
- **WHEN** the preview service evaluates the request with non-GM authority
- **THEN** the confirmation surface SHALL show a rejected preview
- **AND** approval SHALL remain disabled

### Requirement: GM Confirmation Shows Private and Public Effects

The tactical GM confirmation UI SHALL show GM-private detail, player-public net effect, conflicts, and manual-takeover state before approval.

#### Scenario: Ready preview can be approved
- **GIVEN** the GM preview service returns a ready intervention preview
- **WHEN** the confirmation UI renders
- **THEN** it SHALL show the GM-private reason
- **AND** it SHALL show the player-public summary and changed state refs
- **AND** approving SHALL call the GM intervention approval handler

#### Scenario: Manual takeover state is explicit
- **GIVEN** the GM preview service returns a manual-takeover preview
- **WHEN** the confirmation UI renders
- **THEN** it SHALL show the blocking conflict
- **AND** the approval control SHALL be disabled
- **AND** the manual takeover control SHALL call the manual takeover handler

### Requirement: Player Log Uses Public Projection Only

The tactical command surface SHALL render player-facing intervention log entries from public projections only.

#### Scenario: Hidden GM notes are not shown in public log
- **GIVEN** a GM intervention record contains GM-private hidden notes
- **WHEN** the player-facing log surface renders the record
- **THEN** it SHALL show only the public net effect
- **AND** it SHALL NOT show hidden notes, private reason, or default outcome

### Requirement: GM Confirmation Is Accessible

The GM confirmation and manual takeover controls SHALL expose accessible dialog semantics and named controls.

#### Scenario: Confirmation dialog is screen-reader reachable
- **GIVEN** a GM intervention preview is open
- **WHEN** assistive technology queries the command surface
- **THEN** the confirmation surface SHALL be exposed as a labelled dialog
- **AND** approve, cancel, and manual takeover controls SHALL be reachable by accessible name or role

### Requirement: Tactical GM Combat Correction Commands
The tactical GM command surface SHALL expose command intents for the supported combat correction families and SHALL route each command through the GM intervention preview pipeline rather than legacy command stubs.

#### Scenario: GM combat command families are exposed
- **WHEN** the tactical command registry builds GM commands
- **THEN** it SHALL include commands for phase/initiative, position/facing, damage, heat/ammo, lifecycle, attack-result, objective-state, active-unit reload, and resource correction
- **AND** each command SHALL commit a structured GM intervention preview intent

#### Scenario: Combat command routes to correction family
- **WHEN** the GM preview adapter receives a tactical GM command with a matching combat correction payload
- **THEN** it SHALL build a combat-domain intervention ledger command using that correction family
- **AND** the preview SHALL use the existing combat intervention implementer for authority, projection, redaction, and approval state

#### Scenario: Tactical command without detailed payload explains required data
- **WHEN** a GM command needs correction details that are not available in the tactical context
- **THEN** the preview SHALL be blocked or require manual takeover with a clear reason
- **AND** it SHALL NOT produce a ready no-op combat correction

### Requirement: Tactical Unit Reload Command
The tactical GM command surface SHALL expose active-unit reload as a GM intervention command that routes to the unit-reload intervention domain.

#### Scenario: Unit reload command routes to reload domain
- **WHEN** the GM requests active-unit reload from the tactical command surface
- **THEN** the preview adapter SHALL build a unit-reload ledger command for the selected or active unit
- **AND** the unit-reload implementer SHALL own source snapshot validation, conflict detection, and manual takeover status

### Requirement: Tactical GM intervention surface
The tactical command surface SHALL provide owner or host GM users with combat intervention commands for correcting combat state, undoing or repairing actions, withdrawing or rescuing units, reloading unit configuration, and resolving manual conflicts.

#### Scenario: GM previews combat correction
- **WHEN** a GM selects a combat intervention during an active battle
- **THEN** the surface SHALL show before/after state, affected units, public net effect, private rationale field, conflict warnings, and approval controls before commit

#### Scenario: Player cannot access GM commands
- **WHEN** a non-GM player views the tactical command surface
- **THEN** GM intervention controls SHALL be hidden or disabled and SHALL NOT expose private GM context

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


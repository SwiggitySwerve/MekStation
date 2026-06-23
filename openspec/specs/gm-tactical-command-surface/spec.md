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

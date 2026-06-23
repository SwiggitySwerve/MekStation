## ADDED Requirements

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

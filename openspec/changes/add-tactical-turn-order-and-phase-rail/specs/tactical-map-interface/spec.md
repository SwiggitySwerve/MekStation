## ADDED Requirements

### Requirement: Tactical Turn Order Rail

The tactical map interface SHALL render a turn order rail that communicates phase, active side, active unit, upcoming units, and unresolved action counts.

#### Scenario: Rail shows current and upcoming activations
- **GIVEN** a tactical session has multiple units across both sides
- **WHEN** the rail renders during an interactive phase
- **THEN** the current active unit SHALL be visually distinct
- **AND** upcoming units SHALL be shown in initiative order where the session exposes one
- **AND** completed, skipped, destroyed, or withdrawn units SHALL use distinct compact states

#### Scenario: Rail selects and focuses units
- **GIVEN** the player selects a unit in the rail
- **WHEN** the unit is visible and selectable
- **THEN** the map SHALL select or focus that unit according to phase rules
- **AND** if the unit is hidden by fog or unavailable, the rail SHALL explain why it cannot be focused

### Requirement: Phase Progression Controls

The tactical map interface SHALL provide phase progression controls that distinguish legal advance, optional skip, and blocked advance.

#### Scenario: End phase button is blocked with reasons
- **GIVEN** required actions remain
- **WHEN** the player hovers or activates End Phase
- **THEN** the UI SHALL list unresolved blockers
- **AND** the player SHALL be able to focus the first blocker from that list

#### Scenario: Optional skip remains explicit
- **GIVEN** an attack is optional for the active unit
- **WHEN** the player chooses to skip
- **THEN** the UI SHALL confirm the skip state for that unit
- **AND** the phase rail SHALL mark the unit as skipped rather than silently removing it

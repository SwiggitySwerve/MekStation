## ADDED Requirements

### Requirement: Tactical Command Registry

The tactical map interface SHALL expose a command registry for active-unit and map-context actions.

#### Scenario: Active unit command set follows phase
- **GIVEN** a player unit is selected during the Movement phase
- **WHEN** the action dock renders
- **THEN** movement, facing, stand/stabilize, and cancel commands SHALL be available according to engine validation
- **AND** weapon and physical attack commands SHALL be absent or disabled with phase-specific reasons

#### Scenario: Disabled command explains invalidity
- **GIVEN** a unit cannot fire a selected weapon because of range, heat, ammo, or arc
- **WHEN** the weapon command is shown
- **THEN** the command SHALL expose a disabled reason derived from rule validation
- **AND** the UI SHALL show that reason in a tooltip or detail pane

### Requirement: Command Preview Lifecycle

The tactical action menu system SHALL preview irreversible command outcomes before commit.

#### Scenario: Movement preview shows path and facing
- **GIVEN** a player selects a movement destination
- **WHEN** the movement command preview is active
- **THEN** the map SHALL show the path, movement cost, destination, and proposed facing
- **AND** the confirm control SHALL commit only the currently previewed destination and facing

#### Scenario: Attack preview shows expected consequences
- **GIVEN** a player selects an enemy target during a weapon or physical attack phase
- **WHEN** an attack command preview is active
- **THEN** the UI SHALL show target, range band, to-hit number, selected weapons or physical attack type, heat cost, ammo impact, and likely damage envelope where available

### Requirement: Context Menus Mirror Command Registry

Hex and unit context menus SHALL be secondary views over the same command registry used by the action dock.

#### Scenario: Unit token context menu filters commands
- **GIVEN** the player right-clicks or long-presses a friendly unit token
- **WHEN** the context menu opens
- **THEN** it SHALL list commands valid for that unit and current phase
- **AND** selecting a command SHALL update the same selected command state used by the action dock

#### Scenario: Enemy token context menu targets enemy
- **GIVEN** the player opens a context menu on a visible enemy token
- **WHEN** attack commands are valid
- **THEN** target-aware commands SHALL preselect that enemy as the target
- **AND** command preview SHALL still require explicit confirmation before commit

### Requirement: Command Confirmation and Cancellation

The action menu system SHALL provide consistent commit, cancel, undo-where-supported, and end-phase behavior.

#### Scenario: Cancel returns to neutral selection state
- **GIVEN** a command preview is active
- **WHEN** the player cancels the preview
- **THEN** no engine action SHALL be committed
- **AND** selected unit and target state SHALL remain intact unless the player explicitly clears them

#### Scenario: End phase distinguishes no-op from unresolved actions
- **GIVEN** the player presses End Phase
- **WHEN** required actions remain for active units
- **THEN** the UI SHALL warn or cycle to the next required action according to match settings
- **AND** the engine SHALL not advance until required commits are resolved or explicitly skipped where legal

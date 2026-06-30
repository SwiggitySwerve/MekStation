# playable-command-screens Specification

## Purpose

Defines playable command screens requirements for playable command screens synced from change add-playable-command-screens.

## Requirements
### Requirement: Shared command screen grammar
All playable command screens SHALL use a shared command grammar: select a subject, inspect current state, preview an action, show legal and illegal reasons, commit the action, write a ledger or log entry, and expose the resulting state after commit.

#### Scenario: Command screen explains next action
- **WHEN** a player selects a unit, system, mission, roster unit, or GM intervention subject
- **THEN** the screen SHALL expose current state, available commands, blocked commands, and at least one reason or consequence for each command shown

#### Scenario: Command commit writes traceable result
- **WHEN** a command is committed from any playable command screen
- **THEN** the committed result SHALL include a ledger or log entry that identifies the command, subject, important inputs, and resulting state summary

### Requirement: Preview and commit agreement
Playable command screens SHALL derive previewed legality, costs, and resulting state from the same domain rules or projection data used by the commit path.

#### Scenario: Preview matches committed state
- **WHEN** a command preview reports legal movement, travel, deployment, refit, or intervention consequences
- **THEN** committing that command SHALL produce matching state changes or reject the command with an explicit drift error

### Requirement: Screen-to-screen continuity
Playable command screens SHALL preserve campaign, mission, unit, and return context when moving between campaign, combat, Mek stable, customizer, and GM surfaces.

#### Scenario: Return context survives tool handoff
- **WHEN** a player opens a fix surface from mission readiness or the Mek stable
- **THEN** returning to readiness SHALL restore the campaign and mission context and refresh the deployment validation against current canonical state

### Requirement: Map-first command layout
Map-based command screens SHALL keep the hex map or starmap as the primary workspace and use compact surrounding panels for phase/status, inspector details, action dock, lenses, and ledger/log summaries.

#### Scenario: Command panels do not replace the map
- **WHEN** the combat map or starmap is open at a supported desktop or laptop viewport
- **THEN** the map SHALL remain visible and usable while command panels show context, previews, and logs

### Requirement: GM and player projections
Playable command screens SHALL support role-aware projections so owner or host GM users can see private rationale and intervention controls while players see only authorized commands and public net effects.

#### Scenario: Player sees net effect only
- **WHEN** a GM intervention has private rationale and a public result
- **THEN** the player-facing command log SHALL show the public net effect and SHALL NOT expose private GM rationale or hidden decision context

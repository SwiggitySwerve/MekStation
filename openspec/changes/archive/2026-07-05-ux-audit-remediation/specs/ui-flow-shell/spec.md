# ui-flow-shell Delta Specification

## MODIFIED Requirements

### Requirement: Gameplay hub flow shell
The gameplay hub SHALL render a flow shell that exposes the required journey-backed flows without replacing existing gameplay navigation, and the flow shell SHALL be gated to development/QC contexts (development builds or an explicit QC flag) rather than shown to players by default. The shell MUST show the journey ID, module, primary action, route checkpoints, QC command, and GM/player inspection intent for each flow.

#### Scenario: Hub shows validated journeys in QC context

- **WHEN** a developer opens `/gameplay` in a development/QC context (development build or explicit QC flag)
- **THEN** the hub shows flow-shell entries for character build, BattleMech build, 1v1 combat, 4v4 combat, contract campaign, short campaign, and long campaign

#### Scenario: Players do not see the QC matrix by default

- **WHEN** a user opens `/gameplay` in a production context without the QC flag
- **THEN** the flow shell (journey matrix, QC commands, inspection notes) SHALL NOT render
- **AND** the player navigation cards SHALL render as the primary hub content

#### Scenario: Existing gameplay cards remain available

- **WHEN** the flow shell renders on the gameplay hub
- **THEN** the existing Quick Game, Pilots, Forces, Campaigns, Encounters, Games, and Multiplayer navigation cards remain available

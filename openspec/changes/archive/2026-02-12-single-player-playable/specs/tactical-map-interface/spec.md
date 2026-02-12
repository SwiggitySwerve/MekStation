## ADDED Requirements

### Requirement: Hex-Level Test Selectors

The system SHALL provide data-testid attributes on individual hex elements for automated testing and agent interaction.

#### Scenario: Hex elements have coordinate selectors

- **WHEN** the hex grid is rendered
- **THEN** each hex group element SHALL have data-testid="hex-{q}-{r}" where q and r are the axial coordinates
- **AND** this SHALL NOT change the visual rendering of any hex

#### Scenario: Unit tokens have ID selectors

- **WHEN** unit tokens are rendered on the map
- **THEN** each unit token SHALL have data-testid="unit-token-{unitId}"

#### Scenario: Map container has selector

- **WHEN** the hex map component is rendered
- **THEN** the outermost wrapper SHALL have data-testid="hex-map-container"

### Requirement: Interactive Gameplay Integration

The system SHALL wire hex map click handlers to GameEngine interactive session actions during active game play.

#### Scenario: Hex click during movement phase triggers movement

- **WHEN** a player unit is selected and the game is in Movement phase
- **AND** the player clicks a highlighted (valid destination) hex
- **THEN** the click SHALL call InteractiveSession.applyAction() with a movement action
- **AND** the unit token SHALL move to the clicked hex

#### Scenario: Movement range overlay during movement phase

- **WHEN** a player unit is selected during Movement phase
- **THEN** valid destination hexes SHALL be highlighted using the existing movement overlay
- **AND** valid destinations SHALL be calculated from InteractiveSession.getAvailableActions()

#### Scenario: Unit token click during attack phase sets target

- **WHEN** the game is in WeaponAttack phase and a player unit is selected
- **AND** the player clicks an opponent unit token
- **THEN** the opponent unit SHALL be set as the attack target
- **AND** hit probability SHALL be displayed based on range and modifiers

#### Scenario: Non-game interaction preserved

- **WHEN** no game session is active (e.g., viewing a map in encounter setup)
- **THEN** hex map interactions SHALL behave as they currently do (pan, zoom, hover)
- **AND** game-specific click handlers SHALL NOT be active

### Requirement: AI-vs-AI Spectator Rendering

The system SHALL render AI-vs-AI battles on the hex map with visual progression.

#### Scenario: Unit movement animated during spectator mode

- **WHEN** spectator mode is playing and BotPlayer declares a movement
- **THEN** the unit token SHALL move to the new hex on the map
- **AND** the movement SHALL be visually distinguishable (not instant teleportation)

#### Scenario: Attack results shown during spectator mode

- **WHEN** spectator mode is playing and an attack resolves
- **THEN** hit/miss feedback SHALL be displayed on the map
- **AND** damage indicators SHALL appear on the target unit

#### Scenario: Spectator mode uses existing overlay system

- **WHEN** spectator mode renders movement or attack actions
- **THEN** it SHALL use the existing overlay system (movement range, attack range) for visual feedback
- **AND** no new rendering primitives SHALL be introduced

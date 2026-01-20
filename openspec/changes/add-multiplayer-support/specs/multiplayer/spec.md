# Specification: Multiplayer Support

## ADDED Requirements

### Requirement: Multiplayer Game Creation

The system SHALL allow players to create and join multiplayer games.

#### Scenario: Create multiplayer game

- **GIVEN** a user wants to play against another player
- **WHEN** they click "Create Multiplayer Game"
- **THEN** a game room is created with a shareable code
- **AND** the user becomes the host
- **AND** they can configure game settings

#### Scenario: Join multiplayer game

- **GIVEN** a user has a game room code
- **WHEN** they enter the code and join
- **THEN** they connect to the host
- **AND** they see the game setup screen
- **AND** they can select their force

#### Scenario: Ready check

- **GIVEN** both players are in the lobby
- **WHEN** both players mark themselves ready
- **THEN** the host can start the game
- **AND** the game begins for both players simultaneously

### Requirement: Real-Time Game Sync

The system SHALL synchronize game state between players in real-time.

#### Scenario: Action sync

- **GIVEN** a multiplayer game in progress
- **WHEN** a player performs an action
- **THEN** the action is sent to the opponent
- **AND** both players see the same game state
- **AND** latency is under 500ms for local networks

#### Scenario: Turn enforcement

- **GIVEN** it is Player A's turn to act
- **WHEN** Player B attempts an action
- **THEN** the action is rejected
- **AND** Player B sees "Waiting for opponent"

#### Scenario: Phase synchronization

- **GIVEN** players are in the movement phase
- **WHEN** both players lock their movement
- **THEN** the game advances to the next phase
- **AND** both players see the phase change

### Requirement: Disconnection Handling

The system SHALL handle player disconnections gracefully.

#### Scenario: Temporary disconnection

- **GIVEN** a game in progress
- **WHEN** a player loses connection temporarily
- **THEN** the opponent sees "Player disconnected"
- **AND** the game pauses
- **AND** the disconnected player can reconnect within 2 minutes

#### Scenario: Reconnection

- **GIVEN** a disconnected player
- **WHEN** they reconnect within the timeout
- **THEN** they receive the current game state
- **AND** the game resumes
- **AND** no actions are lost

#### Scenario: Permanent disconnection

- **GIVEN** a player does not reconnect within timeout
- **WHEN** the timeout expires
- **THEN** the opponent wins by forfeit
- **AND** the game ends

### Requirement: Spectator Mode

The system SHALL allow spectators to watch multiplayer games.

#### Scenario: Join as spectator

- **GIVEN** a game in progress
- **WHEN** a user joins as spectator
- **THEN** they see the game state in real-time
- **AND** they cannot perform actions
- **AND** players are notified of spectator presence

#### Scenario: Spectator view

- **GIVEN** a spectator is watching
- **WHEN** players perform actions
- **THEN** the spectator sees all actions
- **AND** can see both players' units (fog of war optional)

### Requirement: In-Game Communication

The system SHALL provide communication between players.

#### Scenario: Send chat message

- **GIVEN** a game in progress
- **WHEN** a player sends a chat message
- **THEN** the message appears for the opponent
- **AND** messages are timestamped

#### Scenario: Quick actions

- **GIVEN** a game in progress
- **WHEN** a player uses a quick action (e.g., "Good game")
- **THEN** the quick action displays to the opponent
- **AND** does not require typing

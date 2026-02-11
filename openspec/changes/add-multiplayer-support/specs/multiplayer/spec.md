# Specification: Multiplayer Support

> **Implementation note**: Builds on existing infrastructure:
>
> - P2P transport: `src/lib/p2p/` (Yjs + y-webrtc, room codes, CRDT sync)
> - Event sourcing: `src/utils/gameplay/gameEvents.ts`, `gameState.ts` (20+ event types, deterministic state)
> - Game sessions: `src/utils/gameplay/gameSession.ts` (phase/turn management, initiative)
> - Gameplay UI: `src/components/gameplay/` (HexMapDisplay, PhaseBanner, ActionBar, etc.)
> - Quick Game: `src/stores/useQuickGameStore.ts`, `src/components/quickgame/`
>
> **Transport**: Yjs Y.Array as append-only event log. Host writes, all read. CRDT handles sync.
> **Protocol**: Host-authoritative. Host validates all actions and performs all dice rolls.
> **Scope**: 2-player (1v1) real-time via WebRTC. Quick Game is primary entry point.

## ADDED Requirements

### Requirement: Multiplayer Game Creation

The system SHALL allow players to create and join multiplayer Quick Games using room codes.

#### Scenario: Create multiplayer game

- **GIVEN** a user navigates to Quick Game and selects "Multiplayer"
- **WHEN** they click "Create Game" and set a BV limit
- **THEN** a game room is created with a shareable 6-character code (via `roomCodes.ts`)
- **AND** the user becomes the host (`GameSide.Player`)
- **AND** they see the lobby with their room code displayed

#### Scenario: Join multiplayer game

- **GIVEN** a user has a game room code
- **WHEN** they enter the code and click "Join"
- **THEN** a WebRTC connection is established (via Yjs y-webrtc)
- **AND** they see the lobby with the host's configured BV limit
- **AND** they become the guest (`GameSide.Opponent`)

#### Scenario: Force selection with BV limit

- **GIVEN** both players are in the lobby
- **WHEN** each player selects units from the compendium
- **THEN** their total BV is displayed and enforced against the BV limit
- **AND** the host's BV calculation is authoritative (EC-4)
- **AND** neither player can see the other's specific unit choices until game start

#### Scenario: Ready check and game start

- **GIVEN** both players have selected forces within BV limit
- **WHEN** both players mark themselves ready
- **THEN** the host can click "Start Game"
- **AND** the host validates guest's force BV ≤ limit before creating game session
- **AND** the initial game state is broadcast via Yjs Y.Array
- **AND** both players enter the gameplay view simultaneously

### Requirement: Host-Authoritative Game Sync

The system SHALL synchronize game state between players using Yjs Y.Array as an append-only event log, with the host as the sole authority for validation and dice rolling.

#### Scenario: Action proposal and confirmation

- **GIVEN** a multiplayer game in progress and it is the active player's turn
- **WHEN** the active player performs an action (e.g., moves a unit)
- **THEN** the action is sent to the host as a proposal via Y.Map
- **AND** the host validates the action against current game state
- **AND** the host performs any required dice rolls
- **AND** the host appends the confirmed game event to the Y.Array
- **AND** both players derive identical state from the Y.Array

#### Scenario: Invalid action rejection

- **GIVEN** a player proposes an action
- **WHEN** the action is invalid (wrong turn, illegal move, etc.)
- **THEN** the host writes a rejection to the proposer's Y.Map slot with a reason string
- **AND** the proposing player's UI shows the rejection reason
- **AND** the game state remains unchanged

#### Scenario: Turn enforcement (alternating movement)

- **GIVEN** the game is in Movement phase with alternating activation
- **WHEN** the non-active player attempts to move a unit
- **THEN** the host rejects the action with reason "Not your turn"
- **AND** the non-active player sees "Waiting for opponent" with opponent's move animating

#### Scenario: Phase mismatch rejection (EC-2)

- **GIVEN** the host has advanced to WeaponAttack phase
- **WHEN** a client sends an action proposal tagged for Movement phase
- **THEN** the host rejects with reason "Phase mismatch — current phase is WeaponAttack"

#### Scenario: Weapon attack declaration and resolution

- **GIVEN** the game is in WeaponAttack phase
- **WHEN** both players lock their attack declarations
- **THEN** declarations are revealed (host reads both from Y.Map)
- **AND** the host resolves all attacks sequentially (host rolls all dice)
- **AND** each resolution event is appended to Y.Array one by one
- **AND** both players see attacks resolve sequentially in EventLogDisplay

#### Scenario: State consistency via Y.Array

- **GIVEN** both players have the same Y.Array contents (CRDT-synchronized)
- **WHEN** each player derives game state from the event log
- **THEN** both players have identical game state
- **AND** periodic Y.Array length checks confirm synchronization

### Requirement: Initiative Handling (EC-1)

The system SHALL handle initiative correctly in multiplayer, including tie resolution.

#### Scenario: Initiative roll

- **GIVEN** a new turn begins
- **WHEN** the host rolls initiative for both players
- **THEN** both 2d6 results are broadcast as an InitiativeRolled event
- **AND** the loser moves first (tactical disadvantage)

#### Scenario: Initiative tie

- **GIVEN** both players roll the same initiative value
- **WHEN** the tie is detected
- **THEN** the host automatically re-rolls
- **AND** the re-roll is broadcast as a new InitiativeRolled event
- **AND** ties continue to re-roll until broken

### Requirement: Disconnection Handling

The system SHALL handle player disconnections gracefully using Yjs reconnection and event log replay.

#### Scenario: Temporary disconnection with reconnection

- **GIVEN** a game in progress
- **WHEN** a player loses connection temporarily
- **THEN** the opponent sees "Player disconnected — waiting for reconnection"
- **AND** the game pauses (no actions accepted from disconnected player)
- **AND** the P2P layer attempts automatic reconnection (exponential backoff)
- **AND** on reconnection, Yjs Y.Array CRDT auto-syncs missed events
- **AND** the client replays events via `deriveState()` to rebuild current state
- **AND** the game resumes from the current phase

#### Scenario: Forfeit by timeout

- **GIVEN** a player (non-host) does not reconnect within timeout (default: 2 minutes)
- **WHEN** the timeout expires
- **THEN** the host appends a GameEnded event with reason `'forfeit'`
- **AND** the remaining player wins

#### Scenario: Host disconnection (EC-7)

- **GIVEN** the host loses connection
- **WHEN** the client detects host absence via Yjs awareness
- **THEN** the client shows "Host disconnected — waiting for reconnection"
- **AND** no actions can be performed (host is authoritative)
- **AND** if timeout expires, the game ends with reason `'abandoned'`

#### Scenario: Intentional leave (EC-3)

- **GIVEN** a game in progress
- **WHEN** a player closes their browser tab
- **THEN** a `beforeunload` handler sends `game_leave_intentional` via Y.Map
- **AND** the opponent immediately sees "Opponent left the game"
- **AND** the game ends as `'concede'` (no 2-minute wait)

### Requirement: Quick Messages

The system SHALL provide predefined quick messages for in-game communication.

#### Scenario: Send quick message

- **GIVEN** a game in progress or in the lobby
- **WHEN** a player selects a quick message ("Good game", "Nice shot", "Thinking...", "Ready", "Rematch?")
- **THEN** the message is broadcast via Y.Map to the opponent
- **AND** the message appears as a toast notification
- **AND** messages are rate-limited (max 1 per 5 seconds)

### Requirement: Lightweight Waiting UX

The system SHALL provide an engaging experience while waiting for the opponent's action.

#### Scenario: Opponent movement visible in real-time

- **GIVEN** it is the opponent's turn to move a unit
- **WHEN** the host confirms the opponent's movement
- **THEN** the waiting player sees the unit move on their hex map
- **AND** game stats are visible (BV remaining, damage summary per side)

#### Scenario: Waiting overlay

- **GIVEN** the opponent is taking their turn
- **WHEN** the waiting player's UI updates
- **THEN** a semi-transparent overlay shows "Waiting for opponent..." with current phase
- **AND** quick messages are available
- **AND** the event log is scrollable to review previous actions

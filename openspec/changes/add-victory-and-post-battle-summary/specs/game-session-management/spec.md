# game-session-management Specification Delta

## ADDED Requirements

### Requirement: Concede End Condition

The system SHALL allow a side to concede an active session, producing a
`GameEnded` event whose winner is the opposite side and whose reason is
`concede`.

#### Scenario: Player concedes active game

- **GIVEN** an active session with both sides still having units
- **WHEN** `InteractiveSession.concede(GameSide.Player)` is called
- **THEN** a `GameEnded` event SHALL be appended with
  `{winner: GameSide.Opponent, reason: "concede"}`
- **AND** `currentState.status` SHALL become `GameStatus.Completed`

#### Scenario: Concede rejected after completion

- **GIVEN** a session already in `GameStatus.Completed`
- **WHEN** `InteractiveSession.concede(GameSide.Player)` is called
- **THEN** the call SHALL throw an error `"Game is not active"`
- **AND** no additional event SHALL be appended

### Requirement: Turn Limit End Condition

The system SHALL end an active session with `reason: "turn_limit"` when
the End phase completes on a turn greater than `config.turnLimit`,
evaluating the winner by total damage dealt (within a 5% tolerance for a
draw).

#### Scenario: Turn limit with clear damage winner

- **GIVEN** `config.turnLimit = 20`, the session enters End phase on
  turn 21, Player dealt 300 damage, Opponent dealt 200 damage
- **WHEN** the victory check runs
- **THEN** a `GameEnded` event SHALL be appended with
  `{winner: GameSide.Player, reason: "turn_limit"}`

#### Scenario: Turn limit with near-equal damage is draw

- **GIVEN** Player dealt 310 damage, Opponent dealt 300 damage (within
  5% of each other)
- **WHEN** the turn-limit victory check runs
- **THEN** the `GameEnded` event SHALL have `{winner: "draw", reason:
"turn_limit"}`

#### Scenario: Turn limit does not fire below threshold

- **GIVEN** `config.turnLimit = 20` and the session enters End phase on
  turn 15
- **WHEN** the victory check runs
- **THEN** no turn-limit `GameEnded` event SHALL be appended
- **AND** the session SHALL continue to the next turn

### Requirement: Game Completed Store Projection

The system SHALL expose an `isGameCompleted` selector on
`useGameplayStore` that the UI uses to trigger a redirect from the
combat screen to the victory screen.

#### Scenario: Selector true after GameEnded

- **GIVEN** a session appended a `GameEnded` event
- **WHEN** `isGameCompleted` is read
- **THEN** it SHALL return `true`

#### Scenario: Selector false while game active

- **GIVEN** an active session with no `GameEnded` event
- **WHEN** `isGameCompleted` is read
- **THEN** it SHALL return `false`

### Requirement: Match Log Persistence Handshake

The system SHALL, on `GameEnded`, write a derived `IPostBattleReport`
for the session to the match log store via POST `/api/matches` and SHALL
expose GET `/api/matches/[id]` to retrieve it after reload.

#### Scenario: GameEnded triggers persistence

- **GIVEN** a `GameEnded` event is appended to the session
- **WHEN** the persistence side-effect runs
- **THEN** a POST SHALL be made to `/api/matches` with the derived
  `IPostBattleReport` body
- **AND** the response SHALL contain the new `matchId`

#### Scenario: Reload reads persisted report

- **GIVEN** a match previously persisted with id `"m-123"`
- **WHEN** `/gameplay/matches/m-123` loads
- **THEN** a GET SHALL be made to `/api/matches/m-123`
- **AND** the response SHALL match the originally persisted report

## ADDED Requirements

### Requirement: Game Session Page — Interactive Mode

The system SHALL render an interactive turn-by-turn game session on the hex map with phase indicators, unit selection, and action controls.

#### Scenario: Display phase indicator

- **WHEN** a game session is active
- **THEN** the current phase name SHALL be displayed (Initiative, Movement, WeaponAttack, Heat, End)
- **AND** the turn counter SHALL show the current turn number

#### Scenario: Select unit during movement phase

- **WHEN** the player clicks a friendly unit token during the Movement phase
- **THEN** valid destination hexes SHALL be highlighted on the map
- **AND** the selected unit panel SHALL show the unit's current armor, weapons, heat, and movement points

#### Scenario: Move unit to destination hex

- **WHEN** the player clicks a highlighted destination hex after selecting a unit
- **THEN** the unit token SHALL move to the new hex position
- **AND** a movement event SHALL be emitted to the game session
- **AND** the movement overlay SHALL clear

#### Scenario: Select weapon and target during attack phase

- **WHEN** the player selects a friendly unit during the WeaponAttack phase
- **THEN** the weapon panel SHALL display available weapons with damage, heat, and range
- **AND** clicking an opponent unit SHALL set it as the target
- **AND** the hit probability SHALL be displayed based on gunnery, range, and movement modifiers

#### Scenario: Fire weapons at target

- **WHEN** the player clicks the Fire button with weapons selected and a target set
- **THEN** the attack SHALL resolve using real to-hit calculations
- **AND** hit/miss feedback SHALL be displayed
- **AND** if hit, damage applied to the target SHALL be shown

#### Scenario: AI opponent takes turn automatically

- **WHEN** the player finishes all actions and advances to the opponent's phase
- **THEN** an "Opponent's Turn" indicator SHALL be displayed
- **AND** the AI SHALL execute its turn via BotPlayer
- **AND** the phase SHALL advance back to the player's next turn

#### Scenario: Display victory or defeat

- **WHEN** the game ends (all units of one side destroyed or turn limit reached)
- **THEN** a victory/defeat/draw announcement SHALL be displayed
- **AND** navigation options SHALL be offered (Watch Replay, Play Again, Return)

### Requirement: Game Results Page

The system SHALL display comprehensive battle results after a game completes.

#### Scenario: Show winner announcement

- **WHEN** a game completes
- **THEN** the winner (Victory, Defeat, or Draw) SHALL be displayed prominently
- **AND** the reason for the outcome SHALL be shown (elimination, turn limit, etc.)

#### Scenario: Show battle statistics

- **WHEN** viewing game results
- **THEN** the following statistics SHALL be displayed: turns played, total damage dealt by player, total damage received, player units destroyed, opponent units destroyed

#### Scenario: Show per-unit status

- **WHEN** viewing game results
- **THEN** each participating unit SHALL show its final status: intact, damaged, or destroyed
- **AND** damaged units SHALL show remaining armor percentage

#### Scenario: Show key moments

- **WHEN** viewing game results
- **THEN** notable events from KeyMomentDetector SHALL be listed (first blood, headshot, etc.)
- **AND** moments SHALL be ordered by significance tier

#### Scenario: Navigation from results

- **WHEN** viewing game results
- **THEN** a "Watch Replay" button SHALL navigate to the existing replay page with the game's events
- **AND** a "Play Again" button SHALL navigate back to Quick Play setup (for quick games)
- **AND** a "Return to Campaign" button SHALL appear when the game was a campaign mission

### Requirement: Pre-Battle Mode Selection

The system SHALL offer a choice between auto-resolve and interactive play before starting a battle.

#### Scenario: Mode selection from Quick Play

- **WHEN** the player completes Quick Play setup and clicks Start Battle
- **THEN** a mode selection SHALL be offered: "Auto-Resolve" and "Play Manually"
- **AND** "Auto-Resolve" SHALL run GameEngine.runToCompletion() and navigate to results
- **AND** "Play Manually" SHALL start GameEngine.createInteractiveSession() on the hex map

#### Scenario: Mode selection from encounter launch

- **WHEN** an encounter is launched
- **THEN** a pre-battle screen SHALL display both forces with unit names and total BV
- **AND** the scenario template name SHALL be shown
- **AND** "Auto-Resolve" and "Play Manually" options SHALL be available

### Requirement: AI-vs-AI Spectator Mode

The system SHALL provide a spectator mode where BotPlayer controls both sides, rendered on the hex map with playback controls.

#### Scenario: Start spectator mode

- **WHEN** the player selects "Watch AI Battle" from Quick Play or "Simulate Battle" from an encounter
- **THEN** the hex map SHALL render with units from both sides
- **AND** BotPlayer SHALL control both the player and opponent sides

#### Scenario: Playback controls

- **WHEN** spectator mode is active
- **THEN** Play/Pause, speed (1×, 2×, 4×), and Step Forward controls SHALL be available
- **AND** Play SHALL auto-advance turns with a configurable delay between actions
- **AND** Pause SHALL freeze the battle at the current state

#### Scenario: Battle progresses visually

- **WHEN** spectator mode is playing
- **THEN** unit tokens SHALL move on the hex map during movement phases
- **AND** attack results SHALL be displayed during weapon attack phases
- **AND** the turn counter SHALL increment

#### Scenario: Spectator battle completes

- **WHEN** the AI-vs-AI battle ends
- **THEN** the results page SHALL be displayed with the same format as player games
- **AND** the "Watch Replay" option SHALL be available

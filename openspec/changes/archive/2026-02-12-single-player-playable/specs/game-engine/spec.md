## ADDED Requirements

### Requirement: Compendium Unit Adapter

The system SHALL convert compendium unit data into runtime game state compatible with all combat utilities.

#### Scenario: Adapt canonical unit to game state

- **WHEN** adaptCompendiumUnit is called with a canonical unit ID (e.g., Atlas AS7-D) and optional pilot
- **THEN** an IUnitGameState SHALL be returned with armor per location matching the unit's armor allocation, structure per location from the internal structure table, weapons mapped from the unit's equipment list, and movement points calculated from engine rating and weight

#### Scenario: Calculate movement points from engine rating

- **WHEN** adapting a unit with engine rating 300 and weight 100
- **THEN** walkMP SHALL equal floor(300 / 100) = 3
- **AND** runMP SHALL equal floor(3 × 1.5) = 4
- **AND** jumpMP SHALL equal the number of jump jets installed (0 if none)

#### Scenario: Map weapons from equipment data

- **WHEN** adapting a unit with AC/20, 2× Medium Laser, and LRM-20
- **THEN** each weapon SHALL have: name, damage value, heat generated, minimum range, short range, medium range, long range, and ammo count (if applicable)

#### Scenario: Default pilot skills when no pilot assigned

- **WHEN** adaptCompendiumUnit is called without a pilot argument
- **THEN** gunnery SHALL default to 4
- **AND** piloting SHALL default to 5

#### Scenario: Custom variant units adapt identically

- **WHEN** adapting a user-created custom variant
- **THEN** the output SHALL follow the same mapping as canonical units
- **AND** custom equipment and armor allocations SHALL be respected

#### Scenario: Adapt unit with initial damage for campaign carry-forward

- **WHEN** adaptCompendiumUnit is called with an initialDamage parameter containing reduced armor values
- **THEN** the returned IUnitGameState SHALL use the reduced armor values instead of full armor
- **AND** structure values SHALL reflect any prior structural damage

### Requirement: GameEngine Auto-Resolve Mode

The system SHALL provide a runToCompletion method that executes an entire battle automatically using BotPlayer for both sides.

#### Scenario: Auto-resolve produces a winner

- **WHEN** runToCompletion is called with player and opponent unit lists
- **THEN** an IGameSession SHALL be returned with status COMPLETED
- **AND** the result SHALL contain a winner (player, opponent, or draw) and a reason (elimination, turn_limit, or mutual_destruction)

#### Scenario: Auto-resolve uses real combat utilities

- **WHEN** auto-resolve executes attacks
- **THEN** damage values SHALL vary based on actual weapon damage and to-hit calculations
- **AND** damage SHALL NOT be a fixed constant (e.g., NOT SIMPLE_DAMAGE = 5)

#### Scenario: Auto-resolve generates replay-compatible events

- **WHEN** auto-resolve completes
- **THEN** all game events SHALL be compatible with the existing replay system
- **AND** event types SHALL match those defined in GameEventType enum

#### Scenario: Auto-resolve uses seeded PRNG for determinism

- **WHEN** runToCompletion is called with the same seed and same units
- **THEN** identical results SHALL be produced
- **AND** the same event sequence SHALL be generated

#### Scenario: Auto-resolve completes within performance target

- **WHEN** runToCompletion is called with 4 units per side on a radius-7 map
- **THEN** execution SHALL complete within 500ms

### Requirement: GameEngine Interactive Mode

The system SHALL provide a createInteractiveSession method that returns a session supporting turn-by-turn play with player input.

#### Scenario: Create interactive session

- **WHEN** createInteractiveSession is called with player and opponent unit lists and map configuration
- **THEN** an InteractiveSession object SHALL be returned
- **AND** the session SHALL be in the Initiative phase of turn 1

#### Scenario: Get available actions for a unit

- **WHEN** getAvailableActions is called with a unit ID during the Movement phase
- **THEN** a list of valid destination hexes SHALL be returned based on the unit's movement points and terrain costs

#### Scenario: Apply player movement action

- **WHEN** applyAction is called with a movement action (unit ID, destination hex)
- **THEN** a MovementDeclared game event SHALL be emitted
- **AND** the unit's position in game state SHALL update to the destination

#### Scenario: Apply player attack action

- **WHEN** applyAction is called with an attack action (attacker ID, target ID, selected weapons)
- **THEN** an AttackDeclared game event SHALL be emitted
- **AND** to-hit resolution SHALL use real gunnery, range, and movement modifiers
- **AND** an AttackResolved event SHALL be emitted with hit/miss result
- **AND** if hit, a DamageApplied event SHALL be emitted

#### Scenario: Advance phase through full turn cycle

- **WHEN** advancePhase is called sequentially
- **THEN** phases SHALL cycle: Initiative → Movement → WeaponAttack → Heat → End
- **AND** each phase transition SHALL emit appropriate game events

#### Scenario: Run AI opponent turn

- **WHEN** runAITurn is called for the opponent side
- **THEN** BotPlayer SHALL make movement and attack decisions for all opponent units
- **AND** game events SHALL be emitted for each AI action

#### Scenario: Detect game over

- **WHEN** isGameOver is called after all units of one side are destroyed
- **THEN** true SHALL be returned
- **AND** getResult SHALL return the IGameOutcome with winner and reason

### Requirement: GameEngine Configuration

The system SHALL accept configuration for map size, turn limit, and victory conditions.

#### Scenario: Configure map radius

- **WHEN** GameEngine is initialized with mapRadius 7
- **THEN** the hex grid SHALL contain 3(7²) + 3(7) + 1 = 169 hexes

#### Scenario: Configure turn limit

- **WHEN** GameEngine is initialized with turnLimit 20
- **THEN** the game SHALL end after 20 turns if no elimination occurs
- **AND** the result reason SHALL be turn_limit
- **AND** the winner SHALL be determined by surviving unit count

#### Scenario: Default configuration

- **WHEN** GameEngine is initialized without explicit configuration
- **THEN** mapRadius SHALL default to 7
- **AND** turnLimit SHALL default to 30
- **AND** victoryConditions SHALL default to ["elimination"]

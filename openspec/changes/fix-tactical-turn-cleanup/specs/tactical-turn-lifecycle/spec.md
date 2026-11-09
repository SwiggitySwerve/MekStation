## ADDED Requirements

### Requirement: AI turn presentation recovery

The tactical store SHALL adopt the current interactive session and leave the opponent-turn presentation state after an AI turn succeeds or throws. It SHALL select the game-over presentation for terminal sessions and unit selection otherwise. An AI or phase-advance exception SHALL propagate unchanged.

#### Scenario: Opponent activation throws

- **GIVEN** a single-unit activation or full opponent turn is running
- **WHEN** AI execution or phase advancement throws
- **THEN** the original exception propagates
- **AND** the store adopts the current session and restores unit selection or game-over presentation

#### Scenario: Opponent activation ends the game

- **GIVEN** an opponent activation reaches a terminal session
- **WHEN** the activation finishes
- **THEN** the tactical presentation enters game over

### Requirement: Shared attack completion

Successful planned attacks, composed volleys, legacy weapon fire and Hold Fire SHALL use shared completion to clear attack plans, attack composition, target IDs, hit chance, selected unit, selected target and queued weapons. Completion SHALL preserve unrelated UI fields and adopt the current session and terminal state. Existing phase and input guards SHALL remain effective.

#### Scenario: A completed attack leaves stale drafts

- **GIVEN** both attack draft representations and targeting previews contain values
- **WHEN** any of the four attack actions completes
- **THEN** both drafts, targeting previews and tactical selections are cleared
- **AND** unrelated UI preferences and messages are preserved

#### Scenario: An attack cannot complete

- **GIVEN** an attack is outside its permitted phase, lacks required input or throws during declaration
- **WHEN** the action is invoked
- **THEN** successful-commit cleanup does not run

### Requirement: Animation reset cancels waiting advancement

Resetting an animation queue SHALL cancel a waiting phase advance without executing it, release the pending flag and remove its subscriptions. A subsequent Advance or Skip request SHALL wait for the new queue to drain and advance exactly once. Reset SHALL NOT report abandoned animations as completed.

#### Scenario: Reset replaces a queue with a new one

- **GIVEN** Advance or Skip is waiting on an active animation queue
- **WHEN** the queue resets and a new animation begins
- **THEN** the abandoned advance does not execute
- **AND** a new advance request executes exactly once after the new queue drains

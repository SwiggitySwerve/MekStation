## ADDED Requirements

### Requirement: Quick Game Completion Guard

The quick-game endGame action SHALL accept completion only when the game status is Active and its step is Playing.

#### Scenario: Active playing game completes

- **WHEN** endGame is called for an Active game at Playing
- **THEN** the game SHALL transition to Completed at Results with the supplied result and completion timestamp

#### Scenario: Invalid completion attempt

- **WHEN** endGame is called without a game or outside Active and Playing
- **THEN** the store SHALL remain unchanged

#### Scenario: Duplicate completion submission

- **GIVEN** a completed game
- **WHEN** endGame is called again with a different result
- **THEN** the first result and completion timestamp SHALL remain unchanged

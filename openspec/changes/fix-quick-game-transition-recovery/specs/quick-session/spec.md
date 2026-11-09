## ADDED Requirements

### Requirement: Quick Game Setup Transition Boundaries

The Quick Game nextStep action SHALL advance only from a valid, nonterminal setup step. Calls without a game, from Review, Playing, Results, or an unknown step SHALL leave store state unchanged. The existing requirement to select at least one player unit SHALL remain enforced.

#### Scenario: Setup advances through its valid steps

- **GIVEN** unit selection with at least one player unit
- **WHEN** nextStep is called
- **THEN** the game SHALL advance to scenario configuration
- **AND** a subsequent nextStep from scenario configuration SHALL advance to Review

#### Scenario: Invalid and terminal steps cannot wrap into setup

- **GIVEN** no game or a game at Review, Playing, Results, or an unknown step
- **WHEN** nextStep is called
- **THEN** the store SHALL remain unchanged

#### Scenario: Empty player force cannot advance

- **GIVEN** unit selection without a player unit
- **WHEN** nextStep is called
- **THEN** the game SHALL remain at unit selection and display the existing validation error

### Requirement: Quick Game Battle Error Recovery

The Battle Error card SHALL display the failure and offer Start New Setup. Activating it SHALL call the existing playAgain(false) action to create a fresh setup with the same player units and scenario configuration, cleared damage, and no battle result. It SHALL NOT start combat automatically.

#### Scenario: Recover from a failed battle

- **GIVEN** a Quick Game displaying Battle Error
- **WHEN** the user activates Start New Setup
- **THEN** playAgain(false) SHALL create a fresh setup and clear the error
- **AND** combat SHALL NOT start automatically

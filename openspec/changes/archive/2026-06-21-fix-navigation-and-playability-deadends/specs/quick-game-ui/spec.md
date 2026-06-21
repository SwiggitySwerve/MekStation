# quick-game-ui Delta — fix-navigation-and-playability-deadends

## ADDED Requirements

### Requirement: Auto-Resolve Labeling

The Quick Game surface SHALL honestly label the path that resolves the battle
without player input as "Auto-Resolve", so the user understands the battle
completes automatically before they choose it.

#### Scenario: Auto path is labeled Auto-Resolve

- **GIVEN** the Quick Game surface offers the path that runs the battle to
  completion without per-turn player input
- **WHEN** that path is presented to the user
- **THEN** it SHALL be labeled "Auto-Resolve"
- **AND** the label SHALL distinguish it from any interactive play option.

### Requirement: Interactive Skirmish On-Ramp

The Quick Game surface SHALL provide a low-friction interactive "Skirmish"
on-ramp that launches an interactive session on the hex board with the player
controlling one side, reachable without campaign or force setup, so a learner
can actually play rather than only auto-resolve or spectate. This requirement
guarantees the learner reaches the hex board via the existing interactive
session engine; full turn-UI parity with the tactical command shell is not
required by this requirement.

#### Scenario: Interactive Skirmish reaches the hex board

- **GIVEN** the Quick Game surface is rendered
- **WHEN** the user selects the interactive Skirmish on-ramp
- **THEN** an interactive session SHALL launch on the hex board with the player
  controlling one side
- **AND** the launch SHALL NOT require prior campaign or force setup
- **AND** the surface presented SHALL be the interactive tactical/hex-board
  surface rather than the auto-resolve results table.

#### Scenario: Interactive option distinct from spectator and auto-resolve

- **GIVEN** the Quick Game surface offers Auto-Resolve, spectator ("Watch AI
  Battle"), and the interactive Skirmish on-ramp
- **WHEN** the play options are enumerated
- **THEN** the interactive Skirmish on-ramp SHALL be a distinct option from both
  Auto-Resolve and the spectator path.

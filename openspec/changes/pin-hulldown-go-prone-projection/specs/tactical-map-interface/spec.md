# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Hull-Down Go-Prone Movement Action

The tactical map interface SHALL expose MegaMek's hull-down `GO_PRONE`
posture transition as a rules-backed movement action for Mek-style units,
using the same movement declaration, replay, and lock path as other movement
phase actions.

#### Scenario: Hull-down Mek-style unit can go prone for zero MP

- **GIVEN** the active unit is hull-down, not prone, uses Mek-style movement,
  and is in the Movement phase
- **WHEN** the player chooses Go Prone
- **THEN** the engine SHALL declare same-hex stationary movement with 0 MP and
  0 heat
- **AND** the declaration SHALL record `goProneAttempt` and a `goProne` step
- **AND** replay SHALL set `prone` to true, clear `hullDown`, and lock the
  unit's movement without emitting a stand-up PSR or `UnitStood` event.

#### Scenario: Invalid go-prone attempts explain their blocker

- **GIVEN** the active unit is not hull-down, already prone, lacks movement
  capability, or uses a non-Mek-style represented movement profile
- **WHEN** the player inspects or attempts Go Prone
- **THEN** the command or commit path SHALL reject the action with a
  player-facing reason before any posture state is changed.

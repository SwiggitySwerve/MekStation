# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Standing Hull-Down Movement Action

The tactical map interface SHALL expose MegaMek's standing `HULL_DOWN` posture
transition as a rules-backed movement action for Mek-style units, using the
same movement declaration, replay, and lock path as other movement phase
actions.

#### Scenario: Standing Mek-style unit can enter hull-down for 2 MP

- **GIVEN** the active unit is standing, not hull-down, uses Mek-style
  movement, has enough walk MP, and is in the Movement phase
- **WHEN** the player chooses Hull Down
- **THEN** the engine SHALL declare same-hex walk movement with 2 MP and
  walking movement heat
- **AND** the declaration SHALL record `hullDownEntryAttempt` and a
  `hullDown` step
- **AND** replay SHALL set `hullDown` to true, clear `prone`, and lock the
  unit's movement without emitting a stand-up PSR or `UnitStood` event.

#### Scenario: Invalid hull-down entry attempts explain their blocker

- **GIVEN** the active unit is prone, already hull-down, lacks movement
  capability, uses a non-Mek-style represented movement profile, lacks enough
  walk MP, or has a destroyed gyro
- **WHEN** the player inspects or attempts Hull Down
- **THEN** the command or commit path SHALL reject the action with a
  player-facing reason before any posture state is changed.

# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Hull-Down Exit Movement Projection

The tactical map interface SHALL project and commit Mek-style hull-down exit
movement as a rules-backed posture transition before ground movement, using
MegaMek `GET_UP` cost semantics and shared movement projection data.

#### Scenario: Hull-down ground highlights reserve exit MP

- **GIVEN** the active unit is hull-down, not prone, uses Mek-style movement,
  and is previewing walk or run movement
- **WHEN** the map derives movement range and hovered-destination metadata
- **THEN** each reachable ground option SHALL reserve the same `GET_UP` MP cost
  used by MegaMek before adding path movement cost
- **AND** movement labels, badges, and context rows SHALL expose the hull-down
  exit cost separately from terrain, elevation, heat, and stand-up PSR data.

#### Scenario: Direct hull-down jump is blocked until posture exit

- **GIVEN** the active unit is hull-down, uses Mek-style movement, and has jump
  MP
- **WHEN** the player previews or commands jump movement without first exiting
  hull-down
- **THEN** the jump option SHALL be blocked with a player-facing reason that the
  unit must stand before jumping
- **AND** the action dock SHALL present the same reason.

#### Scenario: Committed hull-down exit clears state through movement replay

- **GIVEN** a Mek-style hull-down unit commits a same-hex posture exit or
  ground movement
- **WHEN** the engine declares and locks the movement
- **THEN** the movement event SHALL record that hull-down exit was attempted
- **AND** replay SHALL clear `hullDown` without emitting a prone stand-up PSR or
  `UnitStood` event.

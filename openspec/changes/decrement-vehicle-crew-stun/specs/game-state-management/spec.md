## ADDED Requirements

### Requirement: Vehicle Crew Stun Round Countdown

The system SHALL decrement a positive vehicle crewStunnedPhases counter by one at the next round's Initiative boundary, matching MegaMek 48fcb2f64 Tank.java:1112-1121. The persisted field SHALL continue to be named crewStunnedPhases, although it counts rounds.

#### Scenario: Countdown and floor

- **GIVEN** a vehicle has two rounds of crew stun
- **WHEN** successive rounds begin
- **THEN** the counter SHALL become one, zero, and remain zero

#### Scenario: Intra-round and duplicate events

- **WHEN** phases advance within a round or an already-applied round boundary is repeated
- **THEN** the counter SHALL remain unchanged

#### Scenario: Runner and replay

- **GIVEN** the same vehicle state before a new round
- **WHEN** the standalone runner resets live state and the reducer folds the corresponding TurnStarted event
- **THEN** vehicle combat state SHALL be equal
- **AND** nonvehicle state and unrelated vehicle fields SHALL remain unchanged by the countdown step

#### Scenario: Existing critical effects

- **WHEN** crew stun is applied repeatedly
- **THEN** this change SHALL preserve the existing increment behavior pending a separate rule correction

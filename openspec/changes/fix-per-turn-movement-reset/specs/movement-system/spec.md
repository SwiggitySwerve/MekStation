## ADDED Requirements

### Requirement: Shared Per-Turn Movement Reset

The reducer and simulation runner SHALL use one movement-owned
`resetPerTurnMovementState` function. At a new turn it SHALL reset movement
type to Stationary, hexes moved to zero, backward movement, mechanical jump
booster use, evade state, evasion bonus, and sprint state. It SHALL remove
pending conversion and altitude-control step counts and MP costs. Optional
inactive flags MAY remain absent. It SHALL preserve position, posture,
equipment, and accumulated heat.

#### Scenario: Prior movement does not affect a skipped next turn

- **GIVEN** a unit ran, jumped, sprinted, or evaded in turn one
- **WHEN** either execution path starts turn two and the unit skips movement
- **THEN** prior movement SHALL generate no turn-two movement heat
- **AND** its prior movement, evasion, and sprint SHALL add no turn-two to-hit modifiers
- **AND** pending conversion and altitude costs SHALL be absent

### Requirement: Booster Counters Advance Once Per Turn

At a new turn the shared reset SHALL advance each previously active MASC
and supercharger prior-use counter by one, up to the represented maximum
of six, and clear its active flag. An idle booster SHALL decay by two on
the first turn after escalation and by one subsequently, never below zero.
The reducer SHALL advance counters once for a genuine turn boundary;
same-turn Movement entry and repeated turn-start events SHALL NOT advance
them. The runner SHALL advance them once per `resetTurnState` invocation.

#### Scenario: Used boosters escalate and then recover independently

- **GIVEN** MASC and supercharger have independent prior-use counts
- **WHEN** a used turn ends and either execution path starts the next turn
- **THEN** only the active boosters SHALL escalate and all active flags SHALL clear
- **AND** after an idle turn the escalated counters SHALL decay by two

#### Scenario: Both event forms cannot double-advance a counter

- **GIVEN** the reducer already applied TurnStarted for turn two
- **WHEN** it receives a repeated TurnStarted or PhaseChanged into Initiative
- **AND** subsequently enters Movement in turn two
- **THEN** neither booster counter SHALL advance again

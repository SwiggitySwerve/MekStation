## ADDED Requirements

### Requirement: Store Phase Actions Use the Guarded Advance

The gameplay store SHALL advance the phase through
`InteractiveSession.advancePhase()` for its Skip, Next Turn and interactive
Advance actions whenever it holds an interactive session, and SHALL NOT append
a bare `PhaseChanged` to its own session copy. Leaving a phase SHALL resolve it: declared
weapon and physical attacks are resolved, damage PSRs are queued and the
End-phase queue drained, the morale and withdrawal pass runs, and the End-phase
advance honours the game-over guard. After the advance the store session SHALL
be the interactive session's session. PhysicalAttack SHALL be advanceable
through the interactive Advance action. A store session with no interactive
session MAY use the raw advance.

#### Scenario: Skip resolves declared attacks before the phase flips

- **GIVEN** an interactive session in WeaponAttack with every unit locked and
  attacks declared but unresolved
- **WHEN** the store Skip action runs
- **THEN** every declared attack SHALL be resolved
- **AND** the phase SHALL become PhysicalAttack
- **AND** the store session SHALL be the interactive session's session

#### Scenario: Skip in End drains PSRs and respects the game-over guard

- **GIVEN** an interactive session in End with a queued PSR
- **WHEN** the store Skip action runs
- **THEN** the PSR SHALL be resolved and the phase SHALL become Initiative
- **WHEN** the game is already over in End
- **THEN** the phase SHALL NOT advance to Initiative
- **AND** the game SHALL be finalized and the store SHALL show the game-over state

#### Scenario: Next Turn drains the End phase, then rolls initiative

- **GIVEN** an interactive session in End with a queued PSR
- **WHEN** the store Next Turn action runs
- **THEN** the PSR SHALL be resolved
- **AND** the phase SHALL become Movement

#### Scenario: Advance in PhysicalAttack resolves physical attacks

- **GIVEN** an interactive session in PhysicalAttack with a declared physical attack
- **WHEN** the store interactive Advance action runs
- **THEN** the physical attack SHALL be resolved
- **AND** the phase SHALL become Heat

# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Physical Attack Projection Detail Surface

Physical attack previews SHALL expose whether the selected attack row is legal,
its to-hit value when legal, its damage and self-risk summary, and all
rules-backed restriction reasons when blocked.

#### Scenario: Physical commands consume the selected attack projection

- **GIVEN** the action dock has a physical attack option projection for the
  selected target and attack type
- **AND** that projection marks the selected punch, kick, charge, DFA, or
  melee-weapon attack row as blocked
- **WHEN** the matching physical command renders in the tactical action dock
- **THEN** the matching command SHALL be disabled with the same player-facing
  reason exposed by the physical attack projection
- **AND** other physical commands SHALL remain available when the blocked
  projection belongs to a different attack type.

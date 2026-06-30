## ADDED Requirements

### Requirement: Tactical map command projection
The tactical map SHALL make movement, combat, terrain, elevation, LOS, firing arcs, heat, targetability, and invalid-action reasons visible from a shared projection used by the action dock and commit path.

#### Scenario: Movement preview explains legality
- **WHEN** a player hovers or selects a movement destination for a BattleMech
- **THEN** the map SHALL identify legal, illegal, costly, blocked, and tactically relevant hexes with non-color indicators and SHALL show MP cost, terrain cost, elevation delta, facing, occupancy, heat, TMM, and blocked reasons where applicable

#### Scenario: Combat preview explains constraints
- **WHEN** a player previews a weapon or physical attack
- **THEN** the map and action dock SHALL show range band, arc, LOS, terrain/elevation blockers, cover, visibility, targetability, to-hit inputs, and invalid reasons before commit

### Requirement: Tactical GM command entry
The active tactical command screen SHALL expose a role-gated GM intervention entry point that uses ledger-backed preview, approval, commit, and redaction semantics.

#### Scenario: GM opens combat intervention from active battle
- **WHEN** an owner or host GM opens tactical controls during a combat session
- **THEN** the screen SHALL show eligible combat intervention actions, preview affected units/state, and commit through a combat or shared intervention ledger rather than mutating UI state directly

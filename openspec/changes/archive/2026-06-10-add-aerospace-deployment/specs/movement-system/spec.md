# Spec Delta: Movement System — Aerospace Mode Toggle + Strafe Altitude

## MODIFIED Requirements

### Requirement: Aerospace 2D Simplified Movement

Aerospace units SHALL move under a 2D-simplified flight model when `scenarioOptions.aerospaceMode === '2d-simplified'` (legacy default). When `scenarioOptions.aerospaceMode === '3d-tactical'` (new), the 3D thrust/velocity/altitude rules in `aerospace-deployment` SHALL apply instead, and this 2D rule SHALL NOT be used.

#### Scenario: 2D-simplified mode — legacy flying unit range

- **GIVEN** an ASF with safeThrust 6 in a scenario with `aerospaceMode: '2d-simplified'`
- **WHEN** computing legal movement for the turn
- **THEN** the unit SHALL be allowed to move up to `2 × safeThrust = 12 hexes`
- **AND** the path SHALL be a straight line from the current hex plus at most one ≤ 60° turn

#### Scenario: 2D-simplified mode — no altitude tracking

- **GIVEN** any flying unit in a `'2d-simplified'` scenario
- **WHEN** reading combat state
- **THEN** the unit SHALL NOT have an altitude property in use
- **AND** line-of-sight SHALL always treat flying units as "above the board"

#### Scenario: 2D-simplified mode — reaching board edge exits unit

- **GIVEN** a flying unit whose path reaches a board-edge hex in `'2d-simplified'` mode
- **WHEN** movement is resolved
- **THEN** an `AerospaceExited` event SHALL fire
- **AND** the unit SHALL enter off-map state for the scenario-defined return delay (default 2 turns)

#### Scenario: 2D-simplified mode — re-entry from off-map

- **GIVEN** a flying unit in off-map state whose return delay has elapsed
- **WHEN** its owner chooses a board-edge re-entry hex
- **THEN** an `AerospaceEntered` event SHALL fire
- **AND** the unit SHALL resume movement with the facing it had at exit

#### Scenario: 3D-tactical mode — this 2D rule does NOT apply

- **GIVEN** a scenario with `aerospaceMode: '3d-tactical'`
- **WHEN** an aerospace unit's movement resolves
- **THEN** the rules in `aerospace-deployment` SHALL apply
- **AND** this `Aerospace 2D Simplified Movement` rule SHALL NOT be used for that unit

### Requirement: Fly-Over Strafe Movement

The system SHALL allow a flying unit to declare a strafe path during movement, applying attacks to ground units in the path hexes. The base +2 to-hit penalty SHALL apply in 2D-simplified mode; in 3D-tactical mode (`aerospaceMode === '3d-tactical'`), the altitude-tier modifier (low +0, med +1, high +2) from `aerospace-deployment → Air-to-Ground Combat` SHALL be added on top of the base +2.

#### Scenario: 2D-simplified strafe — base +2 only

- **GIVEN** an ASF in `'2d-simplified'` mode strafing 4 hexes, 2 of which contain enemy ground units
- **WHEN** the player declares strafe on those hexes
- **THEN** Nose or Wing weapons SHALL fire at ground units in those hexes during movement
- **AND** each strafed shot SHALL add +2 to-hit penalty
- **AND** an `AerospaceFlyOver` event SHALL record affected hexes and damage applied

#### Scenario: 3D-tactical strafe — base +2 + altitude modifier

- **GIVEN** an ASF at altitude 8 (high tier) in `'3d-tactical'` mode strafing 2 ground hexes
- **WHEN** the player declares strafe
- **THEN** each strafed shot SHALL add +2 base + 2 (high altitude) = +4 to-hit penalty
- **AND** an `AerospaceAirToGroundAttack` event SHALL fire (per `aerospace-deployment`) instead of the legacy `AerospaceFlyOver`

#### Scenario: 3D-tactical strafe at low altitude — minimal penalty

- **GIVEN** an ASF at altitude 1 (low tier) in `'3d-tactical'` mode strafing a ground hex
- **WHEN** the player declares strafe
- **THEN** the to-hit penalty SHALL be +2 base + 0 (low altitude) = +2
- **AND** the per-attack to-hit SHALL match the 2D-simplified penalty in this special case

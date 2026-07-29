## ADDED Requirements

### Requirement: Campaign Creation Has an Awaited Authority Checkpoint
Campaign creation and adoption SHALL not report success or navigate to an active campaign until the authoritative campaign record, genesis journal branch, GM membership, player-slot placeholders, adopted forces, and canonical unit references commit successfully.

#### Scenario: Creation checkpoint succeeds
- **WHEN** the GM creates a campaign with adopted units or forces
- **THEN** the server SHALL commit all required authority records before returning the durable campaign-session identity

#### Scenario: Creation checkpoint fails
- **WHEN** any required campaign, branch, membership, force, or unit-reference write fails
- **THEN** the UI SHALL remain on a truthful recoverable failure state and SHALL not expose a partially active campaign

### Requirement: Customized Units Adopt Canonically
Campaign adoption SHALL preserve customized-unit identity and canonical construction fields through authoritative persistence and force ownership.

#### Scenario: Player-owned customized unit is adopted
- **WHEN** a customized unit is assigned to Player 1 or Player 2 during campaign setup
- **THEN** its unit identity, weight, tech base, engine, gyro, armor, equipment, critical slots, and temporal metadata SHALL match the source customization at the authoritative checkpoint

#### Scenario: Reload preserves adopted unit
- **WHEN** the server and all clients restart after adoption
- **THEN** the same canonical customized-unit definition and player ownership SHALL recover without template substitution

### Requirement: Scenario Materialization Uses Authoritative Owned Forces
Scenario drafts and encounters SHALL materialize from the active campaign branch and revision of each player's owned forces.

#### Scenario: Both player forces reach pre-battle
- **WHEN** both players are ready and the GM launches a scenario
- **THEN** the encounter SHALL contain the correct authoritative force and unit references for both player slots

#### Scenario: Stale force revision cannot launch
- **WHEN** a client attempts launch using a superseded ownership or force revision
- **THEN** launch SHALL reject with the current revision and SHALL not create a stale encounter

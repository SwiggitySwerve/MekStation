## ADDED Requirements

### Requirement: Attack Relationships End at Combat Exit

The combat state SHALL release represented grapple, swarm and displacement
relationships when either participant is destroyed, retreats or ejects. The
same owner SHALL enforce release in event reducers and standalone runner unit
commits, before subsequent actions inspect the state.

#### Scenario: Either grapple participant exits

- **GIVEN** two units in a grapple
- **WHEN** either unit is destroyed, retreats or ejects
- **THEN** both units SHALL lose their grapple partner and grapple status
- **AND** unrelated unit relationships SHALL remain unchanged

#### Scenario: Swarm host or squad exits

- **GIVEN** a squad's combat state identifies its swarm host
- **WHEN** either the host or squad is destroyed, retreats or ejects
- **THEN** the squad SHALL lose its swarm target and swarming flag
- **AND** surviving squad combat data SHALL remain unchanged

#### Scenario: Displacement participant exits

- **GIVEN** a displacement attacker or target holds an opposing unit reference
- **WHEN** either participant exits combat
- **THEN** references to that participant and the associated attack flags SHALL
  be cleared without clearing unrelated active relationships

#### Scenario: Non-exit and repeated events

- **GIVEN** linked units still on the field
- **WHEN** a unit shuts down, becomes unconscious or declares retreat
- **THEN** its relationships SHALL remain intact
- **AND WHEN** an exit is accepted and subsequently repeated or superseded by
  a rejected exit
- **THEN** cleanup SHALL remain idempotent and existing exit precedence SHALL
  remain unchanged

#### Scenario: Replay and runner parity

- **GIVEN** equivalent relationships and an exit in a session or runner
- **WHEN** the exit state is committed, including lethal pilot damage
- **THEN** live state and the event fold SHALL agree on released relationships
- **AND** event payloads, persisted formats and RNG consumption SHALL not change

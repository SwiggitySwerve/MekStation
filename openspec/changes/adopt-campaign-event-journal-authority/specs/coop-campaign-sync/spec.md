## ADDED Requirements

### Requirement: Campaign Commands Commit as Durable Atomic Batches
The campaign authority SHALL validate a stable command identity and expected campaign revision, derive the complete event batch, atomically append it, and only then update projections or fan out authorized results.

#### Scenario: Pilot hire changes funds and roster
- **WHEN** a valid hire command derives both a funds event and a personnel event
- **THEN** both events SHALL commit in one batch or neither SHALL commit
- **AND** clients SHALL not observe an intermediate partial campaign state

### Requirement: Customized Units Preserve Durable Instance Lineage
A customized unit adopted into a campaign SHALL receive or retain a durable instance identity distinct from its canonical source design. Authorized customization, force, mission, readiness, combat-reference, and later-session events SHALL link to that instance.

#### Scenario: Customized unit survives reload and mission handoff
- **WHEN** a player customizes a canonical unit, saves and reloads it, adopts it into a force, and reaches mission readiness
- **THEN** journal links and campaign projection SHALL identify the same durable unit instance
- **AND** its accepted weight, tech base, engine, gyro, armor, equipment, critical slots, and temporal metadata SHALL remain consistent

### Requirement: Campaign History Survives Authority Restart
Campaign history, participant cursors, and projection head SHALL be durable across process restart.

#### Scenario: Two players reconnect after restart
- **WHEN** the campaign host restarts with both players behind
- **THEN** each player SHALL resume from its durable authorized cursor
- **AND** both SHALL converge without creating a fresh empty campaign log

## ADDED Requirements

### Requirement: Opponent Intel Display Language

The tactical map interface SHALL display opponent intel tier, confidence, and staleness consistently across tokens, inspectors, previews, and feed rows.

#### Scenario: Rough enemy state is visibly approximate
- **GIVEN** a visible enemy unit is projected with rough intel
- **WHEN** the player opens the target inspector
- **THEN** armor, heat, ammo, movement, and weapon readiness SHALL use approximate bands or labels
- **AND** the inspector SHALL include a confidence marker such as Exact, Estimated, Last Known, or Unknown

#### Scenario: Last-known enemy uses stale styling
- **GIVEN** an enemy unit has only last-known visibility
- **WHEN** its token or inspector summary renders
- **THEN** the UI SHALL show last-known coordinate and stale turn/phase
- **AND** exact current state SHALL not be shown

### Requirement: Intel Policy Setup Controls

The tactical interface SHALL expose GM/scenario controls for selecting opponent intel policy before or during authorized match setup.

#### Scenario: GM selects preset before launch
- **GIVEN** a GM or scenario author configures a tactical match
- **WHEN** they choose opponent intel preset Open, Rough, Sensor Limited, or Hidden
- **THEN** the match configuration SHALL persist that policy
- **AND** the pre-battle summary SHALL display the chosen policy before launch

#### Scenario: Player cannot weaken fog from combat UI
- **GIVEN** a player without GM/referee authority is in combat
- **WHEN** they open tactical settings
- **THEN** opponent intel policy controls SHALL be read-only or absent
- **AND** no client-side toggle SHALL reveal hidden exact state

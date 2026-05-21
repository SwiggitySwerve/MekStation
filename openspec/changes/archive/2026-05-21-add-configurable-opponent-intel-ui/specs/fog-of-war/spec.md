## ADDED Requirements

### Requirement: Opponent Intel Policy

The fog-of-war system SHALL support a match-level opponent intel policy that controls how enemy state is projected to each viewer.

#### Scenario: Open information shows exact visible enemy state
- **GIVEN** a match uses opponent intel policy `open`
- **WHEN** an enemy unit is visible to the player
- **THEN** the projected enemy state SHALL include exact armor, structure, heat, movement state, shutdown/prone status, and weapon availability permitted by the base game state

#### Scenario: Rough information uses bands
- **GIVEN** a match uses opponent intel policy `rough`
- **WHEN** an enemy unit is visible to the player
- **THEN** exact armor, structure, heat, and ammo counts SHALL be replaced by configured bands
- **AND** the projection SHALL include a confidence label indicating that values are approximate

#### Scenario: Hidden information strips combat state
- **GIVEN** a match uses opponent intel policy `hidden`
- **WHEN** an enemy unit is not visible
- **THEN** the projected token SHALL exclude exact combat state
- **AND** only allowed last-known position, silhouette, side, and stale timestamp fields MAY remain

### Requirement: GM Intel Override

The fog-of-war system SHALL support a privileged GM/referee projection that can view exact state without changing player projections.

#### Scenario: GM exact view does not affect player view
- **GIVEN** a match has one GM viewer and one player viewer
- **WHEN** the GM enables exact opponent intel in the GM shell
- **THEN** the GM projection SHALL show exact enemy state
- **AND** the player projection SHALL continue to follow the match opponent intel policy

#### Scenario: Mid-match reveal emits audit event
- **GIVEN** the GM reveals a hidden enemy unit to a player mid-match
- **WHEN** the reveal is committed
- **THEN** the system SHALL emit an intel visibility event naming the unit, viewer side, reveal tier, and source
- **AND** replay filtering SHALL apply that event when reconstructing player-visible history

### Requirement: Perspective-Aware Replay Redaction

Replay event streams SHALL apply the same opponent intel policy and visibility history as live play.

#### Scenario: Player replay preserves rough intel
- **GIVEN** a match was played with rough opponent intel
- **WHEN** the player opens the replay from their perspective
- **THEN** event log, unit inspectors, and map tokens SHALL show rough or stale opponent state matching the original visibility timeline

#### Scenario: GM replay can show exact state
- **GIVEN** the replay viewer is opened with GM/referee authority
- **WHEN** the same replay is loaded
- **THEN** the viewer MAY show exact state and hidden events
- **AND** the UI SHALL label the replay as GM perspective

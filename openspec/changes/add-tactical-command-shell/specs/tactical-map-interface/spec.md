## ADDED Requirements

### Requirement: Tactical Command Shell Slots

The tactical map interface SHALL provide a map-first command shell with named slots for combat information and controls.

#### Scenario: Desktop shell allocates persistent border regions
- **GIVEN** the tactical combat route renders at desktop width
- **WHEN** the command shell mounts
- **THEN** the center region SHALL be the interactive map
- **AND** the top band SHALL contain phase, round, initiative, and global match status
- **AND** the bottom dock SHALL contain active-unit actions and end/confirm controls
- **AND** the left tray SHALL contain map lenses, objectives, and navigation controls
- **AND** the right tray SHALL contain selected unit and target inspectors
- **AND** the minimap cluster SHALL be reachable without covering the active unit token

#### Scenario: Combat facts have one primary home
- **GIVEN** phase, active unit, target state, heat, weapons, event history, and map lenses are all available
- **WHEN** the shell renders
- **THEN** each fact SHALL have exactly one primary slot owner
- **AND** secondary surfaces MAY show a summary only if they deep-link or focus the primary owner

### Requirement: Map-Dominant Visual Priority

The command shell SHALL preserve the map as the dominant surface and avoid carding the map inside decorative containers.

#### Scenario: Border UI does not consume the battlefield
- **GIVEN** a player enters a playable combat phase
- **WHEN** all default shell slots are visible
- **THEN** no persistent border region SHALL overlap selectable hexes
- **AND** transient overlays SHALL dismiss or collapse before blocking movement or attack confirmation

#### Scenario: Pinned panels preserve map interaction
- **GIVEN** the player pins a right inspector or bottom drawer
- **WHEN** the player pans, zooms, selects a unit, or hovers a hex
- **THEN** map interaction SHALL remain available
- **AND** the pinned panel SHALL not steal scroll or drag gestures intended for the map outside its own bounds

### Requirement: Shell Mode Ownership

The command shell SHALL support combat, replay, spectator, and GM/referee modes through the same slot contract.

#### Scenario: Replay mode swaps action dock for playback controls
- **GIVEN** a replay is loaded into the tactical shell
- **WHEN** replay mode is active
- **THEN** the bottom dock SHALL show playback controls instead of combat commit buttons
- **AND** unit inspectors and event feed SHALL reflect the replay cursor state

#### Scenario: Spectator mode disables private commands
- **GIVEN** a user views a match as a spectator
- **WHEN** the shell renders
- **THEN** action commands SHALL be disabled or absent
- **AND** public map lenses, event feed, minimap, and visible unit inspectors SHALL remain available

### Requirement: Tactical Shell State Contract

The tactical map interface SHALL expose a typed shell state contract for selected slot, pinned panels, collapsed panels, shell mode, and active context.

#### Scenario: Shell state round-trips through UI actions
- **GIVEN** `ITacticalShellState` has a collapsed left tray, pinned right inspector, and active bottom dock tab
- **WHEN** the shell re-renders after map selection changes
- **THEN** collapsed, pinned, and active tab state SHALL persist
- **AND** selection-derived content SHALL update without resetting manually chosen shell layout

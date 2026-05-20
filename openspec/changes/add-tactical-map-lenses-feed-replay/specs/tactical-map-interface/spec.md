## ADDED Requirements

### Requirement: Tactical Map Lenses

The tactical map interface SHALL provide task-oriented map lenses that control underlying map layers without changing rules.

#### Scenario: Movement lens
- **GIVEN** a unit is selected during Movement phase
- **WHEN** the player enables the Movement lens
- **THEN** the map SHALL show reachable hexes, path preview, movement cost, blocked destinations, and terrain/elevation cues relevant to movement

#### Scenario: Attack lens
- **GIVEN** a unit is selected during Weapon Attack or Physical Attack phase
- **WHEN** the player enables the Attack lens
- **THEN** the map SHALL show firing arcs or physical attack vectors, LOS, range bands, cover, and valid/invalid targets

#### Scenario: Intel lens
- **GIVEN** opponent intel or fog-of-war is active
- **WHEN** the player enables the Intel lens
- **THEN** the map SHALL show visible, last-known, sensor contact, and hidden/unknown areas using distinct non-conflicting visual states

### Requirement: Tactical Pins and Markers

The tactical map interface SHALL support map pins and markers for objectives, player notes, GM notes, and detected contacts.

#### Scenario: Player adds a tactical pin
- **GIVEN** the player has permission to add local pins
- **WHEN** they create a pin on a hex
- **THEN** the pin SHALL store coordinate, label, optional category, visibility scope, and created turn/phase
- **AND** the pin SHALL be shown on the map and minimap while its layer is visible

#### Scenario: GM pin visibility scope
- **GIVEN** a GM creates a pin
- **WHEN** they choose private, side-only, or public scope
- **THEN** only authorized viewers SHALL receive the pin projection

### Requirement: Combat Feed Docking

The tactical map interface SHALL provide a combat feed that summarizes events and can drive map focus.

#### Scenario: Feed row focuses event participants
- **GIVEN** the combat feed contains a movement, attack, heat, objective, or destruction event
- **WHEN** the user selects the feed row
- **THEN** the map SHALL focus the relevant unit or hex
- **AND** the right inspector SHALL show the relevant unit, target, or event detail where available

#### Scenario: Feed prioritizes combat-critical events
- **GIVEN** many events occur in one phase
- **WHEN** the feed renders collapsed
- **THEN** destruction, shutdown, ammo explosion, objective, critical hit, and phase transition events SHALL be prioritized above low-impact movement chatter

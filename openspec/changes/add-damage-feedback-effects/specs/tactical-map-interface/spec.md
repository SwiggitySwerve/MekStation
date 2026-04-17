# tactical-map-interface Specification Delta

## ADDED Requirements

### Requirement: Screen Shake On Heavy Hits

The tactical map interface SHALL shake the map root when a single hit
applies 10 or more damage, with intensity scaling with damage and
dampened for reduced-motion users.

#### Scenario: 10+ damage triggers shake

- **GIVEN** a unit takes 12 damage from a single weapon hit
- **WHEN** the shake fires
- **THEN** the map root SHALL offset by small pseudo-random x/y within
  the intensity radius
- **AND** intensity SHALL scale linearly with damage, clamped at 8px
- **AND** total duration SHALL be 300ms

#### Scenario: Under 10 damage does not shake

- **GIVEN** a unit takes 6 damage from a single hit
- **WHEN** the event fires
- **THEN** no shake SHALL occur

#### Scenario: Reduced motion dampens shake

- **GIVEN** `prefers-reduced-motion: reduce` is set
- **WHEN** a 20-damage hit would trigger a large shake
- **THEN** shake amplitude SHALL be halved
- **AND** shakes with effective intensity below 2px SHALL be skipped

### Requirement: Hit Location Flash

The tactical map interface SHALL flash the specific armor-pip group of
a hit location white for 250ms when damage applies there.

#### Scenario: Flash targets hit location

- **GIVEN** a unit's RA takes 5 damage
- **WHEN** the flash renders
- **THEN** the RA pip group SHALL flash white at 60% opacity for 250ms
- **AND** other pip groups SHALL NOT flash

#### Scenario: Transferred damage flashes destination

- **GIVEN** damage overflows from LA into LT
- **WHEN** the flashes render
- **THEN** the LA pip group SHALL flash first
- **AND** the LT pip group SHALL flash second (sequential)

### Requirement: Smoke From Destroyed Locations

The tactical map interface SHALL render a looping smoke animation near
each destroyed location of a living unit, persisting until the unit
becomes a wreck.

#### Scenario: Destroyed arm vents smoke

- **GIVEN** a unit's LA is destroyed
- **WHEN** the effect layer renders
- **THEN** a looping smoke sprite SHALL render near the LA pip group
- **AND** the smoke SHALL persist across frames while the unit is alive

#### Scenario: Multiple destroyed locations = multiple smoke streams

- **GIVEN** a unit has both LA and RL destroyed
- **WHEN** the effects render
- **THEN** two concurrent smoke streams SHALL render
- **AND** each SHALL anchor to its pip group

#### Scenario: Wreck replaces live smoke streams

- **GIVEN** a unit with two smoke streams is destroyed
- **WHEN** the unit becomes a wreck
- **THEN** both live smoke streams SHALL stop
- **AND** a single quieter wreck-smoke stream SHALL replace them

### Requirement: Engine Fire

The tactical map interface SHALL render a flame animation on any unit
with one or more engine critical hits, persisting until destruction.

#### Scenario: First engine crit ignites a small flame

- **GIVEN** a unit takes its first engine critical hit
- **WHEN** the effect renders
- **THEN** a small animated flame SHALL render at the unit's torso
  anchor
- **AND** the flame SHALL persist until the unit dies

#### Scenario: Second engine crit intensifies flame

- **GIVEN** a unit takes a second engine critical hit
- **WHEN** the effect renders
- **THEN** the flame SHALL scale larger and brighter
- **AND** the flame SHALL remain a single effect (not two flames)

### Requirement: Debris Cloud And Wreck Sprite

On unit destruction, the tactical map interface SHALL play a debris
cloud burst and transition the token to a wreck sprite variant.

#### Scenario: Unit destroyed plays debris + wreck

- **GIVEN** a unit's CT reaches 0 internal structure (unit destroyed)
- **WHEN** the effect renders
- **THEN** an 800ms debris cloud burst SHALL play over the token
- **AND** the token SHALL transition to a homemade wreck sprite variant
  for its archetype
- **AND** the wreck SHALL render at ~50% opacity
- **AND** the wreck SHALL remain on the hex blocking LOS per existing
  rules

#### Scenario: Pilot killed triggers destruction effect

- **GIVEN** a pilot dies from consciousness failures
- **WHEN** the UnitDestroyed event fires
- **THEN** the same debris cloud + wreck transition SHALL play

#### Scenario: Wreck badge for accessibility

- **GIVEN** a unit is a wreck
- **WHEN** the token renders
- **THEN** a textual "WRECK" badge SHALL render on the token for
  colorblind-safe legibility

### Requirement: Persistent Effects Survive Replay

Smoke and fire SHALL be derived from unit state (destroyed locations,
engine crits) so they render correctly after a page reload or replay
scrub.

#### Scenario: Reload preserves smoke

- **GIVEN** a unit has a destroyed LA emitting smoke
- **WHEN** the page reloads and state rehydrates
- **THEN** smoke SHALL render from LA without replaying the
  LocationDestroyed event

#### Scenario: Replay scrub derives effects from state

- **GIVEN** a replay scrubs from turn 1 to turn 5 where a unit has
  engine crits
- **WHEN** the scrub settles
- **THEN** engine fire SHALL render on that unit immediately
- **AND** the effect SHALL not require replaying every intermediate
  event

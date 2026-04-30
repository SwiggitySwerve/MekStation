# tactical-map-interface Specification Delta

## ADDED Requirements

### Requirement: Heat Glow Around Unit Tokens

The tactical map interface SHALL render a heat glow around each unit
token that intensifies with the unit's heat level.

#### Scenario: Glow intensifies with heat

- **GIVEN** a unit's heat rises from 0 to 12 over the course of a turn
- **WHEN** heat events fire
- **THEN** the glow color SHALL transition neutral -> amber at heat 5
- **AND** the glow color SHALL transition amber -> orange at heat 10
- **AND** transitions SHALL ease over 300ms

#### Scenario: Critical heat adds pulse

- **GIVEN** a unit's heat exceeds 20
- **WHEN** the glow renders
- **THEN** the glow SHALL be red-white
- **AND** the glow SHALL pulse with a ~1.5s period

#### Scenario: Textual badge for high heat

- **GIVEN** a unit's heat is at or above 15
- **WHEN** the token renders
- **THEN** a textual badge ("HOT", "OVERHEAT", or "CRITICAL") SHALL
  render on the token
- **AND** the badge SHALL remain visible for colorblind users

### Requirement: Shutdown Overlay

The tactical map interface SHALL render a powered-down overlay on any
unit in shutdown state.

#### Scenario: Shutdown desaturates token

- **GIVEN** a unit enters shutdown state
- **WHEN** the overlay applies
- **THEN** the sprite SHALL render desaturated via color matrix filter
- **AND** a "POWERED DOWN" label SHALL render beneath the token
- **AND** a subtle ~3s flicker SHALL hint at failed restart attempts

#### Scenario: Shutdown overrides heat glow

- **GIVEN** a unit was glowing red from heat 22 and now shuts down
- **WHEN** the shutdown overlay activates
- **THEN** the heat glow SHALL be suppressed
- **AND** only the shutdown overlay SHALL render on the token

#### Scenario: Shutdown announces via aria-live

- **GIVEN** an assistive technology user
- **WHEN** a unit enters shutdown
- **THEN** an `aria-live` region SHALL announce the shutdown event

### Requirement: Startup Pulse

When a unit exits shutdown state, the tactical map interface SHALL
play a short startup pulse animation.

#### Scenario: Successful restart plays amber pulse

- **GIVEN** a unit passes its restart roll
- **WHEN** the pulse plays
- **THEN** a radial pulse SHALL expand from 0 to 1.2x sprite scale
- **AND** the pulse color SHALL fade from amber to neutral over 800ms
- **AND** the shutdown overlay SHALL clear when the pulse finishes

#### Scenario: Failed restart plays short gray pulse

- **GIVEN** a unit fails its restart roll
- **WHEN** the pulse plays
- **THEN** a shorter 400ms pulse SHALL fade to gray
- **AND** the shutdown overlay SHALL remain active

### Requirement: Ammo Explosion Warning Aura

The tactical map interface SHALL render a warning aura when a unit's
heat enters the ammo-explosion-risk range defined by
`heat-overflow-effects`.

#### Scenario: Aura activates in danger range

- **GIVEN** a unit's heat enters the ammo-explosion-risk range
- **WHEN** the aura renders
- **THEN** a red-purple halo SHALL pulse with a ~1s period around the
  token
- **AND** the aura SHALL render above the sprite and armor pips

#### Scenario: Aura auto-dismisses when risk clears

- **GIVEN** a unit's heat drops out of the ammo-explosion-risk range
- **WHEN** the heat event fires
- **THEN** the aura SHALL fade out over 300ms
- **AND** the heat glow SHALL resume its current threshold color

### Requirement: Reduced Motion Collapse

All heat and shutdown indicators SHALL collapse to static forms under
`prefers-reduced-motion: reduce`.

#### Scenario: Reduced motion eliminates pulses

- **GIVEN** `prefers-reduced-motion: reduce` is set
- **WHEN** heat indicators render
- **THEN** HeatGlow SHALL render as a static colored outline
- **AND** the ammo explosion aura SHALL render as a static ring
- **AND** startup pulses SHALL collapse to an instant color change
- **AND** shutdown flicker SHALL stop

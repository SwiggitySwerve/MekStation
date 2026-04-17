# tactical-map-interface Specification Delta

## ADDED Requirements

### Requirement: Movement Path Interpolation

The tactical map interface SHALL animate unit tokens along their
committed movement path, interpolating position from the start hex
through each hex in sequence.

#### Scenario: Walk animation at 300ms per hex

- **GIVEN** a unit commits a 3-hex walking move
- **WHEN** the animation plays
- **THEN** the token SHALL traverse each hex segment in 300ms with
  linear easing
- **AND** total animation time SHALL be approximately 900ms
- **AND** the token SHALL end at the destination hex

#### Scenario: Run animation at 180ms per hex

- **GIVEN** a unit commits a 5-hex running move
- **WHEN** the animation plays
- **THEN** the token SHALL traverse each hex in 180ms
- **AND** total animation time SHALL be approximately 900ms

#### Scenario: Facing rotates during path

- **GIVEN** a walking move that ends facing 3 hexes away from start
  facing
- **WHEN** the animation plays
- **THEN** the facing SHALL ease from start facing to commit facing
- **AND** the final facing SHALL match the committed move

### Requirement: Jump Arc Animation

Jumps SHALL animate as a single parabolic arc from start to destination,
rather than interpolating hex-by-hex.

#### Scenario: Jump plays as a single arc

- **GIVEN** a unit commits a jump move of any distance
- **WHEN** the animation plays
- **THEN** the token SHALL follow a parabolic arc from start to
  destination over 600ms
- **AND** the arc peak SHALL rise above the token's baseline by at
  least 24px (scaled to zoom)

#### Scenario: Jump arc indicator

- **GIVEN** a jump animation is active
- **WHEN** the arc plays
- **THEN** a faint blue arc SHALL render from start to destination
- **AND** the arc SHALL fade out after the animation completes

### Requirement: Phase Advancement Gate On Active Animations

The tactical map interface SHALL prevent phase advancement while any
movement animation is active, and SHALL resume advancement once the
animation queue drains.

#### Scenario: Next unit waits for animation

- **GIVEN** unit A is mid-animation along its movement path
- **WHEN** the game engine tries to advance to unit B's lock
- **THEN** advancement SHALL wait until unit A's animation completes
- **AND** unit B's lock SHALL begin immediately after

#### Scenario: Heat and PSR events flush after animation

- **GIVEN** a committed move that generates heat and triggers a PSR
- **WHEN** the animation plays
- **THEN** heat and PSR events SHALL be buffered until the animation
  completes
- **AND** the event log SHALL render them after the token settles

### Requirement: Reduced Motion Accessibility

The tactical map interface SHALL respect the user's
`prefers-reduced-motion` setting and fall back to instant position
updates when enabled.

#### Scenario: Reduced motion snaps to destination

- **GIVEN** the user has `prefers-reduced-motion: reduce` set
- **WHEN** a movement animation would play
- **THEN** the token SHALL snap to its destination instantly
- **AND** the phase advancement gate SHALL release on the same tick
- **AND** no arc or path tween SHALL render

#### Scenario: Game logic unaffected by reduced motion

- **GIVEN** reduced motion is enabled
- **WHEN** a player commits a move
- **THEN** all game events, heat, PSR, and pilot rolls SHALL still
  fire identically
- **AND** only the visual interpolation SHALL be suppressed

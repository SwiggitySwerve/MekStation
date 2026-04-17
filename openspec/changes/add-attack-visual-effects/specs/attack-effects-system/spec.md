# attack-effects-system Specification Delta

## ADDED Requirements

### Requirement: Per-Category Effect Primitive

The attack effects system SHALL render one of four effect primitives
per weapon category: laser beam, missile trail, ballistic tracer, or
physical shockwave.

#### Scenario: Laser renders as colored beam

- **GIVEN** an attack from a medium laser resolves
- **WHEN** the effect plays
- **THEN** a solid colored beam SHALL render from origin to target
- **AND** the beam duration SHALL be 400ms
- **AND** the beam color SHALL be green per the medium laser mapping

#### Scenario: Missile renders as dashed trail with arrowhead

- **GIVEN** an attack from a medium laser... no, from an LRM-10 resolves
- **WHEN** the effect plays
- **THEN** a dashed line with an arrowhead SHALL animate from origin
  to target
- **AND** the duration SHALL be 600ms

#### Scenario: Ballistic renders as tracer dashes

- **GIVEN** an AC/10 attack resolves
- **WHEN** the effect plays
- **THEN** short bright tracer dashes SHALL move along the line
- **AND** the duration SHALL be 300ms

#### Scenario: Physical renders as shockwave

- **GIVEN** a kick attack resolves
- **WHEN** the effect plays
- **THEN** an expanding ring SHALL render at the target hex
- **AND** the duration SHALL be 400ms

### Requirement: Weapon Color Mapping

Each weapon type SHALL resolve to a specific color so that players can
identify weapons at a glance.

#### Scenario: ER variants use red-orange

- **GIVEN** an ER large laser resolves
- **WHEN** the beam renders
- **THEN** the beam color SHALL be red-orange per the mapping

#### Scenario: Pulse lasers use IR tint

- **GIVEN** a medium pulse laser resolves
- **WHEN** the beam renders
- **THEN** the beam color SHALL be the IR-tinted variant per mapping

#### Scenario: Standard medium/large lasers use green

- **GIVEN** a standard large laser resolves
- **WHEN** the beam renders
- **THEN** the beam color SHALL be green

### Requirement: Impact Flash

On a hit, an impact flash SHALL render at the target hex to mark the
landing moment.

#### Scenario: Hit triggers impact flash

- **GIVEN** an attack resolves as a hit
- **WHEN** the primary effect animation completes
- **THEN** a 150ms white impact flash SHALL render at the target hex

#### Scenario: Miss suppresses impact flash

- **GIVEN** an attack resolves as a miss
- **WHEN** the primary effect plays
- **THEN** no impact flash SHALL render
- **AND** the effect primitive SHALL render at 40% opacity
- **AND** the primitive SHALL overshoot the target by one hex in the
  attack direction

### Requirement: Cluster and Multi-Shot Staggering

Multi-projectile weapons SHALL stagger their effect primitives in time
to read as a salvo rather than a single line.

#### Scenario: LRM salvo staggers trails

- **GIVEN** an LRM-20 volley resolves
- **WHEN** the effects render
- **THEN** 20 missile trails SHALL fire with 30ms offsets
- **AND** total volley duration SHALL not exceed 1200ms

#### Scenario: Ultra AC double-tap staggers tracers

- **GIVEN** an Ultra AC/10 firing both shots resolves
- **WHEN** the effects render
- **THEN** two ballistic tracers SHALL fire with 80ms offset

#### Scenario: Rotary AC burst staggers five tracers

- **GIVEN** a Rotary AC/5 at full rate of fire resolves
- **WHEN** the effects render
- **THEN** five ballistic tracers SHALL fire with 40ms offset

### Requirement: Reduced Motion Fallback

When `prefers-reduced-motion: reduce` is set, the system SHALL collapse
all attack effects to a simplified connecting line with a dimmed flash.

#### Scenario: Reduced motion collapses effect

- **GIVEN** `prefers-reduced-motion: reduce` is enabled
- **WHEN** an attack resolves
- **THEN** a single 300ms fading line from origin to target SHALL render
- **AND** the impact flash SHALL shorten to 80ms at 50% opacity
- **AND** no arcs, shockwaves, or staggered trails SHALL render

### Requirement: Click-Through Preserved

The attack effects layer SHALL not intercept pointer events.

#### Scenario: Effects do not block clicks

- **GIVEN** an active beam renders over a unit token
- **WHEN** the user clicks the unit
- **THEN** the click SHALL register on the token (effects layer has
  `pointer-events: none`)

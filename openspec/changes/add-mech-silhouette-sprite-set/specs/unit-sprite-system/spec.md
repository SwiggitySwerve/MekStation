# unit-sprite-system Specification Delta

## ADDED Requirements

### Requirement: Homemade Silhouette Sprite Catalog

The unit sprite system SHALL provide a homemade (not licensed) 2D
silhouette for every combination of weight class and chassis archetype,
and SHALL never reference licensed BattleTech or MechWarrior visual
assets.

#### Scenario: Sprite exists for every weight x archetype combination

- **GIVEN** a unit with weight class `light | medium | heavy | assault`
- **WHEN** the sprite selector resolves the sprite
- **THEN** exactly one SVG sprite SHALL be returned per combination
- **AND** the sprite file SHALL live under `public/sprites/mechs/`
- **AND** the sprite SHALL be homemade (no licensed art reference)

#### Scenario: Archetype override for quads and LAMs

- **GIVEN** a unit with `isQuad = true`
- **WHEN** the sprite selector resolves the sprite
- **THEN** the quad archetype sprite SHALL be returned
- **AND** biped sprites SHALL NOT be returned for quad units

#### Scenario: Missing archetype falls back to humanoid

- **GIVEN** a unit with no archetype flags set
- **WHEN** the sprite selector resolves the sprite
- **THEN** the humanoid biped sprite for the unit's weight class SHALL
  be returned

### Requirement: Built-in Facing Indicator

Every sprite SHALL include a facing indicator (directional notch or
head-rotation cue) baked into the SVG so that rotation carries the
indicator with it.

#### Scenario: Facing rotates sprite and indicator together

- **GIVEN** a unit facing direction 2 (120 degrees)
- **WHEN** the sprite renders
- **THEN** the sprite SHALL be rotated by `facing * 60deg` about its
  center
- **AND** the facing notch SHALL point in the same direction as the
  rotated sprite's front

#### Scenario: Facing change animates

- **GIVEN** a unit rotates from facing 0 to facing 3
- **WHEN** the new facing is committed
- **THEN** the sprite SHALL animate over 150ms ease-out
- **AND** `prefers-reduced-motion` users SHALL see an instant snap

### Requirement: Armor Pip Damage Overlay

Each sprite SHALL be accompanied by an armor-pip overlay ring that
visualizes per-location damage state.

#### Scenario: Pip color by location state

- **GIVEN** a unit's right arm has full armor
- **WHEN** the pip ring renders
- **THEN** the RA pip group SHALL render green
- **AND** a location with partial armor SHALL render yellow
- **AND** a location with exposed internal structure SHALL render orange
- **AND** a destroyed location SHALL render with a red outline and no fill

#### Scenario: Quad pip layout differs from biped

- **GIVEN** a quad unit's pip ring
- **WHEN** the ring renders
- **THEN** pip groups SHALL be positioned for Head, CT, Front-Left,
  Front-Right, Rear-Left, Rear-Right legs
- **AND** arm pip groups SHALL NOT render

#### Scenario: Pip ring simplifies at low zoom

- **GIVEN** the map zoom is below 0.6x
- **WHEN** the pip ring renders
- **THEN** each location SHALL collapse to a single aggregate dot
- **AND** ring rendering SHALL be suppressed entirely below zoom 0.35x

### Requirement: Sprite Scaling

Sprites SHALL scale with hex size without losing legibility, and SHALL
gracefully simplify at low zoom levels.

#### Scenario: Default scale

- **GIVEN** the map is at zoom 1.0
- **WHEN** a sprite renders
- **THEN** the sprite SHALL occupy approximately 80% of the hex diameter

#### Scenario: Low-zoom simplification

- **GIVEN** the map zoom is below 0.6x
- **WHEN** the sprite renders
- **THEN** the sprite SHALL collapse to an archetype glyph with side
  tint only
- **AND** the facing indicator SHALL still be visible

### Requirement: Side Tint and Selection Ring

The sprite renderer SHALL apply a side tint and render a selection ring
when the unit is the currently selected unit.

#### Scenario: Tint by side

- **GIVEN** a unit on the Player side
- **WHEN** the sprite renders
- **THEN** the silhouette SHALL receive a blue tint via CSS filter or
  feColorMatrix
- **AND** an Opponent unit SHALL receive a red tint
- **AND** a Neutral unit SHALL receive a gray tint

#### Scenario: Colorblind-safe distinction

- **GIVEN** a user with a colorblind simulation mode on
- **WHEN** two sprites from opposing sides render next to each other
- **THEN** the sprites SHALL remain distinguishable via a shape overlay
  (e.g. triangle vs circle base marker) and not only by tint

#### Scenario: Selection ring

- **GIVEN** a unit is the selected unit in `useGameplayStore`
- **WHEN** the sprite renders
- **THEN** a selection ring SHALL render around the sprite
- **AND** non-selected units SHALL NOT render a ring

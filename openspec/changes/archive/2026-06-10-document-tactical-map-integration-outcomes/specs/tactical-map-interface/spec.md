# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Integrated Rules-Backed Tactical Map Outcomes

The tactical map SHALL behave as the primary player-facing explanation layer
for represented battlefield rules. Movement, combat, terrain, elevation, line
of sight, visibility, top-down highlights, and isometric highlights SHALL be
derived from shared projection data that agrees with committed engine
validation and resolution.

#### Scenario: Selected unit exposes actionable movement and combat meaning

- **GIVEN** a player selects a represented unit during a legal tactical phase
- **WHEN** the map renders available movement and attack options
- **THEN** every highlighted hex SHALL identify whether the selected unit can
  legally move or attack there
- **AND** blocked or illegal options SHALL expose a non-color reason before the
  player commits the action
- **AND** costly but legal movement SHALL expose MP cost, terrain contribution,
  elevation contribution, heat impact when represented, and movement mode
- **AND** attack highlights SHALL expose range band, firing arc coverage,
  selected-weapon applicability, LOS/visibility state, terrain blockers, cover,
  and represented weapon/environment restrictions
- **AND** committing an unchanged highlighted action SHALL be accepted by the
  engine, while any engine rejection SHALL have been previewed with the same
  reason.

#### Scenario: Top-down and isometric modes preserve the same rules meaning

- **GIVEN** the same tactical state is viewed in top-down and isometric modes
- **WHEN** the player inspects terrain, elevation, movement, combat, LOS, and
  visibility highlights
- **THEN** both modes SHALL consume the same shared projection data
- **AND** top-down mode SHALL show readable hex terrain/elevation information,
  including an elevation number directly on the hex
- **AND** isometric mode SHALL render stacked/elevated hex layers from the same
  terrain/elevation facts
- **AND** isometric camera rotation SHALL change presentation only, not
  movement or combat legality
- **AND** units hidden behind tall elevations or terrain stacks SHALL retain
  discoverable visibility affordances such as occluder highlights, ghosting, or
  projection metadata.

#### Scenario: Representative tests prove player-visible agreement

- **GIVEN** the integration touches represented movement, combat, terrain,
  elevation, LOS, visibility, or isometric rendering
- **WHEN** the change is prepared for review
- **THEN** focused tests SHALL cover representative legal, illegal, costly, and
  blocked scenarios for the affected surface
- **AND** at least one preview-to-commit agreement test SHALL cover any changed
  action legality path
- **AND** rendering or browser tests SHALL cover player-visible map metadata
  when the outcome depends on top-down labels, badges, tooltips, or isometric
  layers/rotation.

# line-of-sight-visualization Specification Delta

## ADDED Requirements

### Requirement: LOS Line State

The LOS visualization SHALL render one of three states between an origin
and target hex: clear, partial, or blocked.

#### Scenario: Clear LOS renders solid green

- **GIVEN** an origin and target with no intervening cover
- **WHEN** the LOS overlay renders
- **THEN** a solid green line SHALL render from origin to target
- **AND** line thickness SHALL be 2px

#### Scenario: Partial cover renders dashed yellow

- **GIVEN** an origin and target with one light-woods hex between them
- **WHEN** the LOS overlay renders
- **THEN** a dashed yellow line SHALL render from origin to target
- **AND** the partial-cover hex SHALL annotate with a cover icon

#### Scenario: Blocked LOS renders red line to blocker

- **GIVEN** an origin and target with a building fully occluding the
  path
- **WHEN** the LOS overlay renders
- **THEN** a solid red line SHALL render from origin to the first
  blocking hex
- **AND** the blocker SHALL annotate with a wall icon
- **AND** the line SHALL NOT extend past the blocker

### Requirement: LOS Overlay Toggling

The LOS overlay SHALL render only when a unit is selected and a hex is
hovered, and SHALL hide when either condition no longer holds.

#### Scenario: LOS line appears on hover

- **GIVEN** a friendly unit is selected
- **WHEN** the user hovers a hex within visual range
- **THEN** an LOS line SHALL render
- **AND** unhovering SHALL clear the line

#### Scenario: LOS line hides during animation

- **GIVEN** a movement animation is active
- **WHEN** the user hovers a hex
- **THEN** no LOS line SHALL render
- **AND** hovering resumes after the animation completes

#### Scenario: User toggle disables LOS line

- **GIVEN** the user presses the LOS toggle hotkey (L)
- **WHEN** toggled off
- **THEN** no LOS line SHALL render regardless of hover
- **AND** toggling back on SHALL restore hover behavior

### Requirement: Blocker Annotations

The LOS visualization SHALL annotate intervening hexes that provide
partial cover or fully block the line.

#### Scenario: Partial cover annotates with cover icon

- **GIVEN** a partial LOS through a single light-woods hex
- **WHEN** the overlay renders
- **THEN** a cover icon SHALL render on that hex
- **AND** the icon SHALL include a `<title>` for screen readers

#### Scenario: Blocked LOS annotates with wall icon

- **GIVEN** a blocked LOS through a building
- **WHEN** the overlay renders
- **THEN** a wall icon SHALL render on the blocker
- **AND** the icon SHALL include a `<title>` for screen readers

### Requirement: Accessibility Announcements

LOS state transitions SHALL announce through an `aria-live` region so
non-visual users can understand the line-of-sight resolution.

#### Scenario: LOS change announces

- **GIVEN** the user hovers a new hex
- **WHEN** the LOS classifier settles
- **THEN** an `aria-live: polite` announcement SHALL fire, e.g.,
  "Line of sight clear" or "Partial cover through woods" or "Blocked
  by wall"

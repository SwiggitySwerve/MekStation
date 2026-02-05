## ADDED Requirements

### Requirement: Category Filter Bar Layout

The equipment browser category filter buttons SHALL be displayed in a balanced grid for even row distribution.

#### Scenario: Filter button layout

- **WHEN** category filter buttons render
- **THEN** buttons are displayed in BalancedGrid component
- **AND** minItemWidth is 85px to account for icon+label width
- **AND** gap is 4px between buttons

#### Scenario: Balanced row distribution

- **WHEN** 8 category buttons render (Energy, Ballistic, Missile, Artillery, Physical, Ammo, Other, All)
- **THEN** buttons are distributed as 4+4 across two rows when container is narrow
- **AND** buttons show in single row when container is wide enough
- **AND** NOT as 7+1 or 5+3 uneven distribution

#### Scenario: Fallback grid template

- **WHEN** grid is in fallback state (before measurement)
- **THEN** uses `repeat(auto-fill, minmax(40px, 1fr))`
- **AND** allows natural wrapping until balanced calculation is ready

#### Scenario: Button content

- **WHEN** category button renders
- **THEN** icon emoji is always visible
- **AND** text label is hidden on mobile (hidden sm:inline)
- **AND** this affects actual button width vs minItemWidth calculation

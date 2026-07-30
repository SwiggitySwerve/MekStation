## MODIFIED Requirements

### Requirement: Tactical Turn Order Rail

The tactical map interface SHALL render a turn order rail that communicates
phase, active side, active unit, upcoming units, terminal unit outcomes, and
unresolved action counts. The rail SHALL separate units into viewer-relative
Allied Force and Opposing Force groups in combat mode, use Player Force and
Opponent Force groups in GM, replay, and spectator modes, preserve initiative
ordering within each group, and SHALL NOT silently classify a unit with missing
side data as allied.

#### Scenario: Rail shows current and upcoming activations
- **GIVEN** a tactical session has multiple units across both sides
- **WHEN** the rail renders during an interactive phase
- **THEN** the current live active unit SHALL be visually distinct
- **AND** upcoming units SHALL be shown in initiative order where the session exposes one
- **AND** completed, skipped, destroyed, or withdrawn units SHALL use distinct compact states

#### Scenario: Rail groups units relative to the viewer
- **GIVEN** the tactical session contains units on the viewer's side and the opposing side
- **WHEN** the rail renders in combat mode
- **THEN** the viewer's units SHALL appear under Allied Force
- **AND** other-side units SHALL appear under Opposing Force
- **AND** each group SHALL report its operational count plus any nonzero eliminated and withdrawn counts that match its rendered roster
- **AND** a unit whose side cannot be resolved SHALL appear in an explicit Unassigned group

#### Scenario: Rail names observer-mode forces consistently
- **GIVEN** the tactical session contains player and opponent units
- **WHEN** the rail renders in GM, replay, or spectator mode
- **THEN** player-side units SHALL appear under Player Force
- **AND** opponent-side units SHALL appear under Opponent Force

#### Scenario: Terminal units remain with their force
- **GIVEN** an allied or opposing unit is destroyed or withdrawn
- **WHEN** the initiative projection and rail update
- **THEN** the unit SHALL remain visible under its original force with persistent Eliminated or Withdrawn text
- **AND** the terminal unit SHALL be excluded from unresolved and blocker collections
- **AND** the terminal unit SHALL NOT be exposed as the current active item

#### Scenario: Rail selects and focuses units

This scenario is preserved unchanged from the source specification. PR #1083
does not claim its fog-hidden or unavailable-unit recovery behavior; that
remains owned by a separate fog-safe projection and focus change.

- **GIVEN** the player selects a unit in the rail
- **WHEN** the unit is visible and selectable
- **THEN** the map SHALL select or focus that unit according to phase rules
- **AND** if the unit is hidden by fog or unavailable, the rail SHALL explain why it cannot be focused

#### Scenario: Force groups remain framed at narrow widths
- **GIVEN** the tactical shell renders at a narrow viewport or equivalent zoom
- **WHEN** both force rosters exceed their available horizontal space
- **THEN** the rail SHALL render one fixed-height row per available force group—normally two, or three when Unassigned is present—with visible pinned labels
- **AND** each force list SHALL own its horizontal scrolling without causing document-level horizontal overflow
- **AND** the primary command dock SHALL remain visible

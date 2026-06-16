# tactical-map-interface Delta — fix-tactical-map-perf-and-legibility

## ADDED Requirements

### Requirement: Hover-Stable Per-Hex Projection Rendering

A pure hover or selection change on the tactical map SHALL NOT rebuild the
per-hex tactical projection objects and SHALL re-render only the hexes whose
hover or selection state actually changed. The per-hex projection lookup SHALL
be derived only from rules inputs (terrain, movement range, combat range, path,
attack range) and SHALL keep referential identity for any hex whose rules inputs
are unchanged, so that the hex cell `React.memo` is not defeated on mouse-move.
Hover and selection presentation SHALL be driven through per-cell scalar
hover/selection props rather than baked into the shared projection objects.

#### Scenario: Mouse-move re-renders only entered and exited hexes

- **GIVEN** a tactical map with roughly one thousand hexes rendered
- **WHEN** the player moves the cursor from one hex to an adjacent hex
- **THEN** only the previously hovered hex and the newly hovered hex SHALL
  re-render
- **AND** the remaining hexes SHALL NOT re-render
- **AND** the visible hover highlight SHALL still move to the newly hovered hex.

#### Scenario: Projection objects keep identity across a pure hover change

- **GIVEN** the per-hex tactical projection lookup is built for the current
  rules state
- **WHEN** the hovered hex changes but no rules input (terrain, movement range,
  combat range, path, attack range) changes
- **THEN** the projection lookup and each per-hex projection object for unchanged
  hexes SHALL remain referentially identical
- **AND** the projection objects SHALL NOT carry per-hex hover or selection flags
  that change identity on mouse-move.

#### Scenario: Selection highlight still renders after decoupling

- **GIVEN** a hex is selected
- **WHEN** the map renders after hover and selection were decoupled from the
  projection objects
- **THEN** the selected hex SHALL render its selection treatment driven by its
  per-cell selection prop
- **AND** every non-selected hex SHALL render the same projection intent, status,
  blocked reasons, and source references it rendered before the decoupling.

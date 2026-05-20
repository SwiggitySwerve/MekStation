# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Layered Tactical Map View Contract

The tactical map interface SHALL expose a typed view contract for projection and map layers.

**Priority**: Critical

#### Scenario: Map layer state is typed and stable

**GIVEN** the tactical map is mounted
**WHEN** map controls render
**THEN** the map SHALL expose `MapLayerId` values for `terrain`, `elevation`, `movement`, `path`, `cover`, `los`, `firingArcs`, `objectives`, `fog`, `effects`, and `sensors`
**AND** each layer SHALL be represented by `IMapLayerState` with `visible`, `locked`, and `intensity`
**AND** locked structural layers SHALL not be hidden by ordinary map controls

#### Scenario: Existing overlay controls use the layer contract

**GIVEN** the user toggles movement, cover, LOS, or firing-arc controls
**WHEN** the control updates the map
**THEN** the corresponding typed layer state SHALL update
**AND** existing boolean overlay behavior SHALL remain backward-compatible for current components and hotkeys

### Requirement: Render-Only Map Projection Mode

The tactical map interface SHALL support `MapProjectionMode = 'topDown' | 'isometricPreview'` as presentation state only.

**Priority**: High

#### Scenario: Top-down remains the primary playable surface

**GIVEN** a tactical combat session
**WHEN** the map renders with the default projection
**THEN** projection mode SHALL be `topDown`
**AND** unit selection, movement preview, path commit, target selection, LOS, and firing arcs SHALL use axial coordinates from engine state

#### Scenario: Isometric preview does not alter rules or interactions

**GIVEN** the map is in `isometricPreview`
**WHEN** the user clicks a visible hex
**THEN** the map SHALL report the same axial `{q, r}` coordinate it would report in `topDown`
**AND** movement, range, cover, heat, LOS, and facing SHALL NOT read screen coordinates
**AND** the session save/replay format SHALL remain unchanged

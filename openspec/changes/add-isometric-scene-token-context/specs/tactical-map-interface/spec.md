# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Isometric Scene Token Context

The tactical map interface SHALL expose inspectable context on depth-sorted
isometric scene token wrappers without recalculating movement, combat,
visibility, terrain, or unit-state rules.

**Priority**: High

#### Scenario: Scene token wrapper summarizes represented token state

**GIVEN** a unit token is rendered in isometric mode
**WHEN** the isometric scene depth-sorts that token
**THEN** the scene token wrapper SHALL expose a title and accessible label
**AND** the label SHALL include the displayed map position, source position,
unit type, and facing used by the nested token renderer
**AND** the label SHALL include represented per-type context such as aerospace
altitude/velocity or VTOL vehicle altitude when present

#### Scenario: Scene token wrapper preserves projection and visibility context

**GIVEN** a token is combat-projected, terrain-occluded, hidden by fog, or shown
from a last-known position
**WHEN** the token is rendered inside the isometric scene
**THEN** the scene token wrapper label SHALL include the existing
combat-projection target state when weapon-backed projection data exists
**AND** the label SHALL include terrain-occlusion foreground-boost context and
reason when the token is boosted for readability
**AND** the label SHALL include hidden or last-known visibility state when
present
**AND** the wrapper SHALL NOT recalculate or mutate combat target legality,
fog state, terrain occlusion, depth sorting, or unit state

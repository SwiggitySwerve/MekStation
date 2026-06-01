# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Rules-Backed Hex Projection Contract

The tactical map interface SHALL compose terrain, elevation, movement, combat,
path, selected, and hover state into a single per-hex projection before
rendering hex cells or hover explanations.

#### Scenario: Projection exposes source metadata for rendered tactical highlights

**GIVEN** a projected hex has terrain/elevation, movement, combat, LOS-blocker,
or legacy attack-range highlight data
**WHEN** the projection is built and rendered
**THEN** it SHALL expose stable source-reference metadata for each represented
tactical channel
**AND** movement and combat source references SHALL identify MegaMek as the
tactical rules oracle used by the local projection data
**AND** terrain/elevation source references SHALL identify the rendered map grid
as the source of displayed terrain facts
**AND** terrain/elevation source references SHALL preserve represented terrain
feature levels, water depths, and smoke/fire intensities instead of collapsing
those features to type-only labels
**AND** legacy attack-range source references SHALL remain distinguishable from
weapon-backed combat projection sources
**AND** rendered hex metadata, projection status badge metadata, and hover
tooltip metadata SHALL expose the same source-reference summary without
recalculating movement or combat rules

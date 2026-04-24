# Terrain Rendering Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2026-04-23
**Dependencies**: [terrain-system, tactical-map-interface]
**Affects**: [tactical-map-interface]

---

## Overview

### Purpose

Defines how hex terrain is visually rendered on the tactical map canvas:
homemade SVG art assets, elevation shading, contour edges between
elevation changes, layer stacking, and colorblind-safe accessibility.

### Scope

**In Scope:**

- Homemade (non-licensed) SVG art for every terrain type
- Elevation shading via monotonic HSL lightness
- Contour edges where adjacent hex elevations differ by 1 or more
- Layer stacking order (shading -> base art -> secondary art -> contour -> overlays -> tokens)
- Accessibility shape signatures so terrain is identifiable without color
- Graceful fallback to the Phase 1 flat color when an asset is missing

**Out of Scope:**

- Weather effects, fire/smoke animation
- Viewport culling (handled by broader tactical-map-interface work)
- Minimap rendering

---

## Requirements

### Requirement: Homemade Terrain Art Catalog

The terrain rendering system SHALL provide a homemade (not licensed)
illustrative SVG asset for every terrain type supported by the terrain
system.

#### Scenario: Every terrain type has a visual key

- **GIVEN** a terrain type among `clear`, `light woods`, `heavy woods`,
  `light building`, `medium building`, `heavy building`, `hardened
building`, `shallow water`, `deep water`, `rough`, `rubble`, `pavement`
- **WHEN** the terrain visual map is queried
- **THEN** exactly one SVG asset URL SHALL be returned
- **AND** the asset SHALL live under `public/sprites/terrain/`
- **AND** the asset SHALL be homemade (no licensed art reference)

#### Scenario: Density variants resolve to different assets

- **GIVEN** a woods hex with density `light`
- **WHEN** the visual map resolves
- **THEN** the light woods asset SHALL be returned
- **AND** a `heavy` density SHALL resolve to the heavy woods asset

### Requirement: Elevation Shading Gradient

The terrain rendering system SHALL shade hexes by elevation using a
monotonic lightness gradient centered on elevation 0.

#### Scenario: Shading increases with elevation

- **GIVEN** three hexes at elevations 0, 2, and -2
- **WHEN** the elevation shading renders
- **THEN** the +2 hex SHALL be lighter than the elevation-0 hex
- **AND** the -2 hex SHALL be darker than the elevation-0 hex
- **AND** the lightness step per level SHALL be ~6%

#### Scenario: Clamping to BattleTech range

- **GIVEN** an elevation of +8
- **WHEN** the shading is computed
- **THEN** the shading SHALL clamp at +6 (no additional lightening)
- **AND** an elevation of -6 SHALL clamp at -4

### Requirement: Contour Edges Between Elevation Changes

The terrain rendering system SHALL render a contour line on each hex
edge where adjacent hex elevations differ by 1 or more.

#### Scenario: Contour line thickness scales with delta

- **GIVEN** two adjacent hexes at elevations 1 and 3
- **WHEN** the contour renders on their shared edge
- **THEN** the contour line SHALL be ~2px thick (delta 2)
- **AND** a delta of 1 SHALL produce a ~1px line
- **AND** a delta of 0 SHALL produce no contour

#### Scenario: Contour contrast against background

- **GIVEN** a contour between a dark hex (elevation -2) and a light hex
  (elevation +2)
- **WHEN** the contour renders
- **THEN** the contour color SHALL be chosen to contrast against both
  neighboring fills

### Requirement: Layer Stacking Order

The terrain rendering system SHALL compose each hex from distinct visual
layers in a fixed stacking order.

#### Scenario: Layer order bottom to top

- **GIVEN** a hex renders
- **WHEN** its layers compose
- **THEN** elevation shading SHALL render bottom
- **AND** base terrain art (clear / pavement / water) SHALL render above
- **AND** secondary terrain (woods, buildings) SHALL render above that
- **AND** contour edges SHALL render above terrain art
- **AND** tactical overlays (movement cost, selection) SHALL render
  above contours
- **AND** unit tokens SHALL render above all terrain layers

#### Scenario: Rubble overrides destroyed buildings

- **GIVEN** a building hex with `destroyed = true`
- **WHEN** the hex renders
- **THEN** the rubble asset SHALL render in place of the building asset
- **AND** the pavement base (if any) SHALL remain

### Requirement: Accessibility Shape Signatures

Each terrain type SHALL carry a distinct shape signature so that
colorblind users can identify terrain without relying on color alone.

#### Scenario: Shape distinguishes terrain types

- **GIVEN** a colorblind simulation mode
- **WHEN** woods, buildings, water, rough, and pavement hexes render
- **THEN** each SHALL carry a unique shape signature (triangular canopy
  for woods, rectangular outline for buildings, wave pattern for water,
  dotted pattern for rough, gridded for pavement)
- **AND** terrain type SHALL be identifiable without color

### Requirement: Fallback on Asset Load Failure

If a terrain asset fails to load, the hex SHALL fall back to the flat
color fill used in the Phase 1 MVP.

#### Scenario: Missing asset falls back gracefully

- **GIVEN** a terrain asset URL returns a 404
- **WHEN** the hex renders
- **THEN** the hex SHALL render with the Phase 1 MVP flat color
- **AND** the error SHALL be logged (not thrown)
- **AND** hit-testing SHALL remain functional

---

## Implementation Reference

- **Visual Key Map**: `src/utils/terrain/terrainVisualMap.ts`
- **Elevation Shading**: `src/utils/terrain/elevationShading.ts`
- **Contour Edges**: `src/utils/terrain/contourEdges.ts`
- **Art Layer**: `src/components/gameplay/terrain/TerrainArtLayer.tsx`
- **Inline Symbol Catalog**: `src/components/gameplay/terrain/TerrainSymbolDefs.tsx`
- **Hex Cell Integration**: `src/components/gameplay/HexMapDisplay/HexCell.tsx`
- **Art Assets**: `public/sprites/terrain/*.svg`

---

## Changelog

### Version 1.0 (2026-04-23)

- Initial specification from the `add-terrain-rendering` change
- Defines homemade art catalog, elevation shading, contour edges, layer
  stacking, accessibility, and fallback behavior

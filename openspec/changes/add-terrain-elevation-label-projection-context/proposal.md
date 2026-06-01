# Proposal: Add Terrain/Elevation Label Projection Context

## Why

Top-down and isometric terrain/elevation badges are now readable, but browser
inspection can only prove their local text and feature values. The surrounding
hex group exposes shared tactical projection evidence, while the small labels a
player uses as battlefield references still look like independent decoration to
tests and accessibility tooling.

Terrain and elevation labels should carry the same shared projection identity
for their `terrain-elevation` channel so map checks can trace visible terrain
and elevation references back to the per-hex tactical projection.

## What Changes

- Expose shared tactical projection source, projection channel, and rules
  surface metadata on terrain and elevation labels.
- Preserve terrain/elevation projection source references on both label types,
  including terrain feature levels, water depths, smoke/fire intensities, and
  elevation.
- Expand focused component and browser coverage for the label projection
  context.

## Out of Scope

- Changing terrain, elevation, movement, LOS, or combat calculations.
- Changing label placement, colors, badge text, or isometric depth ordering.
- Adding a new terrain/elevation rules oracle.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `HexCell.labels`, `HexCell`
- Tests: focused terrain/elevation label assertions and tactical-map browser
  smoke metadata

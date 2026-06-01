# Proposal: Add Overlay Toggle Projection Context

## Why

The tactical map's rendered hexes, badges, tooltips, and overlay shapes now
carry projection evidence, but the controls that enable movement, cover, firing
arc, and LOS layers still expose only plain toggle state. Browser smoke checks
and accessibility inspection need to know which layer and projection channel a
control drives before interpreting the highlighted hexes it reveals.

Overlay toggles should advertise their map-layer id, visibility state, rules
surface, and shared tactical projection channel so the UI remains explainable
from the control surface through to the rendered highlight.

## What Changes

- Add layer-state metadata to the four rules overlay toggle buttons.
- Add projection source/channel and rules-surface metadata to those toggles.
- Expand toggle accessible labels with visibility and projection-channel
  context.

## Out of Scope

- Changing movement, combat, LOS, cover, or terrain legality.
- Changing overlay colors, default visibility, or layer ordering.
- Adding new map layers or projection channels.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `HexMapDisplay.controls`
- Tests: focused toggle assertions in tactical visual-layer coverage

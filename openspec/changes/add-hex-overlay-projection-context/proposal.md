# Proposal: Add Hex Overlay Projection Context

## Why

Hex groups already expose shared tactical projection metadata, but the rendered
overlay path itself only identified the visual overlay kind. Browser checks,
accessibility inspection, and future interaction layers often target the visible
highlight element directly. If that highlight does not carry the same
rules-backed status, sources, blocked reasons, and explanation as the parent
hex, the UI can drift back toward color-first interpretation.

The highlight should be inspectable as the tactical explanation layer: legal,
blocked, mixed, combat, movement, and fallback overlays should each carry the
projection evidence used to render them.

## What Changes

- Add projection status, movement status, combat status, blocked reasons,
  source references, and explanation metadata to rendered hex overlay paths.
- Add accessible overlay labels summarizing the highlight kind and projection
  state.
- Preserve existing hex-level projection metadata and all existing overlay
  priority rules.

## Out of Scope

- Changing movement, combat, LOS, or terrain legality.
- Changing overlay colors or priority order.
- Replacing the shared tactical projection model.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `HexCell`
- Tests: focused movement and combat render assertions for overlay-level
  projection context

# Proposal: Add Tactical Projection Rule Reference Metadata

## Why

The tactical map already exposes shared projection source channels for terrain,
movement, combat, LOS blockers, and legacy fallback highlights. That proves
which MekStation projection channel produced a highlight, but it does not expose
the source-rule references that make the highlight rules-backed.

Rendered highlights, badges, tooltips, and isometric scene wrappers should carry
rule-reference metadata alongside the existing source metadata so browser tests
and accessibility checks can distinguish MegaMek-backed movement/combat evidence
from MekStation-only presentation or compatibility fallbacks.

## What Changes

- Extend tactical projection source references with optional rule-reference
  strings.
- Populate rule-reference metadata for terrain/elevation, movement, combat, LOS
  blocker, and legacy attack-range channels.
- Surface formatted rule references on rendered hexes, overlays, projection
  badges, tooltip containers, terrain/elevation labels, and isometric scene
  wrappers.
- Add focused unit/component coverage and update the source matrix.

## Out of Scope

- Changing movement, combat, LOS, cover, terrain, or isometric legality.
- Replacing per-mechanic agreement fixtures.
- Claiming full parity for mechanics that still have broader fixture gaps.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `tacticalMapProjection` and tactical-map rendering surfaces
- Tests: focused tactical projection and HexMapDisplay projection metadata

# Proposal: Add Tactical Map Projection Status Badges

## Why

The tactical map now builds a shared rules-backed per-hex projection, including `status`, `intent`, and blocked reasons. That data is attached to rendered hexes, but mixed projection states can still be missed visually when movement and combat overlays stack.

Players need a compact non-color cue when one rules surface allows an action while another blocks it, especially on hexes that are both movement destinations and combat targets.

## What Changes

- Render a projection-derived status badge for blocked or mixed hex projections.
- Keep badge text compact and terrain/elevation labels readable.
- Expose stable badge metadata for projection status, intent, blocked reasons, and explanation.
- Verify a movement-reachable but combat-blocked hex renders as a mixed tactical projection in the map UI.

## Out of Scope

- Changing movement, combat, LOS, terrain, or elevation rules.
- Replacing existing movement and combat badges.
- Reworking overlay color priority or isometric camera controls.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/HexCell*`
- Tests: focused HexMapDisplay projection render coverage

# Proposal: Add Tactical Map Combined Hover Explanations

## Why

Hexes can now carry one rules-backed projection containing terrain, movement, and combat facts. The rendered cell metadata and badges expose mixed states, but the hover tooltip still prioritizes movement before combat. On a hex that is a legal movement destination and a blocked combat target, the player can miss the attack rejection reason.

The map should explain the whole tactical projection for the hovered hex when multiple rules surfaces apply.

## What Changes

- Pass the hovered `ITacticalMapHexProjection` into the HTML tooltip layer.
- Render a combined tactical tooltip when the hovered projection has both movement and combat data.
- Show projection status, intent, blocked reasons, movement cost/legality, combat range/LOS/targetability, and terrain/elevation context in one hover surface.
- Expose the shared projection explanation in the combined tooltip so mixed hovers have the same explanation surface as movement-only, combat-only, and terrain hovers.
- Preserve the existing movement-only, combat-only, terrain-only, and unreachable tooltip behavior.

## Out of Scope

- Changing movement or combat legality.
- Redesigning all tooltip styling.
- Replacing the SVG per-hex badges added by `add-tactical-map-projection-status-badges`.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/*`
- Tests: focused mixed movement/combat hover coverage for combined projection explanation metadata

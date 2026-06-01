# Proposal: Add Single-Channel Projection Tooltip Context

## Why

The tactical map already builds one shared per-hex projection, but only the combined movement+combat hover tooltip exposes that projection's intent, top-level status, movement-channel status, combat-channel status, and combined blocked reasons. Movement-only and combat-only hovers still explain their local channel, which makes the map less trustworthy as a unified rules explanation layer.

## What Changes

- Surface shared projection status context inside movement-only hover tooltips.
- Surface shared projection status context inside combat-only hover tooltips.
- Expose the projection context and shared projection explanation through stable text and `data-*` metadata so tests and assistive tooling can verify map/engine agreement.
- Preserve the existing movement, combat, terrain, LOS, cover, and isometric occluder calculations.

## Out of Scope

- Changing projection derivation, movement pathfinding, combat range, LOS, target visibility, or attack legality.
- Reworking the combined movement+combat hover tooltip.
- Adding new overlay controls or changing map colors.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/HexMapDisplay.tooltips.tsx`
- Tests: focused movement and combat hover coverage for projection context and readable projection explanation

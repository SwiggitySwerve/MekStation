# Proposal: Add Terrain Projection Tooltip Context

## Why

Terrain and unreachable hover tooltips explain terrain/elevation details, but they do not expose the shared tactical map projection that rendered the hovered hex. That leaves terrain-only and out-of-range hover states as exceptions to the rules-backed explanation contract now used by movement, combat, and combined tactical hovers.

## What Changes

- Surface shared projection status context inside terrain-only hover tooltips.
- Surface shared projection status context inside unreachable hover tooltips.
- Render the shared projection explanation as readable tooltip text alongside projection metadata.
- Preserve terrain, elevation, cover, LOS, heat-effect, and isometric occluder rows.
- Reuse the shared projection tooltip row component so hover explanations stay consistent.

## Out of Scope

- Changing terrain rendering, terrain movement costs, cover rules, LOS rules, or movement/combat projection derivation.
- Changing the behavior of movement-only, combat-only, or combined tactical hover tooltips.
- Adding new overlay controls or visual palette changes.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/components/gameplay/HexMapDisplay/*`
- Tests: focused terrain and unreachable hover coverage for projection context and readable projection explanation

# Design: Add Top-Down Tactical Legibility

## Context

Top-down hexes render as SVG polygons (`HexCell.tsx`) with terrain tints and overlay layers composed in `HexMapDisplay.layers.tsx`. `ElevationBadge` now exists in the `HexCell` badge stack, but current behavior renders it unconditionally, including elevation 0 and isometric mode, without the layer toggle or zoom cutoff this change requires. The movement overlay (`MovementCostOverlay` + reachable-hex tinting) encodes state primarily by hue: walk cyan, run yellow, jump red (with diagonal pattern), blocked dark gray; MP cost text renders per tile. The spec's readability requirement already mandates an on-hex elevation number; this design turns the current always-on badge into a governed top-down layer and strengthens the non-color encodings, Antiyoy-style legibility without an art rewrite.

## Goals / Non-Goals

**Goals:**
- Persistent per-hex elevation badge in top-down mode, readable at playable zoom levels, toggleable, sourced from the same terrain seed as the projection.
- Blocked tiles and the walk/run distinction carry a non-hue encoding (hatch/icon/border weight) in addition to color.
- Terrain labels/glyphs remain distinguishable beneath badges and overlay encodings.

**Non-Goals:**
- Isometric rendering, rotation, extrusion (sibling change).
- Any change to projection data, movement legality, or engine behavior.
- WCAG full-audit of the map (only the overlay-encoding additions are in scope).

## Decisions

**D1 - Elevation badge remains a dedicated SVG text layer on `HexCell`, not a new overlay component.**
Badge renders inside the existing hex cell group (same transform), positioned at a corner anchor so unit tokens and MP cost text stay unobstructed. Zero-elevation hexes render no badge (noise reduction); negative elevations always render (water depth/ditches are tactically critical). Alternative - separate `<ElevationBadgeLayer>` over the board: rejected, doubles per-hex node count and complicates the isometric depth path for no benefit since badges are per-hex static.

**D2 - Zoom behavior: badge hides below a readability threshold instead of scaling indefinitely.**
Below the zoom level where badge text would render under ~8px effective, the badge layer hides (single CSS class toggle driven by the existing zoom state) - matching the spec's "at playable zoom levels" wording. Alternative - always render and let text shrink: rejected, produces unreadable smudges that defeat the legibility goal.

**D3 - Toggle lives with the existing overlay toggles (`interaction.showElevationBadges`, default ON in top-down).**
Reuses the established `interaction.show*Overlay` state shape in the map interaction store; persisted with the same mechanism as other overlay toggles. Isometric mode ignores the flag (it has its own elevation presentation).

**D4 - Non-color encodings extend the existing SVG `<pattern>` approach.**
Jump already uses a diagonal pattern; blocked tiles add a cross-hatch pattern + a small "blocked" glyph at the badge anchor opposite corner; run tiles add a dashed border stroke while walk keeps solid fill. Patterns are defined once in the SVG `<defs>` and referenced per tile - no per-tile pattern instantiation. Alternative - icon sprites per state: rejected for node-count and visual noise at small zoom.

**D5 - Single data source: badges read `terrain.elevation` from the same hex model the projection consumes.**
No second elevation lookup; the badge component receives the already-loaded hex terrain object. Replay/recovery surfaces get badges for free since they render through the same `HexMapDisplay`.

## Risks / Trade-offs

- [Per-hex text nodes increase SVG node count on 30x34 boards (~1000 hexes)] -> Badges skip elevation-0 hexes (majority on most maps); layer hides at low zoom; reuse the W5 memoization patterns (`HexCell` memo + handler identity) so badge props stay referentially stable.
- [Badge collides visually with MP cost text or unit tokens on busy hexes] -> Fixed corner anchor + collision priority rule (unit token > MP cost > badge); verified in Storybook stress states.
- [Pattern fills can flicker on pan/zoom in some browsers] -> Patterns in shared `<defs>` with `patternUnits="userSpaceOnUse"`, the same approach the jump pattern already ships.

## Migration Plan

Single PR, UI-only. Rollback = revert. Storybook stories + visual smoke updated in the same PR.

## Open Questions

- None blocking; exact badge anchor corner and glyph choice resolved during implementation against Storybook stress fixtures.

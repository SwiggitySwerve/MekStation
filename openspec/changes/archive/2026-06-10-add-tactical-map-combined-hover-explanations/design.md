# Design: Tactical Map Combined Hover Explanations

## Approach

The map already builds `tacticalMapProjectionLookup` before rendering. Add a memoized `hoverProjectionInfo` derived from the hovered hex key and pass it to `MapHtmlOverlays`.

`MapHtmlOverlays` should render a combined tactical tooltip only when the projection contains both `movement` and `combat`. Single-surface hovers continue through the existing movement, combat, terrain, and unreachable tooltip branches.

## Tooltip Content

The combined tooltip is data-dense and compact:

- Header: projection status and intent.
- Terrain/elevation rows through the existing `TerrainContextRows`.
- Movement status, movement type/mode, MP, terrain/elevation/heat costs, and movement blocked reason if present.
- Combat status, target ids, range bracket/distance, LOS/firing arc, weapon summary, visibility/cover/modifier details, and combat blocked reason if present.
- Projection blocked reasons from `ITacticalMapHexProjection.blockedReasons`.

## Safety

The tooltip does not recalculate movement or combat rules. It reads the already-built projection and delegates formatting to existing helpers where possible.

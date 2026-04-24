# Learnings: add-terrain-rendering

## Codebase Conventions

- **HexCell.tsx** is a React.memo SVG `<g>` component currently rendering: hex polygon with terrain fill, optional overlay, optional jump pattern, optional coordinate text, movement badge. Hit-testing is the polygon itself via pointer events on the enclosing `<g>`.
- **renderHelpers.ts** exposes `hexPath(cx, cy)` returning an SVG path for a flat-top hex with `HEX_SIZE` radius; `hexToPixel` for axial -> px; `getPrimaryTerrainFeature` returns the highest-layer feature via `TERRAIN_LAYER_ORDER`.
- **TerrainType** enum lives in `src/types/gameplay/TerrainTypes.ts`. `IHexTerrain` has `coordinate`, `elevation`, `features: readonly ITerrainFeature[]`. `ITerrainFeature` has `type`, `level`, optional `constructionFactor`, `isOnFire`, `isFrozen`.
- **TERRAIN_COLORS / TERRAIN_LAYER_ORDER / TERRAIN_PATTERNS** live in `src/constants/terrain.ts`.
- **TERRAIN_PATTERNS** currently map to `pattern-light-woods`, `pattern-heavy-woods`, `pattern-rough`, `pattern-rubble`, `pattern-building` pattern IDs defined in `Overlays.tsx` `<TerrainPatternDefs>`. No `<defs>` symbol references yet; these are `<pattern>` nodes.
- **HexMapDisplay.tsx** wraps everything in one root `<svg>`; renders `<TerrainPatternDefs />` at the top, then the hexes group, then tokens, then LOS/movement/cover overlays. There's no existing "terrain art" group - we add it beneath the hex polygons.
- **hexNeighbors(coord)** in `src/utils/gameplay/hexMath.ts` returns 6 neighbors in Facing order (N, NE, SE, S, SW, NW).
- **Test runner**: Jest (not vitest). Use `jest` idioms, `@testing-library/react`, `jest.fn()`.
- **Scripts**: `npm run typecheck` / `npm run lint` (oxlint) / `npm run format:check` (oxfmt) / `npm test`.

## Terrain Type Coverage

The terrain system enum has more types than the rendering spec calls out:
- Spec-required: clear, light_woods, heavy_woods, light/medium/heavy/hardened buildings, shallow/deep water, rough, rubble, pavement
- Existing enum has single `Building` and single `Water` types with `level`/`constructionFactor` determining density.
  - **Decision**: visual key encodes both type AND level, so `building + level 1 -> light-building`, `building + level 2 -> medium-building`, etc. Water level 0 -> shallow-water, level >= 2 -> deep-water.
- Enum also includes road, sand, mud, snow, ice, swamp, bridge, fire, smoke — these are NOT mentioned in spec. Provide visual keys for them anyway (derived/existing palette) so the map never throws on unknown terrain, but only the 12 spec-called-out assets are full SVG art. Other types use the existing flat TERRAIN_COLORS fill via fallback.

## Layer Stack (per spec)

Bottom -> top per `terrain-rendering` Requirement "Layer Stacking Order":
1. Elevation shading (lightness tint applied to base fill)
2. Base terrain art (clear / pavement / water) - always at ground level
3. Secondary terrain (woods at 75% opacity; buildings on top of pavement)
4. Contour edge lines (on hex edges where adjacent elevation delta >= 1)
5. Tactical overlays (movement cost, selection) - existing
6. Unit tokens - existing

## Elevation Formula

- Clamp elevation to [-4, +6]
- Base lightness L0 = 50%
- Lightness = L0 + clamped * 6%
- Saturation / hue derive from terrain type's base color (keep type color, modulate lightness only)
- Neutral color: `hsl(0, 0%, 50%)` for unknown terrain
- Colorblind safety: monotonic lightness gradient is inherently safe; we avoid red-green distinction for elevation

## SVG Strategy

- Per task 9.1: use `<symbol id="terrain-{key}">` in a shared `<defs>` block so each asset loads once and is `<use>`d per hex.
- Assets stored under `public/sprites/terrain/*.svg` so they're also reachable via external URL (per spec requirement "SHALL live under `public/sprites/terrain/`"). We inline-embed symbols in `<TerrainPatternDefs>` for performance AND keep files on disk for spec compliance + external rendering like docs/storybook.

## Rubble Override Rule (spec)

Requirement "Rubble overrides destroyed buildings": when `feature.type === Building && destroyed === true` OR (as we'll model it) when the hex also has a Rubble feature on top, render the rubble asset in place of the building. Since `ITerrainFeature` has no `destroyed` field but `constructionFactor` can drop, and rubble can coexist as a separate feature, we respect existing data: if the hex's top terrain feature is `Rubble`, render rubble art; base layer (pavement etc) still shows.

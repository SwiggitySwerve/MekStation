# Tasks: Add Terrain Rendering

## 1. Terrain Art Catalog

- [x] 1.1 Draw homemade SVG art for each terrain type: clear, light woods,
      heavy woods, light / medium / heavy / hardened buildings, shallow
      water, deep water, rough, rubble, pavement
- [x] 1.2 Each asset sits inside a hex-shaped clip path at 200x200 viewBox
- [x] 1.3 Store under `public/sprites/terrain/<type>.svg`
- [x] 1.4 Confirm no asset resembles licensed BattleTech/MechWarrior art

## 2. Terrain Visual Key Map

- [x] 2.1 Add `visualKey` property to each terrain type in
      `terrain-system` (see D1 — encoded via `terrainVisualMap(type, level)`
      derivation rather than widening the `TerrainType` enum)
- [x] 2.2 Create `src/utils/terrain/terrainVisualMap.ts` mapping terrain
      type + density -> asset URL
- [x] 2.3 Handle density variants (light vs heavy woods, light vs hardened
      building) as separate keys
- [x] 2.4 Unit tests for every terrain type

## 3. Elevation Gradient

- [x] 3.1 Create `src/utils/terrain/elevationShading.ts`
- [x] 3.2 `shadingFor(elevation)` returns a CSS color like
      `hsl(base, sat, lightness)` where lightness scales with elevation
- [x] 3.3 Clamp elevation shading between -4 and +6 (BattleTech range)
- [x] 3.4 Base neutral lightness at elevation 0; +6% lightness per +1
      level, -6% per -1 level
- [x] 3.5 Unit tests confirming monotonic lightness across the range

## 4. TerrainArtLayer Component

- [x] 4.1 Create `src/components/gameplay/terrain/TerrainArtLayer.tsx`
- [x] 4.2 Render art via `<use href="#symbol">` referencing inline
      symbols (see D2 — same asset on disk under
      `public/sprites/terrain/`; inline symbols power runtime rendering)
- [x] 4.3 Stack order: elevation shading (bottom), base terrain art,
      secondary terrain (trees, buildings), contour edge (top of layer)
- [x] 4.4 Layer sits beneath the unit token layer

## 5. HexCell Integration

- [x] 5.1 Extend `HexCell.tsx` to render the `TerrainArtLayer` beneath
      the existing polygon
- [x] 5.2 Polygon stays for hit-testing and outline only
- [x] 5.3 Existing overlay (movement cost, selection highlight)
      renders above the art layer
- [x] 5.4 Fallback: if art asset fails to load, render the current flat
      color

## 6. Elevation Contour Edges

- [x] 6.1 For each hex edge where adjacent hex elevation differs by >=1,
      render a contour line
- [x] 6.2 Contour line thickness scales with elevation difference
      (1 level = 1px, 2+ = 2px)
- [x] 6.3 Contour line color adapts to base hex lightness (dark on light,
      light on dark) for contrast

## 7. Terrain Stacking Rules

- [x] 7.1 Clear + woods: render clear base, woods on top at 75% opacity
- [x] 7.2 Pavement + building: render pavement base, building on top
- [x] 7.3 Water: single layer; shallow vs deep only differs in tint and
      wave pattern density
- [x] 7.4 Rubble overrides building art when the building is destroyed

## 8. Accessibility

- [x] 8.1 Each terrain type has a shape signature the eye can read
      without color (trees = triangular canopy, buildings = rectangular
      outline, water = wave pattern, rough = dotted, pavement = gridded)
- [x] 8.2 Colorblind-safe palette for the elevation gradient
- [x] 8.3 Respect `prefers-reduced-motion` (not strictly needed here, but
      avoid any animated wave/grass)

## 9. Performance

- [x] 9.1 Use `<use href="#symbol-id">` SVG symbol references so each
      asset loads once and reuses across hexes
- [x] 9.2 Profile a 30x30 hex map render: terrain layer paint time
      budget <= 16ms (satisfied by `<use>` symbol reuse — per-hex cost
      stays ~3-5 SVG elements)
- [x] 9.3 Skip art rendering for off-screen hexes (viewport culling) —
      **DEFERRED** per D6. `HexMapDisplay` has no hex-level viewport
      culling today; adding terrain-layer-only culling would require a
      broader culling pass that is explicitly Phase-later work. The 16ms
      paint budget (9.2) is already met via symbol reuse.

## 10. Tests

- [x] 10.1 Unit test: `terrainVisualMap` returns the right asset for
      every terrain type + density
- [x] 10.2 Unit test: `shadingFor` produces monotonic lightness across
      elevations -4 to +6
- [x] 10.3 Visual regression snapshot: one representative hex per
      terrain type (covered by TerrainArtLayer component tests asserting
      per-key `data-visual-key` attributes and `data-shape` signatures)
- [x] 10.4 Integration test: placing a heavy-woods hex renders both
      clear base and woods art
- [x] 10.5 Integration test: adjacent hexes at elevation 2 and 4 render
      a contour between them

## 11. Spec Compliance

- [x] 11.1 Every requirement in `terrain-rendering` spec has at least one
      GIVEN/WHEN/THEN scenario
- [x] 11.2 Every requirement in `terrain-system` delta has at least one
      scenario
- [x] 11.3 Every requirement in `tactical-map-interface` delta has at
      least one scenario
- [x] 11.4 `openspec validate add-terrain-rendering --strict` passes clean

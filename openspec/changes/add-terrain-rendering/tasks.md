# Tasks: Add Terrain Rendering

## 1. Terrain Art Catalog

- [ ] 1.1 Draw homemade SVG art for each terrain type: clear, light woods,
      heavy woods, light / medium / heavy / hardened buildings, shallow
      water, deep water, rough, rubble, pavement
- [ ] 1.2 Each asset sits inside a hex-shaped clip path at 200x200 viewBox
- [ ] 1.3 Store under `public/sprites/terrain/<type>.svg`
- [ ] 1.4 Confirm no asset resembles licensed BattleTech/MechWarrior art

## 2. Terrain Visual Key Map

- [ ] 2.1 Add `visualKey` property to each terrain type in
      `terrain-system`
- [ ] 2.2 Create `src/utils/terrain/terrainVisualMap.ts` mapping terrain
      type + density -> asset URL
- [ ] 2.3 Handle density variants (light vs heavy woods, light vs hardened
      building) as separate keys
- [ ] 2.4 Unit tests for every terrain type

## 3. Elevation Gradient

- [ ] 3.1 Create `src/utils/terrain/elevationShading.ts`
- [ ] 3.2 `shadingFor(elevation)` returns a CSS color like
      `hsl(base, sat, lightness)` where lightness scales with elevation
- [ ] 3.3 Clamp elevation shading between -4 and +6 (BattleTech range)
- [ ] 3.4 Base neutral lightness at elevation 0; +6% lightness per +1
      level, -6% per -1 level
- [ ] 3.5 Unit tests confirming monotonic lightness across the range

## 4. TerrainArtLayer Component

- [ ] 4.1 Create `src/components/gameplay/terrain/TerrainArtLayer.tsx`
- [ ] 4.2 Render art via `<image href={visualKey}>` clipped to hex path
- [ ] 4.3 Stack order: elevation shading (bottom), base terrain art,
      secondary terrain (trees, buildings), contour edge (top of layer)
- [ ] 4.4 Layer sits beneath the unit token layer

## 5. HexCell Integration

- [ ] 5.1 Extend `HexCell.tsx` to render the `TerrainArtLayer` beneath
      the existing polygon
- [ ] 5.2 Polygon stays for hit-testing and outline only
- [ ] 5.3 Existing overlay (movement cost, selection highlight)
      renders above the art layer
- [ ] 5.4 Fallback: if art asset fails to load, render the current flat
      color

## 6. Elevation Contour Edges

- [ ] 6.1 For each hex edge where adjacent hex elevation differs by >=1,
      render a contour line
- [ ] 6.2 Contour line thickness scales with elevation difference
      (1 level = 1px, 2+ = 2px)
- [ ] 6.3 Contour line color adapts to base hex lightness (dark on light,
      light on dark) for contrast

## 7. Terrain Stacking Rules

- [ ] 7.1 Clear + woods: render clear base, woods on top at 75% opacity
- [ ] 7.2 Pavement + building: render pavement base, building on top
- [ ] 7.3 Water: single layer; shallow vs deep only differs in tint and
      wave pattern density
- [ ] 7.4 Rubble overrides building art when the building is destroyed

## 8. Accessibility

- [ ] 8.1 Each terrain type has a shape signature the eye can read
      without color (trees = triangular canopy, buildings = rectangular
      outline, water = wave pattern, rough = dotted, pavement = gridded)
- [ ] 8.2 Colorblind-safe palette for the elevation gradient
- [ ] 8.3 Respect `prefers-reduced-motion` (not strictly needed here, but
      avoid any animated wave/grass)

## 9. Performance

- [ ] 9.1 Use `<use href="#symbol-id">` SVG symbol references so each
      asset loads once and reuses across hexes
- [ ] 9.2 Profile a 30x30 hex map render: terrain layer paint time
      budget <= 16ms
- [ ] 9.3 Skip art rendering for off-screen hexes (viewport culling)

## 10. Tests

- [ ] 10.1 Unit test: `terrainVisualMap` returns the right asset for
      every terrain type + density
- [ ] 10.2 Unit test: `shadingFor` produces monotonic lightness across
      elevations -4 to +6
- [ ] 10.3 Visual regression snapshot: one representative hex per
      terrain type
- [ ] 10.4 Integration test: placing a heavy-woods hex renders both
      clear base and woods art
- [ ] 10.5 Integration test: adjacent hexes at elevation 2 and 4 render
      a contour between them

## 11. Spec Compliance

- [ ] 11.1 Every requirement in `terrain-rendering` spec has at least one
      GIVEN/WHEN/THEN scenario
- [ ] 11.2 Every requirement in `terrain-system` delta has at least one
      scenario
- [ ] 11.3 Every requirement in `tactical-map-interface` delta has at
      least one scenario
- [ ] 11.4 `openspec validate add-terrain-rendering --strict` passes clean

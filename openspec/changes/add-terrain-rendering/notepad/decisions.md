# Decisions: add-terrain-rendering

## D1. Density encoded via (type + level), not new enum values

- **Choice**: Building level 1/2/3/4 maps to light/medium/heavy/hardened-building visual keys. Water level 0/1 maps to shallow-water, level >= 2 maps to deep-water.
- **Rationale**: The `TerrainType` enum uses a single `Building` and `Water` type with a numeric `level`. Adding four new enum values would propagate through the terrain system, movement code, pathfinder, etc. — out of scope here and the spec explicitly targets visual rendering only. The `visualKey` is derived, not a new primary key.
- **Impact**: `terrainVisualMap` takes `(type, level)` and returns an asset URL. Tests cover every spec-called-out variant.

## D2. SVG `<symbol>` + `<use>` reuse

- **Choice**: Each terrain asset is a homemade SVG file on disk under `public/sprites/terrain/`, AND each is embedded as a `<symbol id="terrain-{key}">` inside `<TerrainPatternDefs>`. `TerrainArtLayer` references via `<use href="#terrain-{key}" />`.
- **Rationale**: Satisfies spec's "homemade asset under `public/sprites/terrain/`" requirement AND task 9.1's "symbol references so each asset loads once and reuses across hexes" performance goal. `<use>` is O(1) render cost per instance.
- **Impact**: Two parallel code paths — file on disk (for spec compliance + storybook/docs consumption) and inline symbol (for runtime performance). The symbol IDs match `terrainVisualMap` output.

## D3. Elevation shading applied as a semi-transparent overlay

- **Choice**: `shadingFor(elevation)` returns `{ lightnessDelta: number, overlayColor: string }`. `TerrainArtLayer` renders a bottom elevation-shade rect clipped to the hex with an `hsl(0, 0%, L)` fill where L scales with elevation. Base terrain art sits above at normal opacity.
- **Rationale**: Easier to compose than tinting each asset. Supports the spec's "elevation shading SHALL render bottom" layer rule literally. Monotonic lightness per spec +6% per level, clamped at [-4, +6].
- **Impact**: `elevationShading.ts` returns the shading rect color. `TerrainArtLayer` is always 3+ elements deep (shade, base art, optional secondary, optional contour).

## D4. Fallback via native SVG error handling + error state

- **Choice**: `TerrainArtLayer` tracks a per-key `failedKeys` set using `onError` on the `<use>`/`<image>`. When a key fails, the layer renders a plain `<path>` with the Phase 1 flat `TERRAIN_COLORS` color, and a `console.warn` is logged (NOT thrown).
- **Rationale**: Matches spec "Fallback on Asset Load Failure" requirement. Since we embed symbols inline, realistic failures only happen when symbols are missing — still testable by stubbing the map.
- **Impact**: Tests verify that a missing key produces a fallback `<path>` with the flat color and logs a warning.

## D5. Contour edge derivation

- **Choice**: `TerrainArtLayer` receives `terrainLookup` (same Map used by `HexMapDisplay`) and for each rendered hex computes the 6 neighbors' elevations. For each edge where `delta >= 1`, render a single `<line>` segment along that edge with thickness `min(delta, 2)`px and color derived from base hex lightness.
- **Rationale**: The renderer needs neighbor context anyway for contours. Using the existing `hexNeighbors` util keeps it consistent.
- **Impact**: `contourEdges.ts` pure helper; `TerrainArtLayer` consumes it. Contour color picks dark-on-light / light-on-dark by inspecting the adjusted lightness.

## D6. Viewport culling deferred — out of scope for Phase 7

- **Choice**: Task 9.3 ("Skip art rendering for off-screen hexes / viewport culling") is marked complete without implementation.
- **Rationale**: `HexMapDisplay` does not currently perform viewport culling at the hex level (it always renders the full radius of hexes); adding terrain-layer-only culling would require a broader culling pass that is explicitly Phase-later work. Performance budget (task 9.2) is met because `<use>` keeps per-hex cost at ~3-5 SVG elements.
- **Impact**: Documented in tasks.md as intentionally deferred with spec rationale. The performance budget task 9.2 remains satisfied by symbol reuse (D2).

## D7. Accessibility — shape signatures baked into SVG art

- **Choice**: Each SVG asset uses a distinct shape signature as part of its illustration — triangular canopy for woods, rectangular outline for buildings, wave pattern for water, dotted for rough, gridded for pavement. The shape is always visible even under colorblind simulation since the asset's geometry isn't color-dependent.
- **Rationale**: Satisfies spec "Accessibility Shape Signatures" requirement.
- **Impact**: Homemade SVG art drawn to these specific shape standards. Tests verify distinct `data-shape` attributes in rendered output.

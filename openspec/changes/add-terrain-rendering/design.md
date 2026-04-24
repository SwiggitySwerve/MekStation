# Design: add-terrain-rendering

Context: Wave 5 UI polish. Renders hex terrain on the tactical map canvas
as a static background layer beneath unit tokens. Scope is isolated to a
new SVG terrain layer inside `HexMapDisplay`; it does not modify the
movement system, pathfinder, or any gameplay rules.

## Decisions discovered during execution

### Decision: Density encoded via (type + level), not new enum values

**Choice**: Building level 1/2/3/4 maps to
`light-building` / `medium-building` / `heavy-building` /
`hardened-building` visual keys. Water level 0/1 maps to
`shallow-water`; level >= 2 maps to `deep-water`.

**Rationale**: `TerrainType` uses a single `Building` / `Water` entry
with a numeric `level`. Adding four new enum values would propagate
through the terrain system, movement code, pathfinder, etc. — out of
scope and unnecessary for visual rendering. The `visualKey` is derived,
not a new primary key.

**Discovered during**: Tasks 2.1, 2.3

### Decision: SVG `<symbol>` + `<use>` reuse

**Choice**: Each terrain asset is a homemade SVG file on disk under
`public/sprites/terrain/` AND is embedded as a
`<symbol id="terrain-{key}">` inside `TerrainSymbolDefs`.
`TerrainArtLayer` references via `<use href="#terrain-{key}" />`.

**Rationale**: Satisfies the spec's "homemade asset under
`public/sprites/terrain/`" requirement AND task 9.1's "symbol
references so each asset loads once" performance goal. `<use>` is O(1)
render cost per instance.

**Discovered during**: Tasks 4.2, 9.1, 9.2

### Decision: Elevation shading as a semi-transparent bottom layer

**Choice**: `shadingFor(elevation)` returns an `hsl(0, 0%, L%)` color
where L scales with elevation (±6% per level around a neutral base,
clamped to [-4, +6]). `TerrainArtLayer` renders a shading `<path>`
clipped to the hex at the bottom of the layer stack; base terrain art
sits above at normal opacity.

**Rationale**: Easier to compose than tinting each asset. Supports the
spec's "elevation shading SHALL render bottom" layer rule literally.
Monotonic, colorblind-safe lightness ladder.

**Discovered during**: Tasks 3.1-3.5, 4.3

### Decision: Fallback via missing-symbol detection

**Choice**: `TerrainArtLayer` accepts an optional `missingSymbolIds`
prop (used by tests + runtime error handler). When a symbol ID is
missing, the layer renders a plain `<path>` with the Phase 1 flat
`TERRAIN_COLORS` fill and emits exactly one `console.warn` per key
(warn-once dedup).

**Rationale**: Matches the spec's "Fallback on Asset Load Failure"
requirement. Since symbols are embedded inline, realistic failures only
happen when a symbol ID is missing from the map — still testable by
stubbing.

**Discovered during**: Task 5.4

### Decision: Contour edge derivation from terrainLookup

**Choice**: `TerrainArtLayer` receives the same `terrainLookup` Map the
parent `HexMapDisplay` already maintains. For each of the 6 neighbors
it reads elevation via `elevationLookup`; for each edge where
`|delta| >= 1` it renders a single `<line>` segment along that edge with
thickness `min(delta, 2)`px and color derived from the own-hex lightness
(dark-on-light or light-on-dark for contrast).

**Rationale**: The renderer needs neighbor context anyway for contours.
Reusing the existing `hexNeighbors` util keeps the math consistent with
pathfinding / LOS.

**Discovered during**: Tasks 6.1, 6.2, 6.3

### Decision: Viewport culling deferred to Phase-later work

**Choice**: Task 9.3 ("Skip art rendering for off-screen hexes /
viewport culling") is intentionally deferred.

**Rationale**: `HexMapDisplay` has no hex-level viewport culling today;
adding terrain-layer-only culling would create inconsistent
overlay/token/terrain visibility. Broader hex-level culling is explicit
Phase-later work. The 16ms paint budget (task 9.2) is already met by
`<use>` symbol reuse — per-hex cost stays ~3-5 SVG elements.

**Discovered during**: Task 9.3

### Decision: Accessibility shape signatures baked into each SVG

**Choice**: Each SVG asset uses a distinct shape signature as part of
its illustration — triangular canopy for woods, rectangular outline for
buildings, wave pattern for water, dotted for rough, gridded for
pavement. The shape is visible independent of color (no color-only
encoding). Every `<symbol>` body carries a `data-shape` attribute for
test assertions and a11y audits.

**Rationale**: Satisfies the spec's "Accessibility Shape Signatures"
requirement and survives colorblind simulation.

**Discovered during**: Task 8.1

## Touched surfaces

- `src/utils/terrain/terrainVisualMap.ts` (NEW) — `(type, level) -> visualKey`
- `src/utils/terrain/elevationShading.ts` (NEW) — monotonic HSL ladder
- `src/utils/terrain/contourEdges.ts` (NEW) — neighbor elevation -> contour segments
- `src/components/gameplay/terrain/TerrainArtLayer.tsx` (NEW) — per-hex art layer
- `src/components/gameplay/terrain/TerrainSymbolDefs.tsx` (NEW) — inline `<symbol>` catalog
- `src/components/gameplay/HexMapDisplay/HexMapDisplay.tsx` (MODIFIED) — injects `TerrainSymbolDefs` and threads `terrainLookup` to every `HexCell`
- `src/components/gameplay/HexMapDisplay/HexCell.tsx` (MODIFIED) — renders `TerrainArtLayer` beneath the polygon; polygon becomes `fill="transparent"` when art is present
- `public/sprites/terrain/*.svg` (NEW x12) — homemade, hex-clipped, non-derivative art

## Test coverage

- `src/utils/terrain/__tests__/terrainVisualMap.test.ts`
- `src/utils/terrain/__tests__/elevationShading.test.ts`
- `src/utils/terrain/__tests__/contourEdges.test.ts`
- `src/components/gameplay/terrain/__tests__/TerrainArtLayer.test.tsx`

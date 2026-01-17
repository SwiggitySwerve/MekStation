## Context

The current `ArmorPipLayout.ts` is a direct port of MegaMekLab's `ArmorPipLayout.java`. It distributes pips in horizontal rows within rectangular bounding regions defined by `<rect>` SVG elements. While functional, it has limitations:

1. **Rectangle-only constraint**: Cannot place pips within arbitrary polygon shapes
2. **Grid artifacts**: Row-based placement creates visible horizontal lines
3. **No density variation**: Cannot vary pip spacing within a region
4. **Visual appearance**: Need organized patterns (grid/hexagonal) that fit contours

The refactor introduces **Turf.js grid-based distribution** for organized, evenly-spaced dot patterns within polygon boundaries constructed from rect elements.

## Goals / Non-Goals

**Goals:**
- Generate organized grid patterns (rectangular or hexagonal) within polygon shapes
- Automatic polygon masking using Turf.js built-in features
- Controllable density based on pip count requirements
- Support both rectangular (aligned rows) and hexagonal (staggered/crosshatch) patterns
- Maintain backward compatibility with rectangle-based templates

**Non-Goals:**
- Random/scattered distributions (Poisson disk sampling deprecated for this use case)
- Changing the visual style of existing record sheet templates
- Modifying the interactive armor diagram (uses fill-based visualization)
- Real-time animation of pip placement

## Decisions

### Decision: Use Turf.js Grid Functions

**Why:** Turf.js provides built-in grid generation with automatic polygon masking:
- `@turf/point-grid`: Rectangular grid patterns with even spacing
- `@turf/hex-grid`: Hexagonal/staggered patterns for denser packing
- Both support `mask` option to automatically clip to polygon boundaries

**Packages:**
```bash
npm install @turf/point-grid @turf/hex-grid @turf/helpers @turf/bbox @turf/centroid
```

**Bundle impact:** ~25KB total (modular imports keep it minimal)

### Decision: Build polygon from rect elements

**Why:** MegaMekLab templates encode silhouette shapes through varying-width rect elements stacked vertically. We construct a polygon by:
1. Collecting all rect elements (x, y, width, height)
2. Sorting by Y position
3. Building left edge (min X of each row) and right edge (max X of each row)
4. Connecting into closed polygon

This preserves the contour information already in the templates.

### Decision: Adaptive pattern selection

**Algorithm:**
- **Sparse layouts** (few pips): Use rectangular grid for clean alignment
- **Dense layouts** (many pips): Use hexagonal grid for efficient packing

**Density threshold:** Use hex grid when `pipCount > rows * 3`

### Decision: Keep legacy ArmorPipLayout as fallback

**Why:** Existing rectangle-based templates in mm-data work with the current algorithm. Migration should be incremental, not big-bang.

**Approach:**
- New `PipDistribution` service for grid-based regions
- Legacy `ArmorPipLayout.ts` remains for `<rect>` based templates
- Feature flag toggles between implementations

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bundle size increase (~25KB) | Low | Modular Turf.js imports, tree-shaking |
| Visual inconsistency with MegaMekLab | Medium | Side-by-side comparison before rollout |
| Polygon construction edge cases | Low | Fall back to rect-based rows if polygon fails |
| Grid doesn't fill exact pip count | Medium | Adjust cellSize iteratively until count matches |

## Algorithm Details

### Polygon Construction from Rects

```typescript
function buildPolygonFromRects(rects: RectData[]): number[][] {
  // Sort by Y position
  rects.sort((a, b) => a.y - b.y);
  
  // Build left edge (top to bottom)
  const leftEdge = rects.map(r => [r.x, r.y + r.height / 2]);
  
  // Build right edge (bottom to top)
  const rightEdge = rects.reverse().map(r => [r.x + r.width, r.y + r.height / 2]);
  
  // Close the polygon
  return [...leftEdge, ...rightEdge, leftEdge[0]];
}
```

### Grid Generation with Masking

```typescript
import { pointGrid, hexGrid } from '@turf/turf';

// Rectangular grid (aligned rows)
const rectGrid = pointGrid(bbox, cellSize, {
  units: 'degrees',
  mask: polygon
});

// Hexagonal grid (staggered rows)
const hexes = hexGrid(bbox, cellSize, {
  units: 'degrees', 
  mask: polygon
});
```

### Density Control

To hit exact pip counts:
1. Estimate initial cellSize from `sqrt(area / pipCount)`
2. Generate grid, count points
3. Binary search cellSize until count matches target (±10%)
4. If count low, use smaller cellSize; if high, use larger

## Migration Plan

### Phase 1: New Service Implementation ✅
1. Add npm dependencies (Turf.js grid modules)
2. Create `pipDistribution/` service module
3. Add polygon extraction from rect elements

### Phase 2: Parallel Operation (Current)
1. ✅ Feature flag toggle in Preview toolbar
2. Grid-based distribution implementation
3. Visual QA across mech configurations

### Phase 3: Full Migration
1. Switch default to new algorithm
2. Remove legacy fallback after stabilization

## Pattern Comparison

| Pattern | Function | Best For | Visual |
|---------|----------|----------|--------|
| Rectangular | `pointGrid` | Sparse layouts, clean alignment | ● ● ● ● |
| Hexagonal | `hexGrid` | Dense layouts, natural packing | ● ● ● ● offset |

## Open Questions

1. ~~Should polygon regions be defined in SVG templates or in code?~~
   - **Resolved:** Build from existing rect elements in templates
   
2. ~~Should Lloyd's relaxation be enabled by default?~~
   - **Resolved:** Not needed - grid functions provide uniform spacing
   
3. How to handle extremely narrow regions (e.g., head)?
   - **Recommendation:** Let grid masking handle it; very narrow areas get fewer points naturally

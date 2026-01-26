# Pip Distribution Algorithm Refactor

## Summary

Replace the current row-based `ArmorPipLayout` algorithm (ported from MegaMekLab's Java) with a modern Poisson disk sampling approach for more visually uniform "blue noise" pip distribution within arbitrary polygon boundaries.

## Current Implementation Analysis

### ArmorPipLayout.ts

The existing `ArmorPipLayout.ts` is a direct port of MegaMekLab's `ArmorPipLayout.java`:

**Algorithm characteristics:**
- **Grid-based**: Distributes pips in horizontal rows within rectangular bounding regions
- **Row-by-row placement**: Calculates number of rows, pips per row, and spacing
- **Rectangle-only**: Uses `<rect>` elements to define horizontal bands for pip placement
- **Gap support**: Supports gaps via `mml-gap` style attribute for cut-out regions
- **Multi-section**: Supports splitting pips across multiple sub-groups proportionally

**Limitations:**
1. **Rectangular constraint**: Can only place pips within rectangular regions, not arbitrary polygons
2. **Grid artifacts**: Row-based placement creates visible horizontal lines
3. **No density variation**: Cannot vary pip density within a region
4. **Limited visual appeal**: Regular grid patterns are less organic than blue noise distributions

### Current Usage Contexts

| Context | File | Notes |
|---------|------|-------|
| PDF Record Sheet | `svgRecordSheetRenderer/armor.ts` | Dynamic pip generation for quads/tripods |
| Pre-made Pip SVGs | `/public/data/record-sheets/pips/` | Static SVG files for biped mechs |
| Interactive Armor Diagram | `armor/variants/*.tsx` | Uses different fill-based visualization |

## Proposed Solution

### Primary Approach: Poisson + Turf.js

Based on research, the optimal solution combines:
- **`poisson-disk-sampling`** (~6K weekly npm downloads) - Bridson's O(n) algorithm
- **`@turf/boolean-point-in-polygon`** - Efficient polygon containment tests

This pairing delivers:
- Uniform "blue noise" distribution avoiding visual clustering
- Support for arbitrary polygon shapes
- Variable density control via `distanceFunction`
- Small bundle size (~15KB + ~3KB)

### Alternative: Lloyd's Relaxation for Exact Counts

For cases where exact pip counts are required (armor values):
- Use `d3-delaunay` for Voronoi tessellation
- Apply Lloyd's relaxation to iteratively improve distribution
- Start with random points, converge toward uniform spacing

### Hybrid Approach (Recommended)

1. **Poisson sampling** generates candidate points with minimum spacing
2. **Post-filtering** removes points outside polygon boundary
3. **Count adjustment** adds/removes points to match exact armor value
4. **Lloyd's relaxation** (optional) refines positions for visual uniformity

## Technical Design

### New Dependencies

```json
{
  "dependencies": {
    "poisson-disk-sampling": "^2.3.1",
    "@turf/boolean-point-in-polygon": "^7.2.0",
    "@turf/bbox": "^7.2.0"
  },
  "devDependencies": {
    "@types/poisson-disk-sampling": "^2.2.0"
  }
}
```

Estimated bundle impact: ~18KB minified (acceptable for PDF generation service)

### Core Interface

```typescript
// src/services/printing/PipDistribution.ts

export interface PolygonRegion {
  /** Unique identifier for the region */
  id: string;
  /** Polygon vertices as [x, y] coordinate pairs (closed ring) */
  vertices: [number, number][];
  /** Optional cut-out regions (holes in the polygon) */
  holes?: [number, number][][];
}

export interface PipDistributionOptions {
  /** Target number of pips (exact count required) */
  targetCount: number;
  /** Minimum distance between pip centers */
  minDistance?: number;
  /** Maximum distance between pip centers (for variable density) */
  maxDistance?: number;
  /** Pip radius for rendering */
  pipRadius?: number;
  /** Optional density function for variable spacing */
  densityFunction?: (point: [number, number]) => number;
  /** Number of Lloyd's relaxation iterations (0 = disabled) */
  relaxationIterations?: number;
  /** Maximum attempts to achieve exact count */
  maxAttempts?: number;
}

export interface DistributedPips {
  /** Final pip positions */
  positions: [number, number][];
  /** Actual count achieved */
  count: number;
  /** Whether exact target was achieved */
  exactMatch: boolean;
  /** Computed optimal pip radius */
  pipRadius: number;
  /** Bounding box of the region */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export function distributePips(
  region: PolygonRegion,
  options: PipDistributionOptions
): DistributedPips;
```

### Algorithm Implementation

```typescript
import PoissonDiskSampling from 'poisson-disk-sampling';
import { booleanPointInPolygon, polygon, bbox } from '@turf/turf';

export function distributePips(
  region: PolygonRegion,
  options: PipDistributionOptions
): DistributedPips {
  const {
    targetCount,
    minDistance,
    maxDistance,
    relaxationIterations = 10,
    maxAttempts = 5,
  } = options;

  // Create Turf polygon for containment tests
  const poly = polygon([region.vertices, ...(region.holes || [])]);
  const bounds = bbox(poly);
  const width = bounds[2] - bounds[0];
  const height = bounds[3] - bounds[1];

  // Estimate initial pip spacing based on target count and area
  const polygonArea = calculatePolygonArea(region.vertices);
  const estimatedSpacing = Math.sqrt(polygonArea / targetCount) * 0.85;
  
  let bestResult: DistributedPips | null = null;
  let currentSpacing = minDistance ?? estimatedSpacing;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate Poisson samples
    const pds = new PoissonDiskSampling({
      shape: [width, height],
      minDistance: currentSpacing,
      maxDistance: maxDistance ?? currentSpacing * 1.5,
      tries: 30,
    });

    // Filter to polygon boundary
    const rawPoints = pds.fill();
    const points = rawPoints
      .map(([x, y]): [number, number] => [x + bounds[0], y + bounds[1]])
      .filter(point => booleanPointInPolygon(point, poly));

    // Adjust count if needed
    const adjustedPoints = adjustPointCount(points, targetCount, poly, currentSpacing);

    // Apply Lloyd's relaxation for better uniformity
    const relaxedPoints = relaxationIterations > 0
      ? applyLloydRelaxation(adjustedPoints, poly, relaxationIterations)
      : adjustedPoints;

    const result: DistributedPips = {
      positions: relaxedPoints,
      count: relaxedPoints.length,
      exactMatch: relaxedPoints.length === targetCount,
      pipRadius: currentSpacing * 0.4,
      bounds: { minX: bounds[0], minY: bounds[1], maxX: bounds[2], maxY: bounds[3] },
    };

    if (result.exactMatch) {
      return result;
    }

    // Track best result
    if (!bestResult || 
        Math.abs(result.count - targetCount) < Math.abs(bestResult.count - targetCount)) {
      bestResult = result;
    }

    // Adjust spacing for next attempt
    if (points.length < targetCount) {
      currentSpacing *= 0.9; // Too few points, pack tighter
    } else {
      currentSpacing *= 1.1; // Too many points, spread out
    }
  }

  return bestResult!;
}
```

### Count Adjustment Strategy

```typescript
function adjustPointCount(
  points: [number, number][],
  targetCount: number,
  poly: Feature<Polygon>,
  spacing: number
): [number, number][] {
  if (points.length === targetCount) {
    return points;
  }

  if (points.length > targetCount) {
    // Remove points furthest from centroid (least central)
    const centroid = calculateCentroid(points);
    return points
      .map(p => ({ point: p, dist: distance(p, centroid) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, targetCount)
      .map(p => p.point);
  }

  // Need more points - add at maximum distance from existing points
  const result = [...points];
  const bounds = bbox(poly);
  
  while (result.length < targetCount) {
    let bestCandidate: [number, number] | null = null;
    let bestMinDist = 0;

    // Sample random candidates and pick the one furthest from existing points
    for (let i = 0; i < 100; i++) {
      const candidate: [number, number] = [
        bounds[0] + Math.random() * (bounds[2] - bounds[0]),
        bounds[1] + Math.random() * (bounds[3] - bounds[1]),
      ];

      if (!booleanPointInPolygon(candidate, poly)) continue;

      const minDist = Math.min(...result.map(p => distance(candidate, p)));
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate) {
      result.push(bestCandidate);
    } else {
      break; // Can't find valid candidate
    }
  }

  return result;
}
```

### SVG Integration

```typescript
// Integration with existing ArmorPipLayout pattern

export function addPolygonPips(
  svgDoc: Document,
  group: Element,
  region: PolygonRegion,
  pipCount: number,
  options: Partial<PipDistributionOptions & { fill?: string; strokeWidth?: number }> = {}
): void {
  if (pipCount <= 0) return;

  const { fill = '#FFFFFF', strokeWidth = 0.5, ...distOptions } = options;
  
  const result = distributePips(region, {
    targetCount: pipCount,
    ...distOptions,
  });

  for (const [x, y] of result.positions) {
    const pip = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pip.setAttribute('cx', String(x));
    pip.setAttribute('cy', String(y));
    pip.setAttribute('r', String(result.pipRadius));
    pip.setAttribute('fill', fill);
    pip.setAttribute('stroke', '#000000');
    pip.setAttribute('stroke-width', String(strokeWidth));
    group.appendChild(pip);
  }
}
```

## Migration Strategy

### Phase 1: New Service Implementation
1. Add dependencies (`poisson-disk-sampling`, `@turf/boolean-point-in-polygon`)
2. Create `PipDistribution.ts` service with full test coverage
3. Add polygon extraction utilities for existing SVG templates

### Phase 2: Parallel Operation
1. Add feature flag for new algorithm
2. Run both algorithms in parallel for comparison
3. Visual QA of pip distributions across all mech types

### Phase 3: Template Enhancement
1. Update SVG templates with polygon regions (replacing rectangles)
2. Define polygon shapes for all body parts across mech types
3. Add support for complex regions (legs with knee joints, etc.)

### Phase 4: Full Migration
1. Switch default to new algorithm
2. Deprecate `ArmorPipLayout` (keep for fallback)
3. Remove rectangle-based template regions

## File Structure

```
src/services/printing/
├── pipDistribution/
│   ├── index.ts                    # Public exports
│   ├── PoissonDistributor.ts       # Core Poisson sampling
│   ├── LloydRelaxation.ts          # Optional refinement
│   ├── PolygonUtils.ts             # Area, centroid, containment
│   ├── CountAdjustment.ts          # Exact count matching
│   └── types.ts                    # Interfaces
├── ArmorPipLayout.ts               # Legacy (keep for reference)
└── svgRecordSheetRenderer/
    └── armor.ts                    # Updated to use new service
```

## Testing Strategy

### Unit Tests
- Poisson distribution uniformity metrics
- Polygon containment accuracy
- Exact count achievement rate
- Lloyd's relaxation convergence
- Edge cases (single pip, max pips, narrow regions)

### Visual Regression Tests
- Compare pip distributions across all mech types
- Verify no pips outside polygon boundaries
- Check spacing uniformity visually

### Performance Tests
- Benchmark against current implementation
- Test with max armor values (307 points CT)
- Measure bundle size impact

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bundle size increase | Medium | Tree-shake Turf.js modules, lazy load for PDF |
| Performance regression | Low | Poisson is O(n), faster than current |
| Visual inconsistency | Medium | Side-by-side comparison before rollout |
| Exact count failure | Low | Hybrid approach guarantees count matching |

## Success Criteria

1. **Visual Quality**: Pip distributions pass visual QA for all mech types
2. **Exact Counts**: 100% of armor values produce exact pip counts
3. **Performance**: No regression in PDF generation time
4. **Bundle Size**: Total increase < 25KB gzipped
5. **Test Coverage**: > 90% coverage for new service

## Timeline Estimate

- Phase 1: Core implementation + tests
- Phase 2: Integration + parallel testing
- Phase 3: Template updates
- Phase 4: Migration + cleanup

## References

- [poisson-disk-sampling](https://github.com/kchapelier/poisson-disk-sampling)
- [Turf.js](https://turfjs.org/)
- [d3-delaunay](https://github.com/d3/d3-delaunay)
- [Bridson's Algorithm Paper](https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph07-poissondisk.pdf)
- [Lloyd's Relaxation](https://en.wikipedia.org/wiki/Lloyd%27s_algorithm)

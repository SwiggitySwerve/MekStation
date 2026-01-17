## Context

The current `ArmorPipLayout.ts` is a direct port of MegaMekLab's `ArmorPipLayout.java`. It distributes pips in horizontal rows within rectangular bounding regions defined by `<rect>` SVG elements. While functional, it has limitations:

1. **Rectangle-only constraint**: Cannot place pips within arbitrary polygon shapes
2. **Grid artifacts**: Row-based placement creates visible horizontal lines
3. **No density variation**: Cannot vary pip spacing within a region
4. **Limited visual appeal**: Regular grid patterns are less organic than blue noise

The refactor introduces Poisson disk sampling for visually superior "blue noise" distributions within arbitrary polygon boundaries.

## Goals / Non-Goals

**Goals:**
- Implement Poisson disk sampling for uniform point distribution
- Support arbitrary polygon boundaries (not just rectangles)
- Guarantee exact pip counts matching armor values
- Maintain backward compatibility with rectangle-based templates
- Enable variable density control for future enhancements

**Non-Goals:**
- Changing the visual style of existing record sheet templates
- Modifying the interactive armor diagram (uses fill-based visualization)
- Changing pip rendering style (circles remain circles)
- Real-time animation of pip placement

## Decisions

### Decision: Use `poisson-disk-sampling` + `@turf/boolean-point-in-polygon`

**Why:** This pairing is the most battle-tested solution (~6K weekly npm downloads for poisson-disk-sampling). Bridson's O(n) algorithm is efficient, and Turf.js provides reliable polygon containment tests with minimal bundle overhead.

**Alternatives considered:**
- `@thi.ng/poisson`: Native TypeScript but requires companion packages (KdTree), higher setup complexity
- Custom implementation: Would take longer and be less tested than established libraries
- `d3-delaunay` only: Better for exact counts but doesn't provide the blue noise quality of Poisson

### Decision: Hybrid approach for exact counts

**Why:** Pure Poisson sampling determines point count based on spacing, not target count. Armor values require exact pip counts.

**Algorithm:**
1. Poisson sampling generates candidate points with minimum spacing
2. Post-filtering removes points outside polygon boundary  
3. Count adjustment adds/removes points to match exact armor value
4. Lloyd's relaxation (optional) refines positions for visual uniformity

### Decision: Keep legacy ArmorPipLayout as fallback

**Why:** Existing rectangle-based templates in mm-data work with the current algorithm. Migration should be incremental, not big-bang.

**Approach:**
- New `PipDistribution` service for polygon-based regions
- Legacy `ArmorPipLayout.ts` remains for `<rect>` based templates
- Template detection determines which algorithm to use

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bundle size increase (~18KB) | Medium | Tree-shake Turf.js modules, lazy load for PDF generation |
| Visual inconsistency with MegaMekLab | Medium | Side-by-side comparison before rollout |
| Exact count failure for edge cases | Low | Hybrid approach with count adjustment guarantees matching |
| Performance regression | Low | Poisson is O(n), likely faster than current row iteration |

## Migration Plan

### Phase 1: New Service Implementation
1. Add npm dependencies
2. Create `pipDistribution/` service module with full test coverage
3. Add polygon extraction utilities

### Phase 2: Parallel Operation  
1. Add feature flag for new algorithm
2. Run both algorithms for visual comparison
3. Visual QA across all mech configurations

### Phase 3: Template Enhancement
1. Define polygon regions for body parts (replacing rectangles)
2. Update SVG templates with polygon markers
3. Test with all mech types (biped, quad, tripod, LAM, quadvee)

### Phase 4: Full Migration
1. Switch default to new algorithm
2. Deprecate rectangle-based approach
3. Remove legacy code after stabilization period

## Open Questions

1. Should polygon regions be defined in SVG templates or in code?
   - **Recommendation:** Start with code-defined polygons, migrate to SVG markers if templates are updated
   
2. Should Lloyd's relaxation be enabled by default?
   - **Recommendation:** Start with 10 iterations, make configurable for performance tuning

3. How to handle extremely narrow regions (e.g., head)?
   - **Recommendation:** Fall back to single-row placement for regions where Poisson fails

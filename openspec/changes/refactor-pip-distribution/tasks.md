## 1. Dependencies and Setup

- [x] 1.1 Add `poisson-disk-sampling` dependency
- [x] 1.2 Add `@turf/boolean-point-in-polygon` dependency
- [x] 1.3 Add `@turf/bbox` dependency
- [x] 1.4 Add `@types/poisson-disk-sampling` dev dependency
- [x] 1.5 Verify bundle size impact with `npm run build:analyze`

## 2. Core Service Implementation

- [x] 2.1 Create `src/services/printing/pipDistribution/types.ts` with interfaces
- [x] 2.2 Create `src/services/printing/pipDistribution/PolygonUtils.ts` (area, centroid, distance)
- [x] 2.3 Create `src/services/printing/pipDistribution/PoissonDistributor.ts` (core sampling)
- [x] 2.4 Create `src/services/printing/pipDistribution/CountAdjustment.ts` (exact count matching)
- [x] 2.5 Create `src/services/printing/pipDistribution/LloydRelaxation.ts` (optional refinement)
- [x] 2.6 Create `src/services/printing/pipDistribution/index.ts` (public exports)

## 3. Unit Tests

- [x] 3.1 Test Poisson distribution generates points within bounds
- [x] 3.2 Test polygon containment filtering
- [x] 3.3 Test exact count adjustment (add points)
- [x] 3.4 Test exact count adjustment (remove points)
- [x] 3.5 Test Lloyd's relaxation improves uniformity
- [x] 3.6 Test edge cases: single pip, max pips, narrow regions
- [x] 3.7 Test polygon area and centroid calculations

## 4. Integration

- [x] 4.1 Add `addPolygonPips()` function for SVG integration
- [x] 4.2 Define polygon regions for biped mech body parts
- [x] 4.3 Update `svgRecordSheetRenderer/armor.ts` to use new service
- [x] 4.4 Add feature flag `usePoissonPipDistribution` in app settings store
- [x] 4.5 Ensure fallback to legacy `ArmorPipLayout` for rectangle templates

## 5. Visual QA and Validation

- [ ] 5.1 Generate comparison renders: legacy vs Poisson for biped
- [ ] 5.2 Generate comparison renders for quad configuration
- [ ] 5.3 Generate comparison renders for tripod configuration
- [x] 5.4 Verify exact pip counts match armor values across all test cases
- [x] 5.5 Verify no pips render outside polygon boundaries

## 6. Documentation and Cleanup

- [x] 6.1 Update `docs/plans/2026-01-16-pip-distribution-refactor.md` with implementation notes
- [x] 6.2 Add JSDoc comments to all public functions
- [x] 6.3 Run `npm run verify` to confirm build passes

---

**Phase 1 Complete**: Core service implemented with 46 unit tests passing.
**Phase 2 Complete**: Feature flag added, armor.ts integrated with conditional algorithm selection.

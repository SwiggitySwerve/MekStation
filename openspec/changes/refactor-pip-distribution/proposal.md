# Change: Refactor Pip Distribution to Poisson Disk Sampling

## Why

The current `ArmorPipLayout` algorithm (ported from MegaMekLab's Java) uses row-based grid placement within rectangular bounding regions. This produces visible horizontal line artifacts and cannot handle arbitrary polygon shapes. Modern Poisson disk sampling produces superior "blue noise" distributions with uniform spacing that looks more organic and professional.

## What Changes

- **MODIFIED** `ArmorPipLayout Algorithm` requirement to support polygon-based regions and Poisson disk sampling
- **ADDED** `PolygonPipDistribution` requirement for the new distribution algorithm
- Add new dependencies: `poisson-disk-sampling`, `@turf/boolean-point-in-polygon`, `@turf/bbox`
- Create `src/services/printing/pipDistribution/` service module
- Keep legacy `ArmorPipLayout.ts` as fallback for rectangle-based templates

## Impact

- Affected specs: `record-sheet-export`
- Affected code:
  - `src/services/printing/ArmorPipLayout.ts` (legacy, keep as fallback)
  - `src/services/printing/pipDistribution/` (new)
  - `src/services/printing/svgRecordSheetRenderer/armor.ts` (integration)
- Bundle size: ~18KB increase (Poisson + Turf modules)
- No breaking changes (new algorithm is opt-in, fallback to legacy)

## Success Criteria

1. Pip distributions pass visual QA for all mech configurations
2. 100% of armor values produce exact pip counts
3. No performance regression in PDF generation time
4. Bundle size increase < 25KB gzipped
5. Test coverage > 90% for new service

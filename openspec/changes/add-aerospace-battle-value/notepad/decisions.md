# Decisions Log

## [2026-04-18] Sub-type dispatch lives at caller, not in barrel

**Choice**: `battleValueCalculations.ts` stays a pure re-export barrel. Aerospace dispatch happens at each caller site (`AerospaceStatusBar.tsx`, `scripts/validate-aerospace-bv.ts`) by directly invoking `calculateAerospaceBV(input)`.
**Rationale**: Mech/vehicle/aerospace are separate unit families with non-overlapping input shapes. A polymorphic dispatcher in the barrel would force an `IBaseUnit | IAerospaceUnit | IVehicleUnit` union that caller-side code can't refine without a discriminator check that duplicates the routing logic. Direct calls from the already-typed context (`useAerospaceStore`) keep types tight and avoid a central switch that has to grow with every future unit type.
**Discovered during**: Tasks 1.3 (Wire dispatch), 8.1 (Status bar wiring), 9.1 (Harness loader)

## [2026-04-18] Single-module aerospaceBV.ts instead of four-file split

**Choice**: All aerospace BV logic lives in one ~580-line module (`src/utils/construction/aerospace/aerospaceBV.ts`) with named exports (`calculateAerospaceDefensiveBV`, `calculateAerospaceOffensiveBV`, `calculateAerospaceArcContributions`, `calculateAerospaceSpeedFactor`, etc.). Did not mirror the mech structure of defensive/offensive/totals/pilot as four files.
**Rationale**: Aerospace BV is conceptually tighter than mech BV (no heat-tracking loop, no physical weapons, no front/rear switching). Splitting it up would have introduced ~4 files with <150 lines each and a lot of repeated input-type plumbing. The barrel-style single module keeps the formula readable end-to-end.
**Discovered during**: Tasks 1.1, 2.x, 3.x, 4.x, 5.x, 6.x

## [2026-04-18] Aerospace MUL BV data deferred

**Choice**: Parity harness (`scripts/validate-aerospace-bv.ts`) emits `mulBV: null` and `deltaPct: null` for every fighter until an aerospace MUL extract is seeded. `computedBV` is still reported for every unit.
**Rationale**: `mul-bv-cache.json` currently contains mech-only data, and BLK files for aerospace units do not embed BV blocks. Building a MUL scraper is out of scope for this change — that's a data-seeding task, not an aerospace BV task. The spec's Validator-Output scenario is satisfied (report is emitted with the required fields; MUL slots carry null sentinels).
**Impact**: Task 9.4 (parity target ≥90%/5%, ≥75%/1%) remains unchecked. Future work.
**Discovered during**: Task 9.2 (MUL comparison)

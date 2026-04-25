# Decisions — add-vehicle-construction

Running log of decisions, deferrals, and rationale for tasks that could not
land cleanly in this Tier 4 closeout. Each entry is dated with an ISO-8601
date and a phase tag.

---

## [2026-04-25 apply] Wave 4 closeout — actionable tasks

The construction core (sections 3, 4, 6, 7, 8, 9) was already implemented
on `main` ahead of this Tier 4 closeout pass — `src/utils/construction/vehicle/`
ships engine/structure/armor/turret/crew/power-amp/equipment-mount/
validation calculators with 88 passing tests in
`src/__tests__/unit/vehicle-construction.test.ts` and
`src/utils/construction/vehicle/__tests__/vehicleBV.test.ts`. The Wave 4
closeout pass:

1. Audited the 16 open tasks against the implementation surface.
2. Confirmed the open type tasks (1.1–1.5) were satisfied by
   `IGroundUnit`-extension on `IVehicle`/`IVTOL`/`ISupportVehicle`
   (src/types/unit/VehicleInterfaces.ts) plus the store-side armor allocation
   interfaces in src/stores/vehicleState.ts. Marked `[x]` with file:line
   citations rather than re-litigating type names.
3. Confirmed motion-type tonnage rules (2.1–2.5) are enforced by the
   `MOTION_TYPE_MAX_TONNAGE` table + `VAL-VEHICLE-TONNAGE` rule, with the
   VTOL ↔ ground transition handled in `setMotionTypeLogic` (armor
   allocation reset, `unitType` flip, turret eligibility re-validated).
4. Confirmed the integration test (10.4) is realised by
   `validateVehicleConstruction(manticoreInput())` end-to-end at
   `src/__tests__/unit/vehicle-construction.test.ts:315-321`.
5. Spec validation (11.1) passes `--strict`.

Deferrals (4 of 16) are documented below.

---

## [2026-04-25 apply] Task 2.2 — non-destructive tonnage clamp deferred

**Choice**: Tonnage clamping on motion-type change is enforced **reactively**
through the validation pipeline (`VAL-VEHICLE-TONNAGE` at
`src/utils/construction/vehicle/vehicleValidation.ts:140-152`) rather than
proactively in `setMotionTypeLogic`. The store currently allows
`Hover → 80t` and lets the validation rule surface the error so the
customizer can prompt the user.
**Rationale**: Silent data loss is worse than a flagged error. A real
clamping pass needs UX-driven confirmation ("Switching to Hover will reduce
your vehicle from 80t to 50t — confirm?") and a re-derivation of armor /
equipment / engine-rating that exceeds the construction-core scope. The
spec's behavioural contract is met (the violation **is** caught and
reported). Proper UX-side clamping is queued for Wave 5 (`add-vehicle-customizer-uX-pass`).
**Pickup**: `src/stores/useVehicleStore.actions.ts:71-97` — wrap
`setMotionType` with a confirmation flow + cascade re-derivation.

## [2026-04-25 apply] Task 5.5 — Body BAR-≥6 gating deferred

**Choice**: The Body location is currently mapped to `0` in
`clampLocationArmor` (src/utils/construction/vehicle/armor.ts:164) for both
combat and support vehicles. Support-vehicle Body-armor allocation gated by
BAR ≥ 6 is **not** wired; users on a BAR-7 support vehicle cannot allocate
to Body via the standard clamping path.
**Rationale**: The base support-vehicle BAR table (5.4) is implemented and
the spec's `Support vehicle BAR armor` scenario passes via
`getBarPointsPerTon` + `computeSupportVehicleArmorWeight`. Body-armor gating
belongs to the support-vehicle customizer surface — different location list,
different tab UI, different cargo-bay model. Pulling it into
`clampLocationArmor` now would either (a) silently let combat vehicles
allocate Body armor or (b) require the function to know the unit's
sub-type, which leaks support-vehicle context across the construction
core.
**Pickup**: `src/utils/construction/vehicle/armor.ts:164` —
add a `unitSubtype` parameter to `clampLocationArmor` or extract a
`clampSupportLocationArmor` variant in Wave 5 (`add-support-vehicle-construction`).

## [2026-04-25 apply] Task 8.5 — omni-vehicle pod-mounted equipment deferred

**Choice**: The mounting pipeline (src/utils/construction/vehicle/equipmentMounts.ts)
treats all mounted equipment as fixed. There is no `isPodMounted` flag, no
omni-pod weight-split, no fixed-equipment validation.
**Rationale**: Omni-vehicles are a distinct construction surface that
mirrors omni-mech rules (fixed pod weight + variable pod equipment +
configuration-swap UX) and belongs alongside the omni-mech parity work in
Wave 5. The base mounting pipeline ships in this change unchanged for
fixed-equipment vehicles; omni support is purely additive.
**Pickup**: `src/types/unit/VehicleInterfaces.ts:50-67`
(`IVehicleMountedEquipment` add `isPodMounted?: boolean`),
`src/utils/construction/vehicle/equipmentMounts.ts` (omni weight-split
rule), and a new `validateOmniVehicleConfig` step in the validation
pipeline.

## [2026-04-25 apply] Task 11.3 — Demolisher / Support Truck fixtures deferred

**Choice**: Three named fixtures (Manticore 50t tracked, Savannah Master 5t
hover, VTOL Warrior 4t VTOL) ship in
`src/__tests__/unit/vehicle-construction.test.ts:41-131` and exercise the
entire pipeline. Demolisher (assault-tonnage tracked) and Support Truck
(BAR-rated support vehicle) are **not** in the fixture set.
**Rationale**: The three named fixtures already cover every code path the
calculators expose — light/medium hover, mid-tonnage tracked, VTOL with
chin turret. A Demolisher fixture would re-exercise the same `validateVehicleConstruction`
input shape with bigger numbers; a Support Truck fixture needs the
support-vehicle customizer end-to-end (pulled to Wave 5 by Task 5.5
deferral). The right home for these is a real-units BLK round-trip harness
(`scripts/validate-vehicle-bv.ts`) once support-vehicle handler enrichment
lands.
**Pickup**: `scripts/validate-vehicle-bv.ts` — extend the harness to
load Demolisher / Hetzer / Goblin BLKs from the MM data drop and assert
zero `VAL-VEHICLE-*` errors per unit.

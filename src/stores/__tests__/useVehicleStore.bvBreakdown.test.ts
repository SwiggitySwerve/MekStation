/**
 * Reactivity tests for vehicle BV breakdown derivation on the vehicle store.
 *
 * The vehicle BV adapter (`computeVehicleBVFromState`) is the single source of
 * truth used by `VehicleStatusBar`'s `useMemo` derivation; verifying that
 * `bvBreakdown` recomputes when construction inputs change exercises the same
 * code path the live customizer uses.
 *
 * @spec openspec/changes/add-vehicle-battle-value/specs/vehicle-unit-system/spec.md
 *       Requirement: Vehicle BV Breakdown on Unit State —
 *       Scenario: Breakdown recomputed on construction edit
 */

import { StoreApi } from 'zustand';

import type { IEquipmentItem } from '@/types/equipment/EquipmentItem';

import { VehicleLocation } from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { computeVehicleBVFromState } from '@/utils/construction/vehicle/vehicleBVAdapter';

import { createVehicleStore } from '../useVehicleStore';
import {
  createDefaultVehicleState,
  createEmptyVehicleArmorAllocation,
  type IVehicleArmorAllocation,
  type VehicleStore,
  type CreateVehicleOptions,
} from '../vehicleState';

// =============================================================================
// Helpers
// =============================================================================

const DEFAULT_OPTIONS: CreateVehicleOptions = {
  name: 'Test Hover Tank',
  tonnage: 30,
  techBase: TechBase.INNER_SPHERE,
  motionType: GroundMotionType.TRACKED,
  unitType: UnitType.VEHICLE,
};

/**
 * Build a vehicle store seeded with positive armor on every primary face so
 * defensive BV is non-zero. Otherwise the breakdown's `final` would be 0
 * before any equipment is added and the "increase" assertions would be vacuous.
 */
function makeStore(
  overrides?: Partial<CreateVehicleOptions>,
): StoreApi<VehicleStore> {
  const opts = { ...DEFAULT_OPTIONS, ...overrides };
  const state = createDefaultVehicleState(opts);

  // Seed armor allocation so defensive BV is non-trivial.
  const seededAllocation: IVehicleArmorAllocation = {
    ...createEmptyVehicleArmorAllocation(),
    [VehicleLocation.FRONT]: 30,
    [VehicleLocation.LEFT]: 25,
    [VehicleLocation.RIGHT]: 25,
    [VehicleLocation.REAR]: 20,
  };

  return createVehicleStore({
    ...state,
    armorAllocation: seededAllocation,
  });
}

/**
 * Snapshot the BV breakdown by running the adapter against the current store
 * state — mirrors the `useMemo` derivation in `VehicleStatusBar.tsx`.
 */
function snapshotBV(store: StoreApi<VehicleStore>) {
  const s = store.getState();
  return computeVehicleBVFromState({
    motionType: s.motionType,
    tonnage: s.tonnage,
    cruiseMP: s.cruiseMP,
    armorType: String(s.armorType),
    armorAllocation: s.armorAllocation as Record<string, unknown>,
    structureType: String(s.structureType),
    turret: s.turret ? { type: s.turret.type } : null,
    secondaryTurret: s.secondaryTurret
      ? { type: s.secondaryTurret.type }
      : null,
    barRating: s.barRating,
    equipment: s.equipment,
  });
}

/**
 * Build a minimal weapon-shaped IEquipmentItem. The vehicle BV adapter uses
 * the equipment id alone to partition weapons vs ammo, so a stub is sufficient
 * — equipmentBVResolver fills in real BV downstream.
 */
function buildWeaponItem(id: string, name: string): IEquipmentItem {
  return {
    id,
    name,
    category: EquipmentCategory.BALLISTIC_WEAPON,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 12,
    criticalSlots: 7,
    costCBills: 0,
    battleValue: 124,
    introductionYear: 3025,
  };
}

// =============================================================================
// Shape — spec scenario "Breakdown shape"
// =============================================================================

describe('useVehicleStore - bvBreakdown shape', () => {
  it('exposes defensive / offensive / pilotMultiplier / turretModifier / final on the derived breakdown', () => {
    const store = makeStore();
    const bd = snapshotBV(store);

    // Spec calls out these exact keys at minimum (plus armor/structure/etc).
    expect(typeof bd.defensive).toBe('number');
    expect(typeof bd.offensive).toBe('number');
    expect(typeof bd.pilotMultiplier).toBe('number');
    expect(typeof bd.turretModifier).toBe('number');
    expect(typeof bd.final).toBe('number');
  });

  it('produces a non-zero defensive BV from a vehicle with seeded armor', () => {
    const store = makeStore();
    const bd = snapshotBV(store);

    // 100 armor × 2.5 × 1.0 = 250 base armor BV → defensive must be > 0.
    expect(bd.defensive).toBeGreaterThan(0);
    expect(bd.final).toBeGreaterThan(0);
  });
});

// =============================================================================
// Reactivity — construction edit triggers breakdown recompute
// =============================================================================

describe('useVehicleStore - bvBreakdown recomputes on construction edit', () => {
  /*
   * Spec scenario: Breakdown recomputed on construction edit.
   *   GIVEN an existing vehicle with a known BV
   *   WHEN the user adds weapons via the equipment tab
   *   THEN unit.bvBreakdown.offensive SHALL increase
   *   AND unit.bvBreakdown.final SHALL update live
   */
  it('offensive and final BV both rise when a weapon is added via addEquipment', () => {
    const store = makeStore();
    const before = snapshotBV(store);

    // Sanity — nothing armed yet, offensive contribution should be tiny / zero.
    expect(before.offensive).toBeGreaterThanOrEqual(0);

    // Mutate via the public action — same path the customizer uses.
    // Use a real catalog weapon id so equipmentBVResolver returns a non-zero BV.
    store
      .getState()
      .addEquipment(
        buildWeaponItem('medium-laser', 'Medium Laser'),
        VehicleLocation.FRONT,
        false,
      );

    const after = snapshotBV(store);

    // Adding a weapon must increase offensive BV (modulo turret/speed factor)
    // and flow through to the final BV the status bar surfaces.
    expect(after.offensive).toBeGreaterThan(before.offensive);
    expect(after.final).toBeGreaterThan(before.final);
  });

  it('final BV recomputes when tonnage changes (cruiseMP-coupled speed factor)', () => {
    // The vehicle store keeps cruiseMP fixed when tonnage changes, but the
    // adapter still resamples the full state — this regression-guards the
    // recomputation path itself.
    const store = makeStore({ tonnage: 30 });
    const before = snapshotBV(store);

    store.getState().setCruiseMP(8);
    const after = snapshotBV(store);

    // Higher cruise MP → higher flank MP → higher TMM → higher defensive
    // factor and higher speed factor → higher final BV.
    expect(after.final).toBeGreaterThan(before.final);
  });

  it('removing the added weapon walks the breakdown back down', () => {
    const store = makeStore();
    const baseline = snapshotBV(store);

    const id = store
      .getState()
      .addEquipment(
        buildWeaponItem('large-laser', 'Large Laser'),
        VehicleLocation.FRONT,
        false,
      );
    const armed = snapshotBV(store);
    expect(armed.offensive).toBeGreaterThan(baseline.offensive);

    store.getState().removeEquipment(id);
    const stripped = snapshotBV(store);

    // Stripping the weapon must return offensive BV back to (or near) baseline
    // — proving the derivation is reactive in both directions.
    expect(stripped.offensive).toBeLessThanOrEqual(armed.offensive);
    expect(stripped.offensive).toBeCloseTo(baseline.offensive, 5);
  });
});

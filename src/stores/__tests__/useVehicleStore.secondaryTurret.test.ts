/**
 * Unit tests for the secondary turret plumbing.
 *
 * Covers:
 *   - getTotalVehicleArmor 1-arg / 2-arg / 3-arg backwards compatibility
 *   - setHasSecondaryTurret toggling (initialize + zero TURRET_2 on disable)
 *   - setSecondaryTurretType (no-op when disabled, TurretType.NONE disables)
 *
 * @spec docs/audits/2026-05-13-customizer-armor-megameklab-parity.md (lines 192-210)
 */

import { VehicleLocation } from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import type { VehicleStore } from '../vehicleState';

import {
  setHasSecondaryTurretLogic,
  setSecondaryTurretTypeLogic,
} from '../useVehicleStore.actions';
import {
  createEmptyVehicleArmorAllocation,
  getTotalVehicleArmor,
} from '../vehicleState';

function makeState(overrides: Partial<VehicleStore> = {}): VehicleStore {
  return {
    motionType: GroundMotionType.TRACKED,
    tonnage: 50,
    armorTonnage: 5,
    turret: null,
    secondaryTurret: null,
    armorAllocation: createEmptyVehicleArmorAllocation(),
    isModified: false,
    lastModifiedAt: 0,
    ...overrides,
  } as unknown as VehicleStore;
}

describe('getTotalVehicleArmor — secondary turret signature', () => {
  it('1-arg form (legacy callers) returns base armor only', () => {
    const allocation = {
      ...createEmptyVehicleArmorAllocation(),
      [VehicleLocation.FRONT]: 10,
      [VehicleLocation.LEFT]: 5,
      [VehicleLocation.RIGHT]: 5,
      [VehicleLocation.REAR]: 5,
      [VehicleLocation.TURRET]: 8,
      [VehicleLocation.TURRET_2]: 4,
    };
    // No flags passed → both turrets excluded.
    expect(getTotalVehicleArmor(allocation)).toBe(10 + 5 + 5 + 5);
  });

  it('2-arg form (legacy callers) returns base + primary turret only', () => {
    const allocation = {
      ...createEmptyVehicleArmorAllocation(),
      [VehicleLocation.FRONT]: 10,
      [VehicleLocation.LEFT]: 5,
      [VehicleLocation.RIGHT]: 5,
      [VehicleLocation.REAR]: 5,
      [VehicleLocation.TURRET]: 8,
      [VehicleLocation.TURRET_2]: 4,
    };
    // hasTurret=true; hasSecondaryTurret defaults to false → TURRET_2 excluded.
    expect(getTotalVehicleArmor(allocation, true)).toBe(10 + 5 + 5 + 5 + 8);
  });

  it('3-arg form includes TURRET_2 when hasSecondaryTurret is true', () => {
    const allocation = {
      ...createEmptyVehicleArmorAllocation(),
      [VehicleLocation.FRONT]: 10,
      [VehicleLocation.LEFT]: 5,
      [VehicleLocation.RIGHT]: 5,
      [VehicleLocation.REAR]: 5,
      [VehicleLocation.TURRET]: 8,
      [VehicleLocation.TURRET_2]: 6,
    };
    expect(getTotalVehicleArmor(allocation, true, true)).toBe(
      10 + 5 + 5 + 5 + 8 + 6,
    );
  });

  it('3-arg form excludes TURRET_2 when hasSecondaryTurret is false even if field present', () => {
    const allocation = {
      ...createEmptyVehicleArmorAllocation(),
      [VehicleLocation.FRONT]: 10,
      [VehicleLocation.TURRET_2]: 99,
    };
    expect(getTotalVehicleArmor(allocation, false, false)).toBe(10);
  });
});

describe('setHasSecondaryTurretLogic', () => {
  it('enabling initializes a default ITurretConfiguration', () => {
    const state = makeState({ tonnage: 60 });
    const next = setHasSecondaryTurretLogic(state, true);

    expect(next.secondaryTurret).not.toBeNull();
    expect(next.secondaryTurret).toMatchObject({
      type: TurretType.SINGLE,
      maxWeight: 60 * 0.1,
      currentWeight: 0,
      rotationArc: 360,
    });
    expect(next.isModified).toBe(true);
  });

  it('disabling nulls secondaryTurret AND zeros TURRET_2 armor', () => {
    const state = makeState({
      secondaryTurret: {
        type: TurretType.SINGLE,
        maxWeight: 5,
        currentWeight: 0,
        rotationArc: 360,
      },
      armorAllocation: {
        ...createEmptyVehicleArmorAllocation(),
        [VehicleLocation.TURRET_2]: 6,
      },
    });
    const next = setHasSecondaryTurretLogic(state, false);

    expect(next.secondaryTurret).toBeNull();
    const alloc = next.armorAllocation as Record<string, number>;
    expect(alloc[VehicleLocation.TURRET_2]).toBe(0);
  });

  it('enabling when already enabled is a no-op', () => {
    const state = makeState({
      secondaryTurret: {
        type: TurretType.DUAL,
        maxWeight: 5,
        currentWeight: 0,
        rotationArc: 360,
      },
    });
    const next = setHasSecondaryTurretLogic(state, true);
    // Idempotent — returns empty partial so existing config is preserved.
    expect(next).toEqual({});
  });
});

describe('setSecondaryTurretTypeLogic', () => {
  it('is a no-op when secondary turret is disabled', () => {
    const state = makeState({ secondaryTurret: null });
    const next = setSecondaryTurretTypeLogic(state, TurretType.DUAL);
    expect(next).toEqual({});
  });

  it('updates type when secondary turret is enabled', () => {
    const state = makeState({
      secondaryTurret: {
        type: TurretType.SINGLE,
        maxWeight: 5,
        currentWeight: 0,
        rotationArc: 360,
      },
    });
    const next = setSecondaryTurretTypeLogic(state, TurretType.DUAL);
    expect(next.secondaryTurret).toMatchObject({ type: TurretType.DUAL });
  });

  it('TurretType.NONE disables the secondary turret', () => {
    const state = makeState({
      secondaryTurret: {
        type: TurretType.SINGLE,
        maxWeight: 5,
        currentWeight: 0,
        rotationArc: 360,
      },
      armorAllocation: {
        ...createEmptyVehicleArmorAllocation(),
        [VehicleLocation.TURRET_2]: 4,
      },
    });
    const next = setSecondaryTurretTypeLogic(state, TurretType.NONE);
    expect(next.secondaryTurret).toBeNull();
    const alloc = next.armorAllocation as Record<string, number>;
    expect(alloc[VehicleLocation.TURRET_2]).toBe(0);
  });
});

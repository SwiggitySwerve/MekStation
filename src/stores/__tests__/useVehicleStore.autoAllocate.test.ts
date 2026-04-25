/**
 * Unit tests for autoAllocateArmorLogic.
 *
 * Asserts the auto-allocate distribution matches TechManual pp.86–87:
 *   40% Front, 20% each Side, 10% Rear, remainder Turret (10%)
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *       Scenario: Auto-allocate distributes per TechManual
 */

import {
  VehicleLocation,
  VTOLLocation,
} from "@/types/construction/UnitLocation";
import { GroundMotionType } from "@/types/unit/BaseUnitInterfaces";
import { TurretType } from "@/types/unit/VehicleInterfaces";

import { autoAllocateArmorLogic } from "../useVehicleStore.actions";
import type { VehicleStore } from "../vehicleState";

function makeState(overrides: Partial<VehicleStore> = {}): VehicleStore {
  return {
    motionType: GroundMotionType.TRACKED,
    armorTonnage: 5,
    turret: null,
    armorAllocation: {},
    ...overrides,
  } as unknown as VehicleStore;
}

describe("autoAllocateArmorLogic — TechManual pp.86-87 distribution", () => {
  it("distributes 40/20/20/10 for a tracked vehicle WITHOUT turret", () => {
    // 5t × 16 pts/ton = 80 points total, no turret
    const result = autoAllocateArmorLogic(makeState({ armorTonnage: 5 }));
    const alloc = result.armorAllocation as Record<string, number>;

    // Without turret, normalizer = 0.40 + 0.20 + 0.20 + 0.10 = 0.90
    // Effective: front=80*0.40/0.90 ≈ 35.55 floored to 35
    //            side= 80*0.20/0.90 ≈ 17.77 floored to 17 each
    //            rear= 80*0.10/0.90 ≈  8.88 floored to 8
    expect(alloc[VehicleLocation.FRONT]).toBe(35);
    expect(alloc[VehicleLocation.LEFT]).toBe(17);
    expect(alloc[VehicleLocation.RIGHT]).toBe(17);
    expect(alloc[VehicleLocation.REAR]).toBe(8);
    expect(alloc[VehicleLocation.TURRET]).toBe(0);

    // Ratios honour the TM spec: Front ≈ 2× Side, Side = 2× Rear
    expect(alloc[VehicleLocation.FRONT]).toBeGreaterThan(
      alloc[VehicleLocation.LEFT] * 2 - 1,
    );
    expect(alloc[VehicleLocation.LEFT]).toBeGreaterThan(
      alloc[VehicleLocation.REAR] * 2 - 1,
    );
  });

  it("distributes 40/20/20/10/10 for a tracked vehicle WITH turret", () => {
    const state = makeState({
      armorTonnage: 5,
      turret: {
        type: TurretType.STANDARD,
        weight: 0.5,
        rotationArc: 360,
      } as unknown as VehicleStore["turret"],
    });
    const result = autoAllocateArmorLogic(state);
    const alloc = result.armorAllocation as Record<string, number>;

    // With turret, normalizer = 0.40 + 0.20 + 0.20 + 0.10 + 0.10 = 1.0
    // Effective: front=80*0.40 = 32, side=80*0.20=16 each, rear=80*0.10=8, turret=80*0.10=8
    expect(alloc[VehicleLocation.FRONT]).toBe(32);
    expect(alloc[VehicleLocation.LEFT]).toBe(16);
    expect(alloc[VehicleLocation.RIGHT]).toBe(16);
    expect(alloc[VehicleLocation.REAR]).toBe(8);
    expect(alloc[VehicleLocation.TURRET]).toBe(8);

    // Sum ≤ totalPoints (80) — flooring may shave 1-2 points
    const sum = Object.values(alloc).reduce((a, b) => a + (b ?? 0), 0);
    expect(sum).toBeLessThanOrEqual(80);
    expect(sum).toBeGreaterThanOrEqual(78);
  });

  it("adds Rotor location for a VTOL", () => {
    const result = autoAllocateArmorLogic(
      makeState({
        armorTonnage: 5,
        motionType: GroundMotionType.VTOL,
      }),
    );
    const alloc = result.armorAllocation as Record<string, number>;
    expect(alloc[VTOLLocation.ROTOR]).toBeGreaterThan(0);
    expect(alloc[VehicleLocation.FRONT]).toBeGreaterThan(0);
  });

  it("returns zero allocation when armorTonnage is 0", () => {
    const result = autoAllocateArmorLogic(makeState({ armorTonnage: 0 }));
    const alloc = result.armorAllocation as Record<string, number>;
    expect(alloc[VehicleLocation.FRONT]).toBe(0);
    expect(alloc[VehicleLocation.LEFT]).toBe(0);
    expect(alloc[VehicleLocation.RIGHT]).toBe(0);
    expect(alloc[VehicleLocation.REAR]).toBe(0);
  });
});

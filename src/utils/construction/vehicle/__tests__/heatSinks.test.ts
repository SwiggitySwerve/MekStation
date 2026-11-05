import type { IEquipmentItem } from '@/types/equipment';

import { createDefaultVehicleState } from '@/stores/vehicleState';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import {
  EngineType,
  VehicleOnlyEngineType,
  type VehicleEngineType,
} from '@/types/construction/EngineType';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory as C } from '@/types/equipment';

import { getVehicleHeatNeutralWeaponHeat } from '../mountedWeight';
import { computeVehicleWeightBreakdown } from '../weightComposition';

// MegaMek 48fcb2f64a1b TestEntity.java:945-950. These are raw weapon heats,
// without BV's one-shot, rotary, ultra or streak adjustments.
it.each([
  [C.ENERGY_WEAPON, 'PPC', 10, undefined, 10],
  [C.ENERGY_WEAPON, 'Medium Laser', 3, undefined, 3],
  [C.ENERGY_WEAPON, 'Vehicle Flamer', 3, ['Requires ammo'], 0],
  [C.ENERGY_WEAPON, 'Chemical Laser', 6, ['Requires ammo'], 0],
  [C.ENERGY_WEAPON, 'Plasma Rifle', 10, ['Requires ammo'], 10],
  [C.ENERGY_WEAPON, 'TSEMP Cannon', 10, undefined, 0],
  [C.ENERGY_WEAPON, 'BattleMech Taser', 10, undefined, 0],
  [C.ENERGY_WEAPON, 'Heavy Flamer', 5, undefined, 0],
  [C.BALLISTIC_WEAPON, 'AC/20', 7, undefined, 0],
  [C.MISSILE_WEAPON, 'LRM 20', 6, undefined, 0],
  [C.AMMUNITION, 'Plasma Rifle Ammo', 10, undefined, 0],
  [C.MISC_EQUIPMENT, 'Plasma container', 10, undefined, 0],
] as const)(
  '%s %s contributes %s raw heat',
  (category, name, heat, special, expected) => {
    expect(
      getVehicleHeatNeutralWeaponHeat({ category, name, heat, special }),
    ).toBe(expected);
  },
);

const item: IEquipmentItem = {
  id: 'energy-load',
  name: 'Synthetic energy load',
  category: C.ENERGY_WEAPON,
  heat: 13,
  weight: 7,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  introductionYear: 2460,
  criticalSlots: 3,
  costCBills: 200000,
  battleValue: 176,
};
const base = createDefaultVehicleState({
  name: 'Heat load',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
});
const input = {
  ...base,
  equipment: [
    {
      id: 'gun',
      equipmentId: 'ppc',
      name: 'PPC',
      location: VehicleLocation.FRONT,
      isTurretMounted: false,
      isRearMounted: false,
      isSponsonMounted: false,
    },
  ],
};

// TestTank.java:264-270; Engine.java:480-493 at the pin above.
it.each<[VehicleEngineType, number]>([
  [EngineType.STANDARD, 3],
  [EngineType.XL_IS, 3],
  [EngineType.FISSION, 8],
  [EngineType.FUEL_CELL, 12],
  [EngineType.ICE, 13],
  [VehicleOnlyEngineType.NONE, 13],
])(
  'charges heat-neutral sinks after %s engine allowance',
  (engineType, expected) => {
    const empty = computeVehicleWeightBreakdown(
      { ...input, engineType, equipment: [] },
      () => undefined,
    );
    const charged = computeVehicleWeightBreakdown(
      { ...input, engineType },
      () => item,
    );
    expect(charged).toMatchObject({
      heatSinks: expected,
      remaining:
        empty.remaining! - 7 - expected - (charged.powerAmplifiers ?? 0),
    });
  },
);

it('adds stealth heat before subtracting the fusion allowance', () => {
  expect(
    computeVehicleWeightBreakdown(
      { ...input, armorType: ArmorTypeEnum.STEALTH },
      () => item,
    ),
  ).toMatchObject({ heatSinks: 13 });
});

it('reproduces the pinned Puma PAT-001 seven-ton heat-sink term', () => {
  // mm-data 50f7efef: vehicles/2750 IS Land/Puma Assault Tank PAT-001.blk,
  // sha256 bee0871399a451f95ebb09a16a38c1a0fd68d86e0e48844245761f3056667e57.
  // Its two medium lasers, small laser and PPC produce 17 heat. The vehicle
  // flamer and missile racks contribute zero to TestTank.getWeightHeatSinks.
  const guns = [
    { ...item, id: 'medium', name: 'Medium Laser', heat: 3, weight: 1 },
    { ...item, id: 'small', name: 'Small Laser', heat: 1, weight: 0.5 },
    { ...item, id: 'ppc', name: 'PPC', heat: 10, weight: 7 },
  ];
  const equipment = ['medium', 'medium', 'small', 'ppc'].map(
    (equipmentId, i) => ({
      ...input.equipment[0],
      id: String(i),
      equipmentId,
    }),
  );
  expect(
    computeVehicleWeightBreakdown(
      { ...input, tonnage: 95, engineRating: 285, equipment },
      (id) => guns.find((gun) => gun.id === id),
    ),
  ).toMatchObject({ heatSinks: 7 });
});

it.each([undefined, NaN, Infinity, -1])(
  'keeps unknown or invalid raw heat %s unavailable',
  (heat) => {
    expect(
      computeVehicleWeightBreakdown(input, () => ({ ...item, heat })),
    ).toMatchObject({ heatSinks: null, remaining: null, isComplete: false });
  },
);

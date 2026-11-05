import { calculateArmorTonnage } from '@/services/units/unitLoaderService/armorCalculations';
import { applyArmorTypeChange } from '@/stores/unit/useUnitStructureStore.helpers';
import { createEmptyArmorAllocation } from '@/types/construction/ArmorAllocation';
import {
  ArmorTypeEnum as A,
  getArmorDefinition,
} from '@/types/construction/ArmorType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import {
  calculateArmorWeight,
  calculateArmorPoints,
} from '../../armorCalculations';
import { computeVehicleArmorWeight, computeVehicleArmorPoints } from '../armor';

// MegaMek 48fcb2f64a1b ArmorType.java:61,226,302,482,513,788-826.
// Light/heavy ferro multiply the standard 16 points/t by
// 1.06/1.24. TestEntity.java:596-597 rounds the resulting mass up to half tons.
it.each([
  [A.LIGHT_FERRO, 16.96, 169],
  [A.HEAVY_FERRO, 19.84, 198],
] as const)(
  '%s uses the shared pinned armor density',
  (type, pointsPerTon, points) => {
    expect(getArmorDefinition(type)?.pointsPerTon).toBe(pointsPerTon);
    expect(computeVehicleArmorWeight(points, type)).toBe(10);
    expect(calculateArmorWeight(points, type)).toBe(10);
    expect(computeVehicleArmorPoints(10, type)).toBe(points);
    expect(calculateArmorPoints(10, type)).toBe(points);
    const allocation = createEmptyArmorAllocation();
    allocation[MechLocation.HEAD] = points;
    expect(calculateArmorTonnage(allocation, type)).toBe(10);
  },
);

it.each([
  [75, 12],
  [100, 15.5],
])('caps a %s-ton biped at %s tons of heavy ferro', (tonnage, expected) => {
  expect(
    applyArmorTypeChange(
      [],
      tonnage,
      MechConfiguration.BIPED,
      19.5,
      A.HEAVY_FERRO,
    ).armorTonnage,
  ).toBe(expected);
});

import { calculateArmorTonnage } from '@/services/units/unitLoaderService/armorCalculations';
import {
  createEmptyArmorAllocation,
  IArmorAllocation,
} from '@/types/construction/ArmorAllocation';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';

function armorAllocationWithPoints(totalPoints: number): IArmorAllocation {
  const allocation = createEmptyArmorAllocation();
  allocation[MechLocation.HEAD] = totalPoints;
  return allocation;
}

describe('UnitLoaderService armor calculations', () => {
  it('rounds standard armor up to the nearest half ton', () => {
    expect(
      calculateArmorTonnage(
        armorAllocationWithPoints(17),
        ArmorTypeEnum.STANDARD,
      ),
    ).toBe(1.5);
  });

  it.each([
    [ArmorTypeEnum.STANDARD, 2.5],
    [ArmorTypeEnum.FERRO_FIBROUS_IS, 2],
    [ArmorTypeEnum.FERRO_FIBROUS_CLAN, 2],
    [ArmorTypeEnum.LIGHT_FERRO, 2.5],
    [ArmorTypeEnum.HEAVY_FERRO, 2],
    [ArmorTypeEnum.HARDENED, 4.5],
  ])(
    'uses the service points-per-ton value for %s',
    (armorType, expectedTonnage) => {
      expect(
        calculateArmorTonnage(armorAllocationWithPoints(34), armorType),
      ).toBe(expectedTonnage);
    },
  );

  it.each([
    // Charger C and Shogun C 2 carry 245 points. MegaMek points per ton are
    // 16 x 0.875 and 16 x 0.75 (ArmorType.java:1043, :1163).
    [ArmorTypeEnum.FERRO_LAMELLOR, 17.5],
    [ArmorTypeEnum.BALLISTIC_REINFORCED, 20.5],
  ])('uses MegaMek points per ton for %s', (armorType, expectedTonnage) => {
    expect(
      calculateArmorTonnage(armorAllocationWithPoints(245), armorType),
    ).toBe(expectedTonnage);
  });

  it('preserves the currently counted BattleMech armor fields', () => {
    const allocation = armorAllocationWithPoints(16);
    allocation[MechLocation.CENTER_LEG] = 50;
    allocation[MechLocation.FRONT_LEFT_LEG] = 50;
    allocation[MechLocation.FRONT_RIGHT_LEG] = 50;
    allocation[MechLocation.REAR_LEFT_LEG] = 50;
    allocation[MechLocation.REAR_RIGHT_LEG] = 50;

    expect(calculateArmorTonnage(allocation, ArmorTypeEnum.STANDARD)).toBe(1);
  });
});

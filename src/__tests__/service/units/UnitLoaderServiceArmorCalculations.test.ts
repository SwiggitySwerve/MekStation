import { calculateArmorTonnage } from '@/services/units/unitLoaderService/armorCalculations';
import {
  createEmptyArmorAllocation,
  IArmorAllocation,
} from '@/types/construction/ArmorAllocation';
import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '@/types/construction/ArmorType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';

function armorAllocationWithPoints(totalPoints: number): IArmorAllocation {
  const allocation = createEmptyArmorAllocation();
  allocation[MechLocation.HEAD] = totalPoints;
  return allocation;
}

describe('UnitLoaderService armor calculations', () => {
  it.each([
    [MechConfiguration.BIPED, 25],
    [MechConfiguration.TRIPOD, 28.5],
    [MechConfiguration.QUAD, 11.5],
    [MechConfiguration.QUADVEE, 11.5],
  ] as const)(
    'counts active %s limbs and excludes dormant locations',
    (configuration, tons) => {
      const allocation = createEmptyArmorAllocation();
      Object.assign(allocation, {
        [MechLocation.CENTER_TORSO]: 100,
        [MechLocation.LEFT_ARM]: 80,
        [MechLocation.RIGHT_ARM]: 80,
        [MechLocation.LEFT_LEG]: 70,
        [MechLocation.RIGHT_LEG]: 70,
        [MechLocation.CENTER_LEG]: 56,
        [MechLocation.FRONT_LEFT_LEG]: 14,
        [MechLocation.FRONT_RIGHT_LEG]: 16,
        [MechLocation.REAR_LEFT_LEG]: 20,
        [MechLocation.REAR_RIGHT_LEG]: 30,
      });
      expect(
        calculateArmorTonnage(
          allocation,
          ArmorTypeEnum.STANDARD,
          configuration,
        ),
      ).toBe(tons);
    },
  );

  // ArmorType.java:61,226,301-302,788-826 at MegaMek 48fcb2f6:
  // reactive keeps the default 16 points/t; it has no efficiency penalty.
  it('uses the shared 16-point reactive density in construction and loading', () => {
    expect(getArmorDefinition(ArmorTypeEnum.REACTIVE)?.pointsPerTon).toBe(16);
    expect(
      calculateArmorTonnage(
        armorAllocationWithPoints(96),
        ArmorTypeEnum.REACTIVE,
      ),
    ).toBe(6);
  });
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

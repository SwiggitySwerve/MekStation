import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { TechBase } from '@/types/enums/TechBase';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';

import {
  aerospaceArmor,
  smallCraftArmor,
  smallCraftArmorWeight,
} from '../armor';

/** MegaMek 48fcb2f64 TestSmallCraft:99-139; SmallCraft.getArmorWeight:783-797. */
it.each([
  {
    clan: false,
    spheroid: false,
    armorCode: 0,
    allocated: 608,
    mass: 36,
    maximum: 36,
    available: 608,
  },
  {
    clan: true,
    spheroid: false,
    armorCode: 0,
    allocated: 752,
    mass: 36,
    maximum: 36,
    available: 752,
  },
  {
    clan: false,
    spheroid: true,
    armorCode: 0,
    allocated: 488,
    mass: 28.5,
    maximum: 28.5,
    available: 488,
  },
  {
    clan: false,
    spheroid: false,
    armorCode: 40,
    allocated: 401,
    mass: 36,
    maximum: 36,
    available: 401,
  },
])(
  'preserves the native armor result: $armorCode/$clan/$spheroid',
  ({ mass, maximum, available, ...facts }) => {
    expect(
      aerospaceArmor({
        ...facts,
        structuralIntegrity: 8,
        large: true,
        advanced: false,
        tonnage: 200,
      }),
    ).toEqual({ mass, maximum, available });
  },
);

it('preserves unavailable native mass for previously unsupported armor', () => {
  expect(
    aerospaceArmor({
      armorCode: 20,
      clan: false,
      structuralIntegrity: 8,
      large: true,
      advanced: false,
      spheroid: true,
      tonnage: 200,
      allocated: 100,
    }),
  ).toBeUndefined();
});

const facts = {
  tonnage: 200,
  structuralIntegrity: 8,
  motionType: AerospaceMotionType.AERODYNE,
  techBase: TechBase.INNER_SPHERE,
  armorType: ArmorTypeEnum.STANDARD,
};
it.each([
  {
    smallCraftArmorType: 'AEROSPACE',
    armorTonnage: 36,
    maximumPoints: 608,
    availablePoints: 608,
    pointsPerTon: 16,
  },
  {
    smallCraftArmorType: 'FERRO_ALUMINUM',
    armorTonnage: 36,
    maximumPoints: 677,
    availablePoints: 677,
    pointsPerTon: 17.92,
  },
  {
    smallCraftArmorType: 'PRIMITIVE_AERO',
    armorTonnage: 36,
    maximumPoints: 401,
    availablePoints: 401,
    pointsPerTon: 16,
  },
  {
    smallCraftArmorType: 'HEAVY_FERRO_ALUMINUM',
    armorTonnage: 36,
    maximumPoints: 746,
    availablePoints: 746,
    pointsPerTon: 19.84,
  },
])(
  'uses pinned whole-craft limits for $smallCraftArmorType',
  ({ maximumPoints, availablePoints, pointsPerTon, ...armor }) => {
    expect(smallCraftArmor({ ...facts, ...armor })).toEqual({
      maximumPoints,
      availablePoints,
      pointsPerTon,
      maximumTonnage: 36,
    });
  },
);

it('uses spheroid half-ton floors and Clan large-craft density', () => {
  expect(
    smallCraftArmor({
      ...facts,
      motionType: AerospaceMotionType.SPHEROID,
      armorTonnage: 99,
    }).maximumTonnage,
  ).toBe(28.5);
  expect(
    smallCraftArmor({ ...facts, techBase: TechBase.CLAN, armorTonnage: 36 }),
  ).toEqual({
    maximumTonnage: 36,
    maximumPoints: 752,
    availablePoints: 752,
    pointsPerTon: 20,
  });
});

it('reverses primitive rounding and deducts SI bonus when loading armor mass', () => {
  const primitive = {
    ...facts,
    structuralIntegrity: 7,
    smallCraftArmorType: 'PRIMITIVE_AERO',
  };
  expect(smallCraftArmorWeight(primitive, 281)).toBe(25);
  expect(
    smallCraftArmor({ ...primitive, armorTonnage: 25 }).availablePoints,
  ).toBe(282);
});

it('keeps unsupported BAR armor explicit for the later FWS owner', () => {
  expect(() =>
    smallCraftArmor({ ...facts, armorTonnage: 1, smallCraftArmorType: 'BAR' }),
  ).toThrow(/Unsupported small-craft armor/);
});

it('retains the explicit Clan ferro meaning of older shared fighter armor tags', () => {
  expect(
    smallCraftArmor({
      ...facts,
      armorType: ArmorTypeEnum.FERRO_FIBROUS_CLAN,
      smallCraftArmorType: 'FERRO_FIBROUS_CLAN',
      armorTonnage: 36,
    }),
  ).toEqual({
    maximumTonnage: 36,
    maximumPoints: 896,
    availablePoints: 896,
    pointsPerTon: 24,
  });
});

import { aerospaceArmor } from '../armor';

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

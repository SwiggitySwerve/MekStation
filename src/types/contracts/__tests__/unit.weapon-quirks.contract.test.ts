import { UnitContract } from '@/types/contracts';

it('keeps mount-specific weapon quirks through the generated portable contract', () => {
  const value = {
    schemaVersion: '1.0.0',
    id: 'quirk-contract',
    unitType: 'Vehicle',
    weaponQuirks: {
      'LWG:0:Medium Laser': ['mod_weapons', 'accurate'],
      'LWG:1:Medium Laser': ['mod_weapons'],
    },
  };
  expect(UnitContract.parse(value)).toEqual(value);
  expect(
    UnitContract.safeParse({
      ...value,
      weaponQuirks: { 'LWG:0:Medium Laser': 'accurate' },
    }).success,
  ).toBe(false);
});

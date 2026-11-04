import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { hydrateAmmoStateFromFullUnit } from '@/simulation/runner/UnitHydrationAmmo';
import { resolveNativeAmmoBin } from '@/utils/construction/battleValueAmmo';

// MegaMek 48fcb2f64: BLKFile.java:279-291,361-365.
it.each([
  'IS Ammo LRM-20:Shots3#',
  'IS Ammo LRM-20:shots3#:OMNI',
  'IS Ammo LRM-20:OMNI:Shots3#',
])('retains the declared shot count in %s through hydration', (id) => {
  const source = getNodeCanonicalUnitService().getByIdSync(
    'vehicles:ac-2-carrier',
  );
  if (!source) throw new Error('Missing AC/2 Carrier fixture');
  const bins = Object.values(
    hydrateAmmoStateFromFullUnit({
      ...source,
      equipment: [
        { id, location: 'BODY' },
        { id, location: 'BODY' },
      ],
    }) ?? {},
  );
  expect(resolveNativeAmmoBin(id)?.shots).toBe(3);
  expect(bins.map((bin) => [bin.maxRounds, bin.remainingRounds])).toEqual([
    [3, 3],
    [3, 3],
  ]);
  expect(new Set(bins.map((bin) => bin.binId)).size).toBe(2);
});

it('retains the full-bin and compatibility quantity syntax', () => {
  expect(resolveNativeAmmoBin('IS Ammo LRM-20')?.shots).toBe(6);
  expect(resolveNativeAmmoBin('IS Ammo LRM-20:3')?.shots).toBe(3);
  expect(resolveNativeAmmoBin('IS Ammo LRM-20:0:OMNI')?.shots).toBe(0);
  expect(resolveNativeAmmoBin('IS Ammo LRM-20:Shots0#')?.shots).toBe(6);
  expect(
    resolveNativeAmmoBin('IS Ammo LRM-20:Shots9007199254740992#'),
  ).toBeUndefined();
});

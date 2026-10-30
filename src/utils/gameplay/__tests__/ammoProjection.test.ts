import { ammoFromWeapons as adapterProjection } from '@/engine/adapters/CompendiumAdapter.weapons';
import { createAmmoBin } from '@/simulation/runner/__tests__/weaponAttackInvalidation.behavior.test-helpers';

import { ammoFromWeapons } from '../ammoTracking/weapons';

describe('shared ammunition projection', () => {
  it('preserves the adapter export and combines compatible bin counts', () => {
    expect(adapterProjection).toBe(ammoFromWeapons);
    const weapons = [{ id: 'lrm-mount', name: 'LRM-10', ammoPerTon: 12 }];
    const bins = {
      a: createAmmoBin({
        binId: 'a',
        weaponType: 'lrm-10',
        remainingRounds: 2,
      }),
      b: createAmmoBin({
        binId: 'b',
        weaponType: 'lrm-10',
        remainingRounds: 3,
      }),
      other: createAmmoBin({
        binId: 'other',
        weaponType: 'srm-6',
        remainingRounds: 9,
      }),
    };
    const before = JSON.stringify({ weapons, bins });
    expect(ammoFromWeapons(weapons, bins)).toEqual({ 'lrm-mount': 5 });
    expect(JSON.stringify({ weapons, bins })).toBe(before);
    expect(ammoFromWeapons(weapons, {})).toEqual({ 'lrm-mount': 0 });
  });

  it('preserves omission of non-positive-capacity weapons in this refactor', () => {
    expect(
      ammoFromWeapons(
        [
          { id: 'laser', name: 'Medium Laser', ammoPerTon: -1 },
          { id: 'zero', name: 'Medium Laser', ammoPerTon: 0 },
        ],
        {},
      ),
    ).toEqual({});
  });
});

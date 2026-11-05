import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { getLargeAerospaceAmmoBVGroup } from '@/utils/construction/battleValueAmmo';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '@/utils/construction/contractBVUnitAdapter';

import { resolveLargeAerospaceMountBV } from '../dropShipMountBV';
import traces from './fixtures/largeAerospaceNativePools.json';

/** MegaMek 48fcb2f64, LargeAeroBVCalculator.java:85-142; UL-16b oracle. */
describe('large aerospace native ammo identities', () => {
  it.each(traces)(
    'completes the pinned native design $path',
    ({ unit, expected }) => {
      const byArc = Object.fromEntries(
        Object.entries(unit.armor.byArc).map(([arc, points]) => {
          if (typeof points !== 'number')
            throw new Error('Invalid trace armor');
          return [arc, points];
        }),
      );
      const result = calculateBattleValueForUnit(
        contractUnitToBVUnit({ ...unit, armor: { ...unit.armor, byArc } }),
      );
      if (result?.kind !== 'dropship') throw new Error('Expected DropShip');
      expect(result.breakdown.unresolvedMounts).toEqual([]);
      expect(result.breakdown).toMatchObject({
        calculationScope: 'complete',
        final: expected.total,
      });
      expect(result.breakdown.defensive).toBeCloseTo(expected.defensive, 8);
      expect(result.breakdown.offensive).toBeCloseTo(expected.offensive, 8);
    },
  );

  it.each([
    ['machine-gun', 'ammo-mg-full', 'MG:2'],
    ['clan-uac-20', 'clan-ultra-ac-20-ammo-registry', 'AC_ULTRA:20'],
    ['lrm-20', 'clan-ammo-lrm-20-clan-artemis-capable-registry', 'LRM:20'],
    ['atm-12', 'clan-ammo-atm-12-he', 'ATM:12'],
    ['hag40', 'hyper-assault-gauss-rifle-40-ammo-registry', 'HAG:40'],
    ['arrow-iv-launcher', 'arrowivammo', 'ARROW_IV:20'],
  ])('shares the native pool for %s and %s', (weapon, ammo, group) => {
    expect(getLargeAerospaceAmmoBVGroup(weapon)).toBe(group);
    expect(getLargeAerospaceAmmoBVGroup(ammo)).toBe(group);
  });

  it.each([
    ['b-clheavylargelaser', 244],
    ['b-clheavymediumlaser', 76],
    ['b-islongtom', 368],
    ['b-isarrowiv', 240],
  ] as const)('values the registered weapon %s once', (equipmentId, bv) => {
    const result = resolveLargeAerospaceMountBV([
      { equipmentId, location: 'NOSE' },
    ]);
    expect(result.unresolved).toEqual([]);
    expect(result.arcs[0].weaponBV).toBe(bv);
  });

  it('retains unsupported screen and defensive quantities as explicit blockers', () => {
    const result = resolveLargeAerospaceMountBV(
      ['b-screen-launcher', 'ammo-screen:20', 'isams-ammo:240'].map(
        (equipmentId) => ({ equipmentId, location: 'NOSE' }),
      ),
      UnitType.WARSHIP,
    );
    expect(result.unresolved.map((mount) => mount.mountIndex)).toEqual([
      0, 1, 2,
    ]);
  });
});

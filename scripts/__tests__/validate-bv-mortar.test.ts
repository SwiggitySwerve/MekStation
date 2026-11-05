import type { UnitData } from '../validate-bv-types';

import { calculateAmmoBVPools } from '../../src/utils/construction/battleValueAmmo';
import { resolveAmmoByPattern } from '../validate-bv-ammo-resolution';
import { scanCrits } from '../validate-bv-crit-scan';

// MegaMek 48fcb2f64: AmmoType.java:11919-12130 defines shaped-charge
// mortar bins; the size-4 factories assign 3.6 BV, not a rounded 4.
it.each([
  [1, 1.2],
  [2, 2.4],
  [4, 3.6],
  [8, 7.2],
])('retains size-%s native fallback BV %s for both tech bases', (rack, bv) => {
  for (const tech of ['is', 'clan']) {
    expect(
      resolveAmmoByPattern(`${tech}-sc-mortar-${rack}-ammo`, tech)?.bv,
    ).toBe(bv);
  }
});

it('builds the native mortar pool from each bin without rounding', () => {
  const unit: UnitData = {
    id: 'mortar-bins',
    chassis: 'Test',
    model: 'Mortar',
    unitType: 'BattleMech',
    configuration: 'Biped',
    techBase: 'CLAN',
    tonnage: 50,
    engine: { type: 'FUSION', rating: 200 },
    gyro: { type: 'STANDARD' },
    cockpit: 'STANDARD',
    structure: { type: 'STANDARD' },
    armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
    heatSinks: { type: 'SINGLE', count: 10 },
    movement: { walk: 4, jump: 0 },
    equipment: [],
    criticalSlots: {
      LEFT_TORSO: Array<string>(6).fill('Clan Ammo SC Mortar-4'),
    },
  };
  const scan = scanCrits(unit);
  const pool = calculateAmmoBVPools(
    [{ id: 'mech-mortar-4', bv: 52 }],
    scan.ammo,
  );
  expect(pool.available['MEK_MORTAR:4']).toBeCloseTo(21.6, 10);
  expect(pool.total).toBeCloseTo(21.6, 10);
  expect(pool.cap['MEK_MORTAR:4']).toBe(52);
});

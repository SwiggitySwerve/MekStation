import type { UnitData } from '../validate-bv-types';

import {
  calculateAmmoBVPools,
  getNativeAmmoBVGroup,
} from '../../src/utils/construction/battleValueAmmo';
import { calculateUnitBV } from '../validate-bv-calculator';
import { scanCrits } from '../validate-bv-crit-scan';

const unit: UnitData = {
  id: 'nail-rivet',
  chassis: 'Test',
  model: 'Nail/Rivet',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 50,
  engine: { type: 'FUSION', rating: 200 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
  heatSinks: { type: 'SINGLE', count: 10 },
  movement: { walk: 4, jump: 0 },
  equipment: [
    { id: 'nail-rivet-gun', location: 'LEFT_ARM' },
    { id: 'nail-rivet-gun', location: 'RIGHT_ARM' },
  ],
};

// MegaMek 48fcb2f64: AmmoType.java:13310-13360; NailRivetGunWeapon.java:55-69.
// Full/half bins contribute 1/0.5, are nonexplosive, and share the weapon's
// NAIL_RIVET_GUN:1 group rather than MG:2 (BVCalculator.java:1199,1233).
it.each([
  ['IS Ammo Nail/Rivet - Full', 1],
  ['IS Ammo Nail/Rivet - Half', 0.5],
  ['CL Ammo Nail/Rivet - Full', 1],
])('counts %s in its native pool', (ammo, expected) => {
  const input = { ...unit, criticalSlots: { LEFT_TORSO: [ammo] } };
  const scan = scanCrits(input);
  expect(scan.explosive).toEqual([]);
  const pools = calculateAmmoBVPools(
    unit.equipment.map((item) => ({ id: item.id, bv: 1 })),
    scan.ammo,
  );
  expect(pools).toEqual({
    total: expected,
    available: { 'NAIL_RIVET_GUN:1': expected },
    cap: { 'NAIL_RIVET_GUN:1': 2 },
  });
  expect(calculateUnitBV(input).breakdown?.ammoBV).toBe(expected);
});

it('caps nail/rivet bins independently of neighboring machine-gun ammo', () => {
  const scan = scanCrits({
    ...unit,
    criticalSlots: {
      LEFT_TORSO: [
        'IS Ammo Nail/Rivet - Full',
        'IS Ammo Nail/Rivet - Full',
        'IS Ammo Nail/Rivet - Full',
        'IS Machine Gun Ammo - Full',
      ],
    },
  });
  const pools = calculateAmmoBVPools(
    [{ id: 'nail-rivet-gun', bv: 1 }],
    scan.ammo,
  );
  expect(pools.total).toBe(1);
  expect(pools.available['NAIL_RIVET_GUN:1']).toBe(3);
  expect(pools.available['MG:2']).toBe(1);
  expect(getNativeAmmoBVGroup('nail-rivet-gun')).toBe('NAIL_RIVET_GUN:1');
});

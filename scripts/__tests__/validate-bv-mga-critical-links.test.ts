import type { UnitData } from '../validate-bv-types';

import { calculateUnitBV } from '../validate-bv-calculator';
import {
  applyWeaponPostScanModifiers,
  type WeaponEntry,
} from '../validate-bv-calculator-weapons';
import { scanCrits } from '../validate-bv-crit-scan';

const unit: UnitData = {
  id: 'mga-links',
  chassis: 'Test',
  model: 'MGA',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 50,
  engine: { type: 'FUSION', rating: 200 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9, CENTER_TORSO: 20 } },
  heatSinks: { type: 'DOUBLE', count: 20 },
  movement: { walk: 4, jump: 0 },
  equipment: [],
};

// Native no-critical-slot fallback: MekFileParser.java:928-944 (48fcb2f64).
it.each([
  ['machine-gun', 'clmga'],
  ['light-machine-gun', 'cllmga'],
])('preserves the no-critical-slot fallback for %s', (gun, array) => {
  const result = calculateUnitBV({
    ...unit,
    equipment: [...Array<string>(6).fill(gun), array, array].map((id) => ({
      id,
      location: 'LEFT_ARM',
    })),
  }).breakdown;
  expect(
    result?.weaponMountBV?.filter((w) => /mga/.test(w.name)).map((w) => w.bv),
  ).toEqual([13.4, 6.7]);
  expect(result?.weaponBV).toBe(50.1);
});

it.each<[number, number[]]>([
  [0, []],
  [-5, []],
  [NaN, []],
  [-Infinity, []],
  [5, [3.35]],
  [Infinity, [Infinity]],
  [Number.MIN_VALUE, [Number.MIN_VALUE]],
])(
  'preserves the Mech positive-base admission guard for %s',
  (bv, expected) => {
    const source = {
      ...unit,
      equipment: [{ id: 'clmga', location: 'LEFT_ARM' }],
    };
    const weapons: WeaponEntry[] = [
      {
        id: 'machine-gun',
        name: 'machine-gun',
        heat: 0,
        bv,
        location: 'LEFT_ARM',
      },
    ];
    applyWeaponPostScanModifiers(source, scanCrits(source), weapons, false);
    expect(
      weapons.filter((w) => w.id === 'mga-bonus').map((w) => w.bv),
    ).toEqual(expected);
  },
);

it('retains the Mech closed gun-name policy rather than widening it', () => {
  const source = {
    ...unit,
    equipment: [{ id: 'clmga', location: 'LEFT_ARM' }],
  };
  const weapons: WeaponEntry[] = [
    {
      id: 'clan-machine-gun',
      name: 'clan-machine-gun',
      heat: 0,
      bv: 5,
      location: 'LEFT_ARM',
    },
  ];
  applyWeaponPostScanModifiers(source, scanCrits(source), weapons, false);
  expect(weapons).toHaveLength(1);
});

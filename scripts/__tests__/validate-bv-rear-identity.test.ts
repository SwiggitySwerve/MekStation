import type { UnitData } from '../validate-bv-types';

import { buildMechBVWeapons } from '../../src/utils/construction/mechBV/weaponInputs';
import { scanCrits } from '../validate-bv-crit-scan';
import { countCritWeaponMounts } from '../validate-bv-crit-weapon-mounts';

const unit: UnitData = {
  id: 'marked-weapon-identity',
  chassis: 'Test',
  model: 'Marked mounts',
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
  equipment: [],
};

function mounted(input: UnitData) {
  return buildMechBVWeapons(input, scanCrits(input), []).weapons;
}

// MtfFile.java:1015-1023,1062-1063 (48fcb2f64): rear state belongs to the
// resolved mounted equipment, not another weapon whose name contains it.
it.each(['R', 'T'])(
  'keeps a medium-laser (%s) marker off ER medium lasers',
  (marker) => {
    const weapons = mounted({
      ...unit,
      equipment: ['er-medium-laser', 'er-medium-laser', 'medium-laser'].map(
        (id) => ({ id, location: 'LEFT_TORSO' }),
      ),
      criticalSlots: {
        LEFT_TORSO: [
          'ISERMediumLaser',
          'ISERMediumLaser',
          `Medium Laser (${marker})`,
        ],
      },
    });
    expect(
      weapons.filter((w) => w.rear || w.isTurret).map((w) => w.id),
    ).toEqual(['medium-laser']);
  },
);

it('resolves CLMG rear slots to the machine-gun family', () => {
  const weapons = mounted({
    ...unit,
    techBase: 'CLAN',
    equipment: Array.from({ length: 2 }, () => ({
      id: 'machine-gun',
      location: 'RIGHT_TORSO',
    })),
    criticalSlots: { RIGHT_TORSO: ['CLMG (OMNIPOD)', 'CLMG (R) (OMNIPOD)'] },
  });
  expect(weapons.filter((w) => w.rear)).toHaveLength(1);
});

it('pre-consumes an explicit rear mount without marking a front copy', () => {
  const weapons = mounted({
    ...unit,
    equipment: [
      { id: 'medium-laser', location: 'LEFT_TORSO (R)' },
      { id: 'medium-laser', location: 'LEFT_TORSO' },
      { id: 'er-medium-laser', location: 'LEFT_TORSO' },
    ],
    criticalSlots: {
      LEFT_TORSO: ['Medium Laser (R)', 'Medium Laser', 'ISERMediumLaser'],
    },
  });
  expect(weapons.filter((w) => w.rear)).toHaveLength(1);
});

it('counts adjacent one-slot Clan large lasers as distinct rear mounts', () => {
  const counts = countCritWeaponMounts({
    ...unit,
    techBase: 'CLAN',
    equipment: [
      { id: 'er-large-laser', location: 'RIGHT_TORSO' },
      { id: 'er-large-laser', location: 'RIGHT_TORSO' },
      { id: 'er-ppc', location: 'LEFT_ARM' },
      { id: 'er-ppc', location: 'RIGHT_ARM' },
    ],
    criticalSlots: {
      RIGHT_TORSO: ['CLERLargeLaser (R)', 'CLERLargeLaser (R)'],
    },
  });
  expect([...counts.rearWeaponCountByLoc.get('RIGHT_TORSO')!.values()]).toEqual(
    [2],
  );
});

it('retains the prototype prefix/suffix alias on Excalibur rear mounts', () => {
  const weapons = mounted({
    ...unit,
    equipment: [
      { id: 'prototype-er-small-laser', location: 'CENTER_TORSO' },
      { id: 'ppc', location: 'LEFT_ARM' },
    ],
    criticalSlots: { CENTER_TORSO: ['CLERSmallLaserPrototype (R)'] },
  });
  expect(weapons.find((w) => w.name === 'prototype-er-small-laser')?.rear).toBe(
    true,
  );
});

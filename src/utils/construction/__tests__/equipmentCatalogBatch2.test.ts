import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseTechBase, TechBase } from '@/types/enums/TechBase';

// Pinned MegaMek 48fcb2f6. Every value/citation is listed in the batch audit.
const cases: Record<string, Record<string, Record<string, number>>> = {
  'miscellaneous/other.json': {
    babattleclawmagnets: {
      battleValue: 1.5,
    },
    protomagneticclamp: {
      battleValue: 1,
    },
    'vehicular-grenade-launcher': {
      battleValue: 15,
    },
    'fluid-suction-system-standard': {
      weight: 1,
    },
    'risc-apds': {
      criticalSlots: 2,
    },
    baheavybattleclawmagnets: {
      battleValue: 1.5,
    },
    'chain-whip': {
      battleValue: 5.175,
    },
  },
  'weapons/ballistic-other.json': {
    'long-tom': {
      battleValue: 329,
      weight: 20,
      criticalSlots: 15,
    },
    'sniper-rifle-hammel-marksman': {
      battleValue: 0.28,
      damage: 0.28,
    },
    'nail-rivet-gun': {
      battleValue: 1,
      weight: 0.5,
      criticalSlots: 1,
    },
    'thumper-cannon': {
      weight: 10,
      criticalSlots: 7,
      heat: 5,
    },
    'clan-ams': {
      damage: 2,
    },
  },
  'ammunition/narc.json': {
    'inarc-ammo': {
      battleValue: 0,
    },
  },
  'ammunition/autocannon.json': {
    'ammo-nac-20': {
      weight: 0.4,
    },
    'ammo-nac-30': {
      weight: 0.8,
    },
    'ammo-nac-10': {
      weight: 0.2,
    },
    'ammo-barracuda': {
      weight: 30,
    },
    'ammo-nac-25': {
      weight: 0.6,
    },
    'ammo-nac-40': {
      weight: 1.2,
    },
  },
  'weapons/energy-laser.json': {
    'improved-large-laser': {
      weight: 4,
      criticalSlots: 1,
    },
    'small-re-engineered-laser': {
      weight: 1.5,
      damage: 4,
    },
    'bombast-laser': {
      damage: 16,
    },
  },
  'weapons/missile-other.json': {
    'thunderbolt-5': {
      criticalSlots: 1,
    },
    'thunderbolt-15': {
      criticalSlots: 3,
    },
    'thunderbolt-10': {
      criticalSlots: 2,
    },
    'thunderbolt-20': {
      criticalSlots: 5,
    },
  },
  'weapons/energy-other.json': {
    'fluid-gun': {
      criticalSlots: 2,
      damage: 0,
    },
    'laser-ams': {
      damage: 3,
    },
    'battlemech-taser': {
      damage: 1,
    },
    'clan-laser-ams': {
      damage: 3,
    },
  },
  'ammunition/lrm.json': {
    'clan-streak-lrm-1': {
      battleValue: 0.016,
    },
    'clan-streak-lrm-11': {
      battleValue: 0.183,
    },
    'clan-streak-lrm-12': {
      battleValue: 0.2,
    },
    'clan-streak-lrm-13': {
      battleValue: 0.216,
    },
    'clan-streak-lrm-14': {
      battleValue: 0.233,
    },
    'clan-streak-lrm-16': {
      battleValue: 0.266,
    },
    'clan-streak-lrm-17': {
      battleValue: 0.283,
    },
    'clan-streak-lrm-18': {
      battleValue: 0.3,
    },
    'clan-streak-lrm-19': {
      battleValue: 0.316,
    },
    'clan-streak-lrm-2': {
      battleValue: 0.033,
    },
  },
};

for (const [file, items] of Object.entries(cases)) {
  const data: { items: Array<{ id: string } & Record<string, unknown>> } =
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    );
  describe(file, () => {
    it.each(Object.entries(items))('%s matches pinned Java', (id, expected) => {
      expect(data.items.find((item) => item.id === id)).toMatchObject(expected);
    });
  });
}

it('keeps binary component tech identity separate from shared availability', () => {
  expect(parseTechBase('BOTH')).toBe(TechBase.INNER_SPHERE);
  expect(parseTechBase('CLAN')).toBe(TechBase.CLAN);
});

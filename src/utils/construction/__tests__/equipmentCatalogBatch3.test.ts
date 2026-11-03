import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Catalog sweep batch 3: existing values corrected to pinned MegaMek 48fcb2f6.
// Each row is [field, Java value, Java source under megamek/common/].
const cases: Record<string, Record<string, [string, number, string][]>> = {
  'weapons/energy-ppc.json': {
    'snub-nose-ppc': [
      ['costCBills', 300000, 'weapons/ppc/innerSphere/ISSnubNosePPC.java:80'],
      ['ranges.medium', 13, 'weapons/ppc/innerSphere/ISSnubNosePPC.java:67'],
      ['ranges.short', 9, 'weapons/ppc/innerSphere/ISSnubNosePPC.java:66'],
    ],
  },
  'miscellaneous/other.json': {
    'free-worlds-league-infantry-kit-3035': [
      ['costCBills', 1830, 'equipment/MiscType.java:3507'],
    ],
    modulararmor: [['costCBills', 10000, 'equipment/MiscType.java:2534']],
    'risc-apds': [
      ['costCBills', 200000, 'weapons/other/innerSphere/ISAPDS.java:77'],
    ],
  },
  'weapons/ballistic-gauss.json': {
    'ap-gauss-rifle': [
      ['costCBills', 8500, 'weapons/gaussRifles/clan/CLAPGaussRifle.java:74'],
    ],
  },
  'weapons/energy-laser.json': {
    'medium-re-engineered-laser': [
      [
        'costCBills',
        100000,
        'weapons/lasers/innerSphere/medium/ISReengineeredLaserMedium.java:76',
      ],
    ],
    'small-re-engineered-laser': [
      [
        'costCBills',
        25000,
        'weapons/lasers/innerSphere/small/ISReengineeredLaserSmall.java:73',
      ],
    ],
  },
  'weapons/ballistic-other.json': {
    'sniper-cannon': [
      ['costCBills', 475000, 'weapons/artillery/SniperCannon.java:79'],
      ['criticalSlots', 10, 'weapons/artillery/SniperCannon.java:77'],
      ['ranges.minimum', 2, 'weapons/artillery/SniperCannon.java:71'],
      ['weight', 15, 'weapons/artillery/SniperCannon.java:76'],
    ],
    'thumper-cannon': [
      ['ranges.long', 14, 'weapons/artillery/ThumperCannon.java:74'],
      ['ranges.medium', 9, 'weapons/artillery/ThumperCannon.java:73'],
      ['ranges.minimum', 3, 'weapons/artillery/ThumperCannon.java:71'],
    ],
    'long-tom': [
      ['ranges.long', 20, 'weapons/artillery/LongTomCannon.java:78'],
      ['ranges.medium', 13, 'weapons/artillery/LongTomCannon.java:77'],
      ['ranges.minimum', 4, 'weapons/artillery/LongTomCannon.java:75'],
      ['ranges.short', 6, 'weapons/artillery/LongTomCannon.java:76'],
    ],
    'nail-rivet-gun': [
      ['costCBills', 7000, 'weapons/autoCannons/NailRivetGunWeapon.java:75'],
      ['ranges.long', 1, 'weapons/autoCannons/NailRivetGunWeapon.java:70'],
      ['ranges.medium', 1, 'weapons/autoCannons/NailRivetGunWeapon.java:69'],
      ['ranges.short', 1, 'weapons/autoCannons/NailRivetGunWeapon.java:68'],
    ],
  },
  'weapons/missile-other.json': {
    'thunderbolt-5': [
      [
        'ranges.long',
        18,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:76',
      ],
      [
        'ranges.medium',
        12,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:75',
      ],
      [
        'ranges.minimum',
        5,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:73',
      ],
      [
        'ranges.short',
        6,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:74',
      ],
    ],
    'thunderbolt-15': [
      [
        'ranges.long',
        18,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:76',
      ],
      [
        'ranges.medium',
        12,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:75',
      ],
      [
        'ranges.minimum',
        5,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:73',
      ],
      [
        'ranges.short',
        6,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:74',
      ],
    ],
    'thunderbolt-10': [
      [
        'ranges.long',
        18,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:76',
      ],
      [
        'ranges.medium',
        12,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:75',
      ],
      [
        'ranges.minimum',
        5,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:73',
      ],
      [
        'ranges.short',
        6,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:74',
      ],
    ],
    'thunderbolt-20': [
      [
        'ranges.long',
        18,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:76',
      ],
      [
        'ranges.medium',
        12,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:75',
      ],
      [
        'ranges.minimum',
        5,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:73',
      ],
      [
        'ranges.short',
        6,
        'weapons/missiles/thunderbolt/ThunderboltWeapon.java:74',
      ],
    ],
  },
  'electronics/ecm.json': {
    'watchdog-cews': [['costCBills', 500000, 'equipment/MiscType.java:6150']],
  },
  'weapons/missile-srm.json': {
    streaksrm3: [
      ['costCBills', 45000, 'weapons/srms/clan/streak/CLStreakSRM3.java:76'],
    ],
    streaksrm1: [
      ['costCBills', 15000, 'weapons/srms/clan/streak/CLStreakSRM1.java:76'],
    ],
    streaksrm5: [
      ['costCBills', 75000, 'weapons/srms/clan/streak/CLStreakSRM5.java:76'],
    ],
  },
  'weapons/energy-other.json': {
    'clan-er-flamer': [
      ['battleValue', 16, 'weapons/flamers/clan/CLERFlamer.java:73'],
    ],
  },
  'ammunition/atm.json': {
    'clan-ammo-iatm-12-imp': [
      ['costPerTon', 375000, 'equipment/AmmoType.java:7940'],
    ],
    'clan-ammo-iatm-3-imp': [
      ['costPerTon', 375000, 'equipment/AmmoType.java:7850'],
    ],
    'clan-ammo-iatm-6-imp': [
      ['costPerTon', 375000, 'equipment/AmmoType.java:7880'],
    ],
    'clan-ammo-iatm-9-imp': [
      ['costPerTon', 375000, 'equipment/AmmoType.java:7910'],
    ],
  },
};

const valueAt = (item: Record<string, unknown>, field: string): unknown =>
  field
    .split('.')
    .reduce<unknown>(
      (value, key) => (value as Record<string, unknown> | undefined)?.[key],
      item,
    );

describe('equipment catalog batch 3 matches pinned Java', () => {
  for (const [file, items] of Object.entries(cases)) {
    const catalog = JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ) as { items: Array<Record<string, unknown>> };
    for (const [id, rows] of Object.entries(items)) {
      it.each(rows)(`${id}.%s is %p (%s)`, (field, value) => {
        const matches = catalog.items.filter((item) => item.id === id);
        expect(matches).toHaveLength(1);
        expect(valueAt(matches[0], field)).toBe(value);
      });
    }
  }
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Catalog sweep batch 4: existing values corrected to pinned MegaMek 48fcb2f6.
// Each row is [field, Java value, Java source under megamek/common/].
type Row = [string, number | string | boolean, string];
const cases: Record<string, Record<string, Row[]>> = {
  'ammunition/gauss.json': {
    apgaussrifle: [['isExplosive', false, 'equipment/AmmoType.java:6325']],
    gauss: [['isExplosive', false, 'equipment/AmmoType.java:6194']],
    'heavy-gauss-ammo': [
      ['isExplosive', false, 'equipment/AmmoType.java:6295'],
    ],
    heavygauss: [['isExplosive', false, 'equipment/AmmoType.java:6295']],
    impgaussammo: [['isExplosive', false, 'equipment/AmmoType.java:14122']],
    improvedheavygauss: [
      ['isExplosive', false, 'equipment/AmmoType.java:6453'],
    ],
    'light-gauss': [['isExplosive', false, 'equipment/AmmoType.java:6265']],
    'light-gauss-ammo': [
      ['isExplosive', false, 'equipment/AmmoType.java:6265'],
    ],
    'silver-bullet-gauss': [
      ['isExplosive', false, 'equipment/AmmoType.java:6508'],
    ],
  },
  'ammunition/narc.json': {
    'compact-narc-ammo': [
      ['isExplosive', false, 'equipment/AmmoType.java:14286'],
    ],
  },
  'weapons/missile-other.json': {
    inarc: [['isExplosive', false, 'equipment/EquipmentType.java:175']],
    rl1: [
      [
        'criticalSlots',
        2,
        'weapons/battleArmor/innerSphere/barl/ISBARL1.java:71',
      ],
      ['weight', 0.025, 'weapons/battleArmor/innerSphere/barl/ISBARL1.java:70'],
    ],
    rl2: [
      [
        'criticalSlots',
        2,
        'weapons/battleArmor/innerSphere/barl/ISBARL2.java:71',
      ],
      ['weight', 0.05, 'weapons/battleArmor/innerSphere/barl/ISBARL2.java:70'],
    ],
    rl3: [
      [
        'criticalSlots',
        3,
        'weapons/battleArmor/innerSphere/barl/ISBARL3.java:71',
      ],
      ['weight', 0.075, 'weapons/battleArmor/innerSphere/barl/ISBARL3.java:70'],
    ],
    rl4: [
      [
        'criticalSlots',
        3,
        'weapons/battleArmor/innerSphere/barl/ISBARL4.java:71',
      ],
      ['weight', 0.1, 'weapons/battleArmor/innerSphere/barl/ISBARL4.java:70'],
    ],
    'thunderbolt-10-i-os': [
      [
        'criticalSlots',
        2,
        'weapons/missiles/thunderbolt/Thunderbolt10Weapon.java:48',
      ],
    ],
    'thunderbolt-10-os': [
      [
        'criticalSlots',
        2,
        'weapons/missiles/thunderbolt/Thunderbolt10Weapon.java:48',
      ],
    ],
    'thunderbolt-15-i-os': [
      [
        'criticalSlots',
        3,
        'weapons/missiles/thunderbolt/Thunderbolt15Weapon.java:48',
      ],
    ],
    'thunderbolt-15-os': [
      [
        'criticalSlots',
        3,
        'weapons/missiles/thunderbolt/Thunderbolt15Weapon.java:48',
      ],
    ],
    'thunderbolt-20-i-os': [
      [
        'criticalSlots',
        5,
        'weapons/missiles/thunderbolt/Thunderbolt20Weapon.java:48',
      ],
    ],
    'thunderbolt-20-os': [
      [
        'criticalSlots',
        5,
        'weapons/missiles/thunderbolt/Thunderbolt20Weapon.java:48',
      ],
    ],
    'thunderbolt-5-i-os': [
      [
        'criticalSlots',
        1,
        'weapons/missiles/thunderbolt/Thunderbolt5Weapon.java:48',
      ],
    ],
    'thunderbolt-5-os': [
      [
        'criticalSlots',
        1,
        'weapons/missiles/thunderbolt/Thunderbolt5Weapon.java:48',
      ],
    ],
  },
  'weapons/physical.json': {
    flail: [['criticalSlots', 4, 'equipment/MiscType.java:4018']],
    'wrecking-ball': [['criticalSlots', 5, 'equipment/MiscType.java:7870']],
  },
  'miscellaneous/myomer.json': {
    'industrial-tsm': [['criticalSlots', 12, 'equipment/MiscType.java:10078']],
  },
  'miscellaneous/other.json': {
    'clan-armor-kit-all': [
      ['rulesLevel', 'STANDARD', 'equipment/MiscType.java:3351'],
    ],
    'jump-booster-ba': [
      ['rulesLevel', 'STANDARD', 'equipment/MiscType.java:11931'],
    ],
    'detachable-weapon-pack': [
      ['rulesLevel', 'STANDARD', 'equipment/MiscType.java:12228'],
    ],
    'vehicular-sponson-turret': [
      ['rulesLevel', 'STANDARD', 'equipment/MiscType.java:10912'],
    ],
  },
  'weapons/energy-laser.json': {
    'medium-x-pulse-laser': [
      [
        'rulesLevel',
        'STANDARD',
        'weapons/lasers/innerSphere/medium/ISXPulseLaserMedium.java:92',
      ],
    ],
    'medium-heavy-laser': [
      [
        'rulesLevel',
        'STANDARD',
        'weapons/lasers/clan/medium/CLHeavyLaserMedium.java:94',
      ],
    ],
    'large-heavy-laser': [
      [
        'rulesLevel',
        'STANDARD',
        'weapons/lasers/clan/large/CLHeavyLaserLarge.java:95',
      ],
    ],
    'medium-vsp-laser': [
      [
        'rulesLevel',
        'STANDARD',
        'weapons/lasers/innerSphere/medium/ISVariableSpeedPulseLaserMedium.java:92',
      ],
    ],
    'large-vsp-laser': [
      [
        'rulesLevel',
        'STANDARD',
        'weapons/lasers/innerSphere/large/ISVariableSpeedPulseLaserLarge.java:94',
      ],
    ],
    'small-heavy-laser': [
      [
        'rulesLevel',
        'STANDARD',
        'weapons/lasers/clan/small/CLHeavyLaserSmall.java:94',
      ],
    ],
    'clan-er-medium-pulse-laser': [
      [
        'rulesLevel',
        'STANDARD',
        'weapons/lasers/clan/medium/CLERPulseLaserMedium.java:92',
      ],
    ],
    'large-x-pulse-laser': [
      [
        'rulesLevel',
        'STANDARD',
        'weapons/lasers/innerSphere/large/ISXPulseLaserLarge.java:93',
      ],
    ],
  },
  'miscellaneous/defensive.json': {
    'laser-ams': [
      [
        'rulesLevel',
        'STANDARD',
        'weapons/other/innerSphere/ISLaserAMS.java:100',
      ],
    ],
  },
  'weapons/energy-other.json': {
    'laser-ams': [
      [
        'rulesLevel',
        'STANDARD',
        'weapons/other/innerSphere/ISLaserAMS.java:100',
      ],
    ],
    'er-flamer': [
      [
        'rulesLevel',
        'STANDARD',
        'weapons/flamers/innerSphere/ISERFlamer.java:90',
      ],
    ],
    'tsemp-cannon': [
      [
        'rulesLevel',
        'ADVANCED',
        'weapons/other/innerSphere/ISTSEMPCannon.java:69',
      ],
    ],
  },
  'weapons/ballistic-other.json': {
    magshotgr: [
      [
        'rulesLevel',
        'STANDARD',
        'weapons/gaussRifles/innerSphere/ISMagshotGaussRifle.java:87',
      ],
    ],
  },
  'weapons/ballistic-gauss.json': {
    improvedheavygaussrifle: [
      [
        'rulesLevel',
        'STANDARD',
        'weapons/gaussRifles/innerSphere/ISImpHGaussRifle.java:97',
      ],
    ],
  },
  'electronics/c3.json': {
    battlearmorc3: [['rulesLevel', 'ADVANCED', 'equipment/MiscType.java:4668']],
  },
  'weapons/missile-lrm.json': {
    streaklrm15: [
      ['rulesLevel', 'STANDARD', 'weapons/lrms/StreakLRMWeapon.java:79'],
    ],
  },
};

describe('equipment catalog batch 4 matches pinned Java', () => {
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
        expect(matches[0][field]).toBe(value);
      });
    }
  }
});

import { spawnSync } from 'node:child_process';

import atlas from '../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import {
  customCombatSnapshotSchema,
  projectCustomCombatSnapshot,
} from '../CustomCombatSnapshot';
import { UnitContract } from '../index';

describe('pinned infantry converter contract', () => {
  it.each(
    Object.entries({
      motiveType: 'Leg',
      motionType: 'FOOT',
      beastMount: 'Beast:Horse',
      platoon: { squadSize: 7, squadCount: 4, totalTroopers: 28 },
      primaryWeapon: { id: 'rifle', name: 'Rifle' },
      secondaryWeapon: { id: 'tag', name: 'TAG', count: 1 },
      customArmorDamageDivisor: 1,
      damageDivisor: 1,
      armorKit: 'Generic Infantry Kit',
      armorFlags: [],
      effectiveArmorFlags: [],
      specializations: 0,
      augmentations: [],
      prostheticEnhancements: {},
      prostheticEnhancementCounts: {},
      srmMunition: 'Standard',
      disposableWeapon: 'Disposable',
      customArmorName: 'Custom',
    }),
  )(
    'keeps %s out of the strict BattleMech contract and recorded snapshot',
    (key, value) => {
      const mech = UnitContract.options[0];
      expect(mech.shape).not.toHaveProperty(key);
      const construction = mech.strip().parse(atlas);
      expect(
        mech.strict().safeParse({ ...construction, [key]: value }).success,
      ).toBe(false);
      const snapshot = projectCustomCombatSnapshot(atlas);
      expect(snapshot).not.toBeNull();
      expect(
        customCombatSnapshotSchema.safeParse({ ...snapshot, [key]: value })
          .success,
      ).toBe(false);
    },
  );

  it('accepts and retains every infantry source fact', () => {
    const result = spawnSync(
      'python',
      [
        '-B',
        '-c',
        `import json,sys,logging,tempfile
from pathlib import Path
sys.path.insert(0, 'scripts/megameklab-conversion')
from blk_infantry_converter import convert_infantry_blk
fixtures=json.loads(Path('scripts/__tests__/fixtures/blk_infantry.json').read_text(encoding='utf-8'))
units=[]
with tempfile.TemporaryDirectory() as directory:
    source=Path(directory)/'unit.blk'
    for fixture in fixtures:
        source.write_text(fixture['body'],encoding='utf-8')
        units.append(convert_infantry_blk(source,logging.getLogger('contract')))
print(json.dumps(units))`,
      ],
      { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
    );
    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const units: unknown = JSON.parse(result.stdout);
    if (!Array.isArray(units)) throw new Error('Expected converted fixtures');
    expect(units).toHaveLength(45);
    for (const unit of units) {
      const parsed = UnitContract.parse(unit);
      expect(parsed).toEqual(unit);
      for (const invalid of [
        { ...parsed, damageDivisor: -1 },
        { ...parsed, specializations: 'Mountain' },
        { ...parsed, augmentations: [true] },
        { ...parsed, prostheticEnhancementCounts: { slot: 0 } },
        { ...parsed, secondaryWeapon: { id: 'tag', name: 'TAG', count: 0.5 } },
        { ...parsed, platoon: { squadSize: 7, squadCount: 4 } },
      ]) {
        expect(UnitContract.safeParse(invalid).success).toBe(false);
      }
    }
  });
});

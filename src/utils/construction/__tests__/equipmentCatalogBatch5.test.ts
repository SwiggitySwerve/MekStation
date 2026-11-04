import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Catalog sweep batch 5: existing values corrected to pinned MegaMek 48fcb2f6.
// Each row is [field, Java value, Java source under megamek/common/].
type Row = [string, number | string | boolean, string];
const cases: Record<string, Record<string, Row[]>> = {
  'weapons/missile-srm.json': {
    'clan-srm-1': [['ammoPerTon', 100, 'equipment/AmmoType.java:9910']],
    'clan-srm-3': [['ammoPerTon', 100, 'equipment/AmmoType.java:9970']],
    'clan-srm-5': [['ammoPerTon', 100, 'equipment/AmmoType.java:10030']],
  },
  'miscellaneous/defensive.json': {
    'reactive-armor': [
      ['introductionYear', 3063, 'equipment/ArmorType.java:813'],
    ],
  },
};

describe('equipment catalog batch 5 matches pinned Java', () => {
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

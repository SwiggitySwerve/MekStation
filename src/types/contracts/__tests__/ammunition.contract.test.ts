/**
 * ammunition.contract.test.ts
 *
 * Round-trip tests for the ammunition contract (PR-A2 of the
 * cross-language schema bridge). The fixture set covers every
 * ammunition file in `public/data/equipment/official/ammunition/`
 * plus a negative control. The same `knownDriftIds` mechanism used
 * by the weapon test is preserved so any future drift can be
 * documented before being fixed.
 *
 * If the schema and the corpus disagree on day one, the failure
 * surfaces here before any consumer touches the data.
 */

import fs from 'node:fs';
import path from 'node:path';

import { AmmunitionContract } from '@/types/contracts';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const AMMO_DIR = path.join(
  REPO_ROOT,
  'public',
  'data',
  'equipment',
  'official',
  'ammunition',
);

interface IRawAmmoFile {
  $schema?: string;
  version?: string;
  generatedAt?: string;
  count?: number;
  items: unknown[];
}

function loadAmmoFile(fileName: string): IRawAmmoFile {
  const fullPath = path.join(AMMO_DIR, fileName);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(raw) as IRawAmmoFile;
}

// One fixture per category file in the corpus. PR-A2 fixed the schema
// to match canonical reality (empty compatibleWeaponIds, 'Energy'
// category, sentinel introductionYears) so `knownDriftIds` should be
// empty across the board. Any future regression surfaces here.
const FIXTURES = [
  { file: 'artillery.json', label: 'Artillery', knownDriftIds: [] },
  { file: 'atm.json', label: 'ATM', knownDriftIds: [] },
  { file: 'autocannon.json', label: 'Autocannon', knownDriftIds: [] },
  { file: 'gauss.json', label: 'Gauss', knownDriftIds: [] },
  { file: 'lrm.json', label: 'LRM', knownDriftIds: [] },
  { file: 'machinegun.json', label: 'Machine Gun', knownDriftIds: [] },
  { file: 'mrm.json', label: 'MRM', knownDriftIds: [] },
  { file: 'narc.json', label: 'NARC', knownDriftIds: [] },
  { file: 'other.json', label: 'Other (AMS/Energy)', knownDriftIds: [] },
  { file: 'srm.json', label: 'SRM', knownDriftIds: [] },
] as const;

describe('AmmunitionContract round-trip', () => {
  for (const fixture of FIXTURES) {
    describe(`${fixture.label} (${fixture.file})`, () => {
      const file = loadAmmoFile(fixture.file);

      it('has a non-empty `items` array', () => {
        expect(Array.isArray(file.items)).toBe(true);
        expect(file.items.length).toBeGreaterThan(0);
      });

      it('parses every non-drifting ammo through AmmunitionContract', () => {
        const knownDriftSet = new Set<string>(fixture.knownDriftIds);
        const failures: { index: number; id: unknown; issues: unknown }[] = [];
        const unexpectedlyPassedDrift: unknown[] = [];

        file.items.forEach((item, index) => {
          const id = (item as { id?: unknown })?.id;
          const isKnownDrift = typeof id === 'string' && knownDriftSet.has(id);
          const result = AmmunitionContract.safeParse(item);

          if (isKnownDrift) {
            if (result.success) unexpectedlyPassedDrift.push(id);
            return;
          }
          if (!result.success) {
            failures.push({
              index,
              id,
              issues: result.error.issues,
            });
          }
        });

        if (unexpectedlyPassedDrift.length > 0) {
          throw new Error(
            `Items in \`knownDriftIds\` for ${fixture.file} now parse cleanly. ` +
              `Remove them from \`knownDriftIds\`: ${unexpectedlyPassedDrift.join(', ')}`,
          );
        }
        if (failures.length > 0) {
          throw new Error(
            `AmmunitionContract.safeParse failed for ${failures.length} item(s) in ${fixture.file}:\n` +
              JSON.stringify(failures.slice(0, 3), null, 2),
          );
        }
        expect(failures).toHaveLength(0);
      });

      it('first item parses as a typed contract instance', () => {
        const result = AmmunitionContract.safeParse(file.items[0]);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data.id).toBe('string');
          expect(typeof result.data.name).toBe('string');
          // `category` is one of the enum values from the JSON Schema.
          expect([
            'Autocannon',
            'Gauss',
            'Machine Gun',
            'LRM',
            'SRM',
            'MRM',
            'ATM',
            'NARC',
            'Artillery',
            'AMS',
            'Energy',
          ]).toContain(result.data.category);
        }
      });
    });
  }

  it('rejects an ammunition with an unknown category (negative control)', () => {
    const bogus = {
      id: 'fake-ammo',
      name: 'Fake Ammo',
      category: 'NotARealCategory',
      variant: 'Standard',
      techBase: 'INNER_SPHERE',
      rulesLevel: 'STANDARD',
      compatibleWeaponIds: ['fake-weapon'],
      shotsPerTon: 100,
      weight: 1,
      criticalSlots: 1,
      costPerTon: 1000,
      battleValue: 1,
      isExplosive: false,
      introductionYear: 3000,
    };
    const result = AmmunitionContract.safeParse(bogus);
    expect(result.success).toBe(false);
  });
});

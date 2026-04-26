/**
 * electronics.contract.test.ts
 *
 * Round-trip tests for the electronics contract (PR-A2 of the
 * cross-language schema bridge). Covers active-probe / C3 / ECM /
 * other catalogue files plus a negative control. Same `knownDriftIds`
 * pattern as the weapon test — empty after PR-A2 corpus alignment.
 */

import fs from 'node:fs';
import path from 'node:path';

import { ElectronicsContract } from '@/types/contracts';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const ELEC_DIR = path.join(
  REPO_ROOT,
  'public',
  'data',
  'equipment',
  'official',
  'electronics',
);

interface IRawElecFile {
  $schema?: string;
  version?: string;
  generatedAt?: string;
  count?: number;
  items: unknown[];
}

function loadElecFile(fileName: string): IRawElecFile {
  const fullPath = path.join(ELEC_DIR, fileName);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(raw) as IRawElecFile;
}

const FIXTURES = [
  { file: 'active-probe.json', label: 'Active Probe', knownDriftIds: [] },
  { file: 'c3.json', label: 'C3 System', knownDriftIds: [] },
  { file: 'ecm.json', label: 'ECM', knownDriftIds: [] },
  { file: 'other.json', label: 'Other', knownDriftIds: [] },
] as const;

describe('ElectronicsContract round-trip', () => {
  for (const fixture of FIXTURES) {
    describe(`${fixture.label} (${fixture.file})`, () => {
      const file = loadElecFile(fixture.file);

      it('has a non-empty `items` array', () => {
        expect(Array.isArray(file.items)).toBe(true);
        expect(file.items.length).toBeGreaterThan(0);
      });

      it('parses every non-drifting electronics item through ElectronicsContract', () => {
        const knownDriftSet = new Set<string>(fixture.knownDriftIds);
        const failures: { index: number; id: unknown; issues: unknown }[] = [];
        const unexpectedlyPassedDrift: unknown[] = [];

        file.items.forEach((item, index) => {
          const id = (item as { id?: unknown })?.id;
          const isKnownDrift = typeof id === 'string' && knownDriftSet.has(id);
          const result = ElectronicsContract.safeParse(item);

          if (isKnownDrift) {
            if (result.success) unexpectedlyPassedDrift.push(id);
            return;
          }
          if (!result.success) {
            failures.push({ index, id, issues: result.error.issues });
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
            `ElectronicsContract.safeParse failed for ${failures.length} item(s) in ${fixture.file}:\n` +
              JSON.stringify(failures.slice(0, 3), null, 2),
          );
        }
        expect(failures).toHaveLength(0);
      });

      it('first item parses as a typed contract instance', () => {
        const result = ElectronicsContract.safeParse(file.items[0]);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data.id).toBe('string');
          expect(typeof result.data.name).toBe('string');
        }
      });
    });
  }

  it('rejects electronics with an unknown category (negative control)', () => {
    const bogus = {
      id: 'fake-electronics',
      name: 'Fake Electronics',
      category: 'NotARealCategory',
      techBase: 'INNER_SPHERE',
      rulesLevel: 'STANDARD',
      weight: 1,
      criticalSlots: 1,
      costCBills: 1000,
      battleValue: 1,
      introductionYear: 3000,
    };
    const result = ElectronicsContract.safeParse(bogus);
    expect(result.success).toBe(false);
  });
});

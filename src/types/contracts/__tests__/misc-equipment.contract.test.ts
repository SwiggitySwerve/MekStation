/**
 * misc-equipment.contract.test.ts
 *
 * Round-trip tests for the misc-equipment contract (PR-A2 of the
 * cross-language schema bridge). Covers heat-sinks / jump-jets /
 * movement / myomer / defensive / catch-all-other catalogue files
 * plus a negative control.
 */

import fs from 'node:fs';
import path from 'node:path';

import { MiscEquipmentContract } from '@/types/contracts';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const MISC_DIR = path.join(
  REPO_ROOT,
  'public',
  'data',
  'equipment',
  'official',
  'miscellaneous',
);

interface IRawMiscFile {
  $schema?: string;
  version?: string;
  generatedAt?: string;
  count?: number;
  items: unknown[];
}

function loadMiscFile(fileName: string): IRawMiscFile {
  const fullPath = path.join(MISC_DIR, fileName);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(raw) as IRawMiscFile;
}

const FIXTURES = [
  { file: 'defensive.json', label: 'Defensive', knownDriftIds: [] },
  { file: 'heat-sinks.json', label: 'Heat Sinks', knownDriftIds: [] },
  { file: 'jump-jets.json', label: 'Jump Jets', knownDriftIds: [] },
  { file: 'movement.json', label: 'Movement', knownDriftIds: [] },
  { file: 'myomer.json', label: 'Myomer', knownDriftIds: [] },
  { file: 'other.json', label: 'Other (catch-all)', knownDriftIds: [] },
] as const;

describe('MiscEquipmentContract round-trip', () => {
  for (const fixture of FIXTURES) {
    describe(`${fixture.label} (${fixture.file})`, () => {
      const file = loadMiscFile(fixture.file);

      it('has a non-empty `items` array', () => {
        expect(Array.isArray(file.items)).toBe(true);
        expect(file.items.length).toBeGreaterThan(0);
      });

      it('parses every non-drifting misc item through MiscEquipmentContract', () => {
        const knownDriftSet = new Set<string>(fixture.knownDriftIds);
        const failures: { index: number; id: unknown; issues: unknown }[] = [];
        const unexpectedlyPassedDrift: unknown[] = [];

        file.items.forEach((item, index) => {
          const id = (item as { id?: unknown })?.id;
          const isKnownDrift = typeof id === 'string' && knownDriftSet.has(id);
          const result = MiscEquipmentContract.safeParse(item);

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
            `MiscEquipmentContract.safeParse failed for ${failures.length} item(s) in ${fixture.file}:\n` +
              JSON.stringify(failures.slice(0, 3), null, 2),
          );
        }
        expect(failures).toHaveLength(0);
      });

      it('first item parses as a typed contract instance', () => {
        const result = MiscEquipmentContract.safeParse(file.items[0]);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data.id).toBe('string');
          expect(typeof result.data.name).toBe('string');
          expect([
            'Heat Sink',
            'Jump Jet',
            'Movement Enhancement',
            'Defensive',
            'Myomer',
            'Industrial',
            'Miscellaneous',
          ]).toContain(result.data.category);
        }
      });
    });
  }

  it('rejects misc equipment with an unknown category (negative control)', () => {
    const bogus = {
      id: 'fake-misc',
      name: 'Fake Misc',
      category: 'NotARealCategory',
      techBase: 'INNER_SPHERE',
      rulesLevel: 'STANDARD',
      weight: 1,
      criticalSlots: 1,
      costCBills: 1000,
      battleValue: 1,
      introductionYear: 3000,
    };
    const result = MiscEquipmentContract.safeParse(bogus);
    expect(result.success).toBe(false);
  });
});

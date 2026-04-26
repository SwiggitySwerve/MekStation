/**
 * physical-weapon.contract.test.ts
 *
 * Round-trip tests for the physical-weapon contract (PR-A2 of the
 * cross-language schema bridge). Physical weapons live inside
 * `weapons/physical.json` (a sibling of the regular weapon catalogue
 * files) and use a different shape — formula-driven weight/damage
 * instead of fixed values, plus mounting requirements.
 */

import fs from 'node:fs';
import path from 'node:path';

import { PhysicalWeaponContract } from '@/types/contracts';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const WEAPONS_DIR = path.join(
  REPO_ROOT,
  'public',
  'data',
  'equipment',
  'official',
  'weapons',
);

interface IRawPhysFile {
  $schema?: string;
  version?: string;
  generatedAt?: string;
  count?: number;
  items: unknown[];
}

function loadPhysFile(fileName: string): IRawPhysFile {
  const fullPath = path.join(WEAPONS_DIR, fileName);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(raw) as IRawPhysFile;
}

const FIXTURES = [
  {
    file: 'physical.json',
    label: 'Physical (Hatchet/Sword/Claws/Mace/...)',
    knownDriftIds: [],
  },
] as const;

describe('PhysicalWeaponContract round-trip', () => {
  for (const fixture of FIXTURES) {
    describe(`${fixture.label} (${fixture.file})`, () => {
      const file = loadPhysFile(fixture.file);

      it('has a non-empty `items` array', () => {
        expect(Array.isArray(file.items)).toBe(true);
        expect(file.items.length).toBeGreaterThan(0);
      });

      it('parses every non-drifting physical weapon through PhysicalWeaponContract', () => {
        const knownDriftSet = new Set<string>(fixture.knownDriftIds);
        const failures: { index: number; id: unknown; issues: unknown }[] = [];
        const unexpectedlyPassedDrift: unknown[] = [];

        file.items.forEach((item, index) => {
          const id = (item as { id?: unknown })?.id;
          const isKnownDrift = typeof id === 'string' && knownDriftSet.has(id);
          const result = PhysicalWeaponContract.safeParse(item);

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
            `PhysicalWeaponContract.safeParse failed for ${failures.length} item(s) in ${fixture.file}:\n` +
              JSON.stringify(failures.slice(0, 3), null, 2),
          );
        }
        expect(failures).toHaveLength(0);
      });

      it('first item parses as a typed contract instance', () => {
        const result = PhysicalWeaponContract.safeParse(file.items[0]);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data.id).toBe('string');
          expect(typeof result.data.name).toBe('string');
          expect([
            'Hatchet',
            'Sword',
            'Claws',
            'Mace',
            'Lance',
            'Flail',
            'Wrecking Ball',
            'Talons',
            'Retractable Blade',
          ]).toContain(result.data.type);
        }
      });
    });
  }

  it('rejects a physical weapon with an unknown type (negative control)', () => {
    const bogus = {
      id: 'fake-physical',
      type: 'NotARealType',
      name: 'Fake Physical',
      techBase: 'INNER_SPHERE',
      rulesLevel: 'STANDARD',
      weightFormula: 'tonnage_divisor',
      damageFormula: 'tonnage_divisor',
      criticalSlots: 1,
      requiresLowerArm: false,
      requiresHand: false,
      validLocations: ['LEFT_ARM', 'RIGHT_ARM'],
      introductionYear: 3000,
    };
    const result = PhysicalWeaponContract.safeParse(bogus);
    expect(result.success).toBe(false);
  });
});

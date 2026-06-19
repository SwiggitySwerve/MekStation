/**
 * weapon.contract.test.ts
 *
 * Round-trip tests for the weapon contract (PR-A1 of the cross-language
 * schema bridge). Each fixture is a real weapon file under
 * `public/data/equipment/official/weapons/`. The test asserts:
 *
 *   1. The wrapper is a valid `IEquipmentFile<weapon>` shape (basic).
 *   2. Every `items[]` entry parses cleanly through `WeaponContract`.
 *   3. The first item is sampled directly to keep failure messages
 *      readable when a single weapon drifts.
 *
 * Five fixtures are picked to cover the full weapon-category spectrum
 * (Energy/Laser, Energy/PPC, Ballistic/Autocannon, Ballistic/MachineGun,
 * Missile/LRM, Physical) and all rules-levels (INTRODUCTORY → STANDARD).
 *
 * If `json-schema-to-zod` over-strictly infers a property (e.g. emits
 * `string` where the data has `string | null`), the failure surfaces
 * here on day one — which is the entire point of the pilot.
 */

import fs from 'node:fs';
import path from 'node:path';

import { WeaponContract } from '@/types/contracts';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const WEAPONS_DIR = path.join(
  REPO_ROOT,
  'public',
  'data',
  'equipment',
  'official',
  'weapons',
);

interface IRawWeaponFile {
  $schema?: string;
  version?: string;
  generatedAt?: string;
  count?: number;
  items: unknown[];
}

function loadWeaponFile(fileName: string): IRawWeaponFile {
  const fullPath = path.join(WEAPONS_DIR, fileName);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(raw) as IRawWeaponFile;
}

// Fixtures span the weapon-category enum used by `weapon-schema.json`
// (Energy/Ballistic/Missile/Artillery) and the rules-level spectrum so
// any drift in any axis fails fast. Note: `physical.json` is intentionally
// excluded — physical weapons live in a sibling shape covered by
// `physical-weapon-schema.json`, which is wired to its own contract in
// PR-A2.
//
// `knownDriftIds` lists item ids that the pilot has confirmed do NOT
// conform to the canonical schema today (corpus drift to be fixed by
// PR-A2). Per the cross-language schema bridge plan, PR-A1 surfaces
// drift but does not block on it; PR-A2 flips the gate strict and
// patches the data. Each entry below is a concrete PR-A2 data repair note.
const FIXTURES = [
  {
    file: 'energy-laser.json',
    label: 'Energy/Laser',
    // PR-A2 fixed the 6 X-Pulse + VSP laser entries that were missing
    // `costCBills` (values sourced from MegaMek Java equipment classes)
    // and flipped the schema-bridge CI job to --strict, so the corpus
    // is now drift-free for the weapon shape.
    knownDriftIds: [],
  },
  { file: 'energy-ppc.json', label: 'Energy/PPC', knownDriftIds: [] },
  {
    file: 'ballistic-autocannon.json',
    label: 'Ballistic/Autocannon',
    knownDriftIds: [],
  },
  {
    file: 'ballistic-machinegun.json',
    label: 'Ballistic/MachineGun',
    knownDriftIds: [],
  },
  { file: 'missile-lrm.json', label: 'Missile/LRM', knownDriftIds: [] },
] as const;

describe('WeaponContract round-trip', () => {
  for (const fixture of FIXTURES) {
    describe(`${fixture.label} (${fixture.file})`, () => {
      const file = loadWeaponFile(fixture.file);

      it('has a non-empty `items` array', () => {
        expect(Array.isArray(file.items)).toBe(true);
        expect(file.items.length).toBeGreaterThan(0);
      });

      it('parses every non-drifting weapon through WeaponContract', () => {
        const knownDriftSet = new Set<string>(fixture.knownDriftIds);
        const failures: { index: number; id: unknown; issues: unknown }[] = [];
        const unexpectedlyPassedDrift: unknown[] = [];

        file.items.forEach((item, index) => {
          const id = (item as { id?: unknown })?.id;
          const isKnownDrift = typeof id === 'string' && knownDriftSet.has(id);
          const result = WeaponContract.safeParse(item);

          if (isKnownDrift) {
            // If a known-drifting weapon now parses, that's good news —
            // surface it so PR-A2 (or whoever fixed it) can prune
            // `knownDriftIds`.
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
          // Surface the first few failures inline; full list is in the assert msg.
          // Keeping this readable matters because PR-A2 reuses the same shape.
          throw new Error(
            `WeaponContract.safeParse failed for ${failures.length} item(s) in ${fixture.file}:\n` +
              JSON.stringify(failures.slice(0, 3), null, 2),
          );
        }
        expect(failures).toHaveLength(0);
      });

      it('first item parses as a typed contract instance', () => {
        // Sampling the first item gives a deterministic single failure
        // message when an entire file regresses.
        const result = WeaponContract.safeParse(file.items[0]);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data.id).toBe('string');
          expect(typeof result.data.name).toBe('string');
          // Category is one of the enum values from the JSON Schema.
          expect([
            'Energy',
            'Ballistic',
            'Missile',
            'Physical',
            'Artillery',
          ]).toContain(result.data.category);
        }
      });
    });
  }

  it('rejects a weapon with an unknown category (negative control)', () => {
    // Negative control proves the schema is actually rejecting things
    // and not just returning success on every input.
    const bogus = {
      id: 'fake-weapon',
      name: 'Fake Weapon',
      category: 'Nonsense',
      subType: 'X',
      techBase: 'INNER_SPHERE',
      rulesLevel: 'STANDARD',
      damage: 1,
      heat: 0,
      ranges: { minimum: 0, short: 1, medium: 2, long: 3 },
      weight: 1,
      criticalSlots: 1,
      costCBills: 1,
      battleValue: 1,
      introductionYear: 3000,
    };
    const result = WeaponContract.safeParse(bogus);
    expect(result.success).toBe(false);
  });
});

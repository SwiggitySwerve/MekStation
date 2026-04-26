/**
 * unit.contract.test.ts
 *
 * Round-trip tests for the unit contract (PR-A2 of the cross-language
 * schema bridge). The unit corpus lives at `public/data/units/**` —
 * one unit per JSON file, no wrapping `items[]` array.
 *
 * Two modes:
 *   1. Per-unitType representative fixtures (BattleMech, Battle Armor,
 *      Infantry) — fast, deterministic; surfaces a clear single failure
 *      message when one type regresses.
 *   2. Full-corpus walk (BattleMech tree only, 4k+ files) — proves the
 *      contract holds under scale. Capped to BattleMech because Battle
 *      Armor / Infantry shapes diverge significantly and PR-A2 keeps
 *      the contract's `oneOf` permissive (additionalProperties: true)
 *      for those types so they pass the universal id+unitType check.
 *
 * `knownDriftIds` mirrors the weapon test pattern. PR-A2 closed the
 * 138 unit-corpus failures surfaced by an initial walk:
 *   - 8 mojibake unit IDs got ASCII-fied (Götterdämmerung x3, Gùn x3,
 *     Araña x1, Dökkálfar x1)
 *   - 3 infantry files had lowercase techBase / rulesLevel values
 *   - Schema added missing armor types (HEAVY_INDUSTRIAL, COMMERCIAL,
 *     IMPACT_RESISTANT, FERRO_LAMELLOR), cockpit (PRIMITIVE_INDUSTRIAL),
 *     structure (ENDO_COMPOSITE_CLAN), unitType (BATTLEARMOR uppercase)
 *   - Schema relaxed mech-only required fields via conditional `allOf`
 */

import fs from 'node:fs';
import path from 'node:path';

import { UnitContract } from '@/types/contracts';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const UNITS_ROOT = path.join(REPO_ROOT, 'public', 'data', 'units');

function readUnit(relPath: string): unknown {
  const fullPath = path.join(UNITS_ROOT, relPath);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(raw);
}

// One representative fixture per unitType present in the corpus today.
// PR-A2 schema makes mech-rich fields conditional on unitType, so each
// of these should parse cleanly.
const REPRESENTATIVE_FIXTURES = [
  {
    label: 'BattleMech (Annihilator ANH-1G)',
    relPath: 'battlemechs/3-succession-wars/advanced/Annihilator ANH-1G.json',
  },
  {
    label: 'BATTLEARMOR (Clan Sylph Squad-5)',
    relPath: 'battlearmor/clan-sylph-sqd5.json',
  },
  {
    label: 'Infantry (Foot Rifle Platoon)',
    relPath: 'infantry/foot-rifle-platoon.json',
  },
];

function listAllJsonFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listAllJsonFiles(full));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.json') &&
      entry.name !== 'index.json'
    ) {
      files.push(full);
    }
  }
  return files;
}

describe('UnitContract round-trip', () => {
  describe('Per-unitType representative fixtures', () => {
    for (const fixture of REPRESENTATIVE_FIXTURES) {
      it(`${fixture.label} parses through UnitContract`, () => {
        const unit = readUnit(fixture.relPath);
        const result = UnitContract.safeParse(unit);
        if (!result.success) {
          throw new Error(
            `UnitContract.safeParse failed for ${fixture.relPath}:\n` +
              JSON.stringify(result.error.issues.slice(0, 5), null, 2),
          );
        }
        expect(result.success).toBe(true);
      });
    }
  });

  describe('Full BattleMech corpus walk', () => {
    // Skip if the corpus is missing (e.g. shallow checkout); CI always
    // has it via the setup-node-and-install action's fetch-assets.
    const battlemechsDir = path.join(UNITS_ROOT, 'battlemechs');
    const corpusAvailable = fs.existsSync(battlemechsDir);

    (corpusAvailable ? it : it.skip)(
      'every BattleMech file parses through UnitContract',
      () => {
        const files = listAllJsonFiles(battlemechsDir);
        expect(files.length).toBeGreaterThan(0);

        const failures: { file: string; id: unknown; issue: unknown }[] = [];
        for (const fp of files) {
          const raw = fs.readFileSync(fp, 'utf-8');
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            failures.push({
              file: path.relative(REPO_ROOT, fp),
              id: '<file>',
              issue: `JSON parse error: ${e}`,
            });
            continue;
          }
          const result = UnitContract.safeParse(parsed);
          if (!result.success) {
            failures.push({
              file: path.relative(REPO_ROOT, fp),
              id: (parsed as { id?: unknown })?.id,
              // First issue keeps the failure summary readable.
              issue: result.error.issues[0],
            });
          }
        }

        if (failures.length > 0) {
          throw new Error(
            `UnitContract.safeParse failed for ${failures.length} unit file(s):\n` +
              JSON.stringify(failures.slice(0, 5), null, 2),
          );
        }
        expect(failures).toHaveLength(0);
      },
      // Allow extra time — full walk parses ~4k JSON files.
      30_000,
    );
  });

  it('rejects a unit with an unknown unitType (negative control)', () => {
    const bogus = { id: 'fake-unit', unitType: 'NotARealUnitType' };
    const result = UnitContract.safeParse(bogus);
    expect(result.success).toBe(false);
  });

  it('rejects a unit missing required id (negative control)', () => {
    const bogus = { unitType: 'BattleMech' };
    const result = UnitContract.safeParse(bogus);
    expect(result.success).toBe(false);
  });
});

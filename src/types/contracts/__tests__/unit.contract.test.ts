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
 *   2. Full-corpus walk (every indexed unit of all seven families, ~9.8k
 *      files) — proves the contract holds under scale, and that the
 *      browser service's runtime shape guard accepts every bundled unit.
 *      The non-mech branches stay permissive (additionalProperties: true)
 *      so those types pass the universal id+unitType check.
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

import { assertUnitShape } from '@/services/units/unitShapeGuard';
import { UnitContract } from '@/types/contracts';
import { UNIT_FAMILIES, type UnitFamily } from '@/types/unit/UnitIndex';

// cwd is the repo root under Jest (as unit.tonnage.contract.test.ts relies on).
// Climbing out of __dirname with `..` made the cache key cover the whole repo,
// so this 76 s suite re-ran on every change anywhere; it reads only public/data.
const REPO_ROOT = process.cwd();
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

  describe('Full corpus walk (every indexed unit of every family)', () => {
    // Skip if the corpus is missing (e.g. shallow checkout); CI always
    // has it via the setup-node-and-install action's fetch-assets.
    const corpusAvailable = fs.existsSync(UNITS_ROOT);

    // The browser CanonicalUnitService validates only a cheap shape guard at
    // runtime (the full contract costs ~2 ms per BattleMech); this walk is
    // where every bundled unit meets the full contract, and it also proves the
    // guard accepts every bundled unit.
    (corpusAvailable ? it.each : it.skip.each)([...UNIT_FAMILIES])(
      'every indexed %s unit parses through UnitContract and passes the runtime shape guard',
      (family: UnitFamily) => {
        const dir = path.join(UNITS_ROOT, family);
        const index = JSON.parse(
          fs.readFileSync(path.join(dir, 'index.json'), 'utf-8'),
        ) as { totalUnits: number; units: { id: string; path: string }[] };
        expect(index.units.length).toBeGreaterThan(0);
        expect(index.units).toHaveLength(index.totalUnits);

        const failures: { file: string; id: unknown; issue: unknown }[] = [];
        let validated = 0;
        for (const row of index.units) {
          const file = path.relative(REPO_ROOT, path.join(dir, row.path));
          let parsed: unknown;
          try {
            parsed = JSON.parse(
              fs.readFileSync(path.join(dir, row.path), 'utf-8'),
            );
          } catch (e) {
            failures.push({
              file,
              id: row.id,
              issue: `JSON read/parse error: ${e}`,
            });
            continue;
          }
          const result = UnitContract.safeParse(parsed);
          if (!result.success) {
            failures.push({
              file,
              id: row.id,
              // First issue keeps the failure summary readable.
              issue: result.error.issues[0],
            });
            continue;
          }
          try {
            assertUnitShape(parsed, { id: row.id, family }, file);
          } catch (e) {
            failures.push({ file, id: row.id, issue: String(e) });
            continue;
          }
          validated++;
        }

        if (failures.length > 0) {
          throw new Error(
            `${family}: ${failures.length} unit file(s) failed the contract or the shape guard:\n` +
              JSON.stringify(failures.slice(0, 5), null, 2),
          );
        }
        // Every indexed unit was actually validated, none skipped.
        expect(validated).toBe(index.units.length);
      },
      // Allow extra time — the BattleMech walk parses ~4.3k JSON files.
      60_000,
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

  it('rejects armor without a concrete layout', () => {
    const bogus = {
      id: 'fake-unit',
      unitType: 'Vehicle',
      armor: {
        type: 'STANDARD',
      },
    };
    const result = UnitContract.safeParse(bogus);
    expect(result.success).toBe(false);
  });
});

/**
 * NodeCanonicalUnitService — unit-JSON boundary validation tests.
 *
 * Boundary: bundled unit JSON loaded from disk. Failure mode under test —
 * a malformed unit file fails loud at the loader with a precise error naming
 * the offending field path (`validation-patterns` — "Malformed unit JSON
 * fails loudly at load"), while a missing file still returns `null`.
 *
 * The tests build a throwaway catalog directory under the OS temp dir with a
 * hand-written `index.json` and unit files, then point the service's
 * `baseDir` at it.
 *
 * @spec openspec/specs/validation-patterns/spec.md
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { NodeCanonicalUnitService } from '../NodeCanonicalUnitService';
import { UnitContractParseError } from '../unitLoaderService/unitContractAdapter';

// A minimal but contract-valid BattleMech unit (id non-empty + valid unitType).
const VALID_UNIT = {
  id: 'test-valid-mech',
  chassis: 'Atlas',
  model: 'AS7-D',
  unitType: 'BattleMech',
  tonnage: 100,
};

// Malformed: `unitType` is not a member of the contract enum.
const MALFORMED_UNIT = {
  id: 'test-malformed-mech',
  chassis: 'Atlas',
  unitType: 'NotARealUnitType',
};

/**
 * Build a throwaway catalog rooted at a fresh temp dir. Returns the base dir
 * to hand to the service constructor (the service appends
 * `public/data/units/battlemechs`).
 */
function makeTempCatalog(): string {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mek-boundary-'));
  const catalogDir = path.join(
    baseDir,
    'public',
    'data',
    'units',
    'battlemechs',
  );
  fs.mkdirSync(catalogDir, { recursive: true });

  fs.writeFileSync(
    path.join(catalogDir, 'valid.json'),
    JSON.stringify(VALID_UNIT),
  );
  fs.writeFileSync(
    path.join(catalogDir, 'malformed.json'),
    JSON.stringify(MALFORMED_UNIT),
  );

  const index = {
    version: 'test',
    generatedAt: new Date().toISOString(),
    totalUnits: 2,
    units: [
      {
        id: VALID_UNIT.id,
        chassis: VALID_UNIT.chassis,
        model: VALID_UNIT.model,
        tonnage: VALID_UNIT.tonnage,
        techBase: 'INNER_SPHERE',
        year: 3025,
        path: 'valid.json',
      },
      {
        id: MALFORMED_UNIT.id,
        chassis: MALFORMED_UNIT.chassis,
        model: 'X',
        tonnage: 100,
        techBase: 'INNER_SPHERE',
        year: 3025,
        path: 'malformed.json',
      },
    ],
  };
  fs.writeFileSync(path.join(catalogDir, 'index.json'), JSON.stringify(index));

  return baseDir;
}

describe('NodeCanonicalUnitService unit-JSON boundary', () => {
  let baseDir: string;
  let service: NodeCanonicalUnitService;

  beforeEach(() => {
    baseDir = makeTempCatalog();
    service = new NodeCanonicalUnitService(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it('loads a contract-valid unit (happy path)', async () => {
    const unit = await service.getById('test-valid-mech');
    expect(unit).not.toBeNull();
    expect(unit?.id).toBe('test-valid-mech');
    expect(unit?.chassis).toBe('Atlas');
  });

  it('throws a precise error on a malformed unit file', async () => {
    await expect(service.getById('test-malformed-mech')).rejects.toThrow(
      UnitContractParseError,
    );
  });

  it('names the offending field path in the thrown error', async () => {
    try {
      await service.getById('test-malformed-mech');
      throw new Error('expected getById to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(UnitContractParseError);
      const parseErr = err as UnitContractParseError;
      // The error message references the source file path...
      expect(parseErr.message).toContain('malformed.json');
      // ...and the issue list pinpoints the offending field.
      expect(parseErr.issues.some((i) => i.path.includes('unitType'))).toBe(
        true,
      );
    }
  });

  it('returns null for an unknown id (not found, not a schema failure)', async () => {
    const unit = await service.getById('does-not-exist');
    expect(unit).toBeNull();
  });
});

/**
 * EquipmentLoaderService.schemaBridge.test.ts
 *
 * Smoke tests for the cross-language schema-bridge dev-loader gate.
 *
 * The loader's responsibility under the bridge is:
 *  1. In dev/test, run every loaded item through its shape's contract.
 *  2. Production builds skip the gate (no NODE_ENV check inside the
 *     loader test fixtures here — Jest runs as `test` so the gate is
 *     active).
 *  3. With `MEKSTATION_STRICT_SCHEMA_BRIDGE=1`, drift throws.
 *  4. Without the strict flag, drift hits `console.warn` so dev runs
 *     don't break on minor / known gaps.
 *
 * We exercise the gate by feeding a known-bad item to `loadCustomEquipment`
 * (which routes ammunition/electronics/misc/weapon items into the same
 * convert-and-cache path used by `loadOfficialEquipment`). The dev-gate
 * lives in `loadOfficialEquipment` only — we test it indirectly by
 * priming the loader with a fake `readJsonFile` for one shape at a time.
 *
 * Mocking the I/O instead of writing to a temp directory avoids
 * polluting the corpus and keeps the test deterministic across CI
 * checkouts that may not have the full `public/data/equipment/official/`
 * tree (slim CI sandboxes, etc).
 */

import {
  EquipmentLoaderService,
  resetEquipmentLoader,
} from '../EquipmentLoaderService';

jest.mock('../EquipmentFileReader', () => ({
  readJsonFile: jest.fn(),
}));

import { readJsonFile } from '../EquipmentFileReader';

const mockedReadJsonFile = readJsonFile as jest.MockedFunction<
  typeof readJsonFile
>;

/**
 * Build a minimal index.json so the loader knows which files to walk.
 *
 * The loader keys off `indexData?.files?.<category>` for each shape;
 * any category we want exercised must appear here.
 */
function buildIndex(category: string, files: string[]) {
  const filesObj: Record<string, string> = {};
  files.forEach((f, i) => {
    filesObj[`f${i}`] = f;
  });
  return {
    files: { [category]: filesObj },
  };
}

beforeEach(() => {
  resetEquipmentLoader();
  jest.resetAllMocks();
});

describe('EquipmentLoaderService schema-bridge gate', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    delete process.env.MEKSTATION_STRICT_SCHEMA_BRIDGE;
  });

  it('warns (does not throw) on weapon drift in non-strict mode', async () => {
    // Index advertises one weapon file. The file's `$schema` points at
    // weapon-schema.json so the gate runs WeaponContract.
    mockedReadJsonFile.mockImplementation(async (relPath: string) => {
      if (relPath === 'index.json') {
        return buildIndex('weapons', ['weapons/fake.json']);
      }
      if (relPath === 'weapons/fake.json') {
        return {
          $schema: '../../_schema/weapon-schema.json',
          version: '1.0.0',
          generatedAt: '2026-04-25',
          count: 1,
          items: [
            {
              // Missing required fields like `name`, `tonnage`, etc.
              id: 'broken-weapon',
            },
          ],
        };
      }
      return null;
    });

    const loader = new EquipmentLoaderService();
    await loader.loadOfficialEquipment();

    expect(warnSpy).toHaveBeenCalled();
    const messages = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(
      messages.some((m) => m.includes('failed WeaponContract.safeParse')),
    ).toBe(true);
  });

  it('warns on ammunition drift when no $schema header is present', async () => {
    // Ammunition files in the real corpus omit `$schema`; the gate
    // falls back to the AmmunitionContract default validator. Verifies
    // the default-validator path actually fires.
    mockedReadJsonFile.mockImplementation(async (relPath: string) => {
      if (relPath === 'index.json') {
        return buildIndex('ammunition', ['ammunition/fake.json']);
      }
      if (relPath === 'ammunition/fake.json') {
        return {
          // No `$schema` field.
          version: '1.0.0',
          generatedAt: '2026-04-25',
          count: 1,
          items: [
            {
              // Missing required ammunition fields.
              id: 'broken-ammo',
            },
          ],
        };
      }
      return null;
    });

    const loader = new EquipmentLoaderService();
    await loader.loadOfficialEquipment();

    const messages = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(
      messages.some((m) => m.includes('failed AmmunitionContract.safeParse')),
    ).toBe(true);
  });

  it('warns on electronics drift', async () => {
    mockedReadJsonFile.mockImplementation(async (relPath: string) => {
      if (relPath === 'index.json') {
        return buildIndex('electronics', ['electronics/fake.json']);
      }
      if (relPath === 'electronics/fake.json') {
        return {
          $schema: '../../_schema/electronics-schema.json',
          version: '1.0.0',
          generatedAt: '2026-04-25',
          count: 1,
          items: [{ id: 'broken-electronics' }],
        };
      }
      return null;
    });

    const loader = new EquipmentLoaderService();
    await loader.loadOfficialEquipment();

    const messages = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(
      messages.some((m) => m.includes('failed ElectronicsContract.safeParse')),
    ).toBe(true);
  });

  it('warns on misc-equipment drift', async () => {
    mockedReadJsonFile.mockImplementation(async (relPath: string) => {
      if (relPath === 'index.json') {
        return buildIndex('miscellaneous', ['miscellaneous/fake.json']);
      }
      if (relPath === 'miscellaneous/fake.json') {
        return {
          $schema: '../../_schema/misc-equipment-schema.json',
          version: '1.0.0',
          generatedAt: '2026-04-25',
          count: 1,
          items: [{ id: 'broken-misc' }],
        };
      }
      return null;
    });

    const loader = new EquipmentLoaderService();
    await loader.loadOfficialEquipment();

    const messages = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(
      messages.some((m) =>
        m.includes('failed MiscEquipmentContract.safeParse'),
      ),
    ).toBe(true);
  });

  it('routes weapons/physical.json through PhysicalWeaponContract', async () => {
    mockedReadJsonFile.mockImplementation(async (relPath: string) => {
      if (relPath === 'index.json') {
        return buildIndex('weapons', ['weapons/physical.json']);
      }
      if (relPath === 'weapons/physical.json') {
        return {
          $schema: '../_schema/physical-weapon-schema.json',
          version: '1.0.0',
          generatedAt: '2026-04-25',
          count: 1,
          items: [{ id: 'broken-physical' }],
        };
      }
      return null;
    });

    const loader = new EquipmentLoaderService();
    await loader.loadOfficialEquipment();

    const messages = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(
      messages.some((m) =>
        m.includes('failed PhysicalWeaponContract.safeParse'),
      ),
    ).toBe(true);
  });
});

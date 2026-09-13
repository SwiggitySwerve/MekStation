/**
 * Characterizes the real official-loader/readJsonFile failure boundary.
 *
 * The fetch responses are controlled so this test can exercise missing and
 * malformed indexed files without modifying the checked-in equipment corpus.
 * The loader and reader themselves are intentionally unmocked.
 */

import { disableTestMode, enableTestMode } from '@/utils/logger';

import {
  EquipmentLoaderService,
  resetEquipmentLoader,
} from '../EquipmentLoaderService';

interface ControlledResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

const retainedWeapon = {
  id: 'retained-weapon',
  name: 'Retained Laser',
  category: 'Energy',
  subType: 'Laser',
  techBase: 'INNER_SPHERE',
  rulesLevel: 'INTRODUCTORY',
  damage: 1,
  heat: 1,
  ranges: { minimum: 0, short: 1, medium: 2, long: 3 },
  weight: 1,
  criticalSlots: 1,
  costCBills: 1000,
  battleValue: 1,
  introductionYear: 2400,
};

const indexData = {
  files: {
    weapons: {
      malformed: 'weapons/malformed.json',
      retained: 'weapons/retained.json',
    },
    ammunition: { missing: 'ammunition/missing.json' },
    electronics: { missing: 'electronics/missing.json' },
    miscellaneous: { missing: 'miscellaneous/missing.json' },
  },
};

const successIndexData = {
  files: {
    weapons: { retained: 'weapons/retained.json' },
    ammunition: {},
    electronics: {},
    miscellaneous: {},
  },
};

const expectedFailures = [
  'weapons/malformed.json',
  'ammunition/missing.json',
  'electronics/missing.json',
  'miscellaneous/missing.json',
];

describe('EquipmentOfficialLoader file-failure boundary', () => {
  const originalFetch = global.fetch;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    resetEquipmentLoader();
    enableTestMode();
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    global.fetch = jest.fn(
      async (url: string | URL): Promise<ControlledResponse> => {
        const request = String(url);
        if (request.endsWith('/index.json')) {
          return { ok: true, status: 200, json: async () => indexData };
        }
        if (request.endsWith('/weapons/malformed.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => {
              throw new SyntaxError('Unexpected end of JSON input');
            },
          };
        }
        if (request.endsWith('/weapons/retained.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ items: [retainedWeapon] }),
          };
        }
        if (
          expectedFailures
            .filter((filePath) => !filePath.endsWith('weapons/malformed.json'))
            .some((filePath) => request.endsWith(`/${filePath}`))
        ) {
          return { ok: false, status: 404, json: async () => undefined };
        }
        throw new Error(`Unexpected equipment request: ${request}`);
      },
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    errorSpy.mockRestore();
    disableTestMode();
  });

  it('records every category failure as an error while retaining successful rows', async () => {
    const loader = new EquipmentLoaderService();

    const result = await loader.loadOfficialEquipment();

    expect(result.itemsLoaded).toBe(1);
    expect(loader.getWeaponById('retained-weapon')).toEqual(
      expect.objectContaining({ id: 'retained-weapon' }),
    );
    expect(result.errors).toHaveLength(expectedFailures.length);
    for (const filePath of expectedFailures) {
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining(filePath)]),
      );
      expect(result.warnings).toEqual(
        expect.arrayContaining([expect.stringContaining(filePath)]),
      );
      expect(
        errorSpy.mock.calls.some(([message]) =>
          String(message).includes(filePath),
        ),
      ).toBe(true);
    }
    expect(loader.getLoadErrors()).toEqual(result.errors);
    expect(loader.getIsLoaded()).toBe(false);
    expect(result.success).toBe(false);

    errorSpy.mockClear();
    (global.fetch as jest.Mock).mockImplementation(
      async (url: string | URL): Promise<ControlledResponse> => {
        const request = String(url);
        if (request.endsWith('/index.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => successIndexData,
          };
        }
        if (request.endsWith('/weapons/retained.json')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ items: [retainedWeapon] }),
          };
        }
        throw new Error(`Unexpected recovery request: ${request}`);
      },
    );

    const retryResult = await loader.loadOfficialEquipment();

    expect(retryResult).toEqual({
      success: true,
      itemsLoaded: 1,
      errors: [],
      warnings: [],
    });
    expect(loader.getLoadErrors()).toEqual(retryResult.errors);
    expect(loader.getIsLoaded()).toBe(true);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

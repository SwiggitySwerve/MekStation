/**
 * CanonicalUnitService guards the shape of a unit before caching it (S10 PR2).
 *
 * The browser service used to cache the raw payload, so five readers (the API,
 * the duplicate action, SimulationRunner, CompendiumAdapter, forceSummary)
 * consumed unvalidated data. A cheap structural guard now runs on every cold
 * load; full `UnitContract` validation of the bundled corpus runs in CI
 * (`src/types/contracts/__tests__/unit.contract.test.ts`).
 */

import { CanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { UnitContractParseError } from '@/services/units/unitLoaderService/unitContractAdapter';

import atlas from '../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';

const ATLAS_ROW = {
  id: 'atlas-as7-d',
  chassis: 'Atlas',
  model: 'AS7-D',
  tonnage: 100,
  techBase: 'INNER_SPHERE',
  year: 2750,
  path: 'test/atlas-as7-d.json',
};
const SQUAD_ROW = {
  id: 'squad',
  chassis: 'Squad',
  model: '',
  tonnage: 1,
  techBase: 'INNER_SPHERE',
  year: 3050,
  unitType: 'Infantry',
  path: 'squad.json',
};

/** The smallest payload the guard accepts for a BattleMech index row. */
const stub = (overrides: Record<string, unknown> = {}) => ({
  id: 'atlas-as7-d',
  chassis: 'Atlas',
  unitType: 'BattleMech',
  tonnage: 100,
  ...overrides,
});

const fetchMock = jest.fn();
/** Serve the index for the family, and `body` for the unit file. */
const respond =
  (body: unknown, row: object = ATLAS_ROW) =>
  async (url: string) =>
    url.endsWith('/index.json')
      ? { ok: true, json: async () => ({ units: [row] }) }
      : { ok: true, json: async () => JSON.parse(JSON.stringify(body)) };
/** Serve a unit file whose body cannot be read as JSON (HTML, truncated). */
const respondUnreadable = (message: string) => async (url: string) =>
  url.endsWith('/index.json')
    ? { ok: true, json: async () => ({ units: [ATLAS_ROW] }) }
    : {
        ok: true,
        json: async () => {
          throw new SyntaxError(message);
        },
      };
const unitFetches = (): number =>
  fetchMock.mock.calls.filter(([url]: [string]) => !url.endsWith('/index.json'))
    .length;

describe('CanonicalUnitService shape guard before caching', () => {
  let service: CanonicalUnitService;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new CanonicalUnitService();
  });

  it('returns and caches a minimal shape-valid unit', async () => {
    fetchMock.mockImplementation(respond(stub()));

    const first = await service.getById('atlas-as7-d');
    const second = await service.getById('atlas-as7-d');

    expect(first).toMatchObject({ id: 'atlas-as7-d', chassis: 'Atlas' });
    expect(second).toBe(first);
    expect(unitFetches()).toBe(1);
  });

  it('accepts a unit with no tonnage (infantry files carry none)', async () => {
    fetchMock.mockImplementation(
      respond(
        { id: 'squad', chassis: 'Squad', unitType: 'Infantry' },
        SQUAD_ROW,
      ),
    );

    await expect(
      service.getById('squad', { family: 'infantry' }),
    ).resolves.toMatchObject({ id: 'squad' });
  });

  describe.each([
    ['a JSON string (an HTML error page)', '<html>502 Bad Gateway</html>', ''],
    ['a JSON array', [], ''],
    ['a number', 42, ''],
    ['an error object with no unit fields', { error: 'Not found' }, 'id'],
    ['a missing id', stub({ id: undefined }), 'id'],
    ['an id that is not a string', stub({ id: 7 }), 'id'],
    ['an id that is not the requested unit', stub({ id: 'other' }), 'id'],
    ['a missing unitType', stub({ unitType: undefined }), 'unitType'],
    [
      'a unitType of another family',
      stub({ unitType: 'Infantry' }),
      'unitType',
    ],
    ['a tonnage that is not a number', stub({ tonnage: 'heavy' }), 'tonnage'],
    ['a non-positive tonnage', stub({ tonnage: -50 }), 'tonnage'],
  ])('a payload with %s', (_label, body, path) => {
    it('rejects a strict caller with the field issue', async () => {
      fetchMock.mockImplementation(respond(body));

      const error = await service
        .getById('atlas-as7-d', { strict: true })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(UnitContractParseError);
      expect((error as UnitContractParseError).issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ path })]),
      );
    });

    it('returns null for a lenient caller', async () => {
      fetchMock.mockImplementation(respond(body));

      await expect(service.getById('atlas-as7-d')).resolves.toBeNull();
    });

    it('is not cached, so a corrected source is read on retry', async () => {
      fetchMock.mockImplementation(respond(body));
      await expect(service.getById('atlas-as7-d')).resolves.toBeNull();

      fetchMock.mockImplementation(respond(stub()));
      const corrected = await service.getById('atlas-as7-d');

      expect(corrected).toMatchObject({ id: 'atlas-as7-d' });
      expect(unitFetches()).toBe(2);
    });
  });

  describe.each([
    ['an HTML body', 'Unexpected token < in JSON at position 0'],
    ['a truncated body', 'Unexpected end of JSON input'],
  ])('a unit file that is %s', (_label, message) => {
    it('rejects a strict caller and returns null for a lenient one', async () => {
      fetchMock.mockImplementation(respondUnreadable(message));
      await expect(
        service.getById('atlas-as7-d', { strict: true }),
      ).rejects.toThrow(message);

      await expect(service.getById('atlas-as7-d')).resolves.toBeNull();
    });

    it('is not cached', async () => {
      fetchMock.mockImplementation(respondUnreadable(message));
      await service.getById('atlas-as7-d');

      fetchMock.mockImplementation(respond(stub()));
      await expect(service.getById('atlas-as7-d')).resolves.toMatchObject({
        id: 'atlas-as7-d',
      });
    });
  });

  it('serves every concurrent caller the same guarded result', async () => {
    fetchMock.mockImplementation(respond(stub()));

    const [first, second] = await Promise.all([
      service.getById('atlas-as7-d'),
      service.getById('atlas-as7-d'),
    ]);

    expect(second).toBe(first);
    expect(unitFetches()).toBe(1);
  });

  it('does not reject a real catalog unit', async () => {
    fetchMock.mockImplementation(respond(atlas));

    await expect(service.getById(atlas.id)).resolves.toMatchObject({
      id: atlas.id,
      chassis: 'Atlas',
    });
  });
});

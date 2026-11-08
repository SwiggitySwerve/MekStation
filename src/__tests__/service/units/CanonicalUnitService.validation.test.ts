/**
 * CanonicalUnitService validates a unit before caching it (S10 PR2).
 *
 * The browser service used to cache the raw payload, so five readers (the API,
 * the duplicate action, SimulationRunner, CompendiumAdapter, forceSummary)
 * consumed unvalidated data. Node already validated through `parseUnit`.
 */

import { CanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { UnitContractParseError } from '@/services/units/unitLoaderService/unitContractAdapter';

import atlas from '../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';

const ATLAS_ROW = {
  id: atlas.id,
  chassis: atlas.chassis,
  model: atlas.model,
  tonnage: atlas.tonnage,
  techBase: atlas.techBase,
  year: 2750,
  path: '2-star-league/standard/Atlas AS7-D.json',
};

const invalidAtlas = { ...atlas, tonnage: -50 };

const fetchMock = jest.fn();
const respond = (unit: unknown) => async (url: string) =>
  url.endsWith('/index.json')
    ? { ok: true, json: async () => ({ units: [ATLAS_ROW] }) }
    : { ok: true, json: async () => JSON.parse(JSON.stringify(unit)) };
const unitFetches = (): number =>
  fetchMock.mock.calls.filter(([url]: [string]) => !url.endsWith('/index.json'))
    .length;

describe('CanonicalUnitService validation before caching', () => {
  let service: CanonicalUnitService;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new CanonicalUnitService();
  });

  it('returns and caches a valid catalog unit', async () => {
    fetchMock.mockImplementation(respond(atlas));

    const first = await service.getById(atlas.id);
    const second = await service.getById(atlas.id);

    expect(first).toMatchObject({ id: atlas.id, chassis: 'Atlas' });
    expect(second).toBe(first);
    expect(unitFetches()).toBe(1);
  });

  it('rejects an invalid unit for a strict caller with the field issues', async () => {
    fetchMock.mockImplementation(respond(invalidAtlas));

    const error = await service
      .getById(atlas.id, { strict: true })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UnitContractParseError);
    expect((error as UnitContractParseError).issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'tonnage' })]),
    );
  });

  it('returns null for a lenient caller instead of the invalid unit', async () => {
    fetchMock.mockImplementation(respond(invalidAtlas));

    await expect(service.getById(atlas.id)).resolves.toBeNull();
  });

  it('does not cache an invalid unit, so a corrected source is read on retry', async () => {
    fetchMock.mockImplementation(respond(invalidAtlas));
    await expect(service.getById(atlas.id)).resolves.toBeNull();

    fetchMock.mockImplementation(respond(atlas));
    const corrected = await service.getById(atlas.id);

    expect(corrected).toMatchObject({ id: atlas.id, tonnage: atlas.tonnage });
    expect(unitFetches()).toBe(2);
  });

  it('serves every concurrent caller the same validated result', async () => {
    fetchMock.mockImplementation(respond(atlas));

    const [first, second] = await Promise.all([
      service.getById(atlas.id),
      service.getById(atlas.id),
    ]);

    expect(second).toBe(first);
    expect(unitFetches()).toBe(1);
  });
});

import atlas from '../../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { resetCanonicalUnitService } from '../../CanonicalUnitService';
import { UnitLoaderService } from '../unitLoader';

jest.mock('@/services/equipment/EquipmentLookupService', () => ({
  getEquipmentLookupService: () => ({
    initialize: async () => {},
    getById: () => undefined,
    getAllEquipment: () => [],
  }),
}));
jest.mock('@/services/equipment/EquipmentRegistry', () => ({
  getEquipmentRegistry: () => ({
    initialize: async () => {},
    isReady: () => true,
    lookup: () => ({ found: false }),
  }),
}));

it('refetches a corrected canonical definition after validation rejected the cached payload', async () => {
  resetCanonicalUnitService();
  const originalFetch = global.fetch;
  const fetchMock = jest
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        units: [
          {
            id: atlas.id,
            chassis: atlas.chassis,
            model: atlas.model,
            tonnage: atlas.tonnage,
            techBase: atlas.techBase,
            year: atlas.year,
            path: '2-star-league/standard/Atlas AS7-D.json',
          },
        ],
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...atlas, tonnage: -50 }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...atlas, equipment: [] }),
    });
  global.fetch = fetchMock;
  try {
    const loader = new UnitLoaderService();
    expect(await loader.loadCanonicalUnit(atlas.id)).toMatchObject({
      success: false,
      errorCode: 'invalid-definition',
    });
    expect(await loader.loadCanonicalUnit(atlas.id)).toMatchObject({
      success: true,
      state: { chassis: 'Atlas', tonnage: 100 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  } finally {
    global.fetch = originalFetch;
    resetCanonicalUnitService();
  }
});

it('distinguishes an unavailable catalog from an absent unit at the host boundary', async () => {
  resetCanonicalUnitService();
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockRejectedValue(new Error('Network unavailable'));
  try {
    expect(
      await new UnitLoaderService().loadCanonicalUnit(atlas.id),
    ).toMatchObject({ success: false, errorCode: 'read-failed' });
  } finally {
    global.fetch = originalFetch;
    resetCanonicalUnitService();
  }
});

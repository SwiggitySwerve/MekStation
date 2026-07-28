import { CustomUnitApiService } from '@/services/units/CustomUnitApiService';

describe('CustomUnitApiService response contract', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads the direct record returned by the custom-unit detail route', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'custom-1',
        chassis: 'Warhammer',
        variant: 'WHM-6R Goal Audit',
        parsedData: {
          id: 'temporary-tab-id',
          chassis: 'Warhammer',
          model: 'WHM-6R Goal Audit',
          variant: 'WHM-6R Goal Audit',
          tonnage: 70,
          engine: { type: 'XL', rating: 280 },
        },
        currentVersion: 1,
        createdAt: '2026-07-27T00:00:00.000Z',
        updatedAt: '2026-07-27T00:00:00.000Z',
      }),
    } as Response);

    const result = await new CustomUnitApiService().getById('custom-1');

    expect(result).toMatchObject({
      id: 'custom-1',
      chassis: 'Warhammer',
      model: 'WHM-6R Goal Audit',
      variant: 'WHM-6R Goal Audit',
      tonnage: 70,
      engine: { type: 'XL', rating: 280 },
      currentVersion: 1,
    });
  });
});

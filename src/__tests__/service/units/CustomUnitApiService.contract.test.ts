import { CustomUnitApiService } from '@/services/units/CustomUnitApiService';

describe('CustomUnitApiService response contract', () => {
  it.each([
    [
      201,
      { data: { unitId: 'custom-old' } },
      { success: true, id: 'custom-old', version: 1 },
    ],
    [
      201,
      { data: { unitId: 'custom-new', warnings: ['Construction warning'] } },
      { success: true, id: 'custom-new', warnings: ['Construction warning'] },
    ],
    [
      400,
      {
        error: {
          message: 'Unsupported family',
          validationErrors: ['family: handheld'],
          warnings: ['Source warning'],
        },
      },
      {
        success: false,
        error: 'Unsupported family',
        validationErrors: ['family: handheld'],
        warnings: ['Source warning'],
      },
    ],
    [
      500,
      { error: 'Database unavailable' },
      { success: false, error: 'Database unavailable' },
    ],
    [
      409,
      {
        error: { message: 'Already exists', suggestedName: 'LCT-1V-Custom-1' },
      },
      {
        success: false,
        requiresRename: true,
        suggestedName: { suggestedVariant: 'LCT-1V-Custom-1' },
      },
    ],
  ])(
    'retains import response contract for HTTP %s',
    async (status, body, expected) => {
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: status < 400,
        status,
        json: async () => body,
      } as Response);
      expect(
        await new CustomUnitApiService().importUnit({
          sourceFormat: 'mtf',
          sourceText: 'original bytes',
        }),
      ).toMatchObject(expected);
    },
  );

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

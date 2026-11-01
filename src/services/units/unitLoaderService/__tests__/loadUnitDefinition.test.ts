import atlas from '../../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { resetCanonicalUnitService } from '../../CanonicalUnitService';
import { loadUnitDefinition } from '../loadUnitDefinition';

it('returns a validated definition with its source identity and custom revision', async () => {
  const read = jest.fn().mockResolvedValue({ ...atlas, currentVersion: 7 });
  const result = await loadUnitDefinition(
    { read },
    { source: 'custom', id: 'saved-atlas' },
  );
  expect(read).toHaveBeenCalledWith({ source: 'custom', id: 'saved-atlas' });
  expect(result).toMatchObject({
    success: true,
    reference: { source: 'custom', id: 'saved-atlas', version: 7 },
    definition: { id: 'atlas-as7-d', chassis: 'Atlas' },
  });
});

it('does not infer source revisions from canonical payload metadata', async () => {
  const result = await loadUnitDefinition(
    { read: async () => ({ ...atlas, currentVersion: 7 }) },
    { source: 'canonical', id: atlas.id },
  );
  expect(result.reference).toEqual({ source: 'canonical', id: atlas.id });
});

it('distinguishes unavailable sources from absent definitions and allows retry', async () => {
  const read = jest
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(atlas);
  const reference = { source: 'canonical' as const, id: atlas.id };
  expect(await loadUnitDefinition({ read }, reference)).toMatchObject({
    success: false,
    code: 'read-failed',
    error: 'offline',
  });
  expect(await loadUnitDefinition({ read }, reference)).toMatchObject({
    success: false,
    code: 'not-found',
  });
  expect(await loadUnitDefinition({ read }, reference)).toMatchObject({
    success: true,
    reference,
  });
});

it('reports invalid fields without handing malformed data to an editor', async () => {
  const result = await loadUnitDefinition(
    { read: async () => ({ ...atlas, tonnage: -50 }) },
    { source: 'canonical', id: atlas.id },
  );
  expect(result).toMatchObject({
    success: false,
    code: 'invalid-definition',
    issues: expect.arrayContaining([
      expect.objectContaining({ path: 'tonnage' }),
    ]),
  });
  expect(result).not.toHaveProperty('definition');
});

it.each(['canonical', 'custom'] as const)(
  'rejects a non-mech definition under a family-less %s reference',
  async (source) => {
    const definition = { id: 'infantry-squad', unitType: 'Infantry' };
    const reference = { source, id: definition.id };
    const result = await loadUnitDefinition(
      { read: async () => definition },
      reference,
    );
    expect(result).toMatchObject({
      success: false,
      reference,
      code: 'invalid-definition',
      issues: [
        {
          path: 'unitType',
          message: 'Unit type Infantry does not belong to family battlemechs',
        },
      ],
    });
    expect(result).not.toHaveProperty('definition');
  },
);

it.each(['BattleMech', 'OmniMech', 'IndustrialMech'])(
  'accepts %s under a family-less reference',
  async (unitType) => {
    const result = await loadUnitDefinition(
      { read: async () => ({ ...atlas, unitType }) },
      { source: 'canonical', id: atlas.id },
    );
    expect(result).toMatchObject({
      success: true,
      reference: { source: 'canonical', id: atlas.id },
      definition: { unitType },
    });
    expect(result.reference).not.toHaveProperty('family');
  },
);

it('UL-10 retains family and revision on explicitly qualified custom references', async () => {
  const reference = {
    source: 'custom' as const,
    family: 'infantry' as const,
    id: 'saved-squad',
  };
  const read = jest.fn();
  read.mockResolvedValue({
    id: 'squad',
    unitType: 'Infantry',
    currentVersion: 4,
  });
  expect(await loadUnitDefinition({ read }, reference)).toMatchObject({
    success: true,
    family: 'infantry',
    reference: { ...reference, version: 4 },
    definition: { unitType: 'Infantry' },
  });
  expect(read).toHaveBeenCalledWith(reference);
});

it('UL-10 rejects a definition whose type disagrees with the requested family', async () => {
  expect(
    await loadUnitDefinition(
      { read: async () => atlas },
      { source: 'canonical', family: 'aerospace', id: atlas.id },
    ),
  ).toMatchObject({
    success: false,
    code: 'invalid-definition',
    issues: [{ path: 'unitType', message: expect.any(String) }],
  });
});

it.each([
  'chassis',
  'configuration',
  'tonnage',
  'engine',
  'armor',
  'criticalSlots',
])('rejects a BattleMech definition missing required %s', async (field) => {
  const incomplete: Record<string, unknown> = { ...atlas };
  delete incomplete[field];
  expect(
    await loadUnitDefinition(
      { read: async () => incomplete },
      { source: 'canonical', id: atlas.id },
    ),
  ).toMatchObject({ success: false, code: 'invalid-definition' });
});

it('requires both movement values for a BattleMech', async () => {
  expect(
    await loadUnitDefinition(
      { read: async () => ({ ...atlas, movement: { walk: 3 } }) },
      { source: 'canonical', id: atlas.id },
    ),
  ).toMatchObject({ success: false, code: 'invalid-definition' });
});

describe('canonical definition retry after an invalid definition (#2457 review)', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    resetCanonicalUnitService();
  });

  it('re-reads a corrected canonical definition without any explicit invalidation', async () => {
    const row = {
      id: 'squad',
      chassis: 'Squad',
      model: '',
      tonnage: 1,
      techBase: 'INNER_SPHERE',
      year: 3050,
      unitType: 'Infantry',
      path: 'squad.json',
    };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ units: [row] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'squad', unitType: 'Aerospace' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'squad', unitType: 'Infantry' }),
      }) as unknown as typeof fetch;
    expect(await loadUnitDefinition('infantry', 'squad')).toMatchObject({
      success: false,
      code: 'invalid-definition',
    });
    expect(await loadUnitDefinition('infantry', 'squad')).toMatchObject({
      success: true,
      family: 'infantry',
      definition: { unitType: 'Infantry' },
    });
  });
});

import { buildObjectParity } from '../ci/committed-catalog-parity';

const sha256 = 'a'.repeat(64);
const catalog = [
  {
    family: 'battlemechs',
    file: 'Götterdämmerung.json',
    blob: 'b'.repeat(40),
    unit: {
      chassis: 'Götterdämmerung',
      model: 'GTD-20S',
      id: 'committed-collision-id',
      rulesLevel: 'ADVANCED',
    },
  },
];
const joins = [
  {
    family: 'battlemechs',
    catalogFile: catalog[0].file,
    path: 'meks/Gotterdammerung.mtf',
    sha256,
  },
];
const fresh = [
  {
    path: joins[0].path,
    sha256,
    unit: { ...catalog[0].unit, id: 'converter-id', rulesLevel: 'STANDARD' },
  },
];

it('joins comparison by verified source path, retains differing ids, and reports drift as data', () => {
  const result = buildObjectParity(catalog, joins, fresh);
  expect(result.errors).toEqual([]);
  expect(result.byFamily.battlemechs).toEqual({
    rows: 1,
    equal: 0,
    drifted: 1,
    unavailable: 0,
  });
  expect(result.ledger[0]).toMatchObject({
    family: 'battlemechs',
    catalogFile: catalog[0].file,
    path: joins[0].path,
  });
  expect(result.ledger[0].fields.map((field) => field.path)).toEqual([
    'id',
    'rulesLevel',
  ]);
  expect(
    result.knownClasses.every(
      (item) => item.owner === 'C2' && item.direction === 'catalog-behind',
    ),
  ).toBe(true);
});

it('does not claim object equality when regeneration is absent or unit is null', () => {
  for (const regenerated of [undefined, [{ ...fresh[0], unit: null }]]) {
    const result = buildObjectParity(catalog, joins, regenerated);
    expect(result.status).toBe('not-measured');
    expect(result.byFamily.battlemechs).toEqual({
      rows: 1,
      equal: 0,
      drifted: 0,
      unavailable: 1,
    });
    expect(result.errors).toEqual([]);
  }
});

it('treats JSON key order and integral numeric spelling alike, but preserves array order', () => {
  const committed = [
    {
      ...catalog[0],
      unit: {
        chassis: 'Mech',
        model: '',
        nested: { a: 4, b: 2 },
        equipment: ['one', 'two'],
      },
    },
  ];
  const regenerated = [
    {
      ...fresh[0],
      unit: {
        model: '',
        chassis: 'Mech',
        equipment: ['one', 'two'],
        nested: { b: 2, a: 4.0 },
      },
    },
  ];
  expect(
    buildObjectParity(committed, joins, regenerated).byFamily.battlemechs.equal,
  ).toBe(1);
  const changed = [
    {
      ...regenerated[0],
      unit: { ...regenerated[0].unit, equipment: ['two', 'one'] },
    },
  ];
  expect(
    buildObjectParity(committed, joins, changed).ledger[0].fields.map(
      (field) => field.path,
    ),
  ).toEqual(['equipment']);
});

it('records absent fields explicitly and remains byte-stable across input ordering', () => {
  const committed = [
    catalog[0],
    {
      ...catalog[0],
      file: 'Other.json',
      unit: { chassis: 'Other', model: '' },
    },
  ];
  const matched = [
    joins[0],
    { ...joins[0], catalogFile: 'Other.json', path: 'meks/Other.mtf' },
  ];
  const regenerated = [
    ...fresh,
    {
      path: 'meks/Other.mtf',
      sha256,
      unit: { chassis: 'Other', model: '', isOmni: true },
    },
  ];
  const result = buildObjectParity(committed, matched, regenerated);
  expect(
    result.ledger.find((row) => row.catalogFile === 'Other.json')?.fields,
  ).toEqual([
    {
      path: 'isOmni',
      committed: { present: false },
      regenerated: { present: true, value: true },
    },
  ]);
  expect(
    JSON.stringify(
      buildObjectParity(
        committed.reverse(),
        matched.reverse(),
        regenerated.reverse(),
      ),
    ),
  ).toBe(JSON.stringify(result));
});

it('rejects missing, duplicate, unexpected and wrong-hash regeneration identities', () => {
  for (const regenerated of [
    [],
    [fresh[0], fresh[0]],
    [{ ...fresh[0], sha256: 'c'.repeat(64) }],
    [...fresh, { ...fresh[0], path: 'meks/extra.mtf' }],
    [{ ...fresh[0], unit: null, reason: 'Conversion failed' }],
  ]) {
    expect(
      buildObjectParity(catalog, joins, regenerated).errors.length,
    ).toBeGreaterThan(0);
  }
});

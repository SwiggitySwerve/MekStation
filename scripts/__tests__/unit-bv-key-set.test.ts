import { buildBVKeySetReport } from '../unit-bv-key-set';
import {
  buildDeltaReport,
  type IComputedRow,
  type IJavaReferenceRow,
} from '../unit-bv-parity';

const reference = (
  path: string,
  terms: Record<string, number> = { armorBV: 60 },
): IJavaReferenceRow => ({
  path,
  sha256: 'a'.repeat(64),
  concreteFamily: path.startsWith('meks/') ? 'Mek' : 'Tank',
  battleValue: {
    total: 100,
    aggregates: { defensiveValue: 60, offensiveValue: 40 },
    terms,
  },
});

const local = (
  java: IJavaReferenceRow,
  terms: Record<string, number | undefined> = java.battleValue.terms ?? {},
): IComputedRow => ({
  path: java.path,
  sha256: java.sha256,
  figure: { total: 100, defensive: 60, offensive: 40, terms },
});

const compare = (
  java: IJavaReferenceRow,
  ours: IComputedRow = local(java),
  namespaceSources: IJavaReferenceRow[] = [],
) =>
  buildBVKeySetReport(buildDeltaReport([ours], [java], undefined, true), [
    java,
    ...namespaceSources,
  ]);

it.each([
  ['vehicles/unit.blk', 'vehicles', 'ammo.cap.SRM:2', 21],
  ['meks/unit.mtf', 'battlemechs', 'ammo.cap.VGL:1', 0],
])(
  'reports a native local-only cap on %s, retaining genuine zero',
  (path, family, term, value) => {
    const java = reference(path, { 'ammo.cap.MG:2': 5 });
    const result = compare(
      java,
      local(java, { 'ammo.cap.MG:2': 5, [term]: value }),
    );
    expect(result.ok).toBe(false);
    expect(result.counts).toMatchObject({
      nativeFindings: 1,
      nonNativeLocalDiagnostics: 0,
    });
    expect(result.rows).toEqual([
      expect.objectContaining({
        category: 'native-local-only',
        family,
        path,
        term,
        value,
        namespace: 'ammo.cap.',
        sha256: java.sha256,
      }),
    ]);
    expect(result.byFamily[family].byNamespace).toEqual({
      'ammo.cap.': { nativeFindings: 1, nonNativeLocalDiagnostics: 0 },
    });
    expect(result.byFamily[family].byKey[term].nativeFindings).toBe(1);
  },
);

it('derives namespaces from every reference row in the same family, including unfamiliar names', () => {
  const java = reference('vehicles/without-ammo.blk');
  const sources = [
    reference('vehicles/other.blk', {
      'ammo.cap.MG:2': 5,
      'futureNative.pool.A': 3,
    }),
  ];
  const result = compare(
    java,
    local(java, {
      armorBV: 60,
      'ammo.cap.SRM:2': 21,
      'futureNative.pool.B': 7,
    }),
    sources,
  );
  expect(result.counts.nativeFindings).toBe(2);
  expect(result.nativeNamespaces.vehicles).toEqual([
    'ammo.cap.',
    'armorBV',
    'futureNative.pool.',
  ]);
  expect(result.rows.map((row) => row.category)).toEqual([
    'native-local-only',
    'native-local-only',
  ]);
});

it('reports every non-native diagnostic without failing or borrowing another family namespace', () => {
  const java = reference('vehicles/unit.blk');
  const result = compare(
    java,
    local(java, {
      armorBV: 60,
      final: 100,
      'local.pool.A': 2,
      'ammo.cap.SRM:2': 21,
    }),
    [reference('meks/other.mtf', { 'ammo.cap.SRM:2': 21 })],
  );
  expect(result.ok).toBe(true);
  expect(result.counts).toMatchObject({
    nativeFindings: 0,
    nonNativeLocalDiagnostics: 3,
  });
  expect(result.rows.map((row) => row.category)).toEqual([
    'non-native-local',
    'non-native-local',
    'non-native-local',
  ]);
  expect(result.byFamily.vehicles.byNamespace).toEqual({
    'ammo.cap.': { nativeFindings: 0, nonNativeLocalDiagnostics: 1 },
    final: { nativeFindings: 0, nonNativeLocalDiagnostics: 1 },
    'local.pool.': { nativeFindings: 0, nonNativeLocalDiagnostics: 1 },
  });
});

it('folds mount identity, order and trooper weapons exactly as the existing comparator', () => {
  const java = reference('vehicles/unit.blk', {
    'weapon.6.FR.Medium Laser': 23,
    'weapon.9.FR.SRM 6': 59,
    'trooper.1.weapon.-1.Squad.ISSmallLaser': 9,
  });
  const result = compare(
    java,
    local(java, {
      'weapon.0.FR.srm-6': 59,
      'weapon.1.FR.medium-laser': 23,
      'trooper.1.weapon.4.Squad.small-laser': 9,
    }),
  );
  expect(result.ok).toBe(true);
  expect(result.rows).toEqual([]);
  expect(result.counts).toMatchObject({ assessedRows: 1, nativeFindings: 0 });
});

it('reports a genuinely additional folded weapon slot in a native location namespace', () => {
  const java = reference('vehicles/unit.blk', { 'weapon.9.FR.SRM 6': 59 });
  const result = compare(
    java,
    local(java, {
      'weapon.0.FR.srm-6': 59,
      'weapon.1.FR.srm-6': 59,
    }),
  );
  expect(result.rows).toEqual([
    expect.objectContaining({
      term: 'weapon.FR.#1',
      namespace: 'weapon.FR.',
      value: 59,
      category: 'native-local-only',
    }),
  ]);
});

it('keeps scalar names exact and handles nested native identities mechanically', () => {
  const java = reference('vehicles/unit.blk', {
    armorBV: 60,
    'equipment.native.-1.CASE': 0,
    'section.Weapons:': 3,
    'infantry.troopersShooting': 2,
    'trooper.1.ammo.cap.SRM:2': 21,
    'trooper.1.armorBV': 4,
  });
  const result = compare(
    java,
    local(java, {
      'equipment.native.4.ECM': 5,
      'section.Anti-Mek:': 2,
      'infantry.newValue': 8,
      'trooper.2.ammo.cap.SRM:4': 42,
      'trooper.2.armorBV': 4,
      'trooper.2.final': 100,
      armorBonus: 7,
    }),
  );
  expect(result.counts).toMatchObject({
    nativeFindings: 5,
    nonNativeLocalDiagnostics: 2,
  });
  expect(result.nativeNamespaces.vehicles).toEqual([
    'armorBV',
    'equipment.native.',
    'infantry.',
    'section.',
    'trooper.<n>.ammo.cap.',
    'trooper.<n>.armorBV',
  ]);
});

it('reports no extras for a row with none and never mutates legacy report bytes', () => {
  const java = reference('vehicles/unit.blk');
  const delta = buildDeltaReport([local(java)], [java], undefined, true);
  const bytes = JSON.stringify(delta);
  const result = buildBVKeySetReport(delta, [java]);
  expect(result.ok).toBe(true);
  expect(result.rows).toEqual([]);
  expect(result.counts).toEqual({
    rows: 1,
    assessedRows: 1,
    unassessedRows: 0,
    nativeFindings: 0,
    nonNativeLocalDiagnostics: 0,
  });
  expect(JSON.stringify(delta)).toBe(bytes);
});

it.each(['unjoined', 'missing-reference-terms', 'missing-local-terms'])(
  'records %s rows as unassessed and fails closed',
  (reason) => {
    const java = reference('vehicles/unit.blk');
    const ours = local(java);
    if (reason === 'unjoined') ours.sha256 = 'b'.repeat(64);
    if (reason === 'missing-reference-terms')
      java.battleValue.terms = undefined;
    if (reason === 'missing-local-terms') delete ours.figure;
    const result = compare(java, ours);
    expect(result.ok).toBe(false);
    expect(result.counts).toMatchObject({
      assessedRows: 0,
      unassessedRows: 1,
      nativeFindings: 0,
      nonNativeLocalDiagnostics: 0,
    });
    expect(result.rows).toEqual([
      expect.objectContaining({
        category: 'unassessed',
        reason,
        path: java.path,
      }),
    ]);
  },
);

it('sorts output independently of source, reference and term insertion order', () => {
  const a = reference('vehicles/a.blk', { 'ammo.cap.MG:2': 5 });
  const b = reference('vehicles/b.blk', { 'ammo.cap.MG:2': 5 });
  const first = buildBVKeySetReport(
    buildDeltaReport(
      [
        local(b, { final: 100, 'ammo.cap.SRM:2': 21 }),
        local(a, { 'ammo.cap.VGL:1': 0, final: 100 }),
      ],
      [b, a],
    ),
    [b, a],
  );
  const second = buildBVKeySetReport(
    buildDeltaReport(
      [
        local(a, { final: 100, 'ammo.cap.VGL:1': 0 }),
        local(b, { 'ammo.cap.SRM:2': 21, final: 100 }),
      ],
      [a, b],
    ),
    [a, b],
  );
  expect(JSON.stringify(first)).toBe(JSON.stringify(second));
});

it('preserves unavailable or nonfinite extra values explicitly when serialized', () => {
  const java = reference('vehicles/unit.blk');
  const result = compare(
    java,
    local(java, {
      armorBV: 60,
      missing: undefined,
      invalid: Infinity,
    }),
  );
  const serialized: unknown = JSON.parse(JSON.stringify(result.rows));
  expect(serialized).toEqual([
    expect.objectContaining({
      term: 'invalid',
      value: null,
      valueIssue: 'nonfinite',
    }),
    expect.objectContaining({
      term: 'missing',
      value: null,
      valueIssue: 'undefined',
    }),
  ]);
});

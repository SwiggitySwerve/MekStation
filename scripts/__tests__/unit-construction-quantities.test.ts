import {
  buildQuantityReport,
  QUANTITY_KEYS,
  type QuantityKey,
} from '../unit-construction-quantities';
import { SETTING_KEYS } from '../unit-construction-settings';

const key = { path: 'meks/unit.mtf', sha256: 'a'.repeat(64) };
const CLASS = 'megamek.common.verifier.';
// A TestMek option block, as the pinned UnitVerifierOptions.xml yields it.
const MEK_SETTINGS: Record<string, unknown> = {
  ammoTechLevel: 2,
  gameYear: -1,
  getIntroYearMargin: 5,
  getMaxOverweight: 0,
  getMinUnderweight: 1,
  getPrintSize: 70,
  getTargetingComputerCrits: 0,
  getWeightCeilingArmor: 'HALF_TON',
  getWeightCeilingControls: 'HALF_TON',
  getWeightCeilingEngine: 'HALF_TON',
  getWeightCeilingGyro: 'HALF_TON',
  getWeightCeilingLifting: 'HALF_TON',
  getWeightCeilingPowerAmp: 'HALF_TON',
  getWeightCeilingStructure: 'HALF_TON',
  getWeightCeilingTargComp: 'TON',
  getWeightCeilingTurret: 'HALF_TON',
  getWeightCeilingWeapons: 'TON',
  showCorrectArmor: true,
  showCorrectCritical: true,
  showFailedEquip: true,
  showIncorrectIntroYear: true,
  showOverweightedEntity: true,
  showUnderweightEntity: false,
  skip: false,
};
const JAVA: Record<QuantityKey, { value: number; unit: string }> = {
  weightExact: { value: 50, unit: 't' },
  weightRounded: { value: 50, unit: 't' },
  weightDesign: { value: 50, unit: 't' },
  armorPoints: { value: 160, unit: 'points' },
  criticalSlots: { value: 78, unit: 'slots' },
};
const reference = (
  quantities: Record<string, unknown> = JAVA,
  settings: Record<string, unknown> = MEK_SETTINGS,
  more: Record<string, unknown> = {},
  row: { path: string; sha256: string } = key,
  concreteFamily = 'BipedMek',
  verifierClass = 'TestMek',
) => ({
  ...row,
  concreteFamily,
  battleValue: {
    total: 100,
    aggregates: { defensiveValue: 60, offensiveValue: 40 },
  },
  construction: {
    valid: true,
    verifierClass: CLASS + verifierClass,
    verifierQuantities: quantities,
    settings,
    ...more,
  },
});
const local = (fact: unknown, row = key) => ({
  ...row,
  constructionQuantities: fact,
});
const values = (
  override: Partial<Record<QuantityKey, number>> = {},
  gaps: Partial<Record<QuantityKey, string>> = {},
  probes?: { overweightTolerance?: number | 'no-check' },
) => ({
  values: {
    weightExact: 50,
    weightRounded: 50,
    weightDesign: 50,
    armorPoints: 160,
    criticalSlots: 78,
    ...override,
  },
  gaps,
  ...(probes ? { probes } : {}),
});
const run = (
  fact: unknown,
  ref: unknown = reference(),
  families: readonly string[] = ['battlemechs'],
) => buildQuantityReport([local(fact)] as never, [ref], families);
const statuses = (result: ReturnType<typeof run>) =>
  Object.fromEntries(result.rows[0].quantities.map((q) => [q.key, q.status]));
const cellResult = (
  result: ReturnType<typeof run>,
  keyName: string,
  verifierClass = 'TestMek',
) =>
  result.settings.cells
    .find((cell) => cell.verifierClass === verifierClass)!
    .results.find((item) => item.key === keyName)!;

describe('the five verifier quantities and the strict 1% rule', () => {
  test('names the five quantities the Java exporter writes, in a stable order', () => {
    expect(QUANTITY_KEYS).toEqual([
      'weightExact',
      'weightRounded',
      'weightDesign',
      'armorPoints',
      'criticalSlots',
    ]);
  });
  test('an exact match on all five is a matched row', () => {
    const result = run(values());
    expect(statuses(result)).toEqual({
      weightExact: 'exact',
      weightRounded: 'exact',
      weightDesign: 'exact',
      armorPoints: 'exact',
      criticalSlots: 'exact',
    });
    expect(result.rows[0].status).toBe('matched');
    expect(result.rows[0].quantities[0]).toMatchObject({
      unit: 't',
      java: 50,
      ours: 50,
    });
  });
  test.each([
    [50.49, 'within1Pct'],
    [50.5, 'different'], // exactly 1.00% is not strictly less
    [49.51, 'within1Pct'],
    [49.5, 'different'],
  ])('weightExact local %s is %s', (ours, status) => {
    const result = run(values({ weightExact: ours }));
    expect(statuses(result).weightExact).toBe(status);
    expect(result.rows[0].status).toBe(
      status === 'different' ? 'different' : 'matched',
    );
  });
  test('a zero Java value needs a zero local value', () => {
    const zero = reference({
      ...JAVA,
      armorPoints: { value: 0, unit: 'points' },
    });
    expect(statuses(run(values({ armorPoints: 0 }), zero)).armorPoints).toBe(
      'exact',
    );
    expect(statuses(run(values({ armorPoints: 1 }), zero)).armorPoints).toBe(
      'different',
    );
  });
});

describe('a gap is a finding, never a pass', () => {
  test('a missing local quantity keeps its reason and fails the row', () => {
    const fact = values({}, { criticalSlots: 'no local slot owner' });
    delete (fact.values as Record<string, number>).criticalSlots;
    const result = run(fact);
    expect(statuses(result).criticalSlots).toBe('missing-local');
    expect(result.rows[0].quantities[4].reason).toBe('no local slot owner');
    expect(result.rows[0].status).toBe('incomplete');
    expect(result.errors).toContain('incomplete: meks/unit.mtf');
    expect(result.ok).toBe(false);
  });
  test('a nonfinite local quantity is its own finding', () => {
    const result = run(values({ armorPoints: Number.NaN }));
    expect(statuses(result).armorPoints).toBe('nonfinite-local');
    expect(result.rows[0].status).toBe('incomplete');
  });
  test('a staged capture failure fails every quantity', () => {
    const result = run({ failure: 'mtf-load: boom' });
    expect(Object.values(statuses(result))).toEqual(
      QUANTITY_KEYS.map(() => 'failed-local'),
    );
    expect(result.rows[0].status).toBe('failed-local');
  });
  test('no local fact at all is missing-local, not a pass', () => {
    const result = buildQuantityReport(
      [{ ...key }] as never,
      [reference()],
      ['battlemechs'],
    );
    expect(result.rows[0].status).toBe('missing-local');
    expect(result.errors).toContain('missing-local: meks/unit.mtf');
  });
  test('five gaps are a missing-local row, and a difference outranks a gap', () => {
    const gaps = Object.fromEntries(QUANTITY_KEYS.map((k) => [k, 'none']));
    expect(run({ values: {}, gaps }).rows[0].status).toBe('missing-local');
    const mixed = values({ weightExact: 99 }, { criticalSlots: 'none' });
    delete (mixed.values as Record<string, number>).criticalSlots;
    expect(run(mixed).rows[0].status).toBe('different');
  });
});

describe('the Java reference quantities are validated, not trusted', () => {
  const invalid = (quantities: Record<string, unknown>) =>
    run(values(), reference(quantities));
  test.each([
    ['a missing unit', { ...JAVA, weightExact: { value: 50 } }],
    ['a wrong unit', { ...JAVA, weightExact: { value: 50, unit: 'kg' } }],
    [
      'a nonfinite value',
      { ...JAVA, weightExact: { value: Number.NaN, unit: 't' } },
    ],
    [
      'an exporter failure status',
      {
        ...JAVA,
        weightExact: { status: 'failed', reason: 'boom', unit: 't' },
      },
    ],
  ])('%s is reference-invalid', (_name, quantities) => {
    const result = invalid(quantities);
    expect(statuses(result).weightExact).toBe('reference-invalid');
    expect(result.rows[0].status).toBe('reference-invalid');
    expect(result.ok).toBe(false);
  });
  test('an absent Java quantity is missing-reference, an unexpected one is drift', () => {
    const { criticalSlots: _omit, ...rest } = JAVA;
    expect(statuses(invalid(rest)).criticalSlots).toBe('missing-reference');
    const extra = invalid({ ...JAVA, newQuantity: { value: 1, unit: 't' } });
    expect(extra.drift).toContain(
      'quantity-key-drift: meks/unit.mtf unexpected newQuantity',
    );
    expect(extra.ok).toBe(false);
  });
});

describe('the optional W2 extra input is cross-checked, never trusted over the primary', () => {
  const extraRow = (
    override: Record<string, unknown> = {},
    sha = key.sha256,
  ) => ({
    path: key.path,
    sha256: sha,
    construction: { verifierQuantities: { ...JAVA, ...override } },
  });
  const withExtra = (rows: unknown[]) =>
    buildQuantityReport(
      [local(values())] as never,
      [reference()] as never,
      ['battlemechs'],
      undefined,
      rows,
    );
  test('an agreeing row is accepted and changes nothing', () => {
    const result = withExtra([extraRow()]);
    expect(result.extraInput).toEqual({ rows: 1, accepted: 1 });
    expect(result.drift).toEqual([]);
    expect(result.rows[0].status).toBe('matched');
  });
  test.each([
    [
      'a different quantity',
      extraRow({ weightExact: { value: 51, unit: 't' } }),
      'extra-quantity-mismatch: meks/unit.mtf weightExact',
    ],
    [
      'an unknown path',
      { ...extraRow(), path: 'meks/other.mtf' },
      'extra-unknown: meks/other.mtf',
    ],
    [
      'a different source hash',
      extraRow({}, 'b'.repeat(64)),
      'extra-hash-mismatch: meks/unit.mtf',
    ],
    ['a malformed row', { path: key.path }, 'extra-rejected: meks/unit.mtf'],
  ])('%s is a drift finding', (_name, row, finding) => {
    const result = withExtra([row]);
    expect(result.drift).toContain(finding);
    expect(result.ok).toBe(false);
  });
  test('a duplicate row is rejected', () => {
    expect(withExtra([extraRow(), extraRow()]).drift).toContain(
      'extra-duplicate: meks/unit.mtf',
    );
  });
});

describe('rollups are deterministic', () => {
  const second = { path: 'meks/two.mtf', sha256: 'b'.repeat(64) };
  const build = (order: 0 | 1) => {
    const rows = [
      local(values(), key),
      local(values({ weightExact: 99 }), second),
    ];
    const refs = [reference(), reference(JAVA, MEK_SETTINGS, {}, second)];
    return buildQuantityReport(
      (order ? rows.reverse() : rows) as never,
      (order ? refs.reverse() : refs) as never,
      ['battlemechs'],
    );
  };
  test('counts by family and by quantity', () => {
    const result = build(0);
    expect(result.byFamily.battlemechs).toMatchObject({
      rows: 2,
      matched: 1,
      different: 1,
    });
    expect(result.byQuantity.battlemechs.weightExact).toMatchObject({
      compared: 2,
      exact: 1,
      different: 1,
    });
    expect(result.byQuantity.battlemechs.criticalSlots).toMatchObject({
      compared: 2,
      exact: 2,
    });
  });
  test('input order does not change the report', () => {
    expect(JSON.stringify(build(1))).toBe(JSON.stringify(build(0)));
  });
});

describe('settings: one cell per (family, verifierClass), with a drift guard', () => {
  test('pins the 24 exported keys', () => {
    expect(SETTING_KEYS).toHaveLength(24);
    expect([...SETTING_KEYS].sort()).toEqual(Object.keys(MEK_SETTINGS).sort());
  });
  test('one cell per class, not one term per row', () => {
    const result = run(values());
    expect(result.settings.cells).toHaveLength(1);
    expect(result.settings.cells[0]).toMatchObject({
      family: 'battlemechs',
      verifierClass: 'TestMek',
      rows: 1,
    });
    // 22 option getters plus gameYear; ammoTechLevel is per row.
    expect(result.settings.cells[0].results).toHaveLength(23);
  });
  test('a missing, extra or retyped Java key is a drift finding', () => {
    const { getPrintSize: _gone, ...fewer } = MEK_SETTINGS;
    expect(run(values(), reference(JAVA, fewer)).drift).toContain(
      'settings-key-drift: meks/unit.mtf missing getPrintSize',
    );
    expect(
      run(values(), reference(JAVA, { ...MEK_SETTINGS, newOption: 1 })).drift,
    ).toContain('settings-key-drift: meks/unit.mtf unexpected newOption');
    expect(
      run(values(), reference(JAVA, { ...MEK_SETTINGS, getPrintSize: '70' }))
        .drift,
    ).toContain('settings-type-drift: meks/unit.mtf getPrintSize string');
  });
  test('an option that differs inside one cell is a finding, not an average', () => {
    const second = { path: 'meks/two.mtf', sha256: 'b'.repeat(64) };
    const result = buildQuantityReport(
      [local(values(), key), local(values(), second)] as never,
      [
        reference(),
        reference(
          JAVA,
          { ...MEK_SETTINGS, getMaxOverweight: 0.25 },
          {},
          second,
        ),
      ] as never,
      ['battlemechs'],
    );
    expect(result.drift).toContain(
      'settings-varies-in-cell: battlemechs/TestMek getMaxOverweight',
    );
    expect(result.ok).toBe(false);
  });
  test('an unknown verifier class is drift, and its keys are not guessed', () => {
    const result = run(
      values(),
      reference(JAVA, MEK_SETTINGS, {}, key, 'BipedMek', 'TestFuture'),
    );
    expect(result.drift).toContain(
      'unknown-verifier-class: battlemechs/TestFuture',
    );
    const item = cellResult(result, 'skip', 'TestFuture');
    expect(item.status).toBe('missing-local');
  });
});

describe('settings: each cell is checked against the local owner of the same role', () => {
  const inject = (map: Record<string, unknown>) => (name: string) =>
    name in map
      ? { value: map[name], owner: 'test owner' }
      : { gap: 'no injected owner' };
  const withLocal = (map: Record<string, unknown>, fact = values()) =>
    buildQuantityReport(
      [local(fact)] as never,
      [reference()] as never,
      ['battlemechs'],
      inject(map),
    );
  test('equal local and Java is matched, unequal is different, with the owner kept', () => {
    const same = withLocal({ getWeightCeilingGyro: 'HALF_TON' });
    expect(cellResult(same, 'getWeightCeilingGyro')).toMatchObject({
      status: 'matched',
      java: 'HALF_TON',
      ours: 'HALF_TON',
      owner: 'test owner',
    });
    const other = withLocal({ getWeightCeilingGyro: 'KILO' });
    expect(cellResult(other, 'getWeightCeilingGyro').status).toBe('different');
  });
  test('a consumed option with no local owner is missing-local with the reason', () => {
    expect(cellResult(withLocal({}), 'getWeightCeilingGyro')).toMatchObject({
      status: 'missing-local',
      reason: 'no injected owner',
    });
  });
  test('an option no Java call site reads for this class is an unaccepted inapplicable candidate', () => {
    const result = withLocal({ getWeightCeilingEngine: 'HALF_TON' });
    const item = cellResult(result, 'getWeightCeilingEngine');
    expect(item.status).toBe('inapplicable-candidate');
    expect(item.evidence).toContain('TestEntity.java:192');
    // Not excluded: the cell is itself a failing finding until the owner accepts it.
    expect(result.errors).toContain(
      'settings-inapplicable-candidate: battlemechs/TestMek getWeightCeilingEngine',
    );
    expect(result.ok).toBe(false);
    expect(
      result.settings.inapplicableCandidates.some(
        (c) =>
          c.key === 'getWeightCeilingEngine' && c.verifierClass === 'TestMek',
      ),
    ).toBe(true);
  });
  test('options gated off by another pinned option are candidates too', () => {
    const result = withLocal({});
    expect(cellResult(result, 'getMinUnderweight')).toMatchObject({
      status: 'inapplicable-candidate',
    });
    expect(cellResult(result, 'getMinUnderweight').reason).toContain(
      'showUnderweightEntity',
    );
    expect(cellResult(result, 'getTargetingComputerCrits').status).toBe(
      'inapplicable-candidate',
    );
  });
  test('the support-vehicle armor ceiling is consumed through the inherited patchwork path, so both family cells are missing-local', () => {
    // TestSupportVehicle.java:773-774 calls super.calculateWeightExact(), which
    // reaches getWeightAllocatedArmor (TestEntity.java:1017-1018, :600-616) on
    // patchwork armor. Zero corpus patchwork rows does not remove that path.
    const rows = [
      { path: 'vehicles/sv.blk', sha256: 'd'.repeat(64) },
      { path: 'convfighter/fws.blk', sha256: 'e'.repeat(64) },
    ];
    const result = buildQuantityReport(
      rows.map((row) => local(values(), row)) as never,
      [
        reference(
          JAVA,
          MEK_SETTINGS,
          {},
          rows[0],
          'SupportTank',
          'TestSupportVehicle',
        ),
        reference(
          JAVA,
          MEK_SETTINGS,
          {},
          rows[1],
          'FixedWingSupport',
          'TestSupportVehicle',
        ),
      ] as never,
      ['vehicles', 'aerospace'],
    );
    for (const family of ['vehicles', 'aerospace']) {
      const item = result.settings.cells
        .find(
          (c) =>
            c.family === family && c.verifierClass === 'TestSupportVehicle',
        )!
        .results.find((r) => r.key === 'getWeightCeilingArmor')!;
      expect(item.status).toBe('missing-local');
      expect(item.reason).toContain('patchwork');
      expect(
        result.settings.inapplicableCandidates.some(
          (c) =>
            c.family === family &&
            c.verifierClass === 'TestSupportVehicle' &&
            c.key === 'getWeightCeilingArmor',
        ),
      ).toBe(false);
    }
  });
  test('an absent rule cannot be cited, so skip and showUnderweightEntity stay missing-local', () => {
    const result = buildQuantityReport(
      [local(values())] as never,
      [reference()] as never,
      ['battlemechs'],
    );
    for (const name of ['skip', 'showUnderweightEntity']) {
      expect(cellResult(result, name)).toMatchObject({
        status: 'missing-local',
        reason: 'no local owner; absence cannot be cited',
      });
    }
  });
});

describe('settings: the overweight tolerance gap is measured, not hidden', () => {
  const aero = (settings: Record<string, unknown>) =>
    reference(
      JAVA,
      { ...MEK_SETTINGS, getMaxOverweight: 0.25, ...settings },
      {},
      { path: 'fighters/x.blk', sha256: 'c'.repeat(64) },
      'AeroSpaceFighter',
      'TestAero',
    );
  const aeroRow = { path: 'fighters/x.blk', sha256: 'c'.repeat(64) };
  const runAero = (probe: number | 'no-check', exact = 50) =>
    buildQuantityReport(
      [local(values({}, {}, { overweightTolerance: probe }), aeroRow)] as never,
      [
        reference(
          { ...JAVA, weightExact: { value: exact, unit: 't' } },
          { ...MEK_SETTINGS, getMaxOverweight: 0.25 },
          {},
          aeroRow,
          'AeroSpaceFighter',
          'TestAero',
        ),
      ] as never,
      ['aerospace'],
    );
  test('local zero tolerance against Java 0.25 is a different finding with the band evidence', () => {
    const result = runAero(0);
    const item = cellResult(result, 'getMaxOverweight', 'TestAero');
    expect(item).toMatchObject({ status: 'different', java: 0.25, ours: 0 });
    expect(item.evidence).toContain('0 rows lie in the (0, 0.25] t band');
    expect(
      cellResult(result, 'showOverweightedEntity', 'TestAero').status,
    ).toBe('matched');
  });
  test('rows inside the band are counted, so the claim can never be assumed', () => {
    const result = runAero(0, 50.2);
    expect(
      cellResult(result, 'getMaxOverweight', 'TestAero').evidence,
    ).toContain('1 rows lie in the (0, 0.25] t band');
  });
  test('Java 0 against a local probe of 0 is matched; no check at all is missing-local', () => {
    const matched = run(values({}, {}, { overweightTolerance: 0 }));
    expect(cellResult(matched, 'getMaxOverweight').status).toBe('matched');
    const none = run(values({}, {}, { overweightTolerance: 'no-check' }));
    expect(cellResult(none, 'getMaxOverweight')).toMatchObject({
      status: 'missing-local',
    });
    expect(cellResult(none, 'getMaxOverweight').reason).toContain(
      'no overweight check ran',
    );
    expect(aero({}).construction.settings.getMaxOverweight).toBe(0.25);
  });
});

describe('settings that vary per unit stay per row', () => {
  const second = { path: 'meks/two.mtf', sha256: 'b'.repeat(64) };
  const build = (gameYear: number) =>
    buildQuantityReport(
      [local(values(), key), local(values(), second)] as never,
      [
        reference(),
        reference(
          JAVA,
          { ...MEK_SETTINGS, gameYear, ammoTechLevel: 7 },
          {},
          second,
        ),
      ] as never,
      ['battlemechs'],
    );
  test('ammoTechLevel is missing-local on every row, by ruling', () => {
    const result = build(-1);
    expect(result.settings.perRow.ammoTechLevel).toMatchObject({
      rows: 2,
      missingLocal: 2,
    });
    expect(result.settings.perRow.ammoTechLevel.values).toEqual({
      '2': 1,
      '7': 1,
    });
  });
  test('gameYear is a cell constant until a row differs, then each row is a finding', () => {
    expect(build(-1).settings.perRow.gameYear.findings).toEqual([]);
    const varied = build(2750);
    expect(varied.settings.perRow.gameYear.findings).toEqual([
      'meks/two.mtf',
      'meks/unit.mtf',
    ]);
  });
});

/** Census cells mechanically transcribed from main-39c28d025-combined/terms;
 * the full-corpus proof checks these expectations against the actual inputs. */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { readTrustedReferences } from '../unit-bv-provenance';
import { buildQuantityReport } from '../unit-construction-quantities';
import {
  compareSettings,
  SETTING_SPECS,
  type ISettingsRow,
} from '../unit-construction-settings';
import acceptance from '../unit-construction-settings-acceptance.json';

const identity = acceptance.reference;

describe('reference identity is bound to the bytes read by the trusted reader', () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'd3-reference-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    jest.restoreAllMocks();
  });
  const publish = () => {
    const source = { path: 'meks/test.mtf', sha256: 'a'.repeat(64) };
    const row = {
      ...source,
      battleValue: { mode: 'test' },
      construction: { settings: OPTIONS },
    };
    const bytes = JSON.stringify(row) + '\n';
    const configuration = {
      version: 1,
      runtime: {
        megamekCommit: identity.megamekCommit,
        megameklabCommit: 'b'.repeat(40),
        mmDataCommit: 'c'.repeat(40),
        javaVersion: '21',
        dependencyManifestSha256: 'd'.repeat(64),
        compiledRuntimeManifestSha256: 'e'.repeat(64),
        exporterSha256: 'f'.repeat(64),
        verifierConfigSha256: identity.verifierConfigSha256,
      },
      crew: { state: 'default' },
      network: { attachedGame: false },
      bvOverrides: { ignoreC3: true },
    };
    const receipt = {
      ...configuration,
      referenceSha256: createHash('sha256').update(bytes).digest('hex'),
    };
    const file = path.join(root, 'reference.jsonl');
    const policy = path.join(root, 'policy.json');
    fs.writeFileSync(file, bytes);
    fs.writeFileSync(file + '.provenance.json', JSON.stringify(receipt));
    fs.writeFileSync(
      policy,
      JSON.stringify({
        ...configuration,
        battleValueMode: 'test',
        verifierSettings: { [source.path]: OPTIONS },
      }),
    );
    return { file, policy, receipt, row };
  };
  test('preserves the legacy array return and opts into the verified identity', () => {
    const fixture = publish();
    expect(
      readTrustedReferences(fixture.file, fixture.policy, root, 'blocking'),
    ).toEqual([fixture.row]);
    expect(
      readTrustedReferences(
        fixture.file,
        fixture.policy,
        root,
        'blocking',
        true,
      ),
    ).toEqual({
      rows: [fixture.row],
      identity: {
        megamekCommit: identity.megamekCommit,
        verifierConfigSha256: identity.verifierConfigSha256,
      },
    });
  });
  test.each(['wrong reference hash', 'missing config', 'missing sidecar'])(
    '%s supplies no identity in report-only mode',
    (cause) => {
      const fixture = publish();
      if (cause === 'missing sidecar')
        fs.unlinkSync(fixture.file + '.provenance.json');
      else {
        const receipt =
          cause === 'missing config'
            ? {
                ...fixture.receipt,
                runtime: {
                  ...fixture.receipt.runtime,
                  verifierConfigSha256: undefined,
                },
              }
            : { ...fixture.receipt, referenceSha256: '0'.repeat(64) };
        fs.writeFileSync(
          fixture.file + '.provenance.json',
          JSON.stringify(receipt),
        );
      }
      jest.spyOn(process.stderr, 'write').mockReturnValue(true);
      expect(
        readTrustedReferences(
          fixture.file,
          fixture.policy,
          root,
          'report-only',
          true,
        ),
      ).toEqual({ rows: [fixture.row], identity: undefined });
    },
  );
});
const censusRows = (): ISettingsRow[] =>
  CENSUS.map((cell, index) => ({
    path: `${cell.family}/${index}.blk`,
    family: cell.family,
    verifierClass: cell.verifierClass,
    settings: { ...OPTIONS, ...cell.options },
    javaWeights: {},
    probe: {
      overweightTolerance:
        typeof cell.tolerance === 'number' ? cell.tolerance : 'no-check',
    },
  }));
const acceptedTriples = (report: ReturnType<typeof compareSettings>) =>
  report.cells.flatMap((cell) =>
    cell.results
      .filter((result) => result.status === 'accepted-inapplicable')
      .map(({ key }) => ({
        family: cell.family,
        verifierClass: cell.verifierClass,
        key,
      })),
  );

describe('D3 acceptance is limited to the reviewed cells and reference identity', () => {
  test('accepts exactly the real 157 triples and preserves the other census cells', () => {
    const result = compareSettings(censusRows(), undefined, identity);
    expect(acceptance.cells).toHaveLength(157);
    expect(
      new Set(acceptance.cells.map((cell) => JSON.stringify(cell))).size,
    ).toBe(157);
    expect(acceptedTriples(result)).toEqual(acceptance.cells);
    expect(result.counts).toEqual({
      matched: 24,
      different: 4,
      'missing-local': 68,
      'inapplicable-candidate': 0,
      'accepted-inapplicable': 157,
    });
    expect(result.inapplicableCandidates).toEqual([]);
    expect(
      result.errors.filter((error) =>
        error.startsWith('settings-inapplicable-candidate:'),
      ),
    ).toEqual([]);
    expect(result.drift).toEqual([]);
    const before = compareSettings(censusRows());
    expect(before.errors.length - result.errors.length).toBe(157);
    for (const [index, cell] of result.cells.entries()) {
      for (const [offset, item] of cell.results.entries()) {
        const old = before.cells[index].results[offset];
        expect(item).toEqual(
          old.status === 'inapplicable-candidate'
            ? { ...old, status: 'accepted-inapplicable' }
            : old,
        );
      }
    }
    expect(result.perRow).toEqual(before.perRow);
  });

  test.each([
    ['missing identity', undefined],
    ['different pin', { ...identity, megamekCommit: '0'.repeat(40) }],
    ['different config', { ...identity, verifierConfigSha256: '0'.repeat(64) }],
    ['missing config', { megamekCommit: identity.megamekCommit }],
    ['missing pin', { verifierConfigSha256: identity.verifierConfigSha256 }],
  ])('%s excludes no cells', (_name, referenceIdentity) => {
    const result = compareSettings(censusRows(), undefined, referenceIdentity);
    expect(acceptedTriples(result)).toEqual([]);
    expect(result.counts['inapplicable-candidate']).toBe(157);
    expect(
      result.errors.filter((error) =>
        error.startsWith('settings-inapplicable-candidate:'),
      ),
    ).toHaveLength(157);
  });

  test('an unlisted family candidate and a listed key in an unlisted class still fail', () => {
    const row = censusRows()[0];
    const result = compareSettings(
      [
        { ...row, path: 'new-family/unit.blk', family: 'new-family' },
        {
          ...row,
          path: 'infantry/unit.blk',
          family: 'infantry',
          verifierClass: 'TestAero',
        },
      ],
      undefined,
      identity,
    );
    expect(acceptedTriples(result)).toEqual([]);
    expect(result.errors).toContain(
      'settings-inapplicable-candidate: new-family/TestAero getWeightCeilingEngine',
    );
    expect(result.errors).toContain(
      'settings-inapplicable-candidate: infantry/TestAero getWeightCeilingEngine',
    );
  });

  test('a newly consumed accepted cell fails as drift even if the local value matches', () => {
    const spec = SETTING_SPECS.find(
      (item) => item.key === 'getWeightCeilingEngine',
    )!;
    const previous = spec.consumers.TestAero;
    spec.consumers.TestAero = 'future TestAero numeric consumer';
    try {
      const result = compareSettings(
        censusRows(),
        () => ({ value: 'HALF_TON', owner: 'future owner' }),
        identity,
      );
      expect(result.drift).toContain(
        'accepted-inapplicable-consumer-drift: aerospace/TestAero getWeightCeilingEngine',
      );
      expect(acceptedTriples(result)).not.toContainEqual({
        family: 'aerospace',
        verifierClass: 'TestAero',
        key: 'getWeightCeilingEngine',
      });
    } finally {
      if (previous === undefined) delete spec.consumers.TestAero;
      else spec.consumers.TestAero = previous;
    }
  });

  test('an enabled pinned gate becomes consumer drift', () => {
    const rows = censusRows().map((row) => ({
      ...row,
      settings: { ...row.settings, showUnderweightEntity: true },
    }));
    const result = compareSettings(rows, undefined, identity);
    expect(result.drift).toContain(
      'accepted-inapplicable-consumer-drift: battlemechs/TestMek getMinUnderweight',
    );
  });

  test('quantity rows, missing-local settings and per-row settings are unchanged', () => {
    const row = censusRows().find((item) => item.family === 'battlemechs')!;
    const source = { path: 'meks/unit.mtf', sha256: 'a'.repeat(64) };
    const reference = {
      ...source,
      concreteFamily: 'BipedMek',
      battleValue: {
        total: 1,
        aggregates: { defensiveValue: 1, offensiveValue: 0 },
      },
      construction: {
        verifierClass: `megamek.common.verifier.${row.verifierClass}`,
        settings: row.settings,
        verifierQuantities: {},
      },
    };
    const computed = [
      { ...source, constructionQuantities: { values: {}, gaps: {} } },
    ];
    const before = buildQuantityReport(computed, [reference], ['battlemechs']);
    const after = buildQuantityReport(
      computed,
      [reference],
      ['battlemechs'],
      undefined,
      [],
      identity,
    );
    expect(after.rows).toEqual(before.rows);
    expect(after.byQuantity).toEqual(before.byQuantity);
    expect(after.byFamily).toEqual(before.byFamily);
    expect(after.settings.perRow).toEqual(before.settings.perRow);
    expect(after.settings.counts['missing-local']).toBe(
      before.settings.counts['missing-local'],
    );
    expect(after.ok).toBe(false);
  });
});

const OPTIONS: Record<string, unknown> = {
  getWeightCeilingEngine: 'HALF_TON',
  getWeightCeilingStructure: 'HALF_TON',
  getWeightCeilingArmor: 'HALF_TON',
  getWeightCeilingControls: 'HALF_TON',
  getWeightCeilingWeapons: 'TON',
  getWeightCeilingTargComp: 'TON',
  getWeightCeilingGyro: 'HALF_TON',
  getWeightCeilingTurret: 'HALF_TON',
  getWeightCeilingLifting: 'HALF_TON',
  getWeightCeilingPowerAmp: 'HALF_TON',
  getMaxOverweight: 0.25,
  getMinUnderweight: 1,
  showOverweightedEntity: true,
  showUnderweightEntity: false,
  showCorrectArmor: true,
  showCorrectCritical: true,
  showFailedEquip: true,
  showIncorrectIntroYear: true,
  getIntroYearMargin: 5,
  skip: false,
  getTargetingComputerCrits: 0,
  getPrintSize: 70,
  gameYear: -1,
  ammoTechLevel: 1,
};
const CENSUS = [
  {
    family: 'aerospace',
    verifierClass: 'TestAero',
    options: {},
    tolerance: 0,
  },
  {
    family: 'aerospace',
    verifierClass: 'TestSmallCraft',
    options: {},
    tolerance: 0,
  },
  {
    family: 'aerospace',
    verifierClass: 'TestSupportVehicle',
    options: {
      getMaxOverweight: 0,
    },
    tolerance: 0,
  },
  {
    family: 'battlearmor',
    verifierClass: 'TestBattleArmor',
    options: {},
    tolerance: 'no-check',
  },
  {
    family: 'battlemechs',
    verifierClass: 'TestMek',
    options: {
      getMaxOverweight: 0,
    },
    tolerance: 0,
  },
  {
    family: 'capital',
    verifierClass: 'TestAdvancedAerospace',
    options: {},
    tolerance: 0,
  },
  {
    family: 'capital',
    verifierClass: 'TestSmallCraft',
    options: {},
    tolerance: 0,
  },
  {
    family: 'infantry',
    verifierClass: 'TestInfantry',
    options: {},
    tolerance: 'no-check',
  },
  {
    family: 'protomeks',
    verifierClass: 'TestProtoMek',
    options: {
      getWeightCeilingEngine: 'KILO',
      getWeightCeilingStructure: 'KILO',
      getWeightCeilingArmor: 'KILO',
      getWeightCeilingControls: 'KILO',
      getWeightCeilingWeapons: 'KILO',
      getWeightCeilingTargComp: 'KILO',
      getWeightCeilingGyro: 'KILO',
      getMaxOverweight: 0,
      getMinUnderweight: 0,
    },
    tolerance: 'no-check',
  },
  {
    family: 'vehicles',
    verifierClass: 'TestSupportVehicle',
    options: {
      getMaxOverweight: 0,
    },
    tolerance: 0,
  },
  {
    family: 'vehicles',
    verifierClass: 'TestTank',
    options: {
      getMaxOverweight: 0,
    },
    tolerance: 0,
  },
];

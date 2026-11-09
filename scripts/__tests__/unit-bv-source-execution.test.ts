import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { deserialize, serialize } from 'node:v8';

import stages from '../megameklab-conversion/java-reference/bv-stages.json';
import {
  buildDeltaReport,
  familyOf,
  type IComputedRow,
  type IJavaReferenceRow,
} from '../unit-bv-parity';
import {
  calculateSources,
  main,
  sourceHash,
  writeDeltaReport,
} from '../vehicle-aero-bv-delta';

let mockReferenceRows: IJavaReferenceRow[] = [];
jest.mock('../unit-bv-provenance', () => ({
  ...jest.requireActual('../unit-bv-provenance'),
  validateSourceManifest: jest.fn(),
  readJsonLines: () => [],
  readTrustedReferences: () => ({
    rows: mockReferenceRows,
    identity: undefined,
  }),
}));
jest.mock('../unit-bv-parity', () => {
  const actual =
    jest.requireActual<typeof import('../unit-bv-parity')>('../unit-bv-parity');
  return { ...actual, buildDeltaReport: jest.fn(actual.buildDeltaReport) };
});

it('keeps source hash and sourceText validation ahead of calculation, including failed rows', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-source-'));
  try {
    const text = 'unsupported\r\n';
    fs.mkdirSync(path.join(root, 'battlearmor'));
    fs.writeFileSync(path.join(root, 'battlearmor', 'x.blk'), text);
    const row = {
      path: 'battlearmor/x.blk',
      sha256: sourceHash(Buffer.from(text)),
      unit: null,
      sourceText: text,
    };
    const computed = calculateSources([row], root);
    expect(computed[0].reason).toBeDefined();
    expect(deserialize(serialize(computed))).toEqual(computed);
    expect(() =>
      calculateSources([{ ...row, sha256: 'a'.repeat(64) }], root),
    ).toThrow('Source hash mismatch');
    expect(() =>
      calculateSources([{ ...row, sourceText: 'changed' }], root),
    ).toThrow('Source text hash mismatch');
    expect(() =>
      calculateSources([{ ...row, path: '../outside.blk' }], root),
    ).toThrow('Source escapes pin');
    expect(() =>
      calculateSources([{ ...row, path: 'battlearmor/missing.blk' }], root),
    ).toThrow();
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('opt-in local-only BV key-set CLI report', () => {
  let root: string;
  const argv = process.argv;
  const exitCode = process.exitCode;
  const actualBuild =
    jest.requireActual<typeof import('../unit-bv-parity')>(
      '../unit-bv-parity',
    ).buildDeltaReport;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-key-set-cli-'));
    fs.writeFileSync(path.join(root, 'sources.ndjson'), '');
    jest.spyOn(process.stdout, 'write').mockReturnValue(true);
  });
  afterEach(() => {
    process.argv = argv;
    process.exitCode = exitCode;
    jest.mocked(buildDeltaReport).mockReset();
    jest.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  function prepare(
    pathName: string,
    extras: Record<string, number>,
    unassessed = false,
  ) {
    const terms = {
      ...Object.fromEntries(Object.keys(stages).map((key) => [key, 1])),
      'ammo.cap.MG:2': 5,
    };
    const java: IJavaReferenceRow = {
      path: pathName,
      sha256: 'a'.repeat(64),
      concreteFamily: 'Tank',
      battleValue: {
        total: 100,
        aggregates: { defensiveValue: 60, offensiveValue: 40 },
        terms,
      },
    };
    const ours: IComputedRow = {
      path: java.path,
      sha256: java.sha256,
      figure: {
        total: 100,
        defensive: 60,
        offensive: 40,
        terms: unassessed ? undefined : { ...terms, ...extras },
      },
    };
    mockReferenceRows = [java];
    const report = actualBuild([ours], [java], [familyOf(java)], true);
    jest.mocked(buildDeltaReport).mockReturnValue(report);
    return report;
  }

  function run(out: string, enabled: boolean) {
    process.argv = [
      'node',
      'comparator',
      '--converted',
      path.join(root, 'sources.ndjson'),
      '--mekfiles',
      root,
      '--reference',
      path.join(root, 'oracle.jsonl'),
      '--out',
      path.join(root, out),
      '--per-term',
      ...(enabled ? ['--bv-key-set'] : []),
    ];
    process.exitCode = 0;
    main();
    return process.exitCode;
  }

  it.each(['vehicles/unit.blk', 'meks/unit.mtf'])(
    'fails on a native local-only cap at %s and preserves both legacy files',
    (pathName) => {
      const report = prepare(pathName, { 'ammo.cap.VGL:1': 0 });
      expect(report.ok).toBe(true);
      writeDeltaReport(report, path.join(root, 'baseline'));
      expect(run('off', false)).toBe(0);
      expect(fs.existsSync(path.join(root, 'off/bv-key-set-report.json'))).toBe(
        false,
      );
      expect(fs.existsSync(path.join(root, 'off/bv-key-set-rows.jsonl'))).toBe(
        false,
      );
      expect(run('on', true)).toBe(1);
      for (const name of ['delta-report.json', 'delta-rows.jsonl']) {
        const bytes = fs.readFileSync(path.join(root, 'baseline', name));
        expect(fs.readFileSync(path.join(root, 'off', name))).toEqual(bytes);
        expect(fs.readFileSync(path.join(root, 'on', name))).toEqual(bytes);
      }
      const summary = JSON.parse(
        fs.readFileSync(path.join(root, 'on/bv-key-set-report.json'), 'utf8'),
      );
      expect(summary.counts).toMatchObject({
        nativeFindings: 1,
        nonNativeLocalDiagnostics: 0,
        unassessedRows: 0,
      });
      const rows = fs
        .readFileSync(path.join(root, 'on/bv-key-set-rows.jsonl'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
      expect(rows).toEqual([
        expect.objectContaining({
          category: 'native-local-only',
          path: pathName,
          term: 'ammo.cap.VGL:1',
          value: 0,
        }),
      ]);
    },
  );

  const diagnosticCases: Record<string, number>[] = [{}, { final: 100 }];
  it.each(diagnosticCases)(
    'passes with only non-native diagnostics or no extras: %j',
    (extras) => {
      prepare('vehicles/unit.blk', extras);
      expect(run('on', true)).toBe(0);
      const summary = JSON.parse(
        fs.readFileSync(path.join(root, 'on/bv-key-set-report.json'), 'utf8'),
      );
      expect(summary.counts).toMatchObject({
        nativeFindings: 0,
        nonNativeLocalDiagnostics: Object.keys(extras).length,
      });
    },
  );

  it('keeps unavailable term maps unassessed and fails the selected check', () => {
    prepare('vehicles/unit.blk', {}, true);
    expect(run('on', true)).toBe(1);
    const summary = JSON.parse(
      fs.readFileSync(path.join(root, 'on/bv-key-set-report.json'), 'utf8'),
    );
    expect(summary.counts.unassessedRows).toBe(1);
  });
});

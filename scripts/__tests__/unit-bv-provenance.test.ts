import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  validateSourceManifest,
  writeSourceManifest,
  readTrustedReferences,
} from '../unit-bv-provenance';
import { main } from '../vehicle-aero-bv-delta';

describe('reference runtime/settings trust before numerical work', () => {
  let root: string;
  const argv = process.argv;
  const exitCode = process.exitCode;
  const sourcePath = 'vehicles/unit.blk';
  const settings = { gameYear: -1, ammoTechLevel: 1, getMaxOverweight: 0.25 };
  const runtime = {
    megamekCommit: 'a'.repeat(40),
    megameklabCommit: 'b'.repeat(40),
    mmDataCommit: 'c'.repeat(40),
    javaVersion: '21.0.12.1+1',
    dependencyManifestSha256: 'd'.repeat(64),
    compiledRuntimeManifestSha256: 'e'.repeat(64),
    exporterSha256: 'f'.repeat(64),
    verifierConfigSha256: '1'.repeat(64),
  };
  const configuration = () => ({
    runtime: { ...runtime },
    crew: { state: 'fresh-loaded-default' },
    network: { game: 'none' },
    bvOverrides: { state: 'none' },
  });
  const mode = 'ignoreC3=true,ignoreSkill=true,ignoreTAG=true';
  const make = () => {
    const reference = {
      path: sourcePath,
      sha256: createHash('sha256').update('source').digest('hex'),
      concreteFamily: 'Tank',
      battleValue: {
        mode,
        total: 100,
        aggregates: { defensiveValue: 60, offensiveValue: 40 },
      },
      construction: { settings: { ...settings } },
    };
    return {
      reference,
      receipt: { version: 1, referenceSha256: '', ...configuration() },
      policy: {
        version: 1,
        ...configuration(),
        battleValueMode: mode,
        verifierSettings: { [sourcePath]: { ...settings } },
      },
    };
  };
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-reference-trust-'));
    fs.mkdirSync(path.join(root, 'vehicles'));
    fs.writeFileSync(path.join(root, sourcePath), 'source');
    const sources = Buffer.from(
      JSON.stringify({ ...make().reference, unit: null }) + '\n',
    );
    fs.writeFileSync(path.join(root, 'sources.ndjson'), sources);
    writeSourceManifest(path.join(root, 'sources.ndjson'), sources, [
      'meks',
      'vehicles',
      'fighters',
      'convfighter',
      'smallcraft',
      'dropships',
      'jumpships',
      'warship',
      'spacestation',
      'battlearmor',
      'infantry',
      'protomeks',
    ]);
    process.argv = [
      'node',
      'comparator',
      '--converted',
      path.join(root, 'sources.ndjson'),
      '--mekfiles',
      root,
      '--reference',
      path.join(root, 'oracle.jsonl'),
      '--reference-policy',
      path.join(root, 'expected.json'),
      '--reference-trust',
      'blocking',
      '--out',
      path.join(root, 'report'),
    ];
    jest.spyOn(process.stdout, 'write').mockReturnValue(true);
    jest.spyOn(process.stderr, 'write').mockReturnValue(true);
  });
  afterEach(() => {
    process.argv = argv;
    process.exitCode = exitCode;
    jest.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });
  function publish(fixture: ReturnType<typeof make>): void {
    const bytes = Buffer.from(JSON.stringify(fixture.reference) + '\n');
    fixture.receipt.referenceSha256 = createHash('sha256')
      .update(bytes)
      .digest('hex');
    fs.writeFileSync(path.join(root, 'oracle.jsonl'), bytes);
    fs.writeFileSync(
      path.join(root, 'oracle.jsonl.provenance.json'),
      JSON.stringify(fixture.receipt),
    );
    fs.writeFileSync(
      path.join(root, 'expected.json'),
      JSON.stringify(fixture.policy),
    );
  }
  it.each(['report-only', 'blocking'] as const)(
    '%s records and prints a violation while only blocking mode rejects it',
    (mode) => {
      const fixture = make();
      fixture.receipt.crew.state = 'custom-crew';
      publish(fixture);
      process.exitCode = 0;
      const read = () =>
        readTrustedReferences(
          path.join(root, 'oracle.jsonl'),
          path.join(root, 'expected.json'),
          path.join(root, 'report'),
          mode,
        );
      if (mode === 'report-only') {
        expect(read()).toEqual([fixture.reference]);
        expect(process.exitCode).toBe(0);
      } else expect(read).toThrow('Reference provenance rejected');
      const report = JSON.parse(
        fs.readFileSync(
          path.join(root, 'report/reference-provenance-report.json'),
          'utf8',
        ),
      );
      expect(report).toMatchObject({
        ok: false,
        mode,
        mismatches: [expect.objectContaining({ field: 'crew.state' })],
      });
      expect(process.stderr.write).toHaveBeenCalledWith(
        expect.stringContaining('crew.state'),
      );
    },
  );
  const failures: [string, (f: ReturnType<typeof make>) => void][] = [
    [
      'runtime.javaVersion',
      (f) => {
        f.receipt.runtime.javaVersion = '17';
      },
    ],
    [
      'runtime.megamekCommit',
      (f) => {
        f.receipt.runtime.megamekCommit = '0'.repeat(40);
      },
    ],
    [
      'runtime.dependencyManifestSha256',
      (f) => {
        f.receipt.runtime.dependencyManifestSha256 = '0'.repeat(64);
      },
    ],
    [
      'runtime.compiledRuntimeManifestSha256',
      (f) => {
        f.receipt.runtime.compiledRuntimeManifestSha256 = '0'.repeat(64);
      },
    ],
    [
      'runtime.verifierConfigSha256',
      (f) => {
        f.receipt.runtime.verifierConfigSha256 = '0'.repeat(64);
      },
    ],
    [
      'crew.state',
      (f) => {
        f.receipt.crew.state = 'custom-gunnery';
      },
    ],
    [
      'network.game',
      (f) => {
        f.receipt.network.game = 'attached-C3-network';
      },
    ],
    [
      'bvOverrides.state',
      (f) => {
        f.receipt.bvOverrides.state = 'damaged-design';
      },
    ],
    [
      `reference[${sourcePath}].battleValue.mode`,
      (f) => {
        f.reference.battleValue.mode =
          'ignoreC3=false,ignoreSkill=false,ignoreTAG=true';
      },
    ],
    [
      `reference[${sourcePath}].construction.settings.getMaxOverweight`,
      (f) => {
        f.reference.construction.settings.getMaxOverweight = 0.5;
      },
    ],
    [
      `reference[${sourcePath}].construction.settings.ammoTechLevel`,
      (f) => {
        f.reference.construction.settings.ammoTechLevel = 2;
      },
    ],
  ];
  it.each(failures)(
    'rejects %s with named expected/actual evidence before source calculation',
    (field, alter) => {
      const fixture = make();
      alter(fixture);
      publish(fixture);
      // Any attempt to calculate first would fail with ENOENT, obscuring trust rejection.
      fs.rmSync(path.join(root, sourcePath));
      expect(() => main()).toThrow('Reference provenance rejected');
      const report = JSON.parse(
        fs.readFileSync(
          path.join(root, 'report/reference-provenance-report.json'),
          'utf8',
        ),
      );
      expect(report.ok).toBe(false);
      expect(report.mismatches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field,
            reason: 'different',
            expected: expect.anything(),
            actual: expect.anything(),
          }),
        ]),
      );
      expect(fs.existsSync(path.join(root, 'report/delta-report.json'))).toBe(
        false,
      );
    },
  );
  it('accepts independently matching metadata and preserves separate numerical failure', () => {
    publish(make());
    expect(() => main()).not.toThrow();
    const trust = JSON.parse(
      fs.readFileSync(
        path.join(root, 'report/reference-provenance-report.json'),
        'utf8',
      ),
    );
    expect(trust).toMatchObject({ ok: true, mismatches: [] });
    // Trust acceptance does not count a unit:null source or missing families as parity.
    expect(process.exitCode).toBe(1);
    expect(
      JSON.parse(
        fs.readFileSync(path.join(root, 'report/delta-report.json'), 'utf8'),
      ).ok,
    ).toBe(false);
  });
  it.each(['receipt', 'policy', 'rowSettings', 'expectedSettings', 'payload'])(
    'fails closed when %s evidence is missing or stale',
    (missing) => {
      publish(make());
      if (missing === 'receipt')
        fs.rmSync(path.join(root, 'oracle.jsonl.provenance.json'));
      if (missing === 'policy') fs.rmSync(path.join(root, 'expected.json'));
      if (missing === 'rowSettings') {
        const fixture = make();
        fs.writeFileSync(
          path.join(root, 'oracle.jsonl'),
          JSON.stringify({ ...fixture.reference, construction: {} }) + '\n',
        );
      }
      if (missing === 'expectedSettings') {
        const fixture = make();
        fs.writeFileSync(
          path.join(root, 'expected.json'),
          JSON.stringify({ ...fixture.policy, verifierSettings: {} }),
        );
      }
      if (missing === 'payload')
        fs.appendFileSync(path.join(root, 'oracle.jsonl'), '\n');
      expect(() => main()).toThrow('Reference provenance rejected');
      const report = JSON.parse(
        fs.readFileSync(
          path.join(root, 'report/reference-provenance-report.json'),
          'utf8',
        ),
      );
      expect(report.ok).toBe(false);
      expect(report.mismatches.length).toBeGreaterThan(0);
      expect(fs.existsSync(path.join(root, 'report/delta-report.json'))).toBe(
        false,
      );
    },
  );
  it('does not discard extra runtime or verifier fields and accumulates named mismatches', () => {
    const fixture = make();
    publish(fixture);
    fs.writeFileSync(
      path.join(root, 'oracle.jsonl.provenance.json'),
      JSON.stringify({
        ...fixture.receipt,
        runtime: {
          ...fixture.receipt.runtime,
          customClasspath: 'different.jar',
        },
        crew: { ...fixture.receipt.crew, gunnery: 2 },
      }),
    );
    fs.writeFileSync(
      path.join(root, 'expected.json'),
      JSON.stringify({
        ...fixture.policy,
        verifierSettings: {
          [sourcePath]: { ...settings, unknownOption: true },
        },
      }),
    );
    expect(() => main()).toThrow('Reference provenance rejected');
    const report = JSON.parse(
      fs.readFileSync(
        path.join(root, 'report/reference-provenance-report.json'),
        'utf8',
      ),
    );
    expect(report.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'runtime.customClasspath',
          reason: 'missingExpected',
        }),
        expect.objectContaining({
          field: 'crew.gunnery',
          reason: 'missingExpected',
        }),
        expect.objectContaining({
          field: `reference[${sourcePath}].construction.settings.unknownOption`,
          reason: 'missingActual',
        }),
      ]),
    );
  });
  it('preserves native source hash rejection after accepting reference settings', () => {
    publish(make());
    fs.appendFileSync(path.join(root, sourcePath), 'changed source');
    expect(() => main()).toThrow(`Source hash mismatch: ${sourcePath}`);
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(root, 'report/reference-provenance-report.json'),
          'utf8',
        ),
      ).ok,
    ).toBe(true);
    expect(fs.existsSync(path.join(root, 'report/delta-report.json'))).toBe(
      false,
    );
  });
  it('reports malformed actual evidence without disguising its provided value as missing', () => {
    const fixture = make();
    publish(fixture);
    fs.writeFileSync(
      path.join(root, 'oracle.jsonl.provenance.json'),
      JSON.stringify({
        ...fixture.receipt,
        runtime: { ...fixture.receipt.runtime, javaVersion: 17 },
      }),
    );
    expect(() => main()).toThrow('Reference provenance rejected');
    const report = JSON.parse(
      fs.readFileSync(
        path.join(root, 'report/reference-provenance-report.json'),
        'utf8',
      ),
    );
    expect(report.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'referenceProvenance.runtime.javaVersion',
          actual: 17,
        }),
      ]),
    );
  });
  it('rejects paired unspecified null settings instead of counting them as a match', () => {
    const fixture = make();
    publish(fixture);
    fs.writeFileSync(
      path.join(root, 'oracle.jsonl.provenance.json'),
      JSON.stringify({
        ...fixture.receipt,
        crew: { state: null },
      }),
    );
    fs.writeFileSync(
      path.join(root, 'expected.json'),
      JSON.stringify({
        ...fixture.policy,
        crew: { state: null },
      }),
    );
    expect(() => main()).toThrow('Reference provenance rejected');
    const report = JSON.parse(
      fs.readFileSync(
        path.join(root, 'report/reference-provenance-report.json'),
        'utf8',
      ),
    );
    expect(report.ok).toBe(false);
    expect(report.mismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'expectedReference.crew.state',
          actual: null,
        }),
        expect.objectContaining({
          field: 'referenceProvenance.crew.state',
          actual: null,
        }),
      ]),
    );
  });
});

it('refuses an unversioned converted payload even when its source hash still matches', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-stale-'));
  const argv = process.argv;
  const exitCode = process.exitCode;
  const stdout = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
  try {
    fs.mkdirSync(path.join(root, 'meks'));
    const source = 'Cockpit:Industrial\n';
    fs.writeFileSync(path.join(root, 'meks/unit.mtf'), source);
    // The native source is unchanged; an older converter lost the cockpit field.
    fs.writeFileSync(
      path.join(root, 'sources.ndjson'),
      JSON.stringify({
        path: 'meks/unit.mtf',
        sha256: createHash('sha256').update(source).digest('hex'),
        unit: { cockpit: 'STANDARD' },
      }) + '\n',
    );
    fs.writeFileSync(path.join(root, 'oracle.jsonl'), '');
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
      path.join(root, 'report'),
    ];
    expect(() => main()).toThrow(/fresh strict export/i);
    expect(fs.existsSync(path.join(root, 'report'))).toBe(false);
  } finally {
    process.argv = argv;
    process.exitCode = exitCode;
    stdout.mockRestore();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

it('accepts a real Python receipt and rejects stale converter bytes, payload changes and family subsets', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-receipt-'));
  try {
    fs.mkdirSync(path.join(root, 'meks'));
    fs.writeFileSync(path.join(root, 'meks/unit.mtf'), 'Cockpit:Industrial\n');
    const out = path.join(root, 'out');
    execFileSync(
      'python',
      [
        '-B',
        'scripts/megameklab-conversion/export_vehicle_aero_json.py',
        root,
        out,
        '--strict',
      ],
      { timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const file = path.join(out, 'sources.ndjson');
    const bytes = fs.readFileSync(file);
    const manifestFile = file + '.manifest.json';
    const originalReceipt = fs.readFileSync(manifestFile);
    const receipt: {
      converterInputs: Record<string, string>;
      scope: string;
      sourceCount: number;
    } = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    expect(() => validateSourceManifest(file, bytes)).not.toThrow();
    // The trusted pipeline wrapper calls the same writer as the Python exporter.
    const fullReceipt: { folders: string[] } = JSON.parse(
      originalReceipt.toString('utf8'),
    );
    writeSourceManifest(file, bytes, fullReceipt.folders);
    expect(fs.readFileSync(manifestFile)).toEqual(originalReceipt);
    expect(() =>
      validateSourceManifest(file, Buffer.concat([bytes, Buffer.from('\n')])),
    ).toThrow(/payload hash mismatch/);
    fs.writeFileSync(
      manifestFile,
      JSON.stringify({ ...receipt, scope: 'battlemechs' }),
    );
    expect(() => validateSourceManifest(file, bytes)).toThrow(
      /full-corpus export/,
    );
    fs.writeFileSync(
      manifestFile,
      JSON.stringify({ ...receipt, sourceCount: 2 }),
    );
    expect(() => validateSourceManifest(file, bytes)).toThrow(
      /source count mismatch/,
    );
    fs.writeFileSync(
      manifestFile,
      JSON.stringify({
        ...receipt,
        converterInputs: {
          ...receipt.converterInputs,
          'scripts/megameklab-conversion/mtf_parser.py': '0'.repeat(64),
        },
      }),
    );
    expect(() => validateSourceManifest(file, bytes)).toThrow(
      /implementation or data inputs changed/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

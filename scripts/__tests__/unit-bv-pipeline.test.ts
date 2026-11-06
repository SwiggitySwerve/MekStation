import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import families from '../megameklab-conversion/strict-families.json';
import { encodeComputedRows } from '../unit-bv-artifacts';
import * as worker from '../unit-bv-family-worker';
import {
  buildDeltaReport,
  FAMILIES,
  type IComputedRow,
  type IJavaReferenceRow,
} from '../unit-bv-parity';
import { runPipeline } from '../unit-bv-pipeline';
import * as provenance from '../unit-bv-provenance';

jest.mock('../unit-bv-family-worker', () => ({ runCommand: jest.fn() }));
jest.mock('../unit-bv-provenance', () => {
  const actual = jest.requireActual('../unit-bv-provenance');
  return {
    ...actual,
    validateSourceManifest: jest.fn(actual.validateSourceManifest),
    writeSourceManifest: jest.fn(actual.writeSourceManifest),
  };
});

let root: string;
const originalEvent = process.env.GITHUB_EVENT_NAME;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'bv-pipeline-'));
  jest.clearAllMocks();
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalEvent === undefined) delete process.env.GITHUB_EVENT_NAME;
  else process.env.GITHUB_EVENT_NAME = originalEvent;
  fs.rmSync(root, { recursive: true, force: true });
});

it.each(['push', 'schedule'])(
  'keeps every family and exact report bytes on %s, bypassing caches',
  async (event) => {
    process.env.GITHUB_EVENT_NAME = event;
    const python = execFileSync(
      'python',
      ['-c', 'import sys;print(sys.executable)'],
      { encoding: 'utf8' },
    ).trim();
    const validate = jest.mocked(provenance.validateSourceManifest);
    const publish = jest.mocked(provenance.writeSourceManifest);
    const reference = path.join(root, 'oracle.jsonl');
    const sources: Record<
      string,
      { path: string; sha256: string; unit: null }
    > = {};
    const computed: IComputedRow[] = [];
    const java: IJavaReferenceRow[] = [];
    for (const [family, folders] of Object.entries(families)) {
      const row = {
        path: `${folders[0]}/source.${family === 'battlemechs' ? 'mtf' : 'blk'}`,
        sha256: 'a'.repeat(64),
        unit: null,
      };
      sources[family] = row;
      computed.push({
        path: row.path,
        sha256: row.sha256,
        reason: `Unsupported: ${family}`,
      });
      java.push({
        path: row.path,
        sha256: row.sha256,
        concreteFamily: family,
        battleValue: {
          total: 1,
          aggregates: { defensiveValue: 1, offensiveValue: 0 },
        },
      });
    }
    fs.writeFileSync(
      reference,
      java.map((row) => JSON.stringify(row)).join('\n') + '\n',
    );
    const run = jest
      .mocked(worker.runCommand)
      .mockImplementation(async (_exe, args) => {
        const family = args[3];
        const out = args[5];
        const index = Object.keys(families).indexOf(family);
        fs.mkdirSync(out, { recursive: true });
        fs.writeFileSync(
          path.join(out, 'sources.ndjson'),
          JSON.stringify(sources[family]) + '\n',
        );
        fs.writeFileSync(
          path.join(out, 'computed.bin'),
          encodeComputedRows([computed[index]]),
        );
        provenance.writeSourceManifest(
          path.join(out, 'sources.ndjson'),
          fs.readFileSync(path.join(out, 'sources.ndjson')),
          families[family as keyof typeof families],
          family,
          args[6],
        );
      });
    const out = path.join(root, 'report');
    expect(
      await runPipeline({
        mekfiles: root,
        reference,
        out,
        python,
        workers: 2,
        cacheDir: path.join(root, 'cache'),
        verifyHits: 7,
        uncached: false,
        perTerm: true,
      }),
    ).toBe(false);
    expect(run).toHaveBeenCalledTimes(FAMILIES.length);
    for (const family of Object.keys(families)) {
      expect(validate).toHaveBeenCalledWith(
        'cached-family',
        expect.any(Buffer),
        family,
        python,
        expect.any(Buffer),
      );
    }
    expect(publish).toHaveBeenCalledWith(
      path.join(out, 'sources.ndjson'),
      expect.any(Buffer),
      Object.values(families).flat(),
      'full',
      python,
    );
    expect(() =>
      provenance.validateSourceManifest(
        path.join(out, 'sources.ndjson'),
        fs.readFileSync(path.join(out, 'sources.ndjson')),
        'full',
        python,
      ),
    ).not.toThrow();
    expect(fs.readFileSync(path.join(out, 'sources.ndjson'), 'utf8')).toBe(
      Object.values(sources)
        .map((row) => JSON.stringify(row))
        .join('\n') + '\n',
    );
    const { rows, ...expected } = buildDeltaReport(
      computed,
      java,
      undefined,
      true,
    );
    expect(fs.readFileSync(path.join(out, 'delta-report.json'), 'utf8')).toBe(
      JSON.stringify(expected, null, 2) + '\n',
    );
    expect(fs.readFileSync(path.join(out, 'delta-rows.jsonl'), 'utf8')).toBe(
      rows.map((row) => JSON.stringify(row)).join('\n') + '\n',
    );
    expect(
      JSON.parse(fs.readFileSync(path.join(out, 'execution.json'), 'utf8'))
        .cacheEnabled,
    ).toBe(false);
    expect(
      JSON.parse(fs.readFileSync(path.join(out, 'execution.json'), 'utf8'))
        .families,
    ).toEqual(
      Object.keys(families).map((family) => ({
        family,
        hit: false,
        verified: false,
        production: 'fresh',
      })),
    );
  },
);

it('rejects protected output and invalid options before spawning family work', async () => {
  const run = jest.mocked(worker.runCommand);
  const options = {
    mekfiles: root,
    reference: 'unused',
    out: path.resolve('public/data/forbidden'),
    python: 'unused',
    workers: 2,
    verifyHits: 0,
    uncached: true,
    perTerm: false,
  };
  await expect(runPipeline(options)).rejects.toThrow('scratch');
  await expect(runPipeline({ ...options, verifyHits: -1 })).rejects.toThrow(
    'verify-hits',
  );
  expect(run).not.toHaveBeenCalled();
});

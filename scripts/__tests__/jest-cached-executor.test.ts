/* eslint-disable @typescript-eslint/no-require-imports */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

type Spawned = { status: number | null; error?: Error };
type Spawn = (cmd: string, args: string[], opts: object) => Spawned;
const lib = require('../jest/cached-tests.js') as {
  batchFiles: (files: string[], fixed: string[], limit?: number) => string[][];
  createJestExecutor: (opts: {
    root: string;
    baseArgs: string[];
    spawn: Spawn;
    limit: number;
  }) => (
    files: string[],
  ) => Promise<{ exitCode: number; results: Map<string, string> }>;
};

const files = Array.from(
  { length: 40 },
  (_, i) => `src/some/deep/directory/__tests__/file${i}.test.ts`,
);

describe('batchFiles (the Windows 32,767-character command line)', () => {
  it('keeps every file once, in order, and every batch under the limit', () => {
    const fixed = ['node', 'jest.js', '--json', '--outputFile=x'];
    const limit = 400;
    const batches = lib.batchFiles(files, fixed, limit);
    expect(batches.length).toBeGreaterThan(3);
    expect(batches.flat()).toEqual(files);
    for (const batch of batches) {
      const chars =
        fixed.join(' ').length + 1 + batch.join(' ').length + batch.length * 2;
      expect(chars).toBeLessThan(limit);
    }
  });

  it('is one batch when the limit is unbounded, and an oversized file still runs alone', () => {
    expect(lib.batchFiles(files, ['node'], Infinity)).toEqual([files]);
    expect(lib.batchFiles(['a'.repeat(100), 'b'], ['node'], 50)).toEqual([
      ['a'.repeat(100)],
      ['b'],
    ]);
    expect(lib.batchFiles([], ['node'], 50)).toEqual([]);
  });
});

describe('createJestExecutor with batches', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cached-exec-'));
  afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

  /** A fake Jest: writes the --json report for the files it was given. */
  function fakeJest(failing: string[] = []) {
    const calls: string[][] = [];
    const spawn: Spawn = (_cmd, args) => {
      const out = args
        .find((a) => a.startsWith('--outputFile='))!
        .slice('--outputFile='.length);
      const given = args.slice(args.indexOf('--runTestsByPath') + 1);
      calls.push(given);
      fs.writeFileSync(
        out,
        JSON.stringify({
          testResults: given.map((f) => ({
            name: path.join(root, f),
            status: failing.includes(f) ? 'failed' : 'passed',
          })),
        }),
      );
      return { status: given.some((f) => failing.includes(f)) ? 1 : 0 };
    };
    return { spawn, calls };
  }

  it('runs a long file list as several Jest runs and merges their results', async () => {
    const { spawn, calls } = fakeJest();
    const run = await lib.createJestExecutor({
      root,
      baseArgs: ['--selectProjects', 'unit', '--shard=1/4', '--ci'],
      spawn,
      limit: 1200,
    })(files);
    expect(calls.length).toBeGreaterThan(2);
    expect(calls.flat()).toEqual(files);
    expect(run.exitCode).toBe(0);
    expect([...run.results.keys()].sort()).toEqual([...files].sort());
    expect([...run.results.values()].every((s) => s === 'passed')).toBe(true);
  });

  it('keeps going after a failing batch, records its other files and exits non-zero', async () => {
    const bad = files[5];
    const { spawn, calls } = fakeJest([bad]);
    const run = await lib.createJestExecutor({
      root,
      baseArgs: ['--ci'],
      spawn,
      limit: 1200,
    })(files);
    expect(calls.flat()).toEqual(files);
    expect(run.exitCode).toBe(1);
    expect(run.results.get(bad)).toBe('failed');
    expect(run.results.get(files[30])).toBe('passed');
  });

  it('reports a Jest that cannot start instead of exiting 1 silently', async () => {
    const errors: string[] = [];
    const spy = jest
      .spyOn(console, 'error')
      .mockImplementation((m: string) => void errors.push(String(m)));
    try {
      const run = await lib.createJestExecutor({
        root,
        baseArgs: ['--ci'],
        spawn: () => ({
          status: null,
          error: new Error('spawnSync node ENAMETOOLONG'),
        }),
        limit: Infinity,
      })(files);
      expect(run.exitCode).toBe(1);
      expect(run.results.size).toBe(0);
      expect(errors.join('\n')).toMatch(/could not start jest.*ENAMETOOLONG/);
    } finally {
      spy.mockRestore();
    }
  });
});

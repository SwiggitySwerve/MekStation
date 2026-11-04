/* eslint-disable @typescript-eslint/no-require-imports */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

type Durations = Record<string, number>;
interface FakeTest {
  path: string;
  context: {
    config: { rootDir: string; cache: boolean };
    hasteFS: { getSize: () => number };
  };
}

const planner = require('../../config/jest/shard-planner') as {
  UNKNOWN_FILE_MS: number;
  loadDurations: (file?: string) => Durations;
  planShards: (
    files: string[],
    durations: Durations,
    shardCount: number,
  ) => { shardOf: Map<string, number>; loads: number[] };
};
const DurationSequencer =
  require('../../config/jest/duration-sequencer') as new () => {
    shard: (
      tests: FakeTest[],
      options: { shardIndex: number; shardCount: number },
    ) => FakeTest[];
    sort: (tests: FakeTest[]) => Promise<FakeTest[]>;
  };

const repoRoot = path.resolve(__dirname, '../..');

// Shaped like the real distribution: a handful of multi-minute suites and a
// long tail of small ones.
const heavy: Durations = {
  'src/a/catalog1.test.ts': 220000,
  'src/a/catalog2.test.ts': 190000,
  'src/a/catalog3.test.ts': 140000,
  'src/a/catalog4.test.ts': 120000,
  'src/a/catalog5.test.ts': 115000,
  'src/a/catalog6.test.ts': 80000,
};
const tail = Array.from({ length: 300 }, (_, i) => `src/b/small${i}.test.ts`);
const durations: Durations = {
  ...heavy,
  ...Object.fromEntries(tail.map((f, i) => [f, 1000 + (i % 7) * 400])),
};
const files = [...Object.keys(heavy), ...tail];

describe('planShards', () => {
  it.each([1, 2, 3, 6, 8])(
    'assigns every file to exactly one of %i shards',
    (count) => {
      const { shardOf } = planner.planShards(files, durations, count);
      expect([...shardOf.keys()].sort()).toEqual([...files].sort());
      for (const shard of shardOf.values()) {
        expect(shard).toBeGreaterThanOrEqual(0);
        expect(shard).toBeLessThan(count);
      }
    },
  );

  it('gives the same plan whatever order the files arrive in', () => {
    const a = planner.planShards(files, durations, 6).shardOf;
    const b = planner.planShards([...files].reverse(), durations, 6).shardOf;
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
  });

  it('keeps the heaviest suites in different shards and balances load', () => {
    const { shardOf, loads } = planner.planShards(files, durations, 6);
    const heavyShards = Object.keys(heavy).map((f) => shardOf.get(f));
    expect(new Set(heavyShards).size).toBe(6);
    // LPT bound: the slowest shard is never far above the average.
    const average = loads.reduce((a, b) => a + b, 0) / loads.length;
    expect(Math.max(...loads)).toBeLessThan(average * 1.1);
  });

  it('weighs a file with no recorded duration at the default, never zero', () => {
    const { loads } = planner.planShards(['src/new.test.ts'], {}, 2);
    expect(loads.reduce((a, b) => a + b, 0)).toBe(planner.UNKNOWN_FILE_MS);
  });

  it('splits evenly by count when there are no durations at all', () => {
    const { loads } = planner.planShards(tail, {}, 4);
    expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(
      planner.UNKNOWN_FILE_MS,
    );
  });

  it('rejects a non-positive shard count', () => {
    expect(() => planner.planShards(files, durations, 0)).toThrow(/shardCount/);
  });

  it('treats a missing or corrupt durations file as empty', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'durations-'));
    try {
      expect(planner.loadDurations(path.join(dir, 'absent.json'))).toEqual({});
      const bad = path.join(dir, 'bad.json');
      fs.writeFileSync(bad, '{not json');
      expect(planner.loadDurations(bad)).toEqual({});
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('DurationSequencer', () => {
  const rootDir = repoRoot;
  const fake = (repoPath: string): FakeTest => ({
    path: path.join(rootDir, ...repoPath.split('/')),
    context: {
      config: { rootDir, cache: false },
      hasteFS: { getSize: () => 0 },
    },
  });

  it('shards partition a real project list with no gaps or overlap', () => {
    // Use the real durations file plus this repo's own test files.
    const listed = fs
      .readdirSync(path.join(repoRoot, 'scripts/__tests__'))
      .filter((name) => name.endsWith('.test.ts'))
      .map((name) => `scripts/__tests__/${name}`);
    const tests = listed.map(fake);
    const seen: string[] = [];
    for (let shardIndex = 1; shardIndex <= 5; shardIndex += 1) {
      const sequencer = new DurationSequencer();
      seen.push(
        ...sequencer
          .shard(tests, { shardIndex, shardCount: 5 })
          .map((t) => t.path),
      );
    }
    expect(seen.sort()).toEqual(tests.map((t) => t.path).sort());
  });

  it('orders a shard recorded-slowest first, unrecorded files at the default weight', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'durations-sort-'));
    const previous = process.env.JEST_TEST_DURATIONS_FILE;
    try {
      const file = path.join(dir, 'durations.json');
      fs.writeFileSync(
        file,
        JSON.stringify({ 'src/slow.test.ts': 90000, 'src/mid.test.ts': 5000 }),
      );
      process.env.JEST_TEST_DURATIONS_FILE = file;
      const ordered = await new DurationSequencer().sort([
        fake('src/never-recorded.test.ts'),
        fake('src/mid.test.ts'),
        fake('src/slow.test.ts'),
      ]);
      expect(
        ordered.map((t) =>
          path.relative(rootDir, t.path).split(path.sep).join('/'),
        ),
      ).toEqual([
        'src/slow.test.ts',
        'src/mid.test.ts',
        'src/never-recorded.test.ts',
      ]);
    } finally {
      if (previous === undefined) delete process.env.JEST_TEST_DURATIONS_FILE;
      else process.env.JEST_TEST_DURATIONS_FILE = previous;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('update-test-durations CLI', () => {
  it('writes sorted, thresholded, rounded durations keyed by repo path', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'durations-cli-'));
    try {
      const report = path.join(dir, 'report.json');
      const out = path.join(dir, 'out.json');
      const result = (name: string, runtime: number) => ({
        name: path.join(dir, ...name.split('/')),
        // shape of a real `jest --json` testResults entry
        status: 'passed',
        startTime: 1793799486082,
        endTime: 1793799486082 + runtime,
      });
      fs.writeFileSync(
        report,
        JSON.stringify({
          testResults: [
            result('src/z.test.ts', 5004),
            result('src/a.test.ts', 2345),
            result('src/fast.test.ts', 999),
            result('src/a.test.ts', 3000), // seen twice: keeps the slower
          ],
        }),
      );
      const run = spawnSync(
        process.execPath,
        [
          path.join(repoRoot, 'scripts/jest/update-test-durations.mjs'),
          '--out',
          out,
          '--root',
          dir,
          report,
        ],
        { encoding: 'utf8' },
      );
      expect(run.status).toBe(0);
      const written = JSON.parse(fs.readFileSync(out, 'utf8')) as Durations;
      expect(Object.keys(written)).toEqual(['src/a.test.ts', 'src/z.test.ts']);
      expect(written).toEqual({ 'src/a.test.ts': 3000, 'src/z.test.ts': 5000 });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('exits non-zero on a report that is not a jest --json report', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'durations-cli-'));
    try {
      const report = path.join(dir, 'bad.json');
      fs.writeFileSync(report, JSON.stringify({ nope: true }));
      const run = spawnSync(
        process.execPath,
        [
          path.join(repoRoot, 'scripts/jest/update-test-durations.mjs'),
          '--out',
          path.join(dir, 'out.json'),
          report,
        ],
        { encoding: 'utf8' },
      );
      expect(run.status).not.toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

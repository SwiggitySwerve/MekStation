/* eslint-disable @typescript-eslint/no-require-imports */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

type Run = {
  exitCode: number;
  results: Map<string, 'passed' | 'failed'>;
};
type Keyed = {
  key?: string;
  unkeyable?: string;
  repoWide?: boolean;
  why?: string[];
};
interface Store {
  get: (key: string) => unknown;
  put: (key: string, entry: object) => void;
  touch: (key: string) => void;
  remove: (key: string) => void;
  prune: (days: number) => number;
}
interface Report {
  mode: string;
  files: number;
  hits: number;
  executed: number;
  verified: string[];
  stale: string[];
  exitCode: number;
}
const lib = require('../jest/cached-tests.js') as {
  buildFileIndex: (
    root: string,
    exclude?: string | null,
  ) => Map<string, string>;
  createKeyer: (opts: {
    root: string;
    index: Map<string, string>;
    env?: Record<string, string | undefined>;
  }) => { keyFor: (file: string) => Keyed };
  createStore: (dir: string) => Store;
  runCached: (opts: {
    files: string[];
    keyer: { keyFor: (file: string) => Keyed };
    store: Store;
    execute: (files: string[]) => Promise<Run>;
    mode: 'use' | 'record';
    verifyHits: number;
    seed: string;
  }) => Promise<Report>;
  resolveMode: (opts: {
    uncached: boolean;
    passthrough: string[];
    env: Record<string, string | undefined>;
  }) => string;
  verifyOrder: (files: string[], seed: string) => string[];
};

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function makeRepo(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cached-tests-'));
  roots.push(root);
  write(root, files);
  return root;
}
function write(root: string, files: Record<string, string>): void {
  for (const [rel, text] of Object.entries(files)) {
    const abs = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text);
  }
}
function keyOf(
  root: string,
  file: string,
  env: Record<string, string | undefined> = {},
): Keyed {
  const index = lib.buildFileIndex(root);
  return lib.createKeyer({ root, index, env }).keyFor(file);
}

describe('test result cache key', () => {
  const base = {
    'src/lib/b.ts': 'export const b = 1;\n',
    'src/lib/deep.ts': 'export const deep = 1;\n',
    'src/lib/c.ts': "import { deep } from './deep';\nexport const c = deep;\n",
    'src/lib/dir/index.ts': "export { c } from '../c';\n",
    'src/unrelated.ts': 'export const u = 1;\n',
    'src/a.test.ts':
      "import { b } from '@/lib/b';\nimport { c } from './lib/dir';\ntest('x', () => expect(b + c).toBe(2));\n",
  };

  it('is stable for identical inputs', () => {
    const root = makeRepo(base);
    expect(keyOf(root, 'src/a.test.ts').key).toBe(
      keyOf(root, 'src/a.test.ts').key,
    );
  });

  it('changes when the test, a direct import or a transitive import changes', () => {
    const root = makeRepo(base);
    const before = keyOf(root, 'src/a.test.ts').key;
    for (const [file, text] of [
      ['src/a.test.ts', base['src/a.test.ts'] + '// edit\n'],
      ['src/lib/b.ts', 'export const b = 2;\n'],
      // via ./lib/dir (index.ts) -> ../c -> ./deep
      ['src/lib/deep.ts', 'export const deep = 2;\n'],
    ] as const) {
      write(root, { [file]: text });
      expect(keyOf(root, 'src/a.test.ts').key).not.toBe(before);
      write(root, { [file]: base[file] }); // restore
      expect(keyOf(root, 'src/a.test.ts').key).toBe(before);
    }
  });

  it('ignores files outside the closure', () => {
    const root = makeRepo(base);
    const before = keyOf(root, 'src/a.test.ts');
    write(root, { 'src/unrelated.ts': 'export const u = 99;\n' });
    expect(keyOf(root, 'src/a.test.ts').key).toBe(before.key);
    expect(before.repoWide).toBe(false);
  });

  it('includes the test file’s snapshot', () => {
    const root = makeRepo({
      ...base,
      'src/__snapshots__/a.test.ts.snap': 'exports[`x 1`] = `1`;\n',
    });
    const before = keyOf(root, 'src/a.test.ts').key;
    write(root, {
      'src/__snapshots__/a.test.ts.snap': 'exports[`x 1`] = `2`;\n',
    });
    expect(keyOf(root, 'src/a.test.ts').key).not.toBe(before);
  });

  it('keys a data read on the directory it names, and only that one', () => {
    const root = makeRepo({
      'public/data/units/a.json': '{"mass":50}',
      'docs/readme.md': 'hi',
      'src/reader.test.ts': [
        "import * as fs from 'node:fs';",
        "import * as path from 'node:path';",
        "const file = path.join(process.cwd(), 'public', 'data', 'units', 'a.json');",
        "test('reads', () => { expect(fs.readFileSync(file, 'utf8')).toContain('mass'); });",
      ].join('\n'),
    });
    const before = keyOf(root, 'src/reader.test.ts');
    expect(before.repoWide).toBe(false);
    write(root, { 'docs/readme.md': 'changed' });
    expect(keyOf(root, 'src/reader.test.ts').key).toBe(before.key);
    write(root, { 'public/data/units/a.json': '{"mass":55}' });
    expect(keyOf(root, 'src/reader.test.ts').key).not.toBe(before.key);
    // a new file in the data directory is an input too
    write(root, { 'public/data/units/a.json': '{"mass":50}' });
    expect(keyOf(root, 'src/reader.test.ts').key).toBe(before.key);
    write(root, { 'public/data/units/b.json': '{}' });
    expect(keyOf(root, 'src/reader.test.ts').key).not.toBe(before.key);
  });

  it('fails open to a whole-repo key when it reads files from a path it cannot name', () => {
    const root = makeRepo({
      'other.txt': 'x',
      'src/blind.test.ts': [
        "import * as fs from 'node:fs';",
        "test('reads', () => { fs.readFileSync(process.argv[2], 'utf8'); });",
      ].join('\n'),
    });
    const before = keyOf(root, 'src/blind.test.ts');
    expect(before.repoWide).toBe(true);
    write(root, { 'other.txt': 'y' });
    expect(keyOf(root, 'src/blind.test.ts').key).not.toBe(before.key);
  });

  it.each([
    ['dynamic require', 'const m = require(process.argv[2]);'],
    [
      'child process',
      "import { execSync } from 'node:child_process'; execSync('x');",
    ],
    ['unresolved relative import', "import './does-not-exist';"],
  ])('uses a whole-repo key for %s', (_name, body) => {
    const root = makeRepo({
      'other.txt': 'x',
      'src/t.test.ts': `${body}\ntest('x', () => {});\n`,
    });
    const before = keyOf(root, 'src/t.test.ts');
    expect(before.repoWide).toBe(true);
    write(root, { 'other.txt': 'y' });
    expect(keyOf(root, 'src/t.test.ts').key).not.toBe(before.key);
  });

  it('does not treat words in comments as loads or reads', () => {
    const root = makeRepo({
      'other.txt': 'x',
      'src/t.test.ts': [
        '/**',
        ' * legacy import (task 1.3) and readFile of nothing',
        " * import { x } from './missing';",
        ' */',
        "test('x', () => {});",
      ].join('\n'),
    });
    const before = keyOf(root, 'src/t.test.ts');
    expect(before.repoWide).toBe(false);
  });

  it('keys on the env vars the closure reads, and refuses a bare process.env', () => {
    const root = makeRepo({
      'src/lib/flag.ts': 'export const on = process.env.FEATURE_X === "1";\n',
      'src/t.test.ts':
        "import { on } from './lib/flag';\ntest('x', () => on);\n",
      'src/bare.test.ts':
        'const env = { ...process.env };\ntest("x", () => env);\n',
    });
    const off = keyOf(root, 'src/t.test.ts', { FEATURE_X: '0' }).key;
    expect(keyOf(root, 'src/t.test.ts', { FEATURE_X: '0' }).key).toBe(off);
    expect(keyOf(root, 'src/t.test.ts', { FEATURE_X: '1' }).key).not.toBe(off);
    expect(
      keyOf(root, 'src/t.test.ts', { FEATURE_X: '0', UNRELATED: 'zzz' }).key,
    ).toBe(off);
    expect(keyOf(root, 'src/bare.test.ts').unkeyable).toMatch(/process\.env/);
  });

  it('changes when the lockfile or jest config changes', () => {
    const root = makeRepo({
      ...base,
      'package-lock.json': '{"a":1}',
      'jest.config.js': 'module.exports = {};\n',
    });
    const before = keyOf(root, 'src/a.test.ts').key;
    write(root, { 'package-lock.json': '{"a":2}' });
    const afterLock = keyOf(root, 'src/a.test.ts').key;
    expect(afterLock).not.toBe(before);
    write(root, { 'jest.config.js': 'module.exports = { x: 1 };\n' });
    expect(keyOf(root, 'src/a.test.ts').key).not.toBe(afterLock);
  });
});

describe('runCached', () => {
  const files = ['src/a.test.ts', 'src/b.test.ts', 'src/c.test.ts'];
  const repo = {
    'src/lib/shared.ts': 'export const s = 1;\n',
    'src/lib/solo.ts': 'export const o = 1;\n',
    'src/a.test.ts': "import { s } from './lib/shared';\ntest('a', () => s);\n",
    'src/b.test.ts': "import { s } from './lib/shared';\ntest('b', () => s);\n",
    'src/c.test.ts': "import { o } from './lib/solo';\ntest('c', () => o);\n",
  };

  function setup() {
    const root = makeRepo(repo);
    const storeDir = path.join(root, '.cache');
    const calls: string[][] = [];
    const outcome = new Map<string, 'passed' | 'failed'>();
    const execute = async (run: string[]): Promise<Run> => {
      calls.push(run);
      const results = new Map<string, 'passed' | 'failed'>();
      for (const file of run) results.set(file, outcome.get(file) ?? 'passed');
      const failed = [...results.values()].includes('failed');
      return { exitCode: failed ? 1 : 0, results };
    };
    const go = (
      overrides: Partial<{
        mode: 'use' | 'record';
        verifyHits: number;
        seed: string;
        keyer: { keyFor: (file: string) => Keyed };
      }> = {},
    ) =>
      lib.runCached({
        files,
        keyer:
          overrides.keyer ??
          lib.createKeyer({
            root,
            index: lib.buildFileIndex(root, '.cache/'),
            env: {},
          }),
        store: lib.createStore(storeDir),
        execute,
        mode: overrides.mode ?? 'use',
        verifyHits: overrides.verifyHits ?? 0,
        seed: overrides.seed ?? 's',
      });
    return { root, calls, outcome, go };
  }

  it('skips every file on a second identical run', async () => {
    const { calls, go } = setup();
    const first = await go();
    expect(first.hits).toBe(0);
    expect(calls).toEqual([files]);
    const second = await go();
    expect(second).toMatchObject({ hits: 3, executed: 0, exitCode: 0 });
    expect(calls).toHaveLength(1); // jest not invoked again
  });

  it('re-runs exactly the files whose inputs changed', async () => {
    const { root, calls, go } = setup();
    await go();
    write(root, { 'src/lib/shared.ts': 'export const s = 2;\n' });
    const report = await go();
    expect(report).toMatchObject({ hits: 1, executed: 2 });
    expect(calls[1].sort()).toEqual(['src/a.test.ts', 'src/b.test.ts']);
  });

  it('never records or skips a file that failed', async () => {
    const { outcome, calls, go } = setup();
    outcome.set('src/b.test.ts', 'failed');
    const first = await go();
    expect(first.exitCode).toBe(1);
    outcome.delete('src/b.test.ts');
    const second = await go();
    expect(second).toMatchObject({ hits: 2, executed: 1, exitCode: 0 });
    expect(calls[1]).toEqual(['src/b.test.ts']);
  });

  it('record mode runs everything even with hits, and keeps recording', async () => {
    const { calls, go } = setup();
    await go();
    const recorded = await go({ mode: 'record' });
    expect(recorded).toMatchObject({ hits: 0, executed: 3 });
    expect(calls).toHaveLength(2);
    expect(await go()).toMatchObject({ hits: 3, executed: 0 });
  });

  it('verify-hits re-runs a sample of hits and passes when they still pass', async () => {
    const { calls, go } = setup();
    await go();
    const report = await go({ verifyHits: 2 });
    expect(report.verified).toHaveLength(2);
    expect(report.stale).toEqual([]);
    expect(report.exitCode).toBe(0);
    expect(calls[1]).toEqual(report.verified); // sampled files really re-ran
  });

  it('verify-hits catches a planted wrong cached result and evicts it', async () => {
    const { outcome, go } = setup();
    await go(); // everything recorded as a pass
    // The inputs did not change, so the key still hits; but the file now fails
    // (a hidden input the key cannot see). Sampling must notice.
    outcome.set('src/c.test.ts', 'failed');
    const report = await go({ verifyHits: 3 });
    expect(report.stale).toEqual(['src/c.test.ts']);
    expect(report.exitCode).not.toBe(0);
    // evicted: the next run executes it instead of trusting the stale pass
    outcome.delete('src/c.test.ts');
    const next = await go();
    expect(next).toMatchObject({ hits: 2, executed: 1 });
  });

  it('fails open: a keying error means the file runs', async () => {
    const { go, calls } = setup();
    const exploding = {
      keyFor: (file: string): Keyed => {
        if (file === 'src/b.test.ts') throw new Error('boom');
        return { key: `k-${file}` };
      },
    };
    await go({ keyer: exploding });
    const report = await go({ keyer: exploding });
    expect(report.executed).toBe(1);
    expect(calls[1]).toEqual(['src/b.test.ts']);
  });

  it('runs unkeyable files every time', async () => {
    const { go, calls } = setup();
    const keyer = {
      keyFor: (file: string): Keyed =>
        file === 'src/a.test.ts'
          ? { unkeyable: 'reads process.env' }
          : { key: `k-${file}` },
    };
    await go({ keyer });
    await go({ keyer });
    expect(calls[1]).toEqual(['src/a.test.ts']);
  });
});

describe('cache mode and sampling', () => {
  it.each([
    [{ uncached: true, passthrough: [], env: {} }, 'record'],
    [{ uncached: false, passthrough: ['--coverage'], env: {} }, 'record'],
    [
      {
        uncached: false,
        passthrough: [],
        env: { GITHUB_EVENT_NAME: 'schedule' },
      },
      'record',
    ],
    [
      {
        uncached: false,
        passthrough: [],
        env: { GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main' },
      },
      'record',
    ],
    [
      {
        uncached: false,
        passthrough: [],
        env: { GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/feature' },
      },
      'use',
    ],
    [
      {
        uncached: false,
        passthrough: ['--ci'],
        env: { GITHUB_EVENT_NAME: 'pull_request' },
      },
      'use',
    ],
  ])('resolveMode %#', (input, expected) => {
    expect(lib.resolveMode(input)).toBe(expected);
  });

  it('samples deterministically per seed and differently across seeds', () => {
    const files = Array.from({ length: 30 }, (_, i) => `f${i}`);
    expect(lib.verifyOrder(files, 'run1:1')).toEqual(
      lib.verifyOrder(files, 'run1:1'),
    );
    expect(lib.verifyOrder(files, 'run1:1')).not.toEqual(
      lib.verifyOrder(files, 'run2:1'),
    );
    expect([...lib.verifyOrder(files, 'run1:1')].sort()).toEqual(
      [...files].sort(),
    );
  });
});

describe('result store', () => {
  it('returns null for a missing or corrupt entry and prunes by age', () => {
    const root = makeRepo({});
    const store = lib.createStore(path.join(root, 'store'));
    expect(store.get('ab12')).toBeNull();
    store.put('abcdef', { file: 'x' });
    expect(store.get('abcdef')).toMatchObject({ file: 'x', key: 'abcdef' });
    fs.writeFileSync(path.join(root, 'store', 'ab', 'abcdef.json'), '{corrupt');
    expect(store.get('abcdef')).toBeNull();
    store.put('abcdef', { file: 'x' });
    const old = new Date(Date.now() - 30 * 86400000);
    fs.utimesSync(path.join(root, 'store', 'ab', 'abcdef.json'), old, old);
    expect(store.prune(14)).toBe(1);
    expect(store.get('abcdef')).toBeNull();
  });
});

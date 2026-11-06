/* eslint-disable @typescript-eslint/no-require-imports */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

type Run = { exitCode: number; results: Map<string, 'passed' | 'failed'> };
type Artifact = {
  checksum: string;
  payload: {
    version: number;
    engine: string;
    sourceSha: string;
    runtime: { node: string; platform: string; arch: string };
    execOptions: string[];
    entries: { key: string; file: string; passedAt: string }[];
    files: string[];
  };
};
const cache = require('../jest/cached-tests.js');
const seed = require('../jest/local-seed.js') as {
  createSeed: (options: {
    source: string;
    files: string[];
    execOptions: string[];
    execute: (files: string[]) => Promise<Run>;
  }) => Promise<Artifact>;
  importSeed: (options: {
    root: string;
    artifact: Artifact;
    files: string[];
    execOptions: string[];
    cacheDir: string;
  }) => {
    imported: number;
    missed: number;
    retained: number;
    rejected?: string;
  };
  seal: (payload: Artifact['payload']) => Artifact;
};

const roots: string[] = [];
function repo(aSource = "test('a', () => {});\n") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'local-seed-'));
  roots.push(root);
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src/a.test.ts'), aSource);
  fs.writeFileSync(path.join(root, 'src/b.test.ts'), "test('b', () => {});\n");
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '-q');
  git('add', '.');
  git(
    '-c',
    'user.name=Seed Test',
    '-c',
    'user.email=seed@example.test',
    'commit',
    '-qm',
    'fixture',
  );
  git(
    'update-ref',
    'refs/remotes/origin/main',
    git('rev-parse', 'HEAD').toString().trim(),
  );
  return root;
}
const files = ['src/a.test.ts', 'src/b.test.ts'];
const execOptions = ['project=unit', '--ci'];
const pass = async (given: string[]): Promise<Run> => ({
  exitCode: 0,
  results: new Map(given.map((file) => [file, 'passed'])),
});
const options = (root: string, artifact: Artifact) => ({
  root,
  artifact,
  files,
  execOptions,
  cacheDir: path.join(root, '.jest-result-cache'),
});
afterAll(() =>
  roots.forEach((root) => fs.rmSync(root, { recursive: true, force: true })),
);

it('imports through the store boundary without overwriting a rejected result', () => {
  const root = repo();
  const store = cache.createStore(path.join(root, '.jest-result-cache'));
  const key = 'a'.repeat(64);
  expect(store.putIfAbsent(key, { file: files[0] })).toBe(true);
  store.remove(key);
  expect(store.putIfAbsent(key, { file: files[0] })).toBe(false);
  expect(store.get(key)).toBeNull();
});

it('runs the complete requested census cold, then imports equivalent native keys and verifies hits', async () => {
  const root = repo();
  const calls: string[][] = [];
  const artifact = await seed.createSeed({
    source: root,
    files,
    execOptions,
    execute: async (given) => {
      calls.push(given);
      return pass(given);
    },
  });
  expect(calls).toEqual([files]);
  expect(artifact.payload.files).toEqual(files);
  expect(seed.importSeed(options(root, artifact))).toMatchObject({
    imported: 2,
    missed: 0,
  });
  const report = await cache.runCached({
    files,
    keyer: cache.createKeyer({
      root,
      index: cache.buildFileIndex(root),
      execOptions,
    }),
    store: cache.createStore(options(root, artifact).cacheDir),
    execute: pass,
    mode: 'use',
    verifyHits: 2,
    seed: 'equivalence',
  });
  expect(report).toMatchObject({
    files: 2,
    hits: 2,
    executed: 0,
    stale: [],
    exitCode: 0,
  });
  expect(report.verified.sort()).toEqual(files);
});

it('does not seed an unsuccessful run even when Jest reports passed files', async () => {
  const root = repo();
  await expect(
    seed.createSeed({
      source: root,
      files,
      execOptions,
      execute: async () => ({
        exitCode: 1,
        results: new Map(files.map((file) => [file, 'passed'])),
      }),
    }),
  ).rejects.toThrow(/failed/i);
});

it('executes unknown environment inputs cold and leaves them uncached after adoption', async () => {
  const root = repo("test('env', () => Object.keys(process.env));\n");
  const executed: string[][] = [];
  const artifact = await seed.createSeed({
    source: root,
    files,
    execOptions,
    execute: async (given) => {
      executed.push(given);
      return pass(given);
    },
  });
  expect(executed).toEqual([files]);
  expect(artifact.payload.entries.map((entry) => entry.file)).toEqual([
    files[1],
  ]);
  expect(seed.importSeed(options(root, artifact))).toMatchObject({
    imported: 1,
    missed: 1,
  });
});

it('requires clean main and rejects source changes during execution', async () => {
  const root = repo();
  fs.writeFileSync(path.join(root, 'src/a.test.ts'), '// dirty');
  await expect(
    seed.createSeed({ source: root, files, execOptions, execute: pass }),
  ).rejects.toThrow(/clean/i);
  const clean = repo();
  await expect(
    seed.createSeed({
      source: clean,
      files,
      execOptions,
      execute: async (given) => {
        fs.writeFileSync(
          path.join(clean, 'src/b.test.ts'),
          '// changed during execution',
        );
        return pass(given);
      },
    }),
  ).rejects.toThrow(/clean|changed/i);
});

it('accepts a clean pinned main commit after the remote main reference advances', async () => {
  const root = repo();
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  const pinned = git('rev-parse', 'HEAD');
  git(
    '-c',
    'user.name=Seed Test',
    '-c',
    'user.email=seed@example.test',
    'commit',
    '--allow-empty',
    '-qm',
    'main advances',
  );
  const advanced = git('rev-parse', 'HEAD');
  // A feature-only commit is not trusted as a source until it belongs to main.
  await expect(
    seed.createSeed({ source: root, files, execOptions, execute: pass }),
  ).rejects.toThrow(/main/i);
  git('update-ref', 'refs/remotes/origin/main', advanced);
  git('checkout', '--detach', pinned);
  const artifact = await seed.createSeed({
    source: root,
    files,
    execOptions,
    execute: pass,
  });
  expect(artifact.payload.sourceSha).toBe(pinned);
  expect(seed.importSeed(options(root, artifact))).toMatchObject({
    imported: 2,
    missed: 0,
  });
});

it('fails open on corruption, foreign runtime/config/engine/provenance and changed source', async () => {
  const root = repo();
  const artifact = await seed.createSeed({
    source: root,
    files,
    execOptions,
    execute: pass,
  });
  const corrupt: Artifact = JSON.parse(JSON.stringify(artifact));
  corrupt.payload.entries[0].key = '0'.repeat(64);
  expect(seed.importSeed(options(root, corrupt))).toMatchObject({
    imported: 0,
    missed: 2,
    rejected: expect.any(String),
  });
  for (const runtime of [
    { ...artifact.payload.runtime, node: '0.0.0' },
    { ...artifact.payload.runtime, platform: 'foreign' },
    { ...artifact.payload.runtime, arch: 'foreign' },
  ]) {
    const foreign = seed.seal({ ...artifact.payload, runtime });
    expect(seed.importSeed(options(root, foreign)).imported).toBe(0);
  }
  expect(
    seed.importSeed({
      ...options(root, artifact),
      execOptions: ['project=a11y', '--ci'],
    }).imported,
  ).toBe(0);
  for (const payload of [
    { ...artifact.payload, engine: 'foreign-engine' },
    { ...artifact.payload, version: 0 },
    {
      ...artifact.payload,
      entries: [{ ...artifact.payload.entries[0], key: '0'.repeat(64) }],
    },
  ]) {
    expect(seed.importSeed(options(root, seed.seal(payload))).imported).toBe(0);
  }
  const foreign = seed.seal({ ...artifact.payload, sourceSha: '0'.repeat(40) });
  expect(seed.importSeed(options(root, foreign)).imported).toBe(0);
  fs.writeFileSync(path.join(root, 'src/a.test.ts'), '// relevant edit');
  expect(seed.importSeed(options(root, artifact))).toMatchObject({
    imported: 1,
    missed: 1,
  });
});

it('preserves a rejected local entry and still detects a planted wrong pass with verify-hits', async () => {
  const root = repo();
  const artifact = await seed.createSeed({
    source: root,
    files,
    execOptions,
    execute: pass,
  });
  const opts = options(root, artifact);
  const store = cache.createStore(opts.cacheDir);
  store.remove(artifact.payload.entries[0].key);
  expect(seed.importSeed(opts)).toMatchObject({ imported: 1, retained: 1 });
  expect(store.get(artifact.payload.entries[0].key)).toBeNull();
  const report = await cache.runCached({
    files,
    keyer: cache.createKeyer({
      root,
      index: cache.buildFileIndex(root),
      execOptions,
    }),
    store,
    mode: 'use',
    verifyHits: 2,
    seed: 'stale',
    execute: async (given: string[]) => ({
      exitCode: given.includes(files[1]) ? 1 : 0,
      results: new Map(
        given.map((file) => [file, file === files[1] ? 'failed' : 'passed']),
      ),
    }),
  });
  expect(report).toMatchObject({
    hits: 1,
    executed: 1,
    stale: [files[1]],
    exitCode: 1,
  });
  expect(store.get(artifact.payload.entries[1].key)).toBeNull();
});

const cli = require('../jest/seed-tests.js') as {
  main: (argv: string[]) => Promise<number>;
};
afterEach(() => jest.restoreAllMocks());

it('combined adoption matches separate native verification with one discovery and destination index', async () => {
  const root = repo();
  const artifact = await seed.createSeed({
    source: root,
    files,
    execOptions,
    execute: pass,
  });
  const separate = path.join(root, '.separate');
  seed.importSeed({ ...options(root, artifact), cacheDir: separate });
  const expected = await cache.runCached({
    files,
    keyer: cache.createKeyer({
      root,
      index: cache.buildFileIndex(root),
      execOptions,
    }),
    store: cache.createStore(separate),
    execute: pass,
    mode: 'use',
    verifyHits: 2,
    seed: 'local:1',
  });
  const artifactPath = path.join(os.tmpdir(), `${path.basename(root)}.json`);
  roots.push(artifactPath);
  fs.writeFileSync(artifactPath, JSON.stringify(artifact));
  const reportPath = path.join(root, 'adoption-report.json');
  jest.spyOn(process, 'cwd').mockReturnValue(root);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  const discovery = jest.spyOn(cache, 'listTests').mockReturnValue(files);
  const index = jest.spyOn(cache, 'buildFileIndex');
  const execute = jest.fn(pass);
  jest.spyOn(cache, 'createJestExecutor').mockReturnValue(execute);
  expect(
    await cli.main([
      '--import',
      artifactPath,
      '--run',
      '--verify-hits',
      '2',
      '--project',
      'unit',
      '--cache-dir',
      path.join(root, '.combined'),
      '--report',
      reportPath,
      '--',
      '--ci',
      '--maxWorkers=2',
    ]),
  ).toBe(0);
  expect(discovery).toHaveBeenCalledTimes(1);
  expect(index).toHaveBeenCalledTimes(1);
  expect(JSON.parse(fs.readFileSync(reportPath, 'utf8')).run).toEqual(expected);
  expect(execute).toHaveBeenCalledWith(expected.verified);
});

it('reuses the source census only in the same clean checkout, retaining both input snapshots', async () => {
  const root = repo();
  const artifactPath = path.join(os.tmpdir(), `${path.basename(root)}.json`);
  roots.push(artifactPath);
  jest.spyOn(process, 'cwd').mockReturnValue(root);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  const discovery = jest.spyOn(cache, 'listTests').mockReturnValue(files);
  const index = jest.spyOn(cache, 'buildFileIndex');
  jest.spyOn(cache, 'createJestExecutor').mockReturnValue(pass);
  expect(
    await cli.main([
      '--source',
      root,
      '--artifact',
      artifactPath,
      '--project',
      'unit',
      '--',
      '--ci',
    ]),
  ).toBe(0);
  expect(discovery).toHaveBeenCalledTimes(1);
  expect(index).toHaveBeenCalledTimes(3); // source before/after plus destination
  expect(
    JSON.parse(fs.readFileSync(artifactPath, 'utf8')).payload.files,
  ).toEqual(files);
});

it('combined adoption keeps unknown inputs, tombstones, verification failures and forced full runs', async () => {
  const root = repo("test('env', () => Object.keys(process.env));\n");
  const artifact = await seed.createSeed({
    source: root,
    files,
    execOptions,
    execute: pass,
  });
  const artifactPath = path.join(os.tmpdir(), `${path.basename(root)}.json`);
  roots.push(artifactPath);
  fs.writeFileSync(artifactPath, JSON.stringify(artifact));
  jest.spyOn(process, 'cwd').mockReturnValue(root);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(cache, 'listTests').mockReturnValue(files);
  const execute = jest.fn(pass);
  jest.spyOn(cache, 'createJestExecutor').mockReturnValue(execute);
  const reportPath = path.join(root, 'report.json');
  const args = [
    '--import',
    artifactPath,
    '--run',
    '--verify-hits',
    '2',
    '--project',
    'unit',
    '--cache-dir',
    options(root, artifact).cacheDir,
    '--report',
    reportPath,
    '--',
    '--ci',
  ];
  cache
    .createStore(options(root, artifact).cacheDir)
    .remove(artifact.payload.entries[0].key);
  expect(await cli.main(args)).toBe(0);
  expect(execute).toHaveBeenLastCalledWith(files); // unknown plus tombstone
  execute.mockImplementation(async (given) => ({
    exitCode: given.includes(files[1]) ? 1 : 0,
    results: new Map(
      given.map((file) => [
        file,
        file === files[1] ? ('failed' as const) : ('passed' as const),
      ]),
    ),
  }));
  expect(await cli.main(args)).toBe(1);
  expect(JSON.parse(fs.readFileSync(reportPath, 'utf8')).run.stale).toEqual([
    files[1],
  ]);
  expect(
    cache
      .createStore(options(root, artifact).cacheDir)
      .get(artifact.payload.entries[0].key),
  ).toBeNull();
  execute.mockImplementation(pass);
  const previousEvent = process.env.GITHUB_EVENT_NAME;
  try {
    process.env.GITHUB_EVENT_NAME = 'schedule';
    expect(await cli.main(args)).toBe(0);
    expect(execute).toHaveBeenLastCalledWith(files);
    expect(JSON.parse(fs.readFileSync(reportPath, 'utf8')).run.mode).toBe(
      'record',
    );
  } finally {
    if (previousEvent === undefined) delete process.env.GITHUB_EVENT_NAME;
    else process.env.GITHUB_EVENT_NAME = previousEvent;
  }
  fs.writeFileSync(artifactPath, '{corrupt');
  fs.rmSync(options(root, artifact).cacheDir, { recursive: true, force: true });
  expect(await cli.main(args)).toBe(0);
  expect(execute).toHaveBeenLastCalledWith(files);
});

it('combined adoption runs every file when destination key infrastructure fails', async () => {
  const root = repo();
  const artifact = await seed.createSeed({
    source: root,
    files,
    execOptions,
    execute: pass,
  });
  const artifactPath = path.join(os.tmpdir(), `${path.basename(root)}.json`);
  roots.push(artifactPath);
  fs.writeFileSync(artifactPath, JSON.stringify(artifact));
  jest.spyOn(process, 'cwd').mockReturnValue(root);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(cache, 'listTests').mockReturnValue(files);
  jest.spyOn(cache, 'createKeyer').mockImplementation(() => {
    throw new Error('index unavailable');
  });
  const execute = jest.fn(pass);
  jest.spyOn(cache, 'createJestExecutor').mockReturnValue(execute);
  expect(
    await cli.main([
      '--import',
      artifactPath,
      '--run',
      '--project',
      'unit',
      '--',
      '--ci',
    ]),
  ).toBe(0);
  expect(execute).toHaveBeenCalledWith(files);
});

#!/usr/bin/env node
/**
 * Per-test-file result cache for Jest (`npm run test:cached`), after T3 Code's
 * `test:cached`: skip a test file when an earlier run already passed with the
 * same inputs, re-run a sample of those skips to prove the cache is honest, and
 * run everything whenever there is any doubt.
 *
 * KEY. A file's key hashes (all through git blob ids, so it costs no reads):
 *   - the file and its static import closure (relative, `@/` and in-repo
 *     bare imports; jest.mock/requireActual targets; its __snapshots__ file;
 *     the Jest setup files),
 *   - the "data inputs" it can read: if any closure file uses fs read APIs,
 *     the digest of every repo directory the closure names (public/data/,
 *     openspec/, docs/, ... and the closure file's own directory when it uses
 *     __dirname), or of the WHOLE repo when it names none,
 *   - the whole repo when the closure spawns child processes or has a dynamic
 *     require/import or an unresolvable relative import,
 *   - the env vars it reads (process.env.NAME) plus NODE_ENV, TZ, JEST_*,
 *   - package*.json, tsconfig.json, jest.config.js, config/jest/, .env*,
 *     every __mocks__ file, the Node version and platform.
 *
 * FAIL OPEN. An exception while keying, a bare `process.env` / `process.env[x]`,
 * an unreadable cache: the file runs. Reads that the scan cannot see (a path
 * built from a variable in a closure that also names a directory) are the one
 * residual gap; --verify-hits and the always-uncached main/nightly runs are
 * the backstops for it.
 *
 * MODES. `use` (PR default) skips hits. `record` runs every file and still
 * records passes; it is forced on main pushes, scheduled runs and --coverage,
 * so main/nightly are always uncached and keep the cache seeded.
 *
 *   node scripts/jest/cached-tests.js [--project unit]... [--shard 2/6]
 *     [--verify-hits 3] [--cache-dir .jest-result-cache] [--uncached]
 *     [--filter <regex on repo path>] [--report file.json]
 *     [-- extra --flag=value jest options]
 */
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const KEY_VERSION = 1;
const SOURCE_EXTENSIONS = /\.(?:[cm]?[jt]sx?)$/;
const RESOLVE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
];
const SETUP_ROOTS = ['jest.setup.js', 'jest.setup.a11y.ts'];
const GLOBAL_FILES = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'jest.config.js',
  'next.config.ts',
];
const GLOBAL_PREFIXES = ['config/jest/'];
const FIXED_ENV = ['NODE_ENV', 'TZ'];
// Source files whose fs reads are known not to touch repo inputs, so they do
// not force a whole-repo key. Add to this list only with the reason.
const HERMETIC_FS_READERS = new Set([
  // reads E2E fault sentinels from the runtime-created data/.e2e-fault dir
  'src/lib/multiplayer/server/DurableMatchStore.ts',
]);

const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const toPosix = (p) => p.split(path.sep).join('/');
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------------------------------------------------------------------------
// Repo file index: repo path -> content digest
// ---------------------------------------------------------------------------

function hashFile(root, rel) {
  try {
    return sha(fs.readFileSync(path.join(root, rel)));
  } catch {
    return null;
  }
}

function walk(root, dir, out) {
  for (const entry of fs.readdirSync(path.join(root, dir), {
    withFileTypes: true,
  })) {
    if (['node_modules', '.git', '.next'].includes(entry.name)) continue;
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(root, rel, out);
    else if (entry.isFile()) out.set(rel, hashFile(root, rel));
  }
}

/** git blob ids for tracked files (no reads), content hashes for dirty ones. */
function buildFileIndex(root, excludePrefix = null) {
  const index = new Map();
  try {
    const git = (args) =>
      execFileSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    for (const row of git(['ls-files', '-s', '-z']).split('\0')) {
      const match = /^\d+ ([0-9a-f]+) \d+\t([\s\S]*)$/.exec(row);
      if (match) index.set(match[2], `git:${match[1]}`);
    }
    // modified, deleted and untracked-but-not-ignored files
    for (const rel of git([
      'ls-files',
      '-m',
      '-o',
      '--exclude-standard',
      '-z',
    ]).split('\0')) {
      if (!rel) continue;
      const digest = hashFile(root, rel);
      if (digest) index.set(rel, digest);
      else index.delete(rel);
    }
    if (index.size === 0) throw new Error('empty git index');
  } catch {
    index.clear();
    walk(root, '', index);
  }
  // The result cache lives in the tree; it must never feed its own keys.
  if (excludePrefix) {
    for (const file of [...index.keys()])
      if (file.startsWith(excludePrefix)) index.delete(file);
  }
  return index;
}

function createDigests(index) {
  const sorted = [...index.entries()].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  const memo = new Map();
  return {
    /** digest of every file whose repo path starts with `prefix` ('' = whole repo). */
    prefix(prefix) {
      if (!memo.has(prefix)) {
        const hash = crypto.createHash('sha256');
        for (const [file, digest] of sorted) {
          if (file.startsWith(prefix)) hash.update(`${file}\0${digest}\n`);
        }
        memo.set(prefix, hash.digest('hex'));
      }
      return memo.get(prefix);
    },
    sorted,
  };
}

// ---------------------------------------------------------------------------
// Static analysis of one source file
// ---------------------------------------------------------------------------

const IMPORT_PATTERNS = [
  /\b(?:import|export)\b[^'"`;()]*?\bfrom\s*['"]([^'"\n]+)['"]/g,
  /\bimport\s*['"]([^'"\n]+)['"]/g,
  /\b(?:import|require(?:\.resolve)?|jest\.(?:mock|doMock|unmock|dontMock|requireActual|requireMock|createMockFromModule|setMock))\s*\(\s*['"]([^'"\n]+)['"]/g,
];
// A require()/import() whose argument is not a string literal. Not preceded by
// `.` (method call) and not a typed parameter (`import(content: string)` is an
// interface method, not a load).
const DYNAMIC_LOAD = /(?<![.\w$])(?:require|import)\s*\(\s*(?!['"]|\w+\s*[:?])/;
// Comments hold example imports and prose like "legacy import (task 1.3)";
// neither may taint a file. Only comments that START a line are stripped, so
// a `/*` inside a string literal on a code line cannot hide real code. The
// specs found in raw text still join the closure either way.
const stripComments = (text) =>
  text.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, '').replace(/^[ \t]*\/\/.*$/gm, '');
// Content reads: with no named directory in the closure these force a
// whole-repo key. Existence checks (existsSync & co) only add named
// directories when present; a bare existsSync(dir) is how code guards a
// directory it is about to create, not a data input.
const FS_READ =
  /\b(?:readFile|readFileSync|readdir|readdirSync|createReadStream|opendir|opendirSync|globSync)\b/;
const FS_EXISTS = /\b(?:statSync|lstatSync|existsSync|accessSync)\b/;
const CHILD_PROCESS = /child_process|\b(?:execSync|execFileSync|spawnSync)\b/;
const OWN_DIR = /\b(?:__dirname|__filename)\b/;
const ENV_NAMED =
  /process\.env\??\.([A-Za-z_][A-Za-z0-9_]*)|process\.env\[\s*['"]([^'"]+)['"]\s*\]/g;
// process.env[CONSTANT]: the name is not at the call site, so every
// SCREAMING_SNAKE string literal in the closure is treated as a possible name.
const ENV_COMPUTED = /process\.env\[\s*(?!['"])/;
const ENV_BARE = /process\.env(?![.\[\w?])/;
const ENV_NAME_LITERAL = /['"]([A-Z][A-Z0-9_]{2,})['"]/g;

/** One matcher per repo top-level name: [regex, prefix to digest]. */
function buildNameMatchers(index) {
  const names = new Map(); // name -> isDirectory
  for (const file of index.keys()) {
    const slash = file.indexOf('/');
    if (slash === -1) names.set(file, names.get(file) ?? false);
    else names.set(file.slice(0, slash), true);
  }
  return [...names].map(([name, isDir]) => [
    new RegExp(`(?:['"\`]|[\\\\/])${escapeRegex(name)}(?:['"\`]|[\\\\/])`),
    isDir ? `${name}/` : name,
  ]);
}

function analyzeSource(text, rel, nameMatchers) {
  const specs = new Set();
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of text.matchAll(pattern)) specs.add(match[1]);
  }
  const codeSpecs = new Set();
  const code = stripComments(text);
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of code.matchAll(pattern)) codeSpecs.add(match[1]);
  }
  const envNames = new Set();
  for (const match of text.matchAll(ENV_NAMED))
    envNames.add(match[1] ?? match[2]);
  const usesFs = FS_READ.test(code);
  const tokens = new Set();
  if (usesFs || FS_EXISTS.test(code)) {
    for (const [matcher, prefix] of nameMatchers) {
      if (matcher.test(text)) tokens.add(prefix);
    }
    if (OWN_DIR.test(code)) {
      const dir = path.posix.dirname(rel);
      tokens.add(dir === '.' ? '' : `${dir}/`);
    }
  }
  const envComputed = ENV_COMPUTED.test(code);
  const envLiterals = new Set();
  if (envComputed)
    for (const match of code.matchAll(ENV_NAME_LITERAL))
      envLiterals.add(match[1]);
  return {
    specs: [...specs],
    codeSpecs,
    envNames,
    envLiterals,
    envComputed,
    usesFs,
    tokens,
    dynamicLoad: DYNAMIC_LOAD.test(code),
    childProcess: CHILD_PROCESS.test(code),
    envBare: ENV_BARE.test(code),
  };
}

// ---------------------------------------------------------------------------
// Keyer
// ---------------------------------------------------------------------------

function createKeyer({ root, index, env = process.env }) {
  const digests = createDigests(index);
  // Repo top-level names count as "named data" evidence for fs-reading code.
  const nameMatchers = buildNameMatchers(index);
  const namedDirs = new Set(
    nameMatchers.map(([, prefix]) => prefix.replace(/\/$/, '')),
  );
  const analysisCache = new Map();
  const isFile = (rel) => index.has(rel);
  const digestOf = (rel) => index.get(rel) ?? hashFile(root, rel);

  function analyze(rel) {
    if (!analysisCache.has(rel)) {
      let info = null;
      if (SOURCE_EXTENSIONS.test(rel)) {
        info = analyzeSource(
          fs.readFileSync(path.join(root, rel), 'utf8'),
          rel,
          nameMatchers,
        );
      }
      analysisCache.set(rel, info);
    }
    return analysisCache.get(rel);
  }

  function resolveSpec(spec, fromRel) {
    let base;
    if (spec.startsWith('.'))
      base = path.posix.join(path.posix.dirname(fromRel), spec);
    else if (spec.startsWith('@/')) base = `src/${spec.slice(2)}`;
    else if (namedDirs.has(spec.split('/')[0]) && spec.includes('/'))
      base = spec;
    else return 'external';
    const stem = base.replace(/\.(?:[cm]?js|jsx)$/, '');
    const candidates = [
      base,
      ...RESOLVE_EXTENSIONS.map((ext) => base + ext),
      ...RESOLVE_EXTENSIONS.map((ext) => `${stem}${ext}`),
      ...RESOLVE_EXTENSIONS.map((ext) => `${base}/index${ext}`),
    ];
    const hit = candidates.find(isFile);
    if (hit) return hit;
    // bare spec that is not an in-repo path (e.g. 'scripts' package-like name)
    return spec.startsWith('.') || spec.startsWith('@/') ? null : 'external';
  }

  const globalDigest = sha(
    JSON.stringify({
      v: KEY_VERSION,
      node: process.versions.node.split('.')[0],
      platform: `${process.platform}-${process.arch}`,
      files: GLOBAL_FILES.map((f) => [f, index.get(f) ?? null]),
      env: [...index.keys()]
        .filter((f) => f.startsWith('.env'))
        .map((f) => [f, index.get(f)]),
      prefixes: GLOBAL_PREFIXES.map((p) => [p, digests.prefix(p)]),
      mocks: digests.sorted.filter(([f]) => /(?:^|\/)__mocks__\//.test(f)),
    }),
  );

  return {
    /** @returns {{ key: string } | { unkeyable: string }} */
    keyFor(testRel) {
      const closure = new Set();
      const queue = [testRel, ...SETUP_ROOTS.filter(isFile)];
      const snapshot = `${path.posix.dirname(testRel)}/__snapshots__/${path.posix.basename(testRel)}.snap`;
      if (isFile(snapshot)) queue.push(snapshot);
      const domains = new Set();
      const envNames = new Set(FIXED_ENV);
      const why = [];
      const fsFiles = [];
      let anyEnvComputed = false;
      const envLiterals = new Set();

      while (queue.length > 0) {
        const rel = queue.pop();
        if (closure.has(rel)) continue;
        closure.add(rel);
        const info = analyze(rel);
        if (!info) continue;
        if (info.envBare)
          return { unkeyable: `${rel}: uses process.env as a whole object` };
        info.envNames.forEach((name) => envNames.add(name));
        if (info.envComputed) anyEnvComputed = true;
        info.envLiterals.forEach((name) => envLiterals.add(name));
        if (info.dynamicLoad) why.push(`dynamic require/import in ${rel}`);
        if (info.childProcess) why.push(`child process in ${rel}`);
        if (info.usesFs && !HERMETIC_FS_READERS.has(rel)) fsFiles.push(rel);
        info.tokens.forEach((token) => domains.add(token));
        for (const spec of info.specs) {
          const target = resolveSpec(spec, rel);
          if (target === null) {
            if (info.codeSpecs.has(spec))
              why.push(`unresolved import '${spec}' in ${rel}`);
          } else if (target !== 'external') queue.push(target);
        }
      }
      if (fsFiles.length > 0 && domains.size === 0) {
        why.push(`fs reads but no named directory in ${fsFiles[0]}`);
      }
      if (anyEnvComputed) envLiterals.forEach((name) => envNames.add(name));
      const repoWide = why.length > 0;

      const envEntries = [
        ...envNames,
        ...Object.keys(env).filter((n) => n.startsWith('JEST_')),
      ]
        .filter((name, i, all) => all.indexOf(name) === i)
        .sort()
        .map((name) => [name, env[name] ?? null]);
      return {
        key: sha(
          JSON.stringify({
            global: globalDigest,
            test: testRel,
            closure: [...closure].sort().map((f) => [f, digestOf(f)]),
            domains: [...domains].sort().map((d) => [d, digests.prefix(d)]),
            repo: repoWide ? digests.prefix('') : null,
            env: envEntries,
          }),
        ),
        repoWide,
        why,
        closure: [...closure].sort(),
        domains: [...domains].sort(),
        closureSize: closure.size,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Result store
// ---------------------------------------------------------------------------

function createStore(dir) {
  const entryPath = (key) => path.join(dir, key.slice(0, 2), `${key}.json`);
  return {
    get(key) {
      try {
        const entry = JSON.parse(fs.readFileSync(entryPath(key), 'utf8'));
        return entry && entry.key === key ? entry : null;
      } catch {
        return null; // missing or corrupt: not a hit
      }
    },
    put(key, entry) {
      fs.mkdirSync(path.dirname(entryPath(key)), { recursive: true });
      fs.writeFileSync(
        entryPath(key),
        JSON.stringify({ ...entry, key, version: KEY_VERSION }),
      );
    },
    touch(key) {
      const now = new Date();
      try {
        fs.utimesSync(entryPath(key), now, now);
      } catch {
        // best effort
      }
    },
    remove(key) {
      fs.rmSync(entryPath(key), { force: true });
    },
    /** Drop entries not used for `days`; keeps the Actions cache from growing forever. */
    prune(days) {
      const cutoff = Date.now() - days * 86400000;
      let removed = 0;
      if (!fs.existsSync(dir)) return removed;
      for (const sub of fs.readdirSync(dir)) {
        const subDir = path.join(dir, sub);
        if (!fs.statSync(subDir).isDirectory()) continue;
        for (const name of fs.readdirSync(subDir)) {
          const file = path.join(subDir, name);
          if (fs.statSync(file).mtimeMs < cutoff) {
            fs.rmSync(file, { force: true });
            removed += 1;
          }
        }
      }
      return removed;
    },
  };
}

// ---------------------------------------------------------------------------
// Run orchestration (jest is injected so tests can plant results)
// ---------------------------------------------------------------------------

/** Deterministic pseudo-random order so each run/attempt verifies a different sample. */
function verifyOrder(files, seed) {
  return [...files].sort((a, b) => {
    const ra = sha(`${seed}:${a}`);
    const rb = sha(`${seed}:${b}`);
    return ra < rb ? -1 : ra > rb ? 1 : 0;
  });
}

/**
 * @param execute async (files) => ({ exitCode, results: Map<repoPath, 'passed'|'failed'> })
 * @param mode 'use' skips hits; 'record' runs everything but still records passes
 */
async function runCached({
  files,
  keyer,
  store,
  execute,
  mode,
  verifyHits,
  seed,
  log = () => {},
}) {
  const keyed = files.map((file) => {
    try {
      return { file, ...keyer.keyFor(file) };
    } catch (error) {
      return { file, unkeyable: `key error: ${error && error.message}` }; // fail open
    }
  });
  const hits =
    mode === 'use' ? keyed.filter((k) => k.key && store.get(k.key)) : [];
  const hitSet = new Set(hits.map((k) => k.file));
  const misses = keyed.filter((k) => !hitSet.has(k.file));
  for (const k of keyed.filter((x) => x.unkeyable))
    log(`not cacheable (${k.unkeyable}): ${k.file}`);
  hits.forEach((k) => store.touch(k.key));

  const report = {
    mode,
    files: files.length,
    hits: hits.length,
    executed: misses.length,
    unkeyable: keyed.filter((k) => k.unkeyable).length,
    verified: [],
    stale: [],
    exitCode: 0,
  };

  if (misses.length > 0) {
    const run = await execute(misses.map((k) => k.file));
    report.exitCode = run.exitCode;
    for (const k of misses) {
      if (k.key && run.results.get(k.file) === 'passed')
        store.put(k.key, { file: k.file, passedAt: new Date().toISOString() });
    }
    if (run.exitCode !== 0) return report; // a real failure: do not spend time verifying
  }

  const sample = verifyOrder(
    hits.map((k) => k.file),
    seed,
  ).slice(0, verifyHits);
  if (sample.length > 0) {
    log(
      `verifying ${sample.length} cached result(s) without the cache: ${sample.join(', ')}`,
    );
    const rerun = await execute(sample);
    for (const file of sample) {
      report.verified.push(file);
      if (rerun.results.get(file) !== 'passed') {
        report.stale.push(file);
        store.remove(hits.find((k) => k.file === file).key);
      }
    }
    if (report.stale.length > 0 || rerun.exitCode !== 0)
      report.exitCode = rerun.exitCode || 1;
  }
  return report;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function resolveMode({ uncached, passthrough, env }) {
  if (uncached) return 'record';
  if (env.GITHUB_EVENT_NAME === 'schedule') return 'record';
  if (env.GITHUB_EVENT_NAME === 'push' && env.GITHUB_REF === 'refs/heads/main')
    return 'record';
  if (
    passthrough.some((arg) => arg === '--coverage' || arg === '--coverage=true')
  )
    return 'record';
  return 'use';
}

function jestArgs({ projects, shard, passthrough }) {
  return [
    ...projects.flatMap((p) => ['--selectProjects', p]),
    ...(shard ? [`--shard=${shard}`] : []),
    ...passthrough,
  ];
}

function createJestExecutor({ root, baseArgs }) {
  const jestBin = path.join(root, 'node_modules', 'jest', 'bin', 'jest.js');
  const withoutShard = baseArgs.filter((a) => !a.startsWith('--shard'));
  return async (files) => {
    const tmp = fs.mkdtempSync(
      path.join(require('node:os').tmpdir(), 'cached-tests-'),
    );
    const out = path.join(tmp, 'report.json');
    const result = spawnSync(
      process.execPath,
      [
        jestBin,
        '--json',
        `--outputFile=${out}`,
        ...withoutShard,
        '--runTestsByPath',
        ...files,
      ],
      { cwd: root, stdio: 'inherit' },
    );
    const results = new Map();
    try {
      const report = JSON.parse(fs.readFileSync(out, 'utf8'));
      for (const test of report.testResults) {
        results.set(
          toPosix(path.relative(root, test.name)),
          test.status === 'passed' ? 'passed' : 'failed',
        );
      }
    } catch {
      // no readable report: nothing is recorded, exit code still decides
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    return { exitCode: result.status ?? 1, results };
  };
}

function listTests({ root, baseArgs }) {
  const jestBin = path.join(root, 'node_modules', 'jest', 'bin', 'jest.js');
  const stdout = execFileSync(
    process.execPath,
    [jestBin, '--listTests', '--json', ...baseArgs],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'inherit'],
    },
  );
  const line = stdout
    .split('\n')
    .reverse()
    .find((l) => l.startsWith('['));
  if (!line) throw new Error('jest --listTests --json printed no list');
  return JSON.parse(line).map((abs) => toPosix(path.relative(root, abs)));
}

async function main(argv) {
  const { parseArgs } = require('node:util');
  const split = argv.indexOf('--');
  const own = split === -1 ? argv : argv.slice(0, split);
  const passthrough = split === -1 ? [] : argv.slice(split + 1);
  if (passthrough.some((arg) => !arg.startsWith('-'))) {
    console.error(
      'test:cached: pass jest options as --flag=value after --; test paths are not supported',
    );
    return 2;
  }
  const { values } = parseArgs({
    args: own,
    options: {
      project: { type: 'string', multiple: true, default: [] },
      shard: { type: 'string' },
      'verify-hits': { type: 'string', default: '0' },
      'cache-dir': { type: 'string', default: '.jest-result-cache' },
      uncached: { type: 'boolean', default: false },
      filter: { type: 'string' },
      report: { type: 'string' },
      'prune-days': { type: 'string', default: '14' },
    },
  });
  const verifyHits = Number(values['verify-hits']);
  if (!Number.isSafeInteger(verifyHits) || verifyHits < 0) {
    console.error('test:cached: --verify-hits must be a non-negative integer');
    return 2;
  }
  const root = process.cwd();
  const mode = resolveMode({
    uncached: values.uncached,
    passthrough,
    env: process.env,
  });
  const baseArgs = jestArgs({
    projects: values.project,
    shard: values.shard,
    passthrough,
  });
  const filter = values.filter ? new RegExp(values.filter) : null;
  const files = listTests({ root, baseArgs }).filter(
    (file) => !filter || filter.test(file),
  );
  const store = createStore(path.resolve(root, values['cache-dir']));
  const started = Date.now();
  let report;
  try {
    const cacheRel =
      toPosix(path.relative(root, path.resolve(root, values['cache-dir']))) +
      '/';
    const keyer = createKeyer({ root, index: buildFileIndex(root, cacheRel) });
    report = await runCached({
      files,
      keyer,
      store,
      execute: createJestExecutor({ root, baseArgs }),
      mode,
      verifyHits,
      seed: `${process.env.GITHUB_RUN_ID || 'local'}:${process.env.GITHUB_RUN_ATTEMPT || '1'}`,
      log: (line) => console.log(`[test:cached] ${line}`),
    });
  } catch (error) {
    // Keying infrastructure broke: run everything (fail open).
    console.error(
      `[test:cached] cache unavailable (${error && error.message}); running all ${files.length} files`,
    );
    const run = await createJestExecutor({ root, baseArgs })(files);
    return run.exitCode;
  }
  store.prune(Number(values['prune-days']));
  report.elapsedMs = Date.now() - started;
  console.log(
    `[test:cached] mode=${report.mode} files=${report.files} cache-hits=${report.hits} executed=${report.executed} ` +
      `verified=${report.verified.length} stale=${report.stale.length} exit=${report.exitCode}`,
  );
  for (const file of report.stale)
    console.error(
      `[test:cached] STALE cached pass (fails when re-run): ${file}`,
    );
  if (values.report) {
    fs.mkdirSync(path.dirname(path.resolve(values.report)), {
      recursive: true,
    });
    fs.writeFileSync(
      values.report,
      `${JSON.stringify({ ...report, shard: values.shard ?? null }, null, 2)}\n`,
    );
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### Jest result cache (${values.shard ?? 'unsharded'}, ${report.mode})\n\n` +
        `${report.files} files: ${report.hits} skipped from cache, ${report.executed} executed ` +
        `(${report.unkeyable} not cacheable); ${report.verified.length} cached results re-run, ${report.stale.length} stale.\n`,
    );
  }
  return report.exitCode;
}

module.exports = {
  buildFileIndex,
  createKeyer,
  createStore,
  runCached,
  resolveMode,
  verifyOrder,
};

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error);
      process.exit(1);
    },
  );
}

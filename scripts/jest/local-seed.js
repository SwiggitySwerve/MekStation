'use strict';

// Local seed transport. Key discovery and test execution belong to cached-tests.
const crypto = require('node:crypto');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const cache = require('./cached-tests');

const digest = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');
const runtime = () => ({
  node: process.versions.node,
  platform: process.platform,
  arch: process.arch,
});
const engine = () => digest(fs.readFileSync(require.resolve('./cached-tests')));
const git = (root, args) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30000,
  }).trim();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function cleanMain(source) {
  const sha = git(source, ['rev-parse', 'HEAD']);
  if (sha !== git(source, ['rev-parse', 'origin/main']))
    throw new Error(
      'Seed source must be at origin/main; update only your own prepared checkout.',
    );
  if (git(source, ['status', '--porcelain', '--untracked-files=all']))
    throw new Error('Seed source must be clean, including untracked files.');
  return sha;
}

function indexSnapshot(index) {
  return digest(
    JSON.stringify({
      files: [...index].sort(([a], [b]) => a.localeCompare(b)),
      symlinks: [...index.symlinks].sort(),
    }),
  );
}

function seal(payload) {
  return { checksum: digest(JSON.stringify(payload)), payload };
}

async function createSeed({ source, files, execOptions, execute }) {
  const sourceSha = cleanMain(source);
  const index = cache.buildFileIndex(source);
  const snapshot = indexSnapshot(index);
  const entries = new Map();
  const started = Date.now();
  const report = await cache.runCached({
    files,
    keyer: cache.createKeyer({ root: source, index, execOptions }),
    store: { put: (key, entry) => entries.set(key, { ...entry, key }) },
    execute,
    mode: 'record',
    verifyHits: 0,
    seed: 'local-seed',
  });
  if (report.exitCode !== 0)
    throw new Error(
      `Seed tests failed (exit ${report.exitCode}); no seed published.`,
    );
  if (
    cleanMain(source) !== sourceSha ||
    indexSnapshot(cache.buildFileIndex(source)) !== snapshot
  )
    throw new Error(
      'Seed source inputs changed during execution; no seed published.',
    );
  return seal({
    version: 1,
    sourceSha,
    runtime: runtime(),
    engine: engine(),
    execOptions,
    files,
    report,
    elapsedMs: Date.now() - started,
    entries: [...entries.values()],
  });
}

function validateArtifact(root, artifact, execOptions) {
  const p = artifact?.payload;
  if (!p || artifact.checksum !== digest(JSON.stringify(p)))
    throw new Error('Corrupt seed checksum');
  if (p.version !== 1 || !same(p.runtime, runtime()) || p.engine !== engine())
    throw new Error(
      'Foreign seed version, full Node, platform, architecture or cache engine',
    );
  if (!same(p.execOptions, execOptions))
    throw new Error('Seed project/Jest options differ');
  if (!/^[0-9a-f]{40}$/.test(p.sourceSha))
    throw new Error('Invalid seed source SHA');
  git(root, ['merge-base', '--is-ancestor', p.sourceSha, 'origin/main']);
  if (
    !Array.isArray(p.files) ||
    new Set(p.files).size !== p.files.length ||
    !p.files.every((f) => typeof f === 'string') ||
    !Array.isArray(p.entries) ||
    p.report?.mode !== 'record' ||
    p.report?.exitCode !== 0 ||
    p.report?.files !== p.files.length ||
    p.report?.executed !== p.files.length
  )
    throw new Error('Invalid seed census or successful cold-run proof');
  const census = new Set(p.files);
  const seen = new Set();
  for (const entry of p.entries) {
    if (
      !entry ||
      !/^[0-9a-f]{64}$/.test(entry.key) ||
      !census.has(entry.file) ||
      seen.has(entry.file) ||
      !Number.isFinite(Date.parse(entry.passedAt))
    )
      throw new Error('Invalid seed entry');
    seen.add(entry.file);
  }
  return p;
}

function importSeed({ root, artifact, files, execOptions, cacheDir }) {
  const result = { imported: 0, missed: files.length, retained: 0 };
  try {
    const payload = validateArtifact(root, artifact, execOptions);
    const store = cache.createStore(cacheDir);
    const keyer = cache.createKeyer({
      root,
      index: cache.buildFileIndex(root),
      execOptions,
    });
    const census = new Set(files);
    for (const entry of payload.entries) {
      if (!census.has(entry.file)) continue;
      const keyed = keyer.keyFor(entry.file);
      if (!keyed.key || keyed.key !== entry.key) continue;
      // Existing entries include rejection tombstones. Never revive one with
      // an imported pass; only a fresh real test run can overwrite it.
      if (
        store.putIfAbsent(entry.key, {
          file: entry.file,
          passedAt: entry.passedAt,
        })
      ) {
        result.imported += 1;
      } else result.retained += 1;
    }
    result.missed -= result.imported + result.retained;
  } catch (error) {
    // Adoption is optional. The normal runner still executes every miss.
    result.rejected = error.message;
  }
  return result;
}

module.exports = { createSeed, importSeed, seal };

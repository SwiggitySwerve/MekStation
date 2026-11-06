#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseArgs } = require('node:util');
const cache = require('./cached-tests');
const { createSeed, importSeed } = require('./local-seed');

async function main(argv) {
  const split = argv.indexOf('--');
  const passthrough =
    split < 0 ? ['--ci', '--maxWorkers=2'] : argv.slice(split + 1);
  const { values } = parseArgs({
    args: split < 0 ? argv : argv.slice(0, split),
    options: {
      source: { type: 'string' },
      import: { type: 'string' },
      artifact: { type: 'string' },
      project: { type: 'string', multiple: true, default: [] },
      shard: { type: 'string' },
      filter: { type: 'string' },
      'cache-dir': { type: 'string', default: '.jest-result-cache' },
      report: { type: 'string' },
      run: { type: 'boolean', default: false },
      'verify-hits': { type: 'string', default: '3' },
    },
  });
  if (
    !!values.source === !!values.import ||
    (values.source && !values.artifact)
  )
    throw new Error(
      'Use --source <clean-main-checkout> --artifact <outside-source.json>, or --import <local-seed.json>.',
    );
  if (
    cache.resolveMode({ uncached: false, passthrough, env: {} }) === 'off' ||
    passthrough.some((arg) => arg === '--coverage' || arg === '--coverage=true')
  )
    throw new Error(
      'Use supported cached-tests options; coverage seeds are not supported.',
    );
  const verifyHits = Number(values['verify-hits']);
  if (!Number.isSafeInteger(verifyHits) || verifyHits < 0)
    throw new Error('--verify-hits must be a non-negative integer.');
  const root = process.cwd();
  const baseArgs = cache.jestArgs({
    projects: values.project,
    shard: values.shard,
    passthrough,
  });
  const execOptions = cache.cacheExecOptions({
    projects: values.project,
    passthrough,
  });
  const filter = values.filter ? new RegExp(values.filter) : null;
  const census = (cwd) =>
    cache
      .listTests({ root: cwd, baseArgs })
      .filter((f) => !filter || filter.test(f));
  const executeAt = (cwd) =>
    cache.createJestExecutor({
      root: cwd,
      baseArgs,
      spawn: (cmd, args, opts) =>
        spawnSync(cmd, args, {
          ...opts,
          stdio: ['ignore', 'inherit', 'inherit'],
          timeout: 600000,
          windowsHide: true,
        }),
    });
  const started = Date.now();
  let artifact;
  let files;
  if (values.source) {
    const source = path.resolve(values.source);
    const artifactPath = path.resolve(values.artifact);
    const rel = path.relative(source, artifactPath);
    if (
      !path.isAbsolute(rel) &&
      rel !== '..' &&
      !rel.startsWith(`..${path.sep}`)
    )
      throw new Error('Keep the artifact outside the source checkout.');
    const sourceFiles = census(source);
    artifact = await createSeed({
      source,
      files: sourceFiles,
      execOptions,
      execute: executeAt(source),
    });
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(artifactPath, `${JSON.stringify(artifact)}\n`);
    // Capture has checked that source inputs stayed clean and unchanged.
    if (source === root) files = sourceFiles;
  } else {
    try {
      artifact = JSON.parse(
        fs.readFileSync(path.resolve(values.import), 'utf8'),
      );
    } catch (error) {
      console.error(
        `[test:seed] Seed unavailable: ${error.message}; destination tests remain uncached.`,
      );
    }
  }
  files ??= census(root);
  const cacheDir = path.resolve(root, values['cache-dir']);
  let keyer;
  let store;
  if (values.run) {
    store = cache.createStore(cacheDir);
    try {
      keyer = cache.createKeyer({
        root,
        index: cache.buildFileIndex(root),
        execOptions,
      });
    } catch (error) {
      keyer = {
        keyFor: () => ({ unkeyable: `cache unavailable: ${error.message}` }),
      };
    }
  }
  const result = importSeed({
    root,
    artifact,
    files,
    execOptions,
    cacheDir,
    keyer,
    store,
  });
  let run;
  if (values.run) {
    const execute = executeAt(root);
    const options = {
      files,
      keyer,
      store,
      execute,
      mode: cache.resolveMode({
        uncached: false,
        passthrough,
        env: process.env,
      }),
      verifyHits,
      seed: `${process.env.GITHUB_RUN_ID || 'local'}:${process.env.GITHUB_RUN_ATTEMPT || '1'}`,
      log: (line) => console.log(`[test:seed] ${line}`),
    };
    try {
      run = await cache.runCached(options);
    } catch (error) {
      console.error(
        `[test:seed] Cache unavailable (${error.message}); running all ${files.length} files.`,
      );
      run = await cache.runCached({
        ...options,
        mode: 'off',
        keyer: { keyFor: () => ({ unkeyable: 'cache unavailable' }) },
        verifyHits: 0,
      });
    }
    store.prune(14);
  }
  const report = {
    ...result,
    ...(run ? { run } : {}),
    files: files.length,
    elapsedMs: Date.now() - started,
    sourceSha: artifact?.payload?.sourceSha ?? null,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
  };
  console.log(`[test:seed] ${JSON.stringify(report)}`);
  if (!values.run)
    console.log(
      '[test:seed] Run test:cached with the same projects/Jest options and --verify-hits 3 to test this checkout.',
    );
  if (values.report) {
    fs.mkdirSync(path.dirname(path.resolve(values.report)), {
      recursive: true,
    });
    fs.writeFileSync(values.report, `${JSON.stringify(report, null, 2)}\n`);
  }
  return run?.exitCode ?? 0;
}

module.exports = { main };
if (require.main === module)
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(`[test:seed] ${error.message}`);
      process.exit(1);
    },
  );

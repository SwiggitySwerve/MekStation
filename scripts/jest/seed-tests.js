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
  const started = Date.now();
  let artifact;
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
    artifact = await createSeed({
      source,
      files: census(source),
      execOptions,
      execute: cache.createJestExecutor({
        root: source,
        baseArgs,
        spawn: (cmd, args, opts) =>
          spawnSync(cmd, args, {
            ...opts,
            stdio: ['ignore', 'inherit', 'inherit'],
            timeout: 600000,
            windowsHide: true,
          }),
      }),
    });
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(artifactPath, `${JSON.stringify(artifact)}\n`);
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
  const files = census(root);
  const result = importSeed({
    root,
    artifact,
    files,
    execOptions,
    cacheDir: path.resolve(root, values['cache-dir']),
  });
  const report = {
    ...result,
    files: files.length,
    elapsedMs: Date.now() - started,
    sourceSha: artifact?.payload?.sourceSha ?? null,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
  };
  console.log(`[test:seed] ${JSON.stringify(report)}`);
  console.log(
    '[test:seed] Run test:cached with the same projects/Jest options and --verify-hits 3 to test this checkout.',
  );
  if (values.report) {
    fs.mkdirSync(path.dirname(path.resolve(values.report)), {
      recursive: true,
    });
    fs.writeFileSync(values.report, `${JSON.stringify(report, null, 2)}\n`);
  }
  return 0;
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

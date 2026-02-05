#!/usr/bin/env node
/**
 * Prepare GitHub Pages update metadata (latest*.yml) for electron-updater.
 *
 * Usage:
 *   node desktop/scripts/release/prepare-update-metadata.js --tag v0.1.15
 *
 * Options:
 *   --tag <tag>                 Git tag used for GitHub Release download URLs (required)
 *   --release-dir <path>        electron-builder output dir (default: desktop/release)
 *   --out-dir <path>            output dir to write metadata (default: desktop/.tmp/update-metadata)
 *   --owner <owner>             GitHub owner/org (default: SwiggitySwerve)
 *   --repo <repo>               GitHub repo (default: MekStation)
 */

const path = require('path');
const { prepareUpdateMetadata } = require('./updateMetadata');

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function main() {
  const repoRoot = path.join(__dirname, '..', '..');
  const tag = getArg('--tag');
  const releaseDir = getArg('--release-dir') || path.join(repoRoot, 'release');
  const outDir =
    getArg('--out-dir') || path.join(repoRoot, '.tmp', 'update-metadata');
  const owner = getArg('--owner') || 'SwiggitySwerve';
  const repo = getArg('--repo') || 'MekStation';

  if (!tag) {
    console.error('Missing required argument: --tag <tag>');
    process.exit(1);
  }

  const { writtenFiles } = prepareUpdateMetadata({
    releaseDir,
    outDir,
    owner,
    repo,
    tag,
  });

  console.log(
    `[prepare-update-metadata] Wrote ${writtenFiles.length} file(s) to: ${outDir}`,
  );
  for (const f of writtenFiles.slice(0, 20)) {
    console.log(`- ${f}`);
  }
  if (writtenFiles.length > 20) {
    console.log(`- ...and ${writtenFiles.length - 20} more`);
  }
}

main();

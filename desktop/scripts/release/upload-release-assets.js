#!/usr/bin/env node
/**
 * Upload release assets to GitHub while excluding auto-update metadata files:
 * - excludes: latest*.yml, *.blockmap, builder-debug.yml
 *
 * Goal: keep GitHub Releases "package-only" (installers/app packages), while update metadata
 * is hosted separately (e.g., GitHub Pages).
 *
 * Requires GitHub CLI (`gh`) authenticated with repo access.
 *
 * Usage:
 *   node desktop/scripts/release/upload-release-assets.js --tag v0.1.15
 *
 * Options:
 *   --tag <tag>                 Release tag (required)
 *   --release-dir <path>        electron-builder output dir (default: desktop/release)
 *   --owner <owner>             GitHub owner/org (default: SwiggitySwerve)
 *   --repo <repo>               GitHub repo (default: MekStation)
 *   --create                    Create the release if missing (default: true)
 *   --draft                     Create as draft (only when creating)
 *   --prerelease                Create as prerelease (only when creating)
 *   --dry-run                   Print what would be uploaded
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function hasFlag(name) {
  return process.argv.includes(name);
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function execGh(args, opts) {
  return execFileSync('gh', args, { stdio: 'inherit', ...opts });
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function main() {
  const projectRoot = path.join(__dirname, '..', '..', '..');
  const desktopDir = path.join(projectRoot, 'desktop');

  const tag = getArg('--tag');
  const releaseDir = getArg('--release-dir') || path.join(desktopDir, 'release');
  const owner = getArg('--owner') || 'SwiggitySwerve';
  const repo = getArg('--repo') || 'MekStation';
  const shouldCreate = hasFlag('--create') || !hasFlag('--no-create');
  const isDraft = hasFlag('--draft');
  const isPrerelease = hasFlag('--prerelease');
  const dryRun = hasFlag('--dry-run');

  if (!tag) {
    console.error('Missing required argument: --tag <tag>');
    process.exit(1);
  }

  if (!fs.existsSync(releaseDir)) {
    console.error(`Release directory not found: ${releaseDir}`);
    process.exit(1);
  }

  // Verify gh exists
  try {
    execFileSync('gh', ['--version'], { stdio: 'ignore' });
  } catch {
    console.error('GitHub CLI not found on PATH: install `gh` and authenticate (`gh auth login`).');
    process.exit(1);
  }

  const entries = fs.readdirSync(releaseDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => {
      if (name === 'builder-debug.yml') return false;
      if (name.endsWith('.blockmap')) return false;
      if (name.endsWith('.yml')) return false;
      return true;
    })
    .map((name) => path.join(releaseDir, name));

  if (files.length === 0) {
    console.error(`No uploadable assets found in ${releaseDir} (after filtering out .yml/.blockmap)`);
    process.exit(1);
  }

  console.log(`[upload-release-assets] Found ${files.length} asset(s) to upload`);

  if (dryRun) {
    for (const f of files) console.log(`- ${f}`);
    return;
  }

  const repoFlag = ['--repo', `${owner}/${repo}`];

  // Create release if missing (optional)
  let releaseExists = true;
  try {
    execFileSync('gh', ['release', 'view', tag, ...repoFlag], { stdio: 'ignore' });
  } catch {
    releaseExists = false;
  }

  if (!releaseExists) {
    if (!shouldCreate) {
      console.error(`Release ${tag} does not exist (use --create to create it).`);
      process.exit(1);
    }
    const createArgs = ['release', 'create', tag, ...repoFlag, '--title', tag, '--notes', ''];
    if (isDraft) createArgs.push('--draft');
    if (isPrerelease) createArgs.push('--prerelease');
    execGh(createArgs);
  }

  // Upload in small batches to avoid command line length issues.
  for (const batch of chunk(files, 10)) {
    execGh(['release', 'upload', tag, ...batch, '--clobber', ...repoFlag]);
  }
}

main();



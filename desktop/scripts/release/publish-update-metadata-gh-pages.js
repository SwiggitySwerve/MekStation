#!/usr/bin/env node
/**
 * Publish electron-updater channel files (latest*.yml) to GitHub Pages (gh-pages branch),
 * while keeping GitHub Releases free of metadata clutter.
 *
 * This script:
 * 1) Prepares update metadata (rewrites URLs to GitHub Release download URLs)
 * 2) Writes it into a temporary folder
 * 3) Checks out (or creates) a `gh-pages` worktree
 * 4) Replaces the `updates/` folder in gh-pages
 * 5) Commits and pushes
 *
 * Usage:
 *   node desktop/scripts/release/publish-update-metadata-gh-pages.js --tag v0.1.15
 *
 * Options:
 *   --tag <tag>                 Git tag used for GitHub Release download URLs (required)
 *   --release-dir <path>        electron-builder output dir (default: desktop/release)
 *   --owner <owner>             GitHub owner/org (default: SwiggitySwerve)
 *   --repo <repo>               GitHub repo (default: MekStation)
 *   --branch <name>             Pages branch (default: gh-pages)
 *   --remote <name>             Git remote (default: origin)
 *   --dry-run                   Do not commit/push (prints what it would do)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { prepareUpdateMetadata } = require('./updateMetadata');

function hasFlag(name) {
  return process.argv.includes(name);
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function execGit(args, cwd, quiet = false) {
  try {
    return execFileSync('git', args, {
      cwd,
      stdio: quiet ? 'ignore' : 'inherit',
      encoding: 'utf8',
    });
  } catch (e) {
    if (quiet) return null;
    throw e;
  }
}

function copyDirReplacing(destDir, srcDir) {
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.cpSync(srcDir, destDir, { recursive: true });
}

function main() {
  const projectRoot = path.join(__dirname, '..', '..', '..');
  const desktopDir = path.join(projectRoot, 'desktop');

  const tag = getArg('--tag');
  const releaseDir =
    getArg('--release-dir') || path.join(desktopDir, 'release');
  const owner = getArg('--owner') || 'SwiggitySwerve';
  const repo = getArg('--repo') || 'MekStation';
  const branch = getArg('--branch') || 'gh-pages';
  const remote = getArg('--remote') || 'origin';
  const dryRun = hasFlag('--dry-run');

  if (!tag) {
    console.error('Missing required argument: --tag <tag>');
    process.exit(1);
  }

  const tmpDir = path.join(desktopDir, '.tmp');
  const preparedOutDir = path.join(tmpDir, 'update-metadata');
  const worktreeDir = path.join(tmpDir, `worktree-${branch}`);

  // Step 1: prepare metadata
  const { writtenFiles } = prepareUpdateMetadata({
    releaseDir,
    outDir: preparedOutDir,
    owner,
    repo,
    tag,
  });
  console.log(
    `[publish-update-metadata] Prepared ${writtenFiles.length} file(s)`,
  );

  // Step 2: setup worktree
  if (fs.existsSync(worktreeDir)) {
    // Attempt to remove any existing worktree registration first.
    execGit(['worktree', 'remove', '--force', worktreeDir], projectRoot, true);
    fs.rmSync(worktreeDir, { recursive: true, force: true });
  }

  // Ensure branch exists locally (fetch if exists remotely).
  const hasLocalBranch =
    execGit(
      ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`],
      projectRoot,
      true,
    ) !== null;
  if (!hasLocalBranch) {
    execGit(['fetch', remote, `${branch}:${branch}`], projectRoot, true);
  }
  const branchNowExists =
    execGit(
      ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`],
      projectRoot,
      true,
    ) !== null;

  if (branchNowExists) {
    execGit(['worktree', 'add', '--force', worktreeDir, branch], projectRoot);
  } else {
    // Create an orphan pages branch.
    execGit(
      ['worktree', 'add', '--force', '--detach', worktreeDir],
      projectRoot,
    );
    execGit(['checkout', '--orphan', branch], worktreeDir);
    // Clear all files (if any)
    execGit(['rm', '-rf', '.'], worktreeDir, true);
  }

  // Step 3: replace updates folder
  // IMPORTANT: Do not clobber other platforms.
  // We only replace the subdirectories that exist in the prepared output, so
  // Windows/Linux/mac arch jobs can publish independently.
  const preparedUpdatesDir = path.join(preparedOutDir, 'updates');
  const destUpdatesDir = path.join(worktreeDir, 'updates');
  if (!fs.existsSync(destUpdatesDir)) {
    fs.mkdirSync(destUpdatesDir, { recursive: true });
  }

  const topLevelDirs = fs
    .readdirSync(preparedUpdatesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  for (const dirName of topLevelDirs) {
    const srcTop = path.join(preparedUpdatesDir, dirName);
    const destTop = path.join(destUpdatesDir, dirName);

    if (dirName === 'mac') {
      // Replace only the mac arch directories present in this build output.
      const archDirs = fs
        .readdirSync(srcTop, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);

      for (const arch of archDirs) {
        copyDirReplacing(path.join(destTop, arch), path.join(srcTop, arch));
      }
      continue;
    }

    copyDirReplacing(destTop, srcTop);
  }

  fs.copyFileSync(
    path.join(preparedOutDir, '.nojekyll'),
    path.join(worktreeDir, '.nojekyll'),
  );

  if (dryRun) {
    console.log(
      `[publish-update-metadata] Dry run complete. Worktree at: ${worktreeDir}`,
    );
    return;
  }

  // Step 4: commit and push
  execGit(['add', '-A'], worktreeDir);

  const status = execFileSync('git', ['status', '--porcelain'], {
    cwd: worktreeDir,
    encoding: 'utf8',
  }).trim();
  if (!status) {
    console.log('[publish-update-metadata] No changes to publish.');
    return;
  }

  execGit(
    ['commit', '-m', `updates: publish metadata for ${tag}`],
    worktreeDir,
  );
  execGit(['push', remote, branch], worktreeDir);

  console.log(`[publish-update-metadata] Published to ${remote}/${branch}`);
}

main();

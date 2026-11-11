import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Works around a lint-staged defect that loses unstaged edits.
//
// lint-staged hides the unstaged part of a partially staged file by writing it
// to a patch inside the git directory and then resetting the file. It builds
// that path in lib/resolveGitRepo.js:56-57 by joining
// path.relative(topLevel, absoluteGitDir) onto the top level. When that
// "relative" path is absolute (on Windows: the worktree and its git dir are on
// different drives, e.g. a linked worktree on C: of a repository on E:), the
// joined path is invalid, the patch write fails, lint-staged still resets the
// file, and the unstaged edit is gone with no backup.
//
// Present in lint-staged 16.2.7 and 17.6.0. This check can go once the
// installed lint-staged builds that path correctly.
//
// In such a worktree this script refuses a commit that has a partially staged
// file, naming the files. Otherwise it prints `--no-hide-partially-staged` for
// the hook to pass to lint-staged, so the failing patch step never runs. On a
// worktree whose git dir is reachable by a relative path it prints nothing and
// lint-staged keeps its default hiding.

export const NO_HIDE_FLAG = '--no-hide-partially-staged';

// True when lint-staged's relative path from the top level to the git dir is
// not relative, which is the case resolveGitRepo.js mishandles.
export function gitDirNotRelative(topLevel, gitDir, pathApi = path) {
  return pathApi.isAbsolute(pathApi.relative(topLevel, gitDir));
}

// Files with changes both in the index and in the working tree, from
// `git status --porcelain=v1 -z`. Same predicate as lint-staged's
// getUnstagedFiles({ onlyPartial: true }): neither column blank or `?`.
export function partiallyStagedFiles(statusZ) {
  const fields = statusZ.split('\0');
  const files = [];
  for (let i = 0; i < fields.length; i += 1) {
    const entry = fields[i];
    if (entry.length < 4) continue;
    const [index, workingTree] = entry;
    // A rename or copy is followed by its source path as a separate field.
    if (index === 'R' || index === 'C') i += 1;
    const inIndex = index !== ' ' && index !== '?';
    const inWorkingTree = workingTree !== ' ' && workingTree !== '?';
    if (inIndex && inWorkingTree) files.push(entry.slice(3));
  }
  return files;
}

export function refusalMessage(files, topLevel, gitDir) {
  return [
    'Cannot commit: these files are partially staged (staged changes and unstaged changes in the same file):',
    ...files.map((file) => `  ${file}`),
    '',
    `This worktree (${topLevel}) and its git directory (${gitDir}) are on different drives.`,
    'lint-staged cannot set the unstaged part aside here: its patch write fails and the unstaged edit is lost.',
    '',
    'Do one of these, then commit again:',
    '  1. Stage the whole file:  git add -- <file>',
    '  2. Move the unstaged edit aside: copy the file somewhere outside the repository,',
    '     git restore -- <file>, commit, then copy your edit back.',
    '     (Not git stash: the stash stack is shared by every worktree.)',
    '',
    'Do not bypass this hook with --no-verify. This check is what protects the unstaged edit,',
    'and a bypassed commit also skips formatting, lint and the typecheck.',
    '',
  ].join('\n');
}

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

function main() {
  const topLevel = git(['rev-parse', '--show-toplevel']).trim();
  const gitDir = git(['rev-parse', '--absolute-git-dir']).trim();
  // Test seam, stricter only: it can turn the cross-drive check on where the
  // platform cannot produce it (POSIX paths are always relative), never off.
  const forced =
    process.env.MEKSTATION_PRECOMMIT_ASSUME_GITDIR_NOT_RELATIVE === '1';
  if (!forced && !gitDirNotRelative(topLevel, gitDir)) return;
  const files = partiallyStagedFiles(
    git(['status', '--porcelain=v1', '-z', '--untracked-files=no']),
  );
  if (files.length) {
    process.stderr.write(refusalMessage(files, topLevel, gitDir));
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`${NO_HIDE_FLAG}\n`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}

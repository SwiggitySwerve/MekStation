import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { spawnHookShell } from './support/spawn-hook-shell';

// lint-staged (16.2.7, 17.6.0) builds the path of its unstaged-changes patch
// from path.relative(topLevel, gitDir) (lib/resolveGitRepo.js:56-57). When the
// worktree and its git dir are on different drives that path is absolute, the
// patch write fails, lint-staged still resets the partially staged file, and
// the unstaged edit is lost. The hook refuses such a commit before lint-staged
// runs. These tests run the real hook text in throwaway repositories and trace
// every git command it runs.
const repoRoot = path.resolve(__dirname, '../..');
const hookPath = path.join(repoRoot, '.husky', 'pre-commit');
const lintStagedCli = path.join(
  repoRoot,
  'node_modules/lint-staged/bin/lint-staged.js',
);
const SEAM = 'MEKSTATION_PRECOMMIT_ASSUME_GITDIR_NOT_RELATIVE';
const NO_HIDE_FLAG = '--no-hide-partially-staged';
const helperModule = pathToFileURL(
  path.join(repoRoot, 'scripts/lib/check-partial-stage.mjs'),
).href;

// Root Jest does not load ES modules, so the helpers run in a child node
// process. `code` is an expression over `m` (the module) and `path`.
function callHelper(code: string): unknown {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import path from 'node:path';\n` +
        `import * as m from ${JSON.stringify(helperModule)};\n` +
        `process.stdout.write(JSON.stringify(${code}));`,
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout);
}
const OLD_LINE = 'npx lint-staged --no-stash ||';
const GUARD_LINES =
  'hide_flag=$(node scripts/lib/check-partial-stage.mjs) || exit $?\nnpx lint-staged --no-stash $hide_flag ||';
const posixPath = (value: string) => value.replaceAll('\\', '/');
const lf = (value: string) => value.replaceAll('\r\n', '\n');

const STAGED = 'line1-STAGED\nline2\nline3\n';
const PARTIAL = 'line1-STAGED\nline2\nline3-UNSTAGED\n';

const cleanup: string[] = [];
afterAll(() => {
  for (const dir of cleanup) fs.rmSync(dir, { recursive: true, force: true });
});

function git(args: string[], cwd: string, input?: string): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', input });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
  }
  return result.stdout.trim();
}

function tempDir(parent: string, prefix: string): string {
  const dir = fs.mkdtempSync(path.join(parent, prefix));
  cleanup.push(dir);
  return dir;
}

// A repository with one commit (written directly: no identity, signing or
// config involved). With worktreeParent set, the hook runs in a linked
// worktree created there. probe.json gets a staged hunk on line 1 and, when
// partial, an unstaged hunk on line 3.
function fixture(options: {
  repoParent?: string;
  worktreeParent?: string;
  partial: boolean;
}): string {
  const repo = tempDir(options.repoParent ?? os.tmpdir(), 'precommit-partial-');
  git(['init', '--quiet'], repo);
  fs.writeFileSync(path.join(repo, 'probe.json'), 'line1\nline2\nline3\n');
  git(['add', 'probe.json'], repo);
  const tree = git(['write-tree'], repo);
  const commit = git(
    ['hash-object', '-t', 'commit', '-w', '--stdin'],
    repo,
    `tree ${tree}\nauthor Fixture <fixture@example.invalid> 0 +0000\n` +
      `committer Fixture <fixture@example.invalid> 0 +0000\n\nfixture\n`,
  );
  git(['update-ref', 'HEAD', commit], repo);
  let cwd = repo;
  if (options.worktreeParent) {
    cwd = path.join(tempDir(options.worktreeParent, 'precommit-wt-'), 'wt');
    git(['worktree', 'add', '--quiet', '--detach', cwd, 'HEAD'], repo);
  }
  fs.writeFileSync(path.join(cwd, 'probe.json'), STAGED);
  git(['add', 'probe.json'], cwd);
  if (options.partial) fs.writeFileSync(path.join(cwd, 'probe.json'), PARTIAL);
  // The formatter appends a marker line, so its run is visible.
  const formatter = path.join(cwd, 'formatter.cjs');
  fs.writeFileSync(
    formatter,
    "for (const f of process.argv.slice(2)) require('node:fs').appendFileSync(f, 'FORMATTED\\n');\n",
  );
  fs.writeFileSync(
    path.join(cwd, 'package.json'),
    JSON.stringify({
      'lint-staged': {
        '*.json': `"${posixPath(process.execPath)}" "${posixPath(formatter)}"`,
      },
    }),
  );
  fs.mkdirSync(path.join(cwd, 'scripts/lib'), { recursive: true });
  for (const script of [
    'check-partial-stage.mjs',
    'check-staged-parents.mjs',
  ]) {
    fs.copyFileSync(
      path.join(repoRoot, 'scripts/lib', script),
      path.join(cwd, 'scripts/lib', script),
    );
  }
  // Only the npx launcher is local; it runs the installed lint-staged CLI.
  fs.mkdirSync(path.join(cwd, 'bin'));
  fs.writeFileSync(
    path.join(cwd, 'bin', 'npx'),
    `#!/bin/sh\nshift\nexec "${posixPath(process.execPath)}" "${posixPath(lintStagedCli)}" "$@"\n`,
    { mode: 0o755 },
  );
  return cwd;
}

interface IHookRun {
  status: number | null;
  stderr: string;
  gitCommands: string[];
  index: string;
  worktree: string;
}

// assumeGitDirNotRelative sets the script's stricter-only test seam. It is
// exported by the inner shell, so the environment is inherited untouched (and
// this file stays cacheable by the Jest result cache).
function runHook(
  cwd: string,
  hookText: string,
  { assumeGitDirNotRelative = false } = {},
): IHookRun {
  const hook = path.join(tempDir(os.tmpdir(), 'precommit-hook-'), 'pre-commit');
  fs.writeFileSync(hook, hookText);
  const result = spawnHookShell(
    [
      '-c',
      `if [ "$2" = 1 ]; then export ${SEAM}=1; fi; ` +
        'PATH="$PWD/bin:$PATH" GIT_TRACE="$PWD/git-trace.log" exec sh -e "$1"',
      'sh',
      posixPath(hook),
      assumeGitDirNotRelative ? '1' : '0',
    ],
    { cwd, encoding: 'utf8', timeout: 60_000 },
  );
  return {
    status: result.status,
    stderr: result.stderr,
    gitCommands: fs
      .readFileSync(path.join(cwd, 'git-trace.log'), 'utf8')
      .split(/\r?\n/)
      .filter((line) => /trace: (built-in|exec): git\b/.test(line)),
    index: lf(git(['show', ':probe.json'], cwd) + '\n'),
    worktree: lf(fs.readFileSync(path.join(cwd, 'probe.json'), 'utf8')),
  };
}

const hidingSteps = (run: IHookRun) =>
  run.gitCommands.filter((line) =>
    /\s--output\b|\scheckout --force\b/.test(line),
  );
const ranLintStaged = (run: IHookRun) =>
  run.gitCommands.some((line) =>
    /\sdiff\b.*--cached|\sdiff\b.*--staged/.test(line),
  );
const hookText = () => fs.readFileSync(hookPath, 'utf8');

describe('check-partial-stage.mjs helpers', () => {
  const notRelative = (topLevel: string, gitDir: string, api: string) =>
    callHelper(
      `m.gitDirNotRelative(${JSON.stringify(topLevel)}, ${JSON.stringify(gitDir)}, path.${api})`,
    );

  it('flags a git dir that has no relative path from the top level', () => {
    expect(
      notRelative(
        'C:/Users/dev/.t3/worktrees/MekStation/lane',
        'E:/Projects/MekStation/.git/worktrees/lane',
        'win32',
      ),
    ).toBe(true);
    expect(
      notRelative(
        'E:/wt/lane',
        'E:/Projects/MekStation/.git/worktrees/lane',
        'win32',
      ),
    ).toBe(false);
    expect(
      notRelative('/home/dev/wt', '/srv/repo/.git/worktrees/wt', 'posix'),
    ).toBe(false);
  });

  it('finds files changed in both the index and the working tree', () => {
    const status = [
      'MM both.ts',
      'M  staged.ts',
      ' M unstaged.ts',
      'AM added-then-edited.ts',
      'RM renamed-new.ts',
      'renamed-old.ts',
      'R  moved-new.ts',
      'moved-old.ts',
      '?? untracked.ts',
      '',
    ].join('\0');
    expect(
      callHelper(`m.partiallyStagedFiles(${JSON.stringify(status)})`),
    ).toEqual(['both.ts', 'added-then-edited.ts', 'renamed-new.ts']);
    expect(callHelper('m.NO_HIDE_FLAG')).toBe(NO_HIDE_FLAG);
  });
});

describe('pre-commit hook: partially staged files', () => {
  it('pins the guard line ahead of lint-staged', () => {
    expect(hookText()).toContain(GUARD_LINES);
  });

  it('where the git dir is not relative, refuses a partial stage before lint-staged runs', () => {
    const run = runHook(fixture({ partial: true }), hookText(), {
      assumeGitDirNotRelative: true,
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('partially staged');
    expect(run.stderr).toContain('  probe.json');
    expect(run.stderr).toContain('git add -- <file>');
    expect(run.stderr).toContain('Do not bypass this hook with --no-verify');
    expect(hidingSteps(run)).toEqual([]);
    expect(ranLintStaged(run)).toBe(false);
    expect(run.index).toBe(STAGED);
    expect(run.worktree).toBe(PARTIAL);
  });

  it('where the git dir is not relative and nothing is partial, runs lint-staged without hiding', () => {
    const run = runHook(fixture({ partial: false }), hookText(), {
      assumeGitDirNotRelative: true,
    });
    expect(run.status).toBe(0);
    expect(run.stderr).toContain(NO_HIDE_FLAG);
    expect(ranLintStaged(run)).toBe(true);
    expect(hidingSteps(run)).toEqual([]);
    expect(run.index).toBe(`${STAGED}FORMATTED\n`);
  });

  it('on a same-drive worktree, keeps lint-staged hiding: the staged part is committed, the unstaged edit kept', () => {
    const run = runHook(fixture({ partial: true }), hookText());
    expect(run.status).toBe(0);
    expect(run.stderr).not.toContain(NO_HIDE_FLAG);
    expect(ranLintStaged(run)).toBe(true);
    expect(hidingSteps(run).length).toBe(2);
    expect(run.index).toBe(`${STAGED}FORMATTED\n`);
    expect(run.worktree).toBe(`${PARTIAL}FORMATTED\n`);
  });
});

// The real defect needs the worktree and the repository on different drives.
// Here the repository is created next to this checkout and its linked worktree
// in the temp dir, which is the lane layout (repository on E:, worktrees on C:).
// It runs only where those two are on different drives (Windows); elsewhere the
// rows above cover the refusal through the seam.
const crossDrive =
  process.platform === 'win32' &&
  path.parse(path.resolve(repoRoot)).root.toUpperCase() !==
    path.parse(path.resolve(os.tmpdir())).root.toUpperCase();
const crossDriveIt = crossDrive ? it : it.skip;

describe('pre-commit hook in a real cross-drive linked worktree', () => {
  const layout = () => ({
    repoParent: path.dirname(repoRoot),
    worktreeParent: os.tmpdir(),
    partial: true,
  });

  crossDriveIt(
    'refuses the partial stage; no patch, no reset, the unstaged edit intact',
    () => {
      const run = runHook(fixture(layout()), hookText());
      expect(run.status).toBe(1);
      expect(run.stderr).toContain('are on different drives');
      expect(hidingSteps(run)).toEqual([]);
      expect(run.index).toBe(STAGED);
      expect(run.worktree).toBe(PARTIAL);
    },
  );

  crossDriveIt(
    'would catch the loss (the hook without the guard loses the unstaged edit)',
    () => {
      const hook = hookText();
      expect(hook).toContain(GUARD_LINES);
      const mutant = hook.replace(GUARD_LINES, OLD_LINE);
      const run = runHook(fixture(layout()), mutant);
      expect(run.status).toBe(1);
      expect(run.stderr).toContain('lint-staged_unstaged.patch');
      expect(run.gitCommands.some((line) => /\s--output\b/.test(line))).toBe(
        true,
      );
      expect(run.worktree).toBe(STAGED);
    },
  );
});

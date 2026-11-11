import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { copyHookScripts, hookScripts } from './support/hook-scripts';
import { spawnHookShell } from './support/spawn-hook-shell';

// Pins owner decision OD-precommit-drop-full-build: .husky/pre-commit runs no
// production build. It still typechecks both compiler projects with
// `npm run typecheck` when .ts/.tsx is staged, once per commit in the hook
// itself (not as a lint-staged task, which ran once per chunk).
const repoRoot = path.resolve(__dirname, '../..');
const hookPath = path.join(repoRoot, '.husky', 'pre-commit');
const packagePath = path.join(repoRoot, 'package.json');

// Returns the hook's non-blank lines that do not start with `#`, trimmed and
// prefixed with their 1-based line number ("17: npm run build").
function hookCommandLines(): string[] {
  return fs
    .readFileSync(hookPath, 'utf8')
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), number: index + 1 }))
    .filter(({ line }) => line !== '' && !line.startsWith('#'))
    .map(({ line, number }) => `${number}: ${line}`);
}

describe('pre-commit hook (OD-precommit-drop-full-build)', () => {
  it('runs neither `npm run build` nor `next build` on any command line', () => {
    // `build` must end the script name, so `npm run build:x` does not match.
    const buildCommand =
      /\bnpm(?:\.cmd)?\s+run(?:-script)?\s+build(?![\w:-])|\bnext\s+build\b/;
    expect(
      hookCommandLines().filter((line) => buildCommand.test(line)),
    ).toEqual([]);
  });

  it('keeps `npx lint-staged --no-stash`; no lint-staged task typechecks', () => {
    expect(
      hookCommandLines().some((line) =>
        /^\d+: npx lint-staged --no-stash \$hide_flag \|\| exit \$\?$/.test(
          line,
        ),
      ),
    ).toBe(true);
    const lintStaged = JSON.parse(fs.readFileSync(packagePath, 'utf8'))[
      'lint-staged'
    ];
    expect(
      Object.values(lintStaged)
        .flat()
        .filter((task) => /typecheck|\btsc\b/.test(String(task))),
    ).toEqual([]);
  });

  // Fixtures that run the real hook copy the scripts in hook-scripts.json; a
  // hook script missing there breaks every such fixture (#3375 broke main so).
  it('lists every scripts/lib script the hook runs in hook-scripts.json', () => {
    const used = [
      ...fs
        .readFileSync(hookPath, 'utf8')
        .matchAll(/node scripts\/lib\/([\w.-]+\.mjs)/g),
    ].map((match) => match[1]);
    expect(used.length).toBeGreaterThan(0);
    expect([...new Set(used)].sort()).toEqual([...hookScripts()].sort());
  });

  it('runs its steps in order: partial-stage, lint-staged, staged parents, then one typecheck', () => {
    const lines = hookCommandLines().map((line) => line.replace(/^\d+: /, ''));
    const at = (pattern: RegExp) =>
      lines.findIndex((line) => pattern.test(line));
    const partial = at(/check-partial-stage\.mjs/);
    const lintStaged = at(/^npx lint-staged /);
    const parents = at(
      /^node scripts\/lib\/check-staged-parents\.mjs \|\| exit \$\?$/,
    );
    const detect = at(
      /^ts_staged=\$\(node scripts\/lib\/staged-typescript\.mjs\) \|\| exit \$\?$/,
    );
    const gate = at(/^if \[ "\$ts_staged" = yes \]; then$/);
    const typecheck = at(/^npm run typecheck \|\| exit \$\?$/);
    expect(
      [partial, lintStaged, parents, detect, gate, typecheck].every(
        (i) => i >= 0,
      ),
    ).toBe(true);
    expect(
      partial < lintStaged &&
        lintStaged < parents &&
        parents < detect &&
        detect < gate &&
        gate < typecheck,
    ).toBe(true);
    expect(lines.filter((line) => /npm run typecheck/.test(line))).toHaveLength(
      1,
    );
    expect(lines.at(-1)).toBe('fi');
  });
});

// Linked worktrees share one stash stack. lint-staged's default backup stores
// a stash and later applies or drops it by an index it looked up a moment
// earlier, so a concurrent stash in another worktree can make it drop someone
// else's entry. The hook must leave the stash stack alone entirely.
describe('pre-commit hook leaves the shared stash stack alone', () => {
  const lintStagedCli = path.join(
    repoRoot,
    'node_modules/lint-staged/bin/lint-staged.js',
  );
  const posixPath = (value: string) => value.replaceAll('\\', '/');

  function git(args: string[], cwd: string, input?: string): string {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8', input });
    expect(result.status).toBe(0);
    return result.stdout.trim();
  }

  // A throwaway repository with one commit and a staged change. lint-staged
  // only takes a backup when HEAD exists. The commit object is written
  // directly, so no identity, signing or config is involved.
  function fixture(): string {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'precommit-stash-'));
    git(['init', '--quiet'], cwd);
    fs.writeFileSync(path.join(cwd, 'probe.json'), 'before\n');
    git(['add', 'probe.json'], cwd);
    const tree = git(['write-tree'], cwd);
    const commit = git(
      ['hash-object', '-t', 'commit', '-w', '--stdin'],
      cwd,
      `tree ${tree}\nauthor Fixture <fixture@example.invalid> 0 +0000\n` +
        `committer Fixture <fixture@example.invalid> 0 +0000\n\nfixture\n`,
    );
    git(['update-ref', 'HEAD', commit], cwd);
    fs.writeFileSync(path.join(cwd, 'probe.json'), 'after\n');
    git(['add', 'probe.json'], cwd);
    const formatter = path.join(cwd, 'formatter.cjs');
    fs.writeFileSync(
      formatter,
      "for (const f of process.argv.slice(2)) require('node:fs').writeFileSync(f, '{}\\n');\n",
    );
    fs.writeFileSync(
      path.join(cwd, 'package.json'),
      JSON.stringify({
        'lint-staged': {
          '*.json': `"${posixPath(process.execPath)}" "${posixPath(formatter)}"`,
        },
      }),
    );
    copyHookScripts(cwd);
    // Only the npx launcher is local; it runs the installed lint-staged CLI.
    const bin = path.join(cwd, 'bin');
    fs.mkdirSync(bin);
    fs.writeFileSync(
      path.join(bin, 'npx'),
      `#!/bin/sh\nshift\nexec "${posixPath(process.execPath)}" "${posixPath(lintStagedCli)}" "$@"\n`,
      { mode: 0o755 },
    );
    return cwd;
  }

  // Runs a hook script in the fixture and returns every git command it ran.
  function gitCommandsRun(hook: string): string[] {
    const cwd = fixture();
    const trace = path.join(cwd, 'git-trace.log');
    // The environment is inherited untouched. The inner shell prepends the
    // fixture's bin (as $PWD/bin, valid in POSIX and MSYS shells) and turns
    // on git's command trace for the hook only.
    const result = spawnHookShell(
      [
        '-c',
        'PATH="$PWD/bin:$PATH" GIT_TRACE="$PWD/git-trace.log" exec sh -e "$1"',
        'sh',
        posixPath(hook),
      ],
      { cwd, encoding: 'utf8', timeout: 60_000 },
    );
    expect(result.status).toBe(0);
    expect(git(['stash', 'list'], cwd)).toBe('');
    return fs
      .readFileSync(trace, 'utf8')
      .split(/\r?\n/)
      .filter((line) => /trace: (built-in|exec): git\b/.test(line));
  }

  const usesStash = (line: string) => /\sstash(\s|$)/.test(line);

  it('runs lint-staged without any git stash command', () => {
    const commands = gitCommandsRun(hookPath);
    // lint-staged ran and used git: it read the staged diff.
    expect(commands.some((line) => /\sdiff\b/.test(line))).toBe(true);
    expect(commands.filter(usesStash)).toEqual([]);
  });

  it('would catch the default backup (the hook without --no-stash stores a stash)', () => {
    const mutant = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'precommit-mutant-')),
      'pre-commit',
    );
    const hook = fs.readFileSync(hookPath, 'utf8');
    const command = 'npx lint-staged --no-stash $hide_flag ||';
    expect(hook).toContain(command);
    fs.writeFileSync(
      mutant,
      hook.replace(command, 'npx lint-staged $hide_flag ||'),
    );
    expect(gitCommandsRun(mutant).filter(usesStash).length).toBeGreaterThan(0);
  });
});

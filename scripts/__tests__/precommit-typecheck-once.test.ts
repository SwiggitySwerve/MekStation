import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { copyHookScripts } from './support/hook-scripts';
import { spawnHookShell } from './support/spawn-hook-shell';

// The pre-commit hook typechecks once per commit, outside lint-staged.
// lint-staged 16 splits a large staged set into chunks and runs every task
// once per chunk, concurrently (runAll.js), so a `bash -c 'npm run typecheck'`
// task ran once per chunk: several full typechecks at once inside one hook.
// These rows run the real hook text in throwaway repositories with chunking
// forced and a counting stand-in for `npm run typecheck`.
const repoRoot = path.resolve(__dirname, '../..');
const hookPath = path.join(repoRoot, '.husky', 'pre-commit');
const lintStagedCli = path.join(
  repoRoot,
  'node_modules/lint-staged/bin/lint-staged.js',
);
const OLD_TASK = "bash -c 'npm run typecheck'";
const HOOK_TYPECHECK = /\n# Typecheck once per commit[\s\S]*?\nesac\n?$/;
const posixPath = (value: string) => value.replaceAll('\\', '/');

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

// A repository with one commit (written directly: no identity, signing or
// config involved) and `files` staged. `typecheckTask` reproduces the old
// lint-staged config that ran the typecheck as a *.{ts,tsx} task.
function fixture(files: string[], typecheckTask = false): string {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'precommit-tc-'));
  cleanup.push(cwd);
  git(['init', '--quiet'], cwd);
  fs.writeFileSync(path.join(cwd, 'seed.txt'), 'seed\n');
  git(['add', 'seed.txt'], cwd);
  const tree = git(['write-tree'], cwd);
  const commit = git(
    ['hash-object', '-t', 'commit', '-w', '--stdin'],
    cwd,
    `tree ${tree}\nauthor Fixture <fixture@example.invalid> 0 +0000\n` +
      `committer Fixture <fixture@example.invalid> 0 +0000\n\nfixture\n`,
  );
  git(['update-ref', 'HEAD', commit], cwd);
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    fs.writeFileSync(path.join(cwd, file), 'export const x = 1;\n');
    git(['add', file], cwd);
  }
  const noop = `"${posixPath(process.execPath)}" -e 0`;
  fs.writeFileSync(
    path.join(cwd, 'package.json'),
    JSON.stringify({
      'lint-staged': {
        '*.{ts,tsx}': typecheckTask ? [noop, OLD_TASK] : [noop],
        '*.json': [noop],
      },
    }),
  );
  copyHookScripts(cwd);
  const bin = path.join(cwd, 'bin');
  fs.mkdirSync(bin);
  // The installed lint-staged CLI, with a small argument limit so the staged
  // files split into several chunks.
  fs.writeFileSync(
    path.join(bin, 'npx'),
    `#!/bin/sh\nshift\nexec "${posixPath(process.execPath)}" "${posixPath(lintStagedCli)}" "$@" --max-arg-length 40\n`,
    { mode: 0o755 },
  );
  // Counting stand-in for `npm run typecheck`; exit code from TC_EXIT.
  fs.writeFileSync(
    path.join(bin, 'npm'),
    '#!/bin/sh\nif [ "$1" = run ] && [ "$2" = typecheck ]; then\n' +
      '  echo run >> "$TC_COUNT"\n  exit "${TC_EXIT:-0}"\nfi\n' +
      'echo "unexpected npm $*" >&2\nexit 97\n',
    { mode: 0o755 },
  );
  return cwd;
}

function runHook(cwd: string, hookText: string, typecheckExit = 0) {
  const hook = path.join(cwd, 'hook-under-test');
  fs.writeFileSync(hook, hookText);
  const result = spawnHookShell(
    [
      '-c',
      'export TC_COUNT="$PWD/tc-count" TC_EXIT="$2"; ' +
        'PATH="$PWD/bin:$PATH" exec sh -e "$1"',
      'sh',
      posixPath(hook),
      String(typecheckExit),
    ],
    { cwd, encoding: 'utf8', timeout: 120_000 },
  );
  const countFile = path.join(cwd, 'tc-count');
  const runs = fs.existsSync(countFile)
    ? fs.readFileSync(countFile, 'utf8').split('\n').filter(Boolean).length
    : 0;
  return { status: result.status, runs, output: result.stdout + result.stderr };
}

const tsFiles = Array.from(
  { length: 6 },
  (_, i) => `src/typecheck-once/module-number-${String(i).padStart(2, '0')}.ts`,
);
const hookText = () => fs.readFileSync(hookPath, 'utf8');

describe('pre-commit hook typechecks once per commit', () => {
  it('two or more lint-staged chunks still produce exactly one typecheck', () => {
    const { status, runs, output } = runHook(fixture(tsFiles), hookText());
    expect(status).toBe(0);
    expect(output).toMatch(/chunk 2\//);
    expect(runs).toBe(1);
  });

  it('would catch the old config (a lint-staged typecheck task runs once per chunk)', () => {
    const hook = hookText();
    expect(hook).toMatch(HOOK_TYPECHECK);
    const oldHook = hook.replace(HOOK_TYPECHECK, '\n');
    const { status, runs } = runHook(fixture(tsFiles, true), oldHook);
    expect(status).toBe(0);
    expect(runs).toBeGreaterThanOrEqual(2);
  });

  it('runs no typecheck when no .ts or .tsx file is staged', () => {
    const { status, runs } = runHook(fixture(['data/only.json']), hookText());
    expect(status).toBe(0);
    expect(runs).toBe(0);
  });

  it('refuses the commit with the typecheck exit code when it fails', () => {
    const { status, runs } = runHook(
      fixture(tsFiles.slice(0, 1)),
      hookText(),
      3,
    );
    expect(runs).toBe(1);
    expect(status).toBe(3);
  });
});

// Sol's read of #3384: git's line output quotes unusual names, so a staged
// `src/café.ts` arrived as `"src/caf\303\251.ts"` and a `\.ts$` test missed it.
// The hook now asks scripts/lib/staged-typescript.mjs, which reads the
// NUL-delimited list and fails loudly when git fails.
const OLD_GATE =
  "if git diff --cached --name-only --diff-filter=ACMR | grep -Eq '\\.(ts|tsx)$'; then";
const NEW_GATE =
  /ts_staged=\$\(node scripts\/lib\/staged-typescript\.mjs\) \|\| exit \$\?\ncase "\$ts_staged" in\n[\s\S]*?\nesac/;
const OLD_BLOCK = `${OLD_GATE}\n  npm run typecheck || exit $?\nfi`;

describe('pre-commit hook finds staged TypeScript whatever the file name', () => {
  it('typechecks once when the only staged file has a non-ASCII name', () => {
    const { status, runs } = runHook(fixture(['src/café.ts']), hookText());
    expect(status).toBe(0);
    expect(runs).toBe(1);
  });

  it('would catch the old line-output gate (it skips the non-ASCII name)', () => {
    const hook = hookText();
    expect(hook).toMatch(NEW_GATE);
    const oldHook = hook.replace(NEW_GATE, () => OLD_BLOCK);
    const { status, runs } = runHook(fixture(['src/café.ts']), oldHook);
    expect(status).toBe(0);
    expect(runs).toBe(0);
  });

  // Windows file names can't hold a tab; the row runs where they can.
  (process.platform === 'win32' ? it.skip : it)(
    'typechecks once when the staged name holds a tab',
    () => {
      const { status, runs } = runHook(
        fixture(['src/tab\tname.ts']),
        hookText(),
      );
      expect(status).toBe(0);
      expect(runs).toBe(1);
    },
  );

  // Sol's re-read: any non-answer (a silent helper, a symlinked launch that
  // skipped main) must refuse the commit, never read as "no TypeScript".
  it('refuses the commit when the helper gives no yes/no answer', () => {
    const cwd = fixture(['src/silent.ts']);
    fs.writeFileSync(
      path.join(cwd, 'scripts/lib/staged-typescript.mjs'),
      'process.exit(0);\n',
    );
    const { status, runs, output } = runHook(cwd, hookText());
    expect(status).toBe(1);
    expect(runs).toBe(0);
    expect(output).toMatch(/gave no yes\/no answer/);
  });

  it('answers yes when launched through a symlinked directory', () => {
    const cwd = fixture(['src/linked.ts']);
    const link = path.join(cwd, 'linked-lib');
    // A junction needs no privilege on Windows; elsewhere it is a symlink.
    fs.symlinkSync(path.join(repoRoot, 'scripts/lib'), link, 'junction');
    const result = spawnSync(
      process.execPath,
      [path.join(link, 'staged-typescript.mjs')],
      { cwd, encoding: 'utf8' },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('yes');
  });

  it("reads git output with the hook readers' 16 MiB limit, not the 1 MiB default", () => {
    const source = fs.readFileSync(
      path.join(repoRoot, 'scripts/lib/staged-typescript.mjs'),
      'utf8',
    );
    expect(source).toMatch(/export const GIT_MAX_BUFFER = 16 \* 1024 \* 1024;/);
    expect(source).toMatch(/maxBuffer: GIT_MAX_BUFFER/);
  });

  it('stops the hook when git fails instead of reading it as no TypeScript', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'precommit-nogit-'));
    cleanup.push(cwd);
    const result = spawnSync(
      process.execPath,
      [path.join(repoRoot, 'scripts/lib/staged-typescript.mjs')],
      { cwd, encoding: 'utf8' },
    );
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/staged-typescript: git diff failed/);
  });

  it('reads the NUL-delimited list: .ts and .tsx only, any name', () => {
    // Root Jest does not load ES modules, so the parser runs in a child node.
    const module = pathToFileURL(
      path.join(repoRoot, 'scripts/lib/staged-typescript.mjs'),
    ).href;
    const stages = (list: string): boolean => {
      const result = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `import { stagesTypeScript } from ${JSON.stringify(module)};\n` +
            `process.stdout.write(JSON.stringify(stagesTypeScript(${JSON.stringify(list)})));`,
        ],
        { encoding: 'utf8' },
      );
      if (result.status !== 0) throw new Error(result.stderr);
      return JSON.parse(result.stdout);
    };
    expect(stages('src/a.ts\0')).toBe(true);
    expect(stages('docs/b.md\0src/c.tsx\0')).toBe(true);
    expect(stages('src/café.ts\0')).toBe(true);
    expect(stages('src/new\nline.ts\0')).toBe(true);
    expect(stages('src/a.mts\0src/b.d.ts.map\0data/c.json\0')).toBe(false);
    expect(stages('')).toBe(false);
  });
});

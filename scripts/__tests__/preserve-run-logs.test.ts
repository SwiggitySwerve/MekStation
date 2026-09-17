/**
 * Pins for log preservation before worktree removal (U13 - R6.loop-harness).
 *
 * DELIVERY.md ("Owned cleanup") says durable evidence is exported and
 * reopened BEFORE a proof worktree is removed, and that the removal first
 * verifies the canonical non-reparse target, the recorded worktree identity,
 * the expected HEAD and a clean state. U3 is what that prose costs when it is
 * only prose: evidence/u3-local-20260916.json points its `logs` field at
 * `.sisyphus/roadmap-completion-20260912/worktrees/u3/.sisyphus-u3-verify`,
 * that directory was removed with the worktree, and nineteen sha256 lines
 * with no preimage are all that survives.
 *
 * These pins hold the four ways the helper could silently start lying:
 * a copy that did not land counting as preserved, a vacuous manifest over an
 * empty run directory, a run directory read through a junction, and a removal
 * that proceeds without a verified manifest, at the wrong head, or over a
 * dirty tree. The removal cases run against a real temporary git repository
 * with a real `git worktree add`, so the preconditions are measured against
 * git rather than against a stub.
 *
 * The node_modules case is the one with teeth: the junction must be deleted
 * as a reparse point, never walked. Measured on this platform,
 * `fs.rmSync(link, { recursive: true })` already stops at the link, so the
 * pin asserts the junction TARGET still holds its file after the removal -
 * that is what catches a deletion that resolved the link first.
 *
 * The link the fixture plants is not the same KIND of thing on both
 * platforms: `fs.symlinkSync(target, link, 'junction')` makes a directory
 * junction on Windows and an ordinary symlink on POSIX, and git's
 * trailing-slash ignore patterns match directories only. So the fixture
 * spells the ignore `node_modules` without a slash, which matches either, and
 * the clean case asserts `git check-ignore node_modules` rather than assuming
 * it - the assumption is what made this file pass on Windows and fail on
 * Linux CI with WORKTREE_DIRTY.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const modulePath = path.join(repoRoot, 'scripts/qc/preserve-run-logs.mjs');
const moduleUrl = pathToFileURL(modulePath).href;
const UNIT = 'U42';
const DATE = '20260917';
const MANIFEST_NAME = `u42-logs-${DATE}.json`;
const LINK_TYPE = process.platform === 'win32' ? 'junction' : 'dir';

/** The three log files a run directory stands in for here. */
const LOGS: Record<string, string> = {
  'jest.log': 'Tests: 12 passed, 12 total\n',
  'nested/playwright.log': '3 passed (9.1s)\n',
  'tsc.log': '\n',
};
const LOG_BYTES = Object.values(LOGS).reduce(
  (total, contents) => total + Buffer.byteLength(contents),
  0,
);

interface IManifestEntry {
  file: string;
  bytes: number;
  sha256: string;
}
interface IManifest {
  unit: string;
  date: string;
  at: string;
  runDir: string;
  preservedDir: string;
  files: IManifestEntry[];
  bytes: number;
}
interface IHarnessResult {
  ok: boolean;
  value?: Record<string, unknown>;
  error?: { name: string; code: string; message: string };
}

/**
 * Call one named export in a real Node ESM context (jest transpiles this file
 * to CJS and cannot import a .mjs module directly). `corrupt` injects the
 * copy hook the helper offers for exactly this purpose - it mutates the copy
 * between the copy and its verification - and `worktreeList` injects the git
 * runner so the "not a worktree of this repository" branch is reachable
 * without inventing a second repository. Neither injection has a CLI flag.
 */
function harness(request: Record<string, unknown>): IHarnessResult {
  const source = `
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
try {
  const mod = await import(${JSON.stringify(moduleUrl)});
  const options = { ...request.argument };
  if (request.corrupt)
    options.onCopied = ({ target }) => fs.appendFileSync(target, 'corrupted');
  if (request.worktreeList !== undefined)
    options.git = (args, run) => {
      if (args[0] === 'worktree' && args[1] === 'list') return request.worktreeList;
      const result = spawnSync('git', args, { cwd: run && run.cwd, encoding: 'utf8' });
      if (result.status !== 0) throw new Error('GIT_FAILED: git ' + args.join(' '));
      return result.stdout;
    };
  const value = await mod[request.name](options);
  process.stdout.write(JSON.stringify({ ok: true, value }));
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      ok: false,
      error: { name: error.name, code: error.code, message: String(error.message) },
    }),
  );
}`;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', source],
    { encoding: 'utf8', input: JSON.stringify(request), cwd: repoRoot },
  );
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as IHarnessResult;
}

const temporaryDirectory = (): string =>
  fs.mkdtempSync(path.join(os.tmpdir(), 'u13-preserve-'));

const sha256 = (file: string): string =>
  createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function writeFiles(root: string, files: Record<string, string>): void {
  fs.mkdirSync(root, { recursive: true });
  for (const [relative, contents] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
}

/** git with a pinned identity so the temporary repository can commit. */
function git(args: string[], cwd: string): string {
  const result = spawnSync(
    'git',
    [
      '-c',
      'user.email=u13-pin@example.invalid',
      '-c',
      'user.name=U13 Pin',
      '-c',
      'commit.gpgsign=false',
      ...args,
    ],
    { cwd, encoding: 'utf8' },
  );
  if (result.status !== 0)
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

interface IScaffold {
  root: string;
  runDir: string;
  argument: Record<string, unknown>;
}

function preserveScaffold(files: Record<string, string> = LOGS): IScaffold {
  const root = temporaryDirectory();
  const runDir = path.join(root, 'run');
  writeFiles(runDir, files);
  return {
    root,
    runDir,
    argument: {
      runDir,
      unit: UNIT,
      date: DATE,
      repoRoot: root,
      preservedRoot: path.join(root, 'preserved'),
      evidenceDir: path.join(root, 'evidence'),
    },
  };
}

interface IRemovalScaffold {
  parent: string;
  repo: string;
  worktreePath: string;
  head: string;
  manifestPath: string;
  manifest: IManifest;
}

/**
 * A real repository, one commit, one linked worktree, logs already preserved.
 *
 * The ignore entry is spelled `node_modules` WITHOUT a trailing slash on
 * purpose. git's trailing-slash patterns match directories only, and the link
 * this fixture plants is a directory on Windows (a junction) but an ordinary
 * symlink - a non-directory to git - on POSIX, so `node_modules/` ignored it
 * on one platform and left it untracked on the other. The bare spelling
 * matches both. `ignoreNodeModules: false` reproduces the unmatched shape on
 * purpose for the refusal case below.
 */
function removalScaffold({ ignoreNodeModules = true } = {}): IRemovalScaffold {
  const parent = temporaryDirectory();
  const repo = path.join(parent, 'repo');
  const worktreePath = path.join(parent, 'wt');
  fs.mkdirSync(repo, { recursive: true });
  git(['init', '-b', 'main'], repo);
  writeFiles(repo, {
    '.gitignore': `${ignoreNodeModules ? 'node_modules\n' : ''}preserved/\nevidence/\nrun/\n`,
    'README.md': 'u13 pin repository\n',
  });
  git(['add', '-A'], repo);
  git(['commit', '-m', 'init'], repo);
  writeFiles(path.join(repo, 'run'), LOGS);
  git(['worktree', 'add', worktreePath, '-b', 'lane'], repo);
  const preserved = harness({
    name: 'preserveRunLogs',
    argument: {
      runDir: path.join(repo, 'run'),
      unit: UNIT,
      date: DATE,
      repoRoot: repo,
      preservedRoot: path.join(repo, 'preserved'),
      evidenceDir: path.join(repo, 'evidence'),
    },
  });
  expect(preserved.error).toBeUndefined();
  return {
    parent,
    repo,
    worktreePath,
    head: git(['rev-parse', 'HEAD'], worktreePath),
    manifestPath: path.join(repo, 'evidence', MANIFEST_NAME),
    manifest: preserved.value as unknown as IManifest,
  };
}

/** A node_modules junction in the worktree pointing outside it. */
function addNodeModulesJunction(scaffold: IRemovalScaffold): string {
  const target = path.join(scaffold.parent, 'real-node-modules');
  writeFiles(target, { 'pkg/index.js': 'module.exports = 1;\n' });
  fs.symlinkSync(
    target,
    path.join(scaffold.worktreePath, 'node_modules'),
    LINK_TYPE,
  );
  return target;
}

function removal(
  scaffold: IRemovalScaffold,
  overrides: Record<string, unknown> = {},
  extra: Record<string, unknown> = {},
): IHarnessResult {
  return harness({
    name: 'removeWorktreeAfterPreservation',
    argument: {
      repoRoot: scaffold.repo,
      worktreePath: scaffold.worktreePath,
      expectedHead: scaffold.head,
      manifest: scaffold.manifestPath,
      ...overrides,
    },
    ...extra,
  });
}

/**
 * `git check-ignore` exit status for one path, measured inside `cwd`: 0 when a
 * pattern matches, 1 when none does. `git()` throws on a non-zero exit, so
 * this case needs the raw status rather than the output.
 */
const checkIgnoreStatus = (cwd: string, target: string): number | null =>
  spawnSync('git', ['check-ignore', target], { cwd, encoding: 'utf8' }).status;

const worktreeCount = (repo: string): number =>
  git(['worktree', 'list', '--porcelain'], repo)
    .split('\n')
    .filter((line) => line.startsWith('worktree ')).length;

describe('preserveRunLogs', () => {
  it('preserves every file with matching hashes and relative manifest paths', () => {
    const scaffold = preserveScaffold();
    const result = harness({
      name: 'preserveRunLogs',
      argument: scaffold.argument,
    });
    expect(result.error).toBeUndefined();
    const manifest = result.value as unknown as IManifest;
    expect(manifest.files.map((entry) => entry.file)).toEqual([
      'jest.log',
      'nested/playwright.log',
      'tsc.log',
    ]);
    expect(manifest.unit).toBe(UNIT);
    expect(manifest.date).toBe(DATE);
    expect(manifest.runDir).toBe('run');
    expect(manifest.preservedDir).toBe(`preserved/${UNIT}-${DATE}`);
    expect(manifest.bytes).toBe(LOG_BYTES);
    expect(path.isAbsolute(manifest.runDir)).toBe(false);
    expect(path.isAbsolute(manifest.preservedDir)).toBe(false);
    for (const entry of manifest.files) {
      const preserved = path.join(
        scaffold.root,
        manifest.preservedDir,
        entry.file,
      );
      expect(sha256(preserved)).toBe(entry.sha256);
      expect(sha256(path.join(scaffold.runDir, entry.file))).toBe(entry.sha256);
      expect(fs.statSync(preserved).size).toBe(entry.bytes);
    }
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(scaffold.root, 'evidence', MANIFEST_NAME),
          'utf8',
        ),
      ),
    ).toEqual(manifest);
  });

  it('refuses when a copy does not match its source, and writes no manifest', () => {
    const scaffold = preserveScaffold();
    const result = harness({
      name: 'preserveRunLogs',
      argument: scaffold.argument,
      corrupt: true,
    });
    expect(result.error?.code).toBe('COPY_HASH_MISMATCH');
    expect(result.error?.message).toContain('jest.log');
    expect(
      fs.existsSync(path.join(scaffold.root, 'evidence', MANIFEST_NAME)),
    ).toBe(false);
  });

  it('refuses an empty run directory rather than writing a vacuous manifest', () => {
    const scaffold = preserveScaffold({});
    const result = harness({
      name: 'preserveRunLogs',
      argument: scaffold.argument,
    });
    expect(result.error?.code).toBe('EMPTY_RUN_DIR');
    expect(
      fs.existsSync(path.join(scaffold.root, 'evidence', MANIFEST_NAME)),
    ).toBe(false);
  });

  it('refuses a run directory reached through a junction', () => {
    const scaffold = preserveScaffold();
    const link = path.join(scaffold.root, 'link');
    fs.symlinkSync(scaffold.runDir, link, LINK_TYPE);
    const result = harness({
      name: 'preserveRunLogs',
      argument: { ...scaffold.argument, runDir: link },
    });
    expect(result.error?.code).toBe('RUN_DIR_REPARSE');
    expect(
      fs.existsSync(path.join(scaffold.root, 'evidence', MANIFEST_NAME)),
    ).toBe(false);
  });

  it('refuses a preserved directory the manifest cannot express, before copying anything', () => {
    const scaffold = preserveScaffold();
    // `path.relative` fails to produce a relative path in exactly two shapes:
    // the two sides share no root (different drives, Windows only) or they are
    // the SAME path. Only the second has a POSIX equivalent, so that is the
    // route here - the preserved directory resolves to the repository root
    // itself, which the manifest has no relative spelling for.
    const preservedRoot = path.join(scaffold.root, 'preserved');
    const preservedDir = path.join(preservedRoot, `${UNIT}-${DATE}`);
    const result = harness({
      name: 'preserveRunLogs',
      argument: { ...scaffold.argument, preservedRoot, repoRoot: preservedDir },
    });
    expect(result.error?.code).toBe('PRESERVED_DIR_OUTSIDE_ROOT');
    // A refusal has to leave nothing behind. This assertion is the whole case:
    // the expressibility check used to run AFTER the copy loop, so the logs
    // landed at the refused location and only the manifest was withheld.
    expect(fs.existsSync(preservedDir)).toBe(false);
    expect(
      fs.existsSync(path.join(scaffold.root, 'evidence', MANIFEST_NAME)),
    ).toBe(false);
  });
});

describe('removeWorktreeAfterPreservation', () => {
  it('removes a clean matching worktree and deletes only the reparse point', () => {
    const scaffold = removalScaffold();
    const target = addNodeModulesJunction(scaffold);
    expect(worktreeCount(scaffold.repo)).toBe(2);
    // The precondition the removal half depends on, asserted rather than
    // assumed: git ignores the link, so `git status --porcelain` is empty and
    // the worktree reads clean on every platform. Without this the fixture is
    // ignored on Windows (directory junction) and untracked on POSIX
    // (symlink), and only one of the two reaches the removal.
    expect(checkIgnoreStatus(scaffold.worktreePath, 'node_modules')).toBe(0);
    const result = removal(scaffold);
    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({ junctionRemoved: true });
    // The junction target is asserted BEFORE the worktree's own disappearance:
    // a removal that resolved the link first destroys the real node_modules,
    // and that is the failure this case exists to name.
    expect(fs.readFileSync(path.join(target, 'pkg/index.js'), 'utf8')).toBe(
      'module.exports = 1;\n',
    );
    expect(fs.existsSync(scaffold.worktreePath)).toBe(false);
    expect(worktreeCount(scaffold.repo)).toBe(1);
  });

  it.each([
    [
      'the manifest is missing',
      'MANIFEST_MISSING',
      (scaffold: IRemovalScaffold) => ({
        manifest: path.join(scaffold.repo, 'evidence', 'absent.json'),
      }),
    ],
    [
      'the expected head does not match',
      'HEAD_MISMATCH',
      (scaffold: IRemovalScaffold) => ({
        expectedHead: `${scaffold.head.slice(0, 39)}${scaffold.head.endsWith('0') ? '1' : '0'}`,
      }),
    ],
  ])('refuses when %s', (_label, code, overrides) => {
    const scaffold = removalScaffold();
    const result = removal(scaffold, overrides(scaffold));
    expect(result.error?.code).toBe(code);
    expect(fs.existsSync(scaffold.worktreePath)).toBe(true);
    expect(worktreeCount(scaffold.repo)).toBe(2);
  });

  it('refuses when a preserved file no longer hashes to its manifest entry', () => {
    const scaffold = removalScaffold();
    fs.appendFileSync(
      path.join(scaffold.repo, scaffold.manifest.preservedDir, 'tsc.log'),
      'tampered',
    );
    const result = removal(scaffold);
    expect(result.error?.code).toBe('PRESERVED_HASH_MISMATCH');
    expect(result.error?.message).toContain('tsc.log');
    expect(fs.existsSync(scaffold.worktreePath)).toBe(true);
  });

  it('refuses a node_modules link the repository does not ignore', () => {
    const scaffold = removalScaffold({ ignoreNodeModules: false });
    const target = addNodeModulesJunction(scaffold);
    // No pattern matches the link, so git reports it and the helper refuses.
    // This is the rule, not an accident: the helper deletes nothing git would
    // still report, and a node_modules the repository does not ignore is a
    // different repository shape than the loop's worktrees.
    expect(checkIgnoreStatus(scaffold.worktreePath, 'node_modules')).toBe(1);
    const result = removal(scaffold);
    expect(result.error?.code).toBe('WORKTREE_DIRTY');
    expect(result.error?.message).toContain('1 uncommitted entries');
    expect(fs.existsSync(scaffold.worktreePath)).toBe(true);
    expect(worktreeCount(scaffold.repo)).toBe(2);
    expect(fs.readFileSync(path.join(target, 'pkg/index.js'), 'utf8')).toBe(
      'module.exports = 1;\n',
    );
  });

  it('refuses a dirty worktree', () => {
    const scaffold = removalScaffold();
    fs.writeFileSync(
      path.join(scaffold.worktreePath, 'dirty.txt'),
      'uncommitted\n',
    );
    const result = removal(scaffold);
    expect(result.error?.code).toBe('WORKTREE_DIRTY');
    expect(fs.existsSync(scaffold.worktreePath)).toBe(true);
  });

  it('refuses a path the repository does not list as a worktree', () => {
    const scaffold = removalScaffold();
    const result = removal(scaffold, {}, { worktreeList: '' });
    expect(result.error?.code).toBe('WORKTREE_NOT_LISTED');
    expect(fs.existsSync(scaffold.worktreePath)).toBe(true);
  });
});

describe('preserve-run-logs CLI', () => {
  // The CLI resolves its manifest path against the repository root, so its
  // scaffold lives under the repository's gitignored .sisyphus tree rather
  // than in the system temp directory (which is on another drive here, and a
  // cross-drive target is a refusal, never an absolute path in a manifest).
  let cliRoot = '';
  beforeAll(() => {
    fs.mkdirSync(path.join(repoRoot, '.sisyphus'), { recursive: true });
    cliRoot = fs.mkdtempSync(path.join(repoRoot, '.sisyphus', 'u13-pin-cli-'));
  });
  afterAll(() => {
    if (cliRoot) fs.rmSync(cliRoot, { recursive: true, force: true });
  });

  const cliArguments = (runDir: string): string[] => [
    '--run-dir',
    runDir,
    '--unit',
    UNIT,
    '--date',
    DATE,
    '--preserved-root',
    path.join(cliRoot, 'preserved'),
    '--evidence-dir',
    path.join(cliRoot, 'evidence'),
  ];

  const runCli = (
    args: string[],
  ): { status: number | null; stdout: string; stderr: string } => {
    const result = spawnSync(process.execPath, [modulePath, ...args], {
      encoding: 'utf8',
      cwd: repoRoot,
    });
    return {
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  };

  it('prints RUN_LOGS_PRESERVED with the manifest path, file count and bytes', () => {
    const runDir = path.join(cliRoot, 'run');
    writeFiles(runDir, LOGS);
    const result = runCli(cliArguments(runDir));
    const manifestRelative = path
      .relative(repoRoot, path.join(cliRoot, 'evidence', MANIFEST_NAME))
      .split(path.sep)
      .join('/');
    expect(result.stdout.trim()).toBe(
      `RUN_LOGS_PRESERVED ${manifestRelative} 3 files ${LOG_BYTES} bytes`,
    );
    expect(result.status).toBe(0);
  });

  it('prints RUN_LOGS_REFUSED and exits 1 on an empty run directory', () => {
    const runDir = path.join(cliRoot, 'empty-run');
    fs.mkdirSync(runDir, { recursive: true });
    const result = runCli(cliArguments(runDir));
    expect(result.stdout.trim()).toBe('RUN_LOGS_REFUSED EMPTY_RUN_DIR');
    expect(result.stderr).toContain(runDir);
    expect(result.status).toBe(1);
  });

  it('prints WORKTREE_REFUSED and exits 2 when the removal half refuses', () => {
    const runDir = path.join(cliRoot, 'removal-run');
    writeFiles(runDir, LOGS);
    const absent = path.join(cliRoot, 'not-a-worktree');
    const result = runCli([
      ...cliArguments(runDir),
      '--remove-worktree',
      absent,
      '--expected-head',
      '0'.repeat(40),
    ]);
    const lines = result.stdout.trim().split('\n');
    expect(lines[0]).toContain('RUN_LOGS_PRESERVED');
    expect(lines[1]).toBe('WORKTREE_REFUSED WORKTREE_MISSING');
    expect(result.status).toBe(2);
  });
});

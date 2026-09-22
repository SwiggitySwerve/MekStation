/**
 * Pins for the node_modules junction guard CLI (U12b - R6.loop-harness).
 *
 * U12 tried to make this an npm `preinstall` script and was parked on
 * FN-u12-root-preinstall-runs-after-reify: npm 11.6.2 runs the root
 * preinstall AFTER arb.reify, so the hook fires once the pruning it was
 * supposed to prevent has already happened. U12b keeps the decision and
 * throws the wiring away - the guard ships as a CLI the loop calls BEFORE it
 * runs npm, and these pins hold the CLI contract rather than a lifecycle key.
 *
 * What the pins hold: the two refusal rules (node_modules under the working
 * directory is a link; the manifest does not belong to the working
 * directory's real path), the reason words, the exit codes, and the fact
 * that nothing is swallowed - a manifest that cannot be read or parsed is a
 * refusal with its own reason word, not an allow.
 *
 * The link fixture is not the same KIND of thing on both platforms.
 * `fs.symlinkSync(target, link, 'dir')` is a real symbolic link, but this
 * Windows machine refuses every symlink type with EPERM and PowerShell's
 * `New-Item -ItemType SymbolicLink` answers "Administrator privilege
 * required", so the win32 fallback is a junction; on POSIX the 'junction'
 * type is itself an ordinary symlink, the same convention
 * scripts/__tests__/preserve-run-logs.test.ts records. Between the two
 * platforms both kinds are exercised, and on either one lstat reports a
 * symbolic link, which is the property the guard reads.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const modulePath = path.join(
  repoRoot,
  'scripts/qc/guard-node-modules-link.mjs',
);
const packagePath = path.join(repoRoot, 'package.json');
const FIXTURE_PREFIX = 'u12b-guard-';

let fixtureRoot: string;
let cwd: string;
let manifestPath: string;
let probePath: string;

beforeEach(() => {
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), FIXTURE_PREFIX));
  cwd = path.join(fixtureRoot, 'checkout');
  fs.mkdirSync(cwd);
  manifestPath = path.join(cwd, 'package.json');
  fs.writeFileSync(manifestPath, '{"name":"fixture-checkout"}');
  probePath = path.join(fixtureRoot, 'probe.mjs');
  fs.writeFileSync(
    probePath,
    `import { inspectInstallTarget } from ${JSON.stringify(pathToFileURL(modulePath).href)};
console.log(JSON.stringify(inspectInstallTarget(JSON.parse(process.argv[2]))));
`,
  );
});

afterEach(() => {
  const resolved = fs.realpathSync(fixtureRoot);
  if (
    path.dirname(resolved) !== fs.realpathSync(os.tmpdir()) ||
    !path.basename(resolved).startsWith(FIXTURE_PREFIX)
  )
    throw new Error('Refusing cleanup outside the owned temporary fixture');
  fs.rmSync(resolved, { recursive: true, force: true });
});

/** Runs the CLI with the fixture checkout as the working directory. */
function cli(args: string[] = ['--manifest', manifestPath]) {
  const result = spawnSync(process.execPath, [modulePath, ...args], {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
  });
  return {
    line: result.stdout.split(/\r?\n/)[0],
    status: result.status,
    stderr: result.stderr,
  };
}

/** Calls the exported decision function in a child process, fresh each time. */
function inspect(targetCwd = cwd, targetManifest = manifestPath) {
  const result = spawnSync(
    process.execPath,
    [
      probePath,
      JSON.stringify({ cwd: targetCwd, manifestPath: targetManifest }),
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout);
}

/**
 * Plants node_modules as a link, returning the target's real path, the link
 * type that was actually created and what lstat makes of it. See the header
 * for why the preferred type can fall back on Windows.
 */
function linkModules(preferred: 'dir' | 'junction') {
  const target = path.join(fixtureRoot, 'shared node_modules');
  if (!fs.existsSync(target)) fs.mkdirSync(target);
  const link = path.join(cwd, 'node_modules');
  let planted = preferred;
  try {
    fs.symlinkSync(target, link, preferred);
  } catch (error) {
    if (
      preferred !== 'dir' ||
      (error as NodeJS.ErrnoException).code !== 'EPERM'
    )
      throw error;
    planted = 'junction';
    fs.symlinkSync(target, link, 'junction');
  }
  return {
    target: fs.realpathSync(target),
    planted,
    isSymbolicLink: fs.lstatSync(link).isSymbolicLink(),
  };
}

/** The refusal line the CLI prints for a given reason and pair of paths. */
function refusal(reason: string, expectedPath: string, actualPath: string) {
  return `INSTALL_REFUSED ${reason} ${JSON.stringify({ expectedPath, actualPath })}`;
}

describe('node_modules junction guard CLI', () => {
  it('allows a fresh checkout that owns its manifest', () => {
    const result = cli();
    expect(result.line).toBe('INSTALL_ALLOWED');
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('allows a real node_modules directory restored from cache', () => {
    fs.mkdirSync(path.join(cwd, 'node_modules'));
    const result = cli();
    expect(result.line).toBe('INSTALL_ALLOWED');
    expect(result.status).toBe(0);
  });

  it('allows a checkout reached through a junction with a real node_modules', () => {
    fs.mkdirSync(path.join(cwd, 'node_modules'));
    const alias = path.join(fixtureRoot, 'checkout alias');
    fs.symlinkSync(cwd, alias, 'junction');
    const result = spawnSync(
      process.execPath,
      [modulePath, '--manifest', path.join(alias, 'package.json')],
      { cwd: alias, encoding: 'utf8', windowsHide: true },
    );
    expect(result.stdout.split(/\r?\n/)[0]).toBe('INSTALL_ALLOWED');
    expect(result.status).toBe(0);
  });

  it('refuses node_modules planted as a junction', () => {
    const link = linkModules('junction');
    expect(link.isSymbolicLink).toBe(true);
    const result = cli();
    expect(result.line).toBe(
      refusal(
        'node-modules-is-link',
        path.join(fs.realpathSync(cwd), 'node_modules'),
        link.target,
      ),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toBe('');
  });

  it('refuses node_modules planted as a symbolic link', () => {
    const link = linkModules('dir');
    expect(link.isSymbolicLink).toBe(true);
    const result = cli();
    expect(result.line).toBe(
      refusal(
        'node-modules-is-link',
        path.join(fs.realpathSync(cwd), 'node_modules'),
        link.target,
      ),
    );
    expect(result.status).toBe(1);
  });

  it('refuses a manifest that belongs to another root', () => {
    fs.mkdirSync(path.join(cwd, 'node_modules'));
    const otherManifest = path.join(fixtureRoot, 'package.json');
    fs.writeFileSync(otherManifest, '{"name":"another-root"}');
    const result = cli(['--manifest', otherManifest]);
    expect(result.line).toBe(
      refusal(
        'manifest-root-mismatch',
        fs.realpathSync(cwd),
        fs.realpathSync(fixtureRoot),
      ),
    );
    expect(result.status).toBe(1);
  });

  it('refuses a missing manifest instead of allowing it', () => {
    fs.rmSync(manifestPath);
    const result = cli();
    expect(result.line).toBe(
      refusal('manifest-unreadable', fs.realpathSync(cwd), manifestPath),
    );
    expect(result.status).toBe(1);
  });

  it('refuses a manifest that is not parseable JSON', () => {
    fs.writeFileSync(manifestPath, '{ this is not json');
    const result = cli();
    expect(result.line).toBe(
      refusal('manifest-unreadable', fs.realpathSync(cwd), manifestPath),
    );
    expect(result.status).toBe(1);
  });

  it('defaults to the manifest of its own repository, not of the cwd', () => {
    fs.mkdirSync(path.join(cwd, 'node_modules'));
    const result = cli([]);
    expect(result.line).toBe(
      refusal(
        'manifest-root-mismatch',
        fs.realpathSync(cwd),
        path.dirname(fs.realpathSync(packagePath)),
      ),
    );
    expect(result.status).toBe(1);
  });

  it('refuses an unknown argument rather than ignoring it', () => {
    const result = cli(['--force']);
    expect(result.line.startsWith('INSTALL_REFUSED inspection-error')).toBe(
      true,
    );
    expect(result.status).toBe(1);
  });

  it('exports the decision function the CLI prints from', () => {
    expect(inspect()).toEqual({ verdict: 'ALLOW' });
    const link = linkModules('junction');
    expect(inspect()).toEqual({
      verdict: 'REFUSE',
      reason: 'node-modules-is-link',
      expectedPath: path.join(fs.realpathSync(cwd), 'node_modules'),
      actualPath: link.target,
    });
  });

  it('exposes the guard as a qc script and wires no preinstall', () => {
    const { scripts } = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    expect(scripts['qc:guard-node-modules-link']).toBe(
      'node scripts/qc/guard-node-modules-link.mjs',
    );
    expect(scripts.preinstall).toBeUndefined();
    expect(scripts.prepare).toBe('husky');
  });
});

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modulePath = path.resolve('scripts/qc/guard-node-modules-link.mjs');
const packagePath = path.resolve('package.json');
const linkType = process.platform === 'win32' ? 'junction' : 'dir';
let fixtureRoot: string;
let cwd: string;
let manifestPath: string;
let probePath: string;

beforeEach(() => {
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'u12-install-guard-'));
  cwd = path.join(fixtureRoot, 'checkout');
  fs.mkdirSync(cwd);
  manifestPath = path.join(cwd, 'package.json');
  fs.writeFileSync(manifestPath, '{}');
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
  const tempRoot = fs.realpathSync(os.tmpdir());
  if (
    path.dirname(resolved) !== tempRoot ||
    !path.basename(resolved).startsWith('u12-install-guard-')
  )
    throw new Error('Refusing cleanup outside the owned temporary fixture');
  fs.rmSync(resolved, { recursive: true, force: true });
});

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
  expect(result.stderr).toBe('');
  return JSON.parse(result.stdout);
}

function linkModules() {
  const target = path.join(fixtureRoot, 'shared node_modules');
  fs.mkdirSync(target);
  fs.symlinkSync(target, path.join(cwd, 'node_modules'), linkType);
  return fs.realpathSync(target);
}

function cli(args = ['--manifest', manifestPath]) {
  return spawnSync(process.execPath, [modulePath, ...args], {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
  });
}

describe('install target realpath guard', () => {
  it('allows absent node_modules in a fresh checkout', () => {
    expect(inspect()).toEqual({ verdict: 'ALLOW' });
  });

  it('allows a real node_modules directory restored from cache', () => {
    fs.mkdirSync(path.join(cwd, 'node_modules'));
    expect(inspect()).toEqual({ verdict: 'ALLOW' });
  });

  it('refuses linked node_modules and reports both real paths', () => {
    const actualPath = linkModules();
    expect(inspect()).toEqual({
      verdict: 'REFUSE',
      reason: 'node-modules-is-link',
      expectedPath: path.join(fs.realpathSync(cwd), 'node_modules'),
      actualPath,
    });
  });

  it('allows cwd reached through a junction with local node_modules', () => {
    fs.mkdirSync(path.join(cwd, 'node_modules'));
    const alias = path.join(fixtureRoot, 'checkout alias');
    fs.symlinkSync(cwd, alias, linkType);
    expect(inspect(alias, path.join(alias, 'package.json'))).toEqual({
      verdict: 'ALLOW',
    });
  });

  it('refuses a manifest in a different real directory', () => {
    fs.mkdirSync(path.join(cwd, 'node_modules'));
    const otherManifest = path.join(fixtureRoot, 'package.json');
    fs.writeFileSync(otherManifest, '{}');
    expect(inspect(cwd, otherManifest)).toEqual({
      verdict: 'REFUSE',
      reason: 'manifest-outside-cwd',
      expectedPath: fs.realpathSync(cwd),
      actualPath: fs.realpathSync(fixtureRoot),
    });
  });

  it('CLI prints INSTALL_ALLOWED and exits zero', () => {
    const result = cli();
    expect(result.stdout.split(/\r?\n/)[0]).toBe('INSTALL_ALLOWED');
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('CLI refuses linked node_modules with paths and exits one', () => {
    const actualPath = linkModules();
    const result = cli();
    expect(result.stdout.split(/\r?\n/)[0]).toBe(
      `INSTALL_REFUSED node-modules-is-link ${JSON.stringify({
        expectedPath: path.join(fs.realpathSync(cwd), 'node_modules'),
        actualPath,
      })}`,
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toBe('');
  });

  it('CLI defaults to the manifest beside its own repository, not cwd', () => {
    fs.mkdirSync(path.join(cwd, 'node_modules'));
    const result = cli([]);
    expect(result.stdout.split(/\r?\n/)[0]).toBe(
      `INSTALL_REFUSED manifest-outside-cwd ${JSON.stringify({
        expectedPath: fs.realpathSync(cwd),
        actualPath: path.dirname(fs.realpathSync(packagePath)),
      })}`,
    );
    expect(result.status).toBe(1);
  });

  it('wires preinstall to the exact guard command', () => {
    const { scripts } = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    expect(scripts.preinstall).toBe(
      'node scripts/qc/guard-node-modules-link.mjs',
    );
  });

  it('keeps only the pre-existing postinstall failure suppression', () => {
    const { scripts } = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    expect(scripts.postinstall).toBe(
      'node scripts/mm-data/check-assets.js || true',
    );
    expect(
      Object.entries(scripts).filter(([, command]) =>
        String(command).includes('|| true'),
      ),
    ).toEqual([
      ['postinstall', 'node scripts/mm-data/check-assets.js || true'],
    ]);
    expect(scripts.prepare).toBe('husky');
  });
});

import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const repoRoot = path.resolve(__dirname, '..', '..');
const NODE = process.execPath;
const MODULE_PATH = path.join(repoRoot, 'scripts/next/native-bindings.mjs');
const SKIP_ENV = 'MEKSTATION_FIXTURE_SKIP_NATIVE_LOAD_CHECK';
const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function makeImage(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mekstation-native-'));
  tempRoots.push(root);
  for (const [relative, contents] of Object.entries(files)) {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }
  return root;
}

function runCheck(image: string) {
  return spawnSync(NODE, [MODULE_PATH, image], {
    encoding: 'utf8',
    env: { ...process.env, [SKIP_ENV]: '' },
  });
}

describe('native binding load check (PARITY-PLAN 1.0.53)', () => {
  it('fails naming a binding that cannot load', () => {
    const image = makeImage({
      'node_modules/@img/sharp-fixture/lib/sharp-fixture.node':
        'not a loadable binary',
      'node_modules/plain/index.js': 'module.exports = 1;',
    });
    const result = runCheck(image);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Native bindings that cannot load');
    expect(result.stderr).toContain(
      path.join('node_modules/@img/sharp-fixture/lib/sharp-fixture.node'),
    );
  });

  it('passes an image whose bindings all load', () => {
    const image = makeImage({ 'node_modules/plain/index.js': '' });
    const result = runCheck(image);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('native bindings load: 0');
  });

  it('keeps the fixture-only skip out of workflows and package scripts', () => {
    const workflows = path.join(repoRoot, '.github');
    const offenders: string[] = [];
    function visit(directory: string): void {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(file);
        else if (fs.readFileSync(file, 'utf8').includes(SKIP_ENV))
          offenders.push(path.relative(repoRoot, file));
      }
    }
    visit(workflows);
    for (const manifest of ['package.json', 'desktop/package.json']) {
      if (
        fs
          .readFileSync(path.join(repoRoot, manifest), 'utf8')
          .includes(SKIP_ENV)
      )
        offenders.push(manifest);
    }
    expect(offenders).toEqual([]);
  });
});

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = process.cwd();
const SCRIPT_PATH = path.resolve(
  REPO_ROOT,
  'scripts/print-combat-validation-gaps.ts',
);
const PACKAGE_PATH = path.resolve(REPO_ROOT, 'package.json');
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function runCombatGapInventory(args: string[]) {
  return spawnSync(NPX, ['tsx', SCRIPT_PATH, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    shell: process.platform === 'win32',
  });
}

describe('combat validation gap inventory gate', () => {
  jest.setTimeout(60_000);

  it('passes when unresolved combat gaps match the committed zero baseline', () => {
    const result = runCombatGapInventory([
      '--format=summary',
      '--expect-total=0',
    ]);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ total: 0 });
  });

  it('fails loudly when unresolved combat gaps drift from the expected total', () => {
    const result = runCombatGapInventory([
      '--format=summary',
      '--expect-total=1',
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'Unresolved gap inventory baseline mismatch',
    );
    expect(result.stderr).toContain('total expected 1, received 0');
  });

  it('wires the zero-gap invariant into the rules verification command', () => {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf-8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['verify:rules']).toContain(
      'validate:combat:gaps -- --format=summary --expect-total=0',
    );
  });
});

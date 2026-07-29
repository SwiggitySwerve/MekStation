import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');
const validatorPath = path.join(
  repoRoot,
  'scripts/qc/audit-combat-determinism.mjs',
);
const gitBin = process.platform === 'win32' ? 'git.exe' : 'git';

function fixtureRepo(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  execFileSync(gitBin, ['init', '--quiet', root], { stdio: 'ignore' });
  return root;
}

function writeFixture(
  root: string,
  relativePath: string,
  contents: string,
): void {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
  execFileSync(gitBin, ['-C', root, 'add', '--', relativePath], {
    stdio: 'ignore',
  });
}

function runValidator(root: string, ...args: string[]) {
  return spawnSync(process.execPath, [validatorPath, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

describe('combat determinism CI audit', () => {
  const fixtureRoots: string[] = [];

  afterEach(() => {
    for (const root of fixtureRoots) {
      fs.rmSync(root, { force: true, recursive: true });
    }
    fixtureRoots.length = 0;
  });

  it('fails closed when the scanner cannot be invoked', () => {
    const root = fixtureRepo('mekstation-determinism-missing-scanner-');
    fixtureRoots.push(root);
    const result = runValidator(
      root,
      '--git-bin',
      path.join(root, 'missing-git'),
    );

    expect(result.status).toBe(2);
    expect(`${result.stdout}${result.stderr}`).toContain(
      'could not invoke git',
    );
  });

  it('passes an allowlisted Math.random seam', () => {
    const root = fixtureRepo('mekstation-determinism-allowlisted-');
    fixtureRoots.push(root);
    writeFixture(
      root,
      'src/utils/gameplay/diceTypes.ts',
      'export const defaultRoll = () => Math.random();\n',
    );

    const result = runValidator(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Determinism audit passed');
  });

  it('fails on an injected non-allowlisted Math.random call', () => {
    const root = fixtureRepo('mekstation-determinism-forbidden-');
    fixtureRoots.push(root);
    writeFixture(
      root,
      'src/simulation/InjectedEntropy.ts',
      'export const entropy = () => Math.random();\n',
    );

    const result = runValidator(root);

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain(
      'src/simulation/InjectedEntropy.ts:1:export const entropy = () => Math.random();',
    );
    expect(`${result.stdout}${result.stderr}`).toContain(
      'outside the defaultD6Roller seam',
    );
  });

  it('does not hide executable entropy before a trailing comment', () => {
    const root = fixtureRepo('mekstation-determinism-trailing-comment-');
    fixtureRoots.push(root);
    writeFixture(
      root,
      'src/simulation/TrailingCommentEntropy.ts',
      'export const entropy = () => Math.random(); // Math.random is forbidden\n',
    );

    const result = runValidator(root);

    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain(
      'src/simulation/TrailingCommentEntropy.ts:1:',
    );
  });
});

import * as fs from 'node:fs';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '../../..');

/** The scripts/lib files the pre-commit hook runs (scripts/lib/hook-scripts.json). */
export function hookScripts(): string[] {
  const list = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, 'scripts/lib/hook-scripts.json'),
      'utf8',
    ),
  ) as { scripts: string[] };
  return list.scripts;
}

/** Copies every hook script into a fixture repository's scripts/lib. */
export function copyHookScripts(fixtureRoot: string): void {
  fs.mkdirSync(path.join(fixtureRoot, 'scripts/lib'), { recursive: true });
  for (const script of hookScripts())
    fs.copyFileSync(
      path.join(repoRoot, 'scripts/lib', script),
      path.join(fixtureRoot, 'scripts/lib', script),
    );
}

/** Makes the tree under test's installed lint-staged available to the hook. */
export function linkLintStaged(fixtureRoot: string): void {
  fs.mkdirSync(path.join(fixtureRoot, 'node_modules'), { recursive: true });
  fs.symlinkSync(
    path.join(repoRoot, 'node_modules/lint-staged'),
    path.join(fixtureRoot, 'node_modules/lint-staged'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
}

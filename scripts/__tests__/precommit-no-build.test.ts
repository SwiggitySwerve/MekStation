import * as fs from 'node:fs';
import * as path from 'node:path';

// Pins owner decision OD-precommit-drop-full-build: .husky/pre-commit runs no
// production build, and the lint-staged run it keeps still ends its
// *.{ts,tsx} list with the whole-project `tsc --noEmit` type check.
const repoRoot = path.resolve(__dirname, '../..');
const hookPath = path.join(repoRoot, '.husky', 'pre-commit');
const packagePath = path.join(repoRoot, 'package.json');
const TSC_ENTRY = "bash -c 'npx tsc --noEmit --skipLibCheck'";

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

  it('keeps `npx lint-staged`, whose *.{ts,tsx} list ends with the whole-project tsc --noEmit', () => {
    expect(
      hookCommandLines().some((line) => /^\d+: npx lint-staged$/.test(line)),
    ).toBe(true);
    const lintStaged = JSON.parse(fs.readFileSync(packagePath, 'utf8'))[
      'lint-staged'
    ];
    expect(lintStaged['*.{ts,tsx}'].at(-1)).toBe(TSC_ENTRY);
  });
});

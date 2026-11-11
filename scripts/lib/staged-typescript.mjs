import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Tells the pre-commit hook whether a .ts or .tsx file is staged (added,
// copied, modified or renamed): it prints `yes` or `no`.
//
// It reads git's NUL-delimited path list. With line output git quotes unusual
// names (non-ASCII, tab, newline, quote), so `src/café.ts` arrived as
// `"src/caf\303\251.ts"` and a `\.ts$` test missed it. A git failure is
// reported and exits non-zero instead of reading as "no TypeScript".

export const TYPESCRIPT_PATH = /\.(ts|tsx)$/;

/** True when the NUL-delimited path list names a .ts or .tsx file. */
export function stagesTypeScript(nulDelimitedPaths) {
  return nulDelimitedPaths
    .split('\0')
    .some((file) => TYPESCRIPT_PATH.test(file));
}

function main() {
  const result = spawnSync(
    'git',
    ['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'],
    { encoding: 'utf8' },
  );
  if (result.error || result.status !== 0) {
    const reason = result.error?.message ?? result.stderr.trim();
    process.stderr.write(`staged-typescript: git diff failed: ${reason}\n`);
    process.exit(result.status || 1);
  }
  process.stdout.write(stagesTypeScript(result.stdout) ? 'yes' : 'no');
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();

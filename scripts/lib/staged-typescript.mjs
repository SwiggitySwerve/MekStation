import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Tells the pre-commit hook whether a .ts or .tsx file is staged (added,
// copied, modified or renamed): it prints exactly `yes` or `no`. The hook
// accepts only those two answers, so any other outcome (no output, an error)
// refuses the commit instead of skipping the typecheck.
//
// It reads git's NUL-delimited path list. With line output git quotes unusual
// names (non-ASCII, tab, newline, quote), so `src/café.ts` arrived as
// `"src/caf\303\251.ts"` and a `\.ts$` test missed it. A git failure is
// reported and exits non-zero.

export const TYPESCRIPT_PATH = /\.(ts|tsx)$/;

// The same output limit as the hook's other git readers: a bulk data commit
// can stage a path list far larger than spawnSync's 1 MiB default.
export const GIT_MAX_BUFFER = 16 * 1024 * 1024;

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
    { encoding: 'utf8', maxBuffer: GIT_MAX_BUFFER },
  );
  if (result.error || result.status !== 0) {
    const reason = result.error?.message ?? result.stderr.trim();
    process.stderr.write(`staged-typescript: git diff failed: ${reason}\n`);
    process.exit(result.status || 1);
  }
  process.stdout.write(stagesTypeScript(result.stdout) ? 'yes' : 'no');
}

// Run when launched directly. Compare canonical paths: Node resolves symlinks
// for import.meta.url, so a lexical comparison fails for a symlinked launch.
function launchedDirectly() {
  if (!process.argv[1]) return false;
  try {
    return (
      realpathSync(process.argv[1]) ===
      realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

if (launchedDirectly()) main();

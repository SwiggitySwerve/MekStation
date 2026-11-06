import { execFileSync, spawnSync } from 'node:child_process';
import { posix } from 'node:path';

// lint-staged can return success after its Git restaging task fails. Check
// the parent policy independently without staging any partially staged bytes.
const files = execFileSync(
  'git',
  ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
)
  .split('\0')
  .filter(Boolean);
const parents = new Set();
for (const file of files) {
  for (let dir = posix.dirname(file); dir !== '.'; dir = posix.dirname(dir)) {
    parents.add(dir);
  }
}
if (parents.size) {
  const result = spawnSync(
    'git',
    ['check-ignore', '--no-index', '--verbose', '-z', '--stdin'],
    {
      encoding: 'utf8',
      input: [...parents].join('\0') + '\0',
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (![0, 1].includes(result.status))
    throw result.error ?? new Error(result.stderr);
  const fields = result.stdout.split('\0');
  const ignored = [];
  for (let i = 0; i + 3 < fields.length; i += 4) {
    if (!fields[i + 2].startsWith('!')) ignored.push(fields[i + 3]);
  }
  if (ignored.length) {
    process.stderr.write(
      `Cannot commit: staged files have ignored parents:\n${ignored.join('\n')}\n`,
    );
    process.exitCode = 1;
  }
}

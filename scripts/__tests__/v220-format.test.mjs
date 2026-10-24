import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

test('committed owner page passes --check after the repository formatter', () => {
  const run = (args) => execFileSync(process.execPath, args, { stdio: 'pipe' });
  const check = ['scripts/qc/generate-v220-steps.mjs', '--check'];
  run(check);
  // Honor .prettierignore's existing openspec/ exclusion, just as the hook does.
  run([
    'node_modules/oxfmt/bin/oxfmt',
    '--write',
    '--no-error-on-unmatched-pattern',
    'openspec/planning/2026-09-12-roadmap-completion/V2.2.0-STEPS.md',
  ]);
  run(check);
});

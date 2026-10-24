import { execFileSync } from 'node:child_process';
// Read-only in-flight observations never alter the committed view or admit work.
import fs from 'node:fs';
import path from 'node:path';

import { directory, requireThat } from './v220-evidence.mjs';

export function observe(specs, root, run = execFileSync) {
  const unknown = 'UNKNOWN - DO NOT SELECT';
  try {
    const call = (command, argv) =>
      run(command, argv, { cwd: root, encoding: 'utf8' }).trim();
    const git = (cwd, ...args) =>
      call('git', ['--no-optional-locks', '-C', cwd, ...args]);
    const fields = 'number,headRefName,headRefOid,url,reviewDecision';
    const prs = JSON.parse(
      call('gh', [
        'pr',
        'list',
        '--state=open',
        '--limit=1000',
        '--json=' + fields,
      ]),
    );
    requireThat(
      specs.length > 0,
      'Explicit unit=branch=worktree observations required',
    );
    const mainSha = git(root, 'rev-parse', 'origin/main');
    return (
      `Observed main ${mainSha}\n` +
      specs
        .map((spec) => {
          const [unit, branch, worktree] = spec.split('=');
          const head = git(worktree, 'rev-parse', 'HEAD');
          const actual = git(worktree, 'branch', '--show-current');
          const local = JSON.parse(
            fs.readFileSync(path.join(worktree, directory, 'units.json')),
          ).units.find((u) => u.id === unit);
          const dirt = git(
            worktree,
            'status',
            '--porcelain',
            '--untracked-files=no',
          );
          const receipt = local?.stageReceipts?.local;
          const missingReceipt =
            local?.state !== 'blocked' &&
            (!receipt?.path ||
              !fs.existsSync(path.join(worktree, directory, receipt.path)));
          const pr = prs.filter((p) => p.headRefName === branch);
          const conflict =
            dirt ||
            missingReceipt ||
            actual !== branch ||
            !local ||
            pr.length > 1 ||
            (local?.state === 'review-required' && !pr.length) ||
            (pr[0] && pr[0].headRefOid !== head);
          return `${unit}: ${conflict ? unknown : `branch ${branch}; head ${head}; local ${local.state}; PR ${pr[0] ? `#${pr[0].number} ${pr[0].headRefOid}; open; review ${pr[0].reviewDecision || 'pending'}` : 'none'}`}`;
        })
        .join('\n')
    );
  } catch (error) {
    return `${unknown}: ${error.message}`;
  }
}

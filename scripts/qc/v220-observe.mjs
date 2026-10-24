import { execFileSync } from 'node:child_process';
// Read-only in-flight observations never alter the committed view or admit work.
import fs from 'node:fs';
import path from 'node:path';

import { directory, requireThat } from './v220-evidence.mjs';

export function observe(specs, root, run = execFileSync) {
  const unknown = 'UNKNOWN - DO NOT SELECT';
  try {
    const prs = JSON.parse(
      run(
        'gh',
        [
          'pr',
          'list',
          '--state',
          'open',
          '--limit',
          '1000',
          '--json',
          'number,headRefName,headRefOid,url',
        ],
        { cwd: root, encoding: 'utf8' },
      ),
    );
    requireThat(
      specs.length > 0,
      'Explicit unit=branch=worktree observations required',
    );
    const mainSha = run('git', ['rev-parse', 'origin/main'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    return (
      `Observed main ${mainSha}\n` +
      specs
        .map((spec) => {
          const [unit, branch, worktree] = spec.split('=');
          const head = run('git', ['-C', worktree, 'rev-parse', 'HEAD'], {
            encoding: 'utf8',
          }).trim();
          const actual = run(
            'git',
            ['-C', worktree, 'branch', '--show-current'],
            { encoding: 'utf8' },
          ).trim();
          const local = JSON.parse(
            fs.readFileSync(path.join(worktree, directory, 'units.json')),
          ).units.find((u) => u.id === unit);
          const dirt = run(
            'git',
            ['-C', worktree, 'status', '--porcelain', '--untracked-files=no'],
            { encoding: 'utf8' },
          ).trim();
          const receipt = local?.stageReceipts?.local;
          const missingReceipt =
            !['planned', 'blocked'].includes(local?.state) &&
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
          return `${unit}: ${conflict ? unknown : `branch ${branch}; head ${head}; local ${local.state}; PR ${pr[0] ? `#${pr[0].number} ${pr[0].headRefOid}` : 'none'}`}`;
        })
        .join('\n')
    );
  } catch (error) {
    return `${unknown}: ${error.message}`;
  }
}

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { SH_NOT_FOUND, spawnHookShell } from './support/spawn-hook-shell';

// The pre-commit hook suites spawn `sh`. Started from PowerShell on Windows,
// Git's usr/bin is not on PATH, spawnSync returns a null status, and the hook
// never runs (2026-11-11: two suites failed on clean main with a missing trace
// log and a null status). The helper turns that into a plain message.
describe('pre-commit hook test shell', () => {
  it('fails with a plain message when sh is not on PATH', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'no-sh-'));
    try {
      expect(() =>
        spawnHookShell(['-c', 'exit 0'], {
          encoding: 'utf8',
          env: { PATH: empty },
        }),
      ).toThrow(SH_NOT_FOUND);
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  });

  it('passes the exit status through when sh is on PATH', () => {
    expect(spawnHookShell(['-c', 'exit 7'], { encoding: 'utf8' }).status).toBe(
      7,
    );
  });
});

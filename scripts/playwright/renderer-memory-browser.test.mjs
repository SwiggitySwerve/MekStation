import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { writeBrowserWrapper } from './renderer-memory-browser.mjs';
import { parseKernelReceipt } from './renderer-memory.mjs';

test('wrapper requires absolute owned output and executable paths', () => {
  assert.throws(() =>
    writeBrowserWrapper({ root: 'relative', binary: '/browser' }),
  );
  assert.throws(() =>
    writeBrowserWrapper({ root: '/capture', binary: 'relative' }),
  );
});

test(
  'GNU time wrapper forwards literal arguments, stderr and nonzero browser exit',
  { skip: process.platform !== 'linux' },
  () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "browser-rusage-'"));
    try {
      const target = path.join(root, 'fake-browser');
      const argsFile = path.join(root, 'argv');
      const quote = (text) => "'" + text.replaceAll("'", "'\\''") + "'";
      fs.writeFileSync(
        target,
        `#!/bin/sh\nprintf '%s\\0' "$@" > ${quote(argsFile)}\nprintf 'native failure retained\\n' >&2\nexit 11\n`,
        { mode: 0o755 },
      );
      const wrapper = writeBrowserWrapper({ root, binary: target });
      const args = [
        'a b',
        '$(must-not-execute)',
        'semi;literal',
        'quote"literal',
      ];
      const child = spawnSync(wrapper, args, {
        env: { ...process.env, MEKSTATION_E2E_MEMORY_SUITE: 'probe' },
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 10000,
      });
      assert.equal(child.status, 11, child.stderr.toString());
      assert.match(child.stderr.toString(), /native failure retained/);
      assert.deepEqual(
        fs.readFileSync(argsFile, 'utf8').split('\0').slice(0, -1),
        args,
      );
      const file = path.join(root, 'kernel', `probe-${child.pid}.jsonl`);
      assert.equal(
        parseKernelReceipt(fs.readFileSync(file, 'utf8')).exitStatus,
        11,
      );
    } finally {
      assert.ok(root.startsWith(path.resolve(os.tmpdir()) + path.sep));
      fs.rmSync(root, { recursive: true, force: true });
    }
  },
);

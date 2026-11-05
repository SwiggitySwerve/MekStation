import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { start, wait } from './background-step.mjs';

const hasBash = (() => {
  try {
    execFileSync('bash', ['-c', 'true']);
    return true;
  } catch {
    return false;
  }
})();
const bashTest = hasBash ? test : test.skip;
const script = fileURLToPath(new URL('./background-step.mjs', import.meta.url));

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bg-step-'));
const sink = () => {
  let text = '';
  return { write: (chunk) => (text += chunk), text: () => text };
};

bashTest('a passing check reports its output and exit code 0', async () => {
  const dir = tmp();
  start('ok', 'echo hello; echo oops >&2', { dir });
  const out = sink();
  assert.equal(await wait('ok', { dir, out, pollMs: 20 }), 0);
  assert.match(out.text(), /hello/);
  assert.match(out.text(), /oops/);
});

bashTest('a failing check fails its wait with the same exit code', async () => {
  const dir = tmp();
  start('bad', 'echo broken; exit 3', { dir });
  const out = sink();
  assert.equal(await wait('bad', { dir, out, pollMs: 20 }), 3);
  assert.match(out.text(), /broken/);
});

test('a check that was never started fails its wait', async () => {
  const dir = tmp();
  const out = sink();
  assert.equal(await wait('missing', { dir, out, pollMs: 20 }), 1);
  assert.match(out.text(), /never started/);
});

bashTest('a check that does not finish in time fails its wait', async () => {
  const dir = tmp();
  start('slow', 'echo begun; sleep 30', { dir });
  const out = sink();
  assert.equal(
    await wait('slow', { dir, out, pollMs: 20, timeoutSeconds: 1 }),
    1,
  );
  assert.match(out.text(), /did not finish in 1 s/);
});

bashTest(
  '--after runs a check only after the first finished, even if it failed',
  async () => {
    const dir = tmp();
    const marker = path.join(dir, 'order.txt');
    start('first', `sleep 1; echo first >> '${marker}'; exit 5`, { dir });
    start('second', `echo second >> '${marker}'`, { dir, after: 'first' });
    assert.equal(await wait('second', { dir, out: sink(), pollMs: 20 }), 0);
    assert.equal(await wait('first', { dir, out: sink(), pollMs: 20 }), 5);
    assert.deepEqual(fs.readFileSync(marker, 'utf8').trim().split('\n'), [
      'first',
      'second',
    ]);
  },
);

test('a name cannot be started twice or contain path characters', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'twice.started'), 'x');
  assert.throws(() => start('twice', 'true', { dir }), /already started/);
  assert.throws(() => start('../x', 'true', { dir }), /Invalid/);
});

bashTest(
  'the CLI starts in the background and its wait exits with the check code',
  () => {
    const dir = tmp();
    const env = { ...process.env, BACKGROUND_STEP_DIR: dir };
    execFileSync(
      process.execPath,
      [script, 'start', 'cli', '--', 'echo from-cli;', 'exit', '4'],
      { env },
    );
    let status = 0;
    let stdout = '';
    try {
      stdout = execFileSync(process.execPath, [script, 'wait', 'cli'], {
        env,
        encoding: 'utf8',
      });
    } catch (error) {
      status = error.status;
      stdout = String(error.stdout);
    }
    assert.equal(status, 4);
    assert.match(stdout, /from-cli/);
  },
);

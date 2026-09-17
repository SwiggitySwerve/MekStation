import { spawnSync } from 'node:child_process';
import path from 'node:path';

const fixture = path.resolve('scripts/__tests__/machine-idle.fixture.mjs');
const row = (
  ProcessId: number,
  CommandLine: string | null,
  Name = 'node.exe',
  ParentProcessId = 1,
) => ({ ProcessId, ParentProcessId, Name, CommandLine });
const quiet = row(1, null, 'System');
const build = row(
  10,
  'node "E:/Projects/MekStation/node_modules/next/dist/bin/next" build',
);
const server = row(
  11,
  'node "E:/Projects/MekStation/.next/standalone/server.js"',
);
const runner = row(12, 'node scripts/playwright/run-playwright.mjs test');

function run(input: object) {
  return spawnSync(process.execPath, [fixture], {
    input: JSON.stringify(input),
    encoding: 'utf8',
  });
}
function probe(input: object) {
  const result = run(input);
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout);
}
function pids(snapshot: object[], ownPids: number[] = []) {
  return probe({ snapshot, options: { ownPids } }).value.map(
    (entry: { ProcessId: number }) => entry.ProcessId,
  );
}

describe('machine idle process boundary', () => {
  beforeAll(() => {
    probe({ snapshot: [quiet] });
  });

  it.each([
    ['Next build', build],
    ['Next start', row(10, 'node node_modules/next/dist/bin/next start')],
    ['Next image', row(10, 'next-server (v16.0.0)', 'next-server')],
    ['standalone server', server],
    ['repository server', row(10, 'node server.js')],
    [
      'absolute repository server',
      row(10, 'node "E:/Projects/MekStation/server.js"'),
    ],
    [
      'linked worktree server',
      row(10, 'node "E:/Projects/MekStation-worktrees/lane/server.js"'),
    ],
    [
      'quoted Windows path',
      row(
        10,
        '"C:\\Program Files\\nodejs\\node.exe" "E:\\Projects\\MekStation\\.next\\standalone\\server.js"',
      ),
    ],
    [
      'node flags',
      row(
        10,
        'node --require setup.cjs --max-old-space-size=4096 node_modules/next/dist/bin/next build',
      ),
    ],
    [
      'Playwright CLI',
      row(10, 'node node_modules/@playwright/test/cli.js test'),
    ],
    ['Playwright wrapper', runner],
  ])('recognizes %s', (_label, processRow) => {
    expect(pids([processRow as ReturnType<typeof row>])).toEqual([
      (processRow as ReturnType<typeof row>).ProcessId,
    ]);
  });

  it('recognizes a relaunching server and its child', () => {
    expect(
      pids([
        row(20, 'node scripts/e2e/relaunching-server.mjs'),
        row(21, 'node server.js', 'node.exe', 20),
      ]),
    ).toEqual([20, 21]);
  });
  it('recognizes Playwright browser children and descendants regardless of snapshot order', () => {
    expect(
      pids([
        row(15, 'chrome --type=renderer', 'chrome.exe', 14),
        row(14, 'chrome --headless', 'chrome.exe', 12),
        runner,
      ]),
    ).toEqual([15, 14, 12]);
  });
  it('recognizes an orphaned Playwright headless browser by executable path or profile flags', () => {
    expect(
      pids([
        row(
          20,
          '"C:/cache/ms-playwright/chromium-123/chrome.exe" --headless',
          'chrome.exe',
        ),
        row(
          21,
          'chrome-headless-shell --remote-debugging-pipe --user-data-dir=/tmp/playwright_chromiumdev_profile-abc',
          'chrome-headless-shell',
        ),
      ]),
    ).toEqual([20, 21]);
  });
  it('ignores cursor-agent quoting a charter containing next build and server.js', () => {
    expect(
      pids([
        row(30, 'node cursor-agent -p "Run next build then node server.js"'),
      ]),
    ).toEqual([]);
  });
  it.each(['codex', 'grok'])('ignores %s command lines', (agent) => {
    expect(pids([row(30, `node ${agent} "next build"`)])).toEqual([]);
  });
  it('ignores external MCP server.js, ordinary Chrome, quoted prose and wrong images', () => {
    expect(
      pids([
        row(30, 'node E:\\Projects\\mcp-astrabit-jira\\server.js'),
        row(31, 'chrome --headless', 'chrome.exe'),
        row(32, 'node worker.js "next build" "server.js"'),
        row(33, 'python next build', 'python.exe'),
        row(34, 'node -e "next build"'),
        row(35, 'node node_modules/next/dist/bin/next telemetry'),
      ]),
    ).toEqual([]);
  });
  it('excludes only own pids while retaining foreign servers and browser descendants', () => {
    expect(
      pids(
        [server, build, runner, row(14, 'chromium --headless', 'chromium', 12)],
        [11, 12],
      ),
    ).toEqual([10, 14]);
  });
  it('terminates on cyclic parent ids without inventing Playwright ancestry', () => {
    expect(
      pids([
        row(30, 'chrome --headless', 'chrome.exe', 31),
        row(31, 'chrome --headless', 'chrome.exe', 30),
      ]),
    ).toEqual([]);
  });
  it.each([[], [{}], 'garbage', null])(
    'throws a typed error for empty/unparseable snapshot %j',
    (snapshot) => {
      expect(probe({ snapshot }).error).toEqual({
        name: 'MachineSnapshotError',
        code: 'SNAPSHOT_UNAVAILABLE',
      });
    },
  );
  it('parses the native snapshot and requests the required process fields', () => {
    const result = probe({ action: 'snapshot', outputs: [{ rows: [build] }] });
    expect(result.value).toEqual([build]);
    expect(result.commands[0].command).toBe(
      process.platform === 'win32' ? 'powershell.exe' : 'ps',
    );
    if (process.platform === 'win32') {
      expect(result.commands[0].args.join(' ')).toContain(
        'Get-CimInstance Win32_Process',
      );
      for (const field of [
        'ProcessId',
        'ParentProcessId',
        'Name',
        'CommandLine',
      ])
        expect(result.commands[0].args.join(' ')).toContain(field);
    } else
      expect(result.commands[0].args).toEqual(['-eo', 'pid,ppid,comm,args']);
  });
  it.each([
    { error: 'tool missing' },
    { raw: '' },
    { raw: 'not JSON' },
    { rows: [] },
    { rows: [{}] },
  ])('fails closed when enumeration fails: %j', (output) => {
    expect(probe({ action: 'snapshot', outputs: [output] }).error).toEqual({
      name: 'MachineSnapshotError',
      code: 'SNAPSHOT_UNAVAILABLE',
    });
  });
  it('polls busy then idle and reports the busy rows', () => {
    const result = probe({
      action: 'wait',
      outputs: [{ rows: [build] }, { rows: [quiet] }],
      options: { pollMs: 1, timeoutMs: 500 },
    });
    expect(result.value).toEqual([]);
    expect(result.calls).toBe(2);
    expect(result.logs[0]).toEqual([build]);
  });
  it('passes own pids to each poll', () => {
    expect(
      probe({
        action: 'wait',
        outputs: [{ rows: [server] }],
        options: { ownPids: [11], timeoutMs: 0 },
      }).value,
    ).toEqual([]);
  });
  it('rejects on timeout with the current busy list', () => {
    expect(
      probe({
        action: 'wait',
        outputs: [{ rows: [build] }],
        options: { timeoutMs: 0 },
      }).error,
    ).toEqual({
      name: 'MachineBusyError',
      code: 'MACHINE_BUSY',
      busy: [build],
    });
  });
  it('propagates enumeration failure while waiting', () => {
    expect(
      probe({ action: 'wait', outputs: [{ error: 'missing' }] }).error.code,
    ).toBe('SNAPSHOT_UNAVAILABLE');
  });
  it.each([
    [[], [quiet], 0, 'MACHINE_IDLE'],
    [[], [build], 1, 'MACHINE_BUSY 1'],
    [
      ['--own-pid', '10', '--own-pid', '11'],
      [build, server],
      0,
      'MACHINE_IDLE',
    ],
    [['--wait', '--timeout-ms', '0'], [build], 1, 'MACHINE_BUSY 1'],
  ])('CLI %j emits the status and exit code', (args, rows, status, output) => {
    const result = run({ action: 'cli', args, outputs: [{ rows }] });
    expect(result.status).toBe(status);
    expect(result.stdout.split('\n')[0]).toBe(output);
    if (status === 1) expect(result.stdout).toContain('next/dist/bin/next');
  });
  it.each([['--timeout-ms', '-1'], ['--own-pid'], ['--unknown']])(
    'rejects invalid CLI arguments %j',
    (...args) => {
      const result = run({ action: 'cli', args, outputs: [{ rows: [quiet] }] });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('INVALID_ARGUMENT');
      expect(result.stdout).not.toContain('MACHINE_IDLE');
    },
  );
  it('CLI never announces idle on enumeration failure', () => {
    const result = run({ action: 'cli', outputs: [{ error: 'missing' }] });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SNAPSHOT_UNAVAILABLE');
    expect(result.stdout).not.toContain('MACHINE_IDLE');
  });
});

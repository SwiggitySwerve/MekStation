import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const root = process.cwd();
const invoke = (action: string, args: unknown[] = []) => {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import * as check from './scripts/qc/tsrs-side-check.mjs';
    import fs from 'node:fs';
    import childProcess from 'node:child_process';
    import crypto from 'node:crypto';
    import { syncBuiltinESMExports } from 'node:module';
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    const { action, args } = JSON.parse(input);
    let result;
    if (action === 'reportError' || action === 'simulateTimeout') {
      const read = fs.readFileSync;
      const remove = fs.rmSync;
      const write = process.stdout.write;
      let stdout = '';
      const timeouts = [];
      process.stdout.write = (text) => { stdout += text; return true; };
      if (action === 'reportError') fs.readFileSync = () => { throw new Error(args[0]); };
      else {
        fs.readFileSync = (file) => String(file).endsWith('package.json')
          ? JSON.stringify({ version: check.TSRS_VERSION }) : Buffer.from('fixture');
        fs.rmSync = () => {};
        crypto.createHash = () => ({ update: () => ({ digest: () => check.TSRS_SHA256 }) });
        childProcess.spawnSync = (_command, _args, options) => {
          timeouts.push(options.timeout);
          return { status: null, signal: 'SIGTERM', error: { code: 'ETIMEDOUT' }, stdout: '', stderr: '' };
        };
        syncBuiltinESMExports();
      }
      const status = check.runSideCheck({ prefix: '/fixture', summary: args[1] });
      fs.readFileSync = read;
      fs.rmSync = remove;
      process.stdout.write = write;
      result = { status, stdout, timeouts, summary: read(args[1], 'utf8') };
    } else result = action === 'parseWorkflow'
      ? (await import('yaml')).parse(args[0])
      : action === 'readExport' ? check[args[0]]
      : check[action](...args);
    process.stdout.write(JSON.stringify(result));
  `,
    ],
    {
      cwd: root,
      encoding: 'utf8',
      input: JSON.stringify({ action, args }),
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout);
};
const diagnostic =
  "src/a.ts(2,3): error TS2322: Type 'string' is not assignable to type 'number'.";
const run = (status: number | null, stdout = '', extra = {}) => ({
  status,
  stdout,
  stderr: '',
  ...extra,
});
const compare = (baseline: unknown, candidate: unknown) =>
  invoke('compareRuns', [baseline, candidate, '/repo']);

describe('advisory tsrs side-check', () => {
  it('compares the same project arguments as the required typecheck script', () => {
    const typecheck = JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
    ).scripts.typecheck;
    const args = typecheck.split(' && ').map((command: string) => {
      expect(command).toMatch(/^node node_modules\/typescript7\/bin\/tsc /);
      return command
        .replace(/^node node_modules\/typescript7\/bin\/tsc /, '')
        .split(' ');
    });
    expect(
      invoke('readExport', ['PROJECTS']).map(
        (project: [string, string[]]) => project[1],
      ),
    ).toEqual(args);
  });

  it('uses a fence longer than every backtick run in the content', () => {
    expect(invoke('fenced', ['a ``` b'])).toBe('````text\na ``` b\n````\n');
    expect(invoke('fenced', ['```\n`````\n<script>text</script>'])).toBe(
      '``````text\n```\n`````\n<script>text</script>\n``````\n',
    );
  });

  it('clips oversized UTF-8 blocks and totals with a truncation note', () => {
    const text = 'x'.repeat(2 * 1024 * 1024);
    const block = invoke('fenced', [text]);
    expect(Buffer.byteLength(block)).toBeLessThanOrEqual(64 * 1024 + 13);
    expect(block).toContain('[truncated;');
    expect(block).toContain('job log');
    const summary = invoke('clip', [text, 900 * 1024]);
    expect(Buffer.byteLength(summary)).toBeLessThanOrEqual(900 * 1024);
    expect(summary).toContain('[truncated;');
    const unicode = invoke('clip', ['\u20ac'.repeat(64 * 1024)]);
    expect(Buffer.byteLength(unicode)).toBeLessThanOrEqual(64 * 1024);
    expect(unicode).not.toContain('\ufffd');
    expect(invoke('clip', ['unchanged'])).toBe('unchanged');
  });

  it.each(['reportError', 'simulateTimeout'])(
    'writes the summary and preserves full stdout for %s',
    (action) => {
      const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tsrs-report-'));
      try {
        const text = 'x'.repeat(2 * 1024 * 1024) + 'FULL_OUTPUT_END';
        const result = invoke(action, [text, path.join(temp, 'summary.md')]);
        expect(result.status).toBe(1);
        expect(Buffer.byteLength(result.summary)).toBeLessThanOrEqual(
          900 * 1024,
        );
        if (action === 'reportError') {
          expect(result.summary).toContain('[truncated;');
          expect(result.summary).not.toContain('FULL_OUTPUT_END');
          expect(result.stdout).toContain(text);
        } else {
          expect(result.timeouts).toEqual([180000, 180000, 180000, 180000]);
          expect(result.summary).toContain('root parity: **TIMEOUT**');
          expect(result.summary).toContain('scripts parity: **TIMEOUT**');
          expect(result.summary).toContain('TIMEOUT after 180s');
        }
      } finally {
        fs.rmSync(temp, { recursive: true, force: true });
      }
    },
  );

  it('normalizes colors, CRLF, root prefixes and path separators without losing continuation text', () => {
    const output =
      '\u001b[31mC:\\repo\\src\\a.ts(1,2): error TS2769: No overload matches this call.\u001b[0m\r\n  Last overload failed.\r\n    Detail.\r\n';
    expect(invoke('normalizeDiagnostics', [output, 'C:/repo'])).toEqual({
      diagnostics: [
        'src/a.ts(1,2): error TS2769: No overload matches this call.\n  Last overload failed.\n    Detail.',
      ],
      unparsed: [],
    });
  });

  it('ignores diagnostic order and accepts exit 1 versus 2', () => {
    const global = 'error TS18003: No inputs were found.';
    expect(
      compare(
        run(1, `${diagnostic}\n${global}`),
        run(2, `${global}\n${diagnostic}`),
      ),
    ).toEqual({ parity: 'MATCH', diff: [] });
    expect(compare(run(0), run(0)).parity).toBe('MATCH');
  });

  it.each([0, 1, 2, 3, null])('classifies exit %s explicitly', (status) => {
    expect(invoke('classifyExit', [status])).toBe(
      status === 0
        ? 'clean'
        : status === 1 || status === 2
          ? 'diagnostics'
          : 'error',
    );
  });

  it('retains duplicate counts, locations, codes and full messages in diffs', () => {
    for (const changed of [
      `${diagnostic}\n${diagnostic}`,
      diagnostic.replace('(2,3)', '(2,4)'),
      diagnostic.replace('TS2322', 'TS2345'),
      `${diagnostic}\n  More detail.`,
      diagnostic.replace('number', 'boolean'),
    ]) {
      const result = compare(run(1, diagnostic), run(2, changed));
      expect(result.parity).toBe('MISMATCH');
      expect(result.diff.length).toBeGreaterThan(0);
    }
  });

  it('reports clean versus diagnostics as a mismatch', () => {
    expect(compare(run(0), run(2, diagnostic)).parity).toBe('MISMATCH');
  });

  it('distinguishes timeouts from plain error exits', () => {
    const result = compare(
      run(0),
      run(null, '', { signal: 'SIGTERM', error: { code: 'ETIMEDOUT' } }),
    );
    expect(result.parity).toBe('TIMEOUT');
    expect(result.diff).toContain('tsrs: TIMEOUT after 180s');
    expect(compare(run(0), run(3)).parity).toBe('ERROR');
  });

  it('reports crashes, signals, unexpected output and invalid exit/output combinations as errors', () => {
    for (const bad of [
      run(null, '', { signal: 'SIGTERM' }),
      run(null, '', { error: { message: 'spawn failed' } }),
      run(3),
      run(2),
      run(0, diagnostic),
      run(0, 'panic: checker crashed'),
      run(0, '', { stderr: 'unexpected warning' }),
    ]) {
      expect(compare(bad, bad).parity).toBe('ERROR');
    }
  });

  it('rejects an unverified executable before execution and writes the error to the summary', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tsrs-integrity-'));
    try {
      fs.mkdirSync(path.join(temp, 'node_modules/tsrs'), { recursive: true });
      fs.mkdirSync(path.join(temp, 'node_modules/@tsrs/linux-x64-gnu'), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(temp, 'node_modules/tsrs/package.json'),
        JSON.stringify({ version: '0.18.0-ts7.1.0-dev.20260929' }),
      );
      fs.writeFileSync(
        path.join(temp, 'node_modules/@tsrs/linux-x64-gnu/package.json'),
        JSON.stringify({ version: 'partial-bump' }),
      );
      fs.writeFileSync(
        path.join(temp, 'node_modules/@tsrs/linux-x64-gnu/tsrs'),
        'must never execute',
      );
      const summary = path.join(temp, 'summary.md');
      const result = spawnSync(
        process.execPath,
        ['scripts/qc/tsrs-side-check.mjs', temp],
        {
          cwd: root,
          encoding: 'utf8',
          env: { ...process.env, GITHUB_STEP_SUMMARY: summary },
        },
      );
      expect(result.status).toBe(1);
      expect(fs.readFileSync(summary, 'utf8')).toContain(
        'tsrs integrity mismatch',
      );
      expect(result.stdout).toContain('nativeVersion=partial-bump');
      expect(result.stdout).not.toContain('root / TS7');
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });

  it('keeps the isolated, exact-pinned check advisory and outside every other job dependency', () => {
    const workflow = invoke('parseWorkflow', [
      fs.readFileSync(
        path.join(root, '.github/workflows/pr-checks.yml'),
        'utf8',
      ),
    ]);
    const job = workflow.jobs['tsrs-side-check'];
    expect(job.name).toBe('tsrs Side-Check (advisory)');
    expect(job['runs-on']).toBe('ubuntu-latest');
    expect(job['continue-on-error']).toBe(true);
    expect(job['timeout-minutes']).toBe(15);
    expect(job.permissions).toEqual({ contents: 'read' });
    expect(job.steps).toContainEqual({
      name: 'Checkout code',
      uses: 'actions/checkout@v6',
      with: { 'persist-credentials': false },
    });
    expect(job.steps).toContainEqual(
      expect.objectContaining({
        uses: './.github/actions/setup-node-and-install',
      }),
    );
    const commands = job.steps
      .map((step: { run?: string }) => step.run ?? '')
      .join('\n');
    const script = fs.readFileSync(
      path.join(root, 'scripts/qc/tsrs-side-check.mjs'),
      'utf8',
    );
    const version = /TSRS_VERSION = '([^']+)'/.exec(script)?.[1];
    expect(version).toBeDefined();
    expect(commands).toContain(
      `npm install --no-save --ignore-scripts --no-audit --no-fund --prefix "$RUNNER_TEMP/tsrs" tsrs@${version}`,
    );
    expect(commands).toContain(
      'node scripts/qc/tsrs-side-check.mjs "$RUNNER_TEMP/tsrs"',
    );
    for (const other of Object.values(workflow.jobs) as Array<{
      needs?: string | string[];
    }>) {
      expect([other.needs].flat()).not.toContain('tsrs-side-check');
    }
    const protection = fs.readFileSync(
      path.join(root, '.github/scripts/setup-branch-protection.sh'),
      'utf8',
    );
    expect(protection).not.toContain(job.name);
  });
});

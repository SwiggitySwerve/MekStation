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
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    const { action, args } = JSON.parse(input);
    const result = action === 'parseWorkflow'
      ? (await import('yaml')).parse(args[0])
      : check[action](...args);
    process.stdout.write(JSON.stringify(result));
  `,
    ],
    { cwd: root, encoding: 'utf8', input: JSON.stringify({ action, args }) },
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
      `npm install --no-save --prefix "$RUNNER_TEMP/tsrs" tsrs@${version}`,
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

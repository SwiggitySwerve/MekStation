import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(
  path.resolve('scripts/qc/report-camp01-live-status.mjs'),
).href;

// The reporting command's only transport is the injected `runGh` seam, so the
// harness supplies a stand-in that records every argument vector and fabricates
// the artifact layout `gh run download` produces. Nothing here reaches the
// network or spawns `gh`, which is the point: the command is the human-facing
// half of the live tier's honesty mechanism, and an untested reporter can lie
// about a red tier exactly as silently as no reporter at all.
const harness = `
import fs from 'node:fs';
import path from 'node:path';
import { reportCamp01LiveStatus } from ${JSON.stringify(moduleUrl)};
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
const calls = [];
const scratchDirs = [];
const artifactFor = (kind) => {
  const summary = { passed: 5, failed: 0, skippedWithReason: 1, skippedAsExpected: 1, skippedUnexpectedly: 0, unexpectedSkips: [], strictSkips: false, exitCode: 0 };
  if (kind === 'failed') return { probes: [{ probeId: 'proof5d5-live-browser-sentinel', status: 'failed' }], summary: { ...summary, passed: 1, failed: 1, skippedAsExpected: 0, exitCode: 1 } };
  if (kind === 'degraded') return { probes: [{ probeId: 'proof5d5-live-browser-sentinel', status: 'skipped-with-reason' }], summary: { ...summary, passed: 4, skippedAsExpected: 0, skippedUnexpectedly: 1, unexpectedSkips: ['proof5d5-live-browser-sentinel'] } };
  return { probes: [{ probeId: 'proof5d4-artifact-atomicity', status: 'passed' }], summary };
};
const runGh = (args) => {
  calls.push(args);
  if (args[0] === 'run' && args[1] === 'list') {
    if (request.ghMissing) return { error: new Error('spawn gh ENOENT'), status: null, stdout: '', stderr: '' };
    if (request.ghFails) return { status: 1, stdout: '', stderr: 'gh: To get started with GitHub CLI, please run: gh auth login' };
    return { status: 0, stdout: JSON.stringify(request.runs ?? []), stderr: '' };
  }
  if (args[0] === 'run' && args[1] === 'download') {
    const dir = args[args.indexOf('--dir') + 1];
    scratchDirs.push(dir);
    if (request.downloadFails) return { status: 1, stdout: '', stderr: 'artifact expired or was deleted' };
    for (const { leg, kind } of request.legs ?? []) {
      if (kind === 'absent') continue;
      const directory = path.join(dir, 'camp01-live-adversarial-' + leg);
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(path.join(directory, leg + '.json'), JSON.stringify(artifactFor(kind)));
    }
    return { status: 0, stdout: '', stderr: '' };
  }
  return { status: 1, stdout: '', stderr: 'unexpected subcommand' };
};
const output = [];
try {
  await reportCamp01LiveStatus(
    { limit: request.limit ?? 5 },
    { runGh, write: (text) => output.push(text.trimEnd()) },
  );
  process.stdout.write(JSON.stringify({ ok: true, output, calls, scratchLeftBehind: scratchDirs.filter((dir) => fs.existsSync(dir)) }));
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error), calls }));
}`;

type Result = {
  ok: boolean;
  error?: string;
  output?: string[];
  calls?: string[][];
  scratchLeftBehind?: string[];
};

function invoke(request: Record<string, unknown>): Result {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    { input: JSON.stringify(request), encoding: 'utf8' },
  );
  if (!result.stdout)
    throw new Error(result.error?.message ?? result.stderr ?? 'no output');
  return JSON.parse(result.stdout) as Result;
}

// prettier-ignore
const runRow = (overrides: Record<string, unknown> = {}) => ({ databaseId: 42, headBranch: 'main', headSha: 'abcdef1234567890', displayTitle: 'live tier', status: 'completed', conclusion: 'failure', createdAt: '2026-08-08T00:00:00Z', url: 'https://github.com/SwiggitySwerve/MekStation/actions/runs/42', ...overrides });

// prettier-ignore
const bothLegs = (kind: string) => [{ leg: 'Linux', kind }, { leg: 'Windows', kind }];

describe('camp01 live tier status report', () => {
  // The command previously spawned `gh` through a seam no test exercised. A
  // write subcommand added here would reach a real repository, so the argument
  // vectors are asserted rather than trusted.
  it('only ever asks gh for data, never mutates a repository', () => {
    const result = invoke({
      runs: [runRow()],
      legs: bothLegs('green'),
    });
    expect(result.ok).toBe(true);
    expect(result.calls?.length).toBeGreaterThan(0);
    for (const args of result.calls ?? []) {
      expect(args[0]).toBe('run');
      expect(['list', 'download']).toContain(args[1]);
    }
    const forbidden = ['issue', 'pr', 'release', 'api', 'label', 'repo'];
    // prettier-ignore
    expect((result.calls ?? []).flat().filter((arg) => forbidden.includes(arg))).toEqual([]);
  });

  it('degrades to guidance when gh is absent from PATH', () => {
    const result = invoke({ ghMissing: true });
    expect(result.ok).toBe(true);
    const text = (result.output ?? []).join('\n');
    expect(text).toContain('status unavailable');
    expect(text).toContain('gh auth login');
    expect(text).toContain('actions/workflows/camp01-live-adversarial.yml');
    expect(result.calls?.length).toBe(1);
  });

  it('surfaces the gh failure text when gh cannot reach GitHub', () => {
    const result = invoke({ ghFails: true });
    expect(result.ok).toBe(true);
    expect((result.output ?? []).join('\n')).toContain('gh auth login');
    expect(result.calls?.length).toBe(1);
  });

  it('reports an empty history without attempting a download', () => {
    const result = invoke({ runs: [] });
    expect(result.ok).toBe(true);
    expect((result.output ?? []).join('\n')).toContain('No runs found');
    expect(result.calls?.length).toBe(1);
  });

  it('calls every leg green when both legs published passing evidence', () => {
    const result = invoke({
      runs: [runRow({ conclusion: 'success' })],
      legs: bothLegs('green'),
    });
    const text = (result.output ?? []).join('\n');
    expect(text).toContain('every leg green');
    expect(text).not.toContain('NOT CLEAN');
    expect(text).toContain('Linux');
    expect(text).toContain('Windows');
  });

  it('reports NOT CLEAN and names the failing probe when a leg is red', () => {
    const result = invoke({
      runs: [runRow()],
      legs: [
        { leg: 'Linux', kind: 'failed' },
        { leg: 'Windows', kind: 'green' },
      ],
    });
    const text = (result.output ?? []).join('\n');
    expect(text).toContain('NOT CLEAN');
    expect(text).toContain('FAILED');
    expect(text).toContain('proof5d5-live-browser-sentinel');
  });

  // A leg that exits zero while losing a provisioned capability is the failure
  // mode the six unnoticed reds were made of — it must not read as green here.
  it('reports NOT CLEAN when a zero-exit leg silently degraded', () => {
    const result = invoke({
      runs: [runRow({ conclusion: 'success' })],
      legs: [
        { leg: 'Linux', kind: 'degraded' },
        { leg: 'Windows', kind: 'green' },
      ],
    });
    const text = (result.output ?? []).join('\n');
    expect(text).toContain('NOT CLEAN');
    expect(text).toContain('DEGRADED');
  });

  it('reports a leg that published nothing as missing, never green', () => {
    const result = invoke({
      runs: [runRow()],
      legs: [
        { leg: 'Linux', kind: 'green' },
        { leg: 'Windows', kind: 'absent' },
      ],
    });
    const text = (result.output ?? []).join('\n');
    expect(text).toContain('MISSING');
    expect(text).toContain('NOT CLEAN');
  });

  it('explains an unavailable artifact instead of assessing nothing silently', () => {
    const result = invoke({ runs: [runRow()], downloadFails: true });
    expect(result.ok).toBe(true);
    expect((result.output ?? []).join('\n')).toContain('artifacts unavailable');
  });

  it('removes its scratch directory on every path', () => {
    for (const request of [
      { runs: [runRow()], legs: bothLegs('green') },
      { runs: [runRow()], downloadFails: true },
    ]) {
      expect(invoke(request).scratchLeftBehind).toEqual([]);
    }
  });
});

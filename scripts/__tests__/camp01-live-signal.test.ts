import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-live-signal.mjs'),
).href;

// `.mjs` QC modules are exercised through a spawned ESM harness (the convention
// the rest of the camp01 script suite uses). The harness fabricates the exact
// artifact layout `actions/download-artifact` produces, points the job summary
// at a scratch file, and reports the verdict, the annotations, and the summary
// so each classification can be asserted rather than assumed. The module reads
// files and nothing else — there is no network transport to stub out.
const harness = `
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCamp01LiveSignal } from ${JSON.stringify(moduleUrl)};
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp01-live-signal-test-'));
const summaryPath = path.join(root, 'step-summary.md');
const artifactFor = (kind) => {
  const summary = { passed: 5, failed: 0, skippedWithReason: 1, skippedAsExpected: 1, skippedUnexpectedly: 0, unexpectedSkips: [], strictSkips: false, exitCode: 0 };
  if (kind === 'failed') return { probes: [{ probeId: 'proof5d5-live-browser-sentinel', status: 'failed' }, { probeId: 'proof5d4-artifact-atomicity', status: 'passed' }], summary: { ...summary, passed: 1, failed: 1, skippedWithReason: 0, skippedAsExpected: 0, exitCode: 1 } };
  if (kind === 'degraded') return { probes: [{ probeId: 'proof5d5-live-browser-sentinel', status: 'skipped-with-reason', skipDisposition: 'unexpected' }], summary: { ...summary, passed: 4, skippedAsExpected: 0, skippedUnexpectedly: 1, unexpectedSkips: ['proof5d5-live-browser-sentinel'] } };
  if (kind === 'nonzero-exit') return { probes: [], summary: { ...summary, strictSkips: true, exitCode: 1 } };
  if (kind === 'no-summary') return { probes: [{ probeId: 'proof5d4-artifact-atomicity', status: 'passed' }] };
  return { probes: [{ probeId: 'proof5d4-artifact-atomicity', status: 'passed' }], summary };
};
for (const { leg, kind } of request.legs) {
  if (kind === 'absent') continue;
  const directory = path.join(root, 'camp01-live-adversarial-' + leg);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, leg + '.json'), kind === 'malformed' ? '{ not json' : JSON.stringify(artifactFor(kind)));
}
const output = [];
try {
  const { signal, exitCode } = await runCamp01LiveSignal(
    { artifactsRoot: root, expectedLegs: request.expect ?? ['Linux', 'Windows'] },
    { write: (text) => output.push(text.trimEnd()), summaryPath },
  );
  process.stdout.write(JSON.stringify({ ok: true, alarming: signal.alarming, exitCode, legs: signal.legs.map(({ leg, state, probes }) => ({ leg, state, probes })), annotations: signal.annotations, summary: fs.readFileSync(summaryPath, 'utf8'), output }));
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}`;

type Result = {
  ok: boolean;
  error?: string;
  alarming?: boolean;
  exitCode?: number;
  legs?: { leg: string; state: string; probes: string[] }[];
  annotations?: string[];
  summary?: string;
  output?: string[];
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

describe('camp01 live tier signal', () => {
  it('classifies a broken probe as failed and names the leg and the probe', () => {
    const result = invoke({
      legs: [
        { leg: 'Linux', kind: 'failed' },
        { leg: 'Windows', kind: 'green' },
      ],
    });
    expect(result.ok).toBe(true);
    expect(result.legs).toEqual([
      {
        leg: 'Linux',
        state: 'failed',
        probes: ['proof5d5-live-browser-sentinel'],
      },
      { leg: 'Windows', state: 'green', probes: [] },
    ]);
    expect(result.alarming).toBe(true);
    // Loud enough to act on without opening the artifact: which leg, which probe.
    expect(result.annotations).toEqual([
      '::error title=CAMP-01 live tier (Linux)::failed — proof5d5-live-browser-sentinel',
    ]);
  });

  // The whole reason this job exists: the leg exited 0, so its own step saw
  // nothing worth failing on, yet it silently lost a capability the workflow
  // provisions. Only a cross-leg reader treats that as a red.
  it('classifies an unexpected skip on a zero-exit leg as degraded', () => {
    const result = invoke({
      legs: [
        { leg: 'Linux', kind: 'green' },
        { leg: 'Windows', kind: 'degraded' },
      ],
    });
    expect(result.alarming).toBe(true);
    expect(result.legs).toContainEqual({
      leg: 'Windows',
      state: 'degraded',
      probes: ['proof5d5-live-browser-sentinel'],
    });
    expect(result.annotations).toEqual([
      '::warning title=CAMP-01 live tier (Windows)::degraded — proof5d5-live-browser-sentinel',
    ]);
  });

  it('classifies a leg that never published as missing', () => {
    const result = invoke({
      legs: [
        { leg: 'Linux', kind: 'green' },
        { leg: 'Windows', kind: 'absent' },
      ],
    });
    expect(result.alarming).toBe(true);
    expect(result.legs).toContainEqual({
      leg: 'Windows',
      state: 'missing',
      probes: [],
    });
    expect(result.annotations).toEqual([
      '::error title=CAMP-01 live tier (Windows)::missing — no artifact was published',
    ]);
  });

  it('classifies an unreadable or summary-less artifact as missing, never green', () => {
    const result = invoke({
      legs: [
        { leg: 'Linux', kind: 'malformed' },
        { leg: 'Windows', kind: 'no-summary' },
      ],
    });
    expect(result.alarming).toBe(true);
    expect(result.legs?.map(({ state }) => state)).toEqual([
      'missing',
      'missing',
    ]);
    expect(result.annotations?.[1]).toBe(
      '::error title=CAMP-01 live tier (Windows)::missing — artifact summary is absent or malformed',
    );
  });

  it('classifies a non-zero runner exit as failed even with no failed probes', () => {
    const result = invoke({
      legs: [
        { leg: 'Linux', kind: 'nonzero-exit' },
        { leg: 'Windows', kind: 'green' },
      ],
    });
    expect(result.legs?.[0]).toEqual({
      leg: 'Linux',
      state: 'failed',
      probes: [],
    });
    expect(result.annotations).toEqual([
      '::error title=CAMP-01 live tier (Linux)::failed — runner reported exit code 1',
    ]);
  });

  it('classifies every published, passing leg as green and exits 0', () => {
    const result = invoke({
      legs: [
        { leg: 'Linux', kind: 'green' },
        { leg: 'Windows', kind: 'green' },
      ],
    });
    expect(result.alarming).toBe(false);
    expect(result.exitCode).toBe(0);
    expect(result.annotations).toEqual([
      '::notice title=CAMP-01 live tier::every leg green — Linux, Windows',
    ]);
    expect(result.summary).toContain('Status: **green**');
  });

  // Non-gating in the pull-request sense, loud in the run-status sense: the
  // red on the Actions tab is the only durable surface this tier has.
  it('fails the run and writes a job summary naming each alarming leg', () => {
    const result = invoke({
      legs: [
        { leg: 'Linux', kind: 'failed' },
        { leg: 'Windows', kind: 'absent' },
      ],
    });
    expect(result.exitCode).toBe(1);
    expect(result.summary).toContain('Status: **NOT CLEAN**');
    expect(result.summary).toContain(
      '| `Linux` | **failed** | `proof5d5-live-browser-sentinel` |',
    );
    expect(result.summary).toContain(
      '| `Windows` | **missing** | no artifact was published |',
    );
  });

  it('refuses to assess without an explicit expected leg list', () => {
    const result = invoke({ legs: [], expect: [] });
    expect(result.ok).toBe(false);
    expect(result.error).toBe(
      'CAMP01_LIVE_SIGNAL_INVALID_ARGUMENT: at least one expected leg is required',
    );
  });
});

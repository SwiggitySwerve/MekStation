import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const NODE = process.execPath;

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runNodeScript(scriptPath: string, args: string[] = []) {
  return spawnSync(NODE, [path.resolve(repoRoot, scriptPath), ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
  });
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

describe('journey QC scripts', () => {
  let evidenceDir: string;

  beforeEach(() => {
    evidenceDir = makeTempDir('mekstation-journey-qc-');
  });

  afterEach(() => {
    fs.rmSync(evidenceDir, { force: true, recursive: true });
  });

  it('validates the journey catalog, graph, and logging map', () => {
    const result = runNodeScript('scripts/qc/validate-journey-qc.mjs');

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('catalog=7 journeys');
    expect(result.stdout).toContain('errors=0');
  });

  it('writes a dry-run plan without failing the command', () => {
    const result = runNodeScript('scripts/qc/run-journey-scenarios.mjs', [
      '--journey=mek-build',
      '--dry-run',
      '--run-id=test-dry-run',
      `--evidence-dir=${evidenceDir}`,
    ]);

    expect(result.status).toBe(0);
    const runPlan = readJson<{ dryRun: boolean; journeyIds: string[] }>(
      path.join(evidenceDir, 'test-dry-run', 'run-plan.json'),
    );
    const output = readJson<{ status: string }>(
      path.join(evidenceDir, 'test-dry-run', 'result.json'),
    );

    expect(runPlan.dryRun).toBe(true);
    expect(runPlan.journeyIds).toEqual(['mek-build']);
    expect(output.status).toBe('dry-run');
  });

  it('runs a combat journey and makes logs plus bug reports queryable', () => {
    const runResult = runNodeScript('scripts/qc/run-journey-scenarios.mjs', [
      '--journey=combat-1v1',
      '--seed=42',
      '--run-id=test-combat',
      `--evidence-dir=${evidenceDir}`,
    ]);
    expect(runResult.status).toBe(0);

    const result = readJson<{
      status: string;
      executionBackingSummary: {
        syntheticSteps: number;
        totalSteps: number;
      };
      journeys: Array<{
        attempts: Array<{
          terminalState: string;
          steps: Array<{
            executionBacking: string;
            syntheticBacking: boolean;
          }>;
        }>;
      }>;
    }>(path.join(evidenceDir, 'test-combat', 'result.json'));
    expect(result.status).toBe('pass');
    expect(result.journeys[0]?.attempts[0]?.terminalState).toBe(
      'combat-complete',
    );
    expect(result.executionBackingSummary.syntheticSteps).toBe(3);
    expect(result.executionBackingSummary.totalSteps).toBe(3);
    expect(result.journeys[0]?.attempts[0]?.steps[0]).toMatchObject({
      executionBacking: 'synthetic-projection',
      syntheticBacking: true,
    });

    const logs = runNodeScript('scripts/qc/search-journey-logs.mjs', [
      '--run-id=latest',
      '--level=warn,error',
      `--evidence-dir=${evidenceDir}`,
    ]);
    expect(logs.status).toBe(0);
    expect(logs.stdout).toContain('tactical.action_rejected');
    expect(logs.stdout).toContain('[warn diagnostic non-blocking]');
    expect(logs.stdout).toContain('api.payload_rejected');
    expect(logs.stdout).toContain('[warn expected-probe non-blocking]');

    const probeLogs = runNodeScript('scripts/qc/search-journey-logs.mjs', [
      '--run-id=latest',
      '--classification=expected-probe',
      '--json',
      `--evidence-dir=${evidenceDir}`,
    ]);
    expect(probeLogs.status).toBe(0);
    const probeEntries = JSON.parse(probeLogs.stdout) as Array<{
      event: string;
      classification: string;
      blocking: boolean;
      metadata: { nonBlockingProbe?: boolean };
    }>;
    expect(probeEntries).toHaveLength(1);
    expect(probeEntries[0]).toMatchObject({
      event: 'api.payload_rejected',
      classification: 'expected-probe',
      blocking: false,
    });
    expect(probeEntries[0]?.metadata.nonBlockingProbe).toBe(true);

    const nonProbeWarnings = runNodeScript(
      'scripts/qc/search-journey-logs.mjs',
      [
        '--run-id=latest',
        '--level=warn,error',
        '--exclude-probes',
        `--evidence-dir=${evidenceDir}`,
      ],
    );
    expect(nonProbeWarnings.status).toBe(0);
    expect(nonProbeWarnings.stdout).toContain('tactical.action_rejected');
    expect(nonProbeWarnings.stdout).not.toContain('api.payload_rejected');

    const report = fs.readFileSync(
      path.join(evidenceDir, 'test-combat', 'report.md'),
      'utf-8',
    );
    expect(report).toContain('- Synthetic-backed steps: 3/3');
    expect(report).toContain('- Expected probes: 1');

    const bugs = runNodeScript('scripts/qc/report-journey-bugs.mjs', [
      '--since=latest',
      '--min-severity=medium',
      `--evidence-dir=${evidenceDir}`,
    ]);
    expect(bugs.status).toBe(0);
    expect(bugs.stdout).toContain('Journey bugs (0)');
  });

  it('runs the full smoke journey set', () => {
    const runResult = runNodeScript('scripts/qc/run-journey-scenarios.mjs', [
      '--journey=all',
      '--tier=smoke',
      '--seed=77',
      '--run-id=test-all-smoke',
      `--evidence-dir=${evidenceDir}`,
    ]);

    expect(runResult.status).toBe(0);
    const result = readJson<{
      status: string;
      journeys: Array<{ id: string; attempts: Array<{ status: string }> }>;
    }>(path.join(evidenceDir, 'test-all-smoke', 'result.json'));

    expect(result.status).toBe('pass');
    expect(result.journeys.map((journey) => journey.id)).toEqual([
      'character-build',
      'mek-build',
      'combat-1v1',
      'combat-4v4',
      'contract-campaign',
      'campaign-short',
      'campaign-long',
    ]);
    expect(
      result.journeys.every((journey) =>
        journey.attempts.every((attempt) => attempt.status === 'pass'),
      ),
    ).toBe(true);
  });

  it('extracts bug candidates from failed journey steps', () => {
    const runResult = runNodeScript('scripts/qc/run-journey-scenarios.mjs', [
      '--journey=combat-1v1',
      '--run-id=test-failure',
      '--inject-failure=resolve-combat',
      '--continue-on-error',
      `--evidence-dir=${evidenceDir}`,
    ]);
    expect(runResult.status).toBe(1);

    const bugs = runNodeScript('scripts/qc/report-journey-bugs.mjs', [
      '--since=latest',
      '--min-severity=medium',
      `--evidence-dir=${evidenceDir}`,
    ]);

    expect(bugs.status).toBe(0);
    expect(bugs.stdout).toContain(
      'Journey step failed: combat-1v1/resolve-combat',
    );
  });

  it('fails strict backing-required runs while preserving bug evidence', () => {
    const runResult = runNodeScript('scripts/qc/run-journey-scenarios.mjs', [
      '--journey=combat-1v1',
      '--run-id=test-domain-backed-required',
      '--require-domain-backed',
      '--continue-on-error',
      `--evidence-dir=${evidenceDir}`,
    ]);
    expect(runResult.status).toBe(1);

    const result = readJson<{
      status: string;
      executionBackingSummary: { missingRequiredBacking: number };
      journeys: Array<{
        attempts: Array<{
          steps: Array<{ failureKind?: string; syntheticBacking: boolean }>;
        }>;
      }>;
    }>(path.join(evidenceDir, 'test-domain-backed-required', 'result.json'));
    expect(result.status).toBe('fail');
    expect(result.executionBackingSummary.missingRequiredBacking).toBe(3);
    expect(result.journeys[0]?.attempts[0]?.steps[0]).toMatchObject({
      failureKind: 'missing-required-execution-backing',
      syntheticBacking: true,
    });

    const logs = runNodeScript('scripts/qc/search-journey-logs.mjs', [
      '--run-id=latest',
      '--event=journey.execution_backing_missing',
      `--evidence-dir=${evidenceDir}`,
    ]);
    expect(logs.status).toBe(0);
    expect(logs.stdout).toContain('execution_backing_missing');

    const bugs = runNodeScript('scripts/qc/report-journey-bugs.mjs', [
      '--since=latest',
      '--min-severity=medium',
      `--evidence-dir=${evidenceDir}`,
    ]);
    expect(bugs.status).toBe(0);
    expect(bugs.stdout).toContain(
      'Missing non-synthetic execution backing: combat-1v1/launch-duel',
    );
  });

  it('queries the QC graph by journey id', () => {
    const result = runNodeScript('scripts/qc/query-qc-graph.mjs', [
      '--query=mek-build',
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('journey:mek-build');
    expect(result.stdout).toContain('command:qc-journeys');
  });
});

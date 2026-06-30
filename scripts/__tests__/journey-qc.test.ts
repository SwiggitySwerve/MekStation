import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const NODE = process.execPath;

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runNodeScript(
  scriptPath: string,
  args: string[] = [],
  env: NodeJS.ProcessEnv = {},
) {
  return spawnSync(NODE, [path.resolve(repoRoot, scriptPath), ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: { ...process.env, ...env },
  });
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
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
    expect(result.stdout).toContain('uiFlows=7');
    expect(result.stdout).toContain('errors=0');
  });

  it('fails validation when a registry surface lacks lifecycle graph coverage', () => {
    const graph = readJson<{
      nodes: Array<{ id: string }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-validation-graph.json'));
    graph.nodes = graph.nodes.filter(
      (node) => node.id !== 'state:maintenance-code-health:lifecycle',
    );
    const graphPath = path.join(evidenceDir, 'missing-lifecycle-state.json');
    writeJson(graphPath, graph);

    const result = runNodeScript('scripts/qc/validate-journey-qc.mjs', [], {
      MEKSTATION_QC_VALIDATION_GRAPH_PATH: graphPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'Graph missing lifecycle state node state:maintenance-code-health:lifecycle',
    );
  });

  it('fails validation when a graph surface coverage status drifts from the registry', () => {
    const graph = readJson<{
      nodes: Array<{ id: string; coverageStatus?: string }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-qc-validation-graph.json'));
    const appShellNode = graph.nodes.find(
      (node) => node.id === 'surface:app-shell-navigation',
    );
    expect(appShellNode).toBeDefined();
    appShellNode!.coverageStatus = 'partial';
    const graphPath = path.join(evidenceDir, 'drifted-surface-status.json');
    writeJson(graphPath, graph);

    const result = runNodeScript('scripts/qc/validate-journey-qc.mjs', [], {
      MEKSTATION_QC_VALIDATION_GRAPH_PATH: graphPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'Graph surface node surface:app-shell-navigation coverageStatus=partial does not match registry coverageStatus=ready-with-scope',
    );
  });

  it('fails validation when a catalog diagnostic event is missing from the logging map', () => {
    const loggingMap = readJson<{
      paths: Array<{ events: string[] }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-logging-map.json'));
    for (const loggingPath of loggingMap.paths) {
      loggingPath.events = loggingPath.events.filter(
        (eventName) => eventName !== 'campaign.sequence_generated',
      );
    }
    const loggingMapPath = path.join(evidenceDir, 'missing-event-logging.json');
    writeJson(loggingMapPath, loggingMap);

    const result = runNodeScript('scripts/qc/validate-journey-qc.mjs', [], {
      MEKSTATION_QC_LOGGING_MAP_PATH: loggingMapPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'Catalog diagnostic event campaign.sequence_generated is missing from logging map events',
    );
  });

  it('fails validation when a required journey lacks command-screen checkpoints', () => {
    const catalog = readJson<{
      journeys: Array<{
        id: string;
        commandScreenCheckpoints?: unknown[];
      }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-journey-scenarios.json'));
    const combatJourney = catalog.journeys.find(
      (journey) => journey.id === 'combat-1v1',
    );
    expect(combatJourney).toBeDefined();
    delete combatJourney!.commandScreenCheckpoints;
    const catalogPath = path.join(
      evidenceDir,
      'missing-command-screen-checkpoints.json',
    );
    writeJson(catalogPath, catalog);

    const result = runNodeScript('scripts/qc/validate-journey-qc.mjs', [], {
      MEKSTATION_JOURNEY_CATALOG_PATH: catalogPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'combat-1v1: commandScreenCheckpoints must contain at least one checkpoint.',
    );
  });

  it('fails validation when a command-screen checkpoint is not mapped to the UI flow shell', () => {
    const catalog = readJson<{
      journeys: Array<{
        id: string;
        commandScreenCheckpoints: Array<{ id: string; uiCheckpointId: string }>;
      }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-journey-scenarios.json'));
    const campaignJourney = catalog.journeys.find(
      (journey) => journey.id === 'campaign-long',
    );
    expect(campaignJourney).toBeDefined();
    campaignJourney!.commandScreenCheckpoints[0]!.uiCheckpointId =
      'missing-starmap';
    const catalogPath = path.join(
      evidenceDir,
      'bad-command-screen-checkpoint-map.json',
    );
    writeJson(catalogPath, catalog);

    const result = runNodeScript('scripts/qc/validate-journey-qc.mjs', [], {
      MEKSTATION_JOURNEY_CATALOG_PATH: catalogPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'Journey campaign-long: command checkpoint starmap-route-command references missing UI checkpoint missing-starmap.',
    );
  });

  it('fails validation when a graph log event is missing from the logging map', () => {
    const loggingMap = readJson<{
      paths: Array<{ events: string[] }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-logging-map.json'));
    for (const loggingPath of loggingMap.paths) {
      loggingPath.events = loggingPath.events.filter(
        (eventName) => eventName !== 'qc.lifecycle_surface_checked',
      );
    }
    const loggingMapPath = path.join(
      evidenceDir,
      'missing-graph-event-logging.json',
    );
    writeJson(loggingMapPath, loggingMap);

    const result = runNodeScript('scripts/qc/validate-journey-qc.mjs', [], {
      MEKSTATION_QC_LOGGING_MAP_PATH: loggingMapPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'Graph log event qc.lifecycle_surface_checked is missing from logging map events',
    );
  });

  it('fails validation when a required journey lacks UI flow coverage', () => {
    const shell = readJson<{
      flows: Array<{ journeyId: string }>;
    }>(path.join(repoRoot, 'src/qc/gameplayUiFlowShell.json'));
    shell.flows = shell.flows.filter(
      (flow) => flow.journeyId !== 'campaign-long',
    );
    const shellPath = path.join(evidenceDir, 'missing-ui-flow.json');
    writeJson(shellPath, shell);

    const result = runNodeScript('scripts/qc/validate-journey-qc.mjs', [], {
      MEKSTATION_UI_FLOW_SHELL_PATH: shellPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'UI flow shell missing required journey campaign-long',
    );
  });

  it('fails validation when a UI flow references an unknown journey', () => {
    const shell = readJson<{
      flows: Array<{ journeyId: string; qcCommand: string }>;
    }>(path.join(repoRoot, 'src/qc/gameplayUiFlowShell.json'));
    shell.flows[0] = {
      ...shell.flows[0],
      journeyId: 'unknown-journey',
      qcCommand: 'npm.cmd run qc:journeys -- --journey=unknown-journey',
    };
    const shellPath = path.join(evidenceDir, 'unknown-ui-flow.json');
    writeJson(shellPath, shell);

    const result = runNodeScript('scripts/qc/validate-journey-qc.mjs', [], {
      MEKSTATION_UI_FLOW_SHELL_PATH: shellPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'UI flow shell references unknown journey unknown-journey',
    );
  });

  it('fails validation when a UI checkpoint route has no page template', () => {
    const shell = readJson<{
      flows: Array<{
        checkpoints: Array<{ href: string }>;
      }>;
    }>(path.join(repoRoot, 'src/qc/gameplayUiFlowShell.json'));
    shell.flows[0]!.checkpoints[0]!.href = '/gameplay/not-a-real-route';
    const shellPath = path.join(evidenceDir, 'bad-route-ui-flow.json');
    writeJson(shellPath, shell);

    const result = runNodeScript('scripts/qc/validate-journey-qc.mjs', [], {
      MEKSTATION_UI_FLOW_SHELL_PATH: shellPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'UI flow character-build: checkpoint pilot-create route /gameplay/not-a-real-route does not match a page template',
    );
  });

  it('fails validation when a required UI flow checkpoint is missing', () => {
    const shell = readJson<{
      flows: Array<{
        journeyId: string;
        checkpoints: Array<{ id: string }>;
      }>;
    }>(path.join(repoRoot, 'src/qc/gameplayUiFlowShell.json'));
    const contractFlow = shell.flows.find(
      (flow) => flow.journeyId === 'contract-campaign',
    );
    expect(contractFlow).toBeDefined();
    contractFlow!.checkpoints = contractFlow!.checkpoints.filter(
      (checkpoint) => checkpoint.id !== 'salvage',
    );
    const shellPath = path.join(evidenceDir, 'missing-checkpoint-ui-flow.json');
    writeJson(shellPath, shell);

    const result = runNodeScript('scripts/qc/validate-journey-qc.mjs', [], {
      MEKSTATION_UI_FLOW_SHELL_PATH: shellPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'UI flow contract-campaign: missing required checkpoint salvage in the expected route order.',
    );
  });

  it('fails validation when a UI flow primary action label is missing', () => {
    const shell = readJson<{
      flows: Array<{
        journeyId: string;
        primaryAction: { label: string };
      }>;
    }>(path.join(repoRoot, 'src/qc/gameplayUiFlowShell.json'));
    shell.flows[0]!.primaryAction.label = '';
    const shellPath = path.join(evidenceDir, 'bad-primary-action-ui-flow.json');
    writeJson(shellPath, shell);

    const result = runNodeScript('scripts/qc/validate-journey-qc.mjs', [], {
      MEKSTATION_UI_FLOW_SHELL_PATH: shellPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'UI flow character-build: primaryAction label is required.',
    );
  });

  it('prints a focused UI flow shell inspection for one journey', () => {
    const result = runNodeScript('scripts/qc/inspect-ui-flow-shell.mjs', [
      '--journey=contract-campaign',
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('# Gameplay UI flow shell');
    expect(result.stdout).toContain('Contract campaign scenario');
    expect(result.stdout).toContain('QC command: npm.cmd run qc:journeys');
    expect(result.stdout).toContain('Salvage [both]');
    expect(result.stdout).toContain('Command-screen checkpoints:');
    expect(result.stdout).toContain('GM log redaction [gm] -> gm-log');
  });

  it('emits JSON UI flow shell inspection for automation', () => {
    const result = runNodeScript('scripts/qc/inspect-ui-flow-shell.mjs', [
      '--journey=campaign-long',
      '--json',
    ]);

    expect(result.status).toBe(0);
    const inspection = JSON.parse(result.stdout) as {
      status: string;
      selectedFlowCount: number;
      flows: Array<{
        checkpointIds: string[];
        commandScreenCheckpoints: Array<{ id: string; uiCheckpointId: string }>;
        qcCommand: string;
      }>;
    };
    expect(inspection.status).toBe('pass');
    expect(inspection.selectedFlowCount).toBe(1);
    expect(inspection.flows[0]?.qcCommand).toContain(
      'qc:campaign-long:stability',
    );
    expect(inspection.flows[0]?.checkpointIds).toEqual(
      expect.arrayContaining(['campaign-base', 'starmap', 'campaign-log']),
    );
    expect(inspection.flows[0]?.commandScreenCheckpoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'finance-drift-command',
          uiCheckpointId: 'finances',
        }),
      ]),
    );
  });

  it('reports lifecycle QC proof status for every registry surface', () => {
    const result = runNodeScript('scripts/qc/report-lifecycle-qc-status.mjs', [
      '--json',
    ]);

    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as {
      surfaceCount: number;
      blockerCount: number;
      surfaces: Array<{
        surfaceId: string;
        diagnosticEvents: string[];
        graph: { validatedBy: number; produces: number };
      }>;
    };
    expect(report.surfaceCount).toBe(27);
    expect(report.blockerCount).toBe(0);
    expect(report.surfaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          surfaceId: 'app-shell-navigation',
          diagnosticEvents: expect.arrayContaining([
            'qc.lifecycle_surface_checked',
          ]),
          graph: expect.objectContaining({
            produces: expect.any(Number),
            validatedBy: expect.any(Number),
          }),
        }),
        expect.objectContaining({
          surfaceId: 'maintenance-code-health',
        }),
      ]),
    );
  });

  it('rejects malformed integer journey parameter overrides before writing evidence', () => {
    const result = runNodeScript('scripts/qc/run-journey-scenarios.mjs', [
      '--journey=campaign-short',
      '--contracts=abc',
      '--run-id=test-bad-contracts',
      `--evidence-dir=${evidenceDir}`,
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      '[qc:journeys] campaign-short: invalid parameter contracts=abc; expected an integer.',
    );
    expect(
      fs.existsSync(
        path.join(evidenceDir, 'test-bad-contracts', 'result.json'),
      ),
    ).toBe(false);
  });

  it('rejects out-of-range integer journey parameter overrides before writing evidence', () => {
    const result = runNodeScript('scripts/qc/run-journey-scenarios.mjs', [
      '--journey=campaign-short',
      '--contracts=1',
      '--run-id=test-short-campaign-too-short',
      `--evidence-dir=${evidenceDir}`,
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      '[qc:journeys] campaign-short: invalid parameter contracts=1; expected an integer >= 3.',
    );
    expect(
      fs.existsSync(
        path.join(evidenceDir, 'test-short-campaign-too-short', 'result.json'),
      ),
    ).toBe(false);
  });

  it('rejects invalid enum journey parameter overrides before writing evidence', () => {
    const result = runNodeScript('scripts/qc/run-journey-scenarios.mjs', [
      '--journey=mek-build',
      '--unitTechBase=NOT_REAL',
      '--run-id=test-bad-tech-base',
      `--evidence-dir=${evidenceDir}`,
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      '[qc:journeys] mek-build: invalid parameter unitTechBase=NOT_REAL; expected one of INNER_SPHERE, CLAN, MIXED.',
    );
    expect(
      fs.existsSync(
        path.join(evidenceDir, 'test-bad-tech-base', 'result.json'),
      ),
    ).toBe(false);
  });

  it('rejects unknown journey parameter overrides before writing evidence', () => {
    const result = runNodeScript('scripts/qc/run-journey-scenarios.mjs', [
      '--journey=mek-build',
      '--unitTechBaseTypo=CLAN',
      '--run-id=test-unknown-parameter',
      `--evidence-dir=${evidenceDir}`,
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      '[qc:journeys] Unknown journey parameter unitTechBaseTypo for selected journey(s): mek-build.',
    );
    expect(
      fs.existsSync(
        path.join(evidenceDir, 'test-unknown-parameter', 'result.json'),
      ),
    ).toBe(false);
  });

  it('preserves valid journey parameter overrides in run-plan and generated evidence', () => {
    const result = runNodeScript('scripts/qc/run-journey-scenarios.mjs', [
      '--journey=mek-build',
      '--era=3050',
      '--unitTechBase=CLAN',
      '--weight-class=Heavy',
      '--run-id=test-mek-valid-overrides',
      `--evidence-dir=${evidenceDir}`,
    ]);

    expect(result.status).toBe(0);
    const runPlan = readJson<{
      journeys: Array<{
        resolvedParameters: {
          era: number;
          unitTechBase: string;
          'weight-class': string;
        };
      }>;
    }>(path.join(evidenceDir, 'test-mek-valid-overrides', 'run-plan.json'));
    const generatedInput = readJson<{
      era: number;
      unitTechBase: string;
      weightClass: string;
      parameters: {
        era: number;
        unitTechBase: string;
        'weight-class': string;
      };
    }>(
      path.join(
        evidenceDir,
        'test-mek-valid-overrides',
        'mek-build',
        '1',
        'generated',
        'battlemech-input.json',
      ),
    );

    expect(runPlan.journeys[0]?.resolvedParameters).toMatchObject({
      era: 3050,
      unitTechBase: 'CLAN',
      'weight-class': 'Heavy',
    });
    expect(generatedInput).toMatchObject({
      era: 3050,
      unitTechBase: 'CLAN',
      weightClass: 'Heavy',
      parameters: {
        era: 3050,
        unitTechBase: 'CLAN',
        'weight-class': 'Heavy',
      },
    });
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
            executionProofCommands: string[];
          }>;
        }>;
      }>;
    }>(path.join(evidenceDir, 'test-combat', 'result.json'));
    expect(result.status).toBe('pass');
    expect(result.journeys[0]?.attempts[0]?.terminalState).toBe(
      'combat-complete',
    );
    expect(result.executionBackingSummary.syntheticSteps).toBe(0);
    expect(result.executionBackingSummary.totalSteps).toBe(3);
    expect(result.journeys[0]?.attempts[0]?.steps[0]).toMatchObject({
      executionBacking: 'browser-command',
      syntheticBacking: false,
      executionProofCommands: [
        'npm.cmd run verify:qc:encounter-combat-continuity',
      ],
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

    const tacticalLogs = runNodeScript('scripts/qc/search-journey-logs.mjs', [
      '--run-id=latest',
      '--event=tactical.action_rejected',
      '--json',
      `--evidence-dir=${evidenceDir}`,
    ]);
    expect(tacticalLogs.status).toBe(0);
    const tacticalEntries = JSON.parse(tacticalLogs.stdout) as Array<{
      fingerprint: string;
      metadata: {
        triage: {
          actor: string;
          action: string;
          stateBefore: { journeyId: string; stepId: string };
          stateAfter: { status: string; syntheticBacking: boolean };
          ruleDecision: { outcome: string; reason: string };
          validationResult: { status: string; event: string };
          warnings: string[];
          evidenceRefs: string[];
          nextDebuggingHint: string;
        };
      };
    }>;
    expect(tacticalEntries[0]).toMatchObject({
      metadata: {
        triage: {
          actor: 'player-side-a',
          action: 'move-through-blocked-hex',
          stateBefore: {
            journeyId: 'combat-1v1',
            stepId: 'preview-invalid-action',
          },
          stateAfter: {
            status: 'pass',
            syntheticBacking: false,
          },
          ruleDecision: {
            outcome: 'rejected',
            reason:
              'Destination is blocked by occupied terrain in the generated test plan.',
          },
          validationResult: {
            status: 'pass',
            event: 'tactical.action_rejected',
          },
        },
      },
    });
    expect(tacticalEntries[0]?.fingerprint).toMatch(/^[a-f0-9]{8}$/);
    expect(tacticalEntries[0]?.metadata.triage.warnings[0]).toContain(
      'Destination is blocked',
    );
    expect(tacticalEntries[0]?.metadata.triage.evidenceRefs[0]).toContain(
      'tactical-rejection.json',
    );

    const fingerprintLogs = runNodeScript(
      'scripts/qc/search-journey-logs.mjs',
      [
        '--run-id=latest',
        `--fingerprint=${tacticalEntries[0]?.fingerprint}`,
        '--json',
        `--evidence-dir=${evidenceDir}`,
      ],
    );
    expect(fingerprintLogs.status).toBe(0);
    expect(JSON.parse(fingerprintLogs.stdout)).toHaveLength(1);

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
    expect(report).toContain('- Synthetic-backed steps: 0/3');
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

  it('rejects long-campaign stability runs outside the supported contract range', () => {
    const runResult = runNodeScript(
      'scripts/qc/validate-long-campaign-stability.mjs',
      [
        '--seed=42',
        '--contracts=5',
        '--runs=2',
        '--run-id=test-long-campaign-bad-contracts',
        `--evidence-dir=${evidenceDir}`,
      ],
    );

    expect(runResult.status).toBe(1);
    expect(runResult.stderr).toContain(
      'Long-campaign stability requires --contracts between 6 and 10',
    );
  });

  it('writes long-campaign stability evidence with stable digests and save round trips', () => {
    const runResult = runNodeScript(
      'scripts/qc/validate-long-campaign-stability.mjs',
      [
        '--seed=42',
        '--contracts=10',
        '--runs=2',
        '--run-id=test-long-campaign-stability',
        `--evidence-dir=${evidenceDir}`,
      ],
    );

    expect(runResult.status).toBe(0);
    expect(runResult.stdout).toContain(
      '[qc:campaign-long:stability] status: pass',
    );

    const manifest = readJson<{
      status: string;
      contracts: number;
      runs: number;
      drift: unknown[];
      artifactComparisons: Array<{
        role: string;
        attempts: Array<{
          status: string;
          digest: string;
          baselineDigest: string;
        }>;
      }>;
      saveRoundTrips: Array<{ label: string; status: string }>;
      uiFlow: {
        status: string;
        browserExecuted: boolean;
        qcCommand: string;
        checkpoints: Array<{ id: string }>;
      };
    }>(
      path.join(
        evidenceDir,
        'test-long-campaign-stability',
        'stability-manifest.json',
      ),
    );
    expect(manifest).toMatchObject({
      status: 'pass',
      contracts: 10,
      runs: 2,
      drift: [],
      uiFlow: {
        status: 'pass',
        browserExecuted: false,
      },
    });
    expect(manifest.artifactComparisons.map((entry) => entry.role)).toEqual([
      'campaign-sequence',
      'campaign-result',
      'campaign-economy',
    ]);
    expect(
      manifest.artifactComparisons.every((comparison) =>
        comparison.attempts.every(
          (attempt) =>
            attempt.status === 'pass' &&
            attempt.digest === attempt.baselineDigest,
        ),
      ),
    ).toBe(true);
    expect(manifest.saveRoundTrips).toHaveLength(8);
    expect(
      manifest.saveRoundTrips.every((roundTrip) => roundTrip.status === 'pass'),
    ).toBe(true);
    expect(manifest.uiFlow.qcCommand).toContain('qc:campaign-long:stability');
    expect(
      manifest.uiFlow.checkpoints.map((checkpoint) => checkpoint.id),
    ).toEqual([
      'campaign-base',
      'starmap',
      'medical',
      'salvage',
      'repair',
      'finances',
      'campaign-log',
    ]);

    const bugs = readJson<unknown[]>(
      path.join(evidenceDir, 'test-long-campaign-stability', 'bugs.json'),
    );
    expect(bugs).toEqual([]);

    const logs = runNodeScript('scripts/qc/search-journey-logs.mjs', [
      '--run-id=latest',
      '--event=campaign.stability_checked',
      `--evidence-dir=${evidenceDir}`,
    ]);
    expect(logs.status).toBe(0);
    expect(logs.stdout).toContain('campaign.stability_checked');
  });

  it('fails long-campaign stability when normalized artifact drift is detected', () => {
    const runResult = runNodeScript(
      'scripts/qc/validate-long-campaign-stability.mjs',
      [
        '--seed=42',
        '--contracts=10',
        '--runs=2',
        '--run-id=test-long-campaign-drift',
        '--inject-stability-drift=campaign-economy:2',
        `--evidence-dir=${evidenceDir}`,
      ],
    );

    expect(runResult.status).toBe(1);
    expect(runResult.stdout).toContain(
      '[qc:campaign-long:stability] status: fail',
    );

    const manifest = readJson<{
      status: string;
      drift: Array<{
        type: string;
        role: string;
        attempt: number;
        baselineDigest: string;
        actualDigest: string;
      }>;
    }>(
      path.join(
        evidenceDir,
        'test-long-campaign-drift',
        'stability-manifest.json',
      ),
    );
    expect(manifest.status).toBe('fail');
    expect(manifest.drift).toHaveLength(1);
    expect(manifest.drift[0]).toMatchObject({
      type: 'digest-mismatch',
      role: 'campaign-economy',
      attempt: 2,
    });
    expect(manifest.drift[0]?.actualDigest).not.toBe(
      manifest.drift[0]?.baselineDigest,
    );

    const bugs = readJson<
      Array<{
        severity: string;
        summary: string;
        triage?: { failureCause: string };
      }>
    >(path.join(evidenceDir, 'test-long-campaign-drift', 'bugs.json'));
    expect(bugs).toHaveLength(1);
    expect(bugs[0]).toMatchObject({
      severity: 'high',
      summary: 'campaign-economy digest drifted on attempt 2.',
    });
    expect(bugs[0]?.triage?.failureCause).toContain(
      'campaign-economy digest drifted',
    );

    const logs = runNodeScript('scripts/qc/search-journey-logs.mjs', [
      '--run-id=latest',
      '--event=campaign.stability_drift_detected',
      `--evidence-dir=${evidenceDir}`,
    ]);
    expect(logs.status).toBe(0);
    expect(logs.stdout).toContain('campaign.stability_drift_detected');

    const reportedBugs = runNodeScript('scripts/qc/report-journey-bugs.mjs', [
      '--since=latest',
      '--min-severity=medium',
      `--evidence-dir=${evidenceDir}`,
    ]);
    expect(reportedBugs.status).toBe(0);
    expect(reportedBugs.stdout).toContain(
      'campaign-economy digest drifted on attempt 2.',
    );
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
    expect(bugs.stdout).toContain('# Journey bugs (1)');
    expect(bugs.stdout).toContain(
      'Journey step failed: combat-1v1/resolve-combat',
    );
    expect(bugs.stdout).not.toContain(
      '- [medium] combat-1v1: Injected failure for combat-1v1/resolve-combat',
    );
    expect(bugs.stdout).toContain('actor: combat-engine');
    expect(bugs.stdout).toContain('action: movement-preview,attack-resolution');
    expect(bugs.stdout).toContain(
      'state before: journey=combat-1v1 step=resolve-combat attempt=1 module=combat expected=combat-complete',
    );
    expect(bugs.stdout).toContain(
      'state after: status=fail terminal=combat-complete artifacts=0 backing=domain-command',
    );
    expect(bugs.stdout).toContain(
      'rule: blocked via journey-qc - Injected failure for combat-1v1/resolve-combat',
    );
    expect(bugs.stdout).toContain(
      'validation: fail event=journey.step_failed required=true failureKind=injected-failure',
    );
    expect(bugs.stdout).toContain(
      'failure cause: Injected failure for combat-1v1/resolve-combat',
    );
    expect(bugs.stdout).toContain('logs: ');

    const bugsJson = runNodeScript('scripts/qc/report-journey-bugs.mjs', [
      '--since=latest',
      '--min-severity=medium',
      '--json',
      `--evidence-dir=${evidenceDir}`,
    ]);
    expect(bugsJson.status).toBe(0);
    const bugPackets = JSON.parse(bugsJson.stdout) as Array<{
      severity: string;
      summary: string;
      triage?: {
        logFingerprints: string[];
      };
    }>;
    expect(bugPackets).toHaveLength(1);
    expect(bugPackets[0]).toMatchObject({
      severity: 'high',
      summary: 'Journey step failed: combat-1v1/resolve-combat',
    });
    expect(bugPackets[0]?.triage?.logFingerprints[0]).toMatch(/^[a-f0-9]{8}$/);

    const extractionLogs = runNodeScript('scripts/qc/search-journey-logs.mjs', [
      '--run-id=latest',
      '--event=bug.candidate_extracted',
      '--json',
      `--evidence-dir=${evidenceDir}`,
    ]);
    expect(extractionLogs.status).toBe(0);
    const extractionEntries = JSON.parse(extractionLogs.stdout) as Array<{
      fingerprint: string;
      metadata: {
        bugCount: number;
        gatedBugCount: number;
        severityGate: string;
        triage: {
          actor: string;
          action: string;
          stateAfter: { bugCount: number; gatedBugCount: number };
          ruleDecision: { outcome: string };
          evidenceRefs: string[];
          nextDebuggingHint: string;
        };
      };
    }>;
    expect(extractionEntries).toHaveLength(1);
    expect(extractionEntries[0]).toMatchObject({
      metadata: {
        bugCount: 1,
        gatedBugCount: 1,
        severityGate: 'medium',
        triage: {
          actor: 'journey-bug-extractor',
          action: 'extract-bug-candidates',
          stateAfter: { bugCount: 1, gatedBugCount: 1 },
          ruleDecision: { outcome: 'blocked' },
        },
      },
    });
    expect(extractionEntries[0]?.metadata.triage.evidenceRefs).toEqual(
      expect.arrayContaining([
        expect.stringContaining('bugs.json'),
        expect.stringContaining('report.md'),
      ]),
    );
    expect(extractionEntries[0]?.metadata.triage.nextDebuggingHint).toContain(
      'qc:journeys:bugs',
    );

    const extractionFingerprint = extractionEntries[0]?.fingerprint;
    const extractionByFingerprint = runNodeScript(
      'scripts/qc/search-journey-logs.mjs',
      [
        '--run-id=latest',
        `--fingerprint=${extractionFingerprint}`,
        '--json',
        `--evidence-dir=${evidenceDir}`,
      ],
    );
    expect(extractionByFingerprint.status).toBe(0);
    const fingerprintEntries = JSON.parse(
      extractionByFingerprint.stdout,
    ) as Array<{ event: string; metadata: { triage?: { actor: string } } }>;
    expect(fingerprintEntries).toHaveLength(1);
    expect(fingerprintEntries[0]).toMatchObject({
      event: 'bug.candidate_extracted',
      metadata: { triage: { actor: 'journey-bug-extractor' } },
    });
  });

  it('passes strict backing-required runs for command-backed combat proof', () => {
    for (const journeyId of ['combat-1v1', 'combat-4v4']) {
      const runId = `test-${journeyId}-domain-backed`;
      const args = [
        `--journey=${journeyId}`,
        `--run-id=${runId}`,
        '--require-domain-backed',
        `--evidence-dir=${evidenceDir}`,
      ];
      if (journeyId === 'combat-4v4') {
        args.splice(2, 0, '--player-units=4', '--opponent-units=4');
      }

      const runResult = runNodeScript(
        'scripts/qc/run-journey-scenarios.mjs',
        args,
      );
      expect(runResult.status).toBe(0);

      const result = readJson<{
        status: string;
        executionBackingSummary: {
          missingRequiredBacking: number;
          syntheticSteps: number;
          totalSteps: number;
        };
        journeys: Array<{
          attempts: Array<{
            steps: Array<{
              syntheticBacking: boolean;
              executionBacking: string;
              executionProofCommands: string[];
            }>;
          }>;
        }>;
      }>(path.join(evidenceDir, runId, 'result.json'));
      expect(result.status).toBe('pass');
      expect(result.executionBackingSummary).toMatchObject({
        missingRequiredBacking: 0,
        syntheticSteps: 0,
        totalSteps: 3,
      });
      expect(
        result.journeys[0]?.attempts[0]?.steps.every(
          (step) =>
            step.syntheticBacking === false &&
            step.executionBacking !== 'synthetic-projection' &&
            step.executionProofCommands.length > 0,
        ),
      ).toBe(true);
    }
  });

  it('passes strict backing-required runs for promoted campaign proofs', () => {
    for (const journeyId of [
      'contract-campaign',
      'campaign-short',
      'campaign-long',
    ]) {
      const runId = `test-${journeyId}-domain-backed`;
      const args = [
        `--journey=${journeyId}`,
        `--run-id=${runId}`,
        '--require-domain-backed',
        `--evidence-dir=${evidenceDir}`,
      ];
      if (journeyId === 'campaign-long') {
        args.splice(2, 0, '--contracts=10');
      }

      const runResult = runNodeScript(
        'scripts/qc/run-journey-scenarios.mjs',
        args,
      );
      expect(runResult.status).toBe(0);

      const result = readJson<{
        status: string;
        executionBackingSummary: {
          missingRequiredBacking: number;
          syntheticSteps: number;
          totalSteps: number;
        };
        journeys: Array<{
          attempts: Array<{
            steps: Array<{
              syntheticBacking: boolean;
              executionBacking: string;
              executionProofCommands: string[];
            }>;
          }>;
        }>;
      }>(path.join(evidenceDir, runId, 'result.json'));
      expect(result.status).toBe('pass');
      expect(result.executionBackingSummary).toMatchObject({
        missingRequiredBacking: 0,
        syntheticSteps: 0,
        totalSteps: 3,
      });
      expect(
        result.journeys[0]?.attempts[0]?.steps.every(
          (step) =>
            step.syntheticBacking === false &&
            step.executionBacking !== 'synthetic-projection' &&
            step.executionProofCommands.length > 0,
        ),
      ).toBe(true);
    }
  });

  it('passes strict backing-required runs for promoted build journey proofs', () => {
    const promotedJourneys = [
      {
        journeyId: 'character-build',
        expectedSteps: 2,
        proofCommand: 'npm.cmd run verify:qc:character-build',
      },
      {
        journeyId: 'mek-build',
        expectedSteps: 2,
        proofCommand: 'npm.cmd run verify:qc:mek-build',
      },
    ];

    for (const { journeyId, expectedSteps, proofCommand } of promotedJourneys) {
      const runId = `test-${journeyId}-domain-backed`;
      const runResult = runNodeScript('scripts/qc/run-journey-scenarios.mjs', [
        `--journey=${journeyId}`,
        `--run-id=${runId}`,
        '--require-domain-backed',
        `--evidence-dir=${evidenceDir}`,
      ]);
      expect(runResult.status).toBe(0);

      const result = readJson<{
        status: string;
        executionBackingSummary: {
          missingRequiredBacking: number;
          syntheticSteps: number;
          totalSteps: number;
        };
        journeys: Array<{
          attempts: Array<{
            steps: Array<{
              syntheticBacking: boolean;
              executionBacking: string;
              executionProofCommands: string[];
            }>;
          }>;
        }>;
      }>(path.join(evidenceDir, runId, 'result.json'));
      const steps = result.journeys[0]?.attempts[0]?.steps ?? [];

      expect(result.status).toBe('pass');
      expect(result.executionBackingSummary).toMatchObject({
        missingRequiredBacking: 0,
        syntheticSteps: 0,
        totalSteps: expectedSteps,
      });
      expect(
        steps.every(
          (step) =>
            step.syntheticBacking === false &&
            step.executionBacking === 'hybrid-command' &&
            step.executionProofCommands.includes(proofCommand),
        ),
      ).toBe(true);
    }
  });

  it('fails strict backing-required runs while preserving bug evidence', () => {
    const catalog = readJson<{
      journeys: Array<{
        id: string;
        steps: Array<{
          syntheticBacking?: boolean;
          executionBacking?: string;
          executionEvidenceSource?: string;
          executionProofCommands?: string[];
        }>;
      }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-journey-scenarios.json'));
    const characterJourney = catalog.journeys.find(
      (journey) => journey.id === 'character-build',
    );
    expect(characterJourney).toBeDefined();
    for (const step of characterJourney!.steps) {
      delete step.syntheticBacking;
      delete step.executionBacking;
      delete step.executionEvidenceSource;
      delete step.executionProofCommands;
    }
    const syntheticCatalogPath = path.join(
      evidenceDir,
      'synthetic-character-catalog.json',
    );
    writeJson(syntheticCatalogPath, catalog);

    const runResult = runNodeScript(
      'scripts/qc/run-journey-scenarios.mjs',
      [
        '--journey=character-build',
        '--run-id=test-domain-backed-required',
        '--require-domain-backed',
        '--continue-on-error',
        `--evidence-dir=${evidenceDir}`,
      ],
      {
        MEKSTATION_JOURNEY_CATALOG_PATH: syntheticCatalogPath,
      },
    );
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
    expect(result.executionBackingSummary.missingRequiredBacking).toBe(2);
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
      'Missing non-synthetic execution backing: character-build/generate-character',
    );
    expect(bugs.stdout).toContain(
      'failure cause: Required non-synthetic execution backing missing for character-build/generate-character (synthetic-projection).',
    );

    const bugsJson = runNodeScript('scripts/qc/report-journey-bugs.mjs', [
      '--since=latest',
      '--min-severity=medium',
      '--json',
      `--evidence-dir=${evidenceDir}`,
    ]);
    expect(bugsJson.status).toBe(0);
    const bugPackets = JSON.parse(bugsJson.stdout) as Array<{
      stepId: string;
      triage?: {
        action: string;
        failureCause: string;
        logFingerprints: string[];
        nextDebuggingHint: string;
        validationResult: { status: string; failureKind: string };
      };
    }>;
    const generateCharacterBug = bugPackets.find(
      (bug) => bug.stepId === 'generate-character',
    );
    expect(generateCharacterBug?.triage).toMatchObject({
      action: 'character-generation',
      validationResult: {
        status: 'fail',
        failureKind: 'missing-required-execution-backing',
      },
    });
    expect(generateCharacterBug?.triage?.failureCause).toContain(
      'Required non-synthetic execution backing missing',
    );
    expect(generateCharacterBug?.triage?.logFingerprints[0]).toMatch(
      /^[a-f0-9]{8}$/,
    );
    expect(generateCharacterBug?.triage?.nextDebuggingHint).toContain(
      '--require-domain-backed',
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

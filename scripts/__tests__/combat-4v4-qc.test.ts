import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const repoRoot = process.cwd();
const NODE = process.execPath;

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runValidator(args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(
    NODE,
    [path.resolve(repoRoot, 'scripts/qc/validate-combat-4v4-qc.mjs'), ...args],
    {
      cwd: repoRoot,
      encoding: 'utf-8',
      env: { ...process.env, ...env },
    },
  );
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

describe('combat-4v4 QC validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-combat-4v4-qc-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('validates the current combat-4v4 QC manifest', () => {
    const result = runValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('packageScripts=3/3');
    expect(result.stdout).toContain('journey=1/1');
    expect(result.stdout).toContain('uiFlow=1/1');
    expect(result.stdout).toContain('errors=0');
  });

  it('emits automation-friendly JSON', () => {
    const result = runValidator(['--json']);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      status: string;
      journeyId: string;
      packageScripts: Array<{ scriptId: string }>;
      journey: { stepIds: string[] };
      uiFlow: { qcCommand: string; checkpointIds: string[] };
      graph: { requiredNodeCount: number; requiredEdgeCount: number };
    };

    expect(manifest.status).toBe('pass');
    expect(manifest.journeyId).toBe('combat-4v4');
    expect(manifest.packageScripts.map((entry) => entry.scriptId)).toEqual([
      'qc:combat-4v4:validate',
      'verify:qc:combat-4v4',
      'verify:qc',
    ]);
    expect(manifest.journey.stepIds).toEqual([
      'launch-lance-battle',
      'resolve-lance-combat',
      'persist-replay-reference',
    ]);
    expect(manifest.uiFlow.qcCommand).toBe(
      'npm.cmd run verify:qc:combat-4v4 -- --journey=combat-4v4',
    );
    expect(manifest.uiFlow.checkpointIds).toContain('replay');
    expect(manifest.graph).toEqual({
      requiredNodeCount: 3,
      requiredEdgeCount: 3,
    });
  });

  it('rejects missing global verify:qc wiring', () => {
    const packageJson = readJson<{
      scripts: Record<string, string>;
    }>(path.join(repoRoot, 'package.json'));
    packageJson.scripts['verify:qc'] = packageJson.scripts[
      'verify:qc'
    ]!.replace(' && npm run verify:qc:combat-4v4', '');
    const packageJsonPath = path.join(tempDir, 'package.json');
    writeJson(packageJsonPath, packageJson);

    const result = runValidator([], {
      MEKSTATION_PACKAGE_JSON_PATH: packageJsonPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'verify:qc must include verify:qc:combat-4v4',
    );
  });

  it('rejects synthetic journey catalog backing', () => {
    const catalog = readJson<{
      journeys: Array<{
        id: string;
        steps: Array<{ syntheticBacking?: boolean }>;
      }>;
    }>(path.join(repoRoot, 'docs/qc/mekstation-journey-scenarios.json'));
    const journey = catalog.journeys.find((entry) => entry.id === 'combat-4v4');
    expect(journey).toBeDefined();
    journey!.steps[0]!.syntheticBacking = true;
    const catalogPath = path.join(tempDir, 'journeys.json');
    writeJson(catalogPath, catalog);

    const result = runValidator([], {
      MEKSTATION_JOURNEY_CATALOG_PATH: catalogPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'combat-4v4/launch-lance-battle must declare syntheticBacking=false',
    );
  });

  it('rejects a UI flow command that bypasses the proof command', () => {
    const uiFlow = readJson<{
      flows: Array<{ journeyId: string; qcCommand: string }>;
    }>(path.join(repoRoot, 'src/qc/gameplayUiFlowShell.json'));
    const flow = uiFlow.flows.find((entry) => entry.journeyId === 'combat-4v4');
    expect(flow).toBeDefined();
    flow!.qcCommand =
      'npm.cmd run qc:journeys -- --journey=combat-4v4 --tier=smoke';
    const uiFlowPath = path.join(tempDir, 'ui-flow.json');
    writeJson(uiFlowPath, uiFlow);

    const result = runValidator([], {
      MEKSTATION_UI_FLOW_SHELL_PATH: uiFlowPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'combat-4v4 UI flow must include npm.cmd run verify:qc:combat-4v4',
    );
  });
});

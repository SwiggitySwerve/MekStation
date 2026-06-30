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
    [
      path.resolve(
        repoRoot,
        'scripts/qc/validate-playable-command-screen-slices.mjs',
      ),
      ...args,
    ],
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

describe('playable command screen slice QC validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-command-slices-qc-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('validates the current quick slice command wiring', () => {
    const result = runValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('slices=6/6');
    expect(result.stdout).toContain('errors=0');
    expect(result.stdout).toContain('warnings=0');
    expect(result.stdout).toContain('combat-command');
    expect(result.stdout).toContain('long-campaign-drift');
  });

  it('emits automation-friendly JSON for all required slices', () => {
    const result = runValidator(['--json']);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      status: string;
      selectedSliceIds: string[];
      slices: Array<{
        id: string;
        packageScript: string;
        anchors: string[];
        command: string;
        commands: string[];
      }>;
    };

    expect(manifest.status).toBe('pass');
    expect(manifest.selectedSliceIds).toEqual([
      'combat-command',
      'readiness-stable',
      'customizer-handoff',
      'starmap-logistics',
      'gm-redaction',
      'long-campaign-drift',
    ]);
    expect(manifest.slices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'starmap-logistics',
          packageScript: 'qc:command:starmap-logistics:quick',
          anchors: expect.arrayContaining([
            'src/lib/starmap/__tests__/starmapTravelPreview.test.ts',
          ]),
          command: expect.stringContaining(
            'useCampaignStore.travelToSystem.test.ts',
          ),
        }),
        expect.objectContaining({
          id: 'long-campaign-drift',
          commands: [
            expect.stringContaining('qc:campaign-long:validate'),
            expect.stringContaining(
              'qc:campaign-long:stability -- --seed=42 --contracts=10 --runs=2',
            ),
          ],
          command: expect.stringContaining(
            'qc:campaign-long:stability -- --seed=42 --contracts=10 --runs=2',
          ),
        }),
      ]),
    );
  });

  it('dry-runs a selected slice without executing Jest', () => {
    const result = runValidator([
      '--run',
      '--dry-run',
      '--slice=customizer-handoff',
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('slices=1/6');
    expect(result.stdout).toContain('customizer-handoff');
    expect(result.stdout).toContain('CampaignRefitCommandBar.test.tsx');
  });

  it('rejects unknown slice names before running commands', () => {
    const result = runValidator(['--run', '--slice=not-real']);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Unknown playable command slice not-real');
  });

  it('rejects missing package aliases for the quick slice commands', () => {
    const packageJson = readJson<{
      scripts: Record<string, string>;
    }>(path.join(repoRoot, 'package.json'));
    delete packageJson.scripts['qc:command:gm-redaction:quick'];
    const packageJsonPath = path.join(tempDir, 'package.json');
    writeJson(packageJsonPath, packageJson);

    const result = runValidator([], {
      MEKSTATION_PACKAGE_JSON_PATH: packageJsonPath,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'package.json must define qc:command:gm-redaction:quick',
    );
  });
});

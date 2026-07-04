import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';

const repoRoot = process.cwd();
const NODE = process.execPath;
const expectedEvidenceScreens = [
  '01-starmap-logistics-preview.png',
  '02-starmap-logistics-after-commit.png',
  '03-mission-readiness-roster.png',
  '04-campaign-refit-customizer.png',
  '05-readiness-return-after-refit-save.png',
  '06-gm-ledger-preview.png',
  '07-gm-ledger-approved-public-private.png',
  '08-gm-ledger-guest-redacted.png',
  '09-tactical-command-map-movement.png',
  '10-networked-host-gm-authority.png',
  '11-networked-guest-public-result.png',
];

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

async function writeEvidenceScreenshot(
  filePath: string,
  seed: number,
): Promise<void> {
  const width = 1440;
  const height = 1000;
  const channels = 4;
  const data = Buffer.alloc(width * height * channels);

  for (let index = 0; index < width * height; index += 1) {
    const x = index % width;
    const y = Math.floor(index / width);
    const offset = index * channels;
    data[offset] = (x + seed * 17) % 256;
    data[offset + 1] = (y + seed * 31) % 256;
    data[offset + 2] = (x + y + seed * 47) % 256;
    data[offset + 3] = 255;
  }

  await sharp(data, {
    raw: {
      channels,
      height,
      width,
    },
  })
    .png()
    .toFile(filePath);
}

async function writeEvidenceDir(evidenceDir: string): Promise<void> {
  fs.mkdirSync(evidenceDir, { recursive: true });
  for (const [index, file] of expectedEvidenceScreens.entries()) {
    await writeEvidenceScreenshot(path.join(evidenceDir, file), index + 1);
  }
  writeJson(path.join(evidenceDir, 'command-screen-evidence.json'), {
    schemaVersion: 1,
    buildMode: 'development',
    proofMode: 'dev-only',
    capturedAt: '2026-06-30T18:00:00.000Z',
    screens: expectedEvidenceScreens.map((file) => ({
      file,
      readyMarker:
        file.startsWith('06-') ||
        file.startsWith('07-') ||
        file.startsWith('08-')
          ? 'gm-ledger-control-plane'
          : 'command-screen-hydrated',
      routeKind:
        file.startsWith('10-') || file.startsWith('11-')
          ? 'harness'
          : 'product',
    })),
  });
  // Provenance README (re-audit H2/H3): the validator now requires the
  // generated summary beside the PNGs — buildMode named, harness frames
  // labeled — mirroring what the capture spec writes.
  fs.writeFileSync(
    path.join(evidenceDir, 'README.md'),
    [
      '# Command-screen evidence provenance',
      '',
      '- Build mode: `development` / proof mode: `dev-only`',
      '',
      '| Screen | Kind |',
      '| --- | --- |',
      ...expectedEvidenceScreens.map(
        (file) =>
          `| ${file} | ${
            file.startsWith('10-') || file.startsWith('11-')
              ? '**E2E HARNESS**'
              : 'product'
          } |`,
      ),
      '',
    ].join('\n'),
  );
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

  it('accepts an explicit hydrated command-screen evidence directory', async () => {
    const evidenceDir = path.join(tempDir, 'feature-screens');
    await writeEvidenceDir(evidenceDir);

    const result = runValidator([
      '--json',
      `--evidence-dir=${evidenceDir}`,
      '--require-evidence',
    ]);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      evidence: {
        status: string;
        expectedScreens: string[];
        required: boolean;
      };
    };
    expect(manifest.evidence).toMatchObject({
      status: 'pass',
      expectedScreens: expectedEvidenceScreens,
      required: true,
    });
  });

  it('rejects failure screenshots and spinner-sized command evidence', async () => {
    const evidenceDir = path.join(tempDir, 'bad-feature-screens');
    await writeEvidenceDir(evidenceDir);
    fs.writeFileSync(
      path.join(evidenceDir, '06-gm-ledger-preview.png'),
      Buffer.from('Loading MekStation...'),
    );
    await writeEvidenceScreenshot(
      path.join(evidenceDir, 'failure-tactical.png'),
      99,
    );

    const result = runValidator([
      `--evidence-dir=${evidenceDir}`,
      '--require-evidence',
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'Failure screenshot must not be kept in passing evidence: failure-tactical.png',
    );
    expect(result.stdout).toContain(
      '06-gm-ledger-preview.png is too small to prove hydrated product UI',
    );
  });

  it('requires explicit build and product-route metadata for evidence', async () => {
    const evidenceDir = path.join(tempDir, 'metadata-feature-screens');
    await writeEvidenceDir(evidenceDir);
    const manifestPath = path.join(evidenceDir, 'command-screen-evidence.json');
    const manifest = readJson<{
      buildMode: string;
      proofMode: string;
      screens: Array<{ file: string; routeKind: string }>;
    }>(manifestPath);
    manifest.proofMode = 'production-signoff';
    const gmPreview = manifest.screens.find(
      (screen) => screen.file === '06-gm-ledger-preview.png',
    );
    if (gmPreview) gmPreview.routeKind = 'harness';
    writeJson(manifestPath, manifest);

    const result = runValidator([
      `--evidence-dir=${evidenceDir}`,
      '--require-evidence',
    ]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain(
      'Development evidence must be explicitly labeled proofMode=dev-only',
    );
    expect(result.stdout).toContain(
      '06-gm-ledger-preview.png must be captured from a product route',
    );
  });
});

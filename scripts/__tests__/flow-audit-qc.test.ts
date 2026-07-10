import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// @requirement flow-audit-routines/PR-01
// @requirement journey-qc/PR-01
const repoRoot = process.cwd();
const NODE = process.execPath;
const validatorPath = path.resolve(
  repoRoot,
  'scripts/qc/validate-flow-audit.mjs',
);

interface IFixtureCheckpoint {
  readonly name: string;
  readonly holdSafe?: boolean;
}

interface IFixtureFlow {
  readonly id: string;
  readonly subsystems?: readonly string[];
  readonly checkpoints: readonly IFixtureCheckpoint[];
}

// Real OS tempdir per test (not a fixed path under the repo) so parallel
// jest workers can never collide on the same fixture files.
function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// Matches the real runner/validator's own JSON-file-writing convention
// (trailing newline) so fixtures look like files a real run would produce.
function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Build a minimal, valid flow-audit manifest fixture. Defaults to one flow
 * per subsystem tag (mirroring the real registry's coverage) so tests that
 * only care about a different failure mode don't also trip the subsystem-
 * coverage check.
 */
function buildManifest(overrides: readonly IFixtureFlow[]): IFixtureFlow[] {
  const bySubsystemDefault = [
    {
      id: 'default-navigation',
      subsystems: ['navigation'],
      checkpoints: [{ name: 'a' }],
    },
    {
      id: 'default-combat',
      subsystems: ['combat'],
      checkpoints: [{ name: 'a' }],
    },
    {
      id: 'default-economy',
      subsystems: ['economy'],
      checkpoints: [{ name: 'a' }],
    },
    {
      id: 'default-maintenance',
      subsystems: ['maintenance'],
      checkpoints: [{ name: 'a' }],
    },
    {
      id: 'default-personnel',
      subsystems: ['personnel'],
      checkpoints: [{ name: 'a' }],
    },
    {
      id: 'default-experience',
      subsystems: ['experience'],
      checkpoints: [{ name: 'a' }],
    },
  ];
  return [...bySubsystemDefault, ...overrides];
}

/**
 * Build a `flow-audits.spec.ts`-shaped fixture source: a `FLOW_STAGES`
 * object literal covering every fixture flow's checkpoints as trivial arrow
 * functions, plus (by default) the manifest-driven generation loop the
 * validator checks for.
 */
function buildSpecSource(
  flows: readonly IFixtureFlow[],
  options: {
    includeLoop?: boolean;
    extraStages?: Record<string, readonly string[]>;
  } = {},
): string {
  const { includeLoop = true, extraStages = {} } = options;
  const stageEntries = flows.map((flow) => {
    const checkpointEntries = flow.checkpoints
      .map((checkpoint) => `    '${checkpoint.name}': async (env) => {},`)
      .join('\n');
    return `  '${flow.id}': {\n${checkpointEntries}\n  },`;
  });
  for (const [flowId, checkpointNames] of Object.entries(extraStages)) {
    const checkpointEntries = checkpointNames
      .map((name) => `    '${name}': async (env) => {},`)
      .join('\n');
    stageEntries.push(`  '${flowId}': {\n${checkpointEntries}\n  },`);
  }

  const loop = includeLoop
    ? `\nfor (const flow of FLOW_MANIFEST) {\n  test(flow.id, async ({ browser }) => {});\n}\n`
    : '';

  return (
    `import { FLOW_MANIFEST } from './flows/manifest';\n\n` +
    `const FLOW_STAGES: Record<string, Record<string, unknown>> = {\n${stageEntries.join('\n\n')}\n};\n` +
    loop
  );
}

// Runs the real validator as a subprocess (not an in-process import) so
// these tests exercise the exact CLI entry point CI/pre-commit invoke,
// including its process.exit() codes and stdout/stderr formatting.
function runValidator(env: NodeJS.ProcessEnv = {}, args: string[] = []) {
  return spawnSync(NODE, [validatorPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    env: { ...process.env, ...env },
  });
}

describe('Flow-audit registry validator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir('mekstation-flow-audit-qc-');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it('validates the current flow-audit registry (no overrides)', () => {
    const result = runValidator();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('flows=6');
    expect(result.stdout).toContain('subsystems=6/6');
    expect(result.stdout).toContain('errors=0');
    expect(result.stderr).toBe('');
  });

  it('emits automation-friendly JSON with full subsystem coverage for the current registry', () => {
    const result = runValidator({}, ['--json']);

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      status: string;
      flowCount: number;
      subsystemCoverage: Record<string, string[]>;
    };
    expect(manifest.status).toBe('pass');
    expect(manifest.flowCount).toBe(6);
    expect(Object.keys(manifest.subsystemCoverage).sort()).toEqual([
      'combat',
      'economy',
      'experience',
      'maintenance',
      'navigation',
      'personnel',
    ]);
    for (const flowIds of Object.values(manifest.subsystemCoverage)) {
      expect(flowIds.length).toBeGreaterThan(0);
    }
  });

  it('passes a well-formed fixture registry', () => {
    const flows = buildManifest([]);
    const manifestPath = path.join(tempDir, 'manifest.json');
    const specPath = path.join(tempDir, 'flow-audits.spec.ts');
    writeJson(manifestPath, flows);
    fs.writeFileSync(specPath, buildSpecSource(flows));

    const result = runValidator(
      {
        MEKSTATION_FLOW_MANIFEST_JSON_PATH: manifestPath,
        MEKSTATION_FLOW_AUDIT_SPEC_PATH: specPath,
      },
      ['--json'],
    );

    expect(result.status).toBe(0);
    const manifest = JSON.parse(result.stdout) as {
      status: string;
      errors: unknown[];
    };
    expect(manifest.status).toBe('pass');
    expect(manifest.errors).toEqual([]);
  });

  it('rejects a manifest with a duplicate flow id', () => {
    const flows = buildManifest([
      {
        id: 'dup-flow',
        subsystems: ['navigation'],
        checkpoints: [{ name: 'a' }],
      },
      {
        id: 'dup-flow',
        subsystems: ['navigation'],
        checkpoints: [{ name: 'a' }],
      },
    ]);
    const manifestPath = path.join(tempDir, 'manifest.json');
    const specPath = path.join(tempDir, 'flow-audits.spec.ts');
    writeJson(manifestPath, flows);
    fs.writeFileSync(specPath, buildSpecSource(flows));

    const result = runValidator(
      {
        MEKSTATION_FLOW_MANIFEST_JSON_PATH: manifestPath,
        MEKSTATION_FLOW_AUDIT_SPEC_PATH: specPath,
      },
      ['--json'],
    );

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ message: string }>;
    };
    expect(
      manifest.errors.some((e) => e.message.includes('Duplicate flow id')),
    ).toBe(true);
  });

  it('rejects a flow with zero checkpoints', () => {
    const flows = buildManifest([
      { id: 'empty-flow', subsystems: ['navigation'], checkpoints: [] },
    ]);
    const manifestPath = path.join(tempDir, 'manifest.json');
    const specPath = path.join(tempDir, 'flow-audits.spec.ts');
    writeJson(manifestPath, flows);
    fs.writeFileSync(specPath, buildSpecSource(flows));

    const result = runValidator(
      {
        MEKSTATION_FLOW_MANIFEST_JSON_PATH: manifestPath,
        MEKSTATION_FLOW_AUDIT_SPEC_PATH: specPath,
      },
      ['--json'],
    );

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ message: string }>;
    };
    expect(
      manifest.errors.some((e) => e.message.includes('zero checkpoints')),
    ).toBe(true);
  });

  it('rejects duplicate checkpoint names within one flow', () => {
    const flows = buildManifest([
      {
        id: 'dup-checkpoint-flow',
        subsystems: ['navigation'],
        checkpoints: [{ name: 'same' }, { name: 'same' }],
      },
    ]);
    const manifestPath = path.join(tempDir, 'manifest.json');
    const specPath = path.join(tempDir, 'flow-audits.spec.ts');
    writeJson(manifestPath, flows);
    fs.writeFileSync(specPath, buildSpecSource(flows));

    const result = runValidator(
      {
        MEKSTATION_FLOW_MANIFEST_JSON_PATH: manifestPath,
        MEKSTATION_FLOW_AUDIT_SPEC_PATH: specPath,
      },
      ['--json'],
    );

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ message: string }>;
    };
    expect(
      manifest.errors.some((e) =>
        e.message.includes('duplicate checkpoint "same"'),
      ),
    ).toBe(true);
  });

  it('rejects a registry missing coverage for a subsystem tag', () => {
    const flows = buildManifest([]).filter(
      (flow) => flow.id !== 'default-experience',
    );
    const manifestPath = path.join(tempDir, 'manifest.json');
    const specPath = path.join(tempDir, 'flow-audits.spec.ts');
    writeJson(manifestPath, flows);
    fs.writeFileSync(specPath, buildSpecSource(flows));

    const result = runValidator(
      {
        MEKSTATION_FLOW_MANIFEST_JSON_PATH: manifestPath,
        MEKSTATION_FLOW_AUDIT_SPEC_PATH: specPath,
      },
      ['--json'],
    );

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ message: string }>;
      subsystemCoverage: Record<string, string[]>;
    };
    expect(
      manifest.errors.some((e) =>
        e.message.includes('Subsystem tag "experience"'),
      ),
    ).toBe(true);
    expect(manifest.subsystemCoverage.experience).toEqual([]);
  });

  it('rejects a manifest flow with no FLOW_STAGES implementation in the spec', () => {
    const flows = buildManifest([
      {
        id: 'unimplemented-flow',
        subsystems: ['navigation'],
        checkpoints: [{ name: 'a' }],
      },
    ]);
    const manifestPath = path.join(tempDir, 'manifest.json');
    const specPath = path.join(tempDir, 'flow-audits.spec.ts');
    writeJson(manifestPath, flows);
    // Spec omits the extra flow entirely.
    fs.writeFileSync(specPath, buildSpecSource(buildManifest([])));

    const result = runValidator(
      {
        MEKSTATION_FLOW_MANIFEST_JSON_PATH: manifestPath,
        MEKSTATION_FLOW_AUDIT_SPEC_PATH: specPath,
      },
      ['--json'],
    );

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ message: string }>;
    };
    expect(
      manifest.errors.some(
        (e) =>
          e.message.includes('unimplemented-flow') &&
          e.message.includes('no FLOW_STAGES'),
      ),
    ).toBe(true);
  });

  it('rejects a spec FLOW_STAGES entry for a flow id not in the manifest', () => {
    const flows = buildManifest([]);
    const manifestPath = path.join(tempDir, 'manifest.json');
    const specPath = path.join(tempDir, 'flow-audits.spec.ts');
    writeJson(manifestPath, flows);
    fs.writeFileSync(
      specPath,
      buildSpecSource(flows, { extraStages: { 'orphaned-spec-flow': ['a'] } }),
    );

    const result = runValidator(
      {
        MEKSTATION_FLOW_MANIFEST_JSON_PATH: manifestPath,
        MEKSTATION_FLOW_AUDIT_SPEC_PATH: specPath,
      },
      ['--json'],
    );

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ message: string }>;
    };
    expect(
      manifest.errors.some(
        (e) =>
          e.message.includes('orphaned-spec-flow') &&
          e.message.includes('not registered'),
      ),
    ).toBe(true);
  });

  it('rejects a manifest checkpoint with no matching stage runner in the spec', () => {
    const flows = buildManifest([
      {
        id: 'missing-checkpoint-flow',
        subsystems: ['navigation'],
        checkpoints: [{ name: 'implemented' }, { name: 'forgotten' }],
      },
    ]);
    const manifestPath = path.join(tempDir, 'manifest.json');
    const specPath = path.join(tempDir, 'flow-audits.spec.ts');
    writeJson(manifestPath, flows);
    // Spec only implements one of the two checkpoints for this flow.
    const partialFlows = flows.map((flow) =>
      flow.id === 'missing-checkpoint-flow'
        ? { ...flow, checkpoints: [{ name: 'implemented' }] }
        : flow,
    );
    fs.writeFileSync(specPath, buildSpecSource(partialFlows));

    const result = runValidator(
      {
        MEKSTATION_FLOW_MANIFEST_JSON_PATH: manifestPath,
        MEKSTATION_FLOW_AUDIT_SPEC_PATH: specPath,
      },
      ['--json'],
    );

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ message: string }>;
    };
    expect(
      manifest.errors.some(
        (e) =>
          e.message.includes('"forgotten"') &&
          e.message.includes('no stage runner'),
      ),
    ).toBe(true);
  });

  it('rejects a spec checkpoint stage runner not declared on the manifest flow', () => {
    const flows = buildManifest([
      {
        id: 'orphaned-checkpoint-flow',
        subsystems: ['navigation'],
        checkpoints: [{ name: 'declared' }],
      },
    ]);
    const manifestPath = path.join(tempDir, 'manifest.json');
    const specPath = path.join(tempDir, 'flow-audits.spec.ts');
    writeJson(manifestPath, flows);
    // Spec implements an extra checkpoint the manifest never declared.
    const overImplementedFlows = flows.map((flow) =>
      flow.id === 'orphaned-checkpoint-flow'
        ? {
            ...flow,
            checkpoints: [{ name: 'declared' }, { name: 'extra-in-spec' }],
          }
        : flow,
    );
    fs.writeFileSync(specPath, buildSpecSource(overImplementedFlows));

    const result = runValidator(
      {
        MEKSTATION_FLOW_MANIFEST_JSON_PATH: manifestPath,
        MEKSTATION_FLOW_AUDIT_SPEC_PATH: specPath,
      },
      ['--json'],
    );

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ message: string }>;
    };
    expect(
      manifest.errors.some(
        (e) =>
          e.message.includes('"extra-in-spec"') &&
          e.message.includes('not declared'),
      ),
    ).toBe(true);
  });

  it('rejects a spec that no longer generates tests from FLOW_MANIFEST', () => {
    const flows = buildManifest([]);
    const manifestPath = path.join(tempDir, 'manifest.json');
    const specPath = path.join(tempDir, 'flow-audits.spec.ts');
    writeJson(manifestPath, flows);
    fs.writeFileSync(specPath, buildSpecSource(flows, { includeLoop: false }));

    const result = runValidator(
      {
        MEKSTATION_FLOW_MANIFEST_JSON_PATH: manifestPath,
        MEKSTATION_FLOW_AUDIT_SPEC_PATH: specPath,
      },
      ['--json'],
    );

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ message: string }>;
    };
    expect(
      manifest.errors.some((e) =>
        e.message.includes('no longer generates tests'),
      ),
    ).toBe(true);
  });

  it('rejects a spec file missing FLOW_STAGES entirely', () => {
    const flows = buildManifest([]);
    const manifestPath = path.join(tempDir, 'manifest.json');
    const specPath = path.join(tempDir, 'flow-audits.spec.ts');
    writeJson(manifestPath, flows);
    fs.writeFileSync(
      specPath,
      `import { FLOW_MANIFEST } from './flows/manifest';\n`,
    );

    const result = runValidator(
      {
        MEKSTATION_FLOW_MANIFEST_JSON_PATH: manifestPath,
        MEKSTATION_FLOW_AUDIT_SPEC_PATH: specPath,
      },
      ['--json'],
    );

    expect(result.status).toBe(1);
    const manifest = JSON.parse(result.stdout) as {
      errors: Array<{ message: string }>;
    };
    expect(
      manifest.errors.some((e) =>
        e.message.includes('Could not find "const FLOW_STAGES'),
      ),
    ).toBe(true);
  });
});

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const validatorPath = path.resolve(
  'scripts/qc/validate-camp01-authority-receipt.mjs',
);
const writerUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.mjs'),
).href;
const schemasUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.schemas.mjs'),
).href;
const writerHarness = `
import fs from 'node:fs';
import * as schemas from ${JSON.stringify(schemasUrl)};
import * as writer from ${JSON.stringify(writerUrl)};
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
try {
  const value = await writer.writeReceipt(request.value, {
    randomBytes: () => Buffer.from(request.entropy, 'hex'),
    runCommand: async (_argv, context) => {
      const assertions = Object.fromEntries(request.assertions.map((id) => [id, true]).sort());
      fs.writeFileSync(context.artifactPath('wave-result.json'), schemas.canonicalBytes({
        schema: 'camp01-wave-result/v1', wave: request.value.wave,
        runId: context.runId, status: 'passed', assertions,
      }));
      return { exitCode: 0, observedTestIds: [] };
    },
  });
  process.stdout.write(JSON.stringify({ ok: true, value }));
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, error: error.message }));
  process.exitCode = 1;
}`;

type ValidationContext = {
  registryContext: Record<string, unknown>;
  reviewedHead: Record<string, unknown> | null;
};
type Fixture = {
  workspace: string;
  runRoot: string;
  context: ValidationContext;
};
type CliResult = ReturnType<typeof spawnSync>;

const digest = `sha256:${'a'.repeat(64)}`;
const reviewedSha = 'b'.repeat(40);
const exactMainSha = 'c'.repeat(40);
// prettier-ignore
const assertions=['unknownFieldsRejected===true','missingFieldsRejected===true','headShaMatched===true','pathShaMatched===true','inputDigestsMatched===true','exactMainRegenerated===true'];
// prettier-ignore
const cap = { subject: 'product-pr', baseSha: reviewedSha, headSha: reviewedSha, fileCount: 4, changedLineCount: 100, binaryEntries: false, changedTreeManifestDigest: digest, reviewedHeadReceiptId: null, reviewedHeadReceiptManifestDigest: null };
// prettier-ignore
const baseRegistry = { evidence: [], provenance: [{ id: `tuple-${'2'.repeat(16)}`, sourceKind: 'spec-tuple', wave: 'camp-proof', subject: 'product-pr' }, { id: `tuple-${'3'.repeat(16)}`, sourceKind: 'owned-pr-tuple', wave: 'camp-proof', subject: 'product-pr' }], refs: [], capturePolicies: [], repairSources: [] };

// prettier-ignore
function requestFor(workspace: string, sha: string, mode: 'reviewed-head' | 'exact-main', registryContext: Record<string, unknown>, reviewedHead: Record<string, unknown> | null) { return { wave: 'camp-proof', commandId: 'camp-proof', sha, treeSha: sha, runRoot: path.join(workspace,'.sisyphus','evidence','playtest',`camp-proof-${sha}`), mode, executionEnvironmentDigest: digest, provenance: { subject: 'product-pr', specTupleId: `tuple-${'2'.repeat(16)}`, ownedPrTupleId: `tuple-${'3'.repeat(16)}`, predecessorReceiptIds: [] }, capProvenance: mode==='reviewed-head'?{...cap}:{...cap,reviewedHeadReceiptId:`receipt-${'d'.repeat(16)}`,reviewedHeadReceiptManifestDigest:(reviewedHead as {manifestDigest:string}).manifestDigest}, identityRegistry: { schema: 'camp01-identity-registry/v1', entities: [], refs: [] }, registryContext, reviewedHead }; }

function writeRequest(value: Record<string, unknown>, entropy: string) {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', writerHarness],
    {
      input: JSON.stringify({ value, entropy, assertions }),
      encoding: 'utf8',
    },
  );
  const parsed = JSON.parse(result.stdout) as {
    ok: boolean;
    error?: string;
    value?: { finalDirectory: string };
  };
  if (!parsed.ok || !parsed.value) throw new Error(parsed.error);
  return parsed.value.finalDirectory;
}

function reviewedFixture(
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof2b-')),
): Fixture {
  const registryContext = JSON.parse(JSON.stringify(baseRegistry)) as Record<
    string,
    unknown
  >;
  writeRequest(
    requestFor(workspace, reviewedSha, 'reviewed-head', registryContext, null),
    '4'.repeat(32),
  );
  return {
    workspace,
    runRoot: `.sisyphus/evidence/playtest/camp-proof-${reviewedSha}`,
    context: { registryContext, reviewedHead: null },
  };
}

function exactMainFixture(): Fixture {
  const reviewed = reviewedFixture();
  const reviewedDirectory = path.join(
    reviewed.workspace,
    reviewed.runRoot,
    `camp01-${'4'.repeat(32)}`,
  );
  const command = JSON.parse(
    fs.readFileSync(
      path.join(reviewedDirectory, 'command-result.json'),
      'utf8',
    ),
  ) as Record<string, unknown>;
  const manifestBytes = fs.readFileSync(
    path.join(reviewedDirectory, 'receipt-manifest.json'),
  );
  const manifest = JSON.parse(manifestBytes.toString('utf8')) as Record<
    string,
    unknown
  >;
  const manifestDigest = `sha256:${createHash('sha256').update(manifestBytes).digest('hex')}`;
  const receiptId = `receipt-${'d'.repeat(16)}`;
  const registryContext = JSON.parse(
    JSON.stringify(baseRegistry),
  ) as typeof baseRegistry;
  registryContext.provenance.push({
    id: receiptId,
    sourceKind: 'reviewed-head-receipt',
    wave: 'camp-proof',
    subject: 'product-pr',
  });
  registryContext.provenance.sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const reviewedHead = { receiptId, manifestDigest, command, manifest };
  writeRequest(
    requestFor(
      reviewed.workspace,
      exactMainSha,
      'exact-main',
      registryContext,
      reviewedHead,
    ),
    '5'.repeat(32),
  );
  return {
    workspace: reviewed.workspace,
    runRoot: `.sisyphus/evidence/playtest/camp-proof-${exactMainSha}`,
    context: { registryContext, reviewedHead },
  };
}

function invokeCli(
  fixture: Fixture,
  overrides: Record<string, string> = {},
  context: Record<string, unknown> = fixture.context,
): CliResult {
  const values = {
    wave: 'camp-proof',
    'run-root': fixture.runRoot.replaceAll('\\', '/'),
    'expected-sha': fixture.runRoot.slice(-40),
    mode: fixture.context.reviewedHead ? 'exact-main' : 'reviewed-head',
    ...overrides,
  };
  return spawnSync(
    process.execPath,
    [
      validatorPath,
      ...Object.entries(values).map(([key, value]) => `--${key}=${value}`),
    ],
    {
      cwd: fixture.workspace,
      encoding: 'utf8',
      env: {
        ...process.env,
        CAMP01_VALIDATION_CONTEXT: JSON.stringify(context),
      },
    },
  );
}

describe('CAMP-01 authority receipt validator CLI', () => {
  it('wires the low-level writer and public validator package commands', () => {
    const scripts = (
      JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8')) as {
        scripts: Record<string, string>;
      }
    ).scripts;
    expect(scripts['qc:camp01-authority-receipt:write']).toBe(
      'node scripts/qc/camp01-authority-receipt.mjs write',
    );
    expect(scripts['qc:camp01-authority-receipt:validate']).toBe(
      'node scripts/qc/validate-camp01-authority-receipt.mjs',
    );
  });

  it.each([
    ['reviewed-head', reviewedFixture],
    ['exact-main', exactMainFixture],
  ])('validates one finalized %s receipt child', (_mode, createFixture) => {
    // Given a writer-published run root, when the public validator runs, then it accepts the receipt.
    const result = invokeCli(createFixture());
    expect(result).toMatchObject({
      status: 0,
      stdout: 'CAMP01 receipt valid\n',
      stderr: '',
    });
  });

  it('rejects missing, unknown, duplicate, split, and empty arguments', () => {
    const fixture = reviewedFixture();
    // Given malformed CLI tokens, when parsed, then every form fails before receipt validation.
    const invalid = [
      [],
      [`--wave=camp-proof`],
      [`--unknown=value`],
      [`--wave=camp-proof`, `--wave=camp-proof`],
      [`--wave`, 'camp-proof'],
      [`--wave=`],
    ];
    for (const args of invalid) {
      const result = spawnSync(process.execPath, [validatorPath, ...args], {
        cwd: fixture.workspace,
        encoding: 'utf8',
        env: {
          ...process.env,
          CAMP01_VALIDATION_CONTEXT: JSON.stringify(fixture.context),
        },
      });
      expect(result.status).toBe(1);
    }
  });

  it.each([
    ['unknown wave', { wave: 'unknown' }],
    ['invalid expected SHA', { 'expected-sha': 'ABC' }],
    ['invalid mode', { mode: 'merge' }],
    ['noncanonical run root', { 'run-root': 'other' }],
  ])('rejects %s', (_name, overrides) => {
    const result = invokeCli(reviewedFixture(), overrides);
    expect(result.status).toBe(1);
  });

  it('rejects zero, multiple, non-directory, and renamed receipt children', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof2b-empty-'));
    const emptyFixture = { ...reviewedFixture(empty) };
    const root = path.join(empty, emptyFixture.runRoot);
    fs.rmSync(root, { recursive: true });
    fs.mkdirSync(root, { recursive: true });
    expect(invokeCli(emptyFixture).status).toBe(1);
    fs.writeFileSync(
      path.join(root, `camp01-${'1'.repeat(32)}`),
      'not a directory',
    );
    expect(invokeCli(emptyFixture).status).toBe(1);

    const multiple = reviewedFixture();
    fs.mkdirSync(
      path.join(
        multiple.workspace,
        multiple.runRoot,
        `camp01-${'2'.repeat(32)}`,
      ),
    );
    expect(invokeCli(multiple).status).toBe(1);

    const renamed = reviewedFixture();
    const original = path.join(
      renamed.workspace,
      renamed.runRoot,
      `camp01-${'4'.repeat(32)}`,
    );
    fs.renameSync(
      original,
      path.join(path.dirname(original), `camp01-${'3'.repeat(32)}`),
    );
    expect(invokeCli(renamed).status).toBe(1);
  });

  it('rejects receipt wave, SHA, mode, or validation-context substitution', () => {
    const reviewed = reviewedFixture();
    expect(invokeCli(reviewed, { mode: 'exact-main' }).status).toBe(1);
    expect(
      invokeCli(reviewed, {}, { ...reviewed.context, extra: true }).status,
    ).toBe(1);

    const substitutedSha = 'e'.repeat(40);
    const shaRoot = path.join(
      reviewed.workspace,
      '.sisyphus',
      'evidence',
      'playtest',
      `camp-proof-${substitutedSha}`,
    );
    fs.cpSync(path.join(reviewed.workspace, reviewed.runRoot), shaRoot, {
      recursive: true,
    });
    expect(
      invokeCli({
        ...reviewed,
        runRoot: `.sisyphus/evidence/playtest/camp-proof-${substitutedSha}`,
      }).status,
    ).toBe(1);

    const waveRoot = path.join(
      reviewed.workspace,
      '.sisyphus',
      'evidence',
      'playtest',
      `camp01a-catalog-${reviewedSha}`,
    );
    fs.cpSync(path.join(reviewed.workspace, reviewed.runRoot), waveRoot, {
      recursive: true,
    });
    expect(
      invokeCli(
        {
          ...reviewed,
          runRoot: `.sisyphus/evidence/playtest/camp01a-catalog-${reviewedSha}`,
        },
        { wave: 'camp-01a' },
      ).status,
    ).toBe(1);
  });
});

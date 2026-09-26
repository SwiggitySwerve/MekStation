import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const adapterUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-camp00-listener-adapter.mjs'),
).href;
const writerUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.mjs'),
).href;
const schemasUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.schemas.mjs'),
).href;
const contractUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.contract.mjs'),
).href;

const sha = 'a'.repeat(40);
const digest = `sha256:${'b'.repeat(64)}`;
const entropy = 'c'.repeat(32);
const runId = `camp01-${entropy}`;

type Result = {
  ok: boolean;
  error?: string;
  listener?: unknown;
  assertions?: Record<string, boolean>;
  observationPresent?: boolean;
  listenerPresent?: boolean;
  wavePresent?: boolean;
  runId?: string;
};

function invoke(payload: Record<string, unknown>): Result {
  const harness = `
import fs from 'node:fs';
import path from 'node:path';
import { WAVE_CONTRACTS } from ${JSON.stringify(contractUrl)};
import { canonicalBytes } from ${JSON.stringify(schemasUrl)};
import { convertCamp00Observation, validCamp00Observation } from ${JSON.stringify(adapterUrl)};
import { writeReceipt } from ${JSON.stringify(writerUrl)};
const request=JSON.parse(fs.readFileSync(0,'utf8'));
try {
  let value;
  if(request.action==='convert'){
    fs.mkdirSync(request.directory,{recursive:true});
    fs.writeFileSync(path.join(request.directory,'listener-observation.json'),canonicalBytes(validCamp00Observation(request.runId)),{flag:'wx'});
    if(request.temp) fs.writeFileSync(path.join(request.directory,'.listener-observation.json.tmp'),'x');
    if(request.sibling) fs.writeFileSync(path.join(request.directory,'extra.json'),'{}');
    convertCamp00Observation({directory:request.directory,runId:request.runId,afterFirstRead:request.mutate?(file)=>fs.writeFileSync(file,canonicalBytes(validCamp00Observation(request.runId,43701))):null});
    value={listener:JSON.parse(fs.readFileSync(path.join(request.directory,'listener-result.json'),'utf8')),assertions:JSON.parse(fs.readFileSync(path.join(request.directory,'wave-result.json'),'utf8')).assertions,observationPresent:fs.existsSync(path.join(request.directory,'listener-observation.json'))};
  } else {
    const row=WAVE_CONTRACTS['camp-00'], written=await writeReceipt(request.value,{randomBytes:()=>Buffer.from(request.entropy,'hex'),runCommand:async(_argv,context)=>{fs.writeFileSync(path.join(path.dirname(context.artifactPath('command-result.json')),'listener-observation.json'),canonicalBytes(validCamp00Observation(context.runId))); return {exitCode:0,observedTestIds:[]};}});
    value={runId:written.runId,observationPresent:fs.existsSync(path.join(written.finalDirectory,'listener-observation.json')),listenerPresent:fs.existsSync(path.join(written.finalDirectory,'listener-result.json')),wavePresent:fs.existsSync(path.join(written.finalDirectory,'wave-result.json'))};
  }
  process.stdout.write(JSON.stringify({ok:true,...value}));
} catch(error) {
  process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error),listenerPresent:fs.existsSync(path.join(request.directory??'','listener-result.json'))}));
  process.exitCode=1;
}
`;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    { encoding: 'utf8', input: JSON.stringify(payload) },
  );
  return result.stdout
    ? (JSON.parse(result.stdout) as Result)
    : { ok: false, error: result.stderr };
}

function writeRequest(root: string) {
  const runRoot = path.join(
    root,
    '.sisyphus',
    'evidence',
    'playtest',
    `camp00-loopback-${sha}`,
  );
  return {
    wave: 'camp-00',
    commandId: 'camp-00',
    sha,
    treeSha: sha,
    runRoot,
    mode: 'reviewed-head',
    executionEnvironmentDigest: digest,
    provenance: {
      subject: 'product-pr',
      specTupleId: `tuple-${'1'.repeat(16)}`,
      ownedPrTupleId: `tuple-${'2'.repeat(16)}`,
      predecessorReceiptIds: [
        `receipt-${'3'.repeat(16)}`,
        `receipt-${'4'.repeat(16)}`,
      ],
    },
    capProvenance: {
      subject: 'product-pr',
      baseSha: sha,
      headSha: sha,
      fileCount: 2,
      changedLineCount: 20,
      binaryEntries: false,
      changedTreeManifestDigest: digest,
      reviewedHeadReceiptId: null,
      reviewedHeadReceiptManifestDigest: null,
    },
    identityRegistry: {
      schema: 'camp01-identity-registry/v1',
      entities: [],
      refs: [],
    },
    registryContext: {
      evidence: [],
      provenance: [
        {
          id: `receipt-${'3'.repeat(16)}`,
          sourceKind: 'predecessor-receipt',
          wave: 'proof-02-triage',
          subject: 'audit-pr',
        },
        {
          id: `receipt-${'4'.repeat(16)}`,
          sourceKind: 'predecessor-receipt',
          wave: 'proof-02-required-repairs',
          subject: 'product-pr',
        },
        {
          id: `tuple-${'1'.repeat(16)}`,
          sourceKind: 'spec-tuple',
          wave: 'camp-00',
          subject: 'product-pr',
        },
        {
          id: `tuple-${'2'.repeat(16)}`,
          sourceKind: 'owned-pr-tuple',
          wave: 'camp-00',
          subject: 'product-pr',
        },
      ],
      refs: [],
      capturePolicies: [],
      repairSources: [],
    },
    reviewedHead: null,
  };
}

describe('CAMP-00 listener observation adapter', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp00-adapter-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('converts a closed observation into listener and wave results', () => {
    const result = invoke({ action: 'convert', directory: root, runId });
    expect(result.ok).toBe(true);
    expect(result.observationPresent).toBe(false);
    expect(result.listener).toEqual({
      schema: 'camp01-listener-result/v1',
      wave: 'camp-00',
      runId,
      boundAddress: '127.0.0.1',
      expectedAddressMatched: true,
      unspecifiedAddressRejected: true,
    });
    expect(result.assertions?.['observationStableAcrossReads===true']).toBe(
      true,
    );
    expect(result.assertions?.['runtimeOutputRemoved===true']).toBe(true);
  });

  it('rejects bytes mutated between held-handle reads', () => {
    const result = invoke({
      action: 'convert',
      directory: root,
      runId,
      mutate: true,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe(
      'CAMP01_WRITER_INVALID: observation unstable across reads',
    );
    expect(result.listenerPresent).toBe(false);
  });

  it('rejects a pre-created temp sibling', () => {
    const result = invoke({
      action: 'convert',
      directory: root,
      runId,
      temp: true,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe(
      'CAMP01_WRITER_INVALID: observation temp present',
    );
  });

  it('rejects an extra sibling before conversion', () => {
    const result = invoke({
      action: 'convert',
      directory: root,
      runId,
      sibling: true,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe(
      'CAMP01_WRITER_INVALID: undeclared observation sibling',
    );
  });

  it('writes camp-00 receipts from the observation after a passing command', () => {
    const result = invoke({
      action: 'write',
      entropy,
      value: writeRequest(root),
    });
    expect(result.ok).toBe(true);
    expect(result.runId).toBe(runId);
    expect(result.observationPresent).toBe(false);
    expect(result.listenerPresent).toBe(true);
    expect(result.wavePresent).toBe(true);
  });

  // OD-camp00-controller-env: `qc:camp01-authority-receipt:write` runs the camp-00 row through the writer's default
  // hermetic runner. The fake packaged-socket child in the temp checkout refuses with runCamp00Authority's own words
  // when CAMP01_NEXT_DIST_DIR is absent, refuses any value but the parent's fake dist directory, and otherwise closes
  // one valid observation for the writer to convert.
  describe('default runner environment', () => {
    // prettier-ignore
    function runDefaultWriter(parentDist: string | null) {
      const fakeDist = path.join(root, 'fake-next-dist'), request = writeRequest(root), env: NodeJS.ProcessEnv = { ...process.env, CAMP01_CONTROLLER_CONTEXT: JSON.stringify(request) };
      fs.mkdirSync(fakeDist);
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'camp00-runner-env-fixture', private: true, scripts: { 'validate:multiplayer:packaged-socket': 'node child.mjs' } }));
      fs.writeFileSync(path.join(root, 'child.mjs'), `import fs from 'node:fs'; import path from 'node:path';\nimport { canonicalBytes } from ${JSON.stringify(schemasUrl)};\nimport { validCamp00Observation } from ${JSON.stringify(adapterUrl)};\nconst dist = process.env.CAMP01_NEXT_DIST_DIR;\nif (!dist) { console.error('camp-00 environment missing'); process.exit(1); }\nif (dist !== ${JSON.stringify(fakeDist)} || !fs.statSync(dist).isDirectory()) { console.error('camp-00 dist directory drift'); process.exit(1); }\nfs.writeFileSync(path.join(process.env.CAMP01_ARTIFACT_DIR, 'listener-observation.json'), canonicalBytes(validCamp00Observation(process.env.CAMP01_RUN_ID)));\n`);
      delete env.CAMP01_NEXT_DIST_DIR; if (parentDist !== null) env.CAMP01_NEXT_DIST_DIR = parentDist === 'fake' ? fakeDist : parentDist;
      const result = spawnSync(process.execPath, [path.resolve('scripts/qc/camp01-authority-receipt.mjs'), 'write'], { cwd: root, encoding: 'utf8', env });
      return { result, children: fs.existsSync(request.runRoot) ? fs.readdirSync(request.runRoot).map((name) => ({ name, files: fs.readdirSync(path.join(request.runRoot, name)).sort() })) : [] };
    }

    it('passes the parent CAMP01_NEXT_DIST_DIR through to the camp-00 child, which then closes a receipt', () => {
      const { result, children } = runDefaultWriter('fake');
      expect(result.stderr).not.toContain('camp-00 environment missing');
      expect(result.status).toBe(0);
      expect(children).toHaveLength(1);
      expect(children[0].name).toMatch(/^camp01-[0-9a-f]{32}$/);
      // prettier-ignore
      expect(children[0].files).toEqual(['command-result.json', 'listener-result.json', 'receipt-manifest.json', 'wave-result.json']);
    });

    it('invents no dist directory: without a parent value the child still refuses and no receipt is written', () => {
      const { result, children } = runDefaultWriter(null);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('camp-00 environment missing');
      expect(result.stderr).toContain('CAMP01_WRITER_INVALID: command failed');
      expect(children).toEqual([]);
    });
  });
});

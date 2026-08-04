import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const writerUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.mjs'),
).href;
const schemasUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.schemas.mjs'),
).href;
const captureUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-capture-transaction.mjs'),
).href;
// prettier-ignore
const contractUrl=pathToFileURL(path.resolve('scripts/qc/camp01-authority-receipt.contract.mjs')).href;
const harness = `
import fs from 'node:fs';
import path from 'node:path';
import * as capture from ${JSON.stringify(captureUrl)};
import * as schemas from ${JSON.stringify(schemasUrl)};
import * as writer from ${JSON.stringify(writerUrl)};
import { WAVE_CONTRACTS } from ${JSON.stringify(contractUrl)};
const request = JSON.parse(fs.readFileSync(0, 'utf8'));
let commandCount = 0;
try {
  let value;
  if (request.action === 'capture-policy') value = capture.capturePolicyFor(request.value);
  else if (request.action === 'write') value = await writer.writeReceipt(request.value, {
    randomBytes: () => Buffer.from(request.entropy, 'hex'),
    runCommand: async (_argv, context) => {
      commandCount += 1;
      if (request.reproduction) { const reporter=WAVE_CONTRACTS['proof-02-reproduction'].reporterContracts[0], reproduction={schema:reporter.reportSchema,parentRunId:context.runId,executionId:context.executionId,invocationId:context.invocationId,sha:request.value.sha,historicalAnchorIds:[...reporter.requiredTestIds].sort(),observations:request.reproduction}; fs.writeFileSync(context.artifactPath(reporter.normalizedPath),schemas.canonicalBytes(reproduction)); }
      else { const waveResult = { schema: 'camp01-wave-result/v1', wave: request.value.wave,
        runId: context.runId, status: 'passed', assertions: Object.fromEntries(
          request.assertions.sort().map((id) => [id, request.assertionValues?.[id] ?? true])) };
        fs.writeFileSync(context.artifactPath('wave-result.json'), schemas.canonicalBytes(waveResult)); }
      if (request.capture && context.invocationId === 'camp-01e-picker-browser') {
        const policy=capture.capturePolicyFor('camp-01e'), snapshot={fixtureIds:[...policy.fixtureIds],fixtureAliases:[...policy.fixtureAliases],nonFixtureSentinels:[],domState:{html:'fixture'},appState:{route:'/fixture'},counters:{domMutations:0,storageWrites:0,databaseWrites:0,networkWrites:0},barrierTripped:false};
        for (const artifactPath of ['mobile-390x844.png','desktop.png']) { const transaction=capture.openCaptureTransaction({wave:'camp-01e',invocationId:context.invocationId,commandSequenceIndex:1,artifactPath,artifactDirectory:path.dirname(context.artifactPath(artifactPath))},{instrumentation:{seedFixtures:async()=>undefined,arm:async()=>undefined,snapshot:async()=>snapshot}}); await transaction.prepare(); await transaction.capture(async(file)=>fs.writeFileSync(file,Buffer.from(artifactPath))); await transaction.publish(); }
      }
      return { exitCode: 0, ...(request.callerObservedTestIds ? { observedTestIds: request.callerObservedTestIds } : {}) };
    },
  });
  else if (request.action === 'validate-directory') value = writer.validateReceiptDirectory(request.value.directory, request.value.context);
  else if (request.action === 'identities') value = writer.issueHIdentities(request.value, () => Buffer.from(request.entropy, 'hex'));
  else if (request.action === 'h-command-identities') { const row=WAVE_CONTRACTS['camp-01h'], runId=request.value, identities=writer.issueHIdentities(runId); value=row.reporterContracts.map((reporter,index)=>({witnessLabel:reporter.witnessLabel,...writer.issuedCommandIdentity(row,index,runId),expectedExecutionId:identities[reporter.witnessLabel].executionId})); }
  else if (request.action === 'h-wave') { const row=WAVE_CONTRACTS['camp-01h'], assertions=Object.fromEntries([...row.assertions].sort().map((id)=>[id,id.endsWith('===true')?true:Number(/(?:===|>=)(-?\\d+)$/.exec(id)[1])])); assertions[request.value.id]=request.value.result; value=schemas.validateArtifact({schema:'camp01-wave-result/v1',wave:row.wave,runId:'camp01-'+'1'.repeat(32),status:request.value.status,assertions},{row}); }
  else if (request.action === 'h-bindings') { const row=WAVE_CONTRACTS['camp-01h'], runId='camp01-'+'8'.repeat(32), ids=writer.issueHIdentities(runId), observationIds=(reporter)=>schemas.H_TEST_IDS[reporter.invocationId]??[], reports=row.reporterContracts.map((reporter)=>{const identity=ids[reporter.witnessLabel]; return {schema:reporter.reportSchema,parentRunId:runId,witnessId:identity.witnessId,executionId:identity.executionId,witnessLabel:reporter.witnessLabel,invocationId:reporter.invocationId,producerId:reporter.producerId,reporterId:reporter.reporterId,sourceIds:reporter.sourceIds,complete:true,observations:observationIds(reporter).map((id)=>({id,status:'passed',failureFingerprint:null}))};}), witnesses=Object.entries(ids).map(([label,identity])=>({label,status:'observation',executionId:identity.executionId,reportDigests:Object.fromEntries(row.reporterContracts.filter((entry)=>entry.witnessLabel===label).map((entry)=>entry.normalizedPath).sort().map((name)=>[name,'sha256:'+'a'.repeat(64)])),facts:{}})), command={observedTestIds:[...new Set(reports.flatMap((report)=>report.observations.map(({id})=>id)))].sort(),identityRegistry:{entities:[]}}, receipt='receipt-'+'d'.repeat(16), reconciliation={sourceObservationReceiptIds:[receipt]}, evidence=Object.entries(ids).flatMap(([label,identity])=>[{id:identity.witnessId,sourceKind:'witness',runId,wave:'camp-01h',label},{id:identity.executionId,sourceKind:'execution',runId,wave:'camp-01h',label}]), context={registryContext:{evidence,provenance:[{id:receipt,sourceKind:'predecessor-receipt',wave:'camp-01h',subject:'product-pr'}]}}; if (request.value==='extra-digest') witnesses[0].reportDigests.extra='sha256:'+'b'.repeat(64); if (request.value==='absent-inventory') reports[0].invocationId='unmapped-invocation'; if (request.value==='source-path-only') reports[0].observations=[{id:row.reporterContracts[0].sourceIds[0],status:'passed',failureFingerprint:null}]; if (request.value==='arbitrary-observation') reports[0].observations[0].id='arbitrary'; if (request.value==='missing-observation') reports[0].observations.pop(); if (request.value==='extra-observation') reports[0].observations.push({id:'zz-extra',status:'passed',failureFingerprint:null}); if (request.value==='extra-entity') command.identityRegistry.entities.push({kind:'campaign',digest:'sha256:'+'c'.repeat(64),sourceEvidenceId:ids['custom-save-reload'].executionId}); if (request.value==='unverified-source') reconciliation.sourceObservationReceiptIds.push('receipt-'+'e'.repeat(16)); reports.forEach((report,index)=>schemas.validateArtifact(report,{reporter:request.value==='absent-inventory'&&index===0?{...row.reporterContracts[index],invocationId:report.invocationId}:row.reporterContracts[index],runId,registryContext:context.registryContext})); value=writer.validateHBindings(command,{witnesses},reports,reconciliation,context); }
  else value = schemas[request.action](...(request.args ?? []));
  process.stdout.write(JSON.stringify({ ok: true, value, commandCount }));
} catch (error) {
  process.stdout.write(JSON.stringify({ ok: false, error: error.message, commandCount,
    runRootExists: request.value?.runRoot ? fs.existsSync(request.value.runRoot) : undefined }));
  process.exitCode = 1;
}`;

// prettier-ignore
type Result = { ok: boolean; value?: unknown; error?: string; commandCount?: number; runRootExists?: boolean };
// prettier-ignore
function invoke(request: Record<string, unknown>): Result { const result=spawnSync(process.execPath,['--input-type=module','--eval',harness],{input:JSON.stringify(request),encoding:'utf8'}); return JSON.parse(result.stdout) as Result; }

const digest = `sha256:${'a'.repeat(64)}`;
const sha = 'b'.repeat(40);
// prettier-ignore
const cap = { subject: 'product-pr', baseSha: sha, headSha: sha, fileCount: 4, changedLineCount: 100, binaryEntries: false, changedTreeManifestDigest: digest, reviewedHeadReceiptId: null, reviewedHeadReceiptManifestDigest: null };
// prettier-ignore
const registryContext = { evidence: [], provenance: [{ id: `tuple-${'2'.repeat(16)}`, sourceKind: 'spec-tuple', wave: 'camp-proof', subject: 'product-pr' }, { id: `tuple-${'3'.repeat(16)}`, sourceKind: 'owned-pr-tuple', wave: 'camp-proof', subject: 'product-pr' }], refs: [], capturePolicies: [], repairSources: [] };
// prettier-ignore
function baseRequest(runRoot: string) { return { wave: 'camp-proof', commandId: 'camp-proof', sha, treeSha: sha, runRoot, mode: 'reviewed-head', executionEnvironmentDigest: digest, provenance: { subject: 'product-pr', specTupleId: `tuple-${'2'.repeat(16)}`, ownedPrTupleId: `tuple-${'3'.repeat(16)}`, predecessorReceiptIds: [] }, capProvenance: { ...cap }, identityRegistry: { schema: 'camp01-identity-registry/v1', entities: [], refs: [] }, registryContext: JSON.parse(JSON.stringify(registryContext)), reviewedHead: null } as const; }
// prettier-ignore
const proofAnchors=['e2e/campaign-starmap-logistics.spec.ts::campaign starmap logistics::previews, approves, and reloads campaign travel consequences','e2e/gm-campaign-ledger-control-plane.spec.ts::GM campaign ledger control plane @gm-ledger::guest direct route shows only player-safe ledger projection','e2e/gm-campaign-ledger-control-plane.spec.ts::GM campaign ledger control plane @gm-ledger::saves and reloads a player-safe merchant reversal from the server campaign list'];
// prettier-ignore
function proofRequest(runRoot: string) { const specId=`tuple-${'4'.repeat(16)}`, predecessorId=`receipt-${'5'.repeat(16)}`; return {wave:'proof-02-reproduction',commandId:'proof-02-reproduction',sha,treeSha:sha,runRoot,mode:'exact-main',executionEnvironmentDigest:digest,provenance:{subject:'none',specTupleId:specId,ownedPrTupleId:null,predecessorReceiptIds:[predecessorId]},capProvenance:null,identityRegistry:{schema:'camp01-identity-registry/v1',entities:[],refs:[]},registryContext:{evidence:[],provenance:[{id:predecessorId,sourceKind:'predecessor-receipt',wave:'camp-proof',subject:'product-pr'},{id:specId,sourceKind:'spec-tuple',wave:'proof-02-reproduction',subject:'none'}],refs:[],capturePolicies:[],repairSources:[]},reviewedHead:null} as const; }
// prettier-ignore
const campProofAssertions=['unknownFieldsRejected===true','missingFieldsRejected===true','headShaMatched===true','pathShaMatched===true','inputDigestsMatched===true','exactMainRegenerated===true'];
const camp01eAssertions = [
  'savedDesignIdPresent===true',
  'rosterInstanceIdPresent===true',
  'unitRefMatched===true',
  'unitSourceCustom===true',
  'rootForceContainsInstance===true',
  'programmaticNamesPresent===true',
  'narrowViewportUsable===true',
];

describe('CAMP-01 authority receipt writer and validator', () => {
  it('emits canonical bytes and rejects missing, unknown, or unsafe fields', () => {
    const wave = {
      schema: 'camp01-wave-result/v1',
      wave: 'camp-proof',
      runId: `camp01-${'1'.repeat(32)}`,
      status: 'passed',
      assertions: { a: true },
    };
    expect(invoke({ action: 'canonicalBytes', args: [wave] }).value).toBe(
      `${JSON.stringify(wave)}\n`,
    );
    for (const mutate of [
      (value: Record<string, unknown>) => delete value.status,
      (value: Record<string, unknown>) => (value.extra = true),
      (value: Record<string, unknown>) => (value.localPath = 'C:\\secret'),
    ]) {
      const candidate = JSON.parse(JSON.stringify(wave)) as Record<
        string,
        unknown
      >;
      mutate(candidate);
      expect(invoke({ action: 'validateArtifact', args: [candidate] }).ok).toBe(
        false,
      );
    }
  });

  it('publishes one writer-owned receipt and rejects reopened byte tampering', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof2-'));
    const runRoot = path.join(
      root,
      '.sisyphus',
      'evidence',
      'playtest',
      `camp-proof-${sha}`,
    );
    const request = baseRequest(runRoot);
    const written = invoke({
      action: 'write',
      value: request,
      assertions: campProofAssertions,
      entropy: '4'.repeat(32),
    });
    expect(written.error).toBeUndefined();
    expect(written).toMatchObject({ ok: true });
    const finalDirectory = (written.value as { finalDirectory: string })
      .finalDirectory;
    expect(fs.readdirSync(runRoot)).toEqual([`camp01-${'4'.repeat(32)}`]);
    // prettier-ignore
    const validationRequest={action:'validate-directory',value:{directory:finalDirectory,context:{registryContext:request.registryContext,reviewedHead:null}}};
    expect(invoke(validationRequest).ok).toBe(true);
    const command = JSON.parse(
      fs.readFileSync(path.join(finalDirectory, 'command-result.json'), 'utf8'),
    ) as { artifactDigests: Record<string, string> };
    expect(command.artifactDigests['command-result.json']).toBeUndefined();
    expect(command.artifactDigests['receipt-manifest.json']).toBeUndefined();
    fs.appendFileSync(path.join(finalDirectory, 'wave-result.json'), ' ');
    expect(invoke(validationRequest).ok).toBe(false);
  });

  it('accepts the guarded transaction attestation set as its capture oracle', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof4a-writer-'));
    const runRoot = path.join(
      root,
      '.sisyphus',
      'evidence',
      'playtest',
      `camp01e-picker-${sha}`,
    );
    const policy = invoke({ action: 'capture-policy', value: 'camp-01e' })
      .value as { fixtureAllowlistDigest: string; barrierPolicyDigest: string };
    const specId = `tuple-${'5'.repeat(16)}`,
      productId = `tuple-${'6'.repeat(16)}`,
      predecessorId = `receipt-${'7'.repeat(16)}`;
    // prettier-ignore
    const value={...baseRequest(runRoot),wave:'camp-01e',commandId:'camp-01e',provenance:{subject:'product-pr',specTupleId:specId,ownedPrTupleId:productId,predecessorReceiptIds:[predecessorId]},registryContext:{evidence:[],provenance:[{id:predecessorId,sourceKind:'predecessor-receipt',wave:'camp-01d',subject:'product-pr'},{id:specId,sourceKind:'spec-tuple',wave:'camp-01e',subject:'product-pr'},{id:productId,sourceKind:'owned-pr-tuple',wave:'camp-01e',subject:'product-pr'}],refs:[],capturePolicies:[{wave:'camp-01e',sha,fixtureAllowlistDigest:policy.fixtureAllowlistDigest,barrierPolicyDigest:policy.barrierPolicyDigest}],repairSources:[]}};
    const written = invoke({
      action: 'write',
      value,
      assertions: camp01eAssertions,
      entropy: '8'.repeat(32),
      capture: true,
    });
    expect(written).toMatchObject({ ok: true, commandCount: 2 });
    const finalDirectory = (written.value as { finalDirectory: string })
      .finalDirectory;
    const command = JSON.parse(
      fs.readFileSync(path.join(finalDirectory, 'command-result.json'), 'utf8'),
    ) as { captureAttestations: Array<{ artifactPath: string }> };
    expect(
      command.captureAttestations.map(({ artifactPath }) => artifactPath),
    ).toEqual(['desktop.png', 'mobile-390x844.png']);
    expect(
      fs.existsSync(path.join(finalDirectory, '.capture-attestations.json')),
    ).toBe(false);
  });

  // prettier-ignore
  it('rejects invalid authority context before commands or filesystem publication', () => { const mutations: Array<(value: ReturnType<typeof baseRequest>) => void> = [ (value) => { (value as { mode: string }).mode = 'exact-main'; }, (value) => { (value.provenance as { specTupleId: string }).specTupleId = `tuple-${'a'.repeat(16)}`; }, (value) => { (value.capProvenance as { changedLineCount: number }).changedLineCount = 501; }, (value) => { (value.identityRegistry.entities as unknown[]).push({ kind: 'campaign', digest, sourceEvidenceId: `ev-${'b'.repeat(32)}` }); }, (value) => { (value.registryContext.evidence as unknown[]).push({sourceKind:'trace',sourceKey:'caller-minted',runId:`camp01-${'9'.repeat(32)}`,wave:'camp-proof',label:null}); } ]; for (const mutate of mutations) { const root=fs.mkdtempSync(path.join(os.tmpdir(),'camp-proof2-invalid-')), runRoot=path.join(root,'.sisyphus','evidence','playtest',`camp-proof-${sha}`), value=baseRequest(runRoot); mutate(value); const result=invoke({action:'write',value,assertions:[],entropy:'4'.repeat(32)}); expect(result).toMatchObject({ok:false,commandCount:0,runRootExists:false}); } });

  // prettier-ignore
  it('allows typed unsatisfied H observation assertions but never final predicates', () => { const booleanId='routeSequenceMatched===true', countId='threeSessionWitnessCount===3'; expect(invoke({action:'h-wave',value:{status:'failed',id:booleanId,result:false}}).ok).toBe(true); expect(invoke({action:'h-wave',value:{status:'failed',id:countId,result:2}}).ok).toBe(true); expect(invoke({action:'h-wave',value:{status:'failed',id:booleanId,result:'false'}}).ok).toBe(false); expect(invoke({action:'h-wave',value:{status:'passed',id:booleanId,result:false}}).ok).toBe(false); });

  // prettier-ignore
  it('accepts exact multi-test H inventories and rejects forged observation bindings', () => { expect(invoke({action:'h-bindings',value:'valid'}).ok).toBe(true); for (const mutation of ['absent-inventory','source-path-only','arbitrary-observation','missing-observation','extra-observation','extra-digest','extra-entity','unverified-source']) expect(invoke({action:'h-bindings',value:mutation}).ok).toBe(false); });

  // prettier-ignore
  it('reopens reviewed-head cap authority and enforces assertion semantics', () => { const root=fs.mkdtempSync(path.join(os.tmpdir(),'camp-proof2-cap-')), reviewedRequest=baseRequest(path.join(root,'.sisyphus','evidence','playtest',`camp-proof-${sha}`)), reviewed=invoke({action:'write',value:reviewedRequest,assertions:campProofAssertions,entropy:'4'.repeat(32)}), reviewedDir=(reviewed.value as {finalDirectory:string}).finalDirectory, command=JSON.parse(fs.readFileSync(path.join(reviewedDir,'command-result.json'),'utf8')), manifest=JSON.parse(fs.readFileSync(path.join(reviewedDir,'receipt-manifest.json'),'utf8')), manifestDigest=invoke({action:'artifactDigest',args:[manifest]}).value as string, receiptId=`receipt-${'d'.repeat(16)}`, exactSha='c'.repeat(40), exactRegistry={...registryContext,provenance:[...registryContext.provenance,{id:receiptId,sourceKind:'reviewed-head-receipt',wave:'camp-proof',subject:'product-pr'}].sort((a,b)=>a.id.localeCompare(b.id))}, exactRequest={...baseRequest(path.join(root,'.sisyphus','evidence','playtest',`camp-proof-${exactSha}`)),sha:exactSha,treeSha:exactSha,mode:'exact-main',capProvenance:{...cap,reviewedHeadReceiptId:receiptId,reviewedHeadReceiptManifestDigest:manifestDigest},registryContext:exactRegistry,reviewedHead:{receiptId,manifestDigest,command,manifest}}; expect(invoke({action:'write',value:exactRequest,assertions:campProofAssertions,entropy:'5'.repeat(32)}).ok).toBe(true); const failed=invoke({action:'write',value:baseRequest(path.join(root,'other','.sisyphus','evidence','playtest',`camp-proof-${sha}`)),assertions:campProofAssertions,assertionValues:{'headShaMatched===true':false},entropy:'6'.repeat(32)}); expect(failed.ok).toBe(false); });

  it('derives failed observation fingerprints and enforces exact triage coverage', () => {
    const observations = [
      { id: 'anchor-a', status: 'passed', knownFailureCode: null },
      {
        id: 'anchor-b',
        status: 'failed',
        knownFailureCode: 'guest-badge-timing',
      },
    ];
    const normalized = invoke({
      action: 'normalizeProof02Observations',
      args: [observations],
    }).value as Array<{ failureFingerprint: string | null }>;
    expect(normalized[0].failureFingerprint).toBeNull();
    expect(normalized[1].failureFingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);
    const dispositions = [
      {
        observationId: 'anchor-b',
        failureFingerprint: normalized[1].failureFingerprint,
        severity: 'major',
        outcome: 'external-blocker',
        causeFingerprint: digest,
        resolutionRef: `ref-${'5'.repeat(64)}`,
        blockerRef: `ref-${'6'.repeat(64)}`,
        backlogRank: 1,
        auditAnchor: `ref-${'7'.repeat(64)}`,
        primaryObservationId: null,
        repairRowId: null,
      },
    ];
    expect(
      invoke({
        action: 'validateProof02Triage',
        args: [dispositions, normalized],
      }).ok,
    ).toBe(true);
    expect(
      invoke({ action: 'validateProof02Triage', args: [[], normalized] }).ok,
    ).toBe(false);
  });

  it('derives observed ids from the reopened report and rejects caller ids', () => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), 'camp-proof4c1-writer-'),
    );
    const reproduction = [
      {
        id: proofAnchors[0],
        status: 'passed',
        failureFingerprint: null,
        knownFailureCode: 'development-mime-diagnostic',
      },
      {
        id: proofAnchors[1],
        status: 'failed',
        failureFingerprint: null,
        knownFailureCode: 'guest-badge-timing',
      },
      {
        id: proofAnchors[2],
        status: 'missing',
        failureFingerprint: null,
        knownFailureCode: 'save-conflict-timing',
      },
      {
        id: 'e2e/campaign-customizer-handoff.spec.ts::campaign customizer handoff @campaign @customizer::unexpected failure',
        status: 'failed',
        failureFingerprint: null,
        knownFailureCode: null,
      },
    ].sort((a, b) => a.id.localeCompare(b.id));
    const request = proofRequest(
      path.join(
        root,
        '.sisyphus',
        'evidence',
        'playtest',
        `proof02-reproduction-${sha}`,
      ),
    );
    const written = invoke({
      action: 'write',
      value: request,
      reproduction,
      entropy: '7'.repeat(32),
    });
    expect(written.error).toBeUndefined();
    expect(written.ok).toBe(true);
    const command = JSON.parse(
      fs.readFileSync(
        path.join(
          (written.value as { finalDirectory: string }).finalDirectory,
          'command-result.json',
        ),
        'utf8',
      ),
    ) as { observedTestIds: string[] };
    expect(command.observedTestIds).toEqual(
      reproduction.map(({ id }) => id).sort(),
    );
    const rejected = invoke({
      action: 'write',
      value: proofRequest(
        path.join(
          root,
          'second',
          '.sisyphus',
          'evidence',
          'playtest',
          `proof02-reproduction-${sha}`,
        ),
      ),
      reproduction,
      callerObservedTestIds: ['caller-selected-id'],
      entropy: '8'.repeat(32),
    });
    expect(rejected).toMatchObject({
      ok: false,
      error: 'CAMP01_WRITER_INVALID: caller observed ids rejected',
    });
  });

  it('issues exactly the three fixed H child labels with distinct identities', () => {
    const result = invoke({
      action: 'identities',
      value: `camp01-${'8'.repeat(32)}`,
      entropy: '9'.repeat(64),
    });
    expect(result.ok).toBe(true);
    expect(Object.keys(result.value as object)).toEqual([
      'custom-save-reload',
      'campaign-mech-bay-readiness',
      'canonical-combat-post-battle',
    ]);
    // prettier-ignore
    const identities=Object.values(result.value as Record<string,Record<string,string>>), identityShape={roles:identities.every((entry)=>Object.keys(entry).join(',')==='witnessId,executionId,contextId'),count:new Set(identities.flatMap((entry)=>Object.values(entry))).size};
    expect(identityShape).toEqual({ roles: true, count: 9 });
  });

  it('maps all six H commands to the execution id in the writer-issued witness map', () => {
    const result = invoke({
      action: 'h-command-identities',
      value: `camp01-${'8'.repeat(32)}`,
    });
    expect(result.ok).toBe(true);
    const commands = result.value as Array<{
      witnessLabel: string;
      invocationId: string;
      executionId: string;
      expectedExecutionId: string;
    }>;
    expect(commands.map(({ witnessLabel }) => witnessLabel)).toEqual([
      'campaign-mech-bay-readiness',
      'custom-save-reload',
      'canonical-combat-post-battle',
      'custom-save-reload',
      'campaign-mech-bay-readiness',
      'canonical-combat-post-battle',
    ]);
    expect(
      commands.every(
        ({ executionId, expectedExecutionId }) =>
          executionId === expectedExecutionId,
      ),
    ).toBe(true);
  });
});

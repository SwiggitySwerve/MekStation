import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const controllerUrl = pathToFileURL(
  path.resolve('scripts/qc/run-camp01-authority-receipt.mjs'),
).href;
const contractUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.contract.mjs'),
).href;
const harness = `
import path from 'node:path';
import * as controller from ${JSON.stringify(controllerUrl)};
import { PROGRAM_CHILD_CHANGES, WAVE_CONTRACTS, commandSequenceDigest } from ${JSON.stringify(contractUrl)};
const request=JSON.parse(process.argv[1]);
const sha='b'.repeat(40), exactSha='c'.repeat(40), digest='sha256:'+'a'.repeat(64), spec=(child)=>[child,'101','a'.repeat(40),'approval-1','reviewer'].join('|'), owned=(merge='pending')=>['201',sha,'approval-2','owner-reviewer',merge].join('|');
const manifest=[{path:'node_modules/.package-lock.json',type:'file',size:1,digest}];
const target=(kind,subject,head)=>({kind,subject,canonicalPath:path.resolve(kind),gitWorktreeId:'worktree-'+kind,expectedHead:head,branchRef:kind==='owned'?'refs/heads/codex/test':null,oldOid:kind==='owned'?head:null,cleanManifest:manifest,nonReparse:true,initiating:false});
const programSpecs=PROGRAM_CHILD_CHANGES.map((child)=>spec(child));
const proofArgs=(mode,head)=>['proof','--mode='+mode,'--wave=camp-proof','--sha='+head,'--run-root=.sisyphus/evidence/playtest/camp-proof-'+head,'--spec='+spec('add-camp01-authority-receipts'),'--product='+owned(mode==='exact-main'?head:'pending'),...programSpecs.map((value)=>'--program-spec='+value)];
const snapshots=[], calls=[]; let state=null;
const stateStore={load:()=>state,save:(_wave,value)=>{state=structuredClone(value);snapshots.push(structuredClone(value));},remove:()=>{state=null;}};
const preflight=(row)=>({programSpecChanges:row.wave==='camp-proof'?[...PROGRAM_CHILD_CHANGES]:[],predecessorReceiptWaves:row.predecessors.filter((id)=>!id.endsWith('-required-repairs')),predecessorCleanupWaves:row.predecessors.filter((id)=>!id.endsWith('-required-repairs')),repairGates:row.predecessors.filter((id)=>id.endsWith('-required-repairs')).map((gate)=>({gate,requiredRowIds:[],registeredRowIds:[],reviewedHeadRowIds:[],exactMainRowIds:[],cleanupRowIds:[]})),cap:row.capSubject==='none'?null:{subject:row.capSubject,fileCount:1,changedLineCount:2,binaryEntries:false}});
const overrides={
  'inspectOwnedTarget:target-key-drift':(value)=>{const {gitWorktreeId:_,...drifted}=value;return drifted;},
  'verifyPreflight:missing-ten-child-entry':(value)=>({...value,programSpecChanges:value.programSpecChanges.slice(1)}),
  'inspectRowRoot:reparse-point-present':(value)=>({...value,reparsePoints:['node_modules']}),
  'createProofTarget:non-null-branch-ref':(value)=>({...value,branchRef:'refs/heads/proof-drift'}),
  'prepareEnvironment:bad-digest':()=>({executionEnvironmentDigest:'bad-digest'}),
  'observeCleanState:tracked-clean-false':(value)=>({...value,trackedClean:false}),
  'executeReceipt:wrong-phase':(value)=>({...value,phase:'observation'}),
  'invokePublicValidator:validated-false':()=>({validated:false}),
  'exportReceipt:receipt-digest-mismatch':(value)=>({...value,receiptDigest:'bad-digest'}),
  'cleanupTargets:predicate-false':(value)=>({...value,proofWorktreeRemoved:false}),
};
const override=(adapter,value)=>adapter===request.breakAdapter?(overrides[adapter+':'+request.breakWith]?.(value)??value):value;
const dependencies={stateStore,inspectOwnedTarget:({subject,headSha})=>override('inspectOwnedTarget',target('owned',subject,headSha??sha)),inspectRowRoot:({runRoot})=>override('inspectRowRoot',{repoRelativePath:runRoot,reparsePoints:[]}),verifyPreflight:({row})=>override('verifyPreflight',preflight(row)),createProofTarget:({sha:head})=>override('createProofTarget',target('proof',null,head)),prepareEnvironment:()=>override('prepareEnvironment',{executionEnvironmentDigest:digest}),observeCleanState:()=>override('observeCleanState',{headSha:request.headSha??sha,treeSha:request.headSha??sha,trackedClean:true,indexClean:true,reparsePaths:[],manifest}),executeReceipt:({row,arguments:args})=>override('executeReceipt',{runId:'camp01-'+(args.mode==='exact-main'?'5':'4').repeat(32),phase:request.phase??'final',finalizedPaths:[...row.artifacts].sort()}),invokePublicValidator:(value)=>{calls.push(value);return override('invokePublicValidator',{validated:true});},exportReceipt:({receipt})=>override('exportReceipt',{...receipt,receiptDigest:digest}),cleanupTargets:()=>override('cleanupTargets',{productWorktreeRemoved:true,proofWorktreeRemoved:true,localWaveBranchRemoved:true,initiatingTrackedTreeClean:true,durableReceiptRevalidated:true})};
try {
  let value;
  if(request.action==='parse') value=controller.parseControllerArguments(request.argv);
  else if(request.action==='provenance') { const parsed=controller.parseControllerArguments(request.argv); value=controller.buildProvenanceRecord(parsed,WAVE_CONTRACTS[parsed.wave]); }
  else if(request.action==='preflight') value=controller.validatePreflight(WAVE_CONTRACTS[request.wave],request.value);
  else if(request.action==='repair') {
    const cause='d'.repeat(64), id='proof-02-repair-'+cause, sourceDisposition={receiptId:'receipt-'+'1'.repeat(16),observationId:'observation-a',failedReportObservationId:null,failedReportFingerprint:null,causeFingerprint:'sha256:'+cause}, sequence=[['@npm','test','--','--runInBand']], row={wave:id,commandId:id,childChange:'repair-child',runRootTemplate:'.sisyphus/evidence/playtest/'+id+'-<sha>',commandSequence:sequence,canonicalArgvDigest:commandSequenceDigest(sequence),artifacts:['command-result.json','receipt-manifest.json','wave-result.json'],assertions:['repairVerified===true'],predecessors:['proof-02-triage'],sourceDisposition,capSubject:'product-pr',maxFiles:3,maxChangedLines:100,reporterContracts:[]}, source={kind:'proof',childChange:'repair-child',causeFingerprint:'sha256:'+cause,sourceDisposition,reporterContracts:[],explicitDependencies:[]};
    const deps={...dependencies,resolveRepairRegistration:()=>({declaration:{schema:'camp01-repair-row/v1',row},source,registrySet:{requiredRowIds:[id],registeredRowIds:request.drift?[]:[id]}})};
    value=await controller.runController(['register-pr-target','--wave='+id,'--subject=product','--worktree='+path.resolve('owned'),'--spec='+spec('repair-child')],deps);
  }
  else if(request.action==='sequence') { await controller.runController(['register-pr-target','--wave=camp-proof','--subject=product','--worktree='+path.resolve('owned'),'--spec='+spec('add-camp01-authority-receipts')],dependencies); request.headSha=sha; await controller.runController(proofArgs('reviewed-head',sha),dependencies); request.headSha=exactSha; const exact=await controller.runController(proofArgs('exact-main',exactSha),dependencies); const run=exact.runs.at(-1); await controller.runController(['cleanup','--wave=camp-proof','--run-root='+run.runRoot,'--run-id='+run.runId,'--receipt-digest='+run.receiptDigest],dependencies); value={snapshots,calls,state}; }
  else if(request.action==='observation') { const child='prove-saved-custom-unit-campaign-journey', root='.sisyphus/evidence/playtest/camp01h-journey-'; await controller.runController(['register-pr-target','--wave=camp-01h','--subject=product','--worktree='+path.resolve('owned'),'--spec='+spec(child)],dependencies); request.headSha=sha; request.phase='observation'; const observed=await controller.runController(['proof','--mode=reviewed-head','--wave=camp-01h','--sha='+sha,'--run-root='+root+sha,'--spec='+spec(child),'--product='+owned()],dependencies); request.headSha=exactSha; request.phase='final'; let exactError=null; try { await controller.runController(['proof','--mode=exact-main','--wave=camp-01h','--sha='+exactSha,'--run-root='+root+exactSha,'--spec='+spec(child),'--product='+owned(exactSha)],dependencies); } catch(error) { exactError=error instanceof Error?error.message:String(error); } value={phase:observed.runs[0].phase,exactError}; }
  else if(request.action==='unbound-exact') { await controller.runController(['register-pr-target','--wave=camp-proof','--subject=product','--worktree='+path.resolve('owned'),'--spec='+spec('add-camp01-authority-receipts')],dependencies); request.headSha=sha; await controller.runController(proofArgs('reviewed-head',sha),dependencies); request.headSha=exactSha; let rejected=false; try { await controller.runController(['proof','--mode=exact-main','--wave=camp-proof','--sha='+exactSha,'--run-root=.sisyphus/evidence/playtest/camp-proof-'+exactSha,'--spec='+spec('add-camp01-authority-receipts'),'--product='+['999','e'.repeat(40),'approval-9','owner-reviewer',exactSha].join('|'),...programSpecs.map((value)=>'--program-spec='+value)],dependencies); } catch(error) { rejected=error instanceof Error&&error.message.includes('provenance-unbound'); } value={rejected}; }
  else if(request.action==='malformed-dependency') { await controller.runController(['register-pr-target','--wave=camp-proof','--subject=product','--worktree='+path.resolve('owned'),'--spec='+spec('add-camp01-authority-receipts')],dependencies); if(request.breakAdapter!=='inspectOwnedTarget') { request.headSha=sha; const reviewed=await controller.runController(proofArgs('reviewed-head',sha),dependencies); if(request.breakAdapter==='cleanupTargets') { request.headSha=exactSha; const exact=await controller.runController(proofArgs('exact-main',exactSha),dependencies); const run=exact.runs.at(-1); value=await controller.runController(['cleanup','--wave=camp-proof','--run-root='+run.runRoot,'--run-id='+run.runId,'--receipt-digest='+run.receiptDigest],dependencies); } else value=reviewed; } }
  else if(request.action==='missing-dependency') value=await controller.runController(['register-pr-target','--wave=camp-proof','--subject=product','--worktree='+path.resolve('owned'),'--spec='+spec('add-camp01-authority-receipts')],{stateStore});
  process.stdout.write(JSON.stringify({ok:true,value}));
} catch(error) { process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error)})); process.exitCode=1; }`;

type Result = { ok: boolean; value?: unknown; error?: string };
function invoke(request: Record<string, unknown>): Result {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness, JSON.stringify(request)],
    { encoding: 'utf8' },
  );
  return result.stdout
    ? (JSON.parse(result.stdout) as Result)
    : { ok: false, error: result.stderr };
}

const sha = 'b'.repeat(40);
const spec = (child: string) =>
  `${child}|101|${'a'.repeat(40)}|approval-1|reviewer`;
const product = `201|${sha}|approval-2|owner-reviewer|pending`;
const proofBase = [
  'proof',
  '--mode=reviewed-head',
  '--wave=camp-proof',
  `--sha=${sha}`,
  `--run-root=.sisyphus/evidence/playtest/camp-proof-${sha}`,
  `--spec=${spec('add-camp01-authority-receipts')}`,
  `--product=${product}`,
];

describe('CAMP-01 authority receipt controller core', () => {
  it('rejects every malformed or non-closed CLI argument form', () => {
    const invalid = [
      [],
      ['unknown'],
      ['proof'],
      [...proofBase, '--unknown=x'],
      [...proofBase, '--wave=camp-proof'],
      [...proofBase, '--wave'],
      [...proofBase, '--repair='],
      ['cleanup', '--wave=camp-proof', '--run-root=x'],
    ];
    for (const argv of invalid)
      expect(invoke({ action: 'parse', argv }).ok).toBe(false);
  });

  it('builds distinct product, audit, and none provenance records', () => {
    const audit = [
      'proof',
      '--mode=reviewed-head',
      '--wave=proof-02-triage',
      `--sha=${sha}`,
      `--run-root=.sisyphus/evidence/playtest/proof02-triage-${sha}`,
      `--spec=${spec('add-camp01-authority-receipts')}`,
      `--audit=301|${sha}|approval-3|audit-reviewer|pending`,
    ];
    const none = [
      'proof',
      '--mode=exact-main',
      '--wave=proof-02-reproduction',
      `--sha=${sha}`,
      `--run-root=.sisyphus/evidence/playtest/proof02-reproduction-${sha}`,
      `--spec=${spec('add-camp01-authority-receipts')}`,
    ];
    expect(
      invoke({ action: 'provenance', argv: proofBase }).value,
    ).toMatchObject({ subject: 'product-pr', owned: { kind: 'product' } });
    expect(invoke({ action: 'provenance', argv: audit }).value).toMatchObject({
      subject: 'audit-pr',
      owned: { kind: 'audit' },
    });
    expect(invoke({ action: 'provenance', argv: none }).value).toMatchObject({
      subject: 'none',
      owned: null,
    });
  });

  it('rejects missing ten-child, predecessor, cleanup, and cap preflight facts', () => {
    const program = [
      'add-camp01-authority-receipts',
      'bind-packaged-server-to-loopback',
      'add-campaign-roster-source-readiness',
      'add-authoritative-campaign-coop-snapshot',
      'authorize-campaign-coop-participation',
      'enforce-campaign-unit-source-launch-boundary',
      'add-saved-custom-unit-campaign-picker',
      'persist-saved-custom-unit-campaign-creation',
      'resolve-saved-custom-units-in-mech-bay',
      'prove-saved-custom-unit-campaign-journey',
    ];
    const cap = {
      subject: 'product-pr',
      fileCount: 1,
      changedLineCount: 2,
      binaryEntries: false,
    };
    const proof = {
      programSpecChanges: program,
      predecessorReceiptWaves: [],
      predecessorCleanupWaves: [],
      repairGates: [],
      cap,
    };
    expect(
      invoke({
        action: 'preflight',
        wave: 'camp-proof',
        value: { ...proof, programSpecChanges: program.slice(1) },
      }).ok,
    ).toBe(false);
    const camp01a = {
      ...proof,
      programSpecChanges: [],
      predecessorReceiptWaves: [],
      predecessorCleanupWaves: [],
    };
    expect(
      invoke({ action: 'preflight', wave: 'camp-01a', value: camp01a }).ok,
    ).toBe(false);
    expect(
      invoke({
        action: 'preflight',
        wave: 'camp-proof',
        value: { ...proof, cap: null },
      }).ok,
    ).toBe(false);
  });

  it('registers only a merged cause row with exact source and registry sets', () => {
    expect(invoke({ action: 'repair' }).value).toMatchObject({
      repairSource: { observationId: 'observation-a' },
      lifecycle: 'registered',
    });
    expect(invoke({ action: 'repair', drift: true }).ok).toBe(false);
  });

  it('records reviewed-head and exact-main state before exact cleanup', () => {
    const result = invoke({ action: 'sequence' });
    expect(result.ok).toBe(true);
    const value = result.value as {
      snapshots: Array<Record<string, unknown>>;
      calls: Array<{ entry: string; stage: string }>;
      state: unknown;
    };
    expect(value.snapshots.map(({ lifecycle }) => lifecycle)).toEqual([
      'registered',
      'proof-target-created',
      'receipt-validated',
      'proof-target-created',
      'receipt-validated',
    ]);
    const runs = value.snapshots.at(-1)?.runs as Array<Record<string, unknown>>;
    expect(runs.map(({ mode, phase }) => [mode, phase])).toEqual([
      ['reviewed-head', 'final'],
      ['exact-main', 'final'],
    ]);
    expect(runs.at(-1)).toMatchObject({
      receiptDigest: `sha256:${'a'.repeat(64)}`,
      executionEnvironmentDigest: `sha256:${'a'.repeat(64)}`,
      cleanManifest: { matched: true },
      transientValidated: true,
      durableValidated: true,
    });
    expect(value.calls).toHaveLength(4);
    expect(value.calls).toMatchObject([
      {
        stage: 'transient',
        wave: 'camp-proof',
        mode: 'reviewed-head',
        sha,
        runRoot: `.sisyphus/evidence/playtest/camp-proof-${sha}`,
        runId: `camp01-${'4'.repeat(32)}`,
      },
      {
        stage: 'durable',
        wave: 'camp-proof',
        mode: 'reviewed-head',
        sha,
        runRoot: `.sisyphus/evidence/playtest/camp-proof-${sha}`,
        runId: `camp01-${'4'.repeat(32)}`,
      },
      {
        stage: 'transient',
        wave: 'camp-proof',
        mode: 'exact-main',
        sha: 'c'.repeat(40),
        runRoot: `.sisyphus/evidence/playtest/camp-proof-${'c'.repeat(40)}`,
        runId: `camp01-${'5'.repeat(32)}`,
      },
      {
        stage: 'durable',
        wave: 'camp-proof',
        mode: 'exact-main',
        sha: 'c'.repeat(40),
        runRoot: `.sisyphus/evidence/playtest/camp-proof-${'c'.repeat(40)}`,
        runId: `camp01-${'5'.repeat(32)}`,
      },
    ]);
    expect(
      value.calls.every(({ entry }) =>
        entry.endsWith('validate-camp01-authority-receipt.mjs'),
      ),
    ).toBe(true);
    expect(value.state).toBeNull();
  });

  it('retains H observation state but blocks exact-main until a reviewed final', () => {
    const result = invoke({ action: 'observation' });
    expect(result.value).toMatchObject({ phase: 'observation' });
    expect((result.value as { exactError: string }).exactError).toContain(
      'reviewed-head final missing',
    );
  });

  it.each([
    ['inspectOwnedTarget', 'target-key-drift', 'target fields drift'],
    ['verifyPreflight', 'missing-ten-child-entry', 'program child set drift'],
    ['inspectRowRoot', 'reparse-point-present', 'row root confinement drift'],
    ['createProofTarget', 'non-null-branch-ref', 'target ref drift'],
    ['prepareEnvironment', 'bad-digest', 'execution environment drift'],
    ['observeCleanState', 'tracked-clean-false', 'worktree clean-state drift'],
    ['executeReceipt', 'wrong-phase', 'receipt phase drift'],
    ['invokePublicValidator', 'validated-false', 'public validation failed'],
    ['exportReceipt', 'receipt-digest-mismatch', 'export identity drift'],
    ['cleanupTargets', 'predicate-false', 'cleanup incomplete'],
  ])('rejects malformed %s results', (breakAdapter, breakWith, failure) => {
    const result = invoke({
      action: 'malformed-dependency',
      breakAdapter,
      breakWith,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain(failure);
  });

  it('rejects an exact-main run whose provenance is not bound to the reviewed final', () => {
    const result = invoke({ action: 'unbound-exact' });
    expect(result.ok).toBe(true);
    expect(result.value).toEqual({ rejected: true });
  });

  it('rejects when a later-sub-seam dependency is absent', () => {
    const result = invoke({ action: 'missing-dependency' });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('dependency');
  });
});

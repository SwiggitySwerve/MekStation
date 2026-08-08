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
const contractUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.contract.mjs'),
).href;
const captureUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-capture-transaction.mjs'),
).href;
const validatorPath = path.resolve(
  'scripts/qc/validate-camp01-authority-receipt.mjs',
);

const harness = `
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import * as capture from ${JSON.stringify(captureUrl)};
import { WAVE_CONTRACTS } from ${JSON.stringify(contractUrl)};
import * as schemas from ${JSON.stringify(schemasUrl)};
import * as writer from ${JSON.stringify(writerUrl)};
const input=JSON.parse(fs.readFileSync(0,'utf8'));
const row=WAVE_CONTRACTS['camp-01h'];
const labels=[
  'custom-save-reload',
  'campaign-mech-bay-readiness',
  'canonical-combat-post-battle',
];
const sha='b'.repeat(40);
const exactSha='c'.repeat(40);
const digest=(value)=>schemas.digestBytes(String(value));
const predIds=[
  'receipt-'+'1'.repeat(16),
  'receipt-'+'2'.repeat(16),
  'receipt-'+'3'.repeat(16),
  'receipt-'+'4'.repeat(16),
];
const sourceIds=[
  'receipt-'+'5'.repeat(16),
  'receipt-'+'6'.repeat(16),
];
const reviewedId='receipt-'+'7'.repeat(16);
const specId='tuple-'+'1'.repeat(16);
const ownedId='tuple-'+'2'.repeat(16);
const deriveEvidenceId=(runId,label,kind,key)=>'ev-'+createHash('sha256')
  .update([
    'camp01-evidence/v1',
    runId,
    'camp-01h',
    label??'',
    kind,
    key,
  ].join('\\0'))
  .digest('hex')
  .slice(0,32);
const identities=(runId)=>Object.fromEntries(labels.map((label)=>[
  label,
  Object.fromEntries(['witnessId','executionId','contextId'].map((role)=>[
    role,
    deriveEvidenceId(runId,label,role,role),
  ])),
]));
const traces=(runId,label)=>Object.fromEntries([
  'routeEvidenceIds',
  'apiEvidenceIds',
  'storeEvidenceIds',
  'persistenceEvidenceIds',
  'navigationEvidenceIds',
  'coldReloadEvidenceIds',
].map((key)=>[key,[deriveEvidenceId(runId,label,'trace',key)]]));
const facts=(label,runId)=>label==='custom-save-reload'?{savedDesignId:digest(label+':design'),savedDesignVersion:1,rosterInstanceId:digest(label+':roster'),unitRef:digest(label+':unit'),campaignId:digest(label+':campaign'),missionId:digest(label+':mission'),saveReceiptId:predIds[0],reloadReceiptId:predIds[1]}:label==='campaign-mech-bay-readiness'?{savedDesignId:digest(label+':design'),rosterInstanceId:digest(label+':roster'),unitRef:digest(label+':unit'),unitSource:'custom',campaignId:digest(label+':campaign'),missionId:digest(label+':mission'),readinessBlockerId:traces(runId,label).routeEvidenceIds[0]}:{savedDesignId:digest(label+':design'),savedDesignUnchanged:true,campaignId:digest(label+':campaign'),missionId:digest(label+':mission'),serverSessionId:digest(label+':session'),acceptedCommandId:digest(label+':command'),terminalResultId:digest(label+':terminal'),postBattleConsequenceId:digest(label+':post-battle')};
const registry=(runId,mutation)=>{const ids=identities(runId), kinds={savedDesignId:'saved-design',rosterInstanceId:'roster-instance',unitRef:'unit-ref',campaignId:'campaign',missionId:'mission',serverSessionId:'server-session',acceptedCommandId:'command',terminalResultId:'terminal-result',postBattleConsequenceId:'post-battle-consequence'}, candidates=labels.flatMap((label)=>Object.entries(kinds).flatMap(([key,kind])=>facts(label,runId)[key]===undefined?[]:[{kind,digest:facts(label,runId)[key],sourceEvidenceId:ids[label].executionId}])), seen=new Set(), entities=candidates.filter((entry)=>{const key=entry.kind+'\\0'+entry.digest;if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>a.digest.localeCompare(b.digest)); if(mutation==='registry-missing')entities.pop(); if(mutation==='registry-source')entities[0].sourceEvidenceId=labels.map((label)=>ids[label].executionId).find((id)=>id!==entities[0].sourceEvidenceId); return {schema:'camp01-identity-registry/v1',entities,refs:[]};};
const provenance=(includeReviewed=false)=>[...predIds.map((id,index)=>({id,sourceKind:'predecessor-receipt',wave:row.predecessors[index],subject:index===1?'audit-pr':'product-pr'})),...sourceIds.map((id)=>({id,sourceKind:'predecessor-receipt',wave:'camp-01h',subject:'product-pr'})),{id:specId,sourceKind:'spec-tuple',wave:'camp-01h',subject:'product-pr'},{id:ownedId,sourceKind:'owned-pr-tuple',wave:'camp-01h',subject:'product-pr'},...includeReviewed?[{id:reviewedId,sourceKind:'reviewed-head-receipt',wave:'camp-01h',subject:'product-pr'}]:[]].sort((a,b)=>a.id.localeCompare(b.id));
const policy=capture.capturePolicyFor('camp-01h'), policyFor=(targetSha)=>({wave:'camp-01h',sha:targetSha,fixtureAllowlistDigest:policy.fixtureAllowlistDigest,barrierPolicyDigest:policy.barrierPolicyDigest});
const cap=(headSha,reviewed=null)=>({subject:'product-pr',baseSha:sha,headSha,fileCount:5,changedLineCount:300,binaryEntries:false,changedTreeManifestDigest:digest('tree'),reviewedHeadReceiptId:reviewed?.receiptId??null,reviewedHeadReceiptManifestDigest:reviewed?.manifestDigest??null});
const requestFor=(workspace,targetSha,entropy,phase,reviewed,mutation)=>{const runId='camp01-'+entropy, includeReviewed=reviewed!==null, registryContext={evidence:[],provenance:provenance(includeReviewed),refs:[],capturePolicies:[policyFor(targetSha),...includeReviewed?[policyFor(reviewed.command.sha)]:[]].sort((a,b)=>(a.wave+'\\0'+a.sha).localeCompare(b.wave+'\\0'+b.sha)),repairSources:[]}; return {wave:'camp-01h',commandId:'camp-01h',sha:targetSha,treeSha:targetSha,runRoot:path.join(workspace,...row.runRootTemplate.replace('<sha>',targetSha).split('/')),mode:phase==='final'?'exact-main':'reviewed-head',executionEnvironmentDigest:digest('environment'),provenance:{subject:'product-pr',specTupleId:specId,ownedPrTupleId:ownedId,predecessorReceiptIds:predIds},capProvenance:cap(reviewed?.command.sha??targetSha,reviewed),identityRegistry:registry(runId,mutation),registryContext,reviewedHead:reviewed,repairs:{parentRunId:'camp01-'+'9'.repeat(32),triageReceiptId:predIds[1],repairs:[]}};};
const observation=(id,failed)=>({id,status:failed?'failed':'passed',failureFingerprint:failed?digest('failure:'+id):null});
const reportFor=(reporter,index,runId,phase,ids)=>({schema:reporter.reportSchema,parentRunId:runId,witnessId:ids[reporter.witnessLabel].witnessId,executionId:ids[reporter.witnessLabel].executionId,witnessLabel:reporter.witnessLabel,invocationId:input.mutation==='unknown-reporter'&&index===0?'unknown-reporter':reporter.invocationId,producerId:reporter.producerId,reporterId:reporter.reporterId,sourceIds:reporter.sourceIds,complete:true,observations:schemas.H_TEST_IDS[reporter.invocationId].map((id,observationIndex)=>observation(id,phase==='observation'&&index===0&&observationIndex===0))});
const witnessFor=(label,runId,phase,ids,reports)=>{const trace=traces(runId,label), rawFacts=facts(label,runId), wrapped=Object.fromEntries(Object.entries(rawFacts).map(([key,value])=>[key,{status:'observed',value,sourceEvidenceId:trace.routeEvidenceIds[0]}])), reportDigests=Object.fromEntries(row.reporterContracts.filter((entry)=>entry.witnessLabel===label).map((entry)=>entry.normalizedPath).sort().map((name)=>[name,schemas.digestBytes(fs.readFileSync(reports.get(name)))])); return {schema:'camp01-witness-authority/v1',parentRunId:runId,witnessId:ids[label].witnessId,executionId:ids[label].executionId,contextId:ids[label].contextId,reportDigests,status:phase,...trace,label,facts:phase==='final'?rawFacts:wrapped};};
const experienceFor=(label,runId,phase,ids,reports)=>{const trace=traces(runId,label).routeEvidenceIds, positiveId=deriveEvidenceId(runId,label,'positive','positive'), failedReporter=row.reporterContracts[0], failedId=schemas.H_TEST_IDS[failedReporter.invocationId][0], hasFinding=phase==='observation'&&label===failedReporter.witnessLabel, findingId=deriveEvidenceId(runId,label,'finding',failedReporter.invocationId+':'+failedId), reproductionId=deriveEvidenceId(runId,label,'reproduction',failedReporter.invocationId+':'+failedId), dimensions={desktop:'pass',mobile:'pass',accessibility:'pass',visibility:'pass',feedback:'pass',recovery:'pass',cognitiveLoad:'pass',playability:'pass',enjoyment:'pass'}, findings=hasFinding?[{id:findingId,category:'coverage-gap',severity:'minor',backlogRank:1,causeFingerprint:digest('cause'),reproductionId,failedReportObservationIds:[failedId],sourceTraceIds:trace,dimensions,disposition:{outcome:'lower-severity',repairRowId:null,repairReceiptId:null,cleanupReceiptId:null,blockerRef:null,primaryFindingId:null}}]:[]; return {schema:'camp01-experience/v1',parentRunId:runId,witnessId:ids[label].witnessId,executionId:ids[label].executionId,label,positives:[{id:positiveId,sourceTraceIds:trace}],findings};};
async function writeArtifacts(context,index,phase,mutation){
  const ids=identities(context.runId);
  const reporter=row.reporterContracts[index];
  const reports=writeArtifacts.reports??=new Map();
  const report=reportFor(reporter,index,context.runId,phase,ids);
  const reportPath=context.artifactPath(reporter.normalizedPath);
  fs.writeFileSync(reportPath,schemas.canonicalBytes(report));
  reports.set(reporter.normalizedPath,reportPath);
  if(index===0){
    const snapshot={
      fixtureIds:[...policy.fixtureIds],
      fixtureAliases:[...policy.fixtureAliases],
      nonFixtureSentinels:[],
      domState:{html:'fixture'},
      appState:{route:'/fixture'},
      counters:{
        domMutations:0,
        storageWrites:0,
        databaseWrites:0,
        networkWrites:0,
      },
      barrierTripped:false,
    };
    for(const artifactPath of ['desktop.png','mobile-390x844.png']){
      const transaction=capture.openCaptureTransaction({
        wave:'camp-01h',
        invocationId:context.invocationId,
        commandSequenceIndex:0,
        artifactPath,
        artifactDirectory:path.dirname(context.artifactPath(artifactPath)),
      },{
        instrumentation:{
          seedFixtures:async()=>undefined,
          arm:async()=>undefined,
          snapshot:async()=>snapshot,
        },
      });
      await transaction.prepare();
      await transaction.capture(async(file)=>fs.writeFileSync(file,Buffer.from(artifactPath)));
      await transaction.publish();
    }
  }
  if(index!==5)return;
  const witnesses=labels.map((label)=>witnessFor(label,context.runId,phase,ids,reports));
  if(/^report-digest-\\d$/.test(mutation??'')){
    const reportIndex=Number(mutation.at(-1));
    const target=row.reporterContracts[reportIndex];
    const witness=witnesses.find((entry)=>entry.label===target.witnessLabel);
    witness.reportDigests[target.normalizedPath]=digest('drift');
  }
  if(mutation==='phase-final-witness'){
    const witness=witnesses[0];
    const traceId=witness.routeEvidenceIds[0];
    witness.status='observation';
    witness.facts=Object.fromEntries(Object.entries(witness.facts).map(([key,value])=>[
      key,
      {status:'observed',value,sourceEvidenceId:traceId},
    ]));
  }
  if(mutation==='session-identity-reuse')witnesses[2].contextId=witnesses[1].contextId;
  if(mutation==='report-digest-set')witnesses[0].reportDigests['zz-extra']=digest('extra');
  const experiences=labels.map((label)=>experienceFor(label,context.runId,phase,ids,reports));
  const canonical=witnesses[2];
  const reconciliation={
    schema:'camp01-audit-reconciliation/v1',
    status:phase,
    parentRunId:context.runId,
    sourceObservationReceiptIds:sourceIds,
    witnessIds:witnesses.map(({witnessId})=>witnessId),
    positiveIds:experiences.flatMap((entry)=>entry.positives.map(({id})=>id)).sort(),
    rankedFindingIds:experiences.flatMap((entry)=>entry.findings.map(({id})=>id)),
    criticalMajorDispositions:[],
  };
  if(mutation==='phase-final-reconciliation'||mutation==='phase-observation-reconciliation'){
    reconciliation.status=phase==='final'?'observation':'final';
  }
  witnesses.forEach((entry)=>fs.writeFileSync(
    context.artifactPath('witnesses/'+entry.label+'/authority.json'),
    schemas.canonicalBytes(entry),
  ));
  fs.writeFileSync(context.artifactPath('session-authority-map.json'),schemas.canonicalBytes({
    schema:'camp01-session-authority-map/v1',
    parentRunId:context.runId,
    witnesses,
  }));
  fs.writeFileSync(context.artifactPath('combat-authority.json'),schemas.canonicalBytes({
    schema:'camp01-combat-authority/v1',
    parentRunId:context.runId,
    witnessId:canonical.witnessId,
    executionId:canonical.executionId,
    sourceWitnessDigest:schemas.artifactDigest(canonical),
    status:canonical.status,
    facts:canonical.facts,
  }));
  fs.writeFileSync(
    context.artifactPath('audit-reconciliation.json'),
    schemas.canonicalBytes(reconciliation),
  );
  experiences.forEach((entry)=>fs.writeFileSync(
    context.artifactPath('witnesses/'+entry.label+'/experience.json'),
    schemas.canonicalBytes(entry),
  ));
  const assertions=Object.fromEntries([...row.assertions].sort().map((id)=>[
    id,
    id.endsWith('===true')?true:Number(/(?:===|>=)(-?\\d+)$/.exec(id)[1]),
  ]));
  fs.writeFileSync(context.artifactPath('wave-result.json'),schemas.canonicalBytes({
    schema:'camp01-wave-result/v1',
    wave:'camp-01h',
    runId:context.runId,
    status:phase==='final'?'passed':'failed',
    assertions,
  }));
}
let commandCount=0;
async function compose(workspace,phase,mutation=null,reviewed=null){writeArtifacts.reports=null;const entropy=phase==='final'?'2'.repeat(32):'1'.repeat(32), targetSha=phase==='final'?exactSha:sha, request=requestFor(workspace,targetSha,entropy,phase,reviewed,mutation); const result=await writer.writeReceipt(request,{randomBytes:()=>Buffer.from(entropy,'hex'),runCommand:async(_argv,context)=>{const index=commandCount%6;commandCount+=1;await writeArtifacts(context,index,phase,mutation);return {exitCode:phase==='observation'&&index===0?1:0};}}); const command=JSON.parse(fs.readFileSync(path.join(result.finalDirectory,'command-result.json'),'utf8')), manifest=JSON.parse(fs.readFileSync(path.join(result.finalDirectory,'receipt-manifest.json'),'utf8')); return {request,result,command,manifest,context:{registryContext:request.registryContext,reviewedHead:request.reviewedHead,repairs:request.repairs}};}
const summary=(receipt,phase)=>({mode:receipt.command.mode,phase,artifacts:receipt.manifest.entries.length+1,reports:row.reporterContracts.length,witnesses:JSON.parse(fs.readFileSync(path.join(receipt.result.finalDirectory,'session-authority-map.json'),'utf8')).witnesses.length,captures:receipt.command.captureAttestations.length});
try{let value; if(input.action==='observation')value=summary(await compose(input.workspace,'observation'),'observation'); else {const reviewed=await compose(input.workspace,'observation'), reviewedHead={receiptId:reviewedId,manifestDigest:schemas.artifactDigest(reviewed.manifest),command:reviewed.command,manifest:reviewed.manifest}; if(input.action==='identity'){const sessions=JSON.parse(fs.readFileSync(path.join(reviewed.result.finalDirectory,'session-authority-map.json'),'utf8')), role=input.role, expected=deriveEvidenceId(reviewed.command.runId,sessions.witnesses[0].label,role,role);value={role,matched:sessions.witnesses[0][role]===expected};} else if(input.action==='bindings'){const command=reviewed.command, sessions=JSON.parse(fs.readFileSync(path.join(reviewed.result.finalDirectory,'session-authority-map.json'),'utf8')), reports=row.reporterContracts.map((entry)=>JSON.parse(fs.readFileSync(path.join(reviewed.result.finalDirectory,entry.normalizedPath),'utf8'))), reconciliation=JSON.parse(fs.readFileSync(path.join(reviewed.result.finalDirectory,'audit-reconciliation.json'),'utf8')); if(input.mutation==='inventory-invocation')reports[0].invocationId='other'; if(input.mutation==='inventory-observation')reports[0].observations.pop(); if(input.mutation==='source-command')command.observedTestIds.pop(); if(input.mutation==='source-reconciliation')reconciliation.sourceObservationReceiptIds.pop(); value=writer.validateHBindings(command,sessions,reports,reconciliation,{registryContext:reviewed.request.registryContext});} else {const mutation=input.action==='mutate'?input.mutation:null, phase=mutation==='phase-observation-reconciliation'?'observation':'final', receipt=phase==='final'?await compose(input.workspace,'final',mutation,reviewedHead):await compose(path.join(input.workspace,'observation-mutation'),'observation',mutation); if(input.action==='final')value=summary(receipt,'final'); else if(input.action==='reopen'){const digest=writer.validateReceiptDirectory(receipt.result.finalDirectory,receipt.context);value={...summary(receipt,'final'),reopened:digest===receipt.result.receiptDigest};} else if(input.action==='public-validator'){const relative=row.runRootTemplate.replace('<sha>',exactSha), result=spawnSync(process.execPath,[${JSON.stringify(validatorPath)},'--wave=camp-01h','--run-root='+relative,'--expected-sha='+exactSha,'--mode=exact-main'],{cwd:input.workspace,encoding:'utf8',env:{...process.env,CAMP01_VALIDATION_CONTEXT:JSON.stringify(receipt.context)}});value={...summary(receipt,'final'),publicStatus:result.status,publicStdout:result.stdout,publicStderr:result.stderr};} else value=summary(receipt,phase);}} process.stdout.write(JSON.stringify({ok:true,value,commandCount}));}catch(error){process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error),commandCount}));process.exitCode=1;}`;

export type HCompositionRequest = {
  readonly action:
    | 'bindings'
    | 'final'
    | 'identity'
    | 'mutate'
    | 'observation'
    | 'public-validator'
    | 'reopen';
  readonly mutation?: string;
  readonly role?: string;
};

export type HCompositionResult = {
  readonly ok: boolean;
  readonly value?: Record<string, unknown>;
  readonly error?: string;
  readonly commandCount?: number;
};

export function invokeHComposition(
  request: HCompositionRequest,
): HCompositionResult {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof5g1-'));
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    {
      input: JSON.stringify({ workspace, ...request }),
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  const envelope = result.stdout
    ? (JSON.parse(result.stdout) as HCompositionResult)
    : { ok: false, error: result.stderr, commandCount: 0 };
  fs.rmSync(workspace, { recursive: true, force: true });
  return envelope;
}

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
const durableFactsUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-durable-facts.mjs'),
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
import * as durableFacts from ${JSON.stringify(durableFactsUrl)};
import { WAVE_CONTRACTS } from ${JSON.stringify(contractUrl)};
import * as schemas from ${JSON.stringify(schemasUrl)};
import * as writer from ${JSON.stringify(writerUrl)};
const input=JSON.parse(process.env.CAMP01_H_COMPOSITION_INPUT);
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
const repairReceiptId='receipt-'+'8'.repeat(16);
const cleanupReceiptId='receipt-'+'9'.repeat(16);
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
const stages=Object.freeze({
  'before-save':{name:'before-save',reportIndex:1,label:'custom-save-reload',factKey:'savedDesignId'},
  readiness:{name:'readiness',reportIndex:0,label:'campaign-mech-bay-readiness',factKey:'readinessBlockerId'},
  session:{name:'session',reportIndex:2,label:'canonical-combat-post-battle',factKey:'serverSessionId'},
  command:{name:'command',reportIndex:2,label:'canonical-combat-post-battle',factKey:'acceptedCommandId'},
  terminal:{name:'terminal',reportIndex:5,label:'canonical-combat-post-battle',factKey:'terminalResultId'},
  'post-battle':{name:'post-battle',reportIndex:5,label:'canonical-combat-post-battle',factKey:'postBattleConsequenceId'},
});
const stageFor=(mutation)=>Object.values(stages).find(({name})=>mutation?.includes('stage-'+name))??null;
const repairFor=(stage)=>{
  const reporter=row.reporterContracts[stage.reportIndex];
  const failedReportObservationId=schemas.H_TEST_IDS[reporter.invocationId][0];
  const causeFingerprint=digest('cause:'+stage.name);
  return {
    reporter,
    failedReportObservationId,
    failedReportFingerprint:digest('failure:'+failedReportObservationId),
    causeFingerprint,
    repairRowId:'camp-01h-repair-'+causeFingerprint.slice('sha256:'.length),
  };
};
const facts=(label,runId)=>label==='custom-save-reload'?{savedDesignId:digest(label+':design'),savedDesignVersion:1,rosterInstanceId:digest(label+':roster'),unitRef:digest(label+':unit'),campaignId:digest(label+':campaign'),missionId:digest(label+':mission'),saveReceiptId:predIds[0],reloadReceiptId:predIds[1]}:label==='campaign-mech-bay-readiness'?{savedDesignId:digest(label+':design'),rosterInstanceId:digest(label+':roster'),unitRef:digest(label+':unit'),unitSource:'custom',campaignId:digest(label+':campaign'),missionId:digest(label+':mission'),readinessBlockerId:traces(runId,label).routeEvidenceIds[0]}:{savedDesignId:digest(label+':design'),savedDesignUnchanged:true,campaignId:digest(label+':campaign'),missionId:digest(label+':mission'),serverSessionId:digest(label+':session'),acceptedCommandId:digest(label+':command'),terminalResultId:digest(label+':terminal'),postBattleConsequenceId:digest(label+':post-battle')};
const registry=(runId,mutation,phase)=>{const ids=identities(runId), stage=stageFor(mutation), kinds={savedDesignId:'saved-design',rosterInstanceId:'roster-instance',unitRef:'unit-ref',campaignId:'campaign',missionId:'mission',serverSessionId:'server-session',acceptedCommandId:'command',terminalResultId:'terminal-result',postBattleConsequenceId:'post-battle-consequence'}, candidates=labels.flatMap((label)=>Object.entries(kinds).flatMap(([key,kind])=>facts(label,runId)[key]===undefined||phase==='observation'&&stage?.label===label&&stage.factKey===key?[]:[{kind,digest:facts(label,runId)[key],sourceEvidenceId:ids[label].executionId}])), seen=new Set(), entities=candidates.filter((entry)=>{const key=entry.kind+'\\0'+entry.digest;if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>a.digest.localeCompare(b.digest)); if(mutation==='registry-missing')entities.pop(); if(mutation==='registry-source')entities[0].sourceEvidenceId=labels.map((label)=>ids[label].executionId).find((id)=>id!==entities[0].sourceEvidenceId); return {schema:'camp01-identity-registry/v1',entities,refs:[]};};
const provenance=(includeReviewed=false,includeRepair=false)=>[...predIds.map((id,index)=>({id,sourceKind:'predecessor-receipt',wave:row.predecessors[index],subject:index===1?'audit-pr':'product-pr'})),...sourceIds.map((id)=>({id,sourceKind:'predecessor-receipt',wave:'camp-01h',subject:'product-pr'})),{id:specId,sourceKind:'spec-tuple',wave:'camp-01h',subject:'product-pr'},{id:ownedId,sourceKind:'owned-pr-tuple',wave:'camp-01h',subject:'product-pr'},...includeReviewed?[{id:reviewedId,sourceKind:'reviewed-head-receipt',wave:'camp-01h',subject:'product-pr'}]:[],...includeRepair?[{id:repairReceiptId,sourceKind:'repair-receipt',wave:'camp-01h',subject:'product-pr'},{id:cleanupReceiptId,sourceKind:'cleanup-receipt',wave:'camp-01h',subject:'product-pr'}]:[]].sort((a,b)=>a.id.localeCompare(b.id));
const policy=capture.capturePolicyFor('camp-01h'), policyFor=(targetSha)=>({wave:'camp-01h',sha:targetSha,fixtureAllowlistDigest:policy.fixtureAllowlistDigest,barrierPolicyDigest:policy.barrierPolicyDigest});
const cap=(headSha,reviewed=null)=>({subject:'product-pr',baseSha:sha,headSha,fileCount:5,changedLineCount:300,binaryEntries:false,changedTreeManifestDigest:digest('tree'),reviewedHeadReceiptId:reviewed?.receiptId??null,reviewedHeadReceiptManifestDigest:reviewed?.manifestDigest??null});
const requestFor=(workspace,targetSha,entropy,phase,reviewed,mutation)=>{
  const runId='camp01-'+entropy;
  const includeReviewed=reviewed!==null;
  const stage=stageFor(mutation);
  const repair=stage?repairFor(stage):null;
  const repairSource=repair?{
    repairRowId:repair.repairRowId,
    failedReportObservationId:repair.failedReportObservationId,
    failedReportFingerprint:repair.failedReportFingerprint,
    causeFingerprint:repair.causeFingerprint,
  }:null;
  if(repairSource&&mutation?.includes('repair-fingerprint'))repairSource.failedReportFingerprint=digest('repair-fingerprint-drift');
  if(repairSource&&mutation?.includes('repair-cause'))repairSource.causeFingerprint=digest('repair-cause-drift');
  if(repairSource&&mutation?.includes('repair-first-id'))repairSource.failedReportObservationId=schemas.H_TEST_IDS[repair.reporter.invocationId][1];
  if(repairSource&&mutation?.includes('repair-observation-missing'))repairSource.failedReportObservationId='missing-'+stage.name;
  const registryContext={
    evidence:[],
    provenance:provenance(includeReviewed,phase==='final'&&stage!==null),
    refs:[],
    capturePolicies:[policyFor(targetSha),...includeReviewed?[policyFor(reviewed.command.sha)]:[]].sort((a,b)=>(a.wave+'\\0'+a.sha).localeCompare(b.wave+'\\0'+b.sha)),
    repairSources:repairSource?[repairSource]:[],
  };
  const request={
    wave:'camp-01h',
    commandId:'camp-01h',
    sha:targetSha,
    treeSha:targetSha,
    runRoot:path.join(workspace,...row.runRootTemplate.replace('<sha>',targetSha).split('/')),
    mode:phase==='final'?'exact-main':'reviewed-head',
    executionEnvironmentDigest:digest('environment'),
    provenance:{subject:'product-pr',specTupleId:specId,ownedPrTupleId:ownedId,predecessorReceiptIds:predIds},
    capProvenance:cap(reviewed?.command.sha??targetSha,reviewed),
    identityRegistry:registry(runId,mutation,phase),
    registryContext,
    reviewedHead:reviewed,
    repairs:{parentRunId:'camp01-'+'9'.repeat(32),triageReceiptId:predIds[1],repairs:[]},
  };
  if(mutation==='cap-reviewed-provenance')request.capProvenance.changedLineCount=301;
  if(mutation==='cap-reviewed-linkage')request.capProvenance.reviewedHeadReceiptId=reviewedId;
  if(mutation==='cap-exact-missing')request.reviewedHead=null;
  if(mutation==='cap-exact-link')request.capProvenance.reviewedHeadReceiptId='receipt-'+'a'.repeat(16);
  if(mutation==='cap-reviewed-head')request.capProvenance.fileCount=4;
  return request;
};
const observation=(id,failed)=>({id,status:failed?'failed':'passed',failureFingerprint:failed?digest('failure:'+id):null});
const reportFor=(reporter,index,runId,phase,ids,mutation)=>{
  const stage=stageFor(mutation);
  const failureIndex=stage?.reportIndex??0;
  return {schema:reporter.reportSchema,parentRunId:runId,witnessId:ids[reporter.witnessLabel].witnessId,executionId:ids[reporter.witnessLabel].executionId,witnessLabel:reporter.witnessLabel,invocationId:mutation==='unknown-reporter'&&index===0?'unknown-reporter':reporter.invocationId,producerId:reporter.producerId,reporterId:reporter.reporterId,sourceIds:reporter.sourceIds,complete:true,observations:schemas.H_TEST_IDS[reporter.invocationId].map((id,observationIndex)=>observation(id,phase==='observation'&&index===failureIndex&&(observationIndex===0||mutation?.includes('repair-first-id')&&observationIndex===1)))};
};
const witnessFor=(label,runId,phase,ids,reports,mutation)=>{
  const trace=traces(runId,label);
  const rawFacts=facts(label,runId);
  const wrapped=Object.fromEntries(Object.entries(rawFacts).map(([key,value])=>[key,{status:'observed',value,sourceEvidenceId:trace.routeEvidenceIds[0]}]));
  const stage=stageFor(mutation);
  if(phase==='observation'&&stage?.label===label){
    const repair=repairFor(stage);
    wrapped[stage.factKey]={status:'unavailable',failedReportObservationId:repair.failedReportObservationId,failureFingerprint:mutation?.includes('unavailable-fingerprint')?digest('wrong-failure-fingerprint'):repair.failedReportFingerprint};
  }
  const reportDigests=Object.fromEntries(row.reporterContracts.filter((entry)=>entry.witnessLabel===label).map((entry)=>entry.normalizedPath).sort().map((name)=>[name,schemas.digestBytes(fs.readFileSync(reports.get(name)))]));
  return {schema:'camp01-witness-authority/v1',parentRunId:runId,witnessId:ids[label].witnessId,executionId:ids[label].executionId,contextId:ids[label].contextId,reportDigests,status:phase,...trace,label,facts:phase==='final'?rawFacts:wrapped};
};
const experienceFor=(label,runId,phase,ids,reports,mutation)=>{
  const trace=traces(runId,label).routeEvidenceIds;
  const positiveId=deriveEvidenceId(runId,label,'positive','positive');
  const stage=stageFor(mutation);
  const failedReporter=stage?row.reporterContracts[stage.reportIndex]:row.reporterContracts[0];
  const failedId=schemas.H_TEST_IDS[failedReporter.invocationId][0];
  const hasFinding=stage?label===stage.label:phase==='observation'&&label===failedReporter.witnessLabel;
  const findingId=deriveEvidenceId(runId,label,'finding',failedReporter.invocationId+':'+failedId);
  const reproductionId=deriveEvidenceId(runId,label,'reproduction',failedReporter.invocationId+':'+failedId);
  const repair=stage?repairFor(stage):null;
  const dimensions={desktop:'pass',mobile:'pass',accessibility:'pass',visibility:'pass',feedback:'pass',recovery:'pass',cognitiveLoad:'pass',playability:'pass',enjoyment:'pass'};
  if(mutation?.includes('finding-dimension'))dimensions.desktop='unknown';
  const failedReportObservationIds=mutation?.includes('reconciliation-orphan-failure')?[schemas.H_TEST_IDS[failedReporter.invocationId][1]]:mutation?.includes('repair-first-id')?[failedId,schemas.H_TEST_IDS[failedReporter.invocationId][1]]:mutation?.includes('repair-observation-missing')?['missing-'+stage.name]:[failedId];
  const findings=hasFinding?[{
    id:findingId,
    category:mutation?.includes('finding-category')?'unknown':'coverage-gap',
    severity:mutation?.includes('finding-severity')?'unknown':stage?'major':'minor',
    backlogRank:mutation?.includes('finding-rank')?0:mutation?.includes('backlog-rank')?2:1,
    causeFingerprint:mutation?.includes('finding-cause')?'not-a-digest':repair?.causeFingerprint??digest('cause'),
    reproductionId,
    failedReportObservationIds,
    sourceTraceIds:trace,
    dimensions,
    disposition:stage?{outcome:phase==='final'?'verified-repair':'repair-required',repairRowId:repair.repairRowId,repairReceiptId:phase==='final'?repairReceiptId:null,cleanupReceiptId:phase==='final'?cleanupReceiptId:null,blockerRef:null,primaryFindingId:null}:{outcome:'lower-severity',repairRowId:null,repairReceiptId:null,cleanupReceiptId:null,blockerRef:null,primaryFindingId:null},
  }]:[];
  return {schema:'camp01-experience/v1',parentRunId:runId,witnessId:ids[label].witnessId,executionId:ids[label].executionId,label,positives:[{id:positiveId,sourceTraceIds:trace}],findings};
};
async function writeArtifacts(context,index,phase,mutation){
  const ids=identities(context.runId);
  const reporter=row.reporterContracts[index];
  const reports=writeArtifacts.reports??=new Map();
  const report=reportFor(reporter,index,context.runId,phase,ids,mutation);
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
  const witnesses=labels.map((label)=>witnessFor(label,context.runId,phase,ids,reports,mutation));
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
  const unavailable=/^unavailable-final-(\\d)$/.exec(mutation??'');
  if(unavailable){
    const witnessIndex=Number(unavailable[1]);
    const witness=witnesses[witnessIndex];
    const key=['savedDesignVersion','unitSource','savedDesignUnchanged'][witnessIndex];
    witness.facts[key]={status:'unavailable',failedReportObservationId:'unavailable-final',failureFingerprint:digest('unavailable-final')};
  }
  if(mutation==='final-evidence-empty')witnesses[0].routeEvidenceIds=[];
  const experiences=labels.map((label)=>experienceFor(label,context.runId,phase,ids,reports,mutation));
  const canonical=witnesses[2];
  const reconciliation={
    schema:'camp01-audit-reconciliation/v1',
    status:phase,
    parentRunId:context.runId,
    sourceObservationReceiptIds:sourceIds,
    witnessIds:witnesses.map(({witnessId})=>witnessId),
    positiveIds:experiences.flatMap((entry)=>entry.positives.map(({id})=>id)).sort(),
    rankedFindingIds:experiences.flatMap((entry)=>entry.findings.map(({id})=>id)),
    criticalMajorDispositions:experiences.flatMap((entry)=>entry.findings.filter((finding)=>['critical','major'].includes(finding.severity)).map(({id:findingId,causeFingerprint,disposition})=>({findingId,causeFingerprint,disposition}))),
  };
  if(mutation==='phase-final-reconciliation'||mutation==='phase-observation-reconciliation'){
    reconciliation.status=phase==='final'?'observation':'final';
  }
  if(mutation==='source-reconciliation')reconciliation.sourceObservationReceiptIds.pop();
  if(mutation?.includes('ranked-findings'))reconciliation.rankedFindingIds=[];
  if(mutation?.includes('critical-dispositions'))reconciliation.criticalMajorDispositions=[];
  if(mutation?.includes('finding-cause'))reconciliation.criticalMajorDispositions[0].causeFingerprint=repairFor(stageFor(mutation)).causeFingerprint;
  witnesses.forEach((entry)=>fs.writeFileSync(
    context.artifactPath('witnesses/'+entry.label+'/authority.json'),
    schemas.canonicalBytes(entry),
  ));
  fs.writeFileSync(context.artifactPath('session-authority-map.json'),schemas.canonicalBytes({
    schema:'camp01-session-authority-map/v1',
    parentRunId:context.runId,
    witnesses,
  }));
  const combat={
    schema:'camp01-combat-authority/v1',
    parentRunId:context.runId,
    witnessId:canonical.witnessId,
    executionId:canonical.executionId,
    sourceWitnessDigest:schemas.artifactDigest(canonical),
    status:canonical.status,
    facts:canonical.facts,
  };
  if(mutation==='authority-source-witness-digest')combat.sourceWitnessDigest=digest('authority-source-drift');
  if(mutation==='authority-fact-saved-design')combat.facts={...combat.facts,savedDesignId:digest('authority-saved-design-drift')};
  if(mutation==='authority-fact-campaign')combat.facts={...combat.facts,campaignId:digest('authority-campaign-drift')};
  if(mutation==='authority-fact-post-battle')combat.facts={...combat.facts,postBattleConsequenceId:digest('authority-post-battle-drift')};
  fs.writeFileSync(context.artifactPath('combat-authority.json'),schemas.canonicalBytes(combat));
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
async function compose(workspace,phase,mutation=null,reviewed=null){writeArtifacts.reports=null;const entropy=phase==='final'?'2'.repeat(32):'1'.repeat(32), targetSha=phase==='final'?exactSha:sha, request=requestFor(workspace,targetSha,entropy,phase,reviewed,mutation), stage=stageFor(mutation), failureIndex=stage?.reportIndex??0; const result=await writer.writeReceipt(request,{randomBytes:()=>Buffer.from(entropy,'hex'),runCommand:async(_argv,context)=>{const index=commandCount%6;commandCount+=1;await writeArtifacts(context,index,phase,mutation);return {exitCode:phase==='observation'&&index===failureIndex?1:0};}}); const command=JSON.parse(fs.readFileSync(path.join(result.finalDirectory,'command-result.json'),'utf8')), manifest=JSON.parse(fs.readFileSync(path.join(result.finalDirectory,'receipt-manifest.json'),'utf8')); return {request,result,command,manifest,context:{registryContext:request.registryContext,reviewedHead:request.reviewedHead,repairs:request.repairs}};}
const summary=(receipt,phase)=>({mode:receipt.command.mode,phase,artifacts:receipt.manifest.entries.length+1,reports:row.reporterContracts.length,witnesses:JSON.parse(fs.readFileSync(path.join(receipt.result.finalDirectory,'session-authority-map.json'),'utf8')).witnesses.length,captures:receipt.command.captureAttestations.length});
const reviewedHeadFor=(receipt)=>({receiptId:reviewedId,manifestDigest:schemas.artifactDigest(receipt.manifest),command:receipt.command,manifest:receipt.manifest});
const clone=(value)=>JSON.parse(JSON.stringify(value));
async function envelopeProbe(workspace,mutation){
  if(mutation==='cap-reviewed-head'){
    const reviewed=await compose(workspace,'observation');
    return compose(workspace,'final',mutation,reviewedHeadFor(reviewed));
  }
  if(mutation.startsWith('cap-reviewed-'))return compose(workspace,'observation',mutation);
  if(mutation.startsWith('cap-exact-')){
    const reviewed=await compose(workspace,'observation');
    return compose(workspace,'final',mutation,reviewedHeadFor(reviewed));
  }
  const reviewed=await compose(workspace,'observation');
  const receipt=await compose(workspace,'final',null,reviewedHeadFor(reviewed));
  if(mutation==='envelope-manifest-report'||mutation==='envelope-manifest-witness'){
    const suffix=mutation.endsWith('report')?'reports/01-ux-audit-deep.json':'witnesses/custom-save-reload/experience.json';
    receipt.manifest.entries=receipt.manifest.entries.filter(({path:name})=>name!==suffix);
    fs.writeFileSync(path.join(receipt.result.finalDirectory,'receipt-manifest.json'),schemas.canonicalBytes(receipt.manifest));
  } else {
    const relative=mutation.endsWith('report')?'reports/zz-extra.json':'witnesses/custom-save-reload/zz-extra.json';
    const file=path.join(receipt.result.finalDirectory,...relative.split('/'));
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,schemas.canonicalBytes({extra:true}));
  }
  return writer.validateReceiptDirectory(receipt.result.finalDirectory,receipt.context);
}
async function schemaProbe(workspace,mutation){
  const reviewed=await compose(workspace,'observation');
  if(mutation.startsWith('cap-')){
    const exact=mutation.startsWith('cap-exact-'), reviewedHead=reviewedHeadFor(reviewed);
    const request=exact?requestFor(path.join(workspace,'schema-exact'),exactSha,'2'.repeat(32),'final',reviewedHead,null):clone(reviewed.request);
    const reviewedEvidence=Object.entries(identities(reviewed.command.runId)).map(([label,ids])=>({id:ids.executionId,sourceKind:'execution',sourceKey:'executionId',runId:reviewed.command.runId,wave:'camp-01h',label})).sort((a,b)=>a.id.localeCompare(b.id));
    const context={row,runId:exact?'camp01-'+'2'.repeat(32):reviewed.command.runId,registryContext:exact?{...request.registryContext,evidence:reviewedEvidence}:request.registryContext,reviewedHead:exact?reviewedHead:null,repairs:request.repairs};
    const capMutations={
      'cap-subject':(value)=>{value.subject='audit-pr';},
      'cap-base-sha':(value)=>{value.baseSha='bad';},
      'cap-head-sha':(value)=>{value.headSha='bad';},
      'cap-file-count-type':(value)=>{value.fileCount=1.5;},
      'cap-file-count-floor':(value)=>{value.fileCount=-1;},
      'cap-file-count-ceiling':(value)=>{value.fileCount=6;},
      'cap-line-count-type':(value)=>{value.changedLineCount=1.5;},
      'cap-line-count-floor':(value)=>{value.changedLineCount=-1;},
      'cap-line-count-ceiling':(value)=>{value.changedLineCount=301;},
      'cap-binary-entry':(value)=>{value.binaryEntries=true;},
      'cap-tree-digest':(value)=>{value.changedTreeManifestDigest='bad';},
      'cap-exact-receipt':(value)=>{value.reviewedHeadReceiptId='receipt-'+'a'.repeat(16);},
      'cap-exact-manifest':(value)=>{value.reviewedHeadReceiptManifestDigest=digest('link-drift');},
      'cap-exact-reviewed-cap':(value)=>{value.fileCount=4;},
    };
    if(mutation==='cap-exact-missing')context.reviewedHead=null;
    else if(mutation==='cap-exact-context')context.reviewedHead={...context.reviewedHead,extra:true};
    else if(mutation==='cap-exact-manifest-bytes')context.reviewedHead.manifest={...context.reviewedHead.manifest,wave:'camp-00'};
    else capMutations[mutation]?.(request.capProvenance);
    return schemas.validateWriteContext(request,context);
  }
  if(mutation.startsWith('manifest-')){
    const manifest=clone(reviewed.manifest), expectedPaths=row.artifacts.filter((name)=>name!=='receipt-manifest.json');
    if(mutation==='manifest-type')manifest.entries[0].type='directory';
    if(mutation==='manifest-size')manifest.entries[0].size=-1;
    if(mutation==='manifest-digest')manifest.entries[0].digest='bad';
    if(mutation==='manifest-duplicate')manifest.entries.push(clone(manifest.entries.at(-1)));
    if(mutation==='manifest-paths')expectedPaths.pop();
    return schemas.validateArtifact(manifest,{runId:reviewed.command.runId,expectedPaths});
  }
  const reporter=row.reporterContracts[0], report=JSON.parse(fs.readFileSync(path.join(reviewed.result.finalDirectory,reporter.normalizedPath),'utf8')), entry=report.observations[0];
  if(mutation==='observation-status')entry.status='unknown';
  if(mutation==='observation-null-failure'){entry.status='failed';entry.failureFingerprint=null;}
  if(mutation==='observation-fingerprint'){entry.status='failed';entry.failureFingerprint='bad';}
  const registryContext={evidence:[
    {id:report.executionId,sourceKind:'execution',sourceKey:'executionId',runId:report.parentRunId,wave:'camp-01h',label:report.witnessLabel},
    {id:report.witnessId,sourceKind:'witness',sourceKey:'witnessId',runId:report.parentRunId,wave:'camp-01h',label:report.witnessLabel},
  ]};
  return schemas.validateArtifact(report,{reporter,row,runId:report.parentRunId,registryContext});
}
function seedDurableStub(workspace,wave,records){
  if(records.has(wave))return records.get(wave);
  const stubRow=WAVE_CONTRACTS[wave], predecessors=stubRow.predecessors.filter((name)=>!name.endsWith('-required-repairs')).map((name)=>seedDurableStub(workspace,name,records)), stubSha=createHash('sha256').update('sha:'+wave).digest('hex').slice(0,40), runId='camp01-'+createHash('sha256').update('run:'+wave).digest('hex').slice(0,32), runRoot=stubRow.runRootTemplate.replace('<sha>',stubSha), directory=path.join(workspace,...runRoot.split('/'),runId), manifest={schema:'camp01-receipt-manifest/v1',runId,wave,entries:[]}, command={wave,sha:stubSha,runId,mode:'exact-main',provenance:{specTupleId:'tuple-'+createHash('sha256').update('spec:'+wave).digest('hex').slice(0,32),ownedPrTupleId:'tuple-'+createHash('sha256').update('owned:'+wave).digest('hex').slice(0,32),predecessorReceiptIds:predecessors.map(({receiptId})=>receiptId)},capProvenance:null,identityRegistry:{refs:[]},captureAttestations:[]};
  fs.mkdirSync(directory,{recursive:true});
  fs.writeFileSync(path.join(directory,'command-result.json'),schemas.canonicalBytes(command));
  fs.writeFileSync(path.join(directory,'receipt-manifest.json'),schemas.canonicalBytes(manifest));
  if(wave==='proof-02-reproduction')fs.writeFileSync(path.join(directory,'proof02-reproduction.json'),schemas.canonicalBytes({}));
  const record={receiptId:'receipt-'+schemas.artifactDigest(manifest).slice(7,39),manifestDigest:schemas.artifactDigest(manifest)};
  records.set(wave,record);
  return record;
}
async function durableProbe(workspace,mutation){
  const receipt=await compose(workspace,'observation','stage-before-save'), records=new Map(), predecessorIds=row.predecessors.map((wave)=>wave.endsWith('-required-repairs')?predIds[row.predecessors.indexOf(wave)]:seedDurableStub(workspace,wave,records).receiptId);
  receipt.command.provenance.predecessorReceiptIds=predecessorIds;
  fs.writeFileSync(path.join(receipt.result.finalDirectory,'command-result.json'),schemas.canonicalBytes(receipt.command));
  const facts=durableFacts.createDurableFacts({initiatingRoot:workspace},{validatorSpawn:()=>({status:0}),observeCleanState:()=>({treeSha:sha})}), index=await facts.readIndex(), hRecord=index.records.find((entry)=>entry.wave==='camp-01h'), experience=Object.values(hRecord.artifacts).find((entry)=>entry?.findings?.length), finding=experience.findings[0], source=hRecord.context.registryContext.repairSources[0];
  if(mutation==='repair-sources')return {sourceCount:hRecord.context.registryContext.repairSources.length,source};
  if(mutation==='repair-gate'){
    const gateRow={...WAVE_CONTRACTS['camp-00'],predecessors:['camp-01h-required-repairs'],capSubject:'none',maxFiles:null,maxChangedLines:null}, input={row:gateRow,arguments:{mode:'reviewed-head',sha,runRoot:gateRow.runRootTemplate.replace('<sha>',sha),programSpecs:[]},provenance:{},proofTarget:{canonicalPath:workspace}};
    return (await facts.resolvePreflightFacts(input)).repairGates[0];
  }
  const sourceDisposition={receiptId:hRecord.receiptId,observationId:finding.id,failedReportObservationId:source.failedReportObservationId,failedReportFingerprint:source.failedReportFingerprint,causeFingerprint:source.causeFingerprint}, repairWave=source.repairRowId, commandSequence=[['@node','repair-probe.mjs']], declaration={schema:'camp01-repair-row/v1',row:{wave:repairWave,commandId:repairWave,childChange:'repair-h-durable-source',runRootTemplate:'.sisyphus/evidence/playtest/'+repairWave+'-<sha>',commandSequence,canonicalArgvDigest:createHash('sha256').update(JSON.stringify(commandSequence)).digest('hex'),artifacts:['command-result.json','receipt-manifest.json','wave-result.json'],assertions:['repairVerified===true'],predecessors:['camp-01g','proof-02-triage','proof-02-required-repairs'],sourceDisposition,capSubject:'product-pr',maxFiles:2,maxChangedLines:100,reporterContracts:[]}}, resolved=await facts.resolveRepairSource({wave:repairWave,declaration});
  return {kind:resolved.source.kind,explicitDependencies:resolved.source.explicitDependencies,requiredRowIds:resolved.registrySet.requiredRowIds,registeredRowIds:resolved.registrySet.registeredRowIds};
}
const repairSummary=(receipt,phase,stage)=>{
  const experience=JSON.parse(fs.readFileSync(path.join(receipt.result.finalDirectory,'witnesses',stage.label,'experience.json'),'utf8'));
  const witness=JSON.parse(fs.readFileSync(path.join(receipt.result.finalDirectory,'witnesses',stage.label,'authority.json'),'utf8'));
  const report=JSON.parse(fs.readFileSync(path.join(receipt.result.finalDirectory,repairFor(stage).reporter.normalizedPath),'utf8'));
  const finding=experience.findings[0];
  const source=receipt.request.registryContext.repairSources[0];
  return {...summary(receipt,phase),stage:stage.name,repairRowId:source.repairRowId,sourceBound:source.repairRowId===finding.disposition.repairRowId&&source.failedReportObservationId===finding.failedReportObservationIds[0]&&source.causeFingerprint===finding.causeFingerprint,disposition:finding.disposition.outcome,factState:witness.facts[stage.factKey]?.status??'complete',reportStatus:report.observations[0].status};
};
try{
  let value;
  if(input.action==='observation')value=summary(await compose(input.workspace,'observation'),'observation');
  else if(input.action==='durable')value=await durableProbe(input.workspace,input.mutation);
  else if(input.action==='envelope')value=await envelopeProbe(input.workspace,input.mutation);
  else if(input.action==='schema')value=await schemaProbe(input.workspace,input.mutation);
  else if(input.action==='repair'){
    const stage=stages[input.stage];
    if(!stage)throw new Error('unknown repair stage');
    const mutation='stage-'+stage.name;
    const reviewed=await compose(input.workspace,'observation',mutation);
    if(input.phase==='observation')value=repairSummary(reviewed,'observation',stage);
    else {
      const receipt=await compose(input.workspace,'final',mutation,reviewedHeadFor(reviewed));
      value=repairSummary(receipt,'final',stage);
    }
  } else {
    const mutation=input.action==='mutate'?input.mutation:null;
    const phase=mutation?.startsWith('observation-')||mutation==='phase-observation-reconciliation'?'observation':'final';
    const stage=stageFor(mutation);
    const reviewed=await compose(input.workspace,'observation',stage?'stage-'+stage.name:null);
    const reviewedHead=reviewedHeadFor(reviewed);
    if(input.action==='identity'){
      const sessions=JSON.parse(fs.readFileSync(path.join(reviewed.result.finalDirectory,'session-authority-map.json'),'utf8'));
      const role=input.role;
      const expected=deriveEvidenceId(reviewed.command.runId,sessions.witnesses[0].label,role,role);
      value={role,matched:sessions.witnesses[0][role]===expected};
    } else if(input.action==='bindings'){
      const command=reviewed.command;
      const sessions=JSON.parse(fs.readFileSync(path.join(reviewed.result.finalDirectory,'session-authority-map.json'),'utf8'));
      const reports=row.reporterContracts.map((entry)=>JSON.parse(fs.readFileSync(path.join(reviewed.result.finalDirectory,entry.normalizedPath),'utf8')));
      const reconciliation=JSON.parse(fs.readFileSync(path.join(reviewed.result.finalDirectory,'audit-reconciliation.json'),'utf8'));
      if(input.mutation==='inventory-invocation')reports[0].invocationId='other';
      if(input.mutation==='inventory-observation')reports[0].observations.pop();
      if(input.mutation==='source-command')command.observedTestIds.pop();
      value=writer.validateHBindings(command,sessions,reports,reconciliation,{registryContext:reviewed.request.registryContext});
    } else {
      const receipt=phase==='final'?await compose(input.workspace,'final',mutation,reviewedHead):await compose(path.join(input.workspace,'observation-mutation'),'observation',mutation);
      if(input.action==='final')value=summary(receipt,'final');
      else if(input.action==='reopen'){
        const digest=writer.validateReceiptDirectory(receipt.result.finalDirectory,receipt.context);
        value={...summary(receipt,'final'),reopened:digest===receipt.result.receiptDigest};
      } else if(input.action==='public-validator'){
        const relative=row.runRootTemplate.replace('<sha>',exactSha);
        const result=spawnSync(process.execPath,[${JSON.stringify(validatorPath)},'--wave=camp-01h','--run-root='+relative,'--expected-sha='+exactSha,'--mode=exact-main'],{cwd:input.workspace,encoding:'utf8',env:{...process.env,CAMP01_VALIDATION_CONTEXT:JSON.stringify(receipt.context)}});
        value={...summary(receipt,'final'),publicStatus:result.status,publicStdout:result.stdout,publicStderr:result.stderr};
      } else value=summary(receipt,phase);
    }
  }
  process.stdout.write(JSON.stringify({ok:true,value,commandCount}));
}catch(error){
  process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error),commandCount}));
  process.exitCode=1;
}`;

export type HCompositionRequest = {
  readonly action:
    | 'bindings'
    | 'durable'
    | 'envelope'
    | 'final'
    | 'identity'
    | 'mutate'
    | 'observation'
    | 'public-validator'
    | 'repair'
    | 'reopen'
    | 'schema';
  readonly mutation?: string;
  readonly phase?: 'final' | 'observation';
  readonly role?: string;
  readonly stage?:
    | 'before-save'
    | 'command'
    | 'post-battle'
    | 'readiness'
    | 'session'
    | 'terminal';
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
  const result = spawnSync(process.execPath, ['--input-type=module'], {
    input: harness,
    encoding: 'utf8',
    env: {
      ...process.env,
      CAMP01_H_COMPOSITION_INPUT: JSON.stringify({ workspace, ...request }),
    },
    maxBuffer: 4 * 1024 * 1024,
  });
  const envelope = result.stdout
    ? (JSON.parse(result.stdout) as HCompositionResult)
    : { ok: false, error: result.stderr, commandCount: 0 };
  fs.rmSync(workspace, { recursive: true, force: true });
  return envelope;
}

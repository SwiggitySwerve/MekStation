import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = (name: string) =>
  pathToFileURL(path.resolve(`scripts/qc/${name}.mjs`)).href;
const urls = Object.fromEntries(
  [
    'camp01-durable-facts',
    'camp01-authority-receipt',
    'camp01-authority-receipt.contract',
    'camp01-authority-receipt.schemas',
    'camp01-durable-export',
    'run-camp01-authority-receipt',
  ].map((name) => [name, moduleUrl(name)]),
);
const gitExecutable = spawnSync(
  process.platform === 'win32' ? 'where.exe' : 'which',
  ['git'],
  { encoding: 'utf8' },
).stdout.split(/\r?\n/)[0];
const harness = String.raw`
import { spawnSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
import * as factsModule from ${JSON.stringify(urls['camp01-durable-facts'])};
import { writeReceipt } from ${JSON.stringify(urls['camp01-authority-receipt'])};
import { PROGRAM_CHILD_CHANGES, REPOSITORY_IDENTITY, WAVE_CONTRACTS } from ${JSON.stringify(urls['camp01-authority-receipt.contract'])};
import { artifactDigest, canonicalBytes, digestBytes, validateArtifact, validateWriteContext } from ${JSON.stringify(urls['camp01-authority-receipt.schemas'])};
import { createDurableExport } from ${JSON.stringify(urls['camp01-durable-export'])};
  import { buildProvenanceRecord, runController, validatePreflight } from ${JSON.stringify(urls['run-camp01-authority-receipt'])};
const q=JSON.parse(fs.readFileSync(0,'utf8')), root=q.root, proof=path.join(root,'proof-reviewed'), row=WAVE_CONTRACTS['camp-proof'], reviewedSha='b'.repeat(40), exactSha='c'.repeat(40), digest='sha256:'+'a'.repeat(64), tuple=(n)=>'tuple-'+n.repeat(16), specId=tuple('2'), ownedId=tuple('3'); fs.mkdirSync(proof,{recursive:true});
const cap={subject:'product-pr',baseSha:reviewedSha,headSha:reviewedSha,fileCount:2,changedLineCount:20,binaryEntries:false,changedTreeManifestDigest:digest,reviewedHeadReceiptId:null,reviewedHeadReceiptManifestDigest:null}, baseRegistry={evidence:[],provenance:[{id:specId,sourceKind:'spec-tuple',wave:row.wave,subject:'product-pr'},{id:ownedId,sourceKind:'owned-pr-tuple',wave:row.wave,subject:'product-pr'}],refs:[],capturePolicies:[],repairSources:[]}, identityRegistry={schema:'camp01-identity-registry/v1',entities:[],refs:[]};
const targetFacts={treeSha:reviewedSha,capProvenance:{...cap,reviewedHeadReceiptId:undefined,reviewedHeadReceiptManifestDigest:undefined}}, dependencies={resolveTargetFacts:()=>targetFacts,validatorSpawn:(...args)=>spawnSync(...args)}, input=(mode,sha=mode==='reviewed-head'?reviewedSha:exactSha)=>({row,arguments:{mode,sha,runRoot:row.runRootTemplate.replace('<sha>',sha),programSpecs:PROGRAM_CHILD_CHANGES.map((name)=>name+'|1|'+reviewedSha+'|1|reviewer')},provenance:{spec:{mergeSha:reviewedSha}},state:{ownedTarget:{kind:'owned'},registration:{spec:{mergeSha:reviewedSha}}}});
async function write(base,mode,sha,registryContext,reviewedHead,entropy){const runRoot=row.runRootTemplate.replace('<sha>',sha), written=await writeReceipt({wave:row.wave,commandId:row.commandId,sha,treeSha:sha,runRoot:path.join(base,...runRoot.split('/')),mode,executionEnvironmentDigest:digest,provenance:{subject:'product-pr',specTupleId:specId,ownedPrTupleId:ownedId,predecessorReceiptIds:[]},capProvenance:mode==='reviewed-head'?cap:{...cap,reviewedHeadReceiptId:reviewedHead.receiptId,reviewedHeadReceiptManifestDigest:reviewedHead.manifestDigest},identityRegistry,registryContext,reviewedHead},{randomBytes:()=>Buffer.from(entropy.repeat(32),'hex'),runCommand:async(_argv,context)=>{fs.writeFileSync(context.artifactPath('wave-result.json'),canonicalBytes({schema:'camp01-wave-result/v1',wave:row.wave,runId:context.runId,status:'passed',assertions:Object.fromEntries([...row.assertions].sort().map((id)=>[id,true]))}));return {exitCode:0,observedTestIds:[]};}});const exporter=createDurableExport({initiatingRoot:root,transientRoot:base,validationContext:{registryContext,reviewedHead}},{validatorSpawn:spawnSync});await exporter.exportReceipt({row,receipt:{runId:written.runId,phase:'final',finalizedPaths:[...row.artifacts]},arguments:{mode,sha,runRoot},proofTarget:{canonicalPath:base}});return written;}
async function seedReviewed(){await write(proof,'reviewed-head',reviewedSha,baseRegistry,null,'4');const seams=factsModule.createDurableFacts({initiatingRoot:root},dependencies), index=await seams.readIndex(), record=index.records[0];return {seams,index,record};}
async function seedExact(sha=exactSha){const seeded=await seedReviewed(), exactProof=path.join(root,'proof-exact');fs.mkdirSync(exactProof);const reviewedHead={receiptId:seeded.record.receiptId,manifestDigest:seeded.record.manifestDigest,command:seeded.record.command,manifest:seeded.record.manifest}, registry={...baseRegistry,provenance:[...baseRegistry.provenance,{id:reviewedHead.receiptId,sourceKind:'reviewed-head-receipt',wave:row.wave,subject:'product-pr'}].sort((a,b)=>a.id.localeCompare(b.id))};await write(exactProof,'exact-main',sha,registry,reviewedHead,'5');return {seams:factsModule.createDurableFacts({initiatingRoot:root},dependencies),reviewedHead};}
function git(args,cwd=root){const result=spawnSync(q.git,['-c','core.autocrlf=false',...args],{cwd,encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);return result.stdout.trim();}
async function productionWriter(missingState=false){const scope=path.dirname(root), owned=path.join(scope,'writer-owned'), remote=path.join(scope,'writer-remote.git'), cleanupRoot=path.join(root,'.sisyphus','evidence','playtest','.camp01-cleanups');git(['init','--initial-branch=main']);git(['config','user.email','proof@example.invalid']);git(['config','user.name','Proof']);const changes=[...new Set([row.childChange,...PROGRAM_CHILD_CHANGES])];fs.mkdirSync(path.join(root,'openspec','changes'),{recursive:true});fs.writeFileSync(path.join(root,'openspec','active-change-ledger.json'),JSON.stringify({allowedActiveChanges:changes.map((name)=>({name}))})+'\n');for(const name of changes){const directory=path.join(root,'openspec','changes',name);fs.mkdirSync(directory);fs.writeFileSync(path.join(directory,'tasks.md'),'proof\n');}fs.writeFileSync(path.join(root,'seed.txt'),'seed\n');git(['add','.']);git(['commit','-m','base']);const baseSha=git(['rev-parse','HEAD']);git(['branch','codex/camp-proof',baseSha]);git(['worktree','add',owned,'codex/camp-proof']);git(['init','--bare','--initial-branch=main',remote],scope);git(['push',remote,'main:refs/heads/main']);fs.mkdirSync(cleanupRoot,{recursive:true});let headSha=null;const repository=()=>({id:REPOSITORY_IDENTITY.repositoryId,node_id:REPOSITORY_IDENTITY.nodeId,full_name:REPOSITORY_IDENTITY.nameWithOwner,default_branch:'main',fork:false,parent:null,source:null,owner:{login:'SwiggitySwerve'}}), transport=async({resource,parameters})=>{const ownedPull=String(parameters.number)==='201';if(resource==='repository')return repository();if(resource==='branch')return {name:'main',commit:{sha:baseSha}};if(resource==='pull-request')return {number:Number(parameters.number),base:{ref:'main',repo:repository()},head:{sha:ownedPull?headSha:baseSha,repo:repository()},merge_commit_sha:ownedPull?null:baseSha,user:{login:'author'}};if(resource==='reviews')return [{id:ownedPull?401:301,state:'APPROVED',commit_id:ownedPull?headSha:baseSha,dismissed_at:null,user:{login:'reviewer'}}];if(resource==='permission')return {permission:'write',user:{login:'reviewer'}};if(resource==='compare')return {status:'ahead'};throw new Error('unexpected mock resource '+resource);}, injected={git:{executable:q.git},fetchGitHubResource:transport,sessionDirectory:({operation})=>path.join(scope,operation+'.git'),testOnlyRemoteUrl:remote,testOnlyAllowLocalRemote:true,targetDependencies:{gitResolverDependencies:{resolveExecutable:()=>null}}}, producer=await factsModule.createProductionDependencies({initiatingRoot:root,cleanupRoot},injected), specTuple=row.childChange+'|101|'+baseSha+'|301|reviewer';await runController(['register-pr-target','--wave='+row.wave,'--subject=product','--worktree='+owned,'--spec='+specTuple],producer);fs.writeFileSync(path.join(owned,'change.txt'),'change\n');git(['add','change.txt'],owned);git(['commit','-m','change'],owned);headSha=git(['rev-parse','HEAD'],owned);const arguments_={command:'proof',mode:'reviewed-head',wave:row.wave,sha:headSha,runRoot:row.runRootTemplate.replace('<sha>',headSha),spec:specTuple,product:'201|'+headSha+'|401|reviewer|pending',audit:null,programSpecs:PROGRAM_CHILD_CHANGES.map((name)=>name+'|101|'+baseSha+'|301|reviewer'),dispositions:[],repairs:[]}, provenance=buildProvenanceRecord(arguments_,row), proofTarget={canonicalPath:root}, writerInput={row,arguments:arguments_,provenance,proofTarget}, state=producer.stateStore.load(row.wave);validatePreflight(row,await producer.verifyPreflight({...writerInput,state}));if(missingState)producer.stateStore.remove(row.wave);const writer=await producer.resolveWriterContext(writerInput), accepted=validateWriteContext({wave:row.wave,commandId:row.commandId,sha:headSha,treeSha:writer.treeSha,executionEnvironmentDigest:digest,mode:'reviewed-head',provenance:writer.provenance,capProvenance:writer.capProvenance,identityRegistry:writer.identityRegistry},{row,registryContext:writer.registryContext,reviewedHead:writer.reviewedHead});return {accepted,inputKeys:Object.keys(writerInput),cap:{fileCount:writer.capProvenance.fileCount,changedLineCount:writer.capProvenance.changedLineCount}};}
try { let value;
  if(q.action.startsWith('bootstrap')){const seams=factsModule.createDurableFacts({initiatingRoot:root},dependencies), first=await seams.resolvePreflightFacts(input('reviewed-head'));if(q.action==='bootstrap-different')await seams.resolvePreflightFacts(input('reviewed-head','d'.repeat(40)));else if(q.action==='bootstrap-consumed'){await seedReviewed();await seams.resolvePreflightFacts(input('reviewed-head'));}else await seams.resolvePreflightFacts(input('reviewed-head'));value=first;}
  else if(q.action==='oracles'){const {seams,record}=await seedReviewed(), preflight=await seams.resolvePreflightFacts(input('exact-main')), writer=await seams.resolveWriterInputs(input('exact-main')), additions=[{id:specId,sourceKind:'spec-tuple',wave:row.wave,subject:'product-pr'},{id:ownedId,sourceKind:'owned-pr-tuple',wave:row.wave,subject:'product-pr'}], registryContext={...writer.registryContext,provenance:[...writer.registryContext.provenance.filter((entry)=>!additions.some(({id})=>id===entry.id)),...additions].sort((a,b)=>a.id.localeCompare(b.id))};value={index:(await seams.readIndex()).records.map(({wave,runId,mode,sha,receiptId})=>({wave,runId,mode,sha,receiptId})),preflight:validatePreflight(row,preflight),writer:validateWriteContext({wave:row.wave,commandId:row.commandId,sha:exactSha,treeSha:writer.treeSha,executionEnvironmentDigest:digest,mode:'exact-main',provenance:{subject:'product-pr',specTupleId:specId,ownedPrTupleId:ownedId,predecessorReceiptIds:[]},capProvenance:writer.capProvenance,identityRegistry:writer.identityRegistry},{row,registryContext,reviewedHead:writer.reviewedHead}),link:[writer.capProvenance.reviewedHeadReceiptId,writer.capProvenance.reviewedHeadReceiptManifestDigest],expected:[record.receiptId,record.manifestDigest]};}
  else if(q.action==='tamper'||q.action==='unvalidated'){const {record}=await seedReviewed();if(q.action==='tamper')fs.writeFileSync(path.join(record.directory,'wave-result.json'),'tamper');else {const command={...record.command,unexpected:true}, commandBytes=canonicalBytes(command), manifest={...record.manifest,entries:record.manifest.entries.map((entry)=>entry.path==='command-result.json'?{...entry,size:Buffer.byteLength(commandBytes),digest:digestBytes(commandBytes)}:entry)};fs.writeFileSync(path.join(record.directory,'command-result.json'),commandBytes);fs.writeFileSync(path.join(record.directory,'receipt-manifest.json'),canonicalBytes(manifest));}await factsModule.createDurableFacts({initiatingRoot:root},dependencies).readIndex();value=true;}
  else if(q.action==='missing-predecessor'){const seams=factsModule.createDurableFacts({initiatingRoot:root},dependencies), next={...WAVE_CONTRACTS['camp-01a'],predecessors:['camp-proof']};await seams.resolvePreflightFacts({...input('reviewed-head'),row:next});value=true;}
  else if(q.action==='missing-cleanup'||q.action==='cleanup'){const {seams}=await seedExact(), index=await seams.readIndex(), exact=index.records.find((entry)=>entry.mode==='exact-main');if(q.action==='cleanup'){const cleanupRoot=path.join(root,'.sisyphus','evidence','playtest','.camp01-cleanups');fs.mkdirSync(cleanupRoot,{recursive:true});const cleanup={schema:'camp01-cleanup/v1',wave:'camp-proof',runId:exact.runId,receiptDigest:exact.manifestDigest,productWorktreeRemoved:true,proofWorktreeRemoved:true,localWaveBranchRemoved:true,initiatingTrackedTreeClean:true,durableReceiptRevalidated:true};validateArtifact(cleanup);fs.writeFileSync(path.join(cleanupRoot,'camp-proof-'+exact.runId+'-wave-cleanup.json'),canonicalBytes(cleanup));}const next={...WAVE_CONTRACTS['camp-01a'],predecessors:['camp-proof']}, current=input('reviewed-head'), preflight=await seams.resolvePreflightFacts({...current,row:next,arguments:{...current.arguments,programSpecs:[]}});value=validatePreflight(next,preflight);}
  else if(q.action==='composition'){const cleanupRoot=path.join(root,'.sisyphus','evidence','playtest','.camp01-cleanups');fs.mkdirSync(cleanupRoot,{recursive:true});const target={kind:'owned',subject:'product',canonicalPath:root,gitWorktreeId:path.join(root,'.git'),expectedHead:reviewedSha,branchRef:'refs/heads/main',oldOid:reviewedSha,cleanManifest:[],nonReparse:true,initiating:true}, deps=await factsModule.createProductionDependencies({initiatingRoot:root,initiatingTarget:target},{git:{executable:path.join(root,'git')},fetchGitHubResource:()=>{throw new Error('network forbidden')}});value=['stateStore','inspectOwnedTarget','inspectRowRoot','verifyPreflight','resolveRepairRegistration','createProofTarget','prepareEnvironment','observeCleanState','executeReceipt','invokePublicValidator','exportReceipt','cleanupTargets'].every((name)=>name==='stateStore'?deps[name]&&typeof deps[name].load==='function':typeof deps[name]==='function');}
  else if(q.action==='registry-gate'){const wave='proof-02-repair-'+'f'.repeat(64), dynamic={...WAVE_CONTRACTS['camp-00'],wave,commandId:wave,runRootTemplate:'.sisyphus/evidence/playtest/'+wave+'-<sha>'}, repairRegistry={discover:()=>[{wave,row:dynamic}]}, seams=factsModule.createDurableFacts({initiatingRoot:root},{...dependencies,repairRegistry}), parent={...WAVE_CONTRACTS['camp-00'],predecessors:['proof-02-required-repairs'],capSubject:'none'}, current=input('reviewed-head');value=(await seams.resolvePreflightFacts({...current,row:parent,arguments:{...current.arguments,programSpecs:[]}})).repairGates[0];}
  else if(q.action==='writer-context'||q.action==='writer-context-missing')value=await productionWriter(q.action.endsWith('missing'));
  else if(q.action==='lifecycle'){const scope=path.dirname(root), owned=path.join(scope,'owned'), proofRoot=path.join(scope,'proofs'), cleanupRoot=path.join(root,'.sisyphus','evidence','playtest','.camp01-cleanups');git(['init','--initial-branch=main']);git(['config','user.email','proof@example.invalid']);git(['config','user.name','Proof']);fs.writeFileSync(path.join(root,'seed.txt'),'seed\n');git(['add','seed.txt']);git(['commit','-m','seed']);const sha=git(['rev-parse','HEAD']);git(['branch','codex/camp-proof',sha]);git(['worktree','add',owned,'codex/camp-proof']);fs.mkdirSync(proofRoot);fs.mkdirSync(cleanupRoot,{recursive:true});await seedExact(sha);const exact=(await factsModule.createDurableFacts({initiatingRoot:root},dependencies).readIndex()).records.find((entry)=>entry.mode==='exact-main'), initiatingTarget={kind:'owned',subject:'product',canonicalPath:root,gitWorktreeId:fs.realpathSync.native(git(['rev-parse','--absolute-git-dir'])),expectedHead:sha,branchRef:'refs/heads/main',oldOid:sha,cleanManifest:[],nonReparse:true,initiating:true}, options={initiatingRoot:root,initiatingTarget,proofRoot,cleanupRoot}, injected={git:{executable:q.git},fetchGitHubResource:()=>{throw new Error('network forbidden')}};const producer=await factsModule.createProductionDependencies(options,injected), ownedTarget=await producer.inspectOwnedTarget({wave:row.wave,subject:'product',worktree:owned,spec:{mergeSha:sha},row,headSha:sha}), proofTarget=await producer.createProofTarget({wave:row.wave,mode:'exact-main',sha}), run={mode:'exact-main',phase:'final',sha,runRoot:exact.runRoot,provenance:{subject:'product-pr',owned:{kind:'product',headSha:sha}},proofTarget,cleanManifest:{baseline:proofTarget.cleanManifest,final:proofTarget.cleanManifest,matched:true},executionEnvironmentDigest:digest,runId:exact.runId,receiptDigest:exact.manifestDigest,transientValidated:true,durableValidated:true}, state={schema:'camp01-controller-state/v1',wave:row.wave,rowDigest:digest,repairSource:null,registration:{subject:'product-pr'},ownedTarget,proofTarget,runs:[run],lifecycle:'receipt-validated'};producer.stateStore.save(row.wave,state);const fresh=await factsModule.createProductionDependencies(options,injected);value=await runController(['cleanup','--wave='+row.wave,'--run-root='+run.runRoot,'--run-id='+run.runId,'--receipt-digest='+run.receiptDigest],fresh);}
  else if(q.action==='repair-source'){await seedExact();const cause='sha256:'+'f'.repeat(64), wave='proof-02-repair-'+'f'.repeat(64), sourceDisposition={receiptId:'receipt-'+'1'.repeat(16),observationId:'observation-a',failedReportObservationId:'observation-a',failedReportFingerprint:digest,causeFingerprint:cause}, declaration={row:{wave,sourceDisposition}};await factsModule.createDurableFacts({initiatingRoot:root},dependencies).resolveRepairSource({wave,declaration});value=true;}
  process.stdout.write(JSON.stringify({ok:true,value}));
} catch(error){process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error),name:error instanceof Error?error.name:null}));process.exitCode=1;}`;

type Result = { ok: boolean; value?: unknown; error?: string; name?: string };
function invoke(action: string): Result {
  const scope = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof3d3-')),
    root = path.join(scope, 'repo');
  fs.mkdirSync(root);
  try {
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '--eval', harness],
      {
        input: JSON.stringify({ action, root, git: gitExecutable }),
        encoding: 'utf8',
      },
    );
    return result.stdout
      ? (JSON.parse(result.stdout) as Result)
      : { ok: false, error: result.stderr };
  } finally {
    fs.rmSync(scope, { recursive: true, force: true });
  }
}

describe('CAMP-01 durable facts and production composition', () => {
  it('reopens a real export and satisfies the preflight, writer, and cap-link consumers', () => {
    const result = invoke('oracles');
    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({ preflight: true, writer: true });
    expect(
      (result.value as { link: string[]; expected: string[] }).link,
    ).toEqual((result.value as { expected: string[] }).expected);
  });

  it('loads persisted controller state for the proof-environment writer call shape', () => {
    const result = invoke('writer-context');
    expect(result.error).toBeUndefined();
    expect(result).toMatchObject({
      ok: true,
      value: {
        accepted: true,
        inputKeys: ['row', 'arguments', 'provenance', 'proofTarget'],
        cap: { fileCount: 1, changedLineCount: 1 },
      },
    });
  });

  it('rejects a cap-owning writer call when persisted controller state is absent', () => {
    const result = invoke('writer-context-missing');
    expect(result.error).toBe(
      'CAMP01_FACTS_INVALID: owned target state missing',
    );
    expect(result).toMatchObject({
      ok: false,
      name: 'Camp01FactsError',
    });
  });

  it.each(['tamper', 'unvalidated'])(
    'rejects a %s durable receipt through the public validator',
    (action) => {
      expect(invoke(action).error).toBe(
        'CAMP01_FACTS_INVALID: public validator rejected durable receipt',
      );
    },
  );

  it('requires both the predecessor exact-main receipt and cleanup receipt', () => {
    expect(invoke('missing-predecessor').error).toBe(
      'CAMP01_FACTS_INVALID: predecessor receipt missing: camp-proof',
    );
    expect(invoke('missing-cleanup').error).toBe(
      'CAMP01_FACTS_INVALID: predecessor cleanup missing: camp-proof',
    );
    expect(invoke('cleanup')).toMatchObject({ ok: true, value: true });
  });

  it('re-admits the same reviewed SHA while the durable tree is empty', () => {
    expect(invoke('bootstrap')).toMatchObject({ ok: true });
  });

  it.each([
    ['bootstrap-different', 'bootstrap already admitted'],
    ['bootstrap-consumed', 'bootstrap consumed'],
  ])('rejects %s', (action, message) => {
    expect(invoke(action).error).toBe(`CAMP01_FACTS_INVALID: ${message}`);
  });

  it('completes exact cleanup with fresh production dependencies and real worktrees', () => {
    expect(invoke('lifecycle')).toEqual({
      ok: true,
      value: {
        productWorktreeRemoved: true,
        proofWorktreeRemoved: true,
        localWaveBranchRemoved: true,
        initiatingTrackedTreeClean: true,
        durableReceiptRevalidated: true,
      },
    });
  });

  it('assembles every controller dependency without using the injected network transport', () => {
    expect(invoke('composition')).toEqual({ ok: true, value: true });
  });

  it('feeds the unfiltered durable registration set into the production equality gate', () => {
    expect(invoke('registry-gate').value).toMatchObject({
      requiredRowIds: [],
      registeredRowIds: [`proof-02-repair-${'f'.repeat(64)}`],
    });
  });

  it('rejects a repair source absent from reopened durable receipts', () => {
    expect(invoke('repair-source').error).toBe(
      'CAMP01_FACTS_INVALID: declared repair source absent from durable receipts',
    );
  });
});

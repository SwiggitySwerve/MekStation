import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PROGRAM_CHILD_CHANGES,
  WAVE_CONTRACTS,
  assertRepairDeclaration,
} from './camp01-authority-receipt.contract.mjs';

export const PUBLIC_VALIDATOR_ENTRY = fileURLToPath(
  new URL('./validate-camp01-authority-receipt.mjs', import.meta.url),
);
const SHA = /^[0-9a-f]{40}$/,
  DIGEST = /^sha256:[0-9a-f]{64}$/,
  RUN_ID = /^camp01-[0-9a-f]{32}$/,
  WAVE = /^[a-z0-9][a-z0-9-]{0,127}$/;
// prettier-ignore
const SINGLE=Object.freeze({'register-pr-target':['wave','subject','worktree','spec'],proof:['mode','wave','sha','run-root','spec','product','audit'],cleanup:['wave','run-root','run-id','receipt-digest']});
// prettier-ignore
const REQUIRED=Object.freeze({'register-pr-target':['wave','subject','worktree'],proof:['mode','wave','sha','run-root','spec'],cleanup:['wave','run-root','run-id','receipt-digest']});
// prettier-ignore
const REPEATED=Object.freeze({'register-pr-target':[],proof:['program-spec','disposition','repair'],cleanup:[]});

// prettier-ignore
export function parseControllerArguments(argv) {
  if (!Array.isArray(argv)||!Object.hasOwn(SINGLE,argv[0])) fail('unknown subcommand'); const command=argv[0], values={}; for(const name of REPEATED[command]) values[name]=[];
  for(const token of argv.slice(1)){const match=/^--([a-z-]+)=(.+)$/.exec(token); if(!match||![...SINGLE[command],...REPEATED[command]].includes(match[1])) fail('invalid option'); if(REPEATED[command].includes(match[1])) values[match[1]].push(match[2]); else if(Object.hasOwn(values,match[1])) fail('duplicate option'); else values[match[1]]=match[2];}
  if(REQUIRED[command].some((name)=>!Object.hasOwn(values,name))) fail('missing option'); for(const name of REPEATED[command]) if(new Set(values[name]).size!==values[name].length) fail('duplicate repeated option'); if(!WAVE.test(values.wave)) fail('invalid wave');
  return command==='register-pr-target'?parseRegister(values):command==='cleanup'?parseCleanup(values):parseProof(values);
}

// prettier-ignore
export function buildProvenanceRecord(arguments_,row) {
  if(!row||arguments_.command!=='proof') fail('provenance row missing'); const spec=parseSpecTuple(arguments_.spec); if(spec.childChange!==row.childChange) fail('spec child drift'); const ownedValue=row.capSubject==='product-pr'?arguments_.product:row.capSubject==='audit-pr'?arguments_.audit:null;
  if((row.capSubject==='product-pr')!==!!arguments_.product||(row.capSubject==='audit-pr')!==!!arguments_.audit||row.capSubject==='none'&&(arguments_.product||arguments_.audit)) fail('provenance subject drift'); const owned=ownedValue===null?null:{kind:row.capSubject==='product-pr'?'product':'audit',...parseOwnedTuple(ownedValue)};
  if(owned&&arguments_.mode==='reviewed-head'&&(owned.headSha!==arguments_.sha||owned.mergeSha!==null)) fail('reviewed-head provenance drift'); if(owned&&arguments_.mode==='exact-main'&&owned.mergeSha!==arguments_.sha) fail('exact-main provenance drift'); return {subject:row.capSubject,spec,owned};
}

// prettier-ignore
export function validatePreflight(row,value) {
  exactKeys(value,['programSpecChanges','predecessorReceiptWaves','predecessorCleanupWaves','repairGates','cap'],'preflight'); exactSet(value.programSpecChanges,row.wave==='camp-proof'?PROGRAM_CHILD_CHANGES:[],'program child set'); const concrete=row.predecessors.filter((id)=>!id.endsWith('-required-repairs')); exactSet(value.predecessorReceiptWaves,concrete,'predecessor receipt set'); exactSet(value.predecessorCleanupWaves,concrete,'predecessor cleanup set'); const virtual=row.predecessors.filter((id)=>id.endsWith('-required-repairs')); exactSet(value.repairGates.map((entry)=>entry.gate),virtual,'repair gate set');
  for(const gate of value.repairGates){exactKeys(gate,['gate','requiredRowIds','registeredRowIds','reviewedHeadRowIds','exactMainRowIds','cleanupRowIds'],'repair gate'); for(const key of ['registeredRowIds','reviewedHeadRowIds','exactMainRowIds','cleanupRowIds']) exactSet(gate[key],gate.requiredRowIds,`${gate.gate} ${key}`);}
  if(row.capSubject==='none'){if(value.cap!==null) fail('unexpected cap'); return true;} exactKeys(value.cap,['subject','fileCount','changedLineCount','binaryEntries'],'cap'); if(value.cap.subject!==row.capSubject||!Number.isInteger(value.cap.fileCount)||value.cap.fileCount<0||value.cap.fileCount>row.maxFiles||!Number.isInteger(value.cap.changedLineCount)||value.cap.changedLineCount<0||value.cap.changedLineCount>row.maxChangedLines||value.cap.binaryEntries!==false) fail('cap preflight drift'); return true;
}

// prettier-ignore
export async function runController(argv,dependencies={}) { const arguments_=parseControllerArguments(argv), store=dependencies.stateStore??createFileStateStore(process.cwd()); assertStore(store); if(arguments_.command==='cleanup') return cleanup(arguments_,store,dependencies); const resolved=await resolveRow(arguments_.wave,arguments_.spec,dependencies); return arguments_.command==='register-pr-target'?registerTarget(arguments_,resolved,store,dependencies):proof(arguments_,resolved,store,dependencies); }

// prettier-ignore
function parseRegister(values) { if(!['product','audit'].includes(values.subject)||!path.isAbsolute(values.worktree)||/[*?]/.test(values.worktree)) fail('invalid target registration'); if(values.spec!==undefined) parseSpecTuple(values.spec); return {command:'register-pr-target',wave:values.wave,subject:values.subject,worktree:path.resolve(values.worktree),spec:values.spec??null}; }
// prettier-ignore
function parseCleanup(values) { if(!validRunRoot(values['run-root'])||!RUN_ID.test(values['run-id'])||!DIGEST.test(values['receipt-digest'])) fail('invalid cleanup identity'); return {command:'cleanup',wave:values.wave,runRoot:values['run-root'],runId:values['run-id'],receiptDigest:values['receipt-digest']}; }
// prettier-ignore
function parseProof(values) { if(!['reviewed-head','exact-main'].includes(values.mode)||!SHA.test(values.sha)||!validRunRoot(values['run-root'])) fail('invalid proof identity'); parseSpecTuple(values.spec); if(values.product) parseOwnedTuple(values.product); if(values.audit) parseOwnedTuple(values.audit); for(const tuple of values['program-spec']) parseSpecTuple(tuple); for(const tuple of values.disposition) parseTuple(tuple,13,'disposition'); for(const tuple of values.repair) parseTuple(tuple,17,'repair'); return {command:'proof',mode:values.mode,wave:values.wave,sha:values.sha,runRoot:values['run-root'],spec:values.spec,product:values.product??null,audit:values.audit??null,programSpecs:values['program-spec'],dispositions:values.disposition,repairs:values.repair}; }

// prettier-ignore
async function resolveRow(wave,specValue,dependencies) {
  if(WAVE_CONTRACTS[wave]) return {row:WAVE_CONTRACTS[wave],repairSource:null}; if(!specValue) fail('repair spec missing'); const registration=await need(dependencies,'resolveRepairRegistration','PROOF-3C')({wave,spec:parseSpecTuple(specValue)}); exactKeys(registration,['declaration','source','registrySet'],'repair registration'); assertRepairDeclaration(registration.declaration,registration.source); exactKeys(registration.registrySet,['requiredRowIds','registeredRowIds'],'repair registry set'); exactSet(registration.registrySet.registeredRowIds,registration.registrySet.requiredRowIds,'repair registry equality'); if(!registration.registrySet.requiredRowIds.includes(wave)||registration.declaration.row.wave!==wave) fail('repair row identity drift'); return {row:registration.declaration.row,repairSource:registration.source.sourceDisposition};
}

// prettier-ignore
async function registerTarget(arguments_,resolved,store,dependencies) {
  const expectedSubject=resolved.row.capSubject==='product-pr'?'product':resolved.row.capSubject==='audit-pr'?'audit':null; if(arguments_.subject!==expectedSubject||expectedSubject==='product'!==(arguments_.spec!==null)||expectedSubject==='audit'&&arguments_.spec!==null) fail('registration subject drift'); const spec=arguments_.spec===null?null:parseSpecTuple(arguments_.spec); if(spec&&spec.childChange!==resolved.row.childChange) fail('registration spec drift'); if(store.load(arguments_.wave)!==null) fail('target already registered');
  const ownedTarget=await need(dependencies,'inspectOwnedTarget','PROOF-3C')({wave:arguments_.wave,subject:arguments_.subject,worktree:arguments_.worktree,spec,row:resolved.row,headSha:spec?.mergeSha}); assertTarget(ownedTarget,{kind:'owned',subject:arguments_.subject,canonicalPath:arguments_.worktree}); const state={schema:'camp01-controller-state/v1',wave:arguments_.wave,rowDigest:rowDigest(resolved.row),repairSource:resolved.repairSource,registration:{subject:resolved.row.capSubject,spec,recordedAt:'register-pr-target'},ownedTarget,proofTarget:null,runs:[],lifecycle:'registered'}; store.save(arguments_.wave,state); return state;
}

// prettier-ignore
async function proof(arguments_,resolved,store,dependencies) {
  const row=resolved.row, provenance=buildProvenanceRecord(arguments_,row), expectedRoot=row.runRootTemplate.replace('<sha>',arguments_.sha); if(arguments_.runRoot!==expectedRoot) fail('row root mismatch'); validateProofInputs(arguments_,row); let state=store.load(arguments_.wave); if(state===null&&row.capSubject==='none') state={schema:'camp01-controller-state/v1',wave:arguments_.wave,rowDigest:rowDigest(row),repairSource:resolved.repairSource,registration:{subject:'none',spec:provenance.spec,recordedAt:'proof'},ownedTarget:null,proofTarget:null,runs:[],lifecycle:'registered'}; assertState(state,arguments_.wave);
  if(state.rowDigest!==rowDigest(row)||JSON.stringify(state.repairSource)!==JSON.stringify(resolved.repairSource)) fail('registered row drift'); if(row.capSubject!=='none'&&!state.ownedTarget||row.capSubject==='none'&&state.ownedTarget!==null) fail('owned target drift'); if(row.capSubject==='product-pr'&&JSON.stringify(state.registration.spec)!==JSON.stringify(provenance.spec)) fail('registered spec drift'); if(arguments_.mode==='exact-main'&&provenance.owned!==null&&!state.runs.some((run)=>run.mode==='reviewed-head'&&run.phase==='final'&&run.provenance.owned!==null&&run.provenance.owned.prNumber===provenance.owned.prNumber&&run.provenance.owned.headSha===provenance.owned.headSha&&run.sha===provenance.owned.headSha)) fail('reviewed-head final missing or provenance-unbound');
  const preflight=await need(dependencies,'verifyPreflight','PROOF-3C')({row,arguments:arguments_,provenance,state}); validatePreflight(row,preflight); const confinement=await need(dependencies,'inspectRowRoot','PROOF-3D')({runRoot:arguments_.runRoot,row,sha:arguments_.sha}); exactKeys(confinement,['repoRelativePath','reparsePoints'],'row root confinement'); if(confinement.repoRelativePath!==expectedRoot||!Array.isArray(confinement.reparsePoints)||confinement.reparsePoints.length) fail('row root confinement drift');
  const proofTarget=await need(dependencies,'createProofTarget','PROOF-3C')({wave:row.wave,sha:arguments_.sha,mode:arguments_.mode}); assertTarget(proofTarget,{kind:'proof',subject:null,expectedHead:arguments_.sha}); state={...state,proofTarget,lifecycle:'proof-target-created'}; store.save(arguments_.wave,state); const environment=await need(dependencies,'prepareEnvironment','PROOF-3B')({row,proofTarget}); exactKeys(environment,['executionEnvironmentDigest'],'execution environment'); if(!DIGEST.test(environment.executionEnvironmentDigest)) fail('execution environment drift');
  const baseline=await need(dependencies,'observeCleanState','PROOF-3C')({target:proofTarget,phase:'baseline',runRoot:arguments_.runRoot}); assertCleanState(baseline,arguments_.sha); const receipt=await need(dependencies,'executeReceipt','PROOF-3B')({row,arguments:arguments_,provenance,environment,proofTarget}); assertReceipt(receipt,row,arguments_.mode); await validatePublic(dependencies,{stage:'transient',wave:row.wave,mode:arguments_.mode,sha:arguments_.sha,runRoot:arguments_.runRoot,runId:receipt.runId}); const exported=await need(dependencies,'exportReceipt','PROOF-3D')({row,receipt,arguments:arguments_,proofTarget}); assertExport(exported,receipt); await validatePublic(dependencies,{stage:'durable',wave:row.wave,mode:arguments_.mode,sha:arguments_.sha,runRoot:arguments_.runRoot,runId:receipt.runId});
  const final=await need(dependencies,'observeCleanState','PROOF-3C')({target:proofTarget,phase:'final',runRoot:arguments_.runRoot}); assertCleanState(final,arguments_.sha); if(JSON.stringify(final.manifest)!==JSON.stringify(baseline.manifest)) fail('clean manifest drift'); const run={mode:arguments_.mode,phase:receipt.phase,sha:arguments_.sha,runRoot:arguments_.runRoot,provenance,proofTarget,cleanManifest:{baseline:baseline.manifest,final:final.manifest,matched:true},executionEnvironmentDigest:environment.executionEnvironmentDigest,runId:receipt.runId,receiptDigest:exported.receiptDigest,transientValidated:true,durableValidated:true}; state={...state,proofTarget,runs:[...state.runs,run],lifecycle:'receipt-validated'}; store.save(arguments_.wave,state); return state;
}

// prettier-ignore
async function cleanup(arguments_,store,dependencies) { const state=store.load(arguments_.wave); assertState(state,arguments_.wave); const run=state.runs.at(-1); if(!run||run.mode!=='exact-main'||run.phase!=='final'||run.runRoot!==arguments_.runRoot||run.runId!==arguments_.runId||run.receiptDigest!==arguments_.receiptDigest) fail('cleanup receipt identity drift'); const result=await need(dependencies,'cleanupTargets','PROOF-3D')({state,run}); exactKeys(result,['productWorktreeRemoved','proofWorktreeRemoved','localWaveBranchRemoved','initiatingTrackedTreeClean','durableReceiptRevalidated'],'cleanup result'); if(Object.values(result).some((value)=>value!==true)) fail('cleanup incomplete'); store.remove(arguments_.wave); return result; }
// prettier-ignore
async function validatePublic(dependencies,value) { const result=await need(dependencies,'invokePublicValidator','PROOF-3D')({entry:PUBLIC_VALIDATOR_ENTRY,...value}); exactKeys(result,['validated'],'public validator result'); if(result.validated!==true) fail('public validation failed'); }
// prettier-ignore
function validateProofInputs(arguments_,row) { const names=arguments_.programSpecs.map((value)=>parseSpecTuple(value).childChange); exactSet(names,row.wave==='camp-proof'?PROGRAM_CHILD_CHANGES:[],'program spec arguments'); if(row.wave!=='proof-02-triage'&&arguments_.dispositions.length||row.wave!=='camp-01h'&&arguments_.repairs.length) fail('mode-specific inputs drift'); }
// prettier-ignore
function assertReceipt(value,row,mode) { exactKeys(value,['runId','phase','finalizedPaths'],'receipt result'); if(!RUN_ID.test(value.runId)||!['observation','final'].includes(value.phase)||value.phase==='observation'&&(row.wave!=='camp-01h'||mode!=='reviewed-head')) fail('receipt phase drift'); exactSet(value.finalizedPaths,row.artifacts,'finalized artifact set'); }
// prettier-ignore
function assertExport(value,receipt) { exactKeys(value,['runId','phase','finalizedPaths','receiptDigest'],'export result'); if(value.runId!==receipt.runId||value.phase!==receipt.phase||JSON.stringify(value.finalizedPaths)!==JSON.stringify(receipt.finalizedPaths)||!DIGEST.test(value.receiptDigest)) fail('export identity drift'); }
// prettier-ignore
function assertCleanState(value,sha) { exactKeys(value,['headSha','treeSha','trackedClean','indexClean','reparsePaths','manifest'],'clean state'); if(value.headSha!==sha||!SHA.test(value.treeSha)||value.trackedClean!==true||value.indexClean!==true||!Array.isArray(value.reparsePaths)||value.reparsePaths.length) fail('worktree clean-state drift'); assertManifest(value.manifest); }
// prettier-ignore
function assertManifest(entries) { if(!Array.isArray(entries)) fail('manifest missing'); const paths=entries.map((entry)=>entry.path); if(new Set(paths).size!==paths.length||JSON.stringify(paths)!==JSON.stringify([...paths].sort())) fail('manifest ordering drift'); for(const entry of entries){exactKeys(entry,['path','type','size','digest'],'manifest entry'); if(!validRelative(entry.path)||!['file','directory'].includes(entry.type)||!Number.isSafeInteger(entry.size)||entry.size<0||entry.type==='file'&&!DIGEST.test(entry.digest)||entry.type==='directory'&&(entry.size!==0||entry.digest!==null)) fail('manifest entry drift');} }
// prettier-ignore
function assertTarget(value,expected) { exactKeys(value,['kind','subject','canonicalPath','gitWorktreeId','expectedHead','branchRef','oldOid','cleanManifest','nonReparse','initiating'],'target'); if(value.kind!==expected.kind||value.subject!==expected.subject||expected.canonicalPath&&path.resolve(value.canonicalPath)!==expected.canonicalPath||expected.expectedHead&&value.expectedHead!==expected.expectedHead||!path.isAbsolute(value.canonicalPath)||!SHA.test(value.expectedHead)||value.nonReparse!==true||value.initiating!==false) fail('target identity drift'); if(value.kind==='proof'&&(value.branchRef!==null||value.oldOid!==null)||value.kind==='owned'&&(!/^refs\/heads\/[A-Za-z0-9._/-]+$/.test(value.branchRef)||!SHA.test(value.oldOid))) fail('target ref drift'); assertManifest(value.cleanManifest); }
// prettier-ignore
function assertState(value,wave) { exactKeys(value,['schema','wave','rowDigest','repairSource','registration','ownedTarget','proofTarget','runs','lifecycle'],'controller state'); if(value.schema!=='camp01-controller-state/v1'||value.wave!==wave||!DIGEST.test(value.rowDigest)||!['registered','proof-target-created','receipt-validated'].includes(value.lifecycle)||!Array.isArray(value.runs)) fail('controller state drift'); if(value.ownedTarget) assertTarget(value.ownedTarget,{kind:'owned',subject:value.registration.subject.replace('-pr','')}); if(value.proofTarget) assertTarget(value.proofTarget,{kind:'proof',subject:null}); }
// prettier-ignore
function parseSpecTuple(value) { const [childChange,prNumber,mergeSha,approvalId,reviewer]=parseTuple(value,5,'spec'); if(!WAVE.test(childChange)||!/^[1-9][0-9]*$/.test(prNumber)||!SHA.test(mergeSha)) fail('invalid spec tuple'); return {childChange,prNumber,mergeSha,approvalId,reviewer}; }
// prettier-ignore
function parseOwnedTuple(value) { const [prNumber,headSha,approvalId,reviewer,merge]=parseTuple(value,5,'owned PR'); if(!/^[1-9][0-9]*$/.test(prNumber)||!SHA.test(headSha)||merge!=='pending'&&!SHA.test(merge)) fail('invalid owned PR tuple'); return {prNumber,headSha,approvalId,reviewer,mergeSha:merge==='pending'?null:merge}; }
// prettier-ignore
function parseTuple(value,count,label) { const fields=typeof value==='string'?value.split('|'):[]; if(fields.length!==count||fields.some((field)=>!bounded(field))) fail(`invalid ${label} tuple`); return fields; }
// prettier-ignore
export function createFileStateStore(root) { const base=path.resolve(root,'.sisyphus','evidence','playtest','.camp01-controller'); return {load(wave){const file=path.join(base,wave,'state.json');return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;},save(wave,value){const directory=path.join(base,wave);fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'state.json'),`${JSON.stringify(value)}\n`);},remove(wave){const file=path.join(base,wave,'state.json');if(fs.existsSync(file))fs.unlinkSync(file);}}; }
// prettier-ignore
function assertStore(value) { if(!value||!['load','save','remove'].every((key)=>typeof value[key]==='function')) fail('state-store dependency unavailable'); }
// prettier-ignore
function need(dependencies,name,seam) { if(typeof dependencies[name]!=='function') fail(`${seam} dependency ${name} unavailable`); return dependencies[name]; }
// prettier-ignore
function rowDigest(row) { return `sha256:${createHash('sha256').update(JSON.stringify(row)).digest('hex')}`; }
// prettier-ignore
function exactKeys(value,keys,label) { if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(Object.keys(value))!==JSON.stringify(keys)) fail(`${label} fields drift`); }
// prettier-ignore
function exactSet(actual,expected,label) { if(!Array.isArray(actual)||new Set(actual).size!==actual.length||JSON.stringify([...actual].sort())!==JSON.stringify([...expected].sort())) fail(`${label} drift`); }
// prettier-ignore
function validRunRoot(value) { return typeof value==='string'&&/^\.sisyphus\/evidence\/playtest\/[a-z0-9-]+-[0-9a-f]{40}$/.test(value); }
// prettier-ignore
function validRelative(value) { return typeof value==='string'&&value.length>0&&!path.isAbsolute(value)&&!value.includes('\\')&&!value.split('/').includes('..'); }
// prettier-ignore
function bounded(value) { return typeof value==='string'&&value.length>0&&value.length<=512&&!/[\u0000-\u001f\u007f|]/.test(value); }
// prettier-ignore
function fail(message) { throw new Error(`CAMP01_CONTROLLER_INVALID: ${message}`); }

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  runController(process.argv.slice(2))
    .then(() => process.stdout.write('CAMP01 controller complete\n'))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  canonicalBytes,
  digestBytes,
  validateArtifact,
} from './camp01-authority-receipt.schemas.mjs';
import {
  Camp01GitError,
  invokeGit as invokeTrustedGit,
} from './camp01-git-trust.mjs';
import {
  Camp01TargetError,
  observeCleanState as observeTarget,
} from './camp01-target-authority.mjs';

const VALIDATOR_ENTRY = fileURLToPath(
    new URL('./validate-camp01-authority-receipt.mjs', import.meta.url),
  ),
  OID = /^[0-9a-f]{40}$/,
  DIGEST = /^sha256:[0-9a-f]{64}$/,
  RUN_ID = /^camp01-[0-9a-f]{32}$/,
  RUN_ROOT = /^\.sisyphus\/evidence\/playtest\/[a-z0-9-]+-[0-9a-f]{40}$/,
  WAVE = /^[a-z0-9][a-z0-9-]{0,127}$/,
  BRANCH = /^refs\/heads\/[A-Za-z0-9._/-]+$/,
  PROOF_BASENAME =
    /^[a-z0-9][a-z0-9-]{0,127}-(?:reviewed-head|exact-main)-([0-9a-f]{40})$/;
// prettier-ignore
const TARGET_KEYS=['kind','subject','canonicalPath','gitWorktreeId','expectedHead','branchRef','oldOid','cleanManifest','nonReparse','initiating'], STATE_KEYS=['schema','wave','rowDigest','repairSource','registration','ownedTarget','proofTarget','runs','lifecycle'], RUN_KEYS=['mode','phase','sha','runRoot','provenance','proofTarget','cleanManifest','executionEnvironmentDigest','runId','receiptDigest','transientValidated','durableValidated'], RESULT_KEYS=['productWorktreeRemoved','proofWorktreeRemoved','localWaveBranchRemoved','initiatingTrackedTreeClean','durableReceiptRevalidated'];

export class Camp01CleanupError extends Error {
  constructor(message) {
    super(`CAMP01_CLEANUP_INVALID: ${message}`);
    this.name = 'Camp01CleanupError';
  }
}

// The initiating checkout and failed-creation list are controller-owned records;
// callers cannot nominate a path, ref, deletion mode, prefix, or recursive scope.
// Durable staging residue and published-but-unrevalidated destinations are never
// recovery targets here: durable validation fails before inspection or removal,
// no cleanup receipt is published, and recoverFailedCreation accepts only an
// independently recorded detached proof worktree outside the initiating root.
// prettier-ignore
export function createCleanupAuthority(options,dependencies={}) {
  exactKeys(options,['git','initiatingTarget','cleanupRoot','failedCreationTargets'],'cleanup authority options'); const io=dependencies.fs??fs, initiating=options.initiatingTarget; assertTarget(initiating,'owned',true); const initiatingRoot=canonicalDirectory(initiating.canonicalPath,io,'initiating target path drift'), cleanupRoot=canonicalDirectory(options.cleanupRoot,io,'cleanup receipt root drift'); if(cleanupRoot===initiatingRoot||!cleanupRoot.startsWith(`${initiatingRoot}${path.sep}`)) fail('cleanup receipt root drift'); if(!Array.isArray(options.failedCreationTargets)) fail('failed-creation records invalid'); const failed=options.failedCreationTargets.map((target)=>{assertRemovalTarget(target,'proof',initiatingRoot);return Object.freeze(structuredClone(target));});
  const context={beforeMutation:dependencies.beforeMutation??(()=>{}),cleanupRoot,git:options.git,initiating,initiatingRoot,invokeGit:dependencies.invokeGit??invokeTrustedGit,invokePublicValidator:dependencies.invokePublicValidator,io,observe:dependencies.observeCleanState??observeTarget};
  return Object.freeze({cleanupTargets:(input)=>typed(()=>cleanupTargets(input,context)),recoverFailedCreation:(input)=>typed(()=>recoverFailedCreation(input,failed,context))});
}

// prettier-ignore
async function cleanupTargets(input,context) {
  exactKeys(input,['state','run'],'unsafe cleanup input'); const {state,run}=input; exactKeys(run,RUN_KEYS,'unsafe cleanup input'); if(run.mode!=='exact-main'||run.phase!=='final'||!OID.test(run.sha)||!RUN_ROOT.test(run.runRoot)||!run.runRoot.endsWith(`-${run.sha}`)||!RUN_ID.test(run.runId)||!DIGEST.test(run.receiptDigest)||run.durableValidated!==true) fail('cleanup receipt identity drift');
  await revalidateDurable(state,run,context); const binding=assertLifecycle(state,run,context.initiatingRoot), receipt=cleanupReceipt(state.wave,run), publication=prepareReceipt(receipt,context);
  try {
    await audit(binding,run,context); await context.beforeMutation({operation:'cleanup-targets',state,run}); await audit(binding,run,context); if(binding.owned===null)await assertBranchAbsent(binding,context);
    await reinspect(binding.proof,run.sha,null,'proof',run.runRoot,context); removeTransientReceipt(binding.proof,run.runRoot,context); await removeWorktree(binding.proof,'proof',context);
    if(binding.owned!==null){await reinspect(binding.owned,binding.oldOid,null,'owned',null,context); await removeWorktree(binding.owned,'owned',context); await assertBranch(binding,run.sha,context); await compareDelete(binding,context);}
    await reinspect(context.initiating,context.initiating.expectedHead,null,'initiating','.sisyphus/evidence/playtest',context); publishReceipt(publication,context); return result();
  } catch(error) { discardReceipt(publication,context); throw error; }
}

// prettier-ignore
async function recoverFailedCreation(input,failed,context) {
  exactKeys(input,['target'],'failed-creation recovery input drift'); const recorded=failed.find((entry)=>JSON.stringify(entry)===JSON.stringify(input.target)); if(!recorded) fail('failed-creation target is unrecorded'); await reinspect(recorded,recorded.expectedHead,recorded.cleanManifest,'proof',null,context); await context.beforeMutation({operation:'recover-failed-creation',target:recorded}); await reinspect(recorded,recorded.expectedHead,recorded.cleanManifest,'proof',null,context); await removeWorktree(recorded,'proof',context); return {proofWorktreeRemoved:true};
}

// prettier-ignore
function assertLifecycle(state,run,initiatingRoot) {
  exactKeys(state,STATE_KEYS,'controller state drift'); if(state.schema!=='camp01-controller-state/v1'||!WAVE.test(state.wave)||!Array.isArray(state.runs)||state.lifecycle!=='receipt-validated'||JSON.stringify(state.runs.at(-1))!==JSON.stringify(run))fail('controller state drift'); assertRemovalTarget(state.proofTarget,'proof',initiatingRoot); if(JSON.stringify(state.proofTarget)!==JSON.stringify(run.proofTarget)) fail('proof target record drift'); if(!run.cleanManifest?.matched||!Array.isArray(run.cleanManifest.baseline)||JSON.stringify(run.cleanManifest.baseline)!==JSON.stringify(run.cleanManifest.final)) fail('proof target manifest drift');
  if(path.basename(state.proofTarget.canonicalPath)!==`${state.wave}-${run.mode}-${run.sha}`)fail('proof target basename drift'); const owned=state.ownedTarget, none=state.registration?.subject==='none'&&run.provenance?.subject==='none'&&run.provenance?.owned===null, branchRef=`refs/heads/codex/${state.wave}`; if(owned===null){if(!none) fail('owned target record absent');return {proof:state.proofTarget,owned:null,oldOid:null,branchRef};} assertRemovalTarget(owned,'owned',initiatingRoot); const provenance=run.provenance?.owned; if(!provenance||provenance.kind!==owned.subject||!OID.test(provenance.headSha)) fail('owned target cleanup binding drift'); if(owned.branchRef!==branchRef)fail('local branch ref drift'); return {proof:state.proofTarget,owned:{...owned,expectedHead:provenance.headSha},oldOid:provenance.headSha,branchRef};
}

// prettier-ignore
async function revalidateDurable(state,run,context) { if(typeof context.invokePublicValidator!=='function') fail('durable validator unavailable'); let value; try {value=await context.invokePublicValidator({entry:VALIDATOR_ENTRY,stage:'durable',wave:state?.wave,mode:run.mode,sha:run.sha,runRoot:run.runRoot,runId:run.runId});} catch {fail('durable receipt revalidation failed');} if(!value||JSON.stringify(Object.keys(value))!==JSON.stringify(['validated'])||value.validated!==true) fail('durable receipt revalidation failed'); let bytes; try {bytes=context.io.readFileSync(path.join(context.initiatingRoot,...run.runRoot.split('/'),run.runId,'receipt-manifest.json'));} catch {fail('durable receipt digest drift');} if(digestBytes(bytes)!==run.receiptDigest)fail('durable receipt digest drift'); }
// prettier-ignore
async function audit(binding,run,context) { await reinspect(binding.proof,run.sha,null,'proof',run.runRoot,context); if(binding.owned!==null){await assertBranch(binding,run.sha,context);await reinspect(binding.owned,binding.oldOid,null,'owned',null,context);} await reinspect(context.initiating,context.initiating.expectedHead,null,'initiating','.sisyphus/evidence/playtest',context); }

// prettier-ignore
async function reinspect(target,expectedHead,manifest,role,runRoot,context) {
  try { const canonical=canonicalDirectory(target.canonicalPath,context.io,`${role} target path drift`); if(canonical!==target.canonicalPath) fail(`${role} target path drift`); if(role!=='initiating')await assertLiveBranch(target,role,context); const value=await context.observe({target:{...target,expectedHead},phase:'final',runRoot},{git:context.git}); if(manifest!==null&&JSON.stringify(value.manifest)!==JSON.stringify(manifest)) fail(`${role} target manifest drift`); }
  catch(error) { if(error instanceof Camp01CleanupError) throw error; if(error instanceof Camp01TargetError){const message=error.message; if(message.includes('target path missing'))fail(`${role} target path drift`);if(message.includes('reparse point'))fail(`${role} target reparse drift`);if(message.includes('HEAD mismatch'))fail(`${role} target HEAD drift`);if(message.includes('index is dirty'))fail(`${role} target index state drift`);if(message.includes('tracked worktree is dirty'))fail(`${role} target tracked state drift`);if(message.includes('identity')||message.includes('registered'))fail(`${role} target identity drift`);} fail(`${role} target reinspection failed`); }
}

// Git branch -d's non-force merge predicate is checked first; update-ref then
// provides the stronger exact-old-OID compare-delete required for race safety.
// prettier-ignore
async function assertBranch(binding,mainSha,context) { let oid; try {oid=(await callGit(['show-ref','--verify','--hash',binding.branchRef],context)).stdout.trim();} catch(error) {if(error instanceof Camp01GitError)fail('local branch ref drift');throw error;} if(oid!==binding.oldOid)fail('local branch OID drift'); try {await callGit(['merge-base','--is-ancestor',binding.oldOid,mainSha],context);} catch(error) {if(error instanceof Camp01GitError)fail('local branch is unmerged');throw error;} }
// prettier-ignore
async function assertBranchAbsent(binding,context) { try {await callGit(['show-ref','--verify',binding.branchRef],context);} catch(error) {if(error instanceof Camp01GitError)return;throw error;} fail('unowned local wave branch exists'); }
// prettier-ignore
async function assertLiveBranch(target,role,context) { let listing; try {listing=(await callGit(['worktree','list','--porcelain','-z'],context)).stdout;} catch(error) {if(error instanceof Camp01GitError)fail(`${role} target identity drift`);throw error;} const record=listing.split('\0\0').map((entry)=>entry.split('\0')).find((fields)=>samePath(fields.find((field)=>field.startsWith('worktree '))?.slice(9),target.canonicalPath,context.io)); if(!record)fail(`${role} target identity drift`); const branchRef=record.find((field)=>field.startsWith('branch '))?.slice(7)??null; if(branchRef!==target.branchRef)fail(role==='proof'?'proof target detachment drift':'owned target branch ref drift'); }
// prettier-ignore
async function compareDelete(binding,context) { try {await callGit(['update-ref','-d',binding.branchRef,binding.oldOid],context);} catch(error) {if(error instanceof Camp01GitError)fail('local branch OID race');throw error;} }
// prettier-ignore
async function removeWorktree(target,role,context) { try {await callGit(['worktree','remove',target.canonicalPath],context);} catch(error) {if(error instanceof Camp01GitError)fail(`${role} worktree removal failed`);throw error;} if(lstatIfPresent(target.canonicalPath,context.io)!==null)fail(`${role} worktree removal incomplete`); }
// prettier-ignore
function removeTransientReceipt(target,runRoot,context) { let current=target.canonicalPath; const ancestors=[]; for(const segment of runRoot.split('/')){current=path.join(current,segment);const stat=lstatIfPresent(current,context.io);if(stat===null)return;if(stat.isSymbolicLink())fail('proof target reparse drift');if(!stat.isDirectory())fail('proof transient receipt drift');ancestors.push(current);} try{context.io.rmSync(current,{recursive:true,force:false});for(const directory of ancestors.slice(0,-1).reverse())try{context.io.rmdirSync(directory);}catch(error){if(['ENOENT','ENOTEMPTY'].includes(error?.code))break;throw error;}}catch{fail('proof transient cleanup failed');} }
// prettier-ignore
function callGit(args,context) { return context.invokeGit({git:context.git,args,cwd:context.initiatingRoot},{}); }

// prettier-ignore
function assertRemovalTarget(target,kind,initiatingRoot) { if(target?.initiating===true)fail('initiating cleanup target rejected'); assertTarget(target,kind,false); if(target.canonicalPath===initiatingRoot||target.canonicalPath.startsWith(`${initiatingRoot}${path.sep}`))fail('durable cleanup target rejected'); const proofName=kind==='proof'?PROOF_BASENAME.exec(path.basename(target.canonicalPath)):null; if(kind==='proof'&&proofName?.[1]!==target.expectedHead)fail('proof target record drift'); }
// prettier-ignore
function assertTarget(target,kind,initiating) { exactKeys(target,TARGET_KEYS,`${kind} target record drift`); if(target.kind!==kind||target.nonReparse!==true||target.initiating!==initiating||!path.isAbsolute(target.canonicalPath)||!path.isAbsolute(target.gitWorktreeId)||!OID.test(target.expectedHead)||!Array.isArray(target.cleanManifest))fail(`${kind} target record drift`); if(kind==='proof'&&(target.subject!==null||target.branchRef!==null||target.oldOid!==null)||kind==='owned'&&(!['product','audit'].includes(target.subject)||!BRANCH.test(target.branchRef)||!OID.test(target.oldOid)||target.oldOid!==target.expectedHead))fail(`${kind} target record drift`); }

// prettier-ignore
function cleanupReceipt(wave,run) { if(!WAVE.test(wave))fail('controller state drift'); const value={schema:'camp01-cleanup/v1',wave,runId:run.runId,receiptDigest:run.receiptDigest,...result()}; try {validateArtifact(value);} catch {fail('cleanup receipt invalid');} return value; }
// prettier-ignore
function prepareReceipt(receipt,context) { const name=`${receipt.wave}-${receipt.runId}-wave-cleanup.json`, final=path.join(context.cleanupRoot,name), stage=path.join(context.cleanupRoot,`.${name}.stage`); if(lstatIfPresent(final,context.io)!==null||lstatIfPresent(stage,context.io)!==null)fail('cleanup receipt collision'); try {context.io.writeFileSync(stage,canonicalBytes(receipt),{flag:'wx'});} catch {fail('cleanup receipt staging failed');} return {stage,final}; }
// prettier-ignore
function publishReceipt(value,context) { let linked=false; try {canonicalDirectory(context.cleanupRoot,context.io,'cleanup receipt root drift');context.io.linkSync(value.stage,value.final);linked=true;context.io.unlinkSync(value.stage);} catch {if(linked)try{if(lstatIfPresent(value.final,context.io)?.isFile())context.io.unlinkSync(value.final);}catch{fail('cleanup receipt rollback failed');}fail('cleanup receipt publication failed');} }
// prettier-ignore
function discardReceipt(value,context) { try {if(lstatIfPresent(value.stage,context.io)?.isFile())context.io.unlinkSync(value.stage);} catch {fail('cleanup receipt staging cleanup failed');} }
// prettier-ignore
function result() { return Object.fromEntries(RESULT_KEYS.map((key)=>[key,true])); }

// prettier-ignore
function canonicalDirectory(value,io,message) { try {if(typeof value!=='string'||!path.isAbsolute(value))fail(message);assertPathChain(value,io,message);const resolved=io.realpathSync.native(value),stat=io.statSync(resolved);if(!stat.isDirectory())fail(message);return resolved;} catch(error) {if(error instanceof Camp01CleanupError)throw error;fail(message);} }
// prettier-ignore
function assertPathChain(value,io,message) { const absolute=path.resolve(value),parsed=path.parse(absolute),segments=absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);let current=parsed.root;for(const segment of segments){current=path.join(current,segment);const stat=io.lstatSync(current);if(stat.isSymbolicLink())fail(message.includes('target')?message.replace('path drift','reparse drift'):message);} }
// prettier-ignore
function lstatIfPresent(value,io) { try {return io.lstatSync(value);} catch(error) {if(error?.code==='ENOENT')return null;throw error;} }
// prettier-ignore
function samePath(left,right,io) { if(typeof left!=='string')return false; try {return io.realpathSync.native(left)===right;} catch {return false;} }
// prettier-ignore
function exactKeys(value,keys,message) { if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(Object.keys(value))!==JSON.stringify(keys))fail(message); }
// prettier-ignore
async function typed(operation) { try {return await operation();} catch(error) {if(error instanceof Camp01CleanupError)throw error;fail('cleanup operation failed');} }
function fail(message) {
  throw new Camp01CleanupError(message);
}

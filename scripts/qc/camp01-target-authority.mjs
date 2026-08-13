import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  canonicalBytes,
  digestBytes,
} from './camp01-authority-receipt.schemas.mjs';
import {
  Camp01GitError,
  invokeGit,
  resolveVerifiedGit,
} from './camp01-git-trust.mjs';

const OID = /^[0-9a-f]{40}$/,
  MODES = new Set(['reviewed-head', 'exact-main']);

export class Camp01TargetError extends Error {
  constructor(message) {
    super(`CAMP01_TARGET_INVALID: ${message}`);
    this.name = 'Camp01TargetError';
  }
}

// prettier-ignore
export async function inspectOwnedTarget({wave,subject,worktree,spec,row,headSha},dependencies={}) {
  if(typeof wave!=='string'||!['product','audit'].includes(subject)||!row) fail('owned target input invalid');
  // Registration records the pre-edit worktree HEAD. Audit forbids --spec;
  // product still cites the child spec, whose merge SHA may be an ancestor.
  const omitHead=headSha===null||headSha===undefined;
  if(subject==='audit'){ if(spec!==null&&spec!==undefined||!omitHead) fail('owned target input invalid'); }
  else { if(!OID.test(spec?.mergeSha)) fail('owned target input invalid'); if(!omitHead&&spec.mergeSha!==headSha) fail('owned target input invalid'); }
  const canonicalPath=canonicalDirectory(worktree,dependencies), git=await resolveGit(canonicalPath,dependencies), identity=await inspectIdentity(canonicalPath,git,dependencies);
  const expectedHead=omitHead?identity.headSha:headSha; if(!OID.test(expectedHead)) fail('owned target input invalid');
  if(identity.headSha!==expectedHead) fail('worktree HEAD mismatch'); if(!identity.branchRef) fail('owned worktree must have a branch');
  const clean=await cleanState({root:canonicalPath,expectedHead,runRoot:null,git},dependencies); return freezeTarget({kind:'owned',subject,canonicalPath,gitWorktreeId:identity.gitWorktreeId,expectedHead,branchRef:identity.branchRef,oldOid:expectedHead,cleanManifest:clean.manifest,nonReparse:true,initiating:false});
}

// prettier-ignore
export async function createProofTarget({wave,sha,mode},dependencies={}) {
  if(typeof wave!=='string'||!/^[a-z0-9][a-z0-9-]{0,127}$/.test(wave)||!OID.test(sha)||!MODES.has(mode)) fail('proof target input invalid');
  const repositoryRoot=canonicalDirectory(dependencies.repositoryRoot??process.cwd(),dependencies), git=await resolveGit(repositoryRoot,dependencies), proofRoot=dependencies.proofRoot??fs.mkdtempSync(path.join(os.tmpdir(),'mekstation-camp01-proof-'));
  const canonicalRoot=canonicalDirectory(proofRoot,dependencies), location=path.join(canonicalRoot,`${wave}-${mode}-${sha}`), locationStat=lstatIfPresent(location,dependencies); if(locationStat?.isSymbolicLink()) fail('reparse point present'); if(locationStat!==null&&(!locationStat.isDirectory()||fs.readdirSync(location).length)) fail('proof location is not empty');
  await callGit({git,cwd:repositoryRoot,args:['worktree','add','--detach',location,sha],message:'detached worktree creation failed'},dependencies); const canonicalPath=canonicalDirectory(location,dependencies), identity=await inspectIdentity(canonicalPath,git,dependencies);
  if(identity.headSha!==sha) fail('worktree HEAD mismatch'); if(identity.branchRef!==null) fail('proof worktree is not detached'); const clean=await cleanState({root:canonicalPath,expectedHead:sha,runRoot:null,git},dependencies);
  return freezeTarget({kind:'proof',subject:null,canonicalPath,gitWorktreeId:identity.gitWorktreeId,expectedHead:sha,branchRef:null,oldOid:null,cleanManifest:clean.manifest,nonReparse:true,initiating:false});
}

// prettier-ignore
export async function observeCleanState({target,phase,runRoot},dependencies={}) {
  if(!target||!['baseline','final'].includes(phase)||!OID.test(target.expectedHead)||typeof target.gitWorktreeId!=='string') fail('clean-state input invalid'); const canonicalPath=canonicalDirectory(target.canonicalPath,dependencies); if(canonicalPath!==target.canonicalPath) fail('target canonical path drift');
  const git=await resolveGit(canonicalPath,dependencies), identity=await inspectIdentity(canonicalPath,git,dependencies); if(identity.gitWorktreeId!==target.gitWorktreeId) fail('worktree identity drift'); if(identity.headSha!==target.expectedHead) fail('worktree HEAD mismatch');
  return cleanState({root:canonicalPath,expectedHead:target.expectedHead,runRoot,git},dependencies);
}

// reviewed-head receipt linkage is intentionally undefined: PROOF-3D must compose
// mode-specific null/durable values before this cap can pass the writer schema.
// prettier-ignore
export async function resolveTargetFacts({ownedTarget,spec,row},dependencies={}) {
  if(ownedTarget?.kind!=='owned'||!row||row.capSubject==='none'||!OID.test(spec?.mergeSha)||!OID.test(ownedTarget.oldOid)) fail('target fact input invalid');
  if(row.capSubject!=='product-pr'&&row.capSubject!=='audit-pr') fail('target fact input invalid');
  const canonicalPath=canonicalDirectory(ownedTarget.canonicalPath,dependencies), git=await resolveGit(canonicalPath,dependencies), identity=await inspectIdentity(canonicalPath,git,dependencies);
  if(identity.gitWorktreeId!==ownedTarget.gitWorktreeId||identity.branchRef!==ownedTarget.branchRef) fail('worktree identity drift'); const headSha=identity.headSha, baseSha=ownedTarget.oldOid; await callGit({git,cwd:canonicalPath,args:['merge-base','--is-ancestor',spec.mergeSha,headSha],message:'target head does not descend from base'},dependencies); await callGit({git,cwd:canonicalPath,args:['merge-base','--is-ancestor',baseSha,headSha],message:'target head does not descend from base'},dependencies); await cleanState({root:canonicalPath,expectedHead:headSha,runRoot:null,git},dependencies); const treeSha=(await callGit({git,cwd:canonicalPath,args:['rev-parse','--verify',`${headSha}^{tree}`],message:'tree identity unavailable'},dependencies)).stdout.trim(); if(!OID.test(treeSha)) fail('tree identity unavailable');
  const raw=(await callGit({git,cwd:canonicalPath,args:['diff','--numstat','-z','--no-renames',baseSha,headSha,'--'],message:'target diff unavailable'},dependencies)).stdout, manifest=parseNumstat(raw), changedLineCount=manifest.reduce((sum,entry)=>sum+(entry.added??0)+(entry.deleted??0),0);
  return Object.freeze({treeSha,capProvenance:Object.freeze({subject:row.capSubject,baseSha,headSha,fileCount:manifest.length,changedLineCount,binaryEntries:manifest.some((entry)=>entry.binary),changedTreeManifestDigest:digestBytes(canonicalBytes(manifest)),reviewedHeadReceiptId:undefined,reviewedHeadReceiptManifestDigest:undefined})});
}

// prettier-ignore
async function cleanState({root,expectedHead,runRoot,git},dependencies) {
  const headSha=(await callGit({git,cwd:root,args:['rev-parse','--verify','HEAD^{commit}'],message:'worktree HEAD unavailable'},dependencies)).stdout.trim(), treeSha=(await callGit({git,cwd:root,args:['rev-parse','--verify','HEAD^{tree}'],message:'tree identity unavailable'},dependencies)).stdout.trim(); if(headSha!==expectedHead) fail('worktree HEAD mismatch'); if(!OID.test(treeSha)) fail('tree identity unavailable');
  const status=(await callGit({git,cwd:root,args:['status','--porcelain=v1','-z','--untracked-files=no'],message:'worktree status unavailable'},dependencies)).stdout, states=status.split('\0').filter(Boolean).map((entry)=>entry.slice(0,2)); if(states.some(([index])=>index!==' ')) fail('index is dirty'); if(states.some(([,worktree])=>worktree!==' ')) fail('tracked worktree is dirty');
  const allowed=resolveAllowed(root,runRoot,dependencies), reparsePaths=scanReparse(root,allowed,dependencies); if(reparsePaths.length) fail('reparse point present'); return Object.freeze({headSha,treeSha,trackedClean:true,indexClean:true,reparsePaths:Object.freeze([]),manifest:Object.freeze(await buildManifest({root,allowed,git},dependencies))});
}

// prettier-ignore
async function inspectIdentity(root,git,dependencies) {
  let listing; try { listing=(await invokeGit({git,args:['worktree','list','--porcelain','-z'],cwd:root},dependencies.gitDependencies??{})).stdout; } catch(error) { if(error instanceof Camp01GitError) fail('worktree is not registered'); throw error; }
  const records=parseWorktrees(listing), record=records.find((entry)=>samePath(entry.worktree,root)); if(!record) fail('worktree is not registered'); const gitDirectory=(await callGit({git,cwd:root,args:['rev-parse','--absolute-git-dir'],message:'worktree identity missing'},dependencies)).stdout.trim(); if(!gitDirectory) fail('worktree identity missing'); let gitWorktreeId; try { gitWorktreeId=fs.realpathSync.native(gitDirectory); } catch { fail('worktree identity missing'); }
  if(!path.isAbsolute(gitWorktreeId)||!OID.test(record.headSha)) fail('worktree identity missing'); return {headSha:record.headSha,branchRef:record.branchRef,gitWorktreeId};
}

// prettier-ignore
async function buildManifest({root,allowed,git},dependencies) {
  const commands=[['ls-files','--others','--exclude-standard','--directory','-z'],['ls-files','--others','--ignored','--exclude-standard','--directory','-z']], candidates=[]; for(const args of commands) candidates.push(...(await callGit({git,cwd:root,args,message:'manifest discovery failed'},dependencies)).stdout.split('\0').filter(Boolean).map((value)=>value.replace(/\/$/,'')));
  const roots=[...new Set(candidates)].sort((left,right)=>left.length-right.length||(left<right?-1:left>right?1:0)).filter((value,index,all)=>!all.slice(0,index).some((prior)=>value.startsWith(`${prior}/`))), entries=[]; for(const relative of roots) entries.push(...walkManifest({root,relative,allowed},dependencies)); return entries.sort((left,right)=>left.path<right.path?-1:left.path>right.path?1:0);
}

// prettier-ignore
function walkManifest({root,relative,allowed},dependencies) {
  const absolute=path.resolve(root,...relative.split('/')); if(excluded(absolute,allowed)) return []; const stat=lstat(absolute,dependencies); if(stat.isSymbolicLink()) fail('reparse point present'); if(stat.isFile()) return [{path:relative,type:'file',size:stat.size,digest:`sha256:${createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')}`}]; if(!stat.isDirectory()) fail('manifest entry type invalid');
  const children=fs.readdirSync(absolute).sort(), nested=children.flatMap((name)=>walkManifest({root,relative:`${relative}/${name}`.replace(/\\/g,'/'),allowed},dependencies)); return nested.length||children.length===0?[{path:relative,type:'directory',size:0,digest:null},...nested]:[];
}

// prettier-ignore
function scanReparse(root,allowed,dependencies) { const found=[]; function visit(absolute,relative){if(relative==='.git'||excluded(absolute,allowed))return; const stat=lstat(absolute,dependencies); if(stat.isSymbolicLink()){found.push(relative.replace(/\\/g,'/'));return;} if(stat.isDirectory())for(const name of fs.readdirSync(absolute))visit(path.join(absolute,name),relative?`${relative}/${name}`:name);} visit(root,''); return found.sort(); }
// prettier-ignore
function canonicalDirectory(value,dependencies) { if(typeof value!=='string'||!path.isAbsolute(value)||!fs.existsSync(value)) fail('target path missing'); assertPathChain(value,dependencies); let resolved,stat; try { resolved=fs.realpathSync.native(value); stat=fs.statSync(resolved); } catch { fail('target path missing'); } if(!stat.isDirectory()) fail('target path missing'); return resolved; }
// prettier-ignore
function assertPathChain(value,dependencies) { const absolute=path.resolve(value), parsed=path.parse(absolute), segments=absolute.slice(parsed.root.length).split(path.sep).filter(Boolean); let current=parsed.root; for(const name of segments){current=path.join(current,name); if(lstat(current,dependencies).isSymbolicLink()) fail('reparse point present');} }
// prettier-ignore
function lstat(value,dependencies) { try { return (dependencies.lstat??fs.lstatSync)(value); } catch { fail('filesystem inspection failed'); } }
// prettier-ignore
function lstatIfPresent(value,dependencies) { try { return (dependencies.lstat??fs.lstatSync)(value); } catch(error) { if(error?.code==='ENOENT') return null; fail('filesystem inspection failed'); } }
// prettier-ignore
function resolveAllowed(root,runRoot,dependencies) { if(runRoot===null||runRoot===undefined) return null; if(typeof runRoot!=='string'||path.isAbsolute(runRoot)||runRoot.includes('\\')||runRoot.split('/').some((part)=>!part||part==='..')) fail('run root invalid'); const resolved=path.resolve(root,...runRoot.split('/')); if(resolved===root||!resolved.startsWith(`${root}${path.sep}`)) fail('run root invalid'); const stat=lstatIfPresent(resolved,dependencies); if(stat?.isSymbolicLink()) fail('reparse point present'); if(stat!==null&&!stat.isDirectory()) fail('run root invalid'); return resolved; }
// prettier-ignore
function excluded(value,allowed) { return allowed!==null&&(value===allowed||value.startsWith(`${allowed}${path.sep}`)); }
// prettier-ignore
function parseWorktrees(value) { return value.split('\0\0').map((record)=>record.split('\0')).filter((fields)=>fields.some(Boolean)).map((fields)=>{const worktree=fields.find((field)=>field.startsWith('worktree '))?.slice(9), headSha=fields.find((field)=>field.startsWith('HEAD '))?.slice(5), branchRef=fields.find((field)=>field.startsWith('branch '))?.slice(7)??null; return {worktree,headSha,branchRef};}); }
// Parses canonical numstat once so construction and admission derive identical caps.
// prettier-ignore
export function parseNumstat(value) { return value.split('\0').filter(Boolean).map((record)=>{const first=record.indexOf('\t'), second=record.indexOf('\t',first+1), addedRaw=record.slice(0,first), deletedRaw=record.slice(first+1,second), file=record.slice(second+1).replace(/\\/g,'/'), binary=addedRaw==='-'&&deletedRaw==='-'; if(first<1||second<0||!file||path.isAbsolute(file)||file.split('/').includes('..')||!binary&&!/^\d+$/.test(addedRaw+deletedRaw)) fail('target diff invalid'); return {path:file,added:binary?null:Number(addedRaw),deleted:binary?null:Number(deletedRaw),binary};}).sort((left,right)=>left.path<right.path?-1:left.path>right.path?1:0); }
// prettier-ignore
async function resolveGit(cwd,dependencies) { if(dependencies.git) return dependencies.git; try { return await resolveVerifiedGit({cwd},dependencies.gitResolverDependencies??{}); } catch(error) { if(error instanceof Camp01GitError) fail('verified Git unavailable'); throw error; } }
// prettier-ignore
async function callGit({git,cwd,args,message},dependencies) { try { return await invokeGit({git,args,cwd},dependencies.gitDependencies??{}); } catch(error) { if(error instanceof Camp01GitError) fail(message); throw error; } }
// prettier-ignore
function samePath(left,right) { if(typeof left!=='string') return false; try { return fs.realpathSync.native(left)===right; } catch { return false; } }
// prettier-ignore
function freezeTarget(value) { return Object.freeze({...value,cleanManifest:Object.freeze([...value.cleanManifest])}); }
function fail(message) {
  throw new Camp01TargetError(message);
}

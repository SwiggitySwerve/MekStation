import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { WAVE_CONTRACTS } from './camp01-authority-receipt.contract.mjs';
import { issuedCommandIdentity } from './camp01-authority-receipt.mjs';

// prettier-ignore
const IDENTITY_KEYS=['CAMP01_RUN_ID','CAMP01_ARTIFACT_DIR','CAMP01_INVOCATION_ID','CAMP01_EXECUTION_ID'], RUNTIME_KEYS=['CAMP01_RUNTIME_ROOT','CAMP01_RUNTIME_LEASE','CAMP01_BROWSER_PROFILE_DIR','CAMP01_BROWSER_STORAGE_DIR','CAMP01_BROWSER_STORAGE_STATE','CAMP01_BROWSER_DOWNLOADS_DIR','CAMP01_PLAYWRIGHT_OUTPUT_DIR','CAMP01_PLAYWRIGHT_HTML_DIR','CAMP01_PLAYWRIGHT_SNAPSHOT_DIR','CAMP01_DATABASE_DIR','CAMP01_UX_WALKTHROUGH_DIR','MEKSTATION_NEXT_DIST_DIR'], RUN_ID=/^camp01-[0-9a-f]{32}$/, INVOCATION_ID=/^[a-z0-9][a-z0-9-]{0,127}$/, EXECUTION_ID=/^ev-[0-9a-f]{32}$/;

export class Camp01RunnerIsolationError extends Error {
  constructor(message, options) {
    super(`CAMP01_RUNNER_ISOLATION_INVALID: ${message}`, options);
    this.name = 'Camp01RunnerIsolationError';
  }
}

// The receipt writer is the only identity issuer. This boundary admits only a
// complete tuple that the writer reproduces for one frozen command row/index.
// prettier-ignore
export function createCamp01RunnerIsolation(environment,dependencies={}) {
  const present=IDENTITY_KEYS.filter((key)=>environment?.[key]!==undefined); if(!present.length){if(RUNTIME_KEYS.some((key)=>environment?.[key]!==undefined))fail('caller-selected runtime context');return inactive();} if(present.length!==IDENTITY_KEYS.length)fail('partial CAMP context');
  const runId=environment.CAMP01_RUN_ID, artifactValue=environment.CAMP01_ARTIFACT_DIR, invocationId=environment.CAMP01_INVOCATION_ID, executionId=environment.CAMP01_EXECUTION_ID; if(!RUN_ID.test(runId)||!INVOCATION_ID.test(invocationId)||!EXECUTION_ID.test(executionId))fail('malformed CAMP context');
  const io=dependencies.fs??fs, realpath=need(dependencies,'realpath',fs.realpathSync.native), remove=need(dependencies,'remove',fs.rmSync), repositoryRoot=canonicalDirectory(dependencies.repoRoot??process.cwd(),io,realpath,'repository root invalid'), artifactRoot=canonicalDirectory(artifactValue,io,realpath,'artifact directory invalid'); if(path.basename(artifactRoot)!==`.stage-${runId}`)fail('artifact directory is not writer-bound');
  const matches=Object.values(WAVE_CONTRACTS).flatMap((row)=>row.commandSequence.map((_command,index)=>({row,index,...issuedCommandIdentity(row,index,runId)}))).filter((entry)=>entry.invocationId===invocationId&&entry.executionId===executionId); if(matches.length!==1)fail('context is not writer-issued'); assertArtifactBinding(repositoryRoot,artifactRoot,matches[0].row);
  const runtimeRoot=path.join(artifactRoot,`.runtime-${executionId}`), paths=Object.freeze({browserTemp:path.join(runtimeRoot,'browser-temp'),browserProfile:path.join(runtimeRoot,'browser-profile'),browserStorage:path.join(runtimeRoot,'browser-storage'),browserStorageState:path.join(runtimeRoot,'browser-storage','state.json'),browserDownloads:path.join(runtimeRoot,'browser-downloads'),databases:path.join(runtimeRoot,'databases'),next:path.join(runtimeRoot,'next'),playwrightResults:path.join(runtimeRoot,'playwright-results'),playwrightHtml:path.join(runtimeRoot,'playwright-html'),playwrightSnapshots:path.join(runtimeRoot,'playwright-snapshots'),uxWalkthrough:path.join(runtimeRoot,'ux-walkthrough')}), directories=[runtimeRoot,paths.browserTemp,paths.browserProfile,paths.browserStorage,paths.browserDownloads,paths.databases,paths.next,paths.playwrightResults,paths.playwrightHtml,paths.playwrightSnapshots,paths.uxWalkthrough], existing=lstatIfPresent(runtimeRoot,io); if(existing!==null)return adopt(environment,repositoryRoot,runtimeRoot,paths,directories,io,realpath);
  const entropy=need(dependencies,'randomBytes',randomBytes)(32), lease=Buffer.isBuffer(entropy)&&entropy.length===32?entropy.toString('hex'):fail('runtime lease unavailable'), created=[]; try {for(const directory of directories){io.mkdirSync(directory);created.push(canonicalDirectory(directory,io,realpath,'created runtime path invalid'));}io.writeFileSync(paths.browserStorageState,'{"cookies":[],"origins":[]}\n',{flag:'wx'});io.writeFileSync(path.join(runtimeRoot,'.isolation-lease'),`${lease}\n`,{flag:'wx'});} catch(error){rollback(created,remove);if(error instanceof Camp01RunnerIsolationError)throw error;fail('invocation runtime creation failed',error);}
  const record=Object.freeze({runtimeRoot:created[0],createdPaths:Object.freeze([...created])}), routedEnvironment=routeEnvironment(repositoryRoot,paths,lease); let cleaned=false;
  const cleanup=()=>{if(cleaned)return;try{const resolved=record.createdPaths.map((createdPath)=>canonicalDirectory(createdPath,io,realpath,'cleanup path invalid'));for(let index=0;index<resolved.length;index+=1){if(resolved[index]!==record.createdPaths[index]||index>0&&!resolved[index].startsWith(`${record.runtimeRoot}${path.sep}`))fail('cleanup path escaped invocation runtime');}for(const createdPath of [...record.createdPaths].reverse())remove(createdPath,{recursive:true});cleaned=true;}catch(error){if(error instanceof Camp01RunnerIsolationError)throw error;fail('invocation runtime cleanup failed',error);}};
  const finish=async(normalize=()=>undefined)=>{if(typeof normalize!=='function')fail('normalizer unavailable');const value=await normalize();cleanup();return value;}; return Object.freeze({active:true,runtimeRoot,paths,createdPaths:record.createdPaths,environment:routedEnvironment,cleanup,finish});
}

// A nested approved launcher adopts the parent's lease and never owns cleanup.
// prettier-ignore
function adopt(environment,repositoryRoot,runtimeRoot,paths,directories,io,realpath) { try {const lease=environment.CAMP01_RUNTIME_LEASE, expected=typeof lease==='string'&&/^[0-9a-f]{64}$/.test(lease)?routeEnvironment(repositoryRoot,paths,lease):fail('invocation runtime already exists'); if(Object.entries(expected).some(([key,value])=>environment[key]!==value))fail('invocation runtime already exists'); const resolved=directories.map((directory)=>canonicalDirectory(directory,io,realpath,'adopted runtime path invalid'));if(resolved.some((value,index)=>value!==directories[index])||io.readFileSync(paths.browserStorageState,'utf8')!=='{"cookies":[],"origins":[]}\n'||io.readFileSync(path.join(runtimeRoot,'.isolation-lease'),'utf8')!==`${lease}\n`)fail('invocation runtime already exists');return Object.freeze({active:true,runtimeRoot,paths,createdPaths:Object.freeze([]),environment:expected,cleanup:()=>undefined,finish:async(normalize=()=>undefined)=>normalize()});}catch(error){if(error instanceof Camp01RunnerIsolationError)throw error;fail('invocation runtime already exists',error);} }
// prettier-ignore
function routeEnvironment(repositoryRoot,paths,lease) { return Object.freeze({TEMP:paths.browserTemp,TMP:paths.browserTemp,TMPDIR:paths.browserTemp,CAMP01_RUNTIME_ROOT:path.dirname(paths.browserTemp),CAMP01_RUNTIME_LEASE:lease,CAMP01_BROWSER_PROFILE_DIR:paths.browserProfile,CAMP01_BROWSER_STORAGE_DIR:paths.browserStorage,CAMP01_BROWSER_STORAGE_STATE:paths.browserStorageState,CAMP01_BROWSER_DOWNLOADS_DIR:paths.browserDownloads,CAMP01_PLAYWRIGHT_OUTPUT_DIR:paths.playwrightResults,CAMP01_PLAYWRIGHT_HTML_DIR:paths.playwrightHtml,PLAYWRIGHT_HTML_OPEN:'never',PLAYWRIGHT_HTML_OUTPUT_DIR:paths.playwrightHtml,CAMP01_PLAYWRIGHT_SNAPSHOT_DIR:paths.playwrightSnapshots,CAMP01_DATABASE_DIR:paths.databases,CAMP01_UX_WALKTHROUGH_DIR:paths.uxWalkthrough,MEKSTATION_NEXT_DIST_DIR:relativePath(repositoryRoot,paths.next)}); }
// prettier-ignore
function assertArtifactBinding(repositoryRoot,artifactRoot,row) { const relative=relativePath(repositoryRoot,path.dirname(artifactRoot)), template=row.runRootTemplate, marker='<sha>', index=template.indexOf(marker), prefix=template.slice(0,index), suffix=template.slice(index+marker.length); if(index<0||relative.length!==prefix.length+40+suffix.length||!relative.startsWith(prefix)||!relative.endsWith(suffix)||!/^[0-9a-f]{40}$/.test(relative.slice(prefix.length,relative.length-suffix.length)))fail('artifact directory is not writer-bound'); }
// prettier-ignore
function canonicalDirectory(value,io,realpath,message) { try {if(typeof value!=='string'||!path.isAbsolute(value))fail(message);assertPathChain(value,io,message);const resolved=realpath(value),stat=io.statSync(resolved);if(!stat.isDirectory())fail(message);return resolved;} catch(error){if(error instanceof Camp01RunnerIsolationError)throw error;fail(message,error);} }
// prettier-ignore
function assertPathChain(value,io,message) { const absolute=path.resolve(value), parsed=path.parse(absolute), segments=absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);let current=parsed.root;for(const segment of segments){current=path.join(current,segment);if(io.lstatSync(current).isSymbolicLink())fail(message);} }
// prettier-ignore
function lstatIfPresent(value,io) { try{return io.lstatSync(value);}catch(error){if(error?.code==='ENOENT')return null;fail('filesystem inspection failed',error);} }
// prettier-ignore
function relativePath(root,value) { const relative=path.relative(root,value);if(!relative||path.isAbsolute(relative)||relative.split(path.sep).includes('..'))fail('path escaped repository root');return relative.split(path.sep).join('/'); }
// prettier-ignore
function rollback(created,remove) { for(const createdPath of [...created].reverse())try{remove(createdPath,{recursive:true});}catch(error){fail('invocation runtime rollback failed',error);} }
// prettier-ignore
function need(dependencies,key,fallback) { const value=dependencies[key]??fallback;if(typeof value!=='function')fail(`dependency ${key} unavailable`);return value; }
// prettier-ignore
function inactive() { return Object.freeze({active:false,runtimeRoot:null,paths:Object.freeze({}),createdPaths:Object.freeze([]),environment:Object.freeze({}),cleanup:()=>undefined,finish:async(normalize=()=>undefined)=>normalize()}); }
function fail(message, cause) {
  throw new Camp01RunnerIsolationError(message, { cause });
}

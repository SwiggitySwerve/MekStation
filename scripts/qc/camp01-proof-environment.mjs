import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  REPOSITORY_IDENTITY,
  WAVE_CONTRACTS,
} from './camp01-authority-receipt.contract.mjs';
import { writeReceipt } from './camp01-authority-receipt.mjs';
import {
  digestBytes,
  environmentDigest,
  validateArtifact,
} from './camp01-authority-receipt.schemas.mjs';
import { CAMP01_GIT_VERSION, resolveVerifiedGit } from './camp01-git-trust.mjs';

const NODE_VERSION = '22.22.0',
  NPM_VERSION = '11.6.2',
  GIT_VERSION = CAMP01_GIT_VERSION,
  DIGEST = /^sha256:[0-9a-f]{64}$/;
// prettier-ignore
const BASE_NAMES=['APPDATA','ComSpec','LOCALAPPDATA','NPM_CONFIG_GLOBALCONFIG','NPM_CONFIG_USERCONFIG','PATH','SystemRoot','TEMP','TMP','USERPROFILE'];
// prettier-ignore
const CAMP_NAMES=['CAMP01_ARTIFACT_DIR','CAMP01_EVIDENCE_REGISTRY','CAMP01_EXECUTION_ID','CAMP01_INVOCATION_ID','CAMP01_RUN_ID'];
const PREPARED = new WeakMap();

export class Camp01EnvironmentError extends Error {
  constructor(message) {
    super(`CAMP01_ENVIRONMENT_INVALID: ${message}`);
    this.name = 'Camp01EnvironmentError';
  }
}

// prettier-ignore
export function expandLogicalCommand(argv,tools) {
  if(!Array.isArray(argv)||argv.length===0||argv.some((part)=>typeof part!=='string')) fail('unsupported logical executable token');
  const expectedNode=path.resolve(process.execPath), expectedNpm=path.join(path.dirname(expectedNode),'node_modules','npm','bin','npm-cli.js'); if(!tools||path.resolve(tools.nodeExecutable)!==expectedNode||path.resolve(tools.npmCli)!==expectedNpm) fail('verified tool path drift');
  if(argv[0]==='@node') return [tools.nodeExecutable,...argv.slice(1)];
  if(argv[0]==='@npm') return [tools.nodeExecutable,tools.npmCli,...argv.slice(1)];
  fail('unsupported logical executable token');
}

// prettier-ignore
export function resolveVerifiedLogicalCommand(argv) {
  const nodeExecutable=path.resolve(process.execPath), npmCli=path.join(path.dirname(nodeExecutable),'node_modules','npm','bin','npm-cli.js'), expanded=expandLogicalCommand(argv,{nodeExecutable,npmCli}), required=argv[0]==='@npm'?[nodeExecutable,npmCli]:[nodeExecutable];
  try { if(required.some((file)=>!fs.statSync(file).isFile())) fail('required tool unavailable'); } catch(error) { if(error instanceof Camp01EnvironmentError) throw error; fail('required tool unavailable'); }
  return expanded;
}

export function createProofEnvironment(dependencies) {
  return Object.freeze({
    prepareEnvironment: (input) => prepareEnvironment(input, dependencies),
    executeReceipt: (input) => executeReceipt(input, dependencies),
  });
}

// prettier-ignore
export async function prepareEnvironment({row,proofTarget},dependencies={}) {
  let runtimeRoot=null, runtimeCreated=false;
  try {
    assertTarget(row,proofTarget); if(PREPARED.has(proofTarget)) fail('environment already prepared');
    const tools=await resolveTools(dependencies,proofTarget.canonicalPath), configuredRuntime=dependencies.runtimeRoot??defaultRuntimeRoot(proofTarget.canonicalPath), targetRoot=path.resolve(proofTarget.canonicalPath); runtimeRoot=path.resolve(configuredRuntime);
    if(runtimeRoot===targetRoot||runtimeRoot.startsWith(`${targetRoot}${path.sep}`)) fail('writer runtime root is not exclusive'); if(fs.existsSync(runtimeRoot)) recoverRuntimeRoot(runtimeRoot,targetRoot);
    fs.mkdirSync(runtimeRoot); runtimeCreated=true; fs.writeFileSync(path.join(runtimeRoot,'.camp01-runtime-owner.json'),runtimeMarker(targetRoot),{flag:'wx'}); const profile=path.join(runtimeRoot,'profile'), temp=path.join(runtimeRoot,'temp'), userConfig=path.join(runtimeRoot,'npm-userconfig'), globalConfig=path.join(runtimeRoot,'npm-globalconfig'); for(const directory of [profile,temp,path.join(profile,'AppData','Roaming'),path.join(profile,'AppData','Local')]) fs.mkdirSync(directory,{recursive:true}); fs.writeFileSync(userConfig,'',{flag:'wx'}); fs.writeFileSync(globalConfig,'',{flag:'wx'});
    const baseEnvironment=buildEnvironment(tools,{profile,temp,userConfig,globalConfig},dependencies.rowEnvironment??{}), versions=await reportVersions(tools,baseEnvironment,targetRoot,dependencies), digests=await fileDigests(tools,dependencies), packageLock=path.join(targetRoot,'package-lock.json'); if(!fs.statSync(packageLock).isFile()) fail('package-lock.json missing'); const packageLockSha256=await digestFile(packageLock,dependencies);
    const bootstrapArgv=expandLogicalCommand(['@npm','ci','--fund=false','--audit=false'],tools), bootstrapEnvironment={...baseEnvironment}, before=JSON.stringify(bootstrapEnvironment), result=await runSpawn(bootstrapArgv,{cwd:targetRoot,env:bootstrapEnvironment},dependencies); if(result===undefined||result===null||result.status===null||result.status===undefined) fail('bootstrap omitted'); if(result.status!==0) fail(`bootstrap failed with exit code ${result.status}`); if(JSON.stringify(bootstrapEnvironment)!==before) fail('bootstrap environment drift');
    // Playwright rows: npm ci does not download browsers, and the hermetic
    // LOCALAPPDATA is an empty profile. Install Chromium into that profile.
    // proof-02-reproduction invokes Playwright via `npm run qc:command:browser:quick`,
    // not a commandSequence argv that names run-playwright.mjs.
    if(needsPlaywrightBrowsers(row,targetRoot)){ const playwrightCli=path.join(targetRoot,'node_modules','playwright','cli.js'); if(!fs.existsSync(playwrightCli)) fail('playwright cli missing'); const browsers=await runSpawn([tools.nodeExecutable,playwrightCli,'install','chromium'],{cwd:targetRoot,env:bootstrapEnvironment},dependencies); if(browsers===undefined||browsers===null||browsers.status===null||browsers.status===undefined) fail('playwright install omitted'); if(browsers.status!==0) fail(`playwright install failed with exit code ${browsers.status}`); if(JSON.stringify(bootstrapEnvironment)!==before) fail('bootstrap environment drift'); }
    await verifyInputs({tools,versions,digests,packageLock,packageLockSha256,baseEnvironment,proofTarget},dependencies);
    const record=environmentRecord({tools,versions,digests,packageLockSha256,baseEnvironment,bootstrapArgv,row}), transcriptDigest=environmentDigest({exitCode:result.status,stdoutDigest:digestBytes(result.stdout??''),stderrDigest:digestBytes(result.stderr??'')}); validateArtifact(record);
    const state={row,proofTarget,runtimeRoot,tools,versions,digests,packageLock,packageLockSha256,baseEnvironment,record,transcriptDigest,dependencies,executionEnvironmentDigest:executionDigest(record,transcriptDigest,tools,targetRoot)}; PREPARED.set(proofTarget,state); return {executionEnvironmentDigest:state.executionEnvironmentDigest};
  } catch(error) { if(runtimeCreated) fs.rmSync(runtimeRoot,{recursive:true,force:true}); if(error instanceof Camp01EnvironmentError) throw error; fail('environment preparation failed'); }
}

// prettier-ignore
export async function executeReceipt({row,arguments:arguments_,provenance,environment,proofTarget},dependencies={}) {
  const state=PREPARED.get(proofTarget); if(!state) fail('bootstrap omitted'); const active={...state.dependencies,...dependencies};
  // Next rewrites tracked next-env.d.ts during compile; restore so the proof worktree stays clean.
  const nextEnvFile=path.join(proofTarget.canonicalPath,'next-env.d.ts'); let nextEnvBytes=null; try { nextEnvBytes=fs.readFileSync(nextEnvFile); } catch { nextEnvBytes=null; }
  try {
    if(state.row!==row||environment?.executionEnvironmentDigest!==state.executionEnvironmentDigest) fail('prepared environment drift'); await verifyState(state,active);
    const resolveWriterContext=active.resolveWriterContext; if(typeof resolveWriterContext!=='function') fail('verified writer context seam missing'); const writerContext=await resolveWriterContext({row,arguments:arguments_,provenance,proofTarget}); assertWriterContext(writerContext,row,provenance);
    const runRoot=path.resolve(proofTarget.canonicalPath,...arguments_.runRoot.split('/')), request={wave:row.wave,commandId:row.commandId,sha:arguments_.sha,treeSha:writerContext.treeSha,runRoot,mode:arguments_.mode,executionEnvironmentDigest:state.executionEnvironmentDigest,provenance:writerContext.provenance,capProvenance:writerContext.capProvenance,identityRegistry:writerContext.identityRegistry,registryContext:writerContext.registryContext,reviewedHead:writerContext.reviewedHead,...!Object.hasOwn(WAVE_CONTRACTS,row.wave)?{repairDeclaration:writerContext.repairDeclaration,repairSource:writerContext.repairSource}:{},...row.wave==='proof-02-triage'?{reproduction:writerContext.reproduction,triage:writerContext.triage}:{},...row.wave==='camp-01h'?{repairs:writerContext.repairs}:{}};
    const written=await writeReceipt(request,{randomBytes:active.randomBytes,runCommand:async(argv,context)=>{await verifyState(state,active); const expanded=expandLogicalCommand(argv,state.tools), childEnvironment=commandEnvironment(state,context), snapshot=JSON.stringify(childEnvironment), result=await runSpawn(expanded,{cwd:proofTarget.canonicalPath,env:childEnvironment,stdio:'inherit'},active); if(JSON.stringify(childEnvironment)!==snapshot) fail('child environment drift'); return {exitCode:result?.status??2,observedTestIds:result?.observedTestIds??[]};}});
    const phase=row.wave==='camp-01h'&&JSON.parse(fs.readFileSync(path.join(written.finalDirectory,'wave-result.json'),'utf8')).status!=='passed'?'observation':'final'; return {runId:written.runId,phase,finalizedPaths:[...row.artifacts]};
  } finally { try { if(nextEnvBytes===null) fs.rmSync(nextEnvFile,{force:true}); else fs.writeFileSync(nextEnvFile,nextEnvBytes); } catch { /* restore must not skip runtime cleanup */ } PREPARED.delete(proofTarget); fs.rmSync(state.runtimeRoot,{recursive:true,force:true}); }
}

// prettier-ignore
async function resolveTools(dependencies,cwd) {
  if((dependencies.platform??process.platform)!=='win32'||!path.isAbsolute(process.execPath)) fail('verified Windows Node unavailable'); const nodeExecutable=path.resolve(process.execPath), nodeRoot=path.dirname(nodeExecutable), npmCli=path.join(nodeRoot,'node_modules','npm','bin','npm-cli.js'); const systemRootResolver=dependencies.resolveSystemRoot??defaultSystemRootResolver, systemRootValue=String(systemRootResolver()); if(!/^[a-z]:\\Windows$/i.test(systemRootValue)) fail('system root drift'); const systemRoot=path.win32.resolve(systemRootValue), system32=path.win32.join(systemRoot,'System32'), cmdExecutable=path.win32.join(system32,'cmd.exe'), resolver=dependencies.resolveVerifiedGit??resolveVerifiedGit; const git=await resolver({cwd}); if(!git||JSON.stringify(Object.keys(git))!==JSON.stringify(['executable'])||!path.win32.isAbsolute(git.executable)) fail('verified Git seam invalid'); const statFile=dependencies.statFile??fs.statSync; for(const file of [nodeExecutable,npmCli,cmdExecutable]) if(!statFile(file).isFile()) fail('required tool unavailable'); return {nodeExecutable,npmCli,cmdExecutable,gitExecutable:path.win32.resolve(git.executable),systemRoot,system32};
}
// The OS-set SystemRoot is the one deliberate ambient read: the Node install drive must never select cmd.exe (review P2, non-C: installs).
// prettier-ignore
function defaultSystemRootResolver() { const value=process.env.SystemRoot; if(typeof value!=='string'||!value) fail('system root unavailable'); return value;
}
// prettier-ignore
function buildEnvironment(tools,runtime,rowEnvironment) { const declared=Object.keys(rowEnvironment); if(declared.length) fail(`undeclared environment input ${declared.sort()[0]}`); const values={APPDATA:path.join(runtime.profile,'AppData','Roaming'),ComSpec:tools.cmdExecutable,LOCALAPPDATA:path.join(runtime.profile,'AppData','Local'),NPM_CONFIG_GLOBALCONFIG:runtime.globalConfig,NPM_CONFIG_USERCONFIG:runtime.userConfig,PATH:`${path.dirname(tools.nodeExecutable)};${tools.system32}`,SystemRoot:tools.systemRoot,TEMP:runtime.temp,TMP:runtime.temp,USERPROFILE:runtime.profile}; return Object.fromEntries(Object.entries(values).sort(([a],[b])=>a.localeCompare(b))); }
// prettier-ignore
async function reportVersions(tools,env,cwd,dependencies) { const reporter=dependencies.versionReporter??defaultVersionReporter, requests=[['node',tools.nodeExecutable,['--version'],NODE_VERSION],['npm',tools.nodeExecutable,[tools.npmCli,'--version'],NPM_VERSION],['git',tools.gitExecutable,['--version'],GIT_VERSION]], values={}; for(const [tool,executable,args,expected] of requests){const raw=await reporter({tool,executable,args,cwd,env:{...env}}), value=String(raw).trim().replace(/^v(?=\d)/,'').replace(/^git version\s+/,''); if(value!==expected) fail(`${tool} version drift; expected ${expected}`); values[tool]=value;} return values; }
// prettier-ignore
function defaultVersionReporter({executable,args,cwd,env}) { const result=spawnSync(executable,args,{shell:false,cwd,env,encoding:'utf8'}); if(result.status!==0) fail('tool version probe failed'); return result.stdout; }
// prettier-ignore
async function fileDigests(tools,dependencies) { return {cmdSha256:await digestFile(tools.cmdExecutable,dependencies),nodeSha256:await digestFile(tools.nodeExecutable,dependencies),npmCliSha256:await digestFile(tools.npmCli,dependencies),gitSha256:await digestFile(tools.gitExecutable,dependencies)}; }
// prettier-ignore
async function digestFile(file,dependencies) { const value=await (dependencies.fileDigester??((target)=>digestBytes(fs.readFileSync(target))))(file); if(!DIGEST.test(value)) fail('tool digest drift'); return value; }
// prettier-ignore
function environmentRecord({tools,versions,digests,packageLockSha256,baseEnvironment,bootstrapArgv,row}) { const campEnvironmentNames=[...CAMP_NAMES,...row.wave==='camp-01h'?['CAMP01_H_IDENTITIES']:[]].sort(); return {schema:'camp01-execution-environment/v1',nodeVersion:versions.node,npmVersion:versions.npm,gitVersion:versions.git,...digests,packageLockSha256,npmConfigSha256:digestBytes(''),canonicalFetchUrlDigest:digestBytes(REPOSITORY_IDENTITY.fetchUrl),environmentValuesDigest:environmentDigest(baseEnvironment),bootstrapArgvDigest:digestBytes(JSON.stringify(bootstrapArgv)).slice(7),bootstrapExitCode:0,allowedEnvironmentNames:[...BASE_NAMES,...campEnvironmentNames].sort(),campEnvironmentNames}; }
// prettier-ignore
function executionDigest(record,transcriptDigest,tools,cwd) { return environmentDigest({record,bootstrapTranscriptDigest:transcriptDigest,toolPathDigest:environmentDigest([tools.nodeExecutable,tools.npmCli,tools.cmdExecutable,tools.gitExecutable]),cwdDigest:digestBytes(cwd)}); }
// prettier-ignore
async function verifyInputs(state,dependencies) { const versions=await reportVersions(state.tools,state.baseEnvironment,state.proofTarget.canonicalPath,dependencies), digests=await fileDigests(state.tools,dependencies), packageLockSha256=await digestFile(state.packageLock,dependencies), empty=digestBytes(''); if(digestBytes(fs.readFileSync(state.baseEnvironment.NPM_CONFIG_USERCONFIG))!==empty||digestBytes(fs.readFileSync(state.baseEnvironment.NPM_CONFIG_GLOBALCONFIG))!==empty) fail('npm config drift'); if(JSON.stringify(versions)!==JSON.stringify(state.versions)||JSON.stringify(digests)!==JSON.stringify(state.digests)||packageLockSha256!==state.packageLockSha256) fail('prepared environment drift'); }
// prettier-ignore
async function verifyState(state,dependencies) { await verifyInputs(state,dependencies); if(executionDigest(state.record,state.transcriptDigest,state.tools,state.proofTarget.canonicalPath)!==state.executionEnvironmentDigest) fail('prepared environment drift'); }
// prettier-ignore
function commandEnvironment(state,context) { const dynamic={CAMP01_ARTIFACT_DIR:path.dirname(context.artifactPath('command-result.json')),CAMP01_EVIDENCE_REGISTRY:JSON.stringify(context.evidenceRegistry),CAMP01_EXECUTION_ID:context.executionId,CAMP01_INVOCATION_ID:context.invocationId,CAMP01_RUN_ID:context.runId,...context.hIdentities?{CAMP01_H_IDENTITIES:JSON.stringify(context.hIdentities)}:{}}; const value=Object.fromEntries(Object.entries({...state.baseEnvironment,...dynamic}).sort(([a],[b])=>a.localeCompare(b))), allowed=state.record.allowedEnvironmentNames; if(JSON.stringify(Object.keys(value))!==JSON.stringify(allowed)) fail('child environment drift'); return value; }
// prettier-ignore
function assertWriterContext(value,row,controllerProvenance) { const keys=['treeSha','provenance','capProvenance','identityRegistry','registryContext','reviewedHead',...!Object.hasOwn(WAVE_CONTRACTS,row.wave)?['repairDeclaration','repairSource']:[],...row.wave==='proof-02-triage'?['reproduction','triage']:[]]; if(!value||JSON.stringify(Object.keys(value))!==JSON.stringify(keys)||!value.provenance||value.provenance.subject!==controllerProvenance.subject) fail('verified writer context drift'); }
// prettier-ignore
async function runSpawn(argv,options,dependencies) { const spawn=dependencies.spawn??spawnSync; try { return await spawn(argv[0],argv.slice(1),{...options,shell:false}); } catch(error) { if(error instanceof Camp01EnvironmentError) throw error; fail('process spawn failed'); } }
// prettier-ignore
function defaultRuntimeRoot(target) { return path.join(path.dirname(target),`.camp01-runtime-${digestBytes(target).slice(7,23)}`); }
// prettier-ignore
function runtimeMarker(target) { return `${JSON.stringify({schema:'camp01-runtime-root/v1',targetDigest:digestBytes(target)})}\n`; }
// prettier-ignore
function recoverRuntimeRoot(root,target) { try { const rootStat=fs.lstatSync(root), marker=path.join(root,'.camp01-runtime-owner.json'), markerStat=fs.lstatSync(marker); if(rootStat.isSymbolicLink()||!rootStat.isDirectory()||markerStat.isSymbolicLink()||!markerStat.isFile()||fs.readFileSync(marker,'utf8')!==runtimeMarker(target)) fail('writer runtime root is not exclusive'); fs.rmSync(root,{recursive:true}); } catch(error) { if(error instanceof Camp01EnvironmentError) throw error; fail('writer runtime root is not exclusive'); } }
// prettier-ignore
function assertTarget(row,proofTarget) { if(!row||!Array.isArray(row.commandSequence)||!Array.isArray(row.artifacts)||!proofTarget||!path.isAbsolute(proofTarget.canonicalPath)) fail('proof target drift'); }
// prettier-ignore
function needsPlaywrightBrowsers(row,targetRoot) {
  const marker='scripts/playwright/run-playwright.mjs';
  if(Array.isArray(row.commandSequence)&&row.commandSequence.some((argv)=>Array.isArray(argv)&&argv.includes(marker))) return true;
  if(Array.isArray(row.reporterContracts)&&row.reporterContracts.some((contract)=>contract.producerId===marker)) return true;
  let scripts; try { scripts=JSON.parse(fs.readFileSync(path.join(targetRoot,'package.json'),'utf8')).scripts; } catch { return false; }
  if(!scripts||typeof scripts!=='object') return false;
  return row.commandSequence.some((argv)=>Array.isArray(argv)&&argv[0]==='@npm'&&argv[1]==='run'&&typeof argv[2]==='string'&&typeof scripts[argv[2]]==='string'&&scripts[argv[2]].includes(marker));
}
// prettier-ignore
function fail(message) { throw new Camp01EnvironmentError(message); }

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { REPOSITORY_IDENTITY } from './camp01-authority-receipt.contract.mjs';

// prettier-ignore
// Known-good Git builds, extended DELIBERATELY when an environment updates.
// windows-2025 runner images: the win25-vs2026/20260818.207 readme names
// 2.55.0.windows.4 but the binary MEASURED 2.55.0.windows.5 (probe evidence,
// 2026-08-28) - trust the measurement, keep both;
// operator machines run 2.54.0.windows.1. An exact single pin broke the live
// probes on every runner-image bump; an allowlist keeps the tamper property -
// an UNKNOWN version still fails closed - while naming each accepted build.
export const CAMP01_GIT_VERSIONS=Object.freeze(['2.54.0.windows.1','2.55.0.windows.4','2.55.0.windows.5']);
export const CAMP01_GIT_VERSION = CAMP01_GIT_VERSIONS[0],
  CAMP01_GIT_FETCH_URL = 'https://github.com/SwiggitySwerve/MekStation.git';
const OID = /^[0-9a-f]{40}$/;
// prettier-ignore
const FETCH_REFS=Object.freeze(['+HEAD:refs/camp01/fetched-head','+refs/heads/main:refs/camp01/fetched-main']);
// prettier-ignore
const WELL_KNOWN_GIT=Object.freeze(['C:\\Program Files\\Git\\mingw64\\bin\\git.exe','C:\\Program Files\\Git\\cmd\\git.exe','C:\\Program Files\\Git\\bin\\git.exe']);
// prettier-ignore
const HARDENED_ARGS=Object.freeze(['--no-replace-objects','-c','credential.helper=','-c','credential.interactive=never','-c','core.askPass=','-c','http.proxy=','-c','https.proxy=','-c',`url.${CAMP01_GIT_FETCH_URL}.insteadOf=camp01-disabled-rewrite:`]);

export class Camp01GitError extends Error {
  constructor(message) {
    super(`CAMP01_GIT_INVALID: ${message}`);
    this.name = 'Camp01GitError';
  }
}

// prettier-ignore
export async function resolveVerifiedGit({cwd=process.cwd()}={},dependencies={}) {
  const resolver=dependencies.resolveExecutable??defaultResolveExecutable; let executable;
  try { executable=await resolver(); } catch { fail('verified Git executable unavailable'); }
  if(typeof executable!=='string'||!path.isAbsolute(executable)) fail('Git executable must be absolute');
  const normalized=path.resolve(executable);
  try { const stat=await (dependencies.statFile??fs.statSync)(normalized); if(!stat.isFile()) fail('verified Git executable unavailable'); } catch(error) { if(error instanceof Camp01GitError) throw error; fail('verified Git executable unavailable'); }
  let raw; try { raw=(await invokeGit({git:{executable:normalized},args:['--version'],cwd},dependencies)).stdout; } catch(error) { if(error instanceof Camp01GitError) fail('Git version probe failed'); throw error; }
  const version=raw.trim().replace(/^git version\s+/,''); if(!CAMP01_GIT_VERSIONS.includes(version)) fail(`Git version drift; got ${version}, expected one of ${CAMP01_GIT_VERSIONS.join(', ')}`);
  return Object.freeze({executable:normalized});
}

// prettier-ignore
export async function invokeGit({git,args,cwd},dependencies={}) {
  assertGit(git); if(typeof cwd!=='string'||!path.isAbsolute(cwd)) fail('Git cwd must be absolute'); if(!Array.isArray(args)||args.some((value)=>typeof value!=='string')) fail('Git argv must be a string array');
  const options={shell:false,cwd:path.resolve(cwd),env:gitEnvironment(git.executable)}; let result;
  try { result=await (dependencies.spawn??spawnSync)(git.executable,[...HARDENED_ARGS,...args],options); } catch { fail('Git invocation failed'); }
  if(!result||result.status!==0) fail('Git invocation failed');
  return Object.freeze({stdout:String(result.stdout??''),stderr:String(result.stderr??'')});
}

// prettier-ignore
export async function createBareSession({git,directory},dependencies={}) {
  assertGit(git); if(typeof directory!=='string'||!path.isAbsolute(directory)) fail('session directory must be absolute'); const normalized=path.resolve(directory);
  if(fs.existsSync(normalized)) fail('session directory already exists'); try { fs.mkdirSync(normalized); } catch { fail('session directory creation failed'); }
  try { await invokeGit({git,args:['init','--bare','--initial-branch=main'],cwd:normalized},dependencies); } catch(error) { if(error instanceof Camp01GitError) fail('bare session initialization failed'); throw error; }
  return Object.freeze({directory:normalized,executable:git.executable});
}

// prettier-ignore
export async function fetchAndVerifyOids({session,remoteUrl,headOid:expectedHeadOid,mainOid:expectedMainOid},dependencies={}) {
  assertSession(session); assertRemoteUrl(remoteUrl,dependencies); if(!OID.test(expectedHeadOid)||!OID.test(expectedMainOid)) fail('invalid pinned OIDs'); const git={executable:session.executable};
  try { await invokeGit({git,args:['fetch','--no-tags','--no-recurse-submodules',remoteUrl,...FETCH_REFS],cwd:session.directory},dependencies); } catch(error) { if(error instanceof Camp01GitError) fail('fetch failed'); throw error; }
  const headOid=await readOid(git,session.directory,'head',dependencies), mainOid=await readOid(git,session.directory,'main',dependencies);
  if(headOid!==expectedHeadOid) fail('fetched head OID mismatch'); if(mainOid!==expectedMainOid) fail('fetched main OID mismatch');
  return Object.freeze({directory:session.directory,executable:session.executable,fetchUrl:remoteUrl,headOid,mainOid});
}

// prettier-ignore
async function readOid(git,directory,name,dependencies) {
  let stdout; try { stdout=(await invokeGit({git,args:['rev-parse','--verify',`refs/camp01/fetched-${name}^{commit}`],cwd:directory},dependencies)).stdout.trim(); } catch(error) { if(error instanceof Camp01GitError) fail('fetched OID readback failed'); throw error; }
  if(!OID.test(stdout)) fail('fetched OID readback failed'); return stdout;
}

function defaultResolveExecutable() {
  if (process.platform !== 'win32') return null;
  return WELL_KNOWN_GIT.find((candidate) => fs.existsSync(candidate)) ?? null;
}

// prettier-ignore
function gitEnvironment(executable) { const nullDevice=process.platform==='win32'?'NUL':'/dev/null'; return {GCM_GUI_PROMPT:'0',GCM_INTERACTIVE:'Never',GIT_ASKPASS:'',GIT_CONFIG_GLOBAL:nullDevice,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_SYSTEM:nullDevice,GIT_TERMINAL_PROMPT:'0',PATH:path.dirname(executable),SSH_ASKPASS:''}; }

// prettier-ignore
function assertGit(git) { if(!git||JSON.stringify(Object.keys(git))!==JSON.stringify(['executable'])||typeof git.executable!=='string'||!path.isAbsolute(git.executable)) fail('verified Git contract drift'); }

// prettier-ignore
function assertSession(session) { if(!session||JSON.stringify(Object.keys(session))!==JSON.stringify(['directory','executable'])||!path.isAbsolute(session.directory)) fail('bare session contract drift'); assertGit({executable:session.executable}); }

// Tests may inject this local-only exception. Production callers omit dependencies,
// so non-literal URLs fail closed; PROOF-5 owns adapter-reachability proof.
// prettier-ignore
function assertRemoteUrl(remoteUrl,dependencies) {
  if(REPOSITORY_IDENTITY.fetchUrl!==CAMP01_GIT_FETCH_URL) fail('repository fetch URL drift'); if(remoteUrl===CAMP01_GIT_FETCH_URL) return;
  if(dependencies.testOnlyAllowLocalRemote!==true||!isLocalRemote(remoteUrl)) fail('fetch URL drift');
}

// prettier-ignore
function isLocalRemote(value) { if(typeof value!=='string') return false; if(path.isAbsolute(value)) return true; try { const parsed=new URL(value); return parsed.protocol==='file:'&&(parsed.hostname===''||parsed.hostname==='localhost'); } catch { return false; } }

function fail(message) {
  throw new Camp01GitError(message);
}

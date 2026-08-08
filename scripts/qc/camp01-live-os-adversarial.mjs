// allow: SIZE_OK — PROOF-5D6 is one registry-owned live-probe module with five host-gated OS probes.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const modulePath = fileURLToPath(import.meta.url),
  allHosts = Object.freeze({ gateId: 'all-hosts', platforms: [] }),
  linuxOrWindows = Object.freeze({
    gateId: 'posix-chmod-or-windows-icacls',
    platforms: ['linux', 'win32'],
  }),
  windowsOnly = Object.freeze({
    gateId: 'windows-exclusive-handle',
    platforms: ['win32'],
  });
// Capability gates name the hosts on which each OS mechanism is actually provisioned, so a
// skip on a provisioned host reads as the capability loss it is. Only Linux carries an
// ENOSPC mechanism the live workflow supplies (`/dev/full`); `CAMP01_LIVE_ENOSPC_ROOT` is
// an operator escape hatch no leg sets, so a Windows ENOSPC skip is the declared host gap.
// prettier-ignore
const nodeRuntimeHosts = Object.freeze({ gateId: 'node-child-process-primitives', hosts: 'all' }),
  permissionMechanismHosts = Object.freeze({ gateId: 'posix-chmod-or-windows-icacls', hosts: ['linux', 'win32'] }),
  enospcMechanismHosts = Object.freeze({ gateId: 'dev-full-or-quota-root', hosts: ['linux'] }),
  windowsHandleHosts = Object.freeze({ gateId: 'windows-exclusive-handle', hosts: ['win32'] });

// prettier-ignore
export const PROOF5D6_LIVE_PROBE_REGISTRATIONS=Object.freeze([
  {probeId:'proof5d6-real-permission-denial',hostGate:linuxOrWindows,capabilityGate:permissionMechanismHosts,run:permissionDenialProbe},
  {probeId:'proof5d6-real-enospc',hostGate:allHosts,capabilityGate:enospcMechanismHosts,run:enospcProbe},
  {probeId:'proof5d6-real-child-signal',hostGate:allHosts,capabilityGate:nodeRuntimeHosts,run:childSignalProbe},
  {probeId:'proof5d6-two-process-isolation-race',hostGate:allHosts,capabilityGate:nodeRuntimeHosts,run:twoProcessRaceProbe},
  {probeId:'proof5d6-windows-locked-handle-cleanup',hostGate:windowsOnly,capabilityGate:windowsHandleHosts,run:windowsLockedHandleProbe},
]);

class Proof5D6ProbeError extends Error {
  constructor(code, message, options = {}) {
    super(`PROOF5D6_${code}: ${message}`, options);
    this.name = 'Proof5D6ProbeError';
    this.code = code;
  }
}

async function permissionDenialProbe({ scratchRoot }) {
  const fixture = await createRunnerFixture(scratchRoot, 'permission'),
    owner = fixture.create(),
    leasePath = path.join(owner.runtimeRoot, '.isolation-lease'),
    entriesBefore = treeEntries(owner.runtimeRoot);
  let denial,
    deniedReadCode = null,
    rejection = null,
    restoration = null;
  try {
    denial = denyReadAccess(leasePath);
    try {
      fs.readFileSync(leasePath);
    } catch (error) {
      deniedReadCode = findErrorCode(error);
    }
    try {
      fixture.create({ ...fixture.environment, ...owner.environment });
    } catch (error) {
      if (!(error instanceof fixture.ErrorClass)) throw error;
      rejection = errorDetails(error);
    }
  } finally {
    if (denial) restoration = denial.restore();
  }
  const entriesAfter = treeEntries(owner.runtimeRoot);
  owner.cleanup();
  if (
    !['EACCES', 'EPERM'].includes(deniedReadCode) ||
    rejection?.name !== 'Camp01RunnerIsolationError' ||
    !rejection.message.includes('invocation runtime already exists') ||
    JSON.stringify(entriesAfter) !== JSON.stringify(entriesBefore)
  )
    fail('PERMISSION_ORACLE_FAILED', 'permission denial did not fail closed');
  return {
    evidence: {
      row: 'C09-L3',
      outcomeCode: 'PERMISSION_DENIAL_TYPED_CLOSED',
      mechanism: denial.mechanism,
      deniedReadCode,
      productionRejection: rejection,
      runtimeEntriesBefore: entriesBefore,
      runtimeEntriesAfter: entriesAfter,
      restoration,
      runtimeRootAfterCleanup: pathExists(owner.runtimeRoot),
    },
  };
}

async function enospcProbe({ scratchRoot }) {
  const deviceAvailable =
      process.platform === 'linux' &&
      pathExists('/dev/full') &&
      canWrite('/dev/full'),
    quotaRoot = process.env.CAMP01_LIVE_ENOSPC_ROOT;
  if (!deviceAvailable && !quotaRoot)
    return {
      status: 'skipped-with-reason',
      reason: { code: 'ENOSPC_MECHANISM_UNAVAILABLE' },
      evidence: {
        row: 'C09-L4',
        outcomeCode: 'ENOSPC_MECHANISM_UNAVAILABLE',
        checkedDevice: '/dev/full',
        quotaEnvironment: 'CAMP01_LIVE_ENOSPC_ROOT',
      },
    };
  const [{ WAVE_CONTRACTS }, writer, normalizer] = await Promise.all([
      import('./camp01-authority-receipt.contract.mjs'),
      import('./camp01-authority-receipt.mjs'),
      import('./camp01-h-report-normalizer.mjs'),
    ]),
    row = WAVE_CONTRACTS['camp-01h'],
    reporter = row.reporterContracts.find(
      ({ invocationId }) => invocationId === '05-layout-helpers',
    );
  if (!reporter) fail('REPORTER_UNAVAILABLE', 'CAMP-01H reporter missing');
  const runId = `camp01-${randomBytes(16).toString('hex')}`,
    identities = writer.issueHIdentities(runId);
  let quotaScratch = null,
    rejection = null;
  const artifactDirectory = deviceAvailable
    ? path.join(scratchRoot, 'enospc-artifact')
    : (quotaScratch = fs.mkdtempSync(
        path.join(resolveQuotaRoot(quotaRoot), 'camp01-live-enospc-'),
      ));
  fs.mkdirSync(artifactDirectory, { recursive: true });
  const target = path.join(
      artifactDirectory,
      ...reporter.normalizedPath.split('/'),
    ),
    deviceIo = {
      ...fs,
      writeFileSync(_target, bytes) {
        fs.writeFileSync('/dev/full', bytes);
      },
    };
  try {
    const identity = identities[reporter.witnessLabel],
      environment = {
        CAMP01_RUN_ID: runId,
        CAMP01_ARTIFACT_DIR: artifactDirectory,
        CAMP01_INVOCATION_ID: reporter.invocationId,
        CAMP01_EXECUTION_ID: identity.executionId,
        CAMP01_H_IDENTITIES: JSON.stringify(identities),
      },
      report = normalizer.prepareCamp01HReport({
        environment,
        isolation: { active: true },
        producerId: reporter.producerId,
        dependencies: deviceAvailable ? { fs: deviceIo } : {},
      });
    try {
      report.normalize([]);
    } catch (error) {
      if (!(error instanceof normalizer.Camp01HReportNormalizerError))
        throw error;
      rejection = errorDetails(error);
    }
    const publishedEntries = pathExists(path.dirname(target))
      ? treeEntries(path.dirname(target))
      : [];
    if (
      rejection?.causeCode !== 'ENOSPC' ||
      pathExists(target) ||
      publishedEntries.length !== 0
    )
      fail('ENOSPC_ORACLE_FAILED', 'ENOSPC publication did not fail closed');
    return {
      evidence: {
        row: 'C09-L4',
        outcomeCode: 'ENOSPC_TYPED_NO_PUBLICATION',
        mechanism: deviceAvailable ? 'linux-dev-full' : 'quota-limited-root',
        faultTarget: deviceAvailable ? '/dev/full' : 'CAMP01_LIVE_ENOSPC_ROOT',
        productionRejection: rejection,
        normalizedPath: reporter.normalizedPath,
        normalizedTargetExists: false,
        publishedEntries,
      },
    };
  } finally {
    if (quotaScratch)
      fs.rmSync(quotaScratch, { recursive: true, force: true, maxRetries: 3 });
  }
}

// prettier-ignore
async function childSignalProbe({scratchRoot}) {
  const normalizedPath=path.join(scratchRoot,'normalized-report.json'), recordPath=path.join(scratchRoot,'signal-record.json'), worker=spawn(process.execPath,[modulePath,'--signal-worker'],{env:{...process.env,CAMP01_SIGNAL_NORMALIZED_PATH:normalizedPath,CAMP01_SIGNAL_RECORD_PATH:recordPath},shell:false,stdio:['ignore','pipe','pipe']}); let workerResult;
  try{workerResult=await observeProcess(worker,15_000);}finally{if(worker.exitCode===null)worker.kill();}
  const record=JSON.parse(fs.readFileSync(recordPath,'utf8'));
  const relayObserved=workerResult.signal===record.childSignal||(process.platform==='win32'&&workerResult.exitCode!==0&&record.relayAttempted===true);
  if(record.childSignal!=='SIGKILL'||record.normalizerSelected||pathExists(normalizedPath)||!relayObserved||workerResult.stderr.trim())fail('SIGNAL_ORACLE_FAILED','signal path selected a normalizer or did not relay');
  return {evidence:{row:'C09-L5',outcomeCode:'ABNORMAL_SIGNAL_RELAYED_NO_NORMALIZATION',launcherConsumer:'selectOrdinaryExitNormalizer',childExitCode:record.childExitCode,childSignal:record.childSignal,normalizerSelected:record.normalizerSelected,relayAttempted:record.relayAttempted,workerExitCode:workerResult.exitCode,workerSignal:workerResult.signal,workerStderr:workerResult.stderr.trim(),normalizedReportExists:pathExists(normalizedPath)}};
}

// prettier-ignore
async function twoProcessRaceProbe({scratchRoot}) {
  const fixture=await createRunnerFixture(scratchRoot,'race'), input=JSON.stringify({repoRoot:fixture.repoRoot}), workers=['worker-1','worker-2'].map((workerId)=>observeIpcWorker(workerId,spawn(process.execPath,[modulePath,'--race-worker'],{env:{...process.env,...fixture.environment,CAMP01_RACE_WORKER_INPUT:input},shell:false,stdio:['ignore','pipe','pipe','ipc']})));
  try {
    const artifactDirectory={configured:fixture.artifactDirectory,canonical:fs.realpathSync.native(fixture.artifactDirectory)};
    const initial=await deadline(Promise.all(workers.map(({firstMessage})=>firstMessage)),15_000,'race ownership outcomes'), winner=initial.find(({kind})=>kind==='winner'), loser=initial.find(({kind})=>kind==='loser');
    if(!winner||!loser||winner.workerId===loser.workerId)return raceFailure('race did not produce one winner and one loser',{row:'C09-L6',artifactDirectory,workerOutcomes:initial.map(({workerId,kind,runtimeRoot,errorName,errorMessage,causeCode})=>({workerId,kind,runtimeRoot,errorName,errorMessage,causeCode}))});
    const actualDuringOwnership=treeEntries(fixture.artifactDirectory), expectedDuringOwnership=[...winner.createdPaths.map((value)=>path.relative(fixture.artifactDirectory,value).split(path.sep).join('/')),`${path.basename(winner.runtimeRoot)}/.isolation-lease`,`${path.basename(winner.runtimeRoot)}/browser-storage/state.json`].sort();
    winner.worker.send({type:'release'}); const results=await deadline(Promise.all(workers.map(({closed})=>closed)),15_000,'race worker cleanup'), entriesAfterCleanup=treeEntries(fixture.artifactDirectory);
    const observation={row:'C09-L6',artifactDirectory,winner:{workerId:winner.workerId,outcome:'active-owner',runtimeRoot:path.basename(winner.runtimeRoot),createdPaths:winner.createdPaths},loser:{workerId:loser.workerId,outcome:'typed-rejection',errorName:loser.errorName,errorMessage:loser.errorMessage,causeCode:loser.causeCode},runtimeEntriesDuringOwnership:actualDuringOwnership,expectedEntriesDuringOwnership:expectedDuringOwnership,loserUnexpectedResidue:actualDuringOwnership.filter((entry)=>!expectedDuringOwnership.includes(entry)),artifactEntriesAfterWinnerCleanup:entriesAfterCleanup,workerExits:results.map(({exitCode,signal},index)=>({workerId:workers[index].workerId,exitCode,signal}))};
    if(loser.errorName!=='Camp01RunnerIsolationError'||JSON.stringify(actualDuringOwnership)!==JSON.stringify(expectedDuringOwnership)||entriesAfterCleanup.length!==0||results.some(({exitCode,signal})=>exitCode!==0||signal!==null))return raceFailure('race ownership or residue oracle failed',observation);
    return {evidence:{...observation,outcomeCode:'EXACTLY_ONE_RUNTIME_OWNER'}};
  } finally {for(const {worker} of workers)if(worker.exitCode===null)worker.kill();}
}

// A failed race oracle keeps its whole observation on the probe record so the
// published artifact explains the rejection instead of collapsing to a message.
// prettier-ignore
function raceFailure(message,observation) {return {status:'failed',reason:{code:'PROBE_FAILED',message:`PROOF5D6_RACE_ORACLE_FAILED: ${message}`},evidence:{...observation,outcomeCode:'RACE_ORACLE_FAILED'}};}

// prettier-ignore
async function windowsLockedHandleProbe({scratchRoot}) {
  const fixture=await createRunnerFixture(scratchRoot,'locked-handle'), rmCalls=[]; let runtimeRoot=null;
  const remove=(target,options)=>{const started=process.hrtime.bigint();try{fs.rmSync(target,options);rmCalls.push(timingRecord(target,options,started,null));}catch(error){rmCalls.push(timingRecord(target,options,started,findErrorCode(error)));throw error;}};
  const owner=fixture.create(fixture.environment,{remove}); runtimeRoot=owner.runtimeRoot;
  const lockedPath=path.join(owner.paths.uxWalkthrough,'locked.handle'); fs.writeFileSync(lockedPath,'locked\n',{flag:'wx'}); const lock=await holdWindowsExclusiveHandle(lockedPath); let rejection=null;
  try {
    try{owner.cleanup();}catch(error){if(!(error instanceof fixture.ErrorClass))throw error;rejection=errorDetails(error);}
    const ownershipWhileLocked={runtimeRootExists:pathExists(runtimeRoot),leaseExists:pathExists(path.join(runtimeRoot,'.isolation-lease')),lockedFileExists:pathExists(lockedPath),createdPathsPresent:owner.createdPaths.filter(pathExists).length};
    await lock.release(); owner.cleanup(); const failedRm=rmCalls.find(({errorCode})=>errorCode!==null);
    if(rejection?.message!=='CAMP01_RUNNER_ISOLATION_INVALID: invocation runtime cleanup failed'||!failedRm||ownershipWhileLocked.createdPathsPresent!==owner.createdPaths.length||pathExists(runtimeRoot))fail('LOCKED_HANDLE_ORACLE_FAILED','locked cleanup ownership oracle failed');
    return {evidence:{row:'C09-L7',outcomeCode:'LOCKED_HANDLE_TYPED_RETRYABLE_CLEANUP',mechanism:'powershell-fileshare-none',productionRejection:rejection,rmSyncRetryTiming:failedRm,ownershipWhileLocked,lockReleaseExitCode:lock.exitCode(),runtimeRootExistsAfterRetry:pathExists(runtimeRoot),successfulProductionCleanupCalls:rmCalls.filter(({errorCode})=>errorCode===null).length}};
  } finally {await lock.release();if(runtimeRoot&&pathExists(runtimeRoot))fs.rmSync(runtimeRoot,{recursive:true,force:true,maxRetries:3});}
}

// Production canonicalizes every path it is handed, so the fixture publishes the
// canonical form too. Otherwise a host whose temporary root is an alias (Windows
// 8.3 short name, subst drive, macOS /private/var) hands probes a base path that
// production's returned paths are not relative to.
// prettier-ignore
async function createRunnerFixture(scratchRoot,name) {
  const [{WAVE_CONTRACTS},writer,runner]=await Promise.all([import('./camp01-authority-receipt.contract.mjs'),import('./camp01-authority-receipt.mjs'),import('./camp01-runner-isolation.mjs')]), repoRoot=path.join(scratchRoot,`${name}-repository`), row=WAVE_CONTRACTS['proof-02-reproduction'], runId=`camp01-${randomBytes(16).toString('hex')}`, sha=randomBytes(20).toString('hex'), identity=writer.issuedCommandIdentity(row,0,runId), rowRoot=path.join(repoRoot,...row.runRootTemplate.replace('<sha>',sha).split('/')), stageDirectory=path.join(rowRoot,`.stage-${runId}`); fs.mkdirSync(stageDirectory,{recursive:true});
  const canonicalRepoRoot=fs.realpathSync.native(repoRoot), artifactDirectory=fs.realpathSync.native(stageDirectory);
  const environment={CAMP01_RUN_ID:runId,CAMP01_ARTIFACT_DIR:artifactDirectory,CAMP01_INVOCATION_ID:identity.invocationId,CAMP01_EXECUTION_ID:identity.executionId};
  return {repoRoot:canonicalRepoRoot,artifactDirectory,environment,ErrorClass:runner.Camp01RunnerIsolationError,create:(value=environment,dependencies={})=>runner.createCamp01RunnerIsolation(value,{repoRoot:canonicalRepoRoot,...dependencies})};
}

// prettier-ignore
function denyReadAccess(target) {
  if(process.platform==='win32'){
    const account=runSystem('whoami.exe',[]).stdout.trim(); try{runSystem('icacls.exe',[target,'/deny',`${account}:(R)`]);}catch(error){restoreWindowsReadAcl(target,account);throw error;}
    return {mechanism:'windows-icacls-read-deny',restore(){const result=restoreWindowsReadAcl(target,account);return {mechanism:result.mechanism,exitCode:result.exitCode,restoredLeaseBytes:fs.readFileSync(target,'utf8').length};}};
  }
  const originalMode=fs.statSync(target).mode&0o777; fs.chmodSync(target,0o000);
  return {mechanism:'posix-chmod-000',restore(){fs.chmodSync(target,originalMode);return {mechanism:'posix-chmod-restore',restoredMode:originalMode.toString(8).padStart(3,'0'),restoredLeaseBytes:fs.readFileSync(target,'utf8').length};}};
}

// prettier-ignore
async function runSignalWorker() {
  const normalizedPath=needEnvironment('CAMP01_SIGNAL_NORMALIZED_PATH'), recordPath=needEnvironment('CAMP01_SIGNAL_RECORD_PATH'), {selectOrdinaryExitNormalizer}=await import('./camp01-h-report-normalizer.mjs'), child=spawn(process.execPath,['-e',"process.send('ready');setInterval(()=>{},1000)"],{shell:false,stdio:['ignore','ignore','ignore','ipc']});
  await deadline(waitForMessage(child),10_000,'signal child readiness'); const closed=processClosed(child); child.kill('SIGKILL'); const result=await deadline(closed,10_000,'signal child termination'), normalize=()=>fs.writeFileSync(normalizedPath,'partial\n'), selected=selectOrdinaryExitNormalizer(result.exitCode,result.signal,normalize); if(selected)await selected();
  fs.writeFileSync(recordPath,JSON.stringify({childExitCode:result.exitCode,childSignal:result.signal,normalizerSelected:selected!==undefined,relayAttempted:true}),{flag:'wx'}); process.kill(process.pid,result.signal); fail('SIGNAL_RELAY_RETURNED','signal relay returned to the worker');
}

// prettier-ignore
async function runRaceWorker() {
  const input=JSON.parse(needEnvironment('CAMP01_RACE_WORKER_INPUT')), runner=await import('./camp01-runner-isolation.mjs'); let owner;
  try{owner=runner.createCamp01RunnerIsolation(process.env,{repoRoot:input.repoRoot});}catch(error){process.send({kind:'loser',errorName:error instanceof Error?error.name:typeof error,errorMessage:error instanceof Error?error.message:String(error),causeCode:findErrorCode(error)});process.disconnect();return;}
  process.send({kind:'winner',runtimeRoot:owner.runtimeRoot,createdPaths:owner.createdPaths}); const message=await waitForMessage(process); if(message?.type!=='release')fail('RACE_RELEASE_INVALID','race owner release message invalid'); owner.cleanup(); process.send({kind:'winner-cleaned'},()=>process.disconnect());
}

// prettier-ignore
function observeIpcWorker(workerId,worker) {
  const messages=[]; let firstResolve; const firstMessage=new Promise((resolve)=>{firstResolve=resolve;});
  worker.on('message',(message)=>{const value={...message,workerId,worker};messages.push(value);if(messages.length===1)firstResolve(value);});
  return {workerId,worker,messages,firstMessage,closed:processClosed(worker)};
}

// prettier-ignore
function observeProcess(child,timeoutMs) {
  let stdout='',stderr='';child.stdout?.on('data',(chunk)=>{stdout+=chunk;});child.stderr?.on('data',(chunk)=>{stderr+=chunk;});
  return deadline(processClosed(child),timeoutMs,'child process').then((result)=>({...result,stdout,stderr}));
}

// prettier-ignore
function processClosed(child) {return new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(exitCode,signal)=>resolve({exitCode:exitCode??1,signal}));});}
// prettier-ignore
function waitForMessage(emitter) {return new Promise((resolve)=>emitter.once('message',resolve));}
// prettier-ignore
function deadline(promise,milliseconds,label) {return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Proof5D6ProbeError('TIMEOUT',`${label} timed out`)),milliseconds);promise.then((value)=>{clearTimeout(timer);resolve(value);},(error)=>{clearTimeout(timer);reject(error);});});}

// prettier-ignore
function holdWindowsExclusiveHandle(target) {
  const script="$stream=[System.IO.File]::Open($env:CAMP01_LOCK_PATH,[System.IO.FileMode]::Open,[System.IO.FileAccess]::ReadWrite,[System.IO.FileShare]::None);[Console]::Out.WriteLine('LOCKED');[Console]::Out.Flush();[Console]::In.ReadLine()|Out-Null;$stream.Dispose()", child=spawn('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{env:{...process.env,CAMP01_LOCK_PATH:target},shell:false,stdio:['pipe','pipe','pipe']}); let output='',released=false,result=null;
  const ready=new Promise((resolve,reject)=>{child.once('error',reject);child.stdout.setEncoding('utf8');child.stdout.on('data',(chunk)=>{output+=chunk;if(output.includes('LOCKED'))resolve();});}), closed=processClosed(child);
  return deadline(ready,10_000,'Windows file lock').then(()=>({async release(){if(released)return;released=true;child.stdin.end('\n');result=await deadline(closed,10_000,'Windows file unlock');},exitCode:()=>result?.exitCode??null}),(error)=>{child.kill();throw error;});
}

// prettier-ignore
function timingRecord(target,options,started,errorCode) {return {target:path.basename(target),recursive:options?.recursive===true,configuredMaxRetries:options?.maxRetries??0,configuredRetryDelayMs:options?.retryDelay??100,elapsedMs:Number(process.hrtime.bigint()-started)/1_000_000,errorCode};}
// prettier-ignore
function treeEntries(root,current=root) {if(!pathExists(root))return [];const entries=[];for(const entry of fs.readdirSync(current,{withFileTypes:true})){const target=path.join(current,entry.name);entries.push(path.relative(root,target).split(path.sep).join('/'));if(entry.isDirectory())entries.push(...treeEntries(root,target));}return entries.sort();}
// prettier-ignore
function errorDetails(error) {return {name:error instanceof Error?error.name:typeof error,message:error instanceof Error?error.message:String(error),causeCode:findErrorCode(error)};}
// prettier-ignore
function findErrorCode(error) {let current=error;while(current&&typeof current==='object'){if(typeof current.code==='string')return current.code;current=current.cause;}return null;}
// prettier-ignore
function runSystem(command,args) {const result=spawnSync(command,args,{encoding:'utf8',shell:false,windowsHide:true});if(result.error||result.status!==0)fail('HOST_MECHANISM_FAILED',`${command} failed: ${result.error?.message??result.stderr.trim()}`);return {exitCode:result.status,stdout:result.stdout};}
// prettier-ignore
function restoreWindowsReadAcl(target,account) {const removed=spawnSync('icacls.exe',[target,'/remove:d',account],{encoding:'utf8',shell:false,windowsHide:true});if(!removed.error&&removed.status===0)return {mechanism:'windows-icacls-remove-deny',exitCode:0};const reset=spawnSync('icacls.exe',[target,'/reset'],{encoding:'utf8',shell:false,windowsHide:true});if(reset.error||reset.status!==0)fail('ACL_RESTORATION_FAILED',reset.error?.message??reset.stderr.trim());return {mechanism:'windows-icacls-reset',exitCode:0};}
// prettier-ignore
function resolveQuotaRoot(value) {const resolved=fs.realpathSync.native(path.resolve(value));if(!fs.statSync(resolved).isDirectory())fail('ENOSPC_ROOT_INVALID','CAMP01_LIVE_ENOSPC_ROOT is not a directory');return resolved;}
// prettier-ignore
function canWrite(target) {try{fs.accessSync(target,fs.constants.W_OK);return true;}catch{return false;}}
// prettier-ignore
function pathExists(target) {try{fs.lstatSync(target);return true;}catch(error){if(error?.code==='ENOENT')return false;throw error;}}
// prettier-ignore
function needEnvironment(key) {const value=process.env[key];if(!value)fail('WORKER_INPUT_MISSING',`${key} is unavailable`);return value;}
function fail(code, message) {
  throw new Proof5D6ProbeError(code, message);
}

if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  const worker =
    process.argv[2] === '--signal-worker'
      ? runSignalWorker
      : process.argv[2] === '--race-worker'
        ? runRaceWorker
        : null;
  if (!worker) fail('WORKER_ARGUMENT_INVALID', 'unknown worker mode');
  worker().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

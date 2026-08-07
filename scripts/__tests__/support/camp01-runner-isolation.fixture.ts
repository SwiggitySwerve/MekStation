import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const isolationUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-runner-isolation.mjs'),
).href;
const writerUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.mjs'),
).href;
const contractUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.contract.mjs'),
).href;
const harness = `
import fs from 'node:fs';
import path from 'node:path';
import * as isolation from ${JSON.stringify(isolationUrl)};
import { issuedCommandIdentity } from ${JSON.stringify(writerUrl)};
import { WAVE_CONTRACTS } from ${JSON.stringify(contractUrl)};
const request=JSON.parse(fs.readFileSync(0,'utf8'));
const runId='camp01-'+'7'.repeat(32), row=WAVE_CONTRACTS[request.wave??'camp-01e'], index=request.index??1;
const runRoot=path.join(request.root,...row.runRootTemplate.replace('<sha>','a'.repeat(40)).split('/'));
const artifactDir=path.join(request.rogueParent?path.join(request.root,'rogue'):runRoot,request.stageBasename??('.stage-'+runId));
const identity=issuedCommandIdentity(row,index,runId), runtimeRoot=path.join(artifactDir,'.runtime-'+identity.executionId);
const sentinel=path.join(runRoot,'playtest-sentinel'), writerSibling=path.join(artifactDir,'writer-sibling.json');
fs.mkdirSync(artifactDir,{recursive:true});
fs.mkdirSync(runRoot,{recursive:true});
fs.writeFileSync(sentinel,'preserve');
fs.writeFileSync(writerSibling,'preserve');
const environment={CAMP01_RUN_ID:runId,CAMP01_ARTIFACT_DIR:artifactDir,CAMP01_INVOCATION_ID:identity.invocationId,CAMP01_EXECUTION_ID:identity.executionId,...request.environment};
if(request.omit) delete environment[request.omit];
if(request.precreate) fs.mkdirSync(runtimeRoot,{recursive:true});
const calls=[], events=[];
let divert=false, adopted=false, removeFailures=request.rollbackFailure||request.cleanupFailure?1:0;
const fault=(message,code)=>Object.assign(new Error(message),{code});
const io={
  lstatSync(value){
    if(request.inspectionFailure&&value===runtimeRoot)throw fault('inspection denied','EACCES');
    if(request.creationFailure==='reparse'&&value===path.join(runtimeRoot,'browser-temp'))return {isSymbolicLink:()=>true};
    return fs.lstatSync(value);
  },
  statSync:(value)=>fs.statSync(value),
  mkdirSync(value){
    events.push('mkdir:'+path.basename(value));
    if(request.creationFailure==='directory'&&path.basename(value)==='browser-storage')throw fault('mkdir denied','EACCES');
    fs.mkdirSync(value);
  },
  writeFileSync(value,data,options){
    events.push('write:'+path.basename(value));
    if(request.creationFailure==='storage-state'&&value.endsWith(path.join('browser-storage','state.json')))throw fault('storage denied','EIO');
    fs.writeFileSync(value,data,options);
  },
  readFileSync:(value,encoding)=>fs.readFileSync(value,encoding),
};
const dependencies={
  repoRoot:request.root,
  fs:io,
  randomBytes(size){
    events.push('entropy');
    if(request.entropy==='non-buffer')return 'not-a-buffer';
    if(request.entropy==='wrong-length')return Buffer.alloc(size-1,0x5a);
    return Buffer.alloc(size,0x5a);
  },
  realpath(value){
    if(divert&&path.basename(value)==='browser-profile')return request.outside;
    if(request.creationFailure==='canonical'&&value===path.join(runtimeRoot,'browser-temp'))throw fault('canonical denied','EIO');
    return fs.realpathSync.native(value);
  },
  remove(value,options){
    calls.push('cleanup:'+path.basename(value));
    if(removeFailures>0){removeFailures-=1;throw fault('remove denied','EACCES');}
    fs.rmSync(value,options);
  },
};
try { let value;
  if(request.action==='absent') value=isolation.createCamp01RunnerIsolation({PATH:'legacy',...request.environment});
  else { const runner=isolation.createCamp01RunnerIsolation(environment,dependencies);
    if(request.action==='outside')divert=true;
    if(request.action==='finish'){
      if(request.normalizer==='missing')await runner.finish(null);
      else if(request.normalizer==='reject')await runner.finish(async()=>{calls.push('normalize');throw new Error('normalize rejected');});
      else await runner.finish(()=>{calls.push('normalize');fs.writeFileSync(path.join(runner.paths.playwrightResults,'normalized'),'done');});
    }else if(request.action==='adopt'){
      const nestedEnvironment={...environment,...runner.environment};
      if(request.adoptionDrift==='lease')nestedEnvironment.CAMP01_RUNTIME_LEASE='invalid';
      if(request.adoptionDrift==='routing')nestedEnvironment.TMP=request.outside;
      if(request.adoptionDrift==='storage-state')fs.writeFileSync(runner.paths.browserStorageState,'drift');
      if(request.adoptionDrift==='lease-file')fs.writeFileSync(path.join(runner.runtimeRoot,'.isolation-lease'),'drift');
      const nested=isolation.createCamp01RunnerIsolation(nestedEnvironment,dependencies); adopted=true;
      await nested.finish(()=>calls.push('nested-normalize'));calls.push('nested-runtime:'+fs.existsSync(runner.runtimeRoot));runner.cleanup();
    }else if(request.action==='cleanup-retry'){
      let firstError=null;
      try{runner.cleanup();}catch(error){firstError={name:error.name,error:error.message};}
      const failureState={firstError,runtimeExists:fs.existsSync(runner.runtimeRoot),writerSiblingExists:fs.existsSync(writerSibling),calls:[...calls]};
      runner.cleanup();
      value={active:runner.active,runtimeRoot:runner.runtimeRoot,paths:runner.paths,createdPaths:runner.createdPaths,environment:runner.environment,calls,events,runtimeExists:fs.existsSync(runner.runtimeRoot),sentinelExists:fs.existsSync(sentinel),writerSiblingExists:fs.existsSync(writerSibling),failureState};
    }else if(request.action==='cleanup'||request.action==='outside')runner.cleanup();
    value??={active:runner.active,runtimeRoot:runner.runtimeRoot,paths:runner.paths,createdPaths:runner.createdPaths,environment:runner.environment,calls,events,runtimeExists:runner.runtimeRoot?fs.existsSync(runner.runtimeRoot):false,sentinelExists:fs.existsSync(sentinel),writerSiblingExists:fs.existsSync(writerSibling)}; }
  process.stdout.write(JSON.stringify({ok:true,value}));
} catch(error) { process.stdout.write(JSON.stringify({ok:false,name:error.name,error:error.message,calls,events,adopted,runtimeExists:fs.existsSync(runtimeRoot),sentinelExists:fs.existsSync(sentinel),writerSiblingExists:fs.existsSync(writerSibling),outsideExists:request.outside?fs.existsSync(request.outside):null})); process.exitCode=1; }`;

type Result = {
  readonly ok: boolean;
  readonly name?: string;
  readonly error?: string;
  readonly calls?: readonly string[];
  readonly events?: readonly string[];
  readonly adopted?: boolean;
  readonly runtimeExists?: boolean;
  readonly sentinelExists?: boolean;
  readonly writerSiblingExists?: boolean;
  readonly outsideExists?: boolean | null;
  readonly value?: {
    readonly active?: boolean;
    readonly runtimeRoot?: string | null;
    readonly paths?: Record<string, string>;
    readonly createdPaths?: readonly string[];
    readonly environment?: Record<string, string>;
    readonly calls?: readonly string[];
    readonly events?: readonly string[];
    readonly runtimeExists?: boolean;
    readonly sentinelExists?: boolean;
    readonly writerSiblingExists?: boolean;
    readonly failureState?: {
      readonly firstError?: { readonly name?: string; readonly error?: string };
      readonly runtimeExists?: boolean;
      readonly writerSiblingExists?: boolean;
      readonly calls?: readonly string[];
    };
  } & Record<string, unknown>;
};

export function invoke(request: Record<string, unknown> = {}): Result {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof4b-'));
  const outside = fs.mkdtempSync(
    path.join(os.tmpdir(), 'camp-proof4b-outside-'),
  );
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    { input: JSON.stringify({ root, outside, ...request }), encoding: 'utf8' },
  );
  const value = result.stdout
    ? (JSON.parse(result.stdout) as Result)
    : { ok: false, error: result.stderr };
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
  return value;
}

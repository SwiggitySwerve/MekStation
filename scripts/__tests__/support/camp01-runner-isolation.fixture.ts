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
import fs from 'node:fs'; import path from 'node:path';
import * as isolation from ${JSON.stringify(isolationUrl)}; import { issuedCommandIdentity } from ${JSON.stringify(writerUrl)}; import { WAVE_CONTRACTS } from ${JSON.stringify(contractUrl)};
const request=JSON.parse(fs.readFileSync(0,'utf8')), runId='camp01-'+'7'.repeat(32), row=WAVE_CONTRACTS[request.wave??'camp-01e'], index=request.index??1, runRoot=path.join(request.root,...row.runRootTemplate.replace('<sha>','a'.repeat(40)).split('/')), artifactDir=path.join(request.rogueParent?path.join(request.root,'rogue'):runRoot,request.stageBasename??('.stage-'+runId)), identity=issuedCommandIdentity(row,index,runId), sentinel=path.join(runRoot,'playtest-sentinel');
fs.mkdirSync(artifactDir,{recursive:true}); fs.mkdirSync(runRoot,{recursive:true}); fs.writeFileSync(sentinel,'preserve'); const environment={CAMP01_RUN_ID:runId,CAMP01_ARTIFACT_DIR:artifactDir,CAMP01_INVOCATION_ID:identity.invocationId,CAMP01_EXECUTION_ID:identity.executionId,...request.environment};
if(request.omit) delete environment[request.omit]; if(request.precreate) fs.mkdirSync(path.join(artifactDir,'.runtime-'+environment.CAMP01_EXECUTION_ID),{recursive:true});
const calls=[], dependencies=request.action==='outside'?{repoRoot:request.root,realpath:(value)=>request.divert&&value.endsWith('browser-profile')?request.outside:fs.realpathSync.native(value),remove:(value,options)=>{calls.push('cleanup:'+path.basename(value));fs.rmSync(value,options);}}:{repoRoot:request.root,remove:(value,options)=>{calls.push('cleanup:'+path.basename(value));fs.rmSync(value,options);}};
try { let value;
  if(request.action==='absent') value=isolation.createCamp01RunnerIsolation({PATH:'legacy',...request.environment});
  else { const runner=isolation.createCamp01RunnerIsolation(environment,dependencies); if(request.action==='outside')request.divert=true; if(request.action==='finish'){await runner.finish(()=>{calls.push('normalize');fs.writeFileSync(path.join(runner.paths.playwrightResults,'normalized'),'done');});}else if(request.action==='adopt'){const nested=isolation.createCamp01RunnerIsolation({...environment,...runner.environment},dependencies);await nested.finish(()=>calls.push('nested-normalize'));calls.push('nested-runtime:'+fs.existsSync(runner.runtimeRoot));runner.cleanup();}else if(request.action==='cleanup'||request.action==='outside')runner.cleanup(); value={active:runner.active,runtimeRoot:runner.runtimeRoot,paths:runner.paths,createdPaths:runner.createdPaths,environment:runner.environment,calls,runtimeExists:runner.runtimeRoot?fs.existsSync(runner.runtimeRoot):false,sentinelExists:fs.existsSync(sentinel)}; }
  process.stdout.write(JSON.stringify({ok:true,value}));
} catch(error) { process.stdout.write(JSON.stringify({ok:false,name:error.name,error:error.message,calls,runtimeExists:fs.existsSync(path.join(artifactDir,'.runtime-'+environment.CAMP01_EXECUTION_ID)),outsideExists:request.outside?fs.existsSync(request.outside):null})); process.exitCode=1; }`;

type Result = {
  readonly ok: boolean;
  readonly name?: string;
  readonly error?: string;
  readonly calls?: readonly string[];
  readonly runtimeExists?: boolean;
  readonly outsideExists?: boolean | null;
  readonly value?: {
    readonly active?: boolean;
    readonly runtimeRoot?: string | null;
    readonly paths?: Record<string, string>;
    readonly createdPaths?: readonly string[];
    readonly environment?: Record<string, string>;
    readonly calls?: readonly string[];
    readonly runtimeExists?: boolean;
    readonly sentinelExists?: boolean;
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

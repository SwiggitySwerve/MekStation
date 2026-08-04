import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const normalizerUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-playwright-normalizer.mjs'),
).href;
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
import os from 'node:os';
import path from 'node:path';
import { prepareCamp01PlaywrightCollection } from ${JSON.stringify(normalizerUrl)};
import { createCamp01RunnerIsolation } from ${JSON.stringify(isolationUrl)};
import { issuedCommandIdentity } from ${JSON.stringify(writerUrl)};
import { WAVE_CONTRACTS } from ${JSON.stringify(contractUrl)};
const request=JSON.parse(fs.readFileSync(0,'utf8'));
const root=fs.mkdtempSync(path.join(os.tmpdir(),'camp-proof4c1-')), sha='a'.repeat(40), runId='camp01-'+'1'.repeat(32), row=WAVE_CONTRACTS['proof-02-reproduction'], issued=issuedCommandIdentity(row,0,runId), artifactDir=path.join(root,'.sisyphus','evidence','playtest','proof02-reproduction-'+sha,'.stage-'+runId);
const environment={CAMP01_RUN_ID:runId,CAMP01_ARTIFACT_DIR:artifactDir,CAMP01_INVOCATION_ID:issued.invocationId,CAMP01_EXECUTION_ID:issued.executionId};
const result=(status,retry)=>({status,retry,duration:1,startTime:'2026-08-04T00:00:00.000Z',errors:[],stdout:[],stderr:[],attachments:[]});
const spec=(file,title,results,status='expected')=>({title,ok:status!=='unexpected',tags:[],tests:[{timeout:30000,annotations:[],expectedStatus:'passed',projectId:'chromium',projectName:'chromium',results,status}],id:title,file,line:1,column:1});
const fileSuite=(file,title,specs)=>({title:file,file,column:0,line:0,specs:[],suites:[{title,file,line:1,column:1,specs}]});
let owner;
try {
  if(request.action==='inactive'){const collection=prepareCamp01PlaywrightCollection({},createCamp01RunnerIsolation({}));process.stdout.write(JSON.stringify({ok:true,value:{active:collection.active,environment:collection.environment}}));}
  else {
    fs.mkdirSync(artifactDir,{recursive:true}); owner=createCamp01RunnerIsolation(environment,{repoRoot:root,randomBytes:()=>Buffer.from('2'.repeat(64),'hex')});
    const staleDir=path.join(owner.paths.playwrightResults,'camp01-json'); if(request.mutation==='stale')fs.mkdirSync(staleDir);
    const collection=prepareCamp01PlaywrightCollection(environment,owner,{repoRoot:root}), rawDir=collection.environment.PLAYWRIGHT_JSON_OUTPUT_DIR, rawPath=path.join(rawDir,collection.environment.PLAYWRIGHT_JSON_OUTPUT_NAME);
    const raw={config:{metadata:{camp01:{artifactDir,executionId:issued.executionId,invocationId:issued.invocationId,runId}},reporter:[['list'],['html'],['json']]},suites:[fileSuite('gm-campaign-ledger-control-plane.spec.ts','GM campaign ledger control plane @gm-ledger',[spec('gm-campaign-ledger-control-plane.spec.ts','guest direct route shows only player-safe ledger projection',[result('failed',0)],'unexpected'),spec('gm-campaign-ledger-control-plane.spec.ts','previews and approves an accumulated time cascade',[result('timedOut',0)],'unexpected')]),fileSuite('campaign-customizer-handoff.spec.ts','campaign customizer handoff @campaign @customizer',[spec('campaign-customizer-handoff.spec.ts','routes Mech Bay refit into campaign customizer and saves a refit order',[result('passed',0)])]),fileSuite('campaign-starmap-logistics.spec.ts','campaign starmap logistics',[spec('campaign-starmap-logistics.spec.ts','previews, approves, and reloads campaign travel consequences',[result('failed',0),result('passed',1)],'flaky')])],errors:[],stats:{startTime:'2026-08-04T00:00:00.000Z'}};
    if(request.mutation==='partial')raw.suites=[raw.suites[2]];
    if(request.mutation==='cross-run')raw.config.metadata.camp01.runId='camp01-'+'9'.repeat(32);
    if(request.mutation==='identity')raw.config.metadata.camp01.invocationId='proof-02-command-other';
    if(request.mutation==='duplicate')raw.suites[2].suites[0].specs.push(raw.suites[2].suites[0].specs[0]);
    if(request.mutation==='malformed')fs.writeFileSync(rawPath,'{');
    else if(request.mutation!=='missing'){fs.writeFileSync(rawPath,JSON.stringify(raw));if(request.mutation==='multiple')fs.writeFileSync(path.join(rawDir,'extra.json'),JSON.stringify(raw));}
    if(request.mutation==='collision')fs.writeFileSync(path.join(artifactDir,row.reporterContracts[0].normalizedPath),'occupied');
    let rawDuringNormalize=false; const value=await owner.finish(()=>{const normalized=collection.normalize();rawDuringNormalize=fs.existsSync(rawPath);return normalized;}), normalizedBytes=fs.readFileSync(path.join(artifactDir,row.reporterContracts[0].normalizedPath),'utf8'); process.stdout.write(JSON.stringify({ok:true,value,normalizedBytes,rawDuringNormalize,rawExists:fs.existsSync(rawPath),runtimeExists:fs.existsSync(owner.runtimeRoot)}));
  }
} catch(error) { process.stdout.write(JSON.stringify({ok:false,name:error.name,error:error.message,runtimeExists:owner?fs.existsSync(owner.runtimeRoot):undefined})); process.exitCode=1; }
finally { owner?.cleanup(); fs.rmSync(root,{recursive:true,force:true}); }
`;

// prettier-ignore
type Observation = { id: string; status: 'passed' | 'failed' | 'missing'; failureFingerprint: string | null; knownFailureCode: string | null };
// prettier-ignore
type Result = { ok: boolean; name?: string; error?: string; value?: { observations?: Observation[]; sha?: string; active?: boolean; environment?: Record<string, string> }; normalizedBytes?: string; rawDuringNormalize?: boolean; rawExists?: boolean; runtimeExists?: boolean };
// prettier-ignore
function invoke(request: Record<string, unknown>): Result { const result=spawnSync(process.execPath,['--input-type=module','--eval',harness],{input:JSON.stringify(request),encoding:'utf8'}); return JSON.parse(result.stdout) as Result; }

describe('CAMP-01 Playwright JSON normalization', () => {
  it('publishes the complete sorted inventory with deterministic retry and missing rules', () => {
    const result = invoke({ action: 'normalize' });
    expect(result.ok).toBe(true);
    expect(result.rawDuringNormalize).toBe(true);
    expect(result.rawExists).toBe(false);
    expect(result.runtimeExists).toBe(false);
    expect(result.normalizedBytes).toBe(`${JSON.stringify(result.value)}\n`);
    expect(result.value?.sha).toBe('a'.repeat(40));
    const observations = result.value?.observations ?? [];
    expect(observations.map(({ id }) => id)).toEqual(
      observations.map(({ id }) => id).sort(),
    );
    expect(observations).toHaveLength(5);
    expect(observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringContaining(
            'previews, approves, and reloads campaign travel consequences',
          ),
          status: 'passed',
          failureFingerprint: null,
          knownFailureCode: 'development-mime-diagnostic',
        }),
        expect.objectContaining({
          id: expect.stringContaining(
            'guest direct route shows only player-safe ledger projection',
          ),
          status: 'failed',
          knownFailureCode: 'guest-badge-timing',
        }),
        expect.objectContaining({
          id: expect.stringContaining(
            'saves and reloads a player-safe merchant reversal',
          ),
          status: 'missing',
          knownFailureCode: 'save-conflict-timing',
        }),
        expect.objectContaining({
          id: expect.stringContaining(
            'previews and approves an accumulated time cascade',
          ),
          status: 'failed',
          knownFailureCode: null,
        }),
      ]),
    );
    const guest = observations.find(
      ({ knownFailureCode }) => knownFailureCode === 'guest-badge-timing',
    );
    expect(guest?.failureFingerprint).toBe(
      `sha256:${createHash('sha256')
        .update(
          JSON.stringify({
            id: guest?.id,
            status: 'failed',
            knownFailureCode: 'guest-badge-timing',
          }),
        )
        .digest('hex')}`,
    );
  });

  // prettier-ignore
  it.each([['missing','raw report missing'],['multiple','multiple raw reports'],['malformed','raw report malformed'],['stale','stale raw report'],['cross-run','raw report identity mismatch'],['identity','raw report identity mismatch'],['duplicate','duplicate observed test'],['partial','raw report source mismatch'],['collision','normalized report publication failed']])('fails closed with the typed error for %s input', (mutation, message) => {
    expect(invoke({action:'normalize',mutation})).toMatchObject({ok:false,name:'Camp01PlaywrightNormalizerError',error:expect.stringContaining(message)});
  });

  it('is inert without a validated CAMP tuple', () => {
    expect(invoke({ action: 'inactive' })).toEqual({
      ok: true,
      value: { active: false, environment: {} },
    });
  });
});

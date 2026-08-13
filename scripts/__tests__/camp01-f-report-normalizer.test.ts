import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = (relativePath: string) =>
  pathToFileURL(path.resolve(relativePath)).href;
const urls = {
  contract: moduleUrl('scripts/qc/camp01-authority-receipt.contract.mjs'),
  fReport: moduleUrl('scripts/qc/camp01-f-report-normalizer.mjs'),
  isolation: moduleUrl('scripts/qc/camp01-runner-isolation.mjs'),
  playwright: moduleUrl('scripts/qc/camp01-playwright-normalizer.mjs'),
  schemas: moduleUrl('scripts/qc/camp01-authority-receipt.schemas.mjs'),
  writer: moduleUrl('scripts/qc/camp01-authority-receipt.mjs'),
};

const harness = `
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WAVE_CONTRACTS } from ${JSON.stringify(urls.contract)};
import { prepareCamp01FReport } from ${JSON.stringify(urls.fReport)};
import { createCamp01RunnerIsolation } from ${JSON.stringify(urls.isolation)};
import { prepareCamp01PlaywrightCollection } from ${JSON.stringify(urls.playwright)};
import { deriveEntityDigest, validateArtifact } from ${JSON.stringify(urls.schemas)};
import { issuedCommandIdentity } from ${JSON.stringify(urls.writer)};
const request=JSON.parse(fs.readFileSync(0,'utf8')), root=fs.mkdtempSync(path.join(os.tmpdir(),'camp-proof4c2-')), sha='a'.repeat(40), runId='camp01-'+'1'.repeat(32), row=WAVE_CONTRACTS['camp-01f'], reporter=row.reporterContracts[0], issued=issuedCommandIdentity(row,1,runId), artifactDir=path.join(root,'.sisyphus','evidence','playtest','camp01f-persistence-'+sha,'.stage-'+runId), F_TITLE='creates a saved custom unit campaign through accepted server persistence', SIBLING_TITLE='routes Mech Bay refit into campaign customizer and saves a refit order';
fs.mkdirSync(artifactDir,{recursive:true});
const environment={CAMP01_RUN_ID:runId,CAMP01_ARTIFACT_DIR:artifactDir,CAMP01_INVOCATION_ID:issued.invocationId,CAMP01_EXECUTION_ID:issued.executionId};
function facts(mutation){const campaign=deriveEntityDigest('campaign','campaign-1'), roster=deriveEntityDigest('roster-instance','roster-1'), unitRef=deriveEntityDigest('unit-ref','unit-1'), value={requestMethod:'PUT',acceptedResult:'saved',acceptedCampaignId:campaign,persistedCampaignId:campaign,acceptedRosterInstanceId:roster,persistedRosterInstanceId:roster,acceptedUnitRef:unitRef,persistedUnitRef:unitRef,acceptedUnitSource:'custom',persistedUnitSource:'custom',acceptedRootForceContainsInstance:true,persistedRootForceContainsInstance:true,acceptedConstructionPayloadAbsent:true,persistedConstructionPayloadAbsent:true,successSuppressedOnFailure:true,retryCampaignIdMatched:true,conflictRetryCampaignIdMatched:true,conflictOverwritePrevented:true}; if(mutation==='identity')value.persistedCampaignId=deriveEntityDigest('campaign','other'); if(mutation==='method')value.requestMethod='POST'; if(mutation==='source')value.acceptedUnitSource='stock'; if(mutation==='boolean')value.conflictOverwritePrevented=false; if(mutation==='extra-key')value.extra=true; if(mutation==='missing-key')delete value.conflictOverwritePrevented; return value;}
function attachment(payload,mutation){const entry={name:reporter.reportSchema,contentType:'application/json',body:Buffer.from(JSON.stringify(payload)).toString('base64')}; if(mutation==='path-drop'){entry.path=path.join(root,'caller.json'); delete entry.body;} if(mutation==='path-and-body')entry.path=path.join(root,'caller.json'); if(mutation==='content-type')entry.contentType='text/plain'; if(mutation==='malformed-body')entry.body='not-json'; if(mutation==='empty-body')entry.body=''; return entry;}
function spec(title,status,attachments){return {title,ok:status==='passed',tags:[],tests:[{timeout:30000,annotations:[],expectedStatus:'passed',projectId:'chromium',projectName:'chromium',results:status==='missing'?[]:[{status:status==='failed'?'failed':'passed',retry:0,duration:1,startTime:'2026-08-13T00:00:00.000Z',errors:[],stdout:[],stderr:[],attachments:attachments??[]}],status:status==='failed'?'unexpected':'expected'}],id:title,file:'campaign-customizer-handoff.spec.ts',line:1,column:1};}
function rawFor(mutation){const payload=facts(mutation), primary=attachment(payload,mutation), extras=mutation==='extra-attachment'?[primary,{name:'screenshot',contentType:'image/png',body:'aa'}]:mutation==='duplicate-attachment'?[primary,attachment(payload)]: [primary], fStatus=mutation==='failed'?'failed':'passed', specs=mutation==='missing'?[spec(SIBLING_TITLE,'passed',[])]:[spec(F_TITLE,fStatus,extras),spec(SIBLING_TITLE,'passed',[])]; return {config:{metadata:{camp01:{artifactDir,executionId:issued.executionId,invocationId:issued.invocationId,runId}},reporter:[['list'],['json']]},suites:[{title:'campaign-customizer-handoff.spec.ts',file:'campaign-customizer-handoff.spec.ts',column:0,line:0,specs:[],suites:[{title:'campaign customizer handoff @campaign @customizer',file:'campaign-customizer-handoff.spec.ts',line:1,column:1,specs}]}],errors:[],stats:{startTime:'2026-08-13T00:00:00.000Z'}};}
function listFiles(directory,prefix=''){return fs.readdirSync(directory,{withFileTypes:true}).flatMap((entry)=>entry.isDirectory()?listFiles(path.join(directory,entry.name),prefix+entry.name+'/'):[prefix+entry.name]).sort();}
const fault=(message)=>Object.assign(new Error(message),{code:'EACCES'});
async function normalizePlaywright(mutation){const owner=createCamp01RunnerIsolation(environment,{repoRoot:root,randomBytes:()=>Buffer.from('2'.repeat(64),'hex')}); try{const collection=prepareCamp01PlaywrightCollection(environment,owner,{repoRoot:root}), rawPath=path.join(collection.environment.PLAYWRIGHT_JSON_OUTPUT_DIR,collection.environment.PLAYWRIGHT_JSON_OUTPUT_NAME); fs.writeFileSync(rawPath,JSON.stringify(rawFor(mutation))); if(mutation==='collision'){fs.mkdirSync(path.join(artifactDir,'reports'),{recursive:true}); fs.writeFileSync(path.join(artifactDir,reporter.normalizedPath),'occupied');} const value=await owner.finish(collection.normalize); return {value,collectionEnvironment:collection.environment,rawDuringNormalize:true,rawExists:fs.existsSync(rawPath),runtimeExists:fs.existsSync(owner.runtimeRoot),normalizedBytes:fs.readFileSync(path.join(artifactDir,reporter.normalizedPath),'utf8')};} finally{owner.cleanup();}}
async function normalizeConfinement(mutation){const owner=createCamp01RunnerIsolation(environment,{repoRoot:root,randomBytes:()=>Buffer.from('2'.repeat(64),'hex')}), reportDirectory=path.join(artifactDir,'reports'), target=path.join(artifactDir,...reporter.normalizedPath.split('/')), outside=path.join(root,'outside-reports'); fs.mkdirSync(outside); if(mutation==='reports-file')fs.writeFileSync(reportDirectory,'occupied'); if(mutation==='reports-symlink')fs.symlinkSync(outside,reportDirectory,'dir'); if(['reports-escape','report-realpath-fault'].includes(mutation))fs.mkdirSync(reportDirectory); const io={...fs}; if(mutation==='lstat-fault')io.lstatSync=(value,...args)=>path.resolve(value)===reportDirectory?(()=>{throw fault('reports lstat fault');})():fs.lstatSync(value,...args); if(mutation==='mkdir-fault')io.mkdirSync=(value,...args)=>path.resolve(value)===reportDirectory?(()=>{throw fault('reports mkdir fault');})():fs.mkdirSync(value,...args); if(mutation==='write-fault')io.writeFileSync=(value,...args)=>path.resolve(value)===target?(()=>{throw fault('report write fault');})():fs.writeFileSync(value,...args); const realpath=(value)=>{const resolved=path.resolve(value); if(mutation==='artifact-realpath-fault'&&resolved===artifactDir)throw fault('artifact realpath fault'); if(mutation==='report-realpath-fault'&&resolved===reportDirectory)throw fault('reports realpath fault'); if(mutation==='reports-escape'&&resolved===reportDirectory)return outside; return fs.realpathSync.native(value);}; const report=prepareCamp01FReport({environment,isolation:owner,producerId:reporter.producerId,dependencies:{fs:io,realpath}}), observed=new Map([[reporter.requiredTestIds[0],{id:reporter.requiredTestIds[0],status:'passed',attachments:[attachment(facts())]}]]); try{return report.normalize(observed);} finally{owner.cleanup();}}
function confinementState(){const target=path.join(artifactDir,...reporter.normalizedPath.split('/')), outside=path.join(root,'outside-reports'), normalizedExists=fs.existsSync(target); return {normalizedExists,normalizedBytes:normalizedExists?fs.readFileSync(target,'utf8'):null,outsideFiles:fs.existsSync(outside)?listFiles(outside):[]};}
try {
  let value;
  if(request.action==='publish'){const result=await normalizePlaywright(request.mutation); validateArtifact(result.value,{runId,registryContext:{evidence:[{id:issued.executionId,sourceKind:'execution',sourceKey:issued.invocationId,runId,wave:'camp-01f',label:null}]}}); value=result;}
  else if(request.action==='playwright')value=await normalizePlaywright(request.mutation);
  else if(request.action==='confinement')value=await normalizeConfinement(request.mutation);
  else if(request.action==='inactive'){const isolation=createCamp01RunnerIsolation({}), collection=prepareCamp01PlaywrightCollection({CAMP01_INVOCATION_ID:issued.invocationId},isolation); value={active:collection.active,environment:collection.environment};}
  process.stdout.write(JSON.stringify({ok:true,value}));
} catch(error){process.stdout.write(JSON.stringify({ok:false,name:error.name,error:error.message,...confinementState()})); process.exitCode=1;}
finally{fs.rmSync(root,{recursive:true,force:true});}
`;

// prettier-ignore
type Observation = { id: string; status: 'passed' | 'failed' | 'missing'; failureFingerprint: string | null };
// prettier-ignore
type Report = { schema: string; parentRunId: string; executionId: string; invocationId: string; producerId: string; reporterId: string; sourceIds: string[]; complete: boolean; observations: Observation[]; requestMethod: string; acceptedResult: string; acceptedCampaignId: string; persistedCampaignId: string; acceptedUnitSource: string; persistedUnitSource: string };
// prettier-ignore
type PublishValue = { value: Report; collectionEnvironment: Record<string, string>; rawExists: boolean; runtimeExists: boolean; normalizedBytes: string };
// prettier-ignore
type HarnessResult = { ok: boolean; name?: string; error?: string; normalizedExists?: boolean; normalizedBytes?: string | null; outsideFiles?: string[]; value?: PublishValue | Report | { active: boolean; environment: Record<string, string> } };
// prettier-ignore
function invoke(request: Record<string, unknown>): HarnessResult { const result=spawnSync(process.execPath,['--input-type=module','--eval',harness],{input:JSON.stringify(request),encoding:'utf8'}); return JSON.parse(result.stdout) as HarnessResult; }

describe('CAMP-01F persistence authority reporter', () => {
  it('publishes campaign-persistence-authority.json via finish(normalize) for camp-01f-persistence-browser', () => {
    const result = invoke({ action: 'publish' });
    expect(result.ok).toBe(true);
    const value = result.value as PublishValue;
    expect(value.rawExists).toBe(false);
    expect(value.runtimeExists).toBe(false);
    expect(value.collectionEnvironment).toEqual({
      PLAYWRIGHT_JSON_OUTPUT_DIR: expect.stringMatching(/camp01-json$/),
      PLAYWRIGHT_JSON_OUTPUT_NAME: 'playwright-report.json',
    });
    expect(value.normalizedBytes).toBe(`${JSON.stringify(value.value)}\n`);
    expect(value.value).toMatchObject({
      schema: 'camp01-campaign-persistence-authority/v1',
      invocationId: 'camp-01f-persistence-browser',
      producerId: 'scripts/playwright/run-playwright.mjs',
      reporterId: 'camp01-campaign-persistence-reporter/v1',
      sourceIds: ['e2e/campaign-customizer-handoff.spec.ts'],
      complete: true,
      requestMethod: 'PUT',
      acceptedResult: 'saved',
      acceptedUnitSource: 'custom',
      persistedUnitSource: 'custom',
      acceptedRootForceContainsInstance: true,
      conflictOverwritePrevented: true,
    });
    expect(value.value.observations).toEqual([
      {
        id: 'e2e/campaign-customizer-handoff.spec.ts::campaign customizer handoff @campaign @customizer::creates a saved custom unit campaign through accepted server persistence',
        status: 'passed',
        failureFingerprint: null,
      },
    ]);
    expect(value.value.acceptedCampaignId).toBe(
      value.value.persistedCampaignId,
    );
    expect(value.value.acceptedCampaignId).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  // prettier-ignore
  it.each([['missing','authority observation missing'],['failed','authority observation drift'],['path-drop','caller attachment drop'],['path-and-body','caller attachment drop'],['extra-attachment','persistence attachment drift'],['duplicate-attachment','duplicate persistence attachment'],['content-type','persistence attachment malformed'],['malformed-body','persistence attachment malformed'],['empty-body','persistence attachment malformed'],['extra-key','persistence facts drift'],['missing-key','persistence facts drift'],['identity','persistence identity drift'],['method','persistence authority drift'],['source','persistence authority drift'],['boolean','persistence authority drift'],['collision','normalized report publication failed']])('fails closed for Playwright mutation %s', (mutation, message) => {
    const result=invoke({action:'playwright',mutation}); expect(result).toMatchObject({ok:false,name:'Camp01FReportNormalizerError',error:expect.stringContaining(message)}); if(mutation==='collision')expect(result.normalizedBytes).toBe('occupied'); else expect(result.normalizedExists).toBe(false);
  });

  // prettier-ignore
  it.each([['reports-file','normalized report directory invalid'],['reports-escape','normalized report directory escaped writer directory'],['lstat-fault','normalized report directory inspection failed'],['mkdir-fault','normalized report directory creation failed'],['artifact-realpath-fault','normalized artifact directory resolution failed'],['report-realpath-fault','normalized report directory resolution failed'],['write-fault','normalized report publication failed']])('rejects F confinement mutation %s without partial or outside publication', (mutation,message) => {
    expect(invoke({action:'confinement',mutation})).toMatchObject({ok:false,name:'Camp01FReportNormalizerError',error:expect.stringContaining(message),normalizedExists:false,outsideFiles:[]});
  });

  (process.platform === 'win32' ? it.skip : it)(
    'rejects a POSIX reports-directory symlink without writing through it',
    () => {
      expect(
        invoke({ action: 'confinement', mutation: 'reports-symlink' }),
      ).toMatchObject({
        ok: false,
        name: 'Camp01FReportNormalizerError',
        error: expect.stringContaining('normalized report directory invalid'),
        normalizedExists: false,
        outsideFiles: [],
      });
    },
  );

  it('is inert outside a validated CAMP invocation', () => {
    expect(invoke({ action: 'inactive' })).toEqual({
      ok: true,
      value: { active: false, environment: {} },
    });
  });
});

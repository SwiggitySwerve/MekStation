import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = (relativePath: string) =>
  pathToFileURL(path.resolve(relativePath)).href;
const urls = {
  contract: moduleUrl('scripts/qc/camp01-authority-receipt.contract.mjs'),
  hReport: moduleUrl('scripts/qc/camp01-h-report-normalizer.mjs'),
  isolation: moduleUrl('scripts/qc/camp01-runner-isolation.mjs'),
  playwright: moduleUrl('scripts/qc/camp01-playwright-normalizer.mjs'),
  schemas: moduleUrl('scripts/qc/camp01-authority-receipt.schemas.mjs'),
  ux: moduleUrl('scripts/qc/camp01-ux-report-normalizer.mjs'),
  writer: moduleUrl('scripts/qc/camp01-authority-receipt.mjs'),
};

const harness = `
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WAVE_CONTRACTS } from ${JSON.stringify(urls.contract)};
import { createCamp01RunnerIsolation } from ${JSON.stringify(urls.isolation)};
import { prepareCamp01PlaywrightCollection } from ${JSON.stringify(urls.playwright)};
import { H_TEST_IDS, validateArtifact } from ${JSON.stringify(urls.schemas)};
import { prepareCamp01HReport, selectOrdinaryExitNormalizer } from ${JSON.stringify(urls.hReport)};
import { prepareCamp01UxReport } from ${JSON.stringify(urls.ux)};
import { issueHIdentities, issuedCommandIdentity } from ${JSON.stringify(urls.writer)};
const request=JSON.parse(fs.readFileSync(0,'utf8')), root=fs.mkdtempSync(path.join(os.tmpdir(),'camp-proof4d-')), sha='a'.repeat(40), runId='camp01-'+'1'.repeat(32), row=WAVE_CONTRACTS['camp-01h'], artifactDir=path.join(root,'.sisyphus','evidence','playtest','camp01h-journey-'+sha,'.stage-'+runId), identities=issueHIdentities(runId);
fs.mkdirSync(artifactDir,{recursive:true});
const result=(status,retry)=>({status,retry,duration:1,startTime:'2026-08-04T00:00:00.000Z',errors:[],stdout:[],stderr:[],attachments:[]});
const spec=(title,status)=>({title,ok:status==='passed',tags:[],tests:[{timeout:30000,annotations:[],expectedStatus:'passed',projectId:'chromium',projectName:'chromium',results:status==='missing'?[]:[result(status==='failed'?'failed':'passed',0)],status:status==='failed'?'unexpected':'expected'}],id:title,file:'fixture',line:1,column:1});
function chain(parts,status){const title=parts.at(-1), nested=parts.slice(0,-1);let value={title:nested.at(-1),file:'fixture',line:1,column:1,specs:[spec(title,status)],suites:[]};for(let index=nested.length-2;index>=0;index-=1)value={title:nested[index],file:'fixture',line:1,column:1,specs:[],suites:[value]};return value;}
function rawFor(reporter,environment,mutation){const inventory=H_TEST_IDS[reporter.invocationId], observed=inventory.slice(0,-1).map((id,index)=>({id,status:index===1?'failed':'passed'}));if(mutation==='extra-observation')observed.push({id:reporter.sourceIds[0]+'::unexpected::test',status:'passed'});const suites=reporter.sourceIds.map((source)=>({title:source,file:source.slice(4),column:0,line:0,specs:[],suites:observed.filter(({id})=>id.startsWith(source+'::')).map(({id,status})=>chain(id.split('::').slice(1),status))}));return {config:{metadata:{camp01:{artifactDir,executionId:environment.CAMP01_EXECUTION_ID,invocationId:environment.CAMP01_INVOCATION_ID,runId}},reporter:[['list'],['json']]},suites,errors:[],stats:{startTime:'2026-08-04T00:00:00.000Z'}};}
function environmentFor(index,mutation){const issued=issuedCommandIdentity(row,index,runId), map=JSON.parse(JSON.stringify(identities));if(mutation==='role')delete map[row.reporterContracts[index].witnessLabel].contextId;if(mutation==='execution')map[row.reporterContracts[index].witnessLabel].executionId='ev-'+'9'.repeat(32);const environment={CAMP01_RUN_ID:runId,CAMP01_ARTIFACT_DIR:artifactDir,CAMP01_INVOCATION_ID:issued.invocationId,CAMP01_EXECUTION_ID:issued.executionId,CAMP01_H_IDENTITIES:JSON.stringify(map)};if(mutation==='missing-map')delete environment.CAMP01_H_IDENTITIES;return environment;}
function ownerFor(environment,index){return createCamp01RunnerIsolation(environment,{repoRoot:root,randomBytes:()=>Buffer.from(String(index+1).repeat(64),'hex')});}
function listFiles(directory,prefix=''){return fs.readdirSync(directory,{withFileTypes:true}).flatMap((entry)=>entry.isDirectory()?listFiles(path.join(directory,entry.name),prefix+entry.name+'/'):[prefix+entry.name]).sort();}
const fault=(message)=>Object.assign(new Error(message),{code:'EACCES'});
async function normalizePlaywright(index,mutation){const reporter=row.reporterContracts[index], environment=environmentFor(index,mutation), owner=ownerFor(environment,index);try{const collection=prepareCamp01PlaywrightCollection(environment,owner,{repoRoot:root}), rawPath=path.join(collection.environment.PLAYWRIGHT_JSON_OUTPUT_DIR,collection.environment.PLAYWRIGHT_JSON_OUTPUT_NAME);fs.writeFileSync(rawPath,JSON.stringify(rawFor(reporter,environment,mutation)));if(mutation==='collision'){fs.mkdirSync(path.join(artifactDir,'reports'),{recursive:true});fs.writeFileSync(path.join(artifactDir,reporter.normalizedPath),'occupied');}return await owner.finish(collection.normalize);}finally{owner.cleanup();}}
async function normalizeUx(mutation){const environment=environmentFor(0,mutation), owner=ownerFor(environment,0);try{const report=prepareCamp01UxReport(environment,owner), journeys=[{journey:'08-sp-campaign-deep-loop',status:'ok'},{journey:'09-coop-multiplayer-two-client',status:'failed'}];if(mutation==='duplicate-journey')journeys.push(journeys[0]);if(mutation==='extra-journey')journeys.push({journey:'unexpected',status:'ok'});return await owner.finish(()=>report.normalize({schemaVersion:1,journeys}));}finally{owner.cleanup();}}
async function normalizeConfinement(mutation){const index=1, reporter=row.reporterContracts[index], environment=environmentFor(index,mutation), owner=ownerFor(environment,index), reportDirectory=path.join(artifactDir,'reports'), target=path.join(artifactDir,...reporter.normalizedPath.split('/')), outside=path.join(root,'outside-reports');fs.mkdirSync(outside);
  if(mutation==='reports-file')fs.writeFileSync(reportDirectory,'occupied');
  if(mutation==='reports-symlink')fs.symlinkSync(outside,reportDirectory,'dir');
  if(['reports-escape','report-realpath-fault'].includes(mutation))fs.mkdirSync(reportDirectory);
  const io={...fs};
  if(mutation==='lstat-fault')io.lstatSync=(value,...args)=>path.resolve(value)===reportDirectory?(()=>{throw fault('reports lstat fault');})():fs.lstatSync(value,...args);
  if(mutation==='mkdir-fault')io.mkdirSync=(value,...args)=>path.resolve(value)===reportDirectory?(()=>{throw fault('reports mkdir fault');})():fs.mkdirSync(value,...args);
  if(mutation==='write-fault')io.writeFileSync=(value,...args)=>path.resolve(value)===target?(()=>{throw fault('report write fault');})():fs.writeFileSync(value,...args);
  const realpath=(value)=>{const resolved=path.resolve(value);if(mutation==='artifact-realpath-fault'&&resolved===artifactDir)throw fault('artifact realpath fault');if(mutation==='report-realpath-fault'&&resolved===reportDirectory)throw fault('reports realpath fault');if(mutation==='reports-escape'&&resolved===reportDirectory)return outside;return fs.realpathSync.native(value);};
  const report=prepareCamp01HReport({environment,isolation:owner,producerId:reporter.producerId,dependencies:{fs:io,realpath}}), observed=H_TEST_IDS[reporter.invocationId].slice(0,1).map((id)=>({id,status:'passed'}));try{return report.normalize(observed);}finally{owner.cleanup();}}
function confinementState(){const reporter=row.reporterContracts[1], target=path.join(artifactDir,...reporter.normalizedPath.split('/')), outside=path.join(root,'outside-reports'), normalizedExists=fs.existsSync(target);return {normalizedExists,normalizedBytes:normalizedExists?fs.readFileSync(target,'utf8'):null,outsideFiles:fs.existsSync(outside)?listFiles(outside):[]};}
try {
  let value;
  if(request.action==='all'){const reports=[await normalizeUx()];for(let index=1;index<6;index+=1)reports.push(await normalizePlaywright(index));const registryContext={evidence:Object.entries(identities).flatMap(([label,identity])=>[{id:identity.witnessId,sourceKind:'witness',runId,wave:'camp-01h',label},{id:identity.executionId,sourceKind:'execution',runId,wave:'camp-01h',label}])};reports.forEach((report,index)=>validateArtifact(report,{reporter:row.reporterContracts[index],runId,registryContext}));const files=listFiles(artifactDir), bytes=files.map((name)=>fs.readFileSync(path.join(artifactDir,...name.split('/')))), artifactPrefix=path.relative(root,artifactDir).split(path.sep).join('/')+'/';value={reports,files,digests:bytes.map((entry)=>createHash('sha256').update(entry).digest('hex')),outsideFiles:listFiles(root).filter((name)=>!name.startsWith(artifactPrefix)),runtimeFiles:files.filter((name)=>name.includes('.runtime-'))};}
  else if(request.action==='playwright')value=await normalizePlaywright(request.index,request.mutation);
  else if(request.action==='ux')value=await normalizeUx(request.mutation);
  else if(request.action==='confinement')value=await normalizeConfinement(request.mutation);
  else if(request.action==='exit-policy'){const normalizer=()=>undefined;value=[[0,null],[1,null],[2,null],[0,'SIGTERM']].map(([code,signal])=>selectOrdinaryExitNormalizer(code,signal,normalizer)===normalizer);}
  else if(request.action==='inactive'){const isolation=createCamp01RunnerIsolation({}), playwright=prepareCamp01PlaywrightCollection({},isolation), ux=prepareCamp01UxReport({},isolation);value={playwright:{active:playwright.active,environment:playwright.environment},ux:{active:ux.active}};}
  process.stdout.write(JSON.stringify({ok:true,value}));
} catch(error){process.stdout.write(JSON.stringify({ok:false,name:error.name,error:error.message,...confinementState()}));process.exitCode=1;}
finally{fs.rmSync(root,{recursive:true,force:true});}
`;

// prettier-ignore
type Observation = { id: string; status: 'passed' | 'failed' | 'missing'; failureFingerprint: string | null };
// prettier-ignore
type Report = { schema: string; parentRunId: string; witnessId: string; executionId: string; witnessLabel: string; invocationId: string; producerId: string; reporterId: string; sourceIds: string[]; complete: boolean; observations: Observation[] };
// prettier-ignore
type HarnessResult = { ok: boolean; name?: string; error?: string; normalizedExists?: boolean; normalizedBytes?: string | null; outsideFiles?: string[]; value?: Report | { reports: Report[]; files: string[]; digests: string[]; outsideFiles: string[] } };
// prettier-ignore
function invoke(request: Record<string, unknown>): HarnessResult { const result=spawnSync(process.execPath,['--input-type=module','--eval',harness],{input:JSON.stringify(request),encoding:'utf8'}); return JSON.parse(result.stdout) as HarnessResult; }

describe('CAMP-01H normalized reports', () => {
  it('publishes all six complete reports from the writer-issued identity map', () => {
    const result = invoke({ action: 'all' });
    expect(result.ok).toBe(true);
    const value = result.value as {
      reports: Report[];
      files: string[];
      digests: string[];
      outsideFiles: string[];
    };
    // prettier-ignore
    expect(value.files).toEqual(['reports/01-ux-audit-deep.json','reports/02-command-browser-quick.json','reports/03-campaign-long-browser.json','reports/04-screen-inventory.json','reports/05-layout-helpers.json','reports/06-viewport-layout-sweep.json']);
    expect(new Set(value.digests).size).toBe(6);
    expect(value.outsideFiles).toEqual([]);
    // prettier-ignore
    expect(value.reports.map(({witnessLabel})=>witnessLabel)).toEqual(['campaign-mech-bay-readiness','custom-save-reload','canonical-combat-post-battle','custom-save-reload','campaign-mech-bay-readiness','canonical-combat-post-battle']);
    expect(
      value.reports.every(
        (report) =>
          report.complete &&
          report.parentRunId === `camp01-${'1'.repeat(32)}` &&
          report.observations.length > 0,
      ),
    ).toBe(true);
    // prettier-ignore
    expect(value.reports[0].observations.map(({id,status})=>[id.split('journey: ')[1],status])).toEqual([['coop multiplayer two-client','failed'],['gm surfaces','missing'],['sp campaign deep loop','passed']]);
    const observations = value.reports.flatMap(
      ({ observations: entries }) => entries,
    );
    expect(observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'passed', failureFingerprint: null }),
        expect.objectContaining({
          status: 'failed',
          failureFingerprint: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
        }),
        expect.objectContaining({
          status: 'missing',
          failureFingerprint: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
        }),
      ]),
    );
  });

  it('normalizes exit 0 and 1 while rejecting abnormal termination', () => {
    expect(invoke({ action: 'exit-policy' })).toEqual({
      ok: true,
      value: [true, true, false, false],
    });
  });

  // prettier-ignore
  it.each([['playwright',1,'missing-map','writer identity map unavailable'],['playwright',1,'role','writer identity map drift'],['playwright',1,'execution','writer execution identity drift'],['playwright',1,'extra-observation','observed report input drift'],['playwright',1,'collision','normalized report publication failed'],['ux',0,'duplicate-journey','walkthrough journey inventory drift'],['ux',0,'extra-journey','walkthrough journey inventory drift']])('fails closed for %s reporter %i mutation %s', (action,index,mutation,message) => {
    const result=invoke({action,index,mutation}); expect(result).toMatchObject({ok:false,error:expect.stringContaining(message)}); if(mutation==='collision')expect(result).toMatchObject({name:'Camp01HReportNormalizerError',normalizedBytes:'occupied'});
  });

  // prettier-ignore
  it.each([['reports-file','normalized report directory invalid'],['reports-escape','normalized report directory escaped writer directory'],['lstat-fault','normalized report directory inspection failed'],['mkdir-fault','normalized report directory creation failed'],['artifact-realpath-fault','normalized artifact directory resolution failed'],['report-realpath-fault','normalized report directory resolution failed'],['write-fault','normalized report publication failed']])('rejects H confinement mutation %s without partial or outside publication', (mutation,message) => {
    expect(invoke({action:'confinement',mutation})).toMatchObject({ok:false,name:'Camp01HReportNormalizerError',error:expect.stringContaining(message),normalizedExists:false,outsideFiles:[]});
  });

  (process.platform === 'win32' ? it.skip : it)(
    'rejects a POSIX reports-directory symlink without writing through it',
    () => {
      expect(
        invoke({ action: 'confinement', mutation: 'reports-symlink' }),
      ).toMatchObject({
        ok: false,
        name: 'Camp01HReportNormalizerError',
        error: expect.stringContaining('normalized report directory invalid'),
        normalizedExists: false,
        outsideFiles: [],
      });
    },
  );

  it('is inert outside a validated CAMP invocation', () => {
    expect(invoke({ action: 'inactive' })).toEqual({
      ok: true,
      value: {
        playwright: { active: false, environment: {} },
        ux: { active: false },
      },
    });
  });
});

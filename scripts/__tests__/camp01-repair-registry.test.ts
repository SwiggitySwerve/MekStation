import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(__dirname, '..', '..');
const registryUrl = pathToFileURL(
  path.join(repoRoot, 'scripts/qc/camp01-repair-registry.mjs'),
).href;
const writerUrl = pathToFileURL(
  path.join(repoRoot, 'scripts/qc/camp01-authority-receipt.mjs'),
).href;
const exportUrl = pathToFileURL(
  path.join(repoRoot, 'scripts/qc/camp01-durable-export.mjs'),
).href;
const schemasUrl = pathToFileURL(
  path.join(repoRoot, 'scripts/qc/camp01-authority-receipt.schemas.mjs'),
).href;
const contractUrl = pathToFileURL(
  path.join(repoRoot, 'scripts/qc/camp01-authority-receipt.contract.mjs'),
).href;
const controllerUrl = pathToFileURL(
  path.join(repoRoot, 'scripts/qc/run-camp01-authority-receipt.mjs'),
).href;
const validatorPath = path.join(
  repoRoot,
  'scripts/qc/validate-camp01-authority-receipt.mjs',
);

const harness = String.raw`
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs'; import path from 'node:path';
import { createRepairRegistry } from ${JSON.stringify(registryUrl)};
import { writeReceipt } from ${JSON.stringify(writerUrl)};
import { createDurableExport } from ${JSON.stringify(exportUrl)};
import { canonicalBytes, digestBytes } from ${JSON.stringify(schemasUrl)};
import { WAVE_CONTRACTS } from ${JSON.stringify(contractUrl)};
import { validatePreflight } from ${JSON.stringify(controllerUrl)};
const q=JSON.parse(fs.readFileSync(0,'utf8')), root=q.root, registryRoot=path.join(root,'.sisyphus','evidence','playtest','.camp01-repair-registry');
const pair=(digit='a')=>{const cause=digit.repeat(64),wave='proof-02-repair-'+cause,commandSequence=[['@node','repair-probe.mjs']],sourceDisposition={receiptId:'receipt-'+digit.repeat(16),observationId:'observation-'+digit,failedReportObservationId:null,failedReportFingerprint:null,causeFingerprint:'sha256:'+cause},source={kind:'proof',childChange:'repair-proof-'+digit,causeFingerprint:'sha256:'+cause,sourceDisposition,reporterContracts:[],explicitDependencies:[]},row={wave,commandId:wave,childChange:source.childChange,runRootTemplate:'.sisyphus/evidence/playtest/'+wave+'-<sha>',commandSequence,canonicalArgvDigest:createHash('sha256').update(JSON.stringify(commandSequence)).digest('hex'),artifacts:['command-result.json','receipt-manifest.json','wave-result.json'],assertions:['repairVerified===true'],predecessors:['proof-02-triage'],sourceDisposition,capSubject:'product-pr',maxFiles:2,maxChangedLines:100,reporterContracts:[]};return {wave,declaration:{schema:'camp01-repair-row/v1',row},source};};
const entryDirectories=()=>fs.readdirSync(registryRoot).filter((name)=>/^\d{8}-[0-9a-f]{64}$/.test(name)).sort().map((name)=>path.join(registryRoot,name));
const renameEvent=(directory,event)=>{const bytes=canonicalBytes(event), digest=digestBytes(bytes), target=path.join(registryRoot,String(event.ordinal).padStart(8,'0')+'-'+digest.slice(7));fs.writeFileSync(path.join(directory,'event.json'),bytes);fs.renameSync(directory,target);return target;};
async function roundTrip(){const registry=createRepairRegistry({initiatingRoot:root}), repair=pair(), registration=registry.register(repair), row=repair.declaration.row, sha='b'.repeat(40), digest='sha256:'+'a'.repeat(64), runRoot=row.runRootTemplate.replace('<sha>',sha), proof=path.join(root,'proof'), absolute=path.join(proof,...runRoot.split('/')), spec='tuple-'+'6'.repeat(16), product='tuple-'+'7'.repeat(16), predecessor='receipt-'+'8'.repeat(16), registryContext={evidence:[],provenance:[{id:predecessor,sourceKind:'predecessor-receipt',wave:'proof-02-triage',subject:'audit-pr'},{id:spec,sourceKind:'spec-tuple',wave:repair.wave,subject:'product-pr'},{id:product,sourceKind:'owned-pr-tuple',wave:repair.wave,subject:'product-pr'}],refs:[],capturePolicies:[],repairSources:[]};fs.mkdirSync(proof);const written=await writeReceipt({wave:repair.wave,commandId:repair.wave,sha,treeSha:sha,runRoot:absolute,mode:'reviewed-head',executionEnvironmentDigest:digest,provenance:{subject:'product-pr',specTupleId:spec,ownedPrTupleId:product,predecessorReceiptIds:[predecessor]},capProvenance:{subject:'product-pr',baseSha:sha,headSha:sha,fileCount:1,changedLineCount:1,binaryEntries:false,changedTreeManifestDigest:digest,reviewedHeadReceiptId:null,reviewedHeadReceiptManifestDigest:null},identityRegistry:{schema:'camp01-identity-registry/v1',entities:[],refs:[]},registryContext,reviewedHead:null,repairDeclaration:repair.declaration,repairSource:repair.source},{randomBytes:()=>Buffer.from('7'.repeat(32),'hex'),runCommand:async(_argv,context)=>{fs.writeFileSync(context.artifactPath('wave-result.json'),canonicalBytes({schema:'camp01-wave-result/v1',wave:repair.wave,runId:context.runId,status:'passed',assertions:{'repairVerified===true':true}}));return {exitCode:0,observedTestIds:[]};}});await createDurableExport({initiatingRoot:root,transientRoot:proof,repairRegistration:registration,validationContext:{registryContext,reviewedHead:null}}).exportReceipt({row,receipt:{runId:written.runId,phase:'final',finalizedPaths:[...row.artifacts]},arguments:{mode:'reviewed-head',sha,runRoot},proofTarget:{canonicalPath:proof}});const validated=spawnSync(process.execPath,[q.validator,'--wave='+repair.wave,'--run-root='+runRoot,'--expected-sha='+sha,'--mode=reviewed-head','--repair-registration='+registration.reference],{cwd:root,encoding:'utf8',env:{...process.env,CAMP01_VALIDATION_CONTEXT:JSON.stringify({registryContext,reviewedHead:null})}}), reopened=createRepairRegistry({initiatingRoot:root});reopened.cleanup({wave:repair.wave,reference:registration.reference});let absent=false;try{createRepairRegistry({initiatingRoot:root,readOnly:true}).require(registration.reference);}catch(error){absent=error?.message==='CAMP01_REPAIR_REGISTRY_INVALID: repair registration absent';}return {status:validated.status,stdout:validated.stdout,stderr:validated.stderr,active:reopened.discover().length,absent};}
function setDrift(){const row=WAVE_CONTRACTS['camp-00'], id=pair().wave, extra=pair('b').wave, gate={gate:'proof-02-required-repairs',requiredRowIds:[id],registeredRowIds:[id],reviewedHeadRowIds:[id],exactMainRowIds:[id],cleanupRowIds:[id]};if(q.mutation==='registered-extra')gate.registeredRowIds.push(extra);else gate[q.mutation]=[];return validatePreflight(row,{programSpecChanges:[],predecessorReceiptWaves:['proof-02-triage'],predecessorCleanupWaves:['proof-02-triage'],repairGates:[gate],cap:{subject:'product-pr',fileCount:1,changedLineCount:1,binaryEntries:false}});}
function forge(){const registry=createRepairRegistry({initiatingRoot:root}), first=registry.register(pair());if(q.mutation==='frozen')return registry.register({...pair(),wave:'camp-proof'});if(q.mutation==='residue'){registry.cleanup({wave:pair().wave,reference:first.reference});const stage=path.join(registryRoot,'.camp01-repair-stage-stale');fs.mkdirSync(stage);fs.writeFileSync(path.join(stage,'declaration.json'),'partial');return {active:registry.discover().length,residue:fs.existsSync(stage)};}if(q.mutation==='cleanup-hardlink'){const directory=entryDirectories()[0], declaration=path.join(directory,'declaration.json'), external=path.join(root,'external-declaration.json');fs.copyFileSync(declaration,external);fs.unlinkSync(declaration);fs.linkSync(external,declaration);registry.cleanup({wave:pair().wave,reference:first.reference});return {external:fs.existsSync(external),registered:fs.existsSync(declaration),active:registry.discover().length,bytes:fs.readFileSync(external,'utf8')};}if(['reordered','forged-link'].includes(q.mutation))registry.register(pair('b'));const entries=entryDirectories();if(q.mutation==='event-bytes')fs.appendFileSync(path.join(entries[0],'event.json'),' ');if(q.mutation==='declaration-bytes')fs.appendFileSync(path.join(entries[0],'declaration.json'),' ');if(q.mutation==='source-bytes')fs.appendFileSync(path.join(entries[0],'source.json'),' ');if(q.mutation==='digest-substitution'){const event=JSON.parse(fs.readFileSync(path.join(entries[0],'event.json'),'utf8'));event.declarationDigest='sha256:'+'0'.repeat(64);renameEvent(entries[0],event);}if(q.mutation==='duplicate'){const event=JSON.parse(fs.readFileSync(path.join(entries[0],'event.json'),'utf8')), duplicate=fs.mkdtempSync(path.join(registryRoot,'.duplicate-'));for(const name of ['declaration.json','source.json'])fs.copyFileSync(path.join(entries[0],name),path.join(duplicate,name));renameEvent(duplicate,{...event,ordinal:1,previousDigest:first.reference});}if(q.mutation==='reordered'){const a=entries[0],b=entries[1],eventA=JSON.parse(fs.readFileSync(path.join(a,'event.json'),'utf8')),eventB=JSON.parse(fs.readFileSync(path.join(b,'event.json'),'utf8')),tmp=path.join(registryRoot,'.swap');fs.renameSync(a,tmp);fs.renameSync(b,path.join(registryRoot,'00000000-'+digestBytes(canonicalBytes(eventB)).slice(7)));fs.renameSync(tmp,path.join(registryRoot,'00000001-'+digestBytes(canonicalBytes(eventA)).slice(7)));}if(q.mutation==='forged-link'){const event=JSON.parse(fs.readFileSync(path.join(entries[1],'event.json'),'utf8'));event.previousDigest='sha256:'+'0'.repeat(64);renameEvent(entries[1],event);}return registry.discover();}
try{let value;if(q.action==='round-trip')value=await roundTrip();else if(q.action==='set-drift')value=setDrift();else value=forge();process.stdout.write(JSON.stringify({ok:true,value}));}catch(error){process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error),name:error instanceof Error?error.name:null}));process.exitCode=1;}`;

type Result = { ok: boolean; value?: unknown; error?: string; name?: string };

function invoke(input: Record<string, unknown>): Result {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'c5e2-'));
  try {
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '--eval', harness],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        input: JSON.stringify({ ...input, root, validator: validatorPath }),
      },
    );
    return JSON.parse(result.stdout) as Result;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe('CAMP-01 durable repair registry', () => {
  it('[K01 public durable round trip] reopens from only a registration reference and cleans up safely', () => {
    expect(invoke({ action: 'round-trip' })).toEqual({
      ok: true,
      value: {
        status: 0,
        stdout: 'CAMP01 receipt valid\n',
        stderr: '',
        active: 0,
        absent: true,
      },
    });
  });

  it.each([
    ['registered-extra', 'proof-02-required-repairs registeredRowIds drift'],
    ['registeredRowIds', 'proof-02-required-repairs registeredRowIds drift'],
    [
      'reviewedHeadRowIds',
      'proof-02-required-repairs reviewedHeadRowIds drift',
    ],
    ['exactMainRowIds', 'proof-02-required-repairs exactMainRowIds drift'],
    ['cleanupRowIds', 'proof-02-required-repairs cleanupRowIds drift'],
  ])(
    '[K02-K06 %s equality guard] rejects unequal repair gate sets',
    (mutation, guard) => {
      expect(invoke({ action: 'set-drift', mutation }).error).toBe(
        `CAMP01_CONTROLLER_INVALID: ${guard}`,
      );
    },
  );

  it.each([
    ['event-bytes', 'registration event canonicality drift'],
    ['declaration-bytes', 'repair declaration canonicality drift'],
    ['source-bytes', 'repair source canonicality drift'],
    ['digest-substitution', 'registration payload digest drift'],
    ['duplicate', 'duplicate repair registration'],
    ['reordered', 'registration order drift'],
    ['forged-link', 'registration chain link drift'],
    ['frozen', 'frozen wave registration rejected'],
  ])('[K07-K14 %s guard] rejects registry chain forgery', (mutation, guard) => {
    const result = invoke({ action: 'forgery', mutation });
    expect(result).toMatchObject({
      ok: false,
      name: 'Camp01RepairRegistryError',
      error: `CAMP01_REPAIR_REGISTRY_INVALID: ${guard}`,
    });
  });

  it('[K15 staging residue recovery guard] removes only a confined half-written registration stage', () => {
    expect(invoke({ action: 'forgery', mutation: 'residue' })).toEqual({
      ok: true,
      value: { active: 0, residue: false },
    });
  });

  it('[K16 cleanup confinement guard] unlinks only the registered in-root hardlink', () => {
    const result = invoke({ action: 'forgery', mutation: 'cleanup-hardlink' });
    expect(result.ok).toBe(true);
    expect(result.value).toMatchObject({
      external: true,
      registered: false,
      active: 0,
    });
  });
});

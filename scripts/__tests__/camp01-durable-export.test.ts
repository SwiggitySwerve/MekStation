import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const exportUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-durable-export.mjs'),
).href;
const writerUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.mjs'),
).href;
const controllerUrl = pathToFileURL(
  path.resolve('scripts/qc/run-camp01-authority-receipt.mjs'),
).href;
const contractUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.contract.mjs'),
).href;
const schemasUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.schemas.mjs'),
).href;

// prettier-ignore
const harness = `
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import * as durable from ${JSON.stringify(exportUrl)};
import * as writer from ${JSON.stringify(writerUrl)};
import * as controller from ${JSON.stringify(controllerUrl)};
import { PROGRAM_CHILD_CHANGES, WAVE_CONTRACTS } from ${JSON.stringify(contractUrl)};
import { canonicalBytes } from ${JSON.stringify(schemasUrl)};
const request=JSON.parse(process.argv[1]), root=request.root, proof=path.join(root,'proof'), initiating=path.join(root,'initiating'), owned=path.join(root,'owned');
for(const directory of [proof,initiating,owned]) fs.mkdirSync(directory,{recursive:true});
const row=WAVE_CONTRACTS['camp-proof'], sha='b'.repeat(40), specSha='a'.repeat(40), digest='sha256:'+'a'.repeat(64), runId='camp01-'+'4'.repeat(32), runRoot=row.runRootTemplate.replace('<sha>',sha);
const tuple=(digit)=>'tuple-'+digit.repeat(16), registryContext={evidence:[],provenance:[{id:tuple('2'),sourceKind:'spec-tuple',wave:row.wave,subject:'product-pr'},{id:tuple('3'),sourceKind:'owned-pr-tuple',wave:row.wave,subject:'product-pr'}],refs:[],capturePolicies:[],repairSources:[]}, validationContext={registryContext,reviewedHead:null};
async function write(base=proof){ return writer.writeReceipt({wave:row.wave,commandId:row.commandId,sha,treeSha:sha,runRoot:path.join(base,...runRoot.split('/')),mode:'reviewed-head',executionEnvironmentDigest:digest,provenance:{subject:'product-pr',specTupleId:tuple('2'),ownedPrTupleId:tuple('3'),predecessorReceiptIds:[]},capProvenance:{subject:'product-pr',baseSha:sha,headSha:sha,fileCount:2,changedLineCount:20,binaryEntries:false,changedTreeManifestDigest:digest,reviewedHeadReceiptId:null,reviewedHeadReceiptManifestDigest:null},identityRegistry:{schema:'camp01-identity-registry/v1',entities:[],refs:[]},registryContext,reviewedHead:null},{randomBytes:()=>Buffer.from('4'.repeat(32),'hex'),runCommand:async(_argv,context)=>{fs.writeFileSync(context.artifactPath('wave-result.json'),canonicalBytes({schema:'camp01-wave-result/v1',wave:row.wave,runId:context.runId,status:'passed',assertions:Object.fromEntries(row.assertions.map((id)=>[id,true]).sort())}));return {exitCode:0,observedTestIds:[]};}}); }
const validatorStages=[], baseOptions={initiatingRoot:initiating,transientRoot:proof,validationContext}, baseDependencies={validatorSpawn:(entry,args,options)=>{validatorStages.push(path.resolve(options.cwd)===path.resolve(proof)?'transient':'durable');return spawnSync(entry,args,options);}};
function target(kind,head){return {kind,subject:kind==='owned'?'product':null,canonicalPath:kind==='owned'?owned:proof,gitWorktreeId:'worktree-'+kind,expectedHead:head,branchRef:kind==='owned'?'refs/heads/codex/test':null,oldOid:kind==='owned'?head:null,cleanManifest:[],nonReparse:true,initiating:false};}
function exportInput(written){return {row,receipt:{runId:written.runId,phase:'final',finalizedPaths:[...row.artifacts]},arguments:{runRoot,sha,mode:'reviewed-head'},proofTarget:target('proof',sha)};}
try { let value;
  if(request.action==='happy'){
    let state=null; const seams=durable.createDurableExport(baseOptions,baseDependencies), store={load:()=>state,save:(_wave,next)=>{state=structuredClone(next);},remove:()=>{state=null;}}, spec=(child)=>[child,'101',specSha,'approval-1','reviewer'].join('|');
    await controller.runController(['register-pr-target','--wave='+row.wave,'--subject=product','--worktree='+owned,'--spec='+spec(row.childChange)],{stateStore:store,inspectOwnedTarget:()=>target('owned',specSha)});
    const argv=['proof','--mode=reviewed-head','--wave='+row.wave,'--sha='+sha,'--run-root='+runRoot,'--spec='+spec(row.childChange),'--product='+['201',sha,'approval-2','reviewer','pending'].join('|'),...PROGRAM_CHILD_CHANGES.map((child)=>'--program-spec='+spec(child))];
    state=await controller.runController(argv,{...seams,stateStore:store,verifyPreflight:()=>({programSpecChanges:[...PROGRAM_CHILD_CHANGES],predecessorReceiptWaves:[],predecessorCleanupWaves:[],repairGates:[],cap:{subject:'product-pr',fileCount:2,changedLineCount:20,binaryEntries:false}}),inspectRowRoot:()=>({repoRelativePath:runRoot,reparsePoints:[]}),createProofTarget:()=>target('proof',sha),prepareEnvironment:()=>({executionEnvironmentDigest:digest}),observeCleanState:()=>({headSha:sha,treeSha:sha,trackedClean:true,indexClean:true,reparsePaths:[],manifest:[]}),executeReceipt:async()=>{const written=await write();return {runId:written.runId,phase:'final',finalizedPaths:[...row.artifacts]};}});
    const source=path.join(proof,...runRoot.split('/'),runId), destination=path.join(initiating,...runRoot.split('/'),runId), identical=row.artifacts.every((name)=>fs.readFileSync(path.join(source,...name.split('/'))).equals(fs.readFileSync(path.join(destination,...name.split('/'))))), manifestBytes=fs.readFileSync(path.join(destination,'receipt-manifest.json')), manifest=JSON.parse(manifestBytes);
    value={accepted:state.lifecycle==='receipt-validated',receiptDigest:state.runs[0].receiptDigest,digestMatches:state.runs[0].receiptDigest==='sha256:'+createHash('sha256').update(manifestBytes).digest('hex'),nonSelfReferential:!Object.hasOwn(manifest,'digest')&&!Object.hasOwn(manifest,'receiptDigest'),identical,validatorStages,files:row.artifacts};
  } else if(request.action==='nested-transient'){
    const nested=path.join(initiating,'.sisyphus','evidence','playtest'); fs.mkdirSync(nested,{recursive:true}); const written=await write(nested), input=exportInput(written); input.proofTarget={...input.proofTarget,canonicalPath:nested};
    const seams=durable.createDurableExport({initiatingRoot:initiating,transientRoot:nested,validationContext},baseDependencies); value=await seams.exportReceipt(input);
  } else if(request.action==='validator-entry-drift'){
    const seams=durable.createDurableExport(baseOptions,baseDependencies); value=await seams.invokePublicValidator({entry:path.join(root,'wrong.mjs'),stage:'transient',wave:row.wave,mode:'reviewed-head',sha,runRoot,runId});
  } else if(request.action==='validator-stage-drift'){
    const seams=durable.createDurableExport(baseOptions,baseDependencies), entry=path.resolve('scripts/qc/validate-camp01-authority-receipt.mjs'); value=await seams.invokePublicValidator({entry,stage:'invalid',wave:row.wave,mode:'reviewed-head',sha,runRoot,runId});
  } else if(request.action==='validator-transient-failure'){
    await write(); const seams=durable.createDurableExport(baseOptions,{validatorSpawn:()=>({status:1})}), entry=path.resolve('scripts/qc/validate-camp01-authority-receipt.mjs'); value=await seams.invokePublicValidator({entry,stage:'transient',wave:row.wave,mode:'reviewed-head',sha,runRoot,runId});
  } else if(request.action==='published-retry'){
    const written=await write(), input=exportInput(written), interrupted=durable.createDurableExport(baseOptions,{validatorSpawn:()=>({status:1})}); let firstError=null; try { await interrupted.exportReceipt(input); } catch(error) { firstError=error instanceof Error?error.message:String(error); }
    const retried=await durable.createDurableExport(baseOptions,baseDependencies).exportReceipt(input), destination=path.join(initiating,...runRoot.split('/'),runId); value={firstError,retried,destinationEntries:fs.readdirSync(destination).sort()};
  } else {
    const written=await write(), input=exportInput(written), destination=path.join(initiating,...runRoot.split('/'),runId); let dependencies={...baseDependencies};
    if(request.action==='identity-drift') input.arguments={...input.arguments,sha:'c'.repeat(40)};
    if(request.action==='collision') fs.mkdirSync(destination,{recursive:true});
    if(request.action==='reparse'){const external=path.join(root,'external');fs.mkdirSync(external);fs.symlinkSync(external,path.join(initiating,'.sisyphus'),request.junction?'junction':'dir');}
    if(request.action==='destination-reparse'){const external=path.join(root,'external');fs.mkdirSync(external);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.symlinkSync(external,destination,request.junction?'junction':'dir');}
    if(request.action==='partial') dependencies={...dependencies,copy:(source,target)=>{dependencies.copies=(dependencies.copies??0)+1;if(dependencies.copies===2)throw new Error('injected');fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);}};
    if(request.action==='staging-residue'){const durableRunRoot=path.dirname(destination), residue=path.join(durableRunRoot,'.camp01-export-'+runId+'-crashed');fs.mkdirSync(residue,{recursive:true});fs.writeFileSync(path.join(residue,'partial'),'crash');}
    if(request.action==='foreign-residue'){const durableRunRoot=path.dirname(destination), residue=path.join(durableRunRoot,'.camp01-export-camp01-'+'9'.repeat(32)+'-crashed');fs.mkdirSync(residue,{recursive:true});fs.writeFileSync(path.join(residue,'keep'),'foreign');}
    if(request.action==='concurrent-collision') dependencies={...dependencies,copy:(source,target)=>{fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);if(!dependencies.collided){dependencies.collided=true;const collision=path.join(path.dirname(destination),'concurrent-export');fs.mkdirSync(collision);fs.writeFileSync(path.join(collision,'sentinel'),'owned');}}};
    if(request.action==='tamper') dependencies={...dependencies,copy:(source,target)=>{fs.copyFileSync(source,target,fs.constants.COPYFILE_EXCL);if(target.endsWith('wave-result.json'))fs.appendFileSync(target,'tamper');}};
    if(request.action==='validator-failure') dependencies={...dependencies,validatorSpawn:()=>({status:1})};
    if(request.action==='digest-drift') fs.appendFileSync(path.join(written.finalDirectory,'wave-result.json'),'drift');
    if(request.action==='missing') fs.rmSync(path.join(written.finalDirectory,'wave-result.json'));
    if(request.action==='extra') fs.writeFileSync(path.join(written.finalDirectory,'extra.json'),'{}\\n');
    if(request.action==='substituted') input.receipt.finalizedPaths=['command-result.json','receipt-manifest.json','substituted.json'];
    if(request.action==='non-finalized') fs.renameSync(written.finalDirectory,path.join(path.dirname(written.finalDirectory),'.stage-'+runId));
    const seams=durable.createDurableExport(baseOptions,dependencies); value=await seams.exportReceipt(input); if(request.action==='staging-residue')value={receipt:value,parentEntries:fs.readdirSync(path.dirname(destination))};
  }
  process.stdout.write(JSON.stringify({ok:true,value}));
} catch(error) { const destination=path.join(initiating,...runRoot.split('/'),runId), parent=path.dirname(destination), evidenceRoot=path.join(initiating,'.sisyphus'); process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error),name:error instanceof Error?error.name:null,published:fs.existsSync(destination),parentEntries:fs.existsSync(parent)?fs.readdirSync(parent):[],evidenceRootExists:fs.existsSync(evidenceRoot),initiatingEntries:fs.readdirSync(initiating),collisionSentinel:fs.existsSync(path.join(parent,'concurrent-export','sentinel'))})); process.exitCode=1; }`;

type Result = {
  ok: boolean;
  value?: Record<string, unknown>;
  error?: string;
  name?: string;
  published?: boolean;
  parentEntries?: string[];
  evidenceRootExists?: boolean;
  initiatingEntries?: string[];
  collisionSentinel?: boolean;
};
let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof3d1-'));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

function invoke(action: string, junction = false): Result {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      harness,
      JSON.stringify({ action, root, junction }),
    ],
    { encoding: 'utf8' },
  );
  return result.stdout
    ? (JSON.parse(result.stdout) as Result)
    : { ok: false, error: result.stderr };
}

describe('CAMP-01 durable export and reopen', () => {
  it('exports writer bytes and satisfies the real controller export assertion', () => {
    // Given a real writer-finalized receipt, when the controller exports it, then the durable copy reopens through the real public CLI.
    const result = invoke('happy');
    expect(result).toMatchObject({
      ok: true,
      value: {
        accepted: true,
        digestMatches: true,
        identical: true,
        nonSelfReferential: true,
        validatorStages: ['transient', 'durable', 'durable'],
        files: [
          'command-result.json',
          'receipt-manifest.json',
          'wave-result.json',
        ],
      },
    });
    expect(result.value?.receiptDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('recovers an owned staging crash residue before publishing', () => {
    // Given an interrupted export stage, when the same receipt retries, then only the reserved residue is replaced by the validated destination.
    expect(invoke('staging-residue')).toMatchObject({
      ok: true,
      value: {
        receipt: { runId: `camp01-${'4'.repeat(32)}` },
        parentEntries: [`camp01-${'4'.repeat(32)}`],
      },
    });
  });

  it('rejects a foreign run staging residue without deleting it', () => {
    // Given another run's crashed staging directory, when this export runs, then it fails closed and the foreign residue survives.
    expect(invoke('foreign-residue')).toMatchObject({
      ok: false,
      error: 'CAMP01_EXPORT_INVALID: durable destination collision',
      parentEntries: [`.camp01-export-camp01-${'9'.repeat(32)}-crashed`],
    });
  });

  it('revalidates an already-published destination after validator interruption', () => {
    // Given atomic publication completed before validator failure, when export retries, then byte-identical durable evidence reopens without recopying.
    expect(invoke('published-retry')).toMatchObject({
      ok: true,
      value: {
        firstError:
          'CAMP01_EXPORT_INVALID: public validator failed for durable stage',
        retried: { runId: `camp01-${'4'.repeat(32)}` },
        destinationEntries: [
          'command-result.json',
          'receipt-manifest.json',
          'wave-result.json',
        ],
      },
    });
  });

  it('removes only newly-created empty ancestors after a failed copy', () => {
    // Given export created the durable path chain, when copying fails, then no empty authority-looking residue remains.
    expect(invoke('partial')).toMatchObject({
      ok: false,
      evidenceRootExists: false,
    });
  });

  it('preserves a concurrent collision while discarding its own stage', () => {
    // Given another export appears during copy, when compare-before-publish rejects, then the foreign sentinel survives and no receipt is published.
    expect(invoke('concurrent-collision')).toMatchObject({
      ok: false,
      error: 'CAMP01_EXPORT_INVALID: durable destination collision',
      published: false,
      parentEntries: ['concurrent-export'],
      collisionSentinel: true,
    });
  });

  it('classifies an invalid validator stage before any durable mutation', () => {
    // Given a stage outside transient/durable, when the public validator boundary parses it, then the initiating checkout remains byte-unmodified.
    expect(invoke('validator-stage-drift')).toMatchObject({
      ok: false,
      error: 'CAMP01_EXPORT_INVALID: public validator input drift',
      initiatingEntries: [],
    });
  });

  it.each([
    ['collision', 'durable destination collision'],
    ['partial', 'partial copy rejected'],
    ['tamper', 'staged artifact digest drift: wave-result.json'],
    ['validator-failure', 'public validator failed for durable stage'],
    ['digest-drift', 'transient artifact digest drift: wave-result.json'],
    ['missing', 'finalized artifact set drift'],
    ['extra', 'finalized artifact set drift'],
    ['substituted', 'finalized artifact set drift'],
    ['non-finalized', 'source receipt is not finalized'],
    ['nested-transient', 'durable destination is inside proof target'],
    ['identity-drift', 'export identity drift'],
    ['validator-entry-drift', 'public validator input drift'],
    [
      'validator-transient-failure',
      'public validator failed for transient stage',
    ],
  ])('rejects %s exactly', (action, message) => {
    // Given one export-authority violation, when export begins, then it fails with the typed stable reason.
    const result = invoke(action);
    expect(result.error).toBe(`CAMP01_EXPORT_INVALID: ${message}`);
    expect(result.name).toBe('Camp01ExportError');
    if (action === 'partial' || action === 'tamper') {
      expect(result.published).toBe(false);
      expect(result.parentEntries).toEqual([]);
    }
  });

  (process.platform === 'win32' ? it.skip : it)(
    'rejects a POSIX symlink in the durable path chain',
    () => {
      expect(invoke('reparse').error).toBe(
        'CAMP01_EXPORT_INVALID: reparse point present in durable path',
      );
    },
  );

  (process.platform === 'win32' ? it.skip : it)(
    'rejects a POSIX symlink at the durable destination',
    () => {
      expect(invoke('destination-reparse').error).toBe(
        'CAMP01_EXPORT_INVALID: reparse point present in durable path',
      );
    },
  );

  (process.platform === 'win32' ? it : it.skip)(
    'rejects a Windows junction in the durable path chain',
    () => {
      expect(invoke('reparse', true).error).toBe(
        'CAMP01_EXPORT_INVALID: reparse point present in durable path',
      );
    },
  );

  (process.platform === 'win32' ? it : it.skip)(
    'rejects a Windows junction at the durable destination',
    () => {
      expect(invoke('destination-reparse', true).error).toBe(
        'CAMP01_EXPORT_INVALID: reparse point present in durable path',
      );
    },
  );
});

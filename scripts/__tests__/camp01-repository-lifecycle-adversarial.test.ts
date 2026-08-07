import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = (file: string): string =>
  pathToFileURL(path.resolve(file)).href;
const harness = String.raw`
import { spawnSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';
import { createCleanupAuthority } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-cleanup-authority.mjs'))};
import { createDurableExport } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-durable-export.mjs'))};
import { createDurableFacts, createProductionDependencies } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-durable-facts.mjs'))};
import { writeReceipt } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-authority-receipt.mjs'))};
import { WAVE_CONTRACTS } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-authority-receipt.contract.mjs'))};
import { canonicalBytes, digestBytes } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-authority-receipt.schemas.mjs'))};
import { createProofTarget, inspectOwnedTarget, observeCleanState } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-target-authority.mjs'))};
import { invokeGit } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-git-trust.mjs'))};
const q=JSON.parse(fs.readFileSync(0,'utf8')), root=q.root, repo=path.join(root,'repo'), owned=path.join(root,'owned'), sentinel=path.join(root,'sentinel'), proofs=path.join(root,'proofs'), row=WAVE_CONTRACTS['camp-proof'], git={executable:q.git}, environmentDigest='sha256:'+'a'.repeat(64), tuple=(digit)=>'tuple-'+digit.repeat(16);
const runGit=(args,cwd=repo)=>invokeGit({git,args,cwd}), commit=async(message,cwd=repo)=>{await runGit(['add','.'],cwd);await runGit(['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid','commit','-m',message],cwd);return (await runGit(['rev-parse','HEAD'],cwd)).stdout.trim();};
const targetInput=(worktree,sha)=>({wave:row.wave,subject:'product',worktree,spec:{mergeSha:sha},row,headSha:sha});
async function seed(){fs.mkdirSync(repo);await runGit(['init','--initial-branch=main']);fs.writeFileSync(path.join(repo,'.gitignore'),'.sisyphus/\n');fs.writeFileSync(path.join(repo,'base.txt'),'base\n');const base=await commit('base');await runGit(['worktree','add','-b','codex/camp-proof',owned,base]);await runGit(['worktree','add','-b','codex/sentinel',sentinel,base]);fs.writeFileSync(path.join(sentinel,'sentinel.keep'),'owned');fs.appendFileSync(path.join(owned,'base.txt'),'product\n');const productHead=await commit('product',owned), ownedTarget=await inspectOwnedTarget(targetInput(owned,productHead),{git});await runGit(['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid','merge','--no-ff','codex/camp-proof','-m','merge']);const main=(await runGit(['rev-parse','HEAD'])).stdout.trim(), initiatingRaw=await inspectOwnedTarget(targetInput(repo,main),{git}), initiatingTarget={...initiatingRaw,initiating:true};fs.mkdirSync(proofs);fs.mkdirSync(path.join(repo,'.sisyphus','evidence','playtest','.camp01-cleanups'),{recursive:true});return {base,productHead,main,ownedTarget,initiatingTarget};}
function registry(){return {evidence:[],provenance:[{id:tuple('2'),sourceKind:'spec-tuple',wave:row.wave,subject:'product-pr'},{id:tuple('3'),sourceKind:'owned-pr-tuple',wave:row.wave,subject:'product-pr'}],refs:[],capturePolicies:[],repairSources:[]};}
async function write(target,mode,sha,cap,registryContext,reviewedHead,entropy){const runRoot=row.runRootTemplate.replace('<sha>',sha), treeSha=(await runGit(['rev-parse',sha+'^{tree}'])).stdout.trim();return writeReceipt({wave:row.wave,commandId:row.commandId,sha,treeSha,runRoot:path.join(target.canonicalPath,...runRoot.split('/')),mode,executionEnvironmentDigest:environmentDigest,provenance:{subject:'product-pr',specTupleId:tuple('2'),ownedPrTupleId:tuple('3'),predecessorReceiptIds:[]},capProvenance:cap,identityRegistry:{schema:'camp01-identity-registry/v1',entities:[],refs:[]},registryContext,reviewedHead},{randomBytes:()=>Buffer.from(entropy.repeat(32),'hex'),runCommand:async(_argv,context)=>{fs.writeFileSync(context.artifactPath('wave-result.json'),canonicalBytes({schema:'camp01-wave-result/v1',wave:row.wave,runId:context.runId,status:'passed',assertions:Object.fromEntries(row.assertions.map((id)=>[id,true]).sort())}));return {exitCode:0,observedTestIds:[]};}});}
const exportInput=(target,written,mode,sha)=>({row,receipt:{runId:written.runId,phase:'final',finalizedPaths:[...row.artifacts]},arguments:{runRoot:row.runRootTemplate.replace('<sha>',sha),sha,mode},proofTarget:target});
async function lifecycle(seeded){const reviewedTarget=await createProofTarget({wave:row.wave,sha:seeded.productHead,mode:'reviewed-head'},{git,repositoryRoot:repo,proofRoot:proofs}), baseRegistry=registry(), cap={subject:'product-pr',baseSha:seeded.productHead,headSha:seeded.productHead,fileCount:1,changedLineCount:1,binaryEntries:false,changedTreeManifestDigest:environmentDigest,reviewedHeadReceiptId:null,reviewedHeadReceiptManifestDigest:null}, reviewedWritten=await write(reviewedTarget,'reviewed-head',seeded.productHead,cap,baseRegistry,null,'4'), reviewedExporter=createDurableExport({initiatingRoot:repo,transientRoot:reviewedTarget.canonicalPath,validationContext:{registryContext:baseRegistry,reviewedHead:null}},{validatorSpawn:spawnSync});await reviewedExporter.exportReceipt(exportInput(reviewedTarget,reviewedWritten,'reviewed-head',seeded.productHead));const facts=createDurableFacts({initiatingRoot:repo},{validatorSpawn:spawnSync}), reviewedRecord=(await facts.readIndex()).records.find((entry)=>entry.mode==='reviewed-head'), reviewedHead={receiptId:reviewedRecord.receiptId,manifestDigest:reviewedRecord.manifestDigest,command:reviewedRecord.command,manifest:reviewedRecord.manifest}, exactRegistry={...baseRegistry,provenance:[...baseRegistry.provenance,{id:reviewedHead.receiptId,sourceKind:'reviewed-head-receipt',wave:row.wave,subject:'product-pr'}].sort((left,right)=>left.id.localeCompare(right.id))}, exactTarget=await createProofTarget({wave:row.wave,sha:seeded.main,mode:'exact-main'},{git,repositoryRoot:repo,proofRoot:proofs}), exactCap={...cap,reviewedHeadReceiptId:reviewedHead.receiptId,reviewedHeadReceiptManifestDigest:reviewedHead.manifestDigest}, exactWritten=await write(exactTarget,'exact-main',seeded.main,exactCap,exactRegistry,reviewedHead,'5'), exactExporter=createDurableExport({initiatingRoot:repo,transientRoot:exactTarget.canonicalPath,validationContext:{registryContext:exactRegistry,reviewedHead}},{validatorSpawn:spawnSync}), exported=await exactExporter.exportReceipt(exportInput(exactTarget,exactWritten,'exact-main',seeded.main)), reopened=(await facts.readIndex()).records.find((entry)=>entry.mode==='exact-main'&&entry.runId===exactWritten.runId), runRoot=row.runRootTemplate.replace('<sha>',seeded.main), clean=await observeCleanState({target:exactTarget,phase:'final',runRoot},{git});return {exactExporter,exactTarget,exported,reopened,runRoot,clean};}
const cleanupReceipt=(runId)=>path.join(repo,'.sisyphus','evidence','playtest','.camp01-cleanups',row.wave+'-'+runId+'-wave-cleanup.json'), exists=(value)=>fs.existsSync(value), errorText=(error)=>error instanceof Error?error.message:String(error);let step='seed';
try {const seeded=await seed();if(q.action==='transient-root'){step='production-composition';const canonicalInputs=[], realpathSync=(value)=>fs.realpathSync(value);realpathSync.native=(value)=>{canonicalInputs.push(path.resolve(value));return fs.realpathSync.native(value);};const production=await createProductionDependencies({initiatingRoot:repo,initiatingTarget:seeded.initiatingTarget,proofRoot:proofs},{git,exportDependencies:{fs:{...fs,realpathSync}}}), proof=await production.createProofTarget({wave:row.wave,sha:seeded.main,mode:'reviewed-head'});process.stdout.write(JSON.stringify({ok:true,value:{transientCanonicalInput:canonicalInputs.at(-1),proofRoot:proof.canonicalPath,initiatingRoot:repo}}));}
else {step='lifecycle';const prepared=await lifecycle(seeded), spec={childChange:row.childChange,prNumber:'1',mergeSha:seeded.base,approvalId:'approval-1',reviewer:'reviewer'}, provenance={subject:'product-pr',spec,owned:{kind:'product',prNumber:'2',headSha:seeded.productHead,approvalId:'approval-2',reviewer:'reviewer',mergeSha:seeded.main}}, run={mode:'exact-main',phase:'final',sha:seeded.main,runRoot:prepared.runRoot,provenance,proofTarget:prepared.exactTarget,cleanManifest:{baseline:prepared.clean.manifest,final:prepared.clean.manifest,matched:true},executionEnvironmentDigest:environmentDigest,runId:prepared.exported.runId,receiptDigest:prepared.exported.receiptDigest,transientValidated:true,durableValidated:true}, state={schema:'camp01-controller-state/v1',wave:row.wave,rowDigest:environmentDigest,repairSource:null,registration:{subject:'product-pr',spec,recordedAt:'register-pr-target'},ownedTarget:seeded.ownedTarget,proofTarget:prepared.exactTarget,runs:[run],lifecycle:'receipt-validated'}, beforeMutation=async()=>{if(q.action==='dirty-race')fs.appendFileSync(path.join(owned,'base.txt'),'race\n');if(q.action==='ref-race')await runGit(['branch','-m','codex/camp-proof','codex/renamed'],owned);}, invokeRaceGit=async(input,deps)=>{if(q.action==='oid-race'&&input.args[0]==='update-ref')await invokeGit({git,args:['update-ref',input.args[2],seeded.base],cwd:repo});return invokeGit(input,deps);}, cleanupIo=q.action==='rm-fault'?{...fs,rmSync:()=>{throw new Error('rm fault');}}:fs, authority=createCleanupAuthority({git,initiatingTarget:seeded.initiatingTarget,cleanupRoot:path.dirname(cleanupReceipt(run.runId)),failedCreationTargets:[]},{beforeMutation,fs:cleanupIo,invokeGit:invokeRaceGit,invokePublicValidator:prepared.exactExporter.invokePublicValidator});let cleanupResult=null, rejection=null;step='cleanup';try{cleanupResult=await authority.cleanupTargets({state,run});}catch(error){rejection=errorText(error);}step='manual-proof-removal '+rejection;if(exists(prepared.exactTarget.canonicalPath)){const transient=path.join(prepared.exactTarget.canonicalPath,...prepared.runRoot.split('/'));if(exists(transient))fs.rmSync(transient,{recursive:true,force:false});await runGit(['worktree','remove',prepared.exactTarget.canonicalPath]);}step='post-removal-reopen';const postRemoval=await prepared.exactExporter.invokePublicValidator({entry:path.resolve('scripts/qc/validate-camp01-authority-receipt.mjs'),stage:'durable',wave:row.wave,mode:'exact-main',sha:seeded.main,runRoot:prepared.runRoot,runId:run.runId});step='sentinel-listing';const listing=(await runGit(['worktree','list','--porcelain','-z'])).stdout, sentinelCanonical=fs.realpathSync.native(sentinel), sentinelRegistered=listing.split('\0').some((field)=>field.startsWith('worktree ')&&fs.realpathSync.native(field.slice(9))===sentinelCanonical);process.stdout.write(JSON.stringify({ok:true,value:{cleanupResult,rejection,reopenedBeforeCleanup:Boolean(prepared.reopened),postRemoval,sentinelExists:exists(path.join(sentinel,'sentinel.keep')),sentinelRegistered,cleanupReceiptExists:exists(cleanupReceipt(run.runId)),proofExists:exists(prepared.exactTarget.canonicalPath),ownedExists:exists(owned)}}));}
} catch(error){process.stdout.write(JSON.stringify({ok:false,error:step+': '+(error instanceof Error?error.stack:errorText(error)),name:error instanceof Error?error.name:null}));process.exitCode=1;}`;

type Result = {
  readonly ok: boolean;
  readonly value?: {
    readonly cleanupResult?: Record<string, boolean> | null;
    readonly rejection?: string | null;
    readonly reopenedBeforeCleanup?: boolean;
    readonly postRemoval?: { readonly validated: boolean };
    readonly sentinelExists?: boolean;
    readonly sentinelRegistered?: boolean;
    readonly cleanupReceiptExists?: boolean;
    readonly proofExists?: boolean;
    readonly ownedExists?: boolean;
    readonly transientCanonicalInput?: string;
    readonly proofRoot?: string;
    readonly initiatingRoot?: string;
  };
  readonly error?: string;
  readonly name?: string;
};
function findHostGit(): string | null {
  const result = spawnSync(
    process.platform === 'win32' ? 'where.exe' : 'which',
    ['git'],
    {
      shell: false,
      encoding: 'utf8',
    },
  );
  const candidate = result.stdout?.split(/\r?\n/).find(Boolean);
  return result.status === 0 && candidate ? path.resolve(candidate) : null;
}
function invoke(action: string): Result {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    {
      input: JSON.stringify({ action, root, git: hostGit }),
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  return result.stdout
    ? (JSON.parse(result.stdout) as Result)
    : { ok: false, error: result.stderr };
}

const hostGit = findHostGit(),
  gitIt = hostGit ? it : it.skip;
let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof5b-'));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('CAMP-01 real repository lifecycle adversarial oracle', () => {
  gitIt(
    'completes exact proof, export, reopen, cleanup, and post-removal reopen',
    () => {
      const result = invoke('success');
      expect(result.error).toBeUndefined();
      expect(result).toMatchObject({
        ok: true,
        value: {
          cleanupResult: {
            proofWorktreeRemoved: true,
            productWorktreeRemoved: true,
            localWaveBranchRemoved: true,
            durableReceiptRevalidated: true,
          },
          rejection: null,
          reopenedBeforeCleanup: true,
          postRemoval: { validated: true },
          sentinelExists: true,
          sentinelRegistered: true,
          cleanupReceiptExists: true,
          proofExists: false,
          ownedExists: false,
        },
      });
    },
  );

  gitIt.each([
    ['dirty-race', 'owned target tracked state drift', true],
    ['ref-race', 'local branch ref drift', true],
    ['oid-race', 'local branch OID race', false],
    ['rm-fault', 'proof transient cleanup failed', true],
  ])(
    'rejects %s without wrong deletion and reopens after proof removal',
    (action, message, ownedExists) => {
      expect(invoke(action)).toMatchObject({
        ok: true,
        value: {
          cleanupResult: null,
          rejection: `CAMP01_CLEANUP_INVALID: ${message}`,
          reopenedBeforeCleanup: true,
          postRemoval: { validated: true },
          sentinelExists: true,
          sentinelRegistered: true,
          cleanupReceiptExists: false,
          proofExists: false,
          ownedExists,
        },
      });
    },
  );

  gitIt(
    'uses the factory-created proof target as the transient validator root',
    () => {
      const result = invoke('transient-root');
      expect(result.error).toBeUndefined();
      expect(result.ok).toBe(true);
      expect(result.value?.transientCanonicalInput).toBe(
        result.value?.proofRoot,
      );
      expect(result.value?.transientCanonicalInput).not.toBe(
        result.value?.initiatingRoot,
      );
    },
  );
});

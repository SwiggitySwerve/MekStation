import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const targetUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-target-authority.mjs'),
).href;
const trustUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-git-trust.mjs'),
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
const harness = `
import { spawnSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
import * as target from ${JSON.stringify(targetUrl)}; import * as trust from ${JSON.stringify(trustUrl)}; import * as controller from ${JSON.stringify(controllerUrl)};
import { PROGRAM_CHILD_CHANGES, WAVE_CONTRACTS } from ${JSON.stringify(contractUrl)};
import { validateWriteContext } from ${JSON.stringify(schemasUrl)};
const request=JSON.parse(fs.readFileSync(0,'utf8')), root=request.root, git={executable:request.git}, repo=path.join(root,'repo'), owned=path.join(root,'owned'), proofRoot=path.join(root,'proofs'), digest='sha256:'+'a'.repeat(64);
const run=(args,cwd=repo,deps={})=>trust.invokeGit({git,args,cwd},deps);
async function seed(){ fs.mkdirSync(repo); await run(['init','--initial-branch=main']); fs.writeFileSync(path.join(repo,'.gitignore'),'ignored/\\n'); fs.writeFileSync(path.join(repo,'base.txt'),'base\\n'); await run(['add','.']); await run(['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid','commit','-m','base']); const base=(await run(['rev-parse','HEAD'])).stdout.trim(); await run(['worktree','add','-b','codex/owned',owned,base]); fs.mkdirSync(proofRoot); return base; }
async function inspect(base,deps={}){ return target.inspectOwnedTarget({wave:'camp-proof',subject:'product',worktree:owned,spec:{mergeSha:base},row:WAVE_CONTRACTS['camp-proof'],headSha:base},{git,...deps}); }
async function create(base){ return target.createProofTarget({wave:'camp-proof',sha:base,mode:'reviewed-head'},{git,repositoryRoot:repo,proofRoot}); }
async function consumer(base,ownedTarget,proofTarget){ let state=null; const store={load:()=>state,save:(_wave,value)=>{state=structuredClone(value);},remove:()=>{state=null;}}, spec=(child)=>[child,'101',base,'approval-1','reviewer'].join('|');
  await controller.runController(['register-pr-target','--wave=camp-proof','--subject=product','--worktree='+owned,'--spec='+spec('add-camp01-authority-receipts')],{stateStore:store,inspectOwnedTarget:()=>ownedTarget});
  const row=WAVE_CONTRACTS['camp-proof'], runRoot='.sisyphus/evidence/playtest/camp-proof-'+base, argv=['proof','--mode=reviewed-head','--wave=camp-proof','--sha='+base,'--run-root='+runRoot,'--spec='+spec('add-camp01-authority-receipts'),'--product='+['201',base,'approval-2','reviewer','pending'].join('|'),...PROGRAM_CHILD_CHANGES.map((child)=>'--program-spec='+spec(child))];
  await controller.runController(argv,{stateStore:store,verifyPreflight:()=>({programSpecChanges:[...PROGRAM_CHILD_CHANGES],predecessorReceiptWaves:[],predecessorCleanupWaves:[],repairGates:[],cap:{subject:'product-pr',fileCount:0,changedLineCount:0,binaryEntries:false}}),inspectRowRoot:()=>({repoRelativePath:runRoot,reparsePoints:[]}),createProofTarget:()=>proofTarget,prepareEnvironment:()=>({executionEnvironmentDigest:digest}),observeCleanState:(input)=>target.observeCleanState(input,{git}),executeReceipt:()=>({runId:'camp01-'+'4'.repeat(32),phase:'final',finalizedPaths:[...row.artifacts].sort()}),invokePublicValidator:()=>({validated:true}),exportReceipt:(input)=>({...input.receipt,receiptDigest:digest})}); return state?.lifecycle==='receipt-validated'; }
try { const base=await seed(); let value;
  if(request.action==='records'){ fs.mkdirSync(path.join(owned,'ignored','nested'),{recursive:true}); fs.writeFileSync(path.join(owned,'ignored','nested','data.bin'),'ignored'); fs.writeFileSync(path.join(owned,'loose.txt'),'loose'); const ownedTarget=await inspect(base), proofTarget=await create(base), runRoot='.sisyphus/evidence/playtest/camp-proof-'+base; fs.mkdirSync(path.join(proofTarget.canonicalPath,...runRoot.split('/')),{recursive:true}); fs.writeFileSync(path.join(proofTarget.canonicalPath,...runRoot.split('/'),'artifact.json'),'allowed'); const clean=await target.observeCleanState({target:proofTarget,phase:'baseline',runRoot},{git}); value={base,ownedTarget,proofTarget,clean,consumerAccepted:await consumer(base,ownedTarget,proofTarget)}; }
  else if(request.action==='mixed-case'){ fs.mkdirSync(path.join(owned,'ignored','JSONStream'),{recursive:true}); fs.mkdirSync(path.join(owned,'ignored','jest'),{recursive:true}); fs.writeFileSync(path.join(owned,'ignored','JSONStream','LICENSE'),'upper'); fs.writeFileSync(path.join(owned,'ignored','jest','index.js'),'lower'); const ownedTarget=await inspect(base), proofTarget=await create(base); value={manifest:ownedTarget.cleanManifest,consumerAccepted:await consumer(base,ownedTarget,proofTarget)}; }
  else if(request.action==='unregistered'){ const foreign=path.join(root,'foreign'); fs.mkdirSync(foreign); value=await target.inspectOwnedTarget({wave:'camp-proof',subject:'product',worktree:foreign,spec:{mergeSha:base},row:WAVE_CONTRACTS['camp-proof'],headSha:base},{git}); }
  else if(request.action==='wrong-head') value=await inspect('a'.repeat(40));
  else if(request.action==='nonempty'){ const location=path.join(proofRoot,'camp-proof-reviewed-head-'+base); fs.mkdirSync(location); fs.writeFileSync(path.join(location,'sentinel'),'owned'); value=await create(base); }
  else if(request.action==='proof-location-reparse'){ const external=path.join(root,'external'), location=path.join(proofRoot,'camp-proof-reviewed-head-'+base); fs.mkdirSync(external); fs.symlinkSync(external,location,request.junction?'junction':'dir'); let error=null; try { await create(base); } catch(cause) { error=cause instanceof Error?cause.message:String(cause); } const listing=(await run(['worktree','list','--porcelain'])).stdout; value={error,registered:listing.includes(location),externalEntries:fs.readdirSync(external)}; }
  else if(request.action==='missing-id'){ value=await inspect(base,{gitDependencies:{spawn:(executable,args,options)=>{const result=spawnSync(executable,args,options); return args.includes('--absolute-git-dir')?{...result,stdout:''}:result;}}}); }
  else if(request.action==='owned-detached'){ await run(['switch','--detach'],owned); value=await inspect(base); }
  else if(request.action==='invalid-run-root'){ const proofTarget=await create(base); value=await target.observeCleanState({target:proofTarget,phase:'final',runRoot:request.runRoot},{git}); }
  else if(request.action==='invalid-input'){ if(request.api==='inspect')value=await target.inspectOwnedTarget({wave:null,subject:'product',worktree:owned,spec:{mergeSha:base},row:WAVE_CONTRACTS['camp-proof'],headSha:base},{git}); if(request.api==='create')value=await target.createProofTarget({wave:'camp-proof',sha:'bad',mode:'reviewed-head'},{git,repositoryRoot:repo,proofRoot}); if(request.api==='observe')value=await target.observeCleanState({target:null,phase:'final',runRoot:null},{git}); if(request.api==='facts')value=await target.resolveTargetFacts({ownedTarget:null,spec:null,row:null},{git}); }
  else if(request.action==='non-ancestor'){ const ownedTarget=await inspect(base), tree=(await run(['rev-parse','HEAD^{tree}'])).stdout.trim(), divergent=(await run(['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid','commit-tree',tree,'-m','divergent'])).stdout.trim(); await run(['reset','--hard',divergent],owned); value=await target.resolveTargetFacts({ownedTarget,spec:{mergeSha:base},row:WAVE_CONTRACTS['camp-proof']},{git}); }
  else if(request.action==='foreign-clone'){ const ownedTarget=await inspect(base); await run(['worktree','remove',owned]); await run(['clone','--branch','codex/owned',repo,owned]); value=await target.observeCleanState({target:ownedTarget,phase:'final',runRoot:null},{git}); }
  else if(request.action==='ancestor-reparse'){ const realParent=path.join(root,'real-parent'), alias=path.join(root,'ancestor-alias'), candidate=path.join(realParent,'candidate'); fs.mkdirSync(realParent); await run(['worktree','add','-b','codex/ancestor',candidate,base]); fs.symlinkSync(realParent,alias,request.junction?'junction':'dir'); value=await target.inspectOwnedTarget({wave:'camp-proof',subject:'product',worktree:path.join(alias,'candidate'),spec:{mergeSha:base},row:WAVE_CONTRACTS['camp-proof'],headSha:base},{git}); }
  else if(request.action==='invalid-numstat'){ const ownedTarget=await inspect(base); fs.appendFileSync(path.join(owned,'base.txt'),'next\\n'); await run(['add','.'],owned); await run(['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid','commit','-m','product'],owned); value=await target.resolveTargetFacts({ownedTarget,spec:{mergeSha:base},row:WAVE_CONTRACTS['camp-proof']},{git,gitDependencies:{spawn:(executable,args,options)=>{const result=spawnSync(executable,args,options);return args.includes('diff')?{...result,stdout:request.numstat}:result;}}}); }
  else if(request.action==='dirty'){ const ownedTarget=await inspect(base); fs.appendFileSync(path.join(owned,'base.txt'),'dirty\\n'); if(request.index) await run(['add','base.txt'],owned); value=await target.observeCleanState({target:ownedTarget,phase:'final',runRoot:'allowed'},{git}); }
  else if(request.action==='reparse'){ const proofTarget=await create(base), external=path.join(root,'external'); fs.mkdirSync(external); fs.symlinkSync(external,path.join(proofTarget.canonicalPath,'escape'),request.junction?'junction':'dir'); value=await target.observeCleanState({target:proofTarget,phase:'final',runRoot:'allowed'},{git}); }
  else if(request.action==='run-root-reparse'){ const proofTarget=await create(base), external=path.join(root,'external'); fs.mkdirSync(external); fs.symlinkSync(external,path.join(proofTarget.canonicalPath,'allowed'),request.junction?'junction':'dir'); value=await target.observeCleanState({target:proofTarget,phase:'final',runRoot:'allowed'},{git}); }
  else if(request.action==='facts'){ const ownedTarget=await inspect(base); fs.appendFileSync(path.join(owned,'base.txt'),'next\\n'); fs.writeFileSync(path.join(owned,'jest.txt'),'one\\ntwo\\n'); fs.writeFileSync(path.join(owned,'JSONStream.dat'),Buffer.from([0,255,1])); await run(['add','.'],owned); await run(['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid','commit','-m','product'],owned); const facts=await target.resolveTargetFacts({ownedTarget,spec:{mergeSha:base},row:WAVE_CONTRACTS['camp-proof']},{git}), specId='tuple-'+'1'.repeat(32), ownedId='tuple-'+'2'.repeat(32), registryContext={evidence:[],provenance:[{id:specId,sourceKind:'spec-tuple',wave:'camp-proof',subject:'product-pr'},{id:ownedId,sourceKind:'owned-pr-tuple',wave:'camp-proof',subject:'product-pr'}],refs:[],capturePolicies:[],repairSources:[]}; let directError=null; try { validateWriteContext({wave:'camp-proof',commandId:'camp-proof',sha:facts.capProvenance.headSha,treeSha:facts.treeSha,executionEnvironmentDigest:digest,mode:'reviewed-head',provenance:{subject:'product-pr',specTupleId:specId,ownedPrTupleId:ownedId,predecessorReceiptIds:[]},capProvenance:{...facts.capProvenance,binaryEntries:false},identityRegistry:{schema:'camp01-identity-registry/v1',entities:[],refs:[]}},{row:WAVE_CONTRACTS['camp-proof'],registryContext,reviewedHead:null}); } catch(error) { directError=error instanceof Error?error.message:String(error); } value={...facts,baseSha:facts.capProvenance.baseSha,headSha:facts.capProvenance.headSha,placeholderKeys:Object.keys(facts.capProvenance),placeholdersAbsent:facts.capProvenance.reviewedHeadReceiptId===undefined&&facts.capProvenance.reviewedHeadReceiptManifestDigest===undefined,directError}; }
  process.stdout.write(JSON.stringify({ok:true,value}));
} catch(error) { process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error),name:error instanceof Error?error.name:null})); process.exitCode=1; }`;

type Result = {
  ok: boolean;
  value?: Record<string, unknown>;
  error?: string;
  name?: string;
};
function invoke(request: Record<string, unknown>): Result {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    { input: JSON.stringify(request), encoding: 'utf8' },
  );
  if (!result.stdout)
    return { ok: false, error: result.error?.message ?? result.stderr };
  return JSON.parse(result.stdout) as Result;
}
function findHostGit(): string | null {
  const result = spawnSync(
    process.platform === 'win32' ? 'where.exe' : 'which',
    ['git'],
    { shell: false, encoding: 'utf8' },
  );
  const candidate = (result.stdout ?? '').split(/\r?\n/).find(Boolean);
  return result.status === 0 && candidate ? path.resolve(candidate) : null;
}

const hostGit = findHostGit();
const gitIt = hostGit ? it : it.skip;
let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof3c3-'));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('cross-platform CAMP-01 local target authority', () => {
  gitIt(
    'constructs controller-accepted owned/proof records and clean state',
    () => {
      const result = invoke({ action: 'records', root, git: hostGit });
      const value = result.value as {
        base: string;
        ownedTarget: Record<string, unknown>;
        proofTarget: Record<string, unknown>;
        clean: Record<string, unknown>;
        consumerAccepted: boolean;
      };
      expect(result.ok).toBe(true);
      expect(value.ownedTarget).toMatchObject({
        kind: 'owned',
        subject: 'product',
        expectedHead: value.base,
        branchRef: 'refs/heads/codex/owned',
        oldOid: value.base,
        nonReparse: true,
        initiating: false,
      });
      expect(
        (value.ownedTarget.cleanManifest as Array<{ path: string }>).map(
          ({ path: entry }) => entry,
        ),
      ).toEqual([
        'ignored',
        'ignored/nested',
        'ignored/nested/data.bin',
        'loose.txt',
      ]);
      expect(value.proofTarget).toMatchObject({
        kind: 'proof',
        subject: null,
        expectedHead: value.base,
        branchRef: null,
        oldOid: null,
        cleanManifest: [],
      });
      expect(value.clean).toMatchObject({
        headSha: value.base,
        trackedClean: true,
        indexClean: true,
        reparsePaths: [],
        manifest: [],
      });
      expect(value.consumerAccepted).toBe(true);
    },
  );

  gitIt(
    'emits controller-accepted code-unit manifest order for mixed-case siblings',
    () => {
      const result = invoke({ action: 'mixed-case', root, git: hostGit }),
        value = result.value as {
          manifest: Array<{ path: string }>;
          consumerAccepted: boolean;
        };
      expect(result.ok).toBe(true);
      expect(value.manifest.map(({ path: entry }) => entry)).toEqual([
        'ignored',
        'ignored/JSONStream',
        'ignored/JSONStream/LICENSE',
        'ignored/jest',
        'ignored/jest/index.js',
      ]);
      expect(value.consumerAccepted).toBe(true);
    },
  );

  gitIt.each([
    ['unregistered', 'worktree is not registered'],
    ['wrong-head', 'worktree HEAD mismatch'],
    ['nonempty', 'proof location is not empty'],
    ['missing-id', 'worktree identity missing'],
  ])('rejects target identity case %s exactly', (action, message) => {
    expect(invoke({ action, root, git: hostGit })).toEqual({
      ok: false,
      error: `CAMP01_TARGET_INVALID: ${message}`,
      name: 'Camp01TargetError',
    });
  });

  gitIt('requires an owned target to remain branch-attached', () => {
    expect(invoke({ action: 'owned-detached', root, git: hostGit }).error).toBe(
      'CAMP01_TARGET_INVALID: owned worktree must have a branch',
    );
  });

  gitIt.each(['../escape', 'allowed\\nested', 'allowed//nested'])(
    'rejects invalid run-root input %s',
    (runRoot) => {
      expect(
        invoke({ action: 'invalid-run-root', runRoot, root, git: hostGit })
          .error,
      ).toBe('CAMP01_TARGET_INVALID: run root invalid');
    },
  );

  gitIt.each(['inspect', 'create', 'observe', 'facts'])(
    'rejects the %s public input shape before repository mutation',
    (api) => {
      expect(
        invoke({ action: 'invalid-input', api, root, git: hostGit }).error,
      ).toMatch(
        /^CAMP01_TARGET_INVALID: (owned target input invalid|proof target input invalid|clean-state input invalid|target fact input invalid)$/,
      );
    },
  );

  gitIt(
    'rejects a rewritten head that no longer descends from its base',
    () => {
      expect(invoke({ action: 'non-ancestor', root, git: hostGit }).error).toBe(
        'CAMP01_TARGET_INVALID: target head does not descend from base',
      );
    },
  );

  gitIt.each(['1\t2\t../escape\0', 'x\t2\tfile.txt\0', '1\t2\t\0'])(
    'rejects malformed numstat output %j',
    (numstat) => {
      expect(
        invoke({ action: 'invalid-numstat', numstat, root, git: hostGit })
          .error,
      ).toBe('CAMP01_TARGET_INVALID: target diff invalid');
    },
  );

  gitIt('rejects a foreign clone substituted at the recorded path', () => {
    expect(invoke({ action: 'foreign-clone', root, git: hostGit }).error).toBe(
      'CAMP01_TARGET_INVALID: worktree identity drift',
    );
  });

  (process.platform === 'win32' ? it.skip : gitIt)(
    'rejects a POSIX symlink in the target ancestor chain',
    () => {
      expect(
        invoke({ action: 'ancestor-reparse', root, git: hostGit }).error,
      ).toBe('CAMP01_TARGET_INVALID: reparse point present');
    },
  );

  gitIt.each([
    [false, 'tracked worktree is dirty'],
    [true, 'index is dirty'],
  ])('rejects dirty state (index=%s)', (index, message) => {
    expect(invoke({ action: 'dirty', index, root, git: hostGit }).error).toBe(
      `CAMP01_TARGET_INVALID: ${message}`,
    );
  });

  (process.platform === 'win32' ? it.skip : gitIt)(
    'rejects a POSIX symlink in the observed tree',
    () => {
      expect(invoke({ action: 'reparse', root, git: hostGit }).error).toBe(
        'CAMP01_TARGET_INVALID: reparse point present',
      );
    },
  );

  (process.platform === 'win32' ? it.skip : gitIt)(
    'rejects a POSIX symlink at the allowed run-root terminal',
    () => {
      expect(
        invoke({ action: 'run-root-reparse', root, git: hostGit }).error,
      ).toBe('CAMP01_TARGET_INVALID: reparse point present');
    },
  );

  (process.platform === 'win32' ? it.skip : gitIt)(
    'rejects a symlinked proof location before worktree creation',
    () => {
      expect(
        invoke({ action: 'proof-location-reparse', root, git: hostGit }).value,
      ).toEqual({
        error: 'CAMP01_TARGET_INVALID: reparse point present',
        registered: false,
        externalEntries: [],
      });
    },
  );

  gitIt(
    'derives real numstat counts, binary presence, and canonical digest facts',
    () => {
      const result = invoke({ action: 'facts', root, git: hostGit }),
        cap = result.value?.capProvenance as Record<string, unknown>;
      const manifest = [
        { path: 'JSONStream.dat', added: null, deleted: null, binary: true },
        { path: 'base.txt', added: 1, deleted: 0, binary: false },
        { path: 'jest.txt', added: 2, deleted: 0, binary: false },
      ];
      expect(result.ok).toBe(true);
      expect(cap).toMatchObject({
        subject: 'product-pr',
        baseSha: result.value?.baseSha,
        headSha: result.value?.headSha,
        fileCount: 3,
        changedLineCount: 3,
        binaryEntries: true,
        changedTreeManifestDigest:
          'sha256:' +
          createHash('sha256')
            .update(JSON.stringify(manifest) + '\n')
            .digest('hex'),
      });
      expect(result.value?.placeholderKeys).toEqual([
        'subject',
        'baseSha',
        'headSha',
        'fileCount',
        'changedLineCount',
        'binaryEntries',
        'changedTreeManifestDigest',
        'reviewedHeadReceiptId',
        'reviewedHeadReceiptManifestDigest',
      ]);
      expect(result.value?.placeholdersAbsent).toBe(true);
      expect(result.value?.directError).toContain('reviewed cap linkage drift');
    },
  );
});

(process.platform === 'win32' ? describe : describe.skip)(
  'windows-only CAMP-01 reparse authority',
  () => {
    gitIt('rejects a directory junction in the observed tree', () => {
      expect(
        invoke({ action: 'reparse', junction: true, root, git: hostGit }).error,
      ).toBe('CAMP01_TARGET_INVALID: reparse point present');
    });

    gitIt('rejects a junction at the allowed run-root terminal', () => {
      expect(
        invoke({
          action: 'run-root-reparse',
          junction: true,
          root,
          git: hostGit,
        }).error,
      ).toBe('CAMP01_TARGET_INVALID: reparse point present');
    });

    gitIt('rejects a junction proof location before worktree creation', () => {
      expect(
        invoke({
          action: 'proof-location-reparse',
          junction: true,
          root,
          git: hostGit,
        }).value,
      ).toEqual({
        error: 'CAMP01_TARGET_INVALID: reparse point present',
        registered: false,
        externalEntries: [],
      });
    });

    gitIt('rejects a junction in the target ancestor chain', () => {
      expect(
        invoke({
          action: 'ancestor-reparse',
          junction: true,
          root,
          git: hostGit,
        }).error,
      ).toBe('CAMP01_TARGET_INVALID: reparse point present');
    });
  },
);

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const url = (file: string): string => pathToFileURL(path.resolve(file)).href;
const harness = String.raw`
import fs from 'node:fs'; import path from 'node:path';
  import * as cleanup from ${JSON.stringify(url('scripts/qc/camp01-cleanup-authority.mjs'))}; import * as target from ${JSON.stringify(url('scripts/qc/camp01-target-authority.mjs'))}; import * as trust from ${JSON.stringify(url('scripts/qc/camp01-git-trust.mjs'))}; import * as controller from ${JSON.stringify(url('scripts/qc/run-camp01-authority-receipt.mjs'))}; import { WAVE_CONTRACTS } from ${JSON.stringify(url('scripts/qc/camp01-authority-receipt.contract.mjs'))}; import { digestBytes } from ${JSON.stringify(url('scripts/qc/camp01-authority-receipt.schemas.mjs'))};
  const q=JSON.parse(fs.readFileSync(0,'utf8')), root=q.root, git={executable:q.git}, repo=path.join(root,'repo'), owned=path.join(root,'owned'), proofs=path.join(root,'proofs'), cleanupRoot=path.join(repo,'.sisyphus','evidence','playtest','.camp01-cleanups'), manifestBytes=Buffer.from('{"schema":"test"}\n'), digest=digestBytes(manifestBytes), runId='camp01-'+'b'.repeat(32), calls=[], validatorInputs=[], receiptPath=path.join(cleanupRoot,'camp-proof-'+runId+'-wave-cleanup.json'), stagePath=path.join(cleanupRoot,'.camp-proof-'+runId+'-wave-cleanup.json.stage');
const run=(args,cwd=repo)=>trust.invokeGit({git,args:args[0]==='merge'?['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid',...args]:args,cwd}); const commit=async(message,cwd=repo)=>{await run(['add','.'],cwd);await run(['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid','commit','-m',message],cwd);return (await run(['rev-parse','HEAD'],cwd)).stdout.trim();};
  async function seed(reproduction=false){fs.mkdirSync(repo);await run(['init','--initial-branch=main']);fs.writeFileSync(path.join(repo,'.gitignore'),'.sisyphus/\nignored/\n');fs.writeFileSync(path.join(repo,'base.txt'),'base\n');const base=await commit('base');let ownedTarget=null,productHead=null;if(!reproduction){await run(['worktree','add','-b','codex/camp-proof',owned,base]);ownedTarget=await target.inspectOwnedTarget({wave:'camp-proof',subject:'product',worktree:owned,spec:{mergeSha:base},row:WAVE_CONTRACTS['camp-proof'],headSha:base},{git});fs.appendFileSync(path.join(owned,'base.txt'),'product\n');productHead=await commit('product',owned);await run(['merge','--no-ff','codex/camp-proof','-m','merge']);}const main=(await run(['rev-parse','HEAD'])).stdout.trim(), initiatingRaw=await target.inspectOwnedTarget({wave:'camp-proof',subject:'product',worktree:repo,spec:{mergeSha:main},row:WAVE_CONTRACTS['camp-proof'],headSha:main},{git}), initiatingTarget={...initiatingRaw,initiating:true}, runRoot='.sisyphus/evidence/playtest/camp-proof-'+main;fs.mkdirSync(proofs);const proofTarget=await target.createProofTarget({wave:'camp-proof',sha:main,mode:'exact-main'},{git,repositoryRoot:repo,proofRoot:proofs}), clean=await target.observeCleanState({target:proofTarget,phase:'final',runRoot},{git}), durable=path.join(repo,...runRoot.split('/'),runId);fs.mkdirSync(durable,{recursive:true});fs.writeFileSync(path.join(durable,'receipt-manifest.json'),manifestBytes);fs.mkdirSync(cleanupRoot,{recursive:true});const spec={childChange:'add-camp01-authority-receipts',prNumber:'1',mergeSha:base,approvalId:'approval-1',reviewer:'reviewer'}, provenance={subject:reproduction?'none':'product-pr',spec,owned:reproduction?null:{kind:'product',prNumber:'2',headSha:productHead,approvalId:'approval-2',reviewer:'reviewer',mergeSha:main}}, runRecord={mode:'exact-main',phase:'final',sha:main,runRoot,provenance,proofTarget,cleanManifest:{baseline:clean.manifest,final:clean.manifest,matched:true},executionEnvironmentDigest:digest,runId,receiptDigest:digest,transientValidated:true,durableValidated:true}, state={schema:'camp01-controller-state/v1',wave:'camp-proof',rowDigest:digest,repairSource:null,registration:{subject:reproduction?'none':'product-pr',spec,recordedAt:reproduction?'proof':'register-pr-target'},ownedTarget,proofTarget,runs:[runRecord],lifecycle:'receipt-validated'};return {base,main,ownedTarget,proofTarget,initiatingTarget,runRecord,state};}
const exists=(value)=>fs.existsSync(value); const exactSet=(left,right)=>JSON.stringify([...left].sort())===JSON.stringify([...right].sort()); const errorText=(error)=>error instanceof Error?error.message:String(error);
  let proofPath=null, expectedBranchOid=null; try {let value; if(q.action.startsWith('orphan')){const seeded=await seed(true), other=q.action==='orphan-unrecorded'?await target.createProofTarget({wave:'camp-00',sha:seeded.main,mode:'exact-main'},{git,repositoryRoot:repo,proofRoot:proofs}):seeded.proofTarget, beforeMutation=async()=>{if(q.action==='orphan-race')await run(['switch','-c','codex/orphan-race'],other.canonicalPath);}, authority=cleanup.createCleanupAuthority({git,initiatingTarget:seeded.initiatingTarget,cleanupRoot,failedCreationTargets:[seeded.proofTarget]},{beforeMutation});proofPath=other.canonicalPath;value=await authority.recoverFailedCreation({target:other});value={value,exists:exists(other.canonicalPath)};} else {const seeded=await seed(q.action==='reproduction'||q.action==='reproduction-ref'), state=structuredClone(seeded.state), runRecord=state.runs[0];proofPath=seeded.proofTarget.canonicalPath;if(q.action==='run-identity')runRecord[q.field]=q.field==='sha'?seeded.base:q.value;if(q.action==='unsafe')Object.assign(runRecord,q.shape);if(q.action==='unrecorded')state.proofTarget={...state.proofTarget,gitWorktreeId:path.join(root,'unrecorded')};if(q.action==='dirty'||q.action==='index'){fs.appendFileSync(path.join(owned,'base.txt'),'dirty\n');if(q.action==='index')await run(['add','base.txt'],owned);}if(q.action==='manifest'){fs.mkdirSync(path.join(owned,'ignored'));fs.writeFileSync(path.join(owned,'ignored','drift'),'drift');}if(q.action==='initiating')state.ownedTarget=seeded.initiatingTarget;if(q.action==='durable')state.proofTarget={...state.proofTarget,canonicalPath:cleanupRoot};if(q.action==='reparse'){const external=path.join(root,'external');fs.mkdirSync(external);fs.symlinkSync(external,path.join(seeded.proofTarget.canonicalPath,'escape'),q.junction?'junction':'dir');}if(q.action==='evidence-reparse'){const external=path.join(root,'evidence-external');fs.mkdirSync(external);fs.symlinkSync(external,path.join(repo,'.sisyphus','evidence','playtest','accumulated-link'),process.platform==='win32'?'junction':'dir');}
    if(q.action==='missing-owned-record')state.ownedTarget=null;if(q.action==='missing-proof-target')await run(['worktree','remove',seeded.proofTarget.canonicalPath]);if(q.action==='binding-drift')state.ownedTarget.oldOid=seeded.main;if(q.action==='basename-drift')state.wave='wrong-wave';if(q.action==='digest-drift')fs.writeFileSync(path.join(repo,...runRecord.runRoot.split('/'),runId,'receipt-manifest.json'),'drift');if(q.action==='reproduction-ref')await run(['branch','codex/camp-proof',seeded.main]);if(q.action==='initiating-dirty')fs.appendFileSync(path.join(repo,'base.txt'),'dirty\n');if(q.action==='receipt-collision')fs.writeFileSync(receiptPath,'collision');if(q.action==='unmerged'){fs.appendFileSync(path.join(owned,'base.txt'),'unmerged\n');runRecord.provenance.owned.headSha=await commit('unmerged',owned);}if(q.action==='branch-oid-drift'){fs.appendFileSync(path.join(owned,'base.txt'),'advanced\n');expectedBranchOid=await commit('advance owned branch',owned);} const beforeMutation=async()=>{if(q.action==='path-race'){fs.renameSync(seeded.proofTarget.canonicalPath,seeded.proofTarget.canonicalPath+'-moved');proofPath=seeded.proofTarget.canonicalPath+'-moved';}if(q.action==='head-race')await run(['checkout','--detach',seeded.base],seeded.proofTarget.canonicalPath);if(q.action==='branch-state')await run(['switch','-c','codex/substitute'],seeded.proofTarget.canonicalPath);if(q.action==='ref-race')await run(['branch','-m','codex/camp-proof','codex/renamed'],owned);}, invokePublicValidator=async(input)=>{if(!exactSet(Object.keys(input),['entry','stage','wave','mode','sha','runRoot','runId']))throw new Error('validator payload drift');validatorInputs.push(input);calls.push('validate:'+input.stage);if(q.action==='validator-fail')throw new Error('reopen rejected');if(q.action==='validator-shape')return q.validatorValue;return {validated:true};}, invokeGit=async(input,deps)=>{calls.push(input.args.join(' '));if(q.action==='silent-remove'&&input.args[0]==='worktree'&&input.args[1]==='remove'&&input.args[2]===seeded.proofTarget.canonicalPath)return {status:0,stdout:'',stderr:''};if(q.action==='oid-race'&&input.args[0]==='update-ref')await trust.invokeGit({git,args:['update-ref',input.args[2],seeded.base],cwd:repo});const result=await trust.invokeGit(input,deps);if(q.action==='porcelain-missing'&&input.args.join(' ')==='worktree list --porcelain -z')return {...result,stdout:result.stdout.replace('branch refs/heads/codex/camp-proof\0','')};return result;}; let unlinkFaulted=false, cleanupFs={...fs}; if(q.action==='fs-write-fault')cleanupFs.writeFileSync=()=>{throw new Error('write fault');};if(q.action==='fs-link-fault')cleanupFs.linkSync=()=>{throw new Error('link fault');};if(q.action==='fs-unlink-fault')cleanupFs.unlinkSync=(value)=>{if(!unlinkFaulted&&value===stagePath){unlinkFaulted=true;throw new Error('unlink fault');}return fs.unlinkSync(value);};const authority=cleanup.createCleanupAuthority({git,initiatingTarget:seeded.initiatingTarget,cleanupRoot,failedCreationTargets:[]},{beforeMutation,fs:cleanupFs,invokeGit,invokePublicValidator});
  if(q.action==='happy'){let stored=state;value=await controller.runController(['cleanup','--wave=camp-proof','--run-root='+runRecord.runRoot,'--run-id='+runId,'--receipt-digest='+digest],{stateStore:{load:()=>stored,save:()=>{},remove:()=>{stored=null;}},cleanupTargets:authority.cleanupTargets});const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));value={result:value,receipt,calls,validatorInputs,run:runRecord,proofExists:exists(seeded.proofTarget.canonicalPath),ownedExists:exists(owned),stored};}else value=await authority.cleanupTargets({state,run:runRecord});}
  process.stdout.write(JSON.stringify({ok:true,value}));
  } catch(error){const branchPreserved=expectedBranchOid===null?null:(await run(['show-ref','--verify','--hash','refs/heads/codex/camp-proof'])).stdout.trim()===expectedBranchOid;process.stdout.write(JSON.stringify({ok:false,error:errorText(error),name:error instanceof Error?error.name:null,calls,proofExists:proofPath===null?null:exists(proofPath),receiptExists:exists(receiptPath),stageExists:exists(stagePath),branchPreserved}));process.exitCode=1;}`;

type Result = {
  ok: boolean;
  value?: Record<string, unknown>;
  error?: string;
  name?: string;
  calls?: string[];
  proofExists?: boolean | null;
  receiptExists?: boolean;
  stageExists?: boolean;
  branchPreserved?: boolean | null;
};
function invoke(request: Record<string, unknown>): Result {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    {
      input: JSON.stringify(request),
      encoding: 'utf8',
    },
  );
  return result.stdout
    ? (JSON.parse(result.stdout) as Result)
    : { ok: false, error: result.stderr };
}
function findHostGit(): string | null {
  const result = spawnSync(
    process.platform === 'win32' ? 'where.exe' : 'which',
    ['git'],
    { shell: false, encoding: 'utf8' },
  );
  const candidate = result.stdout?.split(/\r?\n/).find(Boolean);
  return result.status === 0 && candidate ? path.resolve(candidate) : null;
}

const hostGit = findHostGit(),
  gitIt = hostGit ? it : it.skip;
let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof3d2-'));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('CAMP-01 cleanup authority', () => {
  gitIt(
    'removes real targets through the controller only after durable validation and writes the cleanup receipt',
    () => {
      const result = invoke({ action: 'happy', root, git: hostGit }),
        value = result.value as Record<string, unknown>,
        run = value.run as Record<string, unknown>;
      expect(result).toEqual({ ok: true, value: expect.anything() });
      expect(value.result).toEqual({
        productWorktreeRemoved: true,
        proofWorktreeRemoved: true,
        localWaveBranchRemoved: true,
        initiatingTrackedTreeClean: true,
        durableReceiptRevalidated: true,
      });
      expect(value.receipt).toEqual({
        schema: 'camp01-cleanup/v1',
        wave: 'camp-proof',
        runId: run.runId,
        receiptDigest: run.receiptDigest,
        ...value.result,
      });
      expect(value).toMatchObject({
        proofExists: false,
        ownedExists: false,
        stored: null,
      });
      expect(value.calls).toEqual(
        expect.arrayContaining([
          'validate:durable',
          expect.stringContaining('worktree remove'),
          expect.stringContaining('update-ref -d refs/heads/codex/camp-proof'),
        ]),
      );
      expect((value.calls as string[])[0]).toBe('validate:durable');
      expect(value.validatorInputs).toEqual([
        {
          entry: expect.stringContaining(
            'validate-camp01-authority-receipt.mjs',
          ),
          stage: 'durable',
          wave: 'camp-proof',
          mode: run.mode,
          sha: run.sha,
          runRoot: run.runRoot,
          runId: run.runId,
        },
      ]);
      expect((value.calls as string[]).join(' ')).not.toMatch(
        /--force|\*|\?|branch -D/,
      );
      expect(value.calls).toContain(
        `update-ref -d refs/heads/codex/camp-proof ${(run.provenance as { owned: { headSha: string } }).owned.headSha}`,
      );
    },
  );

  gitIt(
    'treats reproduction ownership predicates as vacuous only for an absent record',
    () => {
      expect(
        invoke({ action: 'reproduction', root, git: hostGit }).value,
      ).toEqual({
        productWorktreeRemoved: true,
        proofWorktreeRemoved: true,
        localWaveBranchRemoved: true,
        initiatingTrackedTreeClean: true,
        durableReceiptRevalidated: true,
      });
    },
  );

  gitIt(
    'excludes the canonical initiating evidence tree from reparse scans',
    () => {
      expect(
        invoke({ action: 'evidence-reparse', root, git: hostGit }).value,
      ).toEqual({
        productWorktreeRemoved: true,
        proofWorktreeRemoved: true,
        localWaveBranchRemoved: true,
        initiatingTrackedTreeClean: true,
        durableReceiptRevalidated: true,
      });
    },
  );

  gitIt.each([
    ['basename-drift', 'proof target basename drift'],
    ['branch-state', 'proof target detachment drift'],
  ])('rejects proof identity binding drift %s', (action, message) => {
    expect(invoke({ action, root, git: hostGit })).toMatchObject({
      ok: false,
      error: `CAMP01_CLEANUP_INVALID: ${message}`,
      proofExists: true,
    });
  });

  gitIt('rejects durable manifest digest drift before removal', () => {
    expect(
      invoke({ action: 'digest-drift', root, git: hostGit }),
    ).toMatchObject({
      ok: false,
      error: 'CAMP01_CLEANUP_INVALID: durable receipt digest drift',
      proofExists: true,
    });
  });

  gitIt.each([
    ['durableValidated', false],
    ['mode', 'reviewed-head'],
    ['phase', 'observation'],
    ['sha', 'base'],
    ['receiptDigest', 'malformed'],
  ])('rejects cleanup run identity drift in %s', (field, value) => {
    expect(
      invoke({ action: 'run-identity', field, value, root, git: hostGit }),
    ).toMatchObject({
      ok: false,
      error: 'CAMP01_CLEANUP_INVALID: cleanup receipt identity drift',
    });
  });

  gitIt('rejects a recorded no-owned state when the wave branch exists', () => {
    const result = invoke({ action: 'reproduction-ref', root, git: hostGit });
    expect(result).toMatchObject({
      ok: false,
      error: 'CAMP01_CLEANUP_INVALID: unowned local wave branch exists',
      proofExists: true,
    });
    expect(
      result.calls?.filter(
        (call) => call === 'show-ref --verify refs/heads/codex/camp-proof',
      ),
    ).toHaveLength(1);
  });

  gitIt.each([
    { force: true },
    { glob: '*' },
    { prefix: 'codex/' },
    { recursive: true },
  ])('rejects unsafe deletion-shaped input %j', (shape) => {
    expect(
      invoke({ action: 'unsafe', shape, root, git: hostGit }),
    ).toMatchObject({
      ok: false,
      error: 'CAMP01_CLEANUP_INVALID: unsafe cleanup input',
      name: 'Camp01CleanupError',
    });
  });

  gitIt.each([
    ['unrecorded', 'proof target record drift'],
    ['dirty', 'owned target tracked state drift'],
    ['index', 'owned target index state drift'],
    ['manifest', 'owned target manifest drift'],
    ['initiating', 'initiating cleanup target rejected'],
    ['durable', 'durable cleanup target rejected'],
    ['missing-owned-record', 'owned target record absent'],
    ['missing-proof-target', 'proof target path drift'],
    ['binding-drift', 'owned target record drift'],
    ['initiating-dirty', 'initiating target tracked state drift'],
    ['receipt-collision', 'cleanup receipt collision'],
    ['unmerged', 'local branch is unmerged'],
  ])('rejects P.4 target case %s exactly', (action, message) => {
    expect(invoke({ action, root, git: hostGit }).error).toBe(
      `CAMP01_CLEANUP_INVALID: ${message}`,
    );
  });

  gitIt.each([
    ['path-race', 'proof target path drift', true],
    ['head-race', 'proof target HEAD drift', true],
    ['ref-race', 'local branch ref drift', true],
    ['oid-race', 'local branch OID race', false],
  ])('rejects mutation race %s exactly', (action, message, proofExists) => {
    expect(invoke({ action, root, git: hostGit })).toMatchObject({
      ok: false,
      error: `CAMP01_CLEANUP_INVALID: ${message}`,
      proofExists,
      receiptExists: false,
      stageExists: false,
    });
  });

  gitIt('rejects and preserves an advanced owned wave branch', () => {
    expect(
      invoke({ action: 'branch-oid-drift', root, git: hostGit }),
    ).toMatchObject({
      ok: false,
      error: 'CAMP01_CLEANUP_INVALID: local branch OID drift',
      branchPreserved: true,
      proofExists: true,
    });
  });

  gitIt(
    'fails closed before removal when durable reopen validation fails',
    () => {
      const result = invoke({ action: 'validator-fail', root, git: hostGit });
      expect(result.error).toBe(
        'CAMP01_CLEANUP_INVALID: durable receipt revalidation failed',
      );
      expect(result.calls).toEqual(['validate:durable']);
      expect(result).toMatchObject({
        receiptExists: false,
        stageExists: false,
      });
    },
  );

  gitIt.each([
    null,
    {},
    { validated: false },
    { validated: true, extra: true },
  ])(
    'rejects malformed durable validator result %j before removal',
    (validatorValue) => {
      expect(
        invoke({
          action: 'validator-shape',
          validatorValue,
          root,
          git: hostGit,
        }),
      ).toMatchObject({
        ok: false,
        error: 'CAMP01_CLEANUP_INVALID: durable receipt revalidation failed',
        proofExists: true,
        receiptExists: false,
      });
    },
  );

  gitIt(
    'rejects an owned worktree record with missing porcelain branch data',
    () => {
      expect(
        invoke({ action: 'porcelain-missing', root, git: hostGit }),
      ).toMatchObject({
        ok: false,
        error: 'CAMP01_CLEANUP_INVALID: owned target branch ref drift',
        proofExists: true,
        receiptExists: false,
      });
    },
  );

  gitIt(
    'rejects a Git removal that silently leaves the proof worktree live',
    () => {
      expect(
        invoke({ action: 'silent-remove', root, git: hostGit }),
      ).toMatchObject({
        ok: false,
        error: 'CAMP01_CLEANUP_INVALID: proof worktree removal incomplete',
        proofExists: true,
        receiptExists: false,
      });
    },
  );

  gitIt.each([
    ['fs-write-fault', 'cleanup receipt staging failed', true],
    ['fs-link-fault', 'cleanup receipt publication failed', false],
    ['fs-unlink-fault', 'cleanup receipt publication failed', false],
  ])(
    'fails closed on cleanup filesystem fault %s',
    (action, message, proofExists) => {
      expect(invoke({ action, root, git: hostGit })).toMatchObject({
        ok: false,
        error: `CAMP01_CLEANUP_INVALID: ${message}`,
        proofExists,
        receiptExists: false,
        stageExists: false,
      });
    },
  );

  (process.platform === 'win32' ? it.skip : gitIt)(
    'rejects a POSIX reparse target',
    () => {
      expect(invoke({ action: 'reparse', root, git: hostGit }).error).toBe(
        'CAMP01_CLEANUP_INVALID: proof target reparse drift',
      );
    },
  );

  gitIt('recovers the creation-recorded detached orphan', () => {
    expect(invoke({ action: 'orphan', root, git: hostGit }).value).toEqual({
      value: { proofWorktreeRemoved: true },
      exists: false,
    });
  });

  gitIt('reinspects live orphan Git state after the mutation hook', () => {
    expect(invoke({ action: 'orphan-race', root, git: hostGit })).toMatchObject(
      {
        ok: false,
        error: 'CAMP01_CLEANUP_INVALID: proof target detachment drift',
        name: 'Camp01CleanupError',
        proofExists: true,
      },
    );
  });

  gitIt('rejects an unrecorded failed-creation worktree', () => {
    expect(
      invoke({ action: 'orphan-unrecorded', root, git: hostGit }).error,
    ).toBe('CAMP01_CLEANUP_INVALID: failed-creation target is unrecorded');
  });
});

(process.platform === 'win32' ? describe : describe.skip)(
  'Windows CAMP-01 cleanup reparse authority',
  () => {
    gitIt('rejects a junction target', () => {
      expect(
        invoke({ action: 'reparse', junction: true, root, git: hostGit }).error,
      ).toBe('CAMP01_CLEANUP_INVALID: proof target reparse drift');
    });
  },
);

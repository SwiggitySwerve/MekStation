import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

// Resolves ESM QC modules for the isolated child-process harness.
const moduleUrl = (file: string): string =>
  pathToFileURL(path.resolve(file)).href;
const harness = String.raw`
import { spawnSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { selectEnvelopeAnchor } from ${JSON.stringify(moduleUrl('scripts/qc/run-camp01-live-adversarial.mjs'))};
import { invokeGit, createBareSession, Camp01GitError } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-git-trust.mjs'))};
import { resolveFetchedMainOid } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-durable-facts.mjs'))};
const q=JSON.parse(fs.readFileSync(0,'utf8')), git={executable:q.git}, root=q.root;
const run=(cwd,args)=>invokeGit({git,args,cwd}), out=async(cwd,args)=>(await run(cwd,args)).stdout.trim();
const ident=['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid'];
async function commit(cwd,name){fs.writeFileSync(path.join(cwd,name),name+'\n');await run(cwd,['add','.']);await run(cwd,[...ident,'commit','-m',name]);return out(cwd,['rev-parse','HEAD']);}
let fixture;
try {
  const source=path.join(root,'source'), checkout=path.join(root,'checkout');
  let session=path.join(root,'session.git');
  fs.mkdirSync(source); await run(source,['init','--initial-branch=main']);
  const head=await commit(source,'head'), main=await commit(source,'main');
  await run(source,['branch','old',head]);
  const sourceUrl=pathToFileURL(source).href;
  const divergent=q.scenario.startsWith('divergent-');
  if(divergent){
    await run(source,['checkout','-b','divergent',head]);
    await commit(source,'branch');
    await run(source,['checkout','main']);
    // A file URL makes --depth effective; production fetches main, not this branch.
    await run(root,['clone','--depth','1','--branch','divergent',sourceUrl,checkout]);
    const fetched=await resolveFetchedMainOid({wave:'live-probe',sha:await out(checkout,['rev-parse','HEAD']),mode:'exact-main'},git,{
      sessionDirectory:session,testOnlyRemoteUrl:sourceUrl,testOnlyAllowLocalRemote:true,
      fetchGitHubResource:async({resource,parameters})=>{
        if(resource!=='branch'||parameters.branch!=='main')throw new Error('unexpected metadata lookup');
        return {name:'main',commit:{sha:main}};
      },
    });
    if(fetched!==main)throw new Error('fixture main pin drift');
    if(q.scenario==='divergent-with-head')await run(session,['fetch','--no-tags',sourceUrl,'+refs/heads/divergent:refs/camp01/test-branch']);
    if(q.scenario==='divergent-missing-main'){
      session=path.join(root,'empty-session.git');
      await createBareSession({git,directory:session});
    }
  }else{
    await run(root,['clone','--bare',sourceUrl,session]);
    if(['main-moved','tampered-tree','session-tree-drift'].includes(q.scenario)) await run(root,['clone','--depth','1','--branch','old',sourceUrl,checkout]);
    else if(q.scenario==='head-is-main') await run(root,['clone','--depth','1','--branch','main',sourceUrl,checkout]);
    else { await run(root,['clone',sourceUrl,checkout]); await commit(checkout,'dev'); }
  }
  const initiatingHeadSha=await out(checkout,['rev-parse','--verify','HEAD^{commit}']);
  const initiatingTreeSha=['tampered-tree','divergent-tampered-tree'].includes(q.scenario)?'f'.repeat(40):await out(checkout,['rev-parse','--verify','HEAD^{tree}']);
  if(divergent){
    const exists=async(cwd,sha)=>{try{await out(cwd,['rev-parse','--verify',sha+'^{commit}']);return true;}catch(error){if(!(error instanceof Camp01GitError))throw error;return false;}};
    fixture={shallow:await out(checkout,['rev-parse','--is-shallow-repository'])==='true',mainInCheckout:await exists(checkout,main),headInSession:await exists(session,initiatingHeadSha),mainInSession:await exists(session,main),mainTree:await out(source,['rev-parse',main+'^{tree}']),authorityTreeDriftSeen:false,authorityGitFailureSeen:false};
  }
  // Git hashes commits, so no honest repository can disagree with its clone about one SHA's tree, and the hardened
  // invokeGit ignores replace refs. The session-drift row therefore forges only the session repo's tree answer.
  const sessionGitDependencies={spawn:(exe,argv,opts)=>{
    const r=spawnSync(exe,argv,opts);
    if(path.resolve(opts.cwd)!==path.resolve(session)||!argv.includes('rev-parse'))return r;
    if(q.scenario==='session-tree-drift'&&argv.some(a=>a.endsWith('^{tree}')))return {...r,stdout:'f'.repeat(40)};
    if(q.scenario==='divergent-session-tree-drift'&&argv.includes(main+'^{tree}')){
      fixture.authorityTreeDriftSeen=true;return {...r,stdout:'f'.repeat(40)};
    }
    if(q.scenario==='divergent-session-git-failure'&&argv.includes(main+'^{commit}')){
      fixture.authorityGitFailureSeen=true;return {...r,status:128,stdout:'',stderr:'injected session authority read failure'};
    }
    return r;
  }};
  const value=await selectEnvelopeAnchor({git,initiatingRoot:checkout,sessionDirectory:session,initiatingHeadSha,initiatingTreeSha,fetchedMainOid:main,sessionGitDependencies,fetchCheckRuns:async()=>{throw new Error('unexpected check-run lookup');}});
  process.stdout.write(JSON.stringify({ok:true,value,head,main,...fixture?{fixture}:{}}));
} catch(error){process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error),...fixture?{fixture}:{}}));process.exitCode=1;}`;

type Result = {
  readonly ok: boolean;
  readonly value?: {
    anchorSha: string;
    anchorTreeSha: string;
    anchorSource: string;
  };
  readonly head?: string;
  readonly main?: string;
  readonly error?: string;
  readonly fixture?: {
    shallow: boolean;
    mainInCheckout: boolean;
    headInSession: boolean;
    mainInSession: boolean;
    mainTree: string;
    authorityTreeDriftSeen: boolean;
    authorityGitFailureSeen: boolean;
  };
};

// Finds the host Git executable required by the real-repository rows.
function findHostGit(): string | null {
  const result = spawnSync(
    process.platform === 'win32' ? 'where.exe' : 'which',
    ['git'],
    { shell: false, encoding: 'utf8' },
  );
  const candidate = result.stdout?.split(/\r?\n/).find(Boolean);
  return result.status === 0 && candidate ? path.resolve(candidate) : null;
}

// Runs one scenario in a fresh child process and fixture so Git state cannot leak between rows.
function invoke(scenario: string): Result {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-envelope-anchor-'));
  try {
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '--eval', harness],
      {
        input: JSON.stringify({ scenario, root, git: hostGit }),
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
        timeout: 60000,
      },
    );
    return result.stdout
      ? (JSON.parse(result.stdout) as Result)
      : { ok: false, error: result.stderr };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const hostGit = findHostGit(),
  gitIt = hostGit ? it : it.skip;

describe('CAMP-01 live probe envelope anchor selection', () => {
  gitIt.each(['divergent-main-only', 'divergent-with-head'])(
    'proves fetched main for a divergent depth-1 branch (%s)',
    (scenario) => {
      const result = invoke(scenario);
      expect(result).toMatchObject({ ok: true });
      expect(result.fixture).toMatchObject({
        shallow: true,
        mainInCheckout: false,
        mainInSession: true,
        headInSession: scenario === 'divergent-with-head',
      });
      expect(result.value).toEqual({
        anchorSha: result.main,
        anchorTreeSha: result.fixture?.mainTree,
        anchorSource: 'fetched-main',
      });
    },
  );

  gitIt('rejects a divergent initiating tree before fallback', () => {
    expect(invoke('divergent-tampered-tree')).toMatchObject({
      ok: false,
      error: 'CAMP01_FACTS_INVALID: anchor tree drift',
      fixture: {
        authorityTreeDriftSeen: false,
        authorityGitFailureSeen: false,
      },
    });
  });

  gitIt('rejects fetched-main tree drift in the session authority', () => {
    expect(invoke('divergent-session-tree-drift')).toMatchObject({
      ok: false,
      error: 'CAMP01_FACTS_INVALID: anchor tree drift',
      fixture: { authorityTreeDriftSeen: true },
    });
  });

  gitIt('rejects a failed session authority commit read', () => {
    expect(invoke('divergent-session-git-failure')).toMatchObject({
      ok: false,
      error: 'CAMP01_FACTS_INVALID: anchor commit unresolvable',
      fixture: { authorityGitFailureSeen: true },
    });
  });

  gitIt('rejects a session missing the selected main commit', () => {
    expect(invoke('divergent-missing-main')).toMatchObject({
      ok: false,
      error: expect.stringMatching(/^CAMP01_GIT_INVALID:/),
      fixture: { shallow: true, mainInCheckout: false, mainInSession: false },
    });
  });

  gitIt('anchors a head that equals fetched main', () => {
    // Given a depth-1 checkout at main, when the anchor is selected, then HEAD is the anchor.
    const result = invoke('head-is-main');
    expect(result).toMatchObject({ ok: true });
    expect(result.value).toEqual({
      anchorSha: result.main,
      anchorTreeSha: expect.any(String),
      anchorSource: 'initiating-head',
    });
  });

  gitIt('anchors HEAD when main advanced after a depth-1 checkout', () => {
    // Given fetched main newer than a depth-1 HEAD that does not hold main's objects,
    // when the anchor is selected, then HEAD (an ancestor of main) is still the genuine anchor.
    const result = invoke('main-moved');
    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({
      anchorSha: result.head,
      anchorSource: 'initiating-head',
    });
  });

  gitIt('rejects a supplied tree that does not match the checkout HEAD', () => {
    // Given a supplied tree that differs from the checkout's own HEAD tree, when the anchor is selected,
    // then the checkout-bound authority rejects it before any reachability or session check runs.
    expect(invoke('tampered-tree')).toEqual({
      ok: false,
      error: 'CAMP01_FACTS_INVALID: anchor tree drift',
    });
  });

  gitIt(
    're-proves HEAD against the session repo and rejects its tree drift',
    () => {
      // Given main advanced past a depth-1 checkout and a session repo that reports a different tree for HEAD,
      // when the anchor is selected, then the session-bound re-proof (the only check reaching the session tree) rejects it.
      expect(invoke('session-tree-drift')).toEqual({
        ok: false,
        error: 'CAMP01_FACTS_INVALID: anchor tree drift',
      });
    },
  );

  gitIt('falls back to fetched main for a dev head ahead of main', () => {
    // Given a full checkout whose HEAD is not an ancestor of fetched main,
    // when the anchor is selected, then the existing fetched-main fallback still applies.
    const result = invoke('dev-ahead');
    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({
      anchorSha: result.main,
      anchorSource: 'fetched-main',
    });
  });
});

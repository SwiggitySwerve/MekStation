import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

// Resolves ESM QC modules for the isolated child-process harness.
const moduleUrl = (file: string): string =>
  pathToFileURL(path.resolve(file)).href;
const harness = String.raw`
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { selectEnvelopeAnchor } from ${JSON.stringify(moduleUrl('scripts/qc/run-camp01-live-adversarial.mjs'))};
import { invokeGit } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-git-trust.mjs'))};
const q=JSON.parse(fs.readFileSync(0,'utf8')), git={executable:q.git}, root=q.root;
const run=(cwd,args)=>invokeGit({git,args,cwd}), out=async(cwd,args)=>(await run(cwd,args)).stdout.trim();
const ident=['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid'];
async function commit(cwd,name){fs.writeFileSync(path.join(cwd,name),name+'\n');await run(cwd,['add','.']);await run(cwd,[...ident,'commit','-m',name]);return out(cwd,['rev-parse','HEAD']);}
try {
  const source=path.join(root,'source'), checkout=path.join(root,'checkout'), session=path.join(root,'session.git');
  fs.mkdirSync(source); await run(source,['init','--initial-branch=main']);
  const head=await commit(source,'head'), main=await commit(source,'main');
  await run(source,['branch','old',head]);
  const sourceUrl=pathToFileURL(source).href;
  // The session is the probe's own full-history fetch of main; the checkout is what CI hands the probe.
  await run(root,['clone','--bare',sourceUrl,session]);
  if(q.scenario==='main-moved'||q.scenario==='tampered-tree') await run(root,['clone','--depth','1','--branch','old',sourceUrl,checkout]);
  else if(q.scenario==='head-is-main') await run(root,['clone','--depth','1','--branch','main',sourceUrl,checkout]);
  else { await run(root,['clone',sourceUrl,checkout]); await commit(checkout,'dev'); }
  const initiatingHeadSha=await out(checkout,['rev-parse','--verify','HEAD^{commit}']);
  const initiatingTreeSha=q.scenario==='tampered-tree'?'f'.repeat(40):await out(checkout,['rev-parse','--verify','HEAD^{tree}']);
  const value=await selectEnvelopeAnchor({git,initiatingRoot:checkout,sessionDirectory:session,initiatingHeadSha,initiatingTreeSha,fetchedMainOid:main,fetchCheckRuns:async()=>{throw new Error('unexpected check-run lookup');}});
  process.stdout.write(JSON.stringify({ok:true,value,head,main}));
} catch(error){process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error)}));process.exitCode=1;}`;

type Result = {
  readonly ok: boolean;
  readonly value?: { anchorSha: string; anchorSource: string };
  readonly head?: string;
  readonly main?: string;
  readonly error?: string;
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

  gitIt(
    'still rejects a HEAD whose tree differs from the fetched object',
    () => {
      // Given main advanced and a HEAD tree that does not match the session copy,
      // when the anchor is selected, then verification fails rather than trusting the checkout.
      expect(invoke('tampered-tree')).toEqual({
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

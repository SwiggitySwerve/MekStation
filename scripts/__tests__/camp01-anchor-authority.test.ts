import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

// Resolves ESM QC modules for the isolated child-process harness.
const moduleUrl = (file: string): string =>
  pathToFileURL(path.resolve(file)).href;
const harness = String.raw`
import fs from 'node:fs'; import path from 'node:path';
import { createAnchorAuthority } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-anchor-authority.mjs'))};
import { createDurableFacts } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-durable-facts.mjs'))};
import { canonicalBytes, digestBytes } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-authority-receipt.schemas.mjs'))};
import { invokeGit } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-git-trust.mjs'))};
import { parseNumstat } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-target-authority.mjs'))};
const q=JSON.parse(fs.readFileSync(0,'utf8')), repo=q.root, git={executable:q.git};
// Invokes only the verified Git adapter so tests exercise production argv hardening.
const run=(args)=>invokeGit({git,args,cwd:repo});
// Returns trimmed Git output for deterministic fixture construction.
const output=async(args)=>(await run(args)).stdout.trim();
// Creates one commit while keeping author identity outside ambient Git config.
async function commit(message){await run(['add','.']);await run(['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid','commit','-m',message]);return output(['rev-parse','HEAD']);}
// Seeds related and divergent commits plus the exact target diff under test.
async function seed(){await run(['init','--initial-branch=main']);fs.writeFileSync(path.join(repo,'base.txt'),'base\n');const base=await commit('base');fs.appendFileSync(path.join(repo,'base.txt'),'head\n');fs.writeFileSync(path.join(repo,'change.txt'),'one\ntwo\n');const head=await commit('head');fs.writeFileSync(path.join(repo,'main.txt'),'main\n');const main=await commit('main'), tree=await output(['rev-parse',head+'^{tree}']), divergent=await output(['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid','commit-tree',await output(['rev-parse',base+'^{tree}']),'-m','divergent']), raw=(await run(['diff','--numstat','-z','--no-renames',base,head,'--'])).stdout, manifest=parseNumstat(raw), cap={subject:'product-pr',baseSha:base,headSha:head,fileCount:manifest.length,changedLineCount:manifest.reduce((sum,entry)=>sum+(entry.added??0)+(entry.deleted??0),0),binaryEntries:manifest.some((entry)=>entry.binary),changedTreeManifestDigest:digestBytes(canonicalBytes(manifest)),reviewedHeadReceiptId:null,reviewedHeadReceiptManifestDigest:null};return {base,head,main,tree,divergent,cap};}
// Builds the durable candidate shape consumed by the anchor admission seam.
function record(seeded,mode='reviewed-head',capProvenance=seeded.cap){return {initiatingRoot:repo,command:{sha:seeded.head,treeSha:seeded.tree,mode,capProvenance}};}
// Writes a self-consistent-looking directory that bypasses the injected validator only.
function fabricate(){const sha='f'.repeat(40),runId='camp01-'+'9'.repeat(32),directory=path.join(repo,'.sisyphus','evidence','playtest','camp-proof-'+sha,runId), command={wave:'camp-proof',sha,treeSha:sha,runId,mode:'reviewed-head',provenance:{specTupleId:'tuple-'+'1'.repeat(16),ownedPrTupleId:null,predecessorReceiptIds:[]},capProvenance:null,identityRegistry:{refs:[]}},manifest={wave:'camp-proof',runId,entries:[]};fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,'command-result.json'),canonicalBytes(command));fs.writeFileSync(path.join(directory,'receipt-manifest.json'),canonicalBytes(manifest));}
try {const seeded=await seed(), anchor=createAnchorAuthority({git,cwd:repo}), candidate=record(seeded);let value;
  if(q.action==='happy-a1')value=await anchor(record(seeded,'reviewed-head',null));
  else if(q.action==='happy-a2')value=await anchor(record(seeded,'exact-main'),{fetchedMainOid:seeded.main});
  else if(q.action==='happy-a3')value=await anchor(candidate);
  else if(q.action==='commit')value=await anchor({...candidate,command:{...candidate.command,sha:'f'.repeat(40)}});
  else if(q.action==='tree')value=await anchor({...candidate,command:{...candidate.command,treeSha:'f'.repeat(40)}});
  else if(q.action==='main')value=await anchor({...record(seeded,'exact-main',null),command:{...record(seeded,'exact-main',null).command,sha:seeded.divergent,treeSha:await output(['rev-parse',seeded.divergent+'^{tree}'])}},{fetchedMainOid:seeded.main});
  else if(q.action==='ancestry')value=await anchor({...candidate,command:{...candidate.command,capProvenance:{...seeded.cap,baseSha:seeded.divergent}}});
  else if(q.action==='cap'){const changed=q.field==='changedTreeManifestDigest'?'sha256:'+'f'.repeat(64):q.field==='binaryEntries'?!seeded.cap.binaryEntries:seeded.cap[q.field]+1;value=await anchor({...candidate,command:{...candidate.command,capProvenance:{...seeded.cap,[q.field]:changed}}});}
  else if(q.action==='durable'){fabricate();value=await createDurableFacts({initiatingRoot:repo},{validatorSpawn:()=>({status:0}),anchor}).readIndex();}
  process.stdout.write(JSON.stringify({ok:true,value}));
} catch(error){process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error),name:error instanceof Error?error.name:null}));process.exitCode=1;}`;

type Result = {
  readonly ok: boolean;
  readonly value?: unknown;
  readonly error?: string;
  readonly name?: string;
};

// Finds the host Git executable required by real-repository rows.
function findHostGit(): string | null {
  const result = spawnSync(
    process.platform === 'win32' ? 'where.exe' : 'which',
    ['git'],
    { shell: false, encoding: 'utf8' },
  );
  const candidate = result.stdout?.split(/\r?\n/).find(Boolean);
  return result.status === 0 && candidate ? path.resolve(candidate) : null;
}

// Runs one isolated mutation so Git state cannot leak between rows.
function invoke(action: string, field?: string): Result {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof6a1-'));
  try {
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '--eval', harness],
      {
        input: JSON.stringify({ action, field, root, git: hostGit }),
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

describe('CAMP-01 validation-time Git envelope anchor', () => {
  gitIt.each(['happy-a1', 'happy-a2', 'happy-a3'])(
    'accepts real repository authority class %s',
    (action) => {
      // Given real related commits, when the named authority class runs, then admission succeeds.
      expect(invoke(action)).toEqual({ ok: true, value: true });
    },
  );

  gitIt.each([
    ['commit', 'anchor commit unresolvable'],
    ['tree', 'anchor tree drift'],
    ['main', 'anchor main reachability drift'],
    ['ancestry', 'anchor ancestry drift'],
  ])('rejects %s drift with its stable clause', (action, message) => {
    // Given one mutated Git envelope clause, when anchoring runs, then its exact fact error is retained.
    expect(invoke(action)).toEqual({
      ok: false,
      error: `CAMP01_FACTS_INVALID: ${message}`,
      name: 'Camp01FactsError',
    });
  });

  gitIt.each([
    'fileCount',
    'changedLineCount',
    'binaryEntries',
    'changedTreeManifestDigest',
  ])('rejects tampered cap field %s', (field) => {
    // Given one tampered recomputed cap field, when anchoring runs, then A3 fails exactly.
    expect(invoke('cap', field)).toEqual({
      ok: false,
      error: 'CAMP01_FACTS_INVALID: anchor cap recomputation drift',
      name: 'Camp01FactsError',
    });
  });

  gitIt('rejects a fabricated receipt during durable admission', () => {
    // Given a validator-accepted fabricated directory, when readIndex admits it, then anchoring blocks the push.
    expect(invoke('durable')).toEqual({
      ok: false,
      error: 'CAMP01_FACTS_INVALID: anchor commit unresolvable',
      name: 'Camp01FactsError',
    });
  });
});

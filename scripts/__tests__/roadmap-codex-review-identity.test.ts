/**
 * Native identity and CNI1 sizing regressions. Private fixtures use real Git
 * blobs without changing repository refs, canonical ledgers or old pins.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { z } from 'zod';

const repo = process.cwd();
const ledger = path.join(
  repo,
  'openspec/planning/2026-09-12-roadmap-completion',
);
const validator = path.join(ledger, 'validate-roadmap.mjs');
const receipt = z.object({ path: z.string() }).passthrough();
const archiveRefShape = z.object({
  path: z.string(),
  sha256: z.string(),
  bytes: z.number(),
});
const unitShape = z
  .object({
    id: z.string(),
    node: z.string(),
    state: z.string(),
    ownershipPaths: z.array(z.string()),
    ownershipExceptions: z.array(z.string()),
    sourceSizingRef: z.string().optional(),
    taskKeys: z.array(z.string()),
    reviewClasses: z.array(z.string()),
    caps: z.object({ maxFiles: z.number(), maxNonGeneratedLines: z.number() }),
    stageReceipts: z.record(z.string(), receipt.nullable()),
    baseline: z.string().nullable(),
    prHead: z.string().nullable(),
    mergeSha: z.string().nullable(),
  })
  .passthrough();
const nodeShape = z
  .object({
    id: z.string(),
    ownershipPaths: z.array(z.string()),
    ownershipExceptions: z.array(z.string()),
    sourceSizingRef: z.string().optional(),
  })
  .passthrough();
const roadmapShape = z
  .object({ nodes: z.array(z.object({ id: z.string() }).passthrough()) })
  .passthrough();
const registrationShape = z
  .object({
    grants: z.array(
      z
        .object({
          id: z.string(),
          exactFiles: z.array(z.string()),
          maxFiles: z.number(),
          sourceSizingRef: z.string().optional(),
        })
        .passthrough(),
    ),
    sourceSizing: z
      .object({
        CNI1: z
          .object({
            version: z.number(),
            mode: z.string(),
            targetLines: z.array(z.number()),
            reviewGuidanceLines: z.number(),
            grantRef: z.string(),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

type IUnit = z.infer<typeof unitShape>;
type INode = z.infer<typeof nodeShape>;
type IRegistration = z.infer<typeof registrationShape>;
interface ICall {
  readonly command: readonly string[];
  readonly cwd: string;
  readonly pid: number;
  readonly exit: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly signal?: NodeJS.Signals | null;
  readonly error?: string | null;
  readonly elapsedMs?: number;
}
interface IFixture {
  readonly dir: string;
  readonly git: string;
  readonly roadmap: z.infer<typeof roadmapShape>;
  readonly registration: IRegistration;
  readonly unit: IUnit;
  readonly node: INode;
  readonly calls: ICall[];
}

function json(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function put(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
function inside(base: string, candidate: string): void {
  const relative = path.relative(
    fs.realpathSync(base),
    path.resolve(candidate),
  );
  expect(
    relative && !relative.startsWith('..') && !path.isAbsolute(relative),
  ).toBeTruthy();
}
function git(f: IFixture, args: readonly string[]): string {
  const result = spawnSync('git', args, {
    cwd: f.git,
    encoding: 'utf8',
    timeout: 20000,
    env: {
      ...process.env,
      GIT_DIR: path.join(f.git, '.git'),
      GIT_WORK_TREE: f.git,
    },
  });
  f.calls.push({
    command: ['git', ...args],
    cwd: f.git,
    pid: result.pid,
    exit: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  });
  put(path.join(f.dir, 'commands.json'), f.calls);
  expect(result.status).toBe(0);
  return (result.stdout ?? '').trim();
}
function fixture(): IFixture {
  const temp = fs.realpathSync(os.tmpdir());
  const dir = fs.mkdtempSync(path.join(temp, 'cni1-sizing-'));
  inside(temp, dir);
  fs.mkdirSync(path.join(dir, 'git'));
  const source = z
    .object({ units: z.array(z.object({ id: z.string() }).passthrough()) })
    .parse(json(path.join(ledger, 'units.json')));
  const selectedUnit = source.units.find((value) => value.id === 'CNI1');
  const roadmap = roadmapShape.parse(json(path.join(ledger, 'roadmap.json')));
  const selectedNode = roadmap.nodes.find(
    (value) => value.id === 'R6.cni-source',
  );
  if (!selectedUnit || !selectedNode)
    throw new TypeError('Required canonical CNI1 fixture input absent');
  const unit = unitShape.parse(selectedUnit);
  const node = nodeShape.parse(selectedNode);
  roadmap.nodes = roadmap.nodes.map((value) =>
    value.id === node.id ? node : value,
  );
  // Mutations below are deliberate fixture setup, never canonical ledger edits.
  unit.taskKeys = [];
  unit.reviewClasses = ['routine'];
  for (const name of [
    'DELIVERY.md',
    'WORKERS.md',
    'README.md',
    'PROGRESS.md',
    'GOAL.md',
  ]) {
    fs.copyFileSync(path.join(ledger, name), path.join(dir, name));
  }
  fs.mkdirSync(path.join(dir, 'evidence'));
  fs.copyFileSync(
    path.join(ledger, 'evidence/admission-snapshot.json'),
    path.join(dir, 'evidence/admission-snapshot.json'),
  );
  const f: IFixture = {
    dir,
    git: path.join(dir, 'git'),
    roadmap,
    unit,
    node,
    calls: [],
    registration: registrationShape.parse(
      json(path.join(ledger, 'evidence/cni-registration-20261002.json')),
    ),
  };
  put(path.join(dir, 'resource.json'), {
    root: dir,
    realParent: temp,
    gitDirectory: f.git,
    ownership:
      'Unique test fixture only; retained for evidence; no shared Git state',
  });
  save(f);
  return f;
}
function save(f: IFixture): void {
  put(path.join(f.dir, 'roadmap.json'), f.roadmap);
  put(path.join(f.dir, 'units.json'), {
    schemaVersion: 1,
    programSnapshot: 'evidence/admission-snapshot.json',
    holdersRule: 'Fixture has no task holders',
    units: [f.unit],
    packets: [],
    deferrals: [],
  });
  put(
    path.join(f.dir, 'evidence/cni-registration-20261002.json'),
    f.registration,
  );
}
function run(
  f: IFixture,
  args: readonly string[] = [],
  timeoutMs = 20000,
): ICall {
  save(f);
  const argv = [
    validator,
    '--roadmap',
    path.join(f.dir, 'roadmap.json'),
    '--no-evidence',
    ...args,
  ];
  const started = Date.now();
  const result = spawnSync(process.execPath, argv, {
    cwd: repo,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: {
      ...process.env,
      GIT_DIR: path.join(f.git, '.git'),
      GIT_WORK_TREE: f.git,
    },
  });
  const call: ICall = {
    command: [process.execPath, ...argv],
    cwd: repo,
    pid: result.pid,
    exit: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    signal: result.signal,
    error: result.error?.message ?? null,
    elapsedMs: Date.now() - started,
  };
  f.calls.push(call);
  put(path.join(f.dir, 'commands.json'), f.calls);
  fs.writeFileSync(path.join(f.dir, 'validator.stdout'), call.stdout);
  fs.writeFileSync(path.join(f.dir, 'validator.stderr'), call.stderr);
  return call;
}
function granted(f: IFixture) {
  const grant = f.registration.grants.find((value) => value.id === 'CNI1');
  if (!grant) throw new TypeError('Required CNI1 grant absent');
  return grant;
}
function merge(
  f: IFixture,
  files: readonly { readonly name: string; readonly bytes: Buffer }[],
): string {
  git(f, ['init']);
  fs.mkdirSync(path.join(f.git, 'empty-hooks'));
  fs.writeFileSync(path.join(f.git, 'seed'), 'base\n');
  git(f, ['add', '.']);
  const commit = [
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'core.autocrlf=false',
    '-c',
    'core.hooksPath=' + path.join(f.git, 'empty-hooks'),
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-m',
  ];
  git(f, [...commit, 'baseline']);
  const baseline = git(f, ['rev-parse', 'HEAD']);
  for (const file of files) {
    const target = path.join(f.git, file.name);
    inside(f.git, target);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.bytes);
  }
  git(f, ['-c', 'core.autocrlf=false', 'add', '.']);
  git(f, [...commit, 'source']);
  const sha = git(f, ['rev-parse', 'HEAD']);
  git(f, ['update-ref', 'refs/remotes/origin/main', sha]);
  f.unit.state = 'main-verified';
  f.unit.baseline = baseline;
  f.unit.prHead = sha;
  f.unit.mergeSha = sha;
  f.unit.stageReceipts = {
    admission: { path: 'evidence/admission.json' },
    red: { path: 'evidence/red.json' },
    local: { path: 'evidence/local.json' },
    review: {
      path: 'evidence/review.json',
      head: sha,
      reviewedHead: sha,
      reviewerModel: 'reviewer',
      implementerModel: 'author',
    },
    merge: { path: 'evidence/merge.json', head: sha, mergeSha: sha },
    mainProof: { path: 'evidence/main.json', mergeCommit: sha },
    tick: null,
  };
  return sha;
}

const MODEL = 'openai/gpt-6.1-sol';
const HEAD = 'a'.repeat(40);
const uid = (value: number): string =>
  '00000000-0000-0000-0000-' + value.toString(16).padStart(12, '0');
const digest = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex');
const blob = (bytes: Buffer) => ({
  bytes: bytes.length,
  sha256: digest(bytes),
});
const witness = (value: unknown) => {
  const utf8 = JSON.stringify(value);
  return { utf8, ...blob(Buffer.from(utf8)) };
};
interface INativeFixture {
  readonly sizing: IFixture;
  readonly review: Record<string, unknown>;
  readonly args: Record<string, unknown>;
}
const nativeRpcCode = [
  "import fs from 'node:fs';",
  "import {pathToFileURL} from 'node:url';",
  "import {createHash} from 'node:crypto';",
  'const [repo,file]=process.argv.slice(1);',
  'const request=JSON.parse(fs.readFileSync(file));',
  "const api=await import(pathToFileURL(repo+'/scripts/qc/review-identity/review.mjs'));",
  "const facts=await import(pathToFileURL(repo+'/scripts/qc/review-identity/contract.mjs'));",
  "const sourceApi=await import(pathToFileURL(repo+'/scripts/qc/review-identity/source.mjs'));",
  "const nativeApi=await import(pathToFileURL(repo+'/scripts/qc/review-identity/native-binding.mjs'));",
  "const hash=b=>createHash('sha256').update(b).digest('hex');",
  "const archiveCensus=ledgerDir=>{const evidence=ledgerDir+'/evidence',baseline=new Set(fs.readdirSync(evidence));return ()=>fs.readdirSync(evidence).filter(name=>!baseline.has(name)).sort().map(name=>{const b=fs.readFileSync(evidence+'/'+name);return {name,bytes:b.length,sha256:hash(b)};});};",
  'try {',
  'let result;',
  "if(request.op==='mode') result={mode:api.reviewIdentityMode(request.value)};",
  "else if(request.op==='facts') result={privateRoots:facts.NATIVE_PRIVATE_ROOTS};",
  "else if(request.op==='external-review'){api.validateReviewReceipt(request.args.ledgerDir,request.args.unit);result={accepted:true};}",
  "else if(request.op==='legacy-reuse'){",
  'const census=archiveCensus(request.args.ledgerDir);',
  'const verified={manifest:{reviewContractVersion:2,unit:\'CNI1\'},snapshots:[{bytes:Buffer.from(\'{"fixture":"legacy-author"}\\n\')},{bytes:Buffer.from(\'{"fixture":"legacy-reviewer"}\\n\')}]};',
  'const first=api.archiveReviewIdentity(request.args.ledgerDir,verified),before=census();',
  'const second=api.archiveReviewIdentity(request.args.ledgerDir,verified),after=census();',
  'result={publicIdentityValidation:false,sourceQualified:false,first,second,before,after};',
  '}',
  'else {',
  "if(request.op==='parent-candidate') {",
  'const original=value=>{const utf8=JSON.stringify(value),b=Buffer.from(utf8);return {utf8,bytes:b.length,sha256:hash(b)};};',
  'const parentBytes=fs.readFileSync(request.raw.parent);',
  'const parent=sourceApi.scanNativeRecords(parentBytes);',
  'const child=sourceApi.nativeActor(sourceApi.scanNativeRecords(fs.readFileSync(request.raw.child)),request.childTurns).native;',
  'const birth=sourceApi.nativeSpawn(parent,child,request.birthId);',
  "const link=request.fault==='started'?undefined:sourceApi.nativeParentLink(parent,child,request.linkId);",
  "if(request.fault==='raw-ref'){link.source.records[0].sha256='f'.repeat(64);sourceApi.reopenNativeRecords(parentBytes,link.source);}",
  'const observerScan=sourceApi.scanNativeRecords(fs.readFileSync(request.raw.observer));',
  'const observer=sourceApi.nativeActor(observerScan,request.observerTurns).native;',
  'const projected=nativeApi.nativeAppObservation(observerScan,observer,{subject:child,callId:request.sourceCallId,appCallIds:[request.childPageId],parentAppCallIds:[request.parentPageId],spawnCallId:request.birthId,...(link?{parentLinkCallId:request.linkId}:{})});',
  "const localFile=request.args.ledgerDir+'/evidence/native-local.json';",
  'const local=JSON.parse(fs.readFileSync(localFile));',
  'local.implementationActors[0].agentPath=child.agentPath;',
  "const localBytes=Buffer.from(JSON.stringify(local,null,2)+'\\n');fs.writeFileSync(localFile,localBytes);",
  'request.args.unit.stageReceipts.local.implementationActors=local.implementationActors;',
  'const manifest=JSON.parse(fs.readFileSync(request.args.manifestFile));',
  'manifest.localReceiptSha256=hash(localBytes);',
  'const rewrite=(ref,index)=>{',
  "const file=request.args.nativeObservationsDir+'/'+ref.path,value=JSON.parse(fs.readFileSync(file));",
  'const route=JSON.parse(value.routeWitness.utf8);',
  'route.observer.census=local.implementationActors;',
  'route.observer.readbacks.local={bytes:localBytes.length,sha256:hash(localBytes)};',
  'if(index===0){',
  'route.observation.native=child;route.observation.spawn=birth;',
  'if(link)route.observation.parentLink=link;',
  'const app=projected.app;',
  "if(request.fault==='missing-retained-birth')delete route.observation.spawn;",
  "if(request.fault==='missing-raw-link')delete route.observation.parentLink;",
  "if(request.fault==='missing-app-link')delete app.parentLink;",
  "if(request.fault==='both-shapes')app.spawn={...app.parentLink,kind:'started',callId:birth.callId};",
  "if(request.fault==='mismatched-link')app.parentLink.callId='call_foreign';",
  "if(request.fault==='birth-as-link'){route.observation.parentLink.callId=birth.callId;app.parentLink.callId=birth.callId;}",
  "if(request.fault==='facade-path')route.observation.parentLink.agentPath='/root/other';",
  "if(request.fault==='facade-parent')route.observation.parentLink.parentSessionId=request.foreignId;",
  'value.appWitness=original(app);',
  '}',
  'value.routeWitness=original(route);',
  "const bytes=Buffer.from(JSON.stringify(value,null,2)+'\\n'),sha256=hash(bytes),name='codex-observation-'+sha256+'.json';",
  "fs.writeFileSync(request.args.nativeObservationsDir+'/'+name,bytes,{flag:'wx'});return {path:name,bytes:bytes.length,sha256};",
  '};',
  'manifest.author=rewrite(manifest.author,0);manifest.reviewer=rewrite(manifest.reviewer,1);',
  "fs.writeFileSync(request.args.manifestFile,JSON.stringify(manifest,null,2)+'\\n');",
  '}',
  'const verified=api.validateReviewIdentity(request.args);',
  "if(request.op==='archive-residue'){",
  "const evidence=request.args.ledgerDir+'/evidence',census=archiveCensus(request.args.ledgerDir);",
  "const attempt=()=>{try{return {accepted:true,ref:api.archiveReviewIdentity(request.args.ledgerDir,verified)};}catch(error){return {accepted:false,code:error.code??'ERROR',message:String(error.message)};}};",
  "if(request.scenario==='partial'){",
  'const original=verified.revalidate;let revalidateCalls=0;',
  "verified.revalidate=()=>{original();if(++revalidateCalls===3)throw Object.assign(new Error('Controlled archive interruption after first write'),{code:'FIXTURE_INTERRUPTION'});};",
  'const first=attempt(),beforeRetry=census(),retry=attempt(),afterRetry=census();',
  'result={publicIdentityValidation:true,sourceQualified:false,first,beforeRetry,retry,afterRetry,revalidateCalls};',
  '}else{',
  'const first=attempt(),beforeRepeat=census(),repeat=attempt(),afterRepeat=census();',
  'if(!first.accepted)throw new Error(first.message);',
  'const review={...request.args.review,identityEvidence:first.ref};',
  "fs.writeFileSync(evidence+'/native-review.json',JSON.stringify(review,null,2)+'\\n',{flag:'wx'});",
  "request.args.unit.stageReceipts.review={...review,path:'evidence/native-review.json'};",
  'const beforeRead=census();api.validateReviewReceipt(request.args.ledgerDir,request.args.unit);const afterRead=census();',
  'result={publicIdentityValidation:true,sourceQualified:false,first,beforeRepeat,repeat,afterRepeat,portableAccepted:true,beforeRead,afterRead};',
  '}',
  '}else{',
  "if(request.mutateLocal) fs.appendFileSync(request.args.ledgerDir+'/evidence/native-local.json',' ');",
  'result={version:verified.manifest.reviewContractVersion,snapshots:verified.snapshots.length};',
  "if(request.op==='archive') result.identityEvidence=api.archiveReviewIdentity(request.args.ledgerDir,verified);",
  '}',
  '}',
  'process.stdout.write(JSON.stringify(result));',
  '} catch(error) {',
  "process.stderr.write(String(error.code??'ERROR')+': '+String(error.message));process.exitCode=1;",
  '}',
].join('\n');

function rpc(f: IFixture, name: string, request: unknown): ICall {
  const requestFile = path.join(f.dir, name + '-request.json');
  put(requestFile, request);
  const argv = ['--input-type=module', '-e', nativeRpcCode, repo, requestFile];
  const started = Date.now();
  const r = spawnSync(process.execPath, argv, {
    cwd: repo,
    encoding: 'utf8',
    timeout: 120000,
  });
  const call: ICall = {
    command: [process.execPath, ...argv],
    cwd: repo,
    pid: r.pid,
    exit: r.status,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
    signal: r.signal,
    error: r.error?.message ?? null,
    elapsedMs: Date.now() - started,
  };
  f.calls.push(call);
  put(path.join(f.dir, 'commands.json'), f.calls);
  fs.writeFileSync(path.join(f.dir, name + '.stdout'), call.stdout);
  fs.writeFileSync(path.join(f.dir, name + '.stderr'), call.stderr);
  return call;
}
interface INativeChunkCase {
  readonly target: 'observer' | 'observation' | 'app';
  readonly fault:
    | 'none'
    | 'empty'
    | 'duplicate'
    | 'missing-frame'
    | 'last-anchor'
    | 'out-of-order'
    | 'thread'
    | 'turn'
    | 'workdir'
    | 'missing'
    | 'extra'
    | 'id';
}
type TObserverCase =
  | 'distinct-records'
  | 'prefix-bytes'
  | 'prefix-hash'
  | 'native'
  | 'completion'
  | 'chunks'
  | 'readbacks'
  | 'census';
function nativeFixture(
  finishers = 0,
  chunkCase?: INativeChunkCase,
  observerCase?: TObserverCase,
): INativeFixture {
  const f = fixture();
  const roles = ['author', ...Array<string>(finishers).fill('finisher')];
  const actors = roles.map((role, i) => ({
    role,
    sessionId: uid(i + 1),
    model: MODEL,
  }));
  const local = {
    reviewContractVersion: 3,
    unit: 'CNI1',
    stage: 'local',
    implementationActors: actors,
  };
  put(path.join(f.dir, 'evidence/native-local.json'), local);
  f.unit.stageReceipts.local = {
    path: 'evidence/native-local.json',
    reviewContractVersion: 3,
    implementationActors: actors,
  };
  const output = Buffer.from(
    'Verdict: APPROVE\nreviewedHead: ' +
      HEAD +
      '\nreviewerModel: ' +
      MODEL +
      '\nreviewContractVersion: 3\n\nStructural fixture only.\n',
  );
  fs.writeFileSync(path.join(f.dir, 'evidence/native-review.md'), output);
  const factsCall = rpc(f, 'facts', { op: 'facts' });
  expect(factsCall.exit).toBe(0);
  const facts = z
    .object({ privateRoots: z.array(z.string()) })
    .parse(JSON.parse(factsCall.stdout));
  const frame = Buffer.from('frame\n'),
    chunkFrame = Buffer.from('chunk-frame\n'),
    terminal = Buffer.from('terminal\n');
  const completionPrefix = chunkCase
    ? Buffer.concat([chunkFrame, frame, terminal])
    : Buffer.concat([frame, terminal]);
  const appFrames = observerCase
    ? [Buffer.from('author-App-frame\n'), Buffer.from('reviewer-App-frame\n')]
    : [];
  const prefix = Buffer.concat([completionPrefix, ...appFrames]);
  const records = [
    { ordinal: 0, offset: 0, ...blob(chunkCase ? chunkFrame : frame) },
    ...(chunkCase
      ? [{ ordinal: 1, offset: chunkFrame.length, ...blob(frame) }]
      : []),
    {
      ordinal: chunkCase ? 2 : 1,
      offset: completionPrefix.length - terminal.length,
      ...blob(terminal),
    },
  ];
  const appRecords = appFrames.map((bytes, index) => ({
    ordinal: records.length + index,
    offset:
      completionPrefix.length +
      appFrames.slice(0, index).reduce((sum, part) => sum + part.length, 0),
    ...blob(bytes),
  }));
  const source = {
    prefixBytes: prefix.length,
    prefixSha256: digest(prefix),
    records,
  };
  const actor = (number: number) => ({
    adapterVersion: 'codex-root-0.159.0-alpha.12.1',
    sessionId: uid(number),
    modelProvider: 'openai',
    originator: 'codex_work_desktop',
    cliVersion: '0.159.0-alpha.12.1',
    source: 'vscode',
    threadSource: 'user',
    turns: [
      { turnId: uid(number + 100), model: 'gpt-6.1-sol', effort: 'high' },
    ],
  });
  const completion = (number: number) => ({
    threadId: uid(number),
    turnId: uid(number + 100),
    id: 'exec-' + uid(number + 200),
    server: 'git_bash',
    tool: 'run',
    status: 'completed',
    workdir: f.dir,
    frameSha256: digest(frame),
    resultSha256: digest(Buffer.from('result')),
    stdoutSha256: digest(Buffer.from('stdout')),
    stdoutBytes: 6,
  });
  const completedChunks = (number: number) => [
    {
      ...completion(number),
      id: 'exec-' + uid(number + 300),
      frameSha256: digest(chunkFrame),
    },
    completion(number),
  ];
  const chunkBinding = (number: number, target: INativeChunkCase['target']) => {
    if (!chunkCase) return {};
    const chunks = completedChunks(number);
    if (chunkCase.target === target) {
      switch (chunkCase.fault) {
        case 'empty':
          chunks.splice(0);
          break;
        case 'duplicate':
          chunks[0].id = chunks[1].id;
          break;
        case 'missing-frame':
          chunks[0].frameSha256 = digest(Buffer.from('unbound frame'));
          break;
        case 'last-anchor':
          chunks[1].stdoutSha256 = digest(Buffer.from('foreign anchor'));
          break;
        case 'out-of-order':
          chunks.reverse();
          break;
        case 'thread':
          chunks[0].threadId = uid(999);
          break;
        case 'turn':
          chunks[0].turnId = uid(999);
          break;
        case 'workdir':
          chunks[0].workdir = path.join(f.dir, 'foreign');
          break;
      }
    }
    return { chunks };
  };
  const localBytes = fs.readFileSync(
    path.join(f.dir, 'evidence/native-local.json'),
  );
  const sourceFile = Buffer.from('fixture-source\n');
  const readbacks = {
    privateRoots: facts.privateRoots,
    head: HEAD,
    tree: 'b'.repeat(40),
    index: blob(Buffer.from('index')),
    inventory: blob(Buffer.from('inventory')),
    diff: blob(Buffer.from('diff')),
    status: blob(Buffer.from('status')),
    files: [
      { path: 'scripts/qc/review-identity/contract.mjs', ...blob(sourceFile) },
    ],
  };
  const observer = {
    native: actor(20),
    source,
    completion: completion(20),
    ...chunkBinding(20, 'observer'),
    readbacks: { ...readbacks, review: blob(output), local: blob(localBytes) },
    census: actors,
  };
  const capture = path.join(f.dir, 'capture');
  fs.mkdirSync(capture);
  const snapshots = [...roles, 'reviewer'].map((role, i) => {
    const number = role === 'reviewer' ? 10 : i + 1;
    const observation = {
      role,
      native: actor(number),
      source,
      terminals: [
        { turnId: uid(number + 100), record: records[records.length - 1] },
      ],
      completion: completion(number),
      ...chunkBinding(number, 'observation'),
      readbacks:
        role === 'reviewer'
          ? { ...readbacks, review: blob(output) }
          : readbacks,
    };
    const app = {
      schemaVersion: 1,
      observer: { sessionId: uid(20), callIds: ['exec-' + uid(400 + i)] },
      sessionId: uid(number),
      kind: 'codex',
      hostId: 'local',
      threadStatus: 'idle',
      turns: [
        {
          turnId: uid(number + 100),
          status: 'completed',
          calls: (chunkCase
            ? completedChunks(number)
            : [completion(number)]
          ).map((call) => ({
            id: call.id,
            server: 'git_bash',
            tool: 'run',
            status: 'completed',
            workdir: f.dir,
          })),
        },
      ],
    };
    if (chunkCase?.target === 'app') {
      const calls = app.turns[0].calls;
      switch (chunkCase.fault) {
        case 'duplicate':
          calls[0] = { ...calls[1] };
          break;
        case 'missing':
          calls.shift();
          break;
        case 'extra':
          calls.push({ ...calls[0], id: 'exec-' + uid(999) });
          break;
        case 'id':
          calls[0].id = 'exec-' + uid(999);
          break;
        case 'thread':
          app.sessionId = uid(999);
          break;
        case 'turn':
          app.turns[0].turnId = uid(999);
          break;
        case 'workdir':
          calls[0].workdir = path.join(f.dir, 'foreign');
          break;
      }
    }
    const selectedObserver = observerCase
      ? {
          ...observer,
          native: {
            ...observer.native,
            turns: observer.native.turns.map((turn) => ({ ...turn })),
          },
          source: {
            ...source,
            records: [...records, appRecords[role === 'reviewer' ? 1 : 0]],
          },
          completion: { ...observer.completion },
          readbacks: { ...observer.readbacks },
          census: [...observer.census],
        }
      : observer;
    if (role === 'reviewer') {
      switch (observerCase) {
        case 'prefix-bytes':
          selectedObserver.source.prefixBytes += 1;
          break;
        case 'prefix-hash':
          selectedObserver.source.prefixSha256 = digest(
            Buffer.from('foreign prefix'),
          );
          break;
        case 'native':
          selectedObserver.native.turns[0].effort = 'xhigh';
          break;
        case 'completion':
          selectedObserver.completion.resultSha256 = digest(
            Buffer.from('foreign result'),
          );
          break;
        case 'chunks':
          selectedObserver.chunks = [selectedObserver.completion];
          break;
        case 'readbacks':
          selectedObserver.readbacks.diff = {
            ...readbacks.diff,
            sha256: digest(Buffer.from('foreign diff')),
          };
          observation.readbacks.diff = selectedObserver.readbacks.diff;
          break;
        case 'census':
          selectedObserver.census.push({
            role: 'finisher',
            sessionId: uid(99),
            model: MODEL,
          });
          break;
      }
    }
    const snapshot = {
      schemaVersion: 1,
      reviewContractVersion: 3,
      unit: 'CNI1',
      sourceHead: HEAD,
      reviewOutputSha256: digest(output),
      observedAt: '2026-10-03T09:00:00Z',
      appWitness: witness(app),
      routeWitness: witness({
        schemaVersion: 1,
        observer: selectedObserver,
        observation,
      }),
    };
    const bytes = Buffer.from(JSON.stringify(snapshot, null, 2) + '\n');
    const name = 'codex-observation-' + digest(bytes) + '.json';
    fs.writeFileSync(path.join(capture, name), bytes, { flag: 'wx' });
    return { path: name, ...blob(bytes) };
  });
  const manifest = {
    reviewContractVersion: 3,
    unit: 'CNI1',
    sourceHead: HEAD,
    reviewOutputSha256: digest(output),
    localReceiptSha256: digest(localBytes),
    author: snapshots[0],
    finishers: snapshots.slice(1, -1),
    reviewer: snapshots.at(-1),
  };
  const manifestFile = path.join(capture, 'candidate-manifest.json');
  put(manifestFile, manifest);
  const review = {
    unit: 'CNI1',
    stage: 'review',
    reviewContractVersion: 3,
    head: HEAD,
    reviewedHead: HEAD,
    reviewerModel: MODEL,
    implementerModel: MODEL,
    outputSha256: digest(output),
    verdict: 'APPROVE',
    outputPath: 'evidence/native-review.md',
  };
  return {
    sizing: f,
    review,
    args: {
      ledgerDir: f.dir,
      unit: f.unit,
      review,
      manifestFile,
      nativeObservationsDir: capture,
      reviewFile: path.join(f.dir, 'evidence/native-review.md'),
    },
  };
}

type TParentFault =
  | 'linked'
  | 'started'
  | 'missing-birth'
  | 'duplicate-link'
  | 'nonempty-ack'
  | 'raw-target'
  | 'raw-parent'
  | 'raw-ref'
  | 'missing-activity'
  | 'duplicate-activity'
  | 'fake-started'
  | 'wrong-uuid'
  | 'wrong-path'
  | 'missing-retained-birth'
  | 'missing-raw-link'
  | 'missing-app-link'
  | 'both-shapes'
  | 'mismatched-link'
  | 'birth-as-link'
  | 'facade-path'
  | 'facade-parent';

function parentFixture(fault: TParentFault) {
  const f = nativeFixture();
  const parentId = uid(20),
    childId = uid(1),
    parentTurn = uid(120),
    childTurn = uid(101);
  const agentPath = '/root/identity_fixture';
  const birthId = 'call_birthfixture',
    linkId = 'call_linkfixture';
  const childPageId = 'exec-' + uid(600),
    parentPageId = 'exec-' + uid(601);
  const row = (type: string, payload: Record<string, unknown>) => ({
    type,
    payload,
  });
  const metadata = {
    id: parentId,
    model_provider: 'openai',
    originator: 'codex_work_desktop',
    cli_version: '0.159.0-alpha.12.1',
    source: 'vscode',
    thread_source: 'user',
  };
  const birth = row('response_item', {
    type: 'function_call',
    call_id: birthId,
    name: 'spawn_agent',
    arguments: JSON.stringify({
      task_name: 'identity_fixture',
      agent_type: 'lazycodex-worker-medium',
      fork_turns: 'none',
    }),
  });
  const followup = row('response_item', {
    type: 'function_call',
    call_id: linkId,
    name: 'followup_task',
    arguments: JSON.stringify({
      target: fault === 'raw-target' ? 'other' : 'identity_fixture',
      message: 'Controlled fixture follow-up',
    }),
  });
  const parentRows = [
    row('session_meta', {
      ...metadata,
      id: fault === 'raw-parent' ? uid(999) : parentId,
    }),
    row('turn_context', {
      turn_id: parentTurn,
      model: 'gpt-6.1-sol',
      effort: 'high',
    }),
    ...(fault === 'missing-birth' ? [] : [birth]),
    row('response_item', {
      type: 'function_call_output',
      call_id: birthId,
      output: JSON.stringify({ task_name: agentPath }),
    }),
    followup,
    ...(fault === 'duplicate-link' ? [followup] : []),
    row('response_item', {
      type: 'function_call_output',
      call_id: linkId,
      output: fault === 'nonempty-ack' ? '{}' : '',
    }),
    row('event_msg', { type: 'task_complete', turn_id: parentTurn }),
  ];
  const childRows = [
    row('session_meta', {
      id: childId,
      model_provider: 'openai',
      originator: 'codex_work_desktop',
      cli_version: '0.160.0',
      multi_agent_version: 'v2',
      parent_thread_id: parentId,
      session_id: parentId,
      agent_path: agentPath,
      agent_role: 'lazycodex-worker-medium',
      source: {
        subagent: {
          thread_spawn: {
            parent_thread_id: parentId,
            agent_path: agentPath,
            agent_role: 'lazycodex-worker-medium',
            depth: 1,
          },
        },
      },
    }),
    row('turn_context', {
      turn_id: childTurn,
      root_turn_id: parentTurn,
      model: 'gpt-6.1-sol',
      effort: 'high',
    }),
    row('event_msg', { type: 'task_complete', turn_id: childTurn }),
  ];
  const activity = {
    type: 'subAgentActivity',
    id: fault === 'started' ? birthId : linkId,
    kind: ['started', 'fake-started'].includes(fault)
      ? 'started'
      : 'interacted',
    agentThreadId: fault === 'wrong-uuid' ? uid(999) : childId,
    agentPath: fault === 'wrong-path' ? '/root/other' : agentPath,
  };
  const activities =
    fault === 'missing-activity'
      ? []
      : fault === 'duplicate-activity'
        ? [activity, activity]
        : [activity];
  const apiFrame = (id: string, target: string, turns: readonly unknown[]) =>
    row('event_msg', {
      type: 'item_completed',
      thread_id: parentId,
      turn_id: parentTurn,
      item: {
        type: 'McpToolCall',
        id,
        server: 'codex_app',
        tool: 'read_thread',
        status: 'completed',
        pluginId: 'codex-app-tools@openai-bundled',
        arguments: { threadId: target },
        result: {
          isError: false,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                schemaVersion: 1,
                thread: {
                  id: target,
                  kind: 'codex',
                  hostId: 'local',
                  status: { type: 'idle' },
                },
                turns,
                page: {
                  order: 'newest_first',
                  limit: 10,
                  nextCursor: null,
                  hasMore: false,
                },
              }),
            },
          ],
        },
      },
    });
  const observerRows = [
    row('session_meta', metadata),
    row('turn_context', {
      turn_id: parentTurn,
      model: 'gpt-6.1-sol',
      effort: 'high',
    }),
    apiFrame(childPageId, childId, [
      {
        id: childTurn,
        status: 'completed',
        items: [
          {
            type: 'mcpToolCall',
            id: 'exec-' + uid(201),
            server: 'git_bash',
            tool: 'run',
            status: 'completed',
            arguments: { workdir: f.sizing.dir },
          },
        ],
      },
    ]),
    apiFrame(parentPageId, parentId, [
      { id: parentTurn, status: 'completed', items: activities },
    ]),
  ];
  const raw = {
    parent: path.join(f.sizing.dir, 'parent-source.jsonl'),
    child: path.join(f.sizing.dir, 'child-source.jsonl'),
    observer: path.join(f.sizing.dir, 'observer-source.jsonl'),
  };
  for (const item of [
    { file: raw.parent, rows: parentRows },
    { file: raw.child, rows: childRows },
    { file: raw.observer, rows: observerRows },
  ]) {
    fs.writeFileSync(
      item.file,
      item.rows.map((value) => JSON.stringify(value) + '\n').join(''),
      { flag: 'wx' },
    );
  }
  put(path.join(f.sizing.dir, 'parent-resources.json'), {
    raw,
    fault,
    birthId,
    linkId,
  });
  return {
    f,
    request: {
      op: 'parent-candidate',
      args: f.args,
      raw,
      fault,
      birthId,
      linkId,
      sourceCallId: 'exec-' + uid(201),
      childPageId,
      parentPageId,
      childTurns: [childTurn],
      observerTurns: [parentTurn],
      foreignId: uid(999),
    },
  };
}

describe('Native-v3 paired identity facade and portable consumption', () => {
  jest.setTimeout(120000);
  it.each([0, 1, 2])('accepts a complete census with %i finishers', (count) => {
    const f = nativeFixture(count);
    const result = rpc(f.sizing, 'candidate', {
      op: 'candidate',
      args: f.args,
    });
    expect(result.exit).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      version: 3,
      snapshots: count + 2,
    });
  });
  it.each([null, 1, 4])(
    'refuses unsupported version %s through the shared facade',
    (version) => {
      const f = fixture();
      expect(
        rpc(f, 'mode', {
          op: 'mode',
          value: { reviewContractVersion: version },
        }).exit,
      ).toBe(1);
    },
  );
  it('refuses a partial modern marker', () => {
    const f = fixture();
    expect(
      rpc(f, 'mode', { op: 'mode', value: { identityEvidence: {} } }).exit,
    ).toBe(1);
  });
  it('requires an explicit qualified observations directory for candidate intake', () => {
    const f = nativeFixture();
    Reflect.deleteProperty(f.args, 'nativeObservationsDir');
    expect(
      rpc(f.sizing, 'candidate', { op: 'candidate', args: f.args }).exit,
    ).toBe(1);
  });
  it('refuses the engine adapter on native intake', () => {
    const f = nativeFixture();
    f.args.engineRecordsDir = f.sizing.dir;
    expect(
      rpc(f.sizing, 'candidate', { op: 'candidate', args: f.args }).exit,
    ).toBe(1);
  });
  it('refuses a mismatched local contract before native publication', () => {
    const f = nativeFixture();
    const localFile = path.join(f.sizing.dir, 'evidence/native-local.json');
    const local = z.record(z.string(), z.unknown()).parse(json(localFile));
    local.reviewContractVersion = 2;
    put(localFile, local);
    const before = fs.readdirSync(path.join(f.sizing.dir, 'evidence'));
    expect(
      rpc(f.sizing, 'candidate', { op: 'candidate', args: f.args }).exit,
    ).toBe(1);
    expect(fs.readdirSync(path.join(f.sizing.dir, 'evidence'))).toEqual(before);
  });
  it('refuses frozen-local drift before archive publication', () => {
    const f = nativeFixture();
    const result = rpc(f.sizing, 'archive', {
      op: 'archive',
      args: f.args,
      mutateLocal: true,
    });
    expect(result.exit).toBe(1);
    expect(
      fs
        .readdirSync(path.join(f.sizing.dir, 'evidence'))
        .some((name) => name.startsWith('codex-review-identity-')),
    ).toBe(false);
  });
  it('consumes the archived native identity under --no-evidence despite equal models', () => {
    const f = nativeFixture();
    const archived = rpc(f.sizing, 'archive', { op: 'archive', args: f.args });
    expect(archived.exit).toBe(0);
    const result = z
      .object({
        identityEvidence: archiveRefShape,
      })
      .passthrough()
      .parse(JSON.parse(archived.stdout));
    const external = { ...f.review, identityEvidence: result.identityEvidence };
    put(path.join(f.sizing.dir, 'evidence/native-review.json'), external);
    f.sizing.unit.state = 'review-required';
    f.sizing.unit.stageReceipts.admission = { path: 'evidence/admission.json' };
    f.sizing.unit.stageReceipts.red = { path: 'evidence/red.json' };
    f.sizing.unit.stageReceipts.review = {
      path: 'evidence/native-review.json',
      ...external,
    };
    expect(run(f.sizing, [], 120000).exit).toBe(0);
  });
});

describe('Native-v3 chunk completion and App correlation', () => {
  jest.setTimeout(120000);
  it('accepts all chunk frames and App calls with the final completion anchor', () => {
    const f = nativeFixture(0, { target: 'observation', fault: 'none' });
    const result = rpc(f.sizing, 'chunks', { op: 'candidate', args: f.args });
    expect(result.exit).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ version: 3, snapshots: 2 });
  });
  it('preserves an omitted-chunks single completion', () => {
    const f = nativeFixture();
    expect(
      rpc(f.sizing, 'single', { op: 'candidate', args: f.args }).exit,
    ).toBe(0);
  });
  const targets: INativeChunkCase['target'][] = ['observer', 'observation'];
  const sourceFaults: INativeChunkCase['fault'][] = [
    'empty',
    'duplicate',
    'missing-frame',
    'last-anchor',
    'out-of-order',
    'thread',
    'turn',
    'workdir',
  ];
  for (const target of targets) {
    it.each(sourceFaults)(`refuses ${target} chunk %s`, (fault) => {
      const f = nativeFixture(0, { target, fault });
      const result = rpc(f.sizing, 'chunks', { op: 'candidate', args: f.args });
      expect(result.exit).toBe(1);
      const reason =
        fault === 'empty'
          ? 'invalid identity fields'
          : ['missing-frame', 'out-of-order'].includes(fault)
            ? 'native chunk raw refs ambiguous/out of order'
            : 'native source/call binding missing';
      expect(result.stderr).toContain(reason);
    });
  }
  const appFaults: INativeChunkCase['fault'][] = [
    'duplicate',
    'missing',
    'extra',
    'id',
    'thread',
    'turn',
    'workdir',
  ];
  it.each(appFaults)('refuses App chunk call %s', (fault) => {
    const f = nativeFixture(0, { target: 'app', fault });
    const result = rpc(f.sizing, 'chunks', { op: 'candidate', args: f.args });
    expect(result.exit).toBe(1);
    const reason =
      fault === 'thread'
        ? 'invalid identity fields'
        : fault === 'turn'
          ? 'App complete named turn coverage missing'
          : 'native App completed call/workdir mismatch';
    expect(result.stderr).toContain(reason);
  });
});

describe('Native-v3 retained birth and measured parent interaction', () => {
  jest.setTimeout(120000);
  it.each<TParentFault>(['linked', 'started'])(
    'accepts original birth with %s App activity',
    (fault) => {
      const { f, request } = parentFixture(fault);
      const result = rpc(f.sizing, 'parent', request);
      expect(result.exit).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ version: 3, snapshots: 2 });
    },
  );
  const refusals: readonly { fault: TParentFault; reason: string }[] = [
    { fault: 'missing-birth', reason: 'native spawn call absent/duplicated' },
    {
      fault: 'duplicate-link',
      reason: 'native parent link call absent/duplicated',
    },
    {
      fault: 'nonempty-ack',
      reason: 'native parent link operation/result mismatch',
    },
    { fault: 'raw-target', reason: 'invalid identity fields' },
    { fault: 'raw-parent', reason: 'native parent ID mismatch' },
    { fault: 'raw-ref', reason: 'native selected raw reference changed' },
    { fault: 'missing-activity', reason: 'App actual spawn absent/duplicated' },
    {
      fault: 'duplicate-activity',
      reason: 'App actual spawn absent/duplicated',
    },
    { fault: 'fake-started', reason: 'App spawn identity mismatch' },
    { fault: 'wrong-uuid', reason: 'App spawn identity mismatch' },
    { fault: 'wrong-path', reason: 'App spawn identity mismatch' },
    {
      fault: 'missing-retained-birth',
      reason: 'native parent/spawn isolation mapping missing',
    },
    {
      fault: 'missing-raw-link',
      reason: 'native parent/spawn isolation mapping missing',
    },
    {
      fault: 'missing-app-link',
      reason: 'native parent/spawn isolation mapping missing',
    },
    {
      fault: 'both-shapes',
      reason: 'native parent/spawn isolation mapping missing',
    },
    {
      fault: 'mismatched-link',
      reason: 'native parent/spawn isolation mapping missing',
    },
    {
      fault: 'birth-as-link',
      reason: 'native parent/spawn isolation mapping missing',
    },
    {
      fault: 'facade-path',
      reason: 'native parent/spawn isolation mapping missing',
    },
    {
      fault: 'facade-parent',
      reason: 'native parent/spawn isolation mapping missing',
    },
  ];
  it.each(refusals)(
    'refuses $fault at its owning boundary',
    ({ fault, reason }) => {
      const { f, request } = parentFixture(fault);
      const result = rpc(f.sizing, 'parent', request);
      expect(result.exit).toBe(1);
      expect(result.stderr).toContain(reason);
    },
  );
});

describe('Native-v3 malformed input privacy', () => {
  jest.setTimeout(120000);
  it.each(['manifest', 'local', 'review'])(
    'refuses malformed %s without exporting its marker',
    (kind) => {
      const f = nativeFixture();
      const file =
        kind === 'manifest'
          ? z.string().parse(f.args.manifestFile)
          : path.join(f.sizing.dir, 'evidence/native-' + kind + '.json');
      if (kind === 'review') {
        put(file, f.review);
        f.sizing.unit.stageReceipts.review = {
          path: 'evidence/native-review.json',
          ...f.review,
        };
      }
      const marker = 'P' + digest(Buffer.from(f.sizing.dir)).slice(0, 7);
      const original = fs.readFileSync(file);
      fs.writeFileSync(file + '.original', original, { flag: 'wx' });
      fs.writeFileSync(file, Buffer.from(marker));
      put(path.join(f.sizing.dir, 'privacy-resources.json'), {
        kind,
        file,
        marker,
        original: blob(original),
      });
      const result = rpc(f.sizing, 'privacy', {
        op: kind === 'review' ? 'external-review' : 'candidate',
        args: f.args,
      });
      expect(result.exit).toBe(1);
      expect({
        refusalCode: result.stderr.startsWith('REVIEW_IDENTITY_INVALID:'),
        markerAbsent: !result.stderr.includes(marker),
      }).toEqual({ refusalCode: true, markerAbsent: true });
    },
  );
});

describe('Native-v3 archive residue and legacy byte reuse', () => {
  jest.setTimeout(180000);
  const censusShape = z.array(
    z.object({ name: z.string(), bytes: z.number(), sha256: z.string() }),
  );
  const refusalShape = z.object({
    accepted: z.literal(false),
    code: z.string(),
    message: z.string(),
  });
  it('refuses a retry after an actual first write and preserves every residual byte', () => {
    const f = nativeFixture();
    const call = rpc(f.sizing, 'archive-partial', {
      op: 'archive-residue',
      scenario: 'partial',
      args: f.args,
    });
    expect(call.exit).toBe(0);
    const result = z
      .object({
        publicIdentityValidation: z.literal(true),
        sourceQualified: z.literal(false),
        first: refusalShape,
        beforeRetry: censusShape,
        retry: refusalShape,
        afterRetry: censusShape,
        revalidateCalls: z.number(),
      })
      .parse(JSON.parse(call.stdout));
    expect(result.first.code).toBe('FIXTURE_INTERRUPTION');
    expect(result.beforeRetry).toHaveLength(1);
    expect(result.retry).toEqual({
      accepted: false,
      code: 'REVIEW_IDENTITY_INVALID',
      message: 'native archive target already exists',
    });
    expect(result.afterRetry).toEqual(result.beforeRetry);
    expect(result.revalidateCalls).toBe(4);
  });
  it('refuses complete native reuse while allowing unchanged portable reads', () => {
    const f = nativeFixture();
    const call = rpc(f.sizing, 'archive-complete', {
      op: 'archive-residue',
      scenario: 'complete',
      args: f.args,
    });
    expect(call.exit).toBe(0);
    const result = z
      .object({
        publicIdentityValidation: z.literal(true),
        sourceQualified: z.literal(false),
        first: z.object({ accepted: z.literal(true), ref: archiveRefShape }),
        beforeRepeat: censusShape,
        repeat: refusalShape,
        afterRepeat: censusShape,
        portableAccepted: z.literal(true),
        beforeRead: censusShape,
        afterRead: censusShape,
      })
      .parse(JSON.parse(call.stdout));
    expect(result.beforeRepeat).toHaveLength(3);
    expect(result.repeat).toEqual({
      accepted: false,
      code: 'REVIEW_IDENTITY_INVALID',
      message: 'native archive target already exists',
    });
    expect(result.afterRepeat).toEqual(result.beforeRepeat);
    expect(result.afterRead).toEqual(result.beforeRead);
  });
  it('preserves legacy-v2 matching-byte reuse through the public archive API', () => {
    const f = fixture();
    const call = rpc(f, 'archive-legacy', {
      op: 'legacy-reuse',
      args: { ledgerDir: f.dir },
    });
    expect(call.exit).toBe(0);
    const result = z
      .object({
        publicIdentityValidation: z.literal(false),
        sourceQualified: z.literal(false),
        first: archiveRefShape,
        second: archiveRefShape,
        before: censusShape,
        after: censusShape,
      })
      .parse(JSON.parse(call.stdout));
    expect(result.before).toHaveLength(3);
    expect(result.second).toEqual(result.first);
    expect(result.after).toEqual(result.before);
  });
});

describe('Native-v3 shared observer and subject-selected records', () => {
  jest.setTimeout(120000);
  it('accepts distinct valid App record selections under the same observer prefix', () => {
    const f = nativeFixture(0, undefined, 'distinct-records');
    const result = rpc(f.sizing, 'observer', { op: 'candidate', args: f.args });
    expect(result.exit).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ version: 3, snapshots: 2 });
  });
  const controls: TObserverCase[] = [
    'prefix-bytes',
    'prefix-hash',
    'native',
    'completion',
    'chunks',
    'readbacks',
    'census',
  ];
  it.each(controls)('still refuses changed common observer %s', (field) => {
    const f = nativeFixture(0, undefined, field);
    const result = rpc(f.sizing, 'observer', { op: 'candidate', args: f.args });
    expect(result.exit).toBe(1);
    expect(result.stderr).toContain(
      'native independent final observer/census/local mismatch',
    );
  });
});

describe('CNI1 declared source sizing metadata', () => {
  it('accepts the public tuple without changing NEXT', () => {
    const f = fixture();
    f.unit.state = 'planned';
    const result = run(f, ['--next']);
    expect(result.exit).toBe(0);
    expect(result.stdout.trim()).toBe('CNI1');
  });
  it.each([
    [
      'missing unit ref',
      (f: IFixture) => {
        Reflect.deleteProperty(f.unit, 'sourceSizingRef');
      },
    ],
    [
      'missing node ref',
      (f: IFixture) => {
        Reflect.deleteProperty(f.node, 'sourceSizingRef');
      },
    ],
    [
      'missing grant ref',
      (f: IFixture) => {
        Reflect.deleteProperty(granted(f), 'sourceSizingRef');
      },
    ],
    [
      'wrong unit ref',
      (f: IFixture) => {
        f.unit.sourceSizingRef = '../outside.json#sourceSizing.CNI1';
      },
    ],
    [
      'wrong node ref',
      (f: IFixture) => {
        f.node.sourceSizingRef =
          'evidence/cni-registration-20261002.json#sourceSizing.CNI2';
      },
    ],
    [
      'wrong version',
      (f: IFixture) => {
        f.registration.sourceSizing.CNI1.version = 2;
      },
    ],
    [
      'wrong mode',
      (f: IFixture) => {
        f.registration.sourceSizing.CNI1.mode = 'aggregate';
      },
    ],
    [
      'wrong grant binding',
      (f: IFixture) => {
        f.registration.sourceSizing.CNI1.grantRef = 'grants.CNI2';
      },
    ],
    [
      'missing sizing',
      (f: IFixture) => {
        Reflect.deleteProperty(f.registration.sourceSizing, 'CNI1');
      },
    ],
    [
      'extra unit path',
      (f: IFixture) => {
        f.unit.ownershipExceptions.push('scripts/qc/ungranted.mjs');
      },
    ],
    [
      'extra node path',
      (f: IFixture) => {
        f.node.ownershipExceptions.push('scripts/qc/ungranted.mjs');
      },
    ],
    [
      'duplicate grant path',
      (f: IFixture) => {
        const g = granted(f);
        g.exactFiles.push(g.exactFiles[0] ?? '');
      },
    ],
    [
      'wrong grant cap',
      (f: IFixture) => {
        granted(f).maxFiles = 14;
      },
    ],
  ] as const)('refuses %s even without evidence checks', (_name, poison) => {
    const f = fixture();
    poison(f);
    expect(run(f).exit).toBe(1);
  });
  it('preserves an older CNI1 ledger with no declaration', () => {
    const f = fixture();
    Reflect.deleteProperty(f.unit, 'sourceSizingRef');
    Reflect.deleteProperty(f.node, 'sourceSizingRef');
    Reflect.deleteProperty(granted(f), 'sourceSizingRef');
    Reflect.deleteProperty(f.registration, 'sourceSizing');
    expect(run(f).exit).toBe(0);
  });
  it('does not impose CNI1 metadata on an unrelated unit', () => {
    const f = fixture();
    f.unit.id = 'U91';
    f.unit.sourceSizingRef = 'unrelated-legacy-value';
    expect(run(f).exit).toBe(0);
  });
});

describe('CNI1 actual merge-blob sizing and file census', () => {
  it('reports a 501-line source as guidance rather than an aggregate refusal', () => {
    const f = fixture();
    const name = 'scripts/qc/review-identity/contract.mjs';
    merge(f, [
      {
        name,
        bytes: Buffer.from('// comment\r\n\n' + 'value\n'.repeat(498) + 'last'),
      },
    ]);
    const result = run(f, ['--git']);
    expect(result.exit).toBe(0);
    const line = (result.stdout + result.stderr)
      .split('\n')
      .find((value) => value.startsWith('CNI1_SOURCE_SIZING '));
    const metrics = z
      .object({
        files: z.array(
          z
            .object({
              path: z.string(),
              lines: z.number(),
              requiresSizingReview: z.boolean(),
            })
            .passthrough(),
        ),
      })
      .passthrough()
      .parse(JSON.parse((line ?? '').slice('CNI1_SOURCE_SIZING '.length)));
    expect(metrics.files).toContainEqual(
      expect.objectContaining({
        path: name,
        lines: 501,
        requiresSizingReview: true,
      }),
    );
  });
  it('counts an oversized test file in the census but exempts its size guidance', () => {
    const f = fixture();
    const name = 'scripts/__tests__/roadmap-codex-review-identity.test.ts';
    merge(f, [{ name, bytes: Buffer.from('test\n'.repeat(700)) }]);
    const result = run(f, ['--git']);
    expect(result.exit).toBe(0);
    expect(result.stdout + result.stderr).toContain('"fileCount":1');
  });
  it('refuses an ungranted evidence file that old cap accounting skips', () => {
    const f = fixture();
    merge(f, [
      {
        name: 'openspec/planning/2026-09-12-roadmap-completion/evidence/ungranted.json',
        bytes: Buffer.from('{}\n'),
      },
    ]);
    expect(run(f, ['--git']).exit).toBe(1);
  });
  it('refuses a fourteenth changed file including tests', () => {
    const f = fixture();
    const files = [
      ...granted(f).exactFiles,
      'scripts/__tests__/ungranted.test.ts',
    ];
    merge(
      f,
      files.map((name) => ({ name, bytes: Buffer.from('value\n') })),
    );
    expect(run(f, ['--git']).exit).toBe(1);
  });
  it('does not take working-file bytes instead of the merge blob', () => {
    const f = fixture();
    const name = 'scripts/qc/review-identity/contract.mjs';
    merge(f, [{ name, bytes: Buffer.from('line\n'.repeat(3)) }]);
    fs.writeFileSync(path.join(f.git, name), 'later\n'.repeat(900));
    const result = run(f, ['--git']);
    expect(result.exit).toBe(0);
    expect(result.stdout + result.stderr).toContain('"lines":3');
  });
});

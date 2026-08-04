import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-capture-transaction.mjs'),
).href;
const harness = `
import fs from 'node:fs';
import * as capture from ${JSON.stringify(moduleUrl)};
const request=JSON.parse(fs.readFileSync(0,'utf8'));
const root=request.root, input={wave:request.wave??'camp-01e',invocationId:request.invocationId??'camp-01e-picker-browser',commandSequenceIndex:request.commandSequenceIndex??1,artifactPath:request.artifactPath??'desktop.png',artifactDirectory:root};
const clone=(value)=>JSON.parse(JSON.stringify(value));
try {
  let value;
  if(request.action==='environment') value=capture.captureEnvironment(request.environment);
  else if(request.action==='admission') value=capture.openCaptureTransaction(input,{instrumentation:{}}).contract;
  else if(request.action==='browser-barrier') {
    Object.defineProperties(globalThis,{document:{value:{},configurable:true},MutationObserver:{value:class{observe(){}},configurable:true},Storage:{value:class{setItem(){} removeItem(){} clear(){}},configurable:true},IDBObjectStore:{value:class{add(){} put(){} delete(){} clear(){}},configurable:true},IDBCursor:{value:class{update(){} delete(){}},configurable:true},Request:{value:class{},configurable:true},XMLHttpRequest:{value:class{open(){} send(){}},configurable:true},navigator:{value:{sendBeacon:()=>true},configurable:true},WebSocket:{value:class{send(){}},configurable:true}}); globalThis.fetch=async()=>({});
    const instrumentation=capture.createBrowserCaptureInstrumentation({evaluate:(callback,argument)=>callback(argument)}); await instrumentation.arm(); if(request.mutation==='cursor-update')new IDBCursor().update();else if(request.mutation==='cursor-delete')new IDBCursor().delete();else if(request.mutation==='send-beacon')navigator.sendBeacon('/write');else if(request.mutation==='websocket-send')new WebSocket().send('write');else if(request.mutation==='fetch-post')await globalThis.fetch('/write',{method:'post'});else if(request.mutation==='fetch-get')await globalThis.fetch('/read');else if(request.mutation==='storage-set')new Storage().setItem('camp01-key','value');else if(request.mutation==='objectstore-put')new IDBObjectStore().put({});else{const xhr=new XMLHttpRequest();xhr.open(request.mutation==='xhr-post'?'post':'get','/target');xhr.send();} value=globalThis.__CAMP01_CAPTURE_GUARD__;
  }
  else if(request.action==='invalidation-failure') { fs.mkdirSync(path.join(root,input.artifactPath),{recursive:true}); await capture.openCaptureTransaction(input,{instrumentation:{seedFixtures:async()=>undefined,arm:async()=>undefined,snapshot:async()=>({})}}).prepare(); }
  else {
    const policy=capture.capturePolicyFor(input.wave), base={fixtureIds:[...policy.fixtureIds],fixtureAliases:[...policy.fixtureAliases],nonFixtureSentinels:[],domState:{html:'fixture-dom'},appState:{storage:[],databases:[],route:'/fixture'},counters:{domMutations:0,storageWrites:0,databaseWrites:0,networkWrites:0},barrierTripped:false};
    for(const artifactPath of request.paths??[input.artifactPath]) {
      const pre=clone(base), post=clone(base), mutation=!request.failPath||request.failPath===artifactPath?request.mutation:undefined;
      if(mutation==='fixture-drift') post.fixtureIds.pop();
      if(mutation==='fixture-policy'){pre.fixtureIds.pop();post.fixtureIds.pop();}
      if(mutation==='non-fixture') pre.nonFixtureSentinels.push('profile-sentinel');
      if(mutation==='state-drift') post.domState.html='drifted';
      if(mutation==='barrier') post.barrierTripped=true;
      if(mutation?.startsWith('counter:')) post.counters[mutation.slice(8)]+=1;
      let snapshotIndex=0;
      const transaction=capture.openCaptureTransaction({...input,artifactPath},{instrumentation:{seedFixtures:async()=>undefined,arm:async()=>undefined,snapshot:async()=>[pre,post][snapshotIndex++]}});
      await transaction.prepare();
      await transaction.capture(async(file)=>fs.writeFileSync(file,Buffer.from(request.png??'PNG fixture bytes')));
      value=await transaction.publish();
    }
  }
  const attestation=path.join(root,'.capture-attestations.json');
  process.stdout.write(JSON.stringify({ok:true,value,pngs:fs.existsSync(root)?fs.readdirSync(root).filter((name)=>name.endsWith('.png')).sort():[],attestations:fs.existsSync(attestation)?JSON.parse(fs.readFileSync(attestation,'utf8')):null}));
} catch(error) {
  const attestation=path.join(root,'.capture-attestations.json'); process.stdout.write(JSON.stringify({ok:false,name:error.name,error:error.message,pngs:fs.existsSync(root)?fs.readdirSync(root).filter((name)=>name.endsWith('.png')).sort():[],attestation:fs.existsSync(attestation),attestations:fs.existsSync(attestation)?JSON.parse(fs.readFileSync(attestation,'utf8')):null}));
  process.exitCode=1;
}`;

type Result = {
  readonly ok: boolean;
  readonly name?: string;
  readonly error?: string;
  readonly value?: Record<string, unknown>;
  readonly pngs?: readonly string[];
  readonly attestation?: boolean;
  readonly attestations?: readonly Record<string, unknown>[] | null;
};

function invoke(request: Record<string, unknown>): Result {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof4a-'));
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    { input: JSON.stringify({ root, ...request }), encoding: 'utf8' },
  );
  const value = JSON.parse(result.stdout) as Result;
  fs.rmSync(root, { recursive: true, force: true });
  return value;
}

describe('CAMP-01 guarded capture transaction', () => {
  it('admits only the frozen invocation, command index, and PNG path matrix', () => {
    const contracts = [
      ['camp-01e', 'camp-01e-picker-browser', 1, 'desktop.png'],
      ['camp-01e', 'camp-01e-picker-browser', 1, 'mobile-390x844.png'],
      ['camp-01h', '01-ux-audit-deep', 0, 'desktop.png'],
      ['camp-01h', '01-ux-audit-deep', 0, 'mobile-390x844.png'],
    ] as const;
    for (const [
      wave,
      invocationId,
      commandSequenceIndex,
      artifactPath,
    ] of contracts)
      expect(
        invoke({
          action: 'admission',
          wave,
          invocationId,
          commandSequenceIndex,
          artifactPath,
        }).ok,
      ).toBe(true);
    for (const mutation of [
      { wave: 'camp-01f' },
      { invocationId: 'caller-selected' },
      { commandSequenceIndex: 0 },
      { artifactPath: 'other.png' },
    ])
      expect(invoke({ action: 'admission', ...mutation }).ok).toBe(false);
  });

  it.each([
    'fixture-drift',
    'fixture-policy',
    'non-fixture',
    'state-drift',
    'barrier',
    'counter:domMutations',
    'counter:storageWrites',
    'counter:databaseWrites',
    'counter:networkWrites',
  ])('deletes the PNG and publishes no attestation for %s', (mutation) => {
    const result = invoke({ action: 'capture', mutation });
    expect(result).toMatchObject({ ok: false, pngs: [], attestation: false });
    expect(result.name).toBe('Camp01CaptureInvalidError');
    expect(result.error).toMatch(/^CAMP01_CAPTURE_INVALID:/);
  });

  it.each([
    ['cursor-update', 'databaseWrites', 1, true],
    ['cursor-delete', 'databaseWrites', 1, true],
    ['send-beacon', 'networkWrites', 1, true],
    ['websocket-send', 'networkWrites', 1, true],
    ['fetch-post', 'networkWrites', 1, true],
    ['fetch-get', 'networkWrites', 0, false],
    ['storage-set', 'storageWrites', 1, true],
    ['objectstore-put', 'databaseWrites', 1, true],
    ['xhr-post', 'networkWrites', 1, true],
    ['xhr-get', 'networkWrites', 0, false],
  ])(
    'classifies the browser barrier for %s',
    (mutation, counter, count, tripped) => {
      const result = invoke({ action: 'browser-barrier', mutation });
      expect(result).toMatchObject({
        ok: true,
        value: { barrierTripped: tripped, counters: { [counter]: count } },
      });
    },
  );

  it('uses raw-byte scanning only after clean state checks', () => {
    const result = invoke({
      action: 'capture',
      png: 'CAMP01_NON_FIXTURE_SENTINEL',
    });
    expect(result).toMatchObject({
      ok: false,
      name: 'Camp01CaptureInvalidError',
      pngs: [],
      attestation: false,
    });
  });

  it('writes only the closed digest fields in lexical PNG order', () => {
    const result = invoke({
      action: 'capture',
      paths: ['mobile-390x844.png', 'desktop.png'],
    });
    expect(result.ok).toBe(true);
    expect(result.pngs).toEqual(['desktop.png', 'mobile-390x844.png']);
    expect(result.attestations?.map((entry) => entry.artifactPath)).toEqual([
      'desktop.png',
      'mobile-390x844.png',
    ]);
    expect(Object.keys(result.attestations?.[0] ?? {})).toEqual([
      'invocationId',
      'artifactPath',
      'pngDigest',
      'fixtureAllowlistDigest',
      'preStateDigest',
      'postStateDigest',
      'preMutationCountersDigest',
      'postMutationCountersDigest',
      'barrierPolicyDigest',
    ]);
  });

  it('preserves the sibling attestation when one capture fails', () => {
    const result = invoke({
      action: 'capture',
      paths: ['desktop.png', 'mobile-390x844.png'],
      failPath: 'mobile-390x844.png',
      mutation: 'state-drift',
    });
    expect(result).toMatchObject({ ok: false, pngs: ['desktop.png'] });
    expect(result.attestations?.map((entry) => entry.artifactPath)).toEqual([
      'desktop.png',
    ]);
  });

  it('wraps invalidation filesystem failures in the capture error type', () => {
    expect(invoke({ action: 'invalidation-failure' })).toMatchObject({
      ok: false,
      name: 'Camp01CaptureInvalidError',
      error: 'CAMP01_CAPTURE_INVALID: capture invalidation failed',
    });
  });

  it('leaves non-CAMP launcher environments byte-equivalent', () => {
    const environment = { PATH: 'fixture-path', OTHER: 'fixture-value' };
    expect(invoke({ action: 'environment', environment }).value).toEqual({});
    const writerEnvironment = {
      CAMP01_RUN_ID: `camp01-${'1'.repeat(32)}`,
      CAMP01_ARTIFACT_DIR: 'fixture-artifacts',
      CAMP01_EXECUTION_ID: `execution-${'2'.repeat(24)}`,
    };
    const capture = invoke({
      action: 'environment',
      environment: {
        ...writerEnvironment,
        CAMP01_INVOCATION_ID: 'camp-01e-picker-browser',
      },
    }).value as { CAMP01_CAPTURE_CONTRACT: string };
    expect(JSON.parse(capture.CAMP01_CAPTURE_CONTRACT)).toEqual({
      wave: 'camp-01e',
      invocationId: 'camp-01e-picker-browser',
      commandSequenceIndex: 1,
      artifactPaths: ['desktop.png', 'mobile-390x844.png'],
    });
    expect(
      invoke({
        action: 'environment',
        environment: {
          ...writerEnvironment,
          CAMP01_INVOCATION_ID: 'camp-01f-command-01',
        },
      }).value,
    ).toEqual({});
    expect(
      invoke({
        action: 'environment',
        environment: { CAMP01_INVOCATION_ID: 'caller-selected' },
      }).error,
    ).toMatch(/^CAMP01_CAPTURE_INVALID:/);
    expect(
      invoke({
        action: 'environment',
        environment: { CAMP01_INVOCATION_ID: 'camp-01e-picker-browser' },
      }).error,
    ).toBe('CAMP01_CAPTURE_INVALID: capture environment incomplete');
  });
});

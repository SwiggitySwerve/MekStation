import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-capture-transaction.mjs'),
).href;
const schemasUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.schemas.mjs'),
).href;
const harness = `
import fs from 'node:fs';
import * as capture from ${JSON.stringify(moduleUrl)};
import { canonicalBytes } from ${JSON.stringify(schemasUrl)};
const request=JSON.parse(fs.readFileSync(0,'utf8'));
const root=request.root, input={wave:request.wave??'camp-01e',invocationId:request.invocationId??'camp-01e-picker-browser',commandSequenceIndex:request.commandSequenceIndex??1,artifactPath:request.artifactPath??'desktop.png',artifactDirectory:root};
if(request.inputMutation==='extra') input.extra=true;
if(request.inputMutation==='missing') delete input.artifactDirectory;
const clone=(value)=>JSON.parse(JSON.stringify(value));
const installBrowserGlobals=()=>{
  const databases=[];
  const renderedNodes=[];
  let observedMutation;
  const notifyMutation=()=>observedMutation?.();
  class BrowserElement {
    constructor(tagName){
      this.tagName=tagName.toLowerCase();
      this.attributes={};
      this.textContent='';
    }
    setAttribute(name,value){this.attributes[name]=String(value);}
    getAttribute(name){
      return Object.prototype.hasOwnProperty.call(this.attributes,name)
        ? this.attributes[name]
        : null;
    }
    get outerHTML(){
      const attributes=Object.entries(this.attributes)
        .map(([name,value])=>\` \${name}="\${value}"\`)
        .join('');
      return \`<\${this.tagName}\${attributes}>\${this.textContent}</\${this.tagName}>\`;
    }
  }
  const document={
    body:{
      appendChild(node){
        renderedNodes.push(node);
        notifyMutation();
        return node;
      },
      removeChild(node){
        const index=renderedNodes.indexOf(node);
        if(index>=0)renderedNodes.splice(index,1);
        notifyMutation();
        return node;
      },
    },
    createElement(tagName){
      return new BrowserElement(tagName);
    },
    querySelectorAll(selector){
      const attribute=selector.slice(1,-1);
      return renderedNodes.filter((node)=>node.getAttribute(attribute)!==null);
    },
    documentElement:{
      get outerHTML(){
        const body=renderedNodes.map((node)=>node.outerHTML).join('');
        return \`<html><body>\${body}</body></html>\`;
      },
    },
  };
  class BrowserMutationObserver {
    constructor(callback){this.callback=callback;}
    observe(){observedMutation=this.callback;}
  }
  class BrowserStorage {
    getItem(key){
      const name=String(key);
      return Object.prototype.hasOwnProperty.call(this,name)?this[name]:null;
    }
    setItem(key,value){this[String(key)]=String(value);}
    removeItem(key){delete this[String(key)];}
    clear(){
      for(const key of Object.keys(this))delete this[key];
    }
    restoreItem(key){delete this[String(key)];}
  }
  const upsertDatabase=(name,version=1)=>{
    const existing=databases.find((database)=>database.name===name);
    if(existing)existing.version=version;
    else databases.push({name,version});
  };
  class BrowserIDBObjectStore {
    constructor(databaseName='camp01-browser-state'){
      this.databaseName=databaseName;
    }
    add(){upsertDatabase(this.databaseName);}
    put(){upsertDatabase(this.databaseName);}
    delete(){
      const index=databases.findIndex(
        (database)=>database.name===this.databaseName,
      );
      if(index>=0)databases.splice(index,1);
    }
    clear(){databases.splice(0);}
  }
  class BrowserIDBCursor {update(){} delete(){}}
  class BrowserRequest {constructor(method='GET'){this.method=method;}}
  class BrowserXMLHttpRequest {open(){} send(){}}
  class BrowserWebSocket {send(){}}
  const localStorage=new BrowserStorage();
  const sessionStorage=new BrowserStorage();
  const indexedDB={
    databases:async()=>databases.map((database)=>({...database})),
    open(name,version=1){
      upsertDatabase(String(name),version);
      return{};
    },
    deleteDatabase(name){
      const index=databases.findIndex((database)=>database.name===name);
      if(index>=0)databases.splice(index,1);
      return{};
    },
  };
  Object.defineProperties(globalThis,{
    document:{value:document,configurable:true},
    MutationObserver:{value:BrowserMutationObserver,configurable:true},
    Storage:{value:BrowserStorage,configurable:true},
    IDBObjectStore:{value:BrowserIDBObjectStore,configurable:true},
    IDBCursor:{value:BrowserIDBCursor,configurable:true},
    Request:{value:BrowserRequest,configurable:true},
    XMLHttpRequest:{value:BrowserXMLHttpRequest,configurable:true},
    navigator:{value:{sendBeacon:()=>true},configurable:true},
    WebSocket:{value:BrowserWebSocket,configurable:true},
    localStorage:{value:localStorage,configurable:true},
    sessionStorage:{value:sessionStorage,configurable:true},
    indexedDB:{value:indexedDB,configurable:true},
    location:{value:{pathname:'/camp01/rendered',search:'?proof=5d1'},configurable:true},
  });
  globalThis.fetch=async()=>({});
  return {
    document,
    localStorage,
    sessionStorage,
    indexedDB,
    objectStore:(name)=>new BrowserIDBObjectStore(name),
  };
};
try {
  let value;
  if(request.action==='environment') value=capture.captureEnvironment(request.environment);
  else if(request.action==='request') value=capture.captureRequestFromEnvironment(request.environment,request.artifactPath??'desktop.png');
  else if(request.action==='policy') value=capture.capturePolicyFor(request.wave);
  else if(request.action==='admission') value=capture.openCaptureTransaction(input,{instrumentation:{}}).contract;
  else if(request.action==='browser-barrier') {
    installBrowserGlobals();
    const instrumentation=capture.createBrowserCaptureInstrumentation({evaluate:(callback,argument)=>callback(argument)}); await instrumentation.arm(); if(request.mutation==='cursor-update')new IDBCursor().update();else if(request.mutation==='cursor-delete')new IDBCursor().delete();else if(request.mutation==='send-beacon')navigator.sendBeacon('/write');else if(request.mutation==='websocket-send')new WebSocket().send('write');else if(request.mutation==='fetch-post')await globalThis.fetch('/write',{method:'post'});else if(request.mutation==='fetch-get')await globalThis.fetch('/read');else if(request.mutation==='storage-set')new Storage().setItem('camp01-key','value');else if(request.mutation==='objectstore-put')new IDBObjectStore().put({});else{const xhr=new XMLHttpRequest();xhr.open(request.mutation==='xhr-post'?'post':'get','/target');xhr.send();} value=globalThis.__CAMP01_CAPTURE_GUARD__;
  }
  else if(request.action==='rendered-sentinel') {
    const browser=installBrowserGlobals(), instrumentation=capture.createBrowserCaptureInstrumentation({evaluate:(callback,argument)=>callback(argument)}), sentinel=\`camp01-non-fixture-\${request.mutation}\`;
    const element=browser.document.createElement('aside');element.setAttribute('data-camp01-non-fixture',sentinel);element.textContent='rendered sentinel';
    if(request.mutation==='pre-dom')browser.document.body.appendChild(element);
    else if(request.mutation==='pre-local-storage')browser.localStorage.setItem(sentinel,'visible');
    else if(request.mutation==='pre-session-storage')browser.sessionStorage.setItem(sentinel,'visible');
    else if(request.mutation==='pre-database')browser.indexedDB.open(sentinel,7);
    const transaction=capture.openCaptureTransaction(input,{instrumentation});
    await transaction.prepare();
    await transaction.capture(async(file)=>{
      if(request.mutation==='post-dom')browser.document.body.appendChild(element);
      else if(request.mutation==='post-local-storage')browser.localStorage.setItem(sentinel,'visible');
      else if(request.mutation==='post-session-storage')browser.sessionStorage.setItem(sentinel,'visible');
      else if(request.mutation==='post-database')browser.objectStore(sentinel).put({visible:true});
      fs.writeFileSync(file,Buffer.from('CLEAN PNG BYTES'));
      if(request.mutation==='post-dom')browser.document.body.removeChild(element);
      else if(request.mutation==='post-local-storage')browser.localStorage.restoreItem(sentinel);
      else if(request.mutation==='post-session-storage')browser.sessionStorage.restoreItem(sentinel);
      else if(request.mutation==='post-database')browser.indexedDB.deleteDatabase(sentinel);
    });
    value=await transaction.publish();
  }
  else if(request.action==='invalidation-failure') { fs.mkdirSync(path.join(root,input.artifactPath),{recursive:true}); await capture.openCaptureTransaction(input,{instrumentation:{seedFixtures:async()=>undefined,arm:async()=>undefined,snapshot:async()=>({})}}).prepare(); }
  else if(['phase','existing-png','noop-png','duplicate-attestation','tampered-attestation','noncanonical-attestation'].includes(request.action)) {
    const policy=capture.capturePolicyFor(input.wave), snapshot={fixtureIds:[...policy.fixtureIds],fixtureAliases:[...policy.fixtureAliases],nonFixtureSentinels:[],domState:{html:'fixture-dom'},appState:{storage:[],databases:[],route:'/fixture'},counters:{domMutations:0,storageWrites:0,databaseWrites:0,networkWrites:0},barrierTripped:false};
    const open=(artifactPath=input.artifactPath)=>capture.openCaptureTransaction({...input,artifactPath},{instrumentation:{seedFixtures:async()=>undefined,arm:async()=>undefined,snapshot:async()=>clone(snapshot)}});
    const write=async(file)=>fs.writeFileSync(file,Buffer.from('PNG fixture bytes'));
    const complete=async(artifactPath)=>{const transaction=open(artifactPath);await transaction.prepare();await transaction.capture(write);return transaction.publish();};
    if(request.action==='phase') { const transaction=open(); if(request.mutation==='capture-before-prepare') await transaction.capture(write); else if(request.mutation==='double-capture'){await transaction.prepare();await transaction.capture(write);await transaction.capture(write);} else {await transaction.prepare();await transaction.publish();} }
    else if(request.action==='existing-png') { fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,input.artifactPath),'pre-existing');await open().prepare(); }
    else if(request.action==='noop-png') { const transaction=open();await transaction.prepare();await transaction.capture(async()=>undefined); }
    else if(request.action==='duplicate-attestation') { await complete(input.artifactPath);fs.rmSync(path.join(root,input.artifactPath));value=await complete(input.artifactPath); }
    else if(request.action==='tampered-attestation') { await complete('desktop.png');const attestation=path.join(root,'.capture-attestations.json'),entries=JSON.parse(fs.readFileSync(attestation,'utf8'));if(request.mutation==='foreign-invocation')entries[0].invocationId='camp-01e-command-99';else if(request.mutation==='foreign-path')entries[0].artifactPath='other.png';else if(request.mutation==='extra-field')entries[0].forged='x';else delete entries[0].barrierPolicyDigest;fs.writeFileSync(attestation,canonicalBytes(entries));value=await complete('mobile-390x844.png'); }
    else { await complete('desktop.png');const attestation=path.join(root,'.capture-attestations.json');fs.writeFileSync(attestation,' '+fs.readFileSync(attestation,'utf8'));value=await complete('mobile-390x844.png'); }
  }
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
    'capture-before-prepare',
    'double-capture',
    'publish-before-capture',
  ])(
    'rejects %s phase drift without publishing capture evidence',
    (mutation) => {
      expect(invoke({ action: 'phase', mutation })).toMatchObject({
        ok: false,
        name: 'Camp01CaptureInvalidError',
        error: 'CAMP01_CAPTURE_INVALID: capture transaction phase drift',
        pngs: [],
        attestation: false,
      });
    },
  );

  it.each(['existing-png', 'noop-png'])(
    'rejects the %s PNG contract violation without retaining bytes',
    (action) => {
      expect(invoke({ action })).toMatchObject({
        ok: false,
        name: 'Camp01CaptureInvalidError',
        pngs: [],
        attestation: false,
      });
    },
  );

  it('rejects a duplicate attestation and invalidates its contracted PNG', () => {
    expect(invoke({ action: 'duplicate-attestation' })).toMatchObject({
      ok: false,
      error: 'CAMP01_CAPTURE_INVALID: duplicate capture attestation',
      pngs: [],
      attestation: false,
    });
  });

  it('rejects noncanonical pre-existing attestations before sibling publication', () => {
    expect(invoke({ action: 'noncanonical-attestation' })).toMatchObject({
      ok: false,
      error: 'CAMP01_CAPTURE_INVALID: capture invalidation failed',
      pngs: ['desktop.png'],
      attestation: true,
    });
  });

  // prettier-ignore
  it.each(['foreign-invocation','foreign-path','extra-field','missing-field'])('rejects a byte-canonical tampered attestation (%s) before sibling publication', (mutation) => {
    // Rewritten canonically, so only readAttestations' contract-drift/exactKeys guard can reject it.
    expect(invoke({action:'tampered-attestation',mutation})).toMatchObject({ok:false,error:'CAMP01_CAPTURE_INVALID: capture invalidation failed',pngs:['desktop.png'],attestation:true});
  });

  it('rejects unknown capture policies and non-exact capture request keys', () => {
    expect(invoke({ action: 'policy', wave: 'camp-01f' })).toMatchObject({
      ok: false,
      error: 'CAMP01_CAPTURE_INVALID: capture fixture policy missing',
    });
    for (const inputMutation of ['extra', 'missing'])
      expect(invoke({ action: 'admission', inputMutation })).toMatchObject({
        ok: false,
        error: 'CAMP01_CAPTURE_INVALID: capture request fields drift',
      });
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

  it.each([
    ['J0', 'pre-dom', 'non-fixture state detected'],
    ['J1', 'pre-local-storage', 'non-fixture state detected'],
    ['J2', 'pre-session-storage', 'non-fixture state detected'],
    ['J3', 'pre-database', 'non-fixture state detected'],
    ['J4', 'post-dom', 'capture mutation counter changed'],
    ['J5', 'post-local-storage', 'capture mutation counter changed'],
    ['J6', 'post-session-storage', 'capture mutation counter changed'],
    ['J7', 'post-database', 'capture mutation counter changed'],
  ])(
    'C04-%s rejects the rendered %s sentinel without publishing capture evidence',
    (_row, mutation, guard) => {
      const result = invoke({ action: 'rendered-sentinel', mutation });
      expect(result).toMatchObject({
        ok: false,
        name: 'Camp01CaptureInvalidError',
        error: `CAMP01_CAPTURE_INVALID: ${guard}`,
        pngs: [],
        attestation: false,
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

  it('routes the direct environment request with only writer-owned fields', () => {
    const environment = {
      CAMP01_RUN_ID: `camp01-${'1'.repeat(32)}`,
      CAMP01_ARTIFACT_DIR: 'fixture-artifacts',
      CAMP01_EXECUTION_ID: `execution-${'2'.repeat(24)}`,
      CAMP01_INVOCATION_ID: 'camp-01e-picker-browser',
    };
    expect(
      invoke({ action: 'request', environment, artifactPath: 'desktop.png' })
        .value,
    ).toEqual({
      wave: 'camp-01e',
      invocationId: 'camp-01e-picker-browser',
      commandSequenceIndex: 1,
      artifactPath: 'desktop.png',
      artifactDirectory: 'fixture-artifacts',
    });
    expect(invoke({ action: 'request', environment: {} }).value).toBeNull();
  });

  // prettier-ignore
  it.each(['camp-01e-picker-browser','01-ux-audit-deep'])('keeps every frozen capture artifact name flat and contract-owned (%s)', (invocationId) => {
    // The re-deferred path-escape guard stays unreachable only while every frozen contract path is a bare basename.
    const environment = {CAMP01_RUN_ID:`camp01-${'1'.repeat(32)}`,CAMP01_ARTIFACT_DIR:'fixture-artifacts',CAMP01_EXECUTION_ID:`execution-${'2'.repeat(24)}`,CAMP01_INVOCATION_ID:invocationId};
    const routed = invoke({action:'environment',environment}).value as {CAMP01_CAPTURE_CONTRACT:string};
    const contract = JSON.parse(routed.CAMP01_CAPTURE_CONTRACT) as {artifactPaths:readonly string[]};
    expect(contract.artifactPaths.length).toBeGreaterThan(0);
    expect(contract.artifactPaths.every((artifactPath)=>path.basename(artifactPath)===artifactPath&&!artifactPath.includes('/')&&!artifactPath.includes('\\'))).toBe(true);
  });
});

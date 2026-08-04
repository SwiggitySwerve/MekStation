import * as fs from 'node:fs';
import * as path from 'node:path';

import { CAPTURE_CONTRACTS } from './camp01-authority-receipt.contract.mjs';
import {
  canonicalBytes,
  digestBytes,
} from './camp01-authority-receipt.schemas.mjs';

// prettier-ignore
const COUNTER_FIELDS=['domMutations','storageWrites','databaseWrites','networkWrites'];
// prettier-ignore
const SNAPSHOT_FIELDS=['fixtureIds','fixtureAliases','nonFixtureSentinels','domState','appState','counters','barrierTripped'];
// prettier-ignore
const ATTESTATION_FIELDS=['invocationId','artifactPath','pngDigest','fixtureAllowlistDigest','preStateDigest','postStateDigest','preMutationCountersDigest','postMutationCountersDigest','barrierPolicyDigest'];
// prettier-ignore
const FIXTURES=deepFreeze({'camp-01e':{fixtureIds:['camp01-picker-saved-design','camp01-picker-stock-template'],fixtureAliases:['Saved Designs','Stock Templates']},'camp-01h':{fixtureIds:['camp01-h-campaign','camp01-h-canonical-unit','camp01-h-saved-design'],fixtureAliases:['campaign-mech-bay-readiness','canonical-combat-post-battle','custom-save-reload']}});
// prettier-ignore
const BARRIER_POLICY=deepFreeze({counterFields:COUNTER_FIELDS,captureRelevantWrites:['dom','storage','database','network'],rawByteSentinels:['CAMP01_NON_FIXTURE_SENTINEL','CAMP01_PRIVATE_SENTINEL']});
const BARRIER_POLICY_DIGEST = digestValue(BARRIER_POLICY);

export class Camp01CaptureInvalidError extends Error {
  constructor(message, options) {
    super(`CAMP01_CAPTURE_INVALID: ${message}`, options);
    this.name = 'Camp01CaptureInvalidError';
  }
}

// prettier-ignore
export function capturePolicyFor(wave) { const fixtures=FIXTURES[wave]; if (!fixtures) fail('capture fixture policy missing'); return deepFreeze({...fixtures,fixtureAllowlistDigest:digestValue(fixtures),barrierPolicyDigest:BARRIER_POLICY_DIGEST}); }

// prettier-ignore
export function captureEnvironment(environment) {
  const invocationId=environment?.CAMP01_INVOCATION_ID; if (!invocationId) return {};
  const match=findInvocation(invocationId), required=['CAMP01_RUN_ID','CAMP01_ARTIFACT_DIR','CAMP01_EXECUTION_ID']; if (!match) { if (required.every((key)=>typeof environment[key]==='string'&&environment[key].length)) return {}; fail('partial or unknown capture invocation'); }
  if (!required.every((key)=>typeof environment[key]==='string'&&environment[key].length)) fail('capture environment incomplete');
  const value={wave:match.wave,invocationId,commandSequenceIndex:match.commandSequenceIndex,artifactPaths:match.artifactPaths}; return {CAMP01_CAPTURE_CONTRACT:JSON.stringify(value)};
}

// prettier-ignore
export function captureRequestFromEnvironment(environment, artifactPath) { const routed=captureEnvironment(environment), encoded=routed.CAMP01_CAPTURE_CONTRACT; if (!encoded) return null; const contract=JSON.parse(encoded); return {wave:contract.wave,invocationId:contract.invocationId,commandSequenceIndex:contract.commandSequenceIndex,artifactPath,artifactDirectory:environment.CAMP01_ARTIFACT_DIR}; }

// prettier-ignore
export function openCaptureTransaction(input, dependencies) {
  exactKeys(input,['wave','invocationId','commandSequenceIndex','artifactPath','artifactDirectory'],'capture request');
  const contract=(CAPTURE_CONTRACTS[input.wave]??[]).find((entry)=>entry.invocationId===input.invocationId&&entry.commandSequenceIndex===input.commandSequenceIndex&&entry.artifactPaths.includes(input.artifactPath)); if (!contract) fail('capture contract admission failed');
  const root=path.resolve(input.artifactDirectory), pngPath=path.resolve(root,input.artifactPath); if (path.dirname(pngPath)!==root) fail('capture path escaped artifact root'); const attestationPath=path.join(root,'.capture-attestations.json'), policy=capturePolicyFor(input.wave), instrumentation=dependencies?.instrumentation, invalidation={pngPath,attestationPath,artifactPath:input.artifactPath,contract}; let pre=null, captured=false;
  return Object.freeze({contract:Object.freeze({wave:input.wave,invocationId:contract.invocationId,commandSequenceIndex:contract.commandSequenceIndex,artifactPath:input.artifactPath}),prepare:async()=>{try{if(!instrumentation||typeof instrumentation.seedFixtures!=='function'||typeof instrumentation.arm!=='function'||typeof instrumentation.snapshot!=='function') fail('capture instrumentation missing'); if(fs.existsSync(pngPath)) fail('capture PNG already exists'); fs.mkdirSync(root,{recursive:true}); await instrumentation.seedFixtures(policy); await instrumentation.arm(BARRIER_POLICY); pre=await instrumentation.snapshot(); validateSnapshot(pre,policy); return pre;}catch(error){invalidate(invalidation,error);}},capture:async(writePng)=>{try{if(!pre||captured) fail('capture transaction phase drift'); await writePng(pngPath); if(!fs.existsSync(pngPath)||!fs.statSync(pngPath).isFile()) fail('capture PNG missing'); captured=true; return pngPath;}catch(error){invalidate(invalidation,error);}},publish:async()=>{try{if(!pre||!captured) fail('capture transaction phase drift'); const post=await instrumentation.snapshot(); validateSnapshot(post,policy); const preState=digestValue(stateOf(pre)), postState=digestValue(stateOf(post)), preCounters=digestValue(pre.counters), postCounters=digestValue(post.counters); for(const key of COUNTER_FIELDS) if(post.counters[key]<pre.counters[key]) fail('mutation counter lost monotonicity'); if(preCounters!==postCounters) fail('capture mutation counter changed'); if(pre.barrierTripped||post.barrierTripped) fail('capture write barrier tripped'); if(preState!==postState) fail('capture state drift'); const bytes=fs.readFileSync(pngPath); if(BARRIER_POLICY.rawByteSentinels.some((sentinel)=>bytes.includes(Buffer.from(sentinel)))) fail('capture raw-byte sentinel found'); const value={invocationId:input.invocationId,artifactPath:input.artifactPath,pngDigest:digestBytes(bytes),fixtureAllowlistDigest:policy.fixtureAllowlistDigest,preStateDigest:preState,postStateDigest:postState,preMutationCountersDigest:preCounters,postMutationCountersDigest:postCounters,barrierPolicyDigest:policy.barrierPolicyDigest}, existing=readAttestations(attestationPath,contract); if(existing.some((entry)=>entry.artifactPath===input.artifactPath)) fail('duplicate capture attestation'); const next=[...existing,value].sort((left,right)=>left.artifactPath<right.artifactPath?-1:left.artifactPath>right.artifactPath?1:0); fs.writeFileSync(attestationPath,canonicalBytes(next)); return value;}catch(error){invalidate(invalidation,error);}}});
}

// Main-world self-reporting catches accidental first-party mutation, not hostile page code; pre-arm references and worker/service-worker contexts are outside this barrier.
// prettier-ignore
export function createBrowserCaptureInstrumentation(page) {
  return Object.freeze({seedFixtures:async(policy)=>page.evaluate((fixtures)=>{globalThis.__CAMP01_CAPTURE_FIXTURES__={ids:[...fixtures.fixtureIds],aliases:[...fixtures.fixtureAliases]};},policy),arm:async()=>page.evaluate((fields)=>{const state={counters:Object.fromEntries(fields.map((field)=>[field,0])),barrierTripped:false}, bump=(field)=>{state.counters[field]+=1;state.barrierTripped=true;}; globalThis.__CAMP01_CAPTURE_GUARD__=state; new MutationObserver(()=>bump('domMutations')).observe(document,{subtree:true,childList:true,attributes:true,characterData:true}); for(const method of ['setItem','removeItem','clear']){const original=Storage.prototype[method];Storage.prototype[method]=function(...args){bump('storageWrites');return original.apply(this,args);};} for(const method of ['add','put','delete','clear']){const original=IDBObjectStore.prototype[method];IDBObjectStore.prototype[method]=function(...args){bump('databaseWrites');return original.apply(this,args);};} for(const method of ['update','delete']){const original=IDBCursor.prototype[method];IDBCursor.prototype[method]=function(...args){bump('databaseWrites');return original.apply(this,args);};} const originalFetch=globalThis.fetch;globalThis.fetch=function(input,init){const method=String(init?.method??(input instanceof Request?input.method:'GET')).toUpperCase();if(!['GET','HEAD'].includes(method))bump('networkWrites');return originalFetch.call(this,input,init);}; const originalBeacon=navigator.sendBeacon;navigator.sendBeacon=function(...args){bump('networkWrites');return originalBeacon.apply(this,args);}; const originalWebSocketSend=WebSocket.prototype.send;WebSocket.prototype.send=function(...args){bump('networkWrites');return originalWebSocketSend.apply(this,args);}; const originalOpen=XMLHttpRequest.prototype.open,originalSend=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.open=function(method,...args){this.__camp01Method=String(method).toUpperCase();return originalOpen.call(this,method,...args);};XMLHttpRequest.prototype.send=function(...args){if(!['GET','HEAD'].includes(this.__camp01Method??'GET'))bump('networkWrites');return originalSend.apply(this,args);};},COUNTER_FIELDS),snapshot:async()=>page.evaluate(async()=>{const fixtures=globalThis.__CAMP01_CAPTURE_FIXTURES__, guard=globalThis.__CAMP01_CAPTURE_GUARD__; if(!fixtures||!guard) throw new Error('capture guard unavailable'); const marked=(attribute)=>[...document.querySelectorAll(`[${attribute}]`)].map((node)=>node.getAttribute(attribute)).filter(Boolean), storage=(value)=>Object.keys(value).sort().map((key)=>[key,value.getItem(key)]), databases=typeof indexedDB.databases==='function'?(await indexedDB.databases()).map(({name,version})=>({name:name??'',version:version??0})).sort((a,b)=>a.name.localeCompare(b.name)):[]; return {fixtureIds:[...new Set([...fixtures.ids,...marked('data-camp01-fixture-id')])].sort(),fixtureAliases:[...new Set([...fixtures.aliases,...marked('data-camp01-fixture-alias')])].sort(),nonFixtureSentinels:[...marked('data-camp01-non-fixture'),...storage(localStorage).filter(([key])=>key.startsWith('camp01-non-fixture')).map(([key])=>key),...storage(sessionStorage).filter(([key])=>key.startsWith('camp01-non-fixture')).map(([key])=>key),...databases.filter(({name})=>name.startsWith('camp01-non-fixture')).map(({name})=>name)].sort(),domState:{html:document.documentElement.outerHTML},appState:{route:`${location.pathname}${location.search}`,localStorage:storage(localStorage),sessionStorage:storage(sessionStorage),databases},counters:{...guard.counters},barrierTripped:guard.barrierTripped};})});
}

// prettier-ignore
function validateSnapshot(value,policy) { exactKeys(value,SNAPSHOT_FIELDS,'capture snapshot'); sortedStrings(value.fixtureIds,'fixture ids'); sortedStrings(value.fixtureAliases,'fixture aliases'); const sentinels=sortedStrings(value.nonFixtureSentinels,'non-fixture sentinels'); if(JSON.stringify(value.fixtureIds)!==JSON.stringify(policy.fixtureIds)||JSON.stringify(value.fixtureAliases)!==JSON.stringify(policy.fixtureAliases)) fail('fixture set drift'); if(sentinels.length) fail('non-fixture state detected'); exactKeys(value.counters,COUNTER_FIELDS,'mutation counters'); if(Object.values(value.counters).some((entry)=>!Number.isSafeInteger(entry)||entry<0)||typeof value.barrierTripped!=='boolean') fail('invalid capture counters'); stable(value.domState); stable(value.appState); }
// prettier-ignore
function stateOf(snapshot) { return {fixtureIds:snapshot.fixtureIds,fixtureAliases:snapshot.fixtureAliases,domState:snapshot.domState,appState:snapshot.appState}; }
// prettier-ignore
function readAttestations(file,contract) { if(!fs.existsSync(file)) return []; const bytes=fs.readFileSync(file,'utf8'), value=JSON.parse(bytes); if(bytes!==canonicalBytes(value)||!Array.isArray(value)) fail('capture attestations are non-canonical'); value.forEach((entry)=>{exactKeys(entry,ATTESTATION_FIELDS,'capture attestation');if(entry.invocationId!==contract.invocationId||!contract.artifactPaths.includes(entry.artifactPath))fail('capture attestation contract drift');}); return value; }
// prettier-ignore
function findInvocation(invocationId) { const matches=Object.entries(CAPTURE_CONTRACTS).flatMap(([wave,entries])=>entries.filter((entry)=>entry.invocationId===invocationId).map((entry)=>({wave,...entry}))); if(matches.length>1) fail('capture invocation is ambiguous'); return matches[0]??null; }
// prettier-ignore
function sortedStrings(value,label) { if(!Array.isArray(value)||value.some((entry)=>typeof entry!=='string')||new Set(value).size!==value.length) fail(`invalid ${label}`); return [...value].sort(); }
// prettier-ignore
function digestValue(value) { return digestBytes(JSON.stringify(stable(value))); }
// prettier-ignore
function stable(value) { if(value===null||typeof value==='string'||typeof value==='boolean')return value;if(typeof value==='number'&&Number.isFinite(value))return value;if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map((key)=>[key,stable(value[key])]));fail('non-canonical capture state'); }
// prettier-ignore
function exactKeys(value,keys,label) { if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(Object.keys(value).sort())!==JSON.stringify([...keys].sort())) fail(`${label} fields drift`); }
function invalidate(
  { pngPath, attestationPath, artifactPath, contract },
  error,
) {
  try {
    fs.rmSync(pngPath, { force: true });
    const retained = readAttestations(attestationPath, contract).filter(
      (entry) => entry.artifactPath !== artifactPath,
    );
    if (retained.length)
      fs.writeFileSync(attestationPath, canonicalBytes(retained));
    else fs.rmSync(attestationPath, { force: true });
  } catch (cleanupError) {
    throw new Camp01CaptureInvalidError('capture invalidation failed', {
      cause: cleanupError,
    });
  }
  if (error instanceof Camp01CaptureInvalidError) throw error;
  throw new Camp01CaptureInvalidError('capture transaction failed', {
    cause: error,
  });
}
function fail(message) {
  throw new Camp01CaptureInvalidError(message);
}
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  WAVE_CONTRACTS,
  assertRepairDeclaration,
} from './camp01-authority-receipt.contract.mjs';
import {
  canonicalBytes,
  digestBytes,
  resolveReceiptRow,
} from './camp01-authority-receipt.schemas.mjs';

// prettier-ignore
const EVENT_KEYS=['schema','kind','ordinal','wave','previousDigest','declarationDigest','sourceDigest','targetDigest'], EVENT_NAME=/^(\d{8})-([0-9a-f]{64})$/, DIGEST=/^sha256:[0-9a-f]{64}$/, STAGE_PREFIX='.camp01-repair-stage-', PAYLOAD_FILES=['declaration.json','event.json','source.json'], PAYLOAD_ONLY=PAYLOAD_FILES.filter((name)=>name!=='event.json');

export class Camp01RepairRegistryError extends Error {
  constructor(message) {
    super(`CAMP01_REPAIR_REGISTRY_INVALID: ${message}`);
    this.name = 'Camp01RepairRegistryError';
  }
}

export function createRepairRegistry(options = {}, dependencies = {}) {
  const io = dependencies.fs ?? fs,
    initiatingRoot = canonicalRoot(options.initiatingRoot ?? process.cwd(), io),
    registryRoot = path.resolve(
      options.registryRoot ??
        path.join(
          initiatingRoot,
          '.sisyphus',
          'evidence',
          'playtest',
          '.camp01-repair-registry',
        ),
    );
  assertBelow(initiatingRoot, registryRoot);
  if (options.readOnly)
    assertDirectory(registryRoot, io, 'repair registration absent');
  else ensureDirectory(initiatingRoot, registryRoot, io);
  const read = () => readRegistry(registryRoot, io);
  return Object.freeze({
    // prettier-ignore
    register(input) { try { exactKeys(input,['wave','declaration','source'],'registration input drift'); const declarationBytes=assertRepairDeclaration(input.declaration,input.source), sourceBytes=canonicalBytes(input.source); if(Object.hasOwn(WAVE_CONTRACTS,input.wave))fail('frozen wave registration rejected'); const row=resolveReceiptRow(input.wave,input.declaration,input.source); if(row.wave!==input.wave)fail('registration row identity drift'); const current=read(), prior=current.registrations.find(({wave})=>wave===input.wave); if(prior){if(current.active.includes(prior)&&canonicalBytes(prior.declaration)===declarationBytes&&canonicalBytes(prior.source)===sourceBytes)return publicEntry(prior);fail('duplicate repair registration');} const event=registerEvent(current.events.length,input.wave,current.lastDigest,declarationBytes,sourceBytes), reference=publishEvent(registryRoot,event,{declarationBytes,sourceBytes},io), reopened=read().active.find((entry)=>entry.reference===reference); if(!reopened)fail('registration reopen failed'); return publicEntry(reopened); } catch(error){typed(error,'registration failed');} },
    discover() {
      return Object.freeze(read().active.map(publicEntry));
    },
    // prettier-ignore
    require(reference) { const found=read().active.filter((entry)=>entry.reference===reference||entry.wave===reference); if(found.length!==1)fail('repair registration absent'); return publicEntry(found[0]); },
    // prettier-ignore
    cleanup(input) { try { exactKeys(input,['wave','reference'],'cleanup input drift'); const current=read(), found=current.active.find((entry)=>entry.wave===input.wave&&entry.reference===input.reference); if(!found)fail('repair registration absent'); publishEvent(registryRoot,cleanupEvent(current.events.length,found,current.lastDigest),null,io); assertBelow(registryRoot,found.directory); assertDirectory(found.directory,io,'registration cleanup target drift'); removePayload(found.directory,io); if(read().active.some(({wave})=>wave===found.wave))fail('registration cleanup incomplete'); return Object.freeze({wave:found.wave,reference:found.reference,removed:true}); } catch(error){typed(error,'registration cleanup failed');} },
  });
}

// prettier-ignore
function readRegistry(root,io) {
  recoverStages(root,io); const names=io.readdirSync(root).sort(), events=[], registrations=[], active=new Map(); let previousDigest=null;
  for(let ordinal=0;ordinal<names.length;ordinal+=1){const name=names[ordinal], match=EVENT_NAME.exec(name);if(!match)fail('registration root entry drift');const directory=path.join(root,name);assertDirectory(directory,io,'registration path reparse rejected');const bytes=readFile(path.join(directory,'event.json'),io),event=parseCanonical(bytes,'registration event canonicality drift');exactKeys(event,EVENT_KEYS,'registration event fields drift');if(event.schema!=='camp01-repair-registry-event/v1'||!['register','cleanup'].includes(event.kind)||event.ordinal!==ordinal||Number(match[1])!==ordinal)fail('registration order drift');const reference=digestBytes(bytes);if(match[2]!==reference.slice(7))fail('registration event digest drift');if(event.previousDigest!==previousDigest)fail('registration chain link drift');
    if(event.kind==='register'){const duplicate=registrations.some(({wave})=>wave===event.wave);if(Object.hasOwn(WAVE_CONTRACTS,event.wave))fail('frozen wave registration rejected');if(!DIGEST.test(event.declarationDigest)||!DIGEST.test(event.sourceDigest)||event.targetDigest!==null||duplicate)fail(duplicate?'duplicate repair registration':'registration event fields drift');const registration={wave:event.wave,reference,directory,event};registrations.push(registration);active.set(event.wave,registration);
    }else{if(event.declarationDigest!==null||event.sourceDigest!==null||!DIGEST.test(event.targetDigest))fail('registration event fields drift');const registration=registrations.find((entry)=>entry.reference===event.targetDigest);if(!registration||active.get(event.wave)!==registration)fail('registration cleanup link drift');active.delete(event.wave);}events.push({event,reference,directory});previousDigest=reference;}
  for(const registration of registrations){if(!active.has(registration.wave)){removePayload(registration.directory,io);continue;}const entries=io.readdirSync(registration.directory).sort();if(JSON.stringify(entries)!==JSON.stringify(PAYLOAD_FILES))fail('registration payload set drift');const declarationBytes=readFile(path.join(registration.directory,'declaration.json'),io),sourceBytes=readFile(path.join(registration.directory,'source.json'),io),declaration=parseCanonical(declarationBytes,'repair declaration canonicality drift'),source=parseCanonical(sourceBytes,'repair source canonicality drift');if(digestBytes(declarationBytes)!==registration.event.declarationDigest||digestBytes(sourceBytes)!==registration.event.sourceDigest)fail('registration payload digest drift');try{assertRepairDeclaration(declaration,source);registration.row=resolveReceiptRow(registration.wave,declaration,source);}catch{fail('registered repair declaration rejected');}registration.declaration=declaration;registration.source=source;}
  return {events,registrations,active:[...active.values()].sort((a,b)=>a.wave.localeCompare(b.wave)),lastDigest:previousDigest};
}

// prettier-ignore
function publishEvent(root,event,payload,io) { assertDirectory(root,io,'registration path reparse rejected'); const bytes=canonicalBytes(event),reference=digestBytes(bytes),final=path.join(root,`${String(event.ordinal).padStart(8,'0')}-${reference.slice(7)}`),stage=io.mkdtempSync(path.join(root,STAGE_PREFIX));let published=false;try{io.writeFileSync(path.join(stage,'event.json'),bytes,{flag:'wx'});if(payload)for(const [name,value] of [['declaration.json',payload.declarationBytes],['source.json',payload.sourceBytes]])io.writeFileSync(path.join(stage,name),value,{flag:'wx'});if(lstatIfPresent(final,io)!==null)fail('registration publication collision');io.renameSync(stage,final);published=true;return reference;}finally{if(!published&&lstatIfPresent(stage,io)!==null)removeStage(stage,io);}}
// prettier-ignore
function eventEnvelope(kind,ordinal,wave,previousDigest) { return {schema:'camp01-repair-registry-event/v1',kind,ordinal,wave,previousDigest}; }
// prettier-ignore
function registerEvent(ordinal,wave,previousDigest,declarationBytes,sourceBytes) { return {...eventEnvelope('register',ordinal,wave,previousDigest),declarationDigest:digestBytes(declarationBytes),sourceDigest:digestBytes(sourceBytes),targetDigest:null}; }
// prettier-ignore
function cleanupEvent(ordinal,registration,previousDigest) { return {...eventEnvelope('cleanup',ordinal,registration.wave,previousDigest),declarationDigest:null,sourceDigest:null,targetDigest:registration.reference}; }
// prettier-ignore
function recoverStages(root,io) { for(const name of io.readdirSync(root))if(name.startsWith(STAGE_PREFIX))removeStage(path.join(root,name),io); }
// prettier-ignore
function removeStage(stage,io) { assertDirectory(stage,io,'registration staging residue unsafe');for(const name of io.readdirSync(stage)){const stat=io.lstatSync(path.join(stage,name));if(!PAYLOAD_FILES.includes(name)||stat.isSymbolicLink()||!stat.isFile())fail('registration staging residue unsafe');}io.rmSync(stage,{recursive:true,force:false}); }
// prettier-ignore
function removePayload(directory,io) { assertDirectory(directory,io,'registration cleanup target drift');const entries=io.readdirSync(directory);if(!entries.includes('event.json')||entries.some((name)=>!PAYLOAD_FILES.includes(name)))fail('registration cleanup target drift');for(const name of PAYLOAD_ONLY){const file=path.join(directory,name),stat=lstatIfPresent(file,io);if(stat===null)continue;if(stat.isSymbolicLink()||!stat.isFile())fail('registration cleanup target drift');io.unlinkSync(file);} }
// prettier-ignore
function publicEntry(entry) { return Object.freeze({wave:entry.wave,row:entry.row,declaration:entry.declaration,source:entry.source,reference:entry.reference}); }

// prettier-ignore
function canonicalRoot(value,io) { try{const requested=path.resolve(value),canonical=io.realpathSync.native(requested);if(canonical!==requested||!io.statSync(canonical).isDirectory())fail('initiating root unavailable');assertPath(canonical,io);return canonical;}catch(error){typed(error,'initiating root unavailable');} }
// prettier-ignore
function ensureDirectory(root,target,io) { let current=root;for(const part of path.relative(root,target).split(path.sep).filter(Boolean)){current=path.join(current,part);const stat=lstatIfPresent(current,io);if(stat===null)io.mkdirSync(current);else if(stat.isSymbolicLink()||!stat.isDirectory())fail('registration path reparse rejected');}assertPath(target,io); }
// prettier-ignore
function assertDirectory(value,io,message) { const stat=lstatIfPresent(value,io);if(!stat||stat.isSymbolicLink()||!stat.isDirectory())fail(message);assertPath(value,io); }
// prettier-ignore
function assertPath(value,io) { const absolute=path.resolve(value),parsed=path.parse(absolute);let current=parsed.root;for(const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)){current=path.join(current,part);if(io.lstatSync(current).isSymbolicLink())fail('registration path reparse rejected');} }
// prettier-ignore
function assertBelow(root,target) { const relative=path.relative(root,target);if(!relative||relative.startsWith('..')||path.isAbsolute(relative))fail('registration root escaped initiating tree'); }
// prettier-ignore
function readFile(file,io) { const stat=lstatIfPresent(file,io);if(!stat||stat.isSymbolicLink()||!stat.isFile())fail('registration artifact unreadable');return io.readFileSync(file); }
// prettier-ignore
function parseCanonical(bytes,message) { try{const text=bytes.toString('utf8'),value=JSON.parse(text);if(text!==canonicalBytes(value))fail(message);return value;}catch(error){if(error instanceof Camp01RepairRegistryError)throw error;fail(message);} }
// prettier-ignore
function exactKeys(value,keys,message) { if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(Object.keys(value))!==JSON.stringify(keys))fail(message); }
// prettier-ignore
function lstatIfPresent(value,io) { try{return io.lstatSync(value);}catch(error){if(error?.code==='ENOENT')return null;throw error;} }
// prettier-ignore
function typed(error,message) { if(error instanceof Camp01RepairRegistryError)throw error;fail(message); }
// prettier-ignore
function fail(message) { throw new Camp01RepairRegistryError(message); }

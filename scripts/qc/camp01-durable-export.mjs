import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  canonicalBytes,
  digestBytes,
  resolveReceiptRow,
} from './camp01-authority-receipt.schemas.mjs';

const VALIDATOR_ENTRY = fileURLToPath(
    new URL('./validate-camp01-authority-receipt.mjs', import.meta.url),
  ),
  RUN_ROOT = /^\.sisyphus\/evidence\/playtest\/[a-z0-9-]+-[0-9a-f]{40}$/,
  RUN_ID = /^camp01-[0-9a-f]{32}$/,
  SHA = /^[0-9a-f]{40}$/,
  DIGEST = /^sha256:[0-9a-f]{64}$/;

export class Camp01ExportError extends Error {
  constructor(message) {
    super(`CAMP01_EXPORT_INVALID: ${message}`);
    this.name = 'Camp01ExportError';
  }
}

export function createDurableExport(options, dependencies = {}) {
  const io = dependencies.fs ?? fs,
    initiatingRoot = canonicalDirectory(options?.initiatingRoot, 'durable', io),
    transientRoot = canonicalDirectory(options?.transientRoot, 'transient', io),
    copy =
      dependencies.copy ??
      ((source, target) =>
        io.copyFileSync(source, target, fs.constants.COPYFILE_EXCL)),
    validatorSpawn = dependencies.validatorSpawn ?? spawnSync,
    repairRegistration = options.repairRegistration ?? null;
  if (
    initiatingRoot === transientRoot ||
    initiatingRoot.startsWith(`${transientRoot}${path.sep}`)
  )
    fail('durable root is inside proof target');
  const invokePublicValidator = (input) =>
    invokeValidator(
      input,
      {
        initiatingRoot,
        transientRoot,
        validationContext: options.validationContext,
        repairRegistration,
      },
      { io, validatorSpawn },
    );
  return Object.freeze({
    exportReceipt: (input) =>
      exportReceipt(input, {
        initiatingRoot,
        transientRoot,
        copy,
        io,
        invokePublicValidator,
        repairRegistration,
      }),
    invokePublicValidator,
  });
}

// prettier-ignore
async function exportReceipt(input, dependencies) {
  const createdDirectories=[];
  try {
    const {row,receipt,arguments:arguments_,proofTarget}=input??{}, registration=dependencies.repairRegistration, expectedRoot=row?.runRootTemplate?.replace('<sha>',arguments_?.sha), contract=row?resolveReceiptRow(row.wave,registration?.declaration??null,registration?.source??null):null; if(!row||JSON.stringify(row)!==JSON.stringify(contract)||registration&&registration.wave!==row.wave||arguments_?.runRoot!==expectedRoot||!RUN_ROOT.test(arguments_.runRoot)||!SHA.test(arguments_.sha)||!['reviewed-head','exact-main'].includes(arguments_.mode)||!RUN_ID.test(receipt?.runId)||!['observation','final'].includes(receipt.phase)) fail('export identity drift');
    const artifacts=[...row.artifacts]; if(!artifacts.includes('command-result.json')||!artifacts.includes('receipt-manifest.json')||!exactSet(artifacts,receipt.finalizedPaths)||artifacts.some((name)=>!validRelative(name))) fail('finalized artifact set drift');
    const proofRoot=canonicalDirectory(proofTarget?.canonicalPath,'transient',dependencies.io); if(proofRoot!==dependencies.transientRoot) fail('transient root drift'); const transientRunRoot=below(proofRoot,arguments_.runRoot), source=finalizedChild(transientRunRoot,{runId:receipt.runId,message:'source receipt is not finalized',label:'transient'},dependencies.io); assertArtifactSet(source,artifacts,dependencies.io);
    const manifest=readManifest(source,{row,runId:receipt.runId,artifacts},dependencies.io); verifyArtifactBytes(source,manifest,{stage:'transient',io:dependencies.io}); const durableRunRoot=ensureDurableRoot(dependencies.initiatingRoot,arguments_.runRoot,dependencies.io,createdDirectories), destination=path.join(durableRunRoot,receipt.runId), validatorInput={entry:VALIDATOR_ENTRY,stage:'durable',wave:row.wave,mode:arguments_.mode,sha:arguments_.sha,runRoot:arguments_.runRoot,runId:receipt.runId,...registration?{repairRegistration:registration.reference}:{}}; if(destination===proofRoot||destination.startsWith(`${proofRoot}${path.sep}`)) fail('durable destination is inside proof target'); const reopened=await reopenPublished(destination,durableRunRoot,artifacts,manifest,validatorInput,dependencies); if(reopened)return exportResult(receipt,reopened); recoverStagingResidue(durableRunRoot,receipt.runId,dependencies.io); const stageRoot=path.dirname(durableRunRoot), stagePrefix=`.c1e-${digestBytes(arguments_.runRoot).slice(7,23)}-`; recoverSharedStagingResidue(stageRoot,stagePrefix,dependencies.io); assertDestinationAvailable(destination,dependencies.io); if(dependencies.io.readdirSync(durableRunRoot).length) fail('durable destination collision');
    const stage=dependencies.io.mkdtempSync(path.join(stageRoot,stagePrefix)); let published=false;
    try {
      for(const name of artifacts){const sourceFile=below(source,name), target=below(stage,name); dependencies.io.mkdirSync(path.dirname(target),{recursive:true}); try { await dependencies.copy(sourceFile,target); } catch(error) { if(error instanceof Camp01ExportError) throw error; fail('partial copy rejected'); }}
      assertNonReparse(stage,'durable',dependencies.io); assertArtifactSet(stage,artifacts,dependencies.io); const stagedManifest=dependencies.io.readFileSync(path.join(stage,'receipt-manifest.json')); if(!stagedManifest.equals(manifest.bytes)) fail('staged manifest drift'); verifyArtifactBytes(stage,manifest,{stage:'staged',io:dependencies.io});
      assertDestinationAvailable(destination,dependencies.io); if(dependencies.io.readdirSync(durableRunRoot).length) fail('durable destination collision'); assertNonReparse(durableRunRoot,'durable',dependencies.io); try { dependencies.io.renameSync(stage,destination); published=true; } catch(error) { assertDestinationAvailable(destination,dependencies.io); fail('durable publication failed'); }
    } finally { if(!published&&lstatIfPresent(stage,dependencies.io)!==null) dependencies.io.rmSync(stage,{recursive:true,force:true}); }
    await dependencies.invokePublicValidator(validatorInput); return exportResult(receipt,dependencies.io.readFileSync(path.join(destination,'receipt-manifest.json')));
  } catch(error) { if(error instanceof Camp01ExportError) throw error; fail('filesystem operation failed'); }
  finally { removeEmptyAncestors(createdDirectories,dependencies.io); }
}

// prettier-ignore
async function invokeValidator(input, roots, dependencies) {
  try {
    const registration=roots.repairRegistration, keys=['entry','stage','wave','mode','sha','runRoot','runId',...registration?['repairRegistration']:[]]; if(!input||!exactSet(Object.keys(input),keys)||registration&&input.repairRegistration!==registration.reference||path.resolve(input.entry)!==path.resolve(VALIDATOR_ENTRY)||!['transient','durable'].includes(input.stage)||!SHA.test(input.sha)||!RUN_ID.test(input.runId)||!['reviewed-head','exact-main'].includes(input.mode)) fail('public validator input drift'); const row=resolveReceiptRow(input.wave,registration?.declaration??null,registration?.source??null); if(input.runRoot!==row.runRootTemplate.replace('<sha>',input.sha)||!RUN_ROOT.test(input.runRoot)) fail('public validator input drift');
    let root; switch(input.stage){case 'transient':root=roots.transientRoot;break;case 'durable':root=roots.initiatingRoot;break;default:fail('public validator input drift');} finalizedChild(below(root,input.runRoot),{runId:input.runId,message:'public validator receipt identity drift',label:input.stage},dependencies.io);
    const raw=typeof roots.validationContext==='function'?await roots.validationContext(input):roots.validationContext??process.env.CAMP01_VALIDATION_CONTEXT, context=serializeContext(raw); const args=[input.entry,`--wave=${input.wave}`,`--run-root=${input.runRoot}`,`--expected-sha=${input.sha}`,`--mode=${input.mode}`,...registration?[`--repair-registration=${registration.reference}`]:[]]; let result; try { result=await dependencies.validatorSpawn(process.execPath,args,{cwd:root,encoding:'utf8',env:{...process.env,CAMP01_VALIDATION_CONTEXT:context,CAMP01_REPAIR_REGISTRY_ROOT:roots.initiatingRoot},shell:false}); } catch(error) { fail(`public validator failed for ${input.stage} stage`); } if(!result||result.status!==0) fail(`public validator failed for ${input.stage} stage`); return {validated:true};
  } catch(error) { if(error instanceof Camp01ExportError) throw error; fail('public validator invocation failed'); }
}

// prettier-ignore
function readManifest(root,identity,io) { const file=path.join(root,'receipt-manifest.json'), bytes=io.readFileSync(file); let value; try { value=JSON.parse(bytes.toString('utf8')); } catch(error) { fail('transient manifest drift'); } const expected=identity.artifacts.filter((name)=>name!=='receipt-manifest.json').sort(codeUnit); if(!value||JSON.stringify(Object.keys(value))!==JSON.stringify(['schema','runId','wave','entries'])||value.schema!=='camp01-receipt-manifest/v1'||value.runId!==identity.runId||value.wave!==identity.row.wave||!Array.isArray(value.entries)||bytes.toString('utf8')!==canonicalBytes(value)||JSON.stringify(value.entries.map((entry)=>entry.path))!==JSON.stringify(expected)) fail('transient manifest drift'); const entries=new Map(); for(const entry of value.entries){if(JSON.stringify(Object.keys(entry))!==JSON.stringify(['path','type','size','digest'])||entry.type!=='file'||!Number.isSafeInteger(entry.size)||entry.size<0||!DIGEST.test(entry.digest)||entries.has(entry.path)) fail('transient manifest drift'); entries.set(entry.path,entry);} return {bytes,entries}; }
// prettier-ignore
function verifyArtifactBytes(root,manifest,context) { for(const [name,entry] of manifest.entries){const bytes=context.io.readFileSync(below(root,name)); if(bytes.length!==entry.size||digestBytes(bytes)!==entry.digest) fail(`${context.stage} artifact digest drift: ${name}`);} }
// prettier-ignore
function assertArtifactSet(root,artifacts,io) { const expected=[...artifacts].sort(codeUnit), found=[]; function walk(directory,relative){for(const name of io.readdirSync(directory)){const nested=relative?`${relative}/${name}`:name, target=path.join(directory,name), stat=io.lstatSync(target); if(stat.isSymbolicLink()) fail('finalized artifact set drift'); if(stat.isFile()) found.push(nested); else if(stat.isDirectory()&&expected.some((entry)=>entry.startsWith(`${nested}/`))) walk(target,nested); else fail('finalized artifact set drift');}} walk(root,''); if(JSON.stringify(found.sort(codeUnit))!==JSON.stringify(expected)) fail('finalized artifact set drift'); }
// prettier-ignore
function finalizedChild(runRoot,identity,io) { const stat=lstatIfPresent(runRoot,io); if(!stat||stat.isSymbolicLink()||!stat.isDirectory()) fail(identity.message); const entries=io.readdirSync(runRoot,{withFileTypes:true}); if(entries.length!==1||entries[0].name!==identity.runId||entries[0].isSymbolicLink()||!entries[0].isDirectory()) fail(identity.message); const child=path.join(runRoot,identity.runId); assertNonReparse(child,identity.label,io); return child; }
// prettier-ignore
function ensureDurableRoot(root,relative,io,created) { let current=root; for(const segment of relative.split('/')){current=path.join(current,segment); const stat=lstatIfPresent(current,io); if(stat===null){io.mkdirSync(current);created.push(current);} const present=io.lstatSync(current); if(present.isSymbolicLink()) fail('reparse point present in durable path'); if(!present.isDirectory()) fail('durable path is not a directory');} assertNonReparse(current,'durable',io); return current; }
// prettier-ignore
async function reopenPublished(destination,runRoot,artifacts,manifest,validatorInput,dependencies) { const stat=lstatIfPresent(destination,dependencies.io); if(stat===null)return null; if(stat.isSymbolicLink())fail('reparse point present in durable path'); if(!stat.isDirectory()||JSON.stringify(dependencies.io.readdirSync(runRoot))!==JSON.stringify([path.basename(destination)]))fail('durable destination collision'); try {assertNonReparse(destination,'durable',dependencies.io);assertArtifactSet(destination,artifacts,dependencies.io);const bytes=dependencies.io.readFileSync(path.join(destination,'receipt-manifest.json'));if(!bytes.equals(manifest.bytes))fail('durable destination collision');verifyArtifactBytes(destination,manifest,{stage:'durable',io:dependencies.io});await dependencies.invokePublicValidator(validatorInput);return bytes;} catch(error) {if(error instanceof Camp01ExportError&&error.message.includes('public validator'))throw error;fail('durable destination collision');} }
// prettier-ignore
function recoverStagingResidue(root,runId,io) { const prefix=`.camp01-export-${runId}-`; for(const name of io.readdirSync(root)){if(!name.startsWith(prefix))fail('durable destination collision');const target=path.join(root,name),stat=io.lstatSync(target);if(stat.isSymbolicLink())fail('reparse point present in durable path');if(!stat.isDirectory())fail('durable destination collision');io.rmSync(target,{recursive:true,force:false});} }
// prettier-ignore
function recoverSharedStagingResidue(root,prefix,io) { for(const name of io.readdirSync(root).filter((value)=>value.startsWith(prefix))){const target=path.join(root,name),stat=io.lstatSync(target);if(stat.isSymbolicLink())fail('reparse point present in durable path');if(!stat.isDirectory())fail('durable destination collision');io.rmSync(target,{recursive:true,force:false});} }
// prettier-ignore
function removeEmptyAncestors(created,io) { for(const directory of [...created].reverse()){try{io.rmdirSync(directory);}catch(error){if(!['ENOENT','ENOTEMPTY'].includes(error?.code))throw error;}} }
// prettier-ignore
function exportResult(receipt,manifestBytes) { return {runId:receipt.runId,phase:receipt.phase,finalizedPaths:[...receipt.finalizedPaths],receiptDigest:digestBytes(manifestBytes)}; }
// prettier-ignore
function assertDestinationAvailable(destination,io) { const stat=lstatIfPresent(destination,io); if(stat?.isSymbolicLink()) fail('reparse point present in durable path'); if(stat!==null) fail('durable destination collision'); }
// prettier-ignore
function canonicalDirectory(value,label,io) { try {if(typeof value!=='string'||!path.isAbsolute(value)) fail(`${label} root unavailable`); assertNonReparse(value,label,io); const canonical=io.realpathSync.native(value), stat=io.statSync(canonical); if(!stat.isDirectory()) fail(`${label} root unavailable`); return canonical;} catch(error) {if(error instanceof Camp01ExportError)throw error;fail(`${label} root unavailable`);} }
// prettier-ignore
function assertNonReparse(value,label,io) { const absolute=path.resolve(value), parsed=path.parse(absolute), segments=absolute.slice(parsed.root.length).split(path.sep).filter(Boolean); let current=parsed.root; for(const segment of segments){current=path.join(current,segment); const stat=lstatIfPresent(current,io); if(stat===null) fail(`${label} root unavailable`); if(stat.isSymbolicLink()) fail(label==='durable'?'reparse point present in durable path':'reparse point present in transient path');} }
// prettier-ignore
function lstatIfPresent(value,io) { try {return io.lstatSync(value);} catch(error) {if(error?.code==='ENOENT')return null;throw error;} }
// prettier-ignore
function below(root,relative) { if(!validRelative(relative)) fail('path confinement drift'); const target=path.resolve(root,...relative.split('/')); if(!target.startsWith(`${path.resolve(root)}${path.sep}`)) fail('path confinement drift'); return target; }
// prettier-ignore
function validRelative(value) { return typeof value==='string'&&value.length>0&&!path.isAbsolute(value)&&!value.includes('\\')&&!value.split('/').some((part)=>!part||part==='.'||part==='..'); }
// prettier-ignore
function serializeContext(raw) { try {const value=typeof raw==='string'?JSON.parse(raw):raw;if(!value||typeof value!=='object'||Array.isArray(value))fail('validation context unavailable');return JSON.stringify(value);} catch(error) {if(error instanceof Camp01ExportError)throw error;fail('validation context unavailable');} }
// prettier-ignore
function exactSet(left,right) { return Array.isArray(left)&&Array.isArray(right)&&new Set(left).size===left.length&&new Set(right).size===right.length&&JSON.stringify([...left].sort(codeUnit))===JSON.stringify([...right].sort(codeUnit)); }
function codeUnit(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
function fail(message) {
  throw new Camp01ExportError(message);
}

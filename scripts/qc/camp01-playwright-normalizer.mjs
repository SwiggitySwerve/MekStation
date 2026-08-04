import * as fs from 'node:fs';
import * as path from 'node:path';

import { WAVE_CONTRACTS } from './camp01-authority-receipt.contract.mjs';
import {
  canonicalBytes,
  normalizeProof02Observations,
} from './camp01-authority-receipt.schemas.mjs';
import { createCamp01RunnerIsolation } from './camp01-runner-isolation.mjs';

// prettier-ignore
const ROW=WAVE_CONTRACTS['proof-02-reproduction'], REPORTER=ROW.reporterContracts[0], RAW_DIRECTORY='camp01-json', RAW_NAME='playwright-report.json', RAW_STATUSES=['passed','failed','timedOut','skipped','interrupted'], OUTCOMES=['expected','unexpected','flaky','skipped'];
// prettier-ignore
const KNOWN_FAILURES=Object.freeze(Object.fromEntries([[REPORTER.requiredTestIds[0],'development-mime-diagnostic'],[REPORTER.requiredTestIds[1],'guest-badge-timing'],[REPORTER.requiredTestIds[2],'save-conflict-timing']]));

export class Camp01PlaywrightNormalizerError extends Error {
  constructor(message, options) {
    super(`CAMP01_PLAYWRIGHT_NORMALIZER_INVALID: ${message}`, options);
    this.name = 'Camp01PlaywrightNormalizerError';
  }
}

// A fresh exclusive raw directory is the freshness boundary: an adopted
// invocation can never reuse a prior JSON report for the same writer tuple.
// prettier-ignore
export function prepareCamp01PlaywrightCollection(environment,isolation,dependencies={}) {
  if (!isolation?.active) return inactive();
  const repoRoot=path.resolve(dependencies.repoRoot??process.cwd()), routed={...environment,...isolation.environment}, validated=createCamp01RunnerIsolation(routed,{...dependencies,repoRoot}); if(validated.runtimeRoot!==isolation.runtimeRoot)fail('validated runtime identity mismatch'); if(routed.CAMP01_INVOCATION_ID!==REPORTER.invocationId)return inactive();
  const io=dependencies.fs??fs, rawDirectory=path.join(validated.paths.playwrightResults,RAW_DIRECTORY); if(lstatIfPresent(rawDirectory,io)!==null)fail('stale raw report'); try{io.mkdirSync(rawDirectory);}catch(error){fail('raw report directory creation failed',error);}
  const collectionEnvironment=Object.freeze({PLAYWRIGHT_JSON_OUTPUT_DIR:rawDirectory,PLAYWRIGHT_JSON_OUTPUT_NAME:RAW_NAME}), collection=Object.freeze({environment:{...routed,...collectionEnvironment},isolation:validated,repoRoot,rawDirectory,io}); return Object.freeze({active:true,environment:collectionEnvironment,normalize:()=>normalizeCollection(collection)});
}

// The highest retry number is authoritative. A final pass is passed;
// failed/timedOut is failed; skipped/interrupted or no attempt is missing.
// prettier-ignore
function normalizeCollection(collection) {
  const {environment,isolation,repoRoot,rawDirectory,io}=collection, validated=createCamp01RunnerIsolation(environment,{repoRoot}); if(validated.runtimeRoot!==isolation.runtimeRoot)fail('validated runtime identity mismatch'); let entries; try{entries=io.readdirSync(rawDirectory,{withFileTypes:true});}catch(error){fail('raw report missing',error);} const expected=entries.find((entry)=>entry.name===RAW_NAME); if(!expected)fail('raw report missing'); if(entries.length!==1)fail('multiple raw reports'); if(expected.isSymbolicLink()||!expected.isFile())fail('raw report malformed');
  const rawPath=path.join(rawDirectory,RAW_NAME); let raw; try{raw=JSON.parse(io.readFileSync(rawPath,'utf8'));}catch(error){fail('raw report malformed',error);} assertRawIdentity(raw,environment); const observed=readObserved(raw), anchors=REPORTER.requiredTestIds.map((id)=>observed.has(id)?null:{id,status:'missing',knownFailureCode:KNOWN_FAILURES[id]});
  const inputs=[...observed.values(),...anchors.filter(Boolean)].sort((left,right)=>left.id.localeCompare(right.id)); if(new Set(inputs.map(({id})=>id)).size!==inputs.length)fail('duplicate observed test'); const observations=normalizeProof02Observations(inputs), value={schema:REPORTER.reportSchema,parentRunId:environment.CAMP01_RUN_ID,executionId:environment.CAMP01_EXECUTION_ID,invocationId:environment.CAMP01_INVOCATION_ID,sha:shaFromArtifact(repoRoot,environment.CAMP01_ARTIFACT_DIR),historicalAnchorIds:[...REPORTER.requiredTestIds].sort(),observations}, target=path.join(environment.CAMP01_ARTIFACT_DIR,REPORTER.normalizedPath);
  try{io.writeFileSync(target,canonicalBytes(value),{flag:'wx'});}catch(error){fail('normalized report publication failed',error);} return value;
}

// prettier-ignore
function assertRawIdentity(raw,environment) { const camp=raw?.config?.metadata?.camp01, expected={artifactDir:environment.CAMP01_ARTIFACT_DIR,executionId:environment.CAMP01_EXECUTION_ID,invocationId:environment.CAMP01_INVOCATION_ID,runId:environment.CAMP01_RUN_ID}, reporters=raw?.config?.reporter; if(!camp||JSON.stringify(camp)!==JSON.stringify(expected)||!Array.isArray(reporters)||reporters.filter((entry)=>Array.isArray(entry)&&entry[0]==='json').length!==1||!Array.isArray(raw.suites)||!Array.isArray(raw.errors)||raw.errors.length)fail('raw report identity mismatch'); }
// prettier-ignore
function readObserved(raw) { const observed=new Map(), sources=[]; for(const suite of raw.suites){const source=REPORTER.sourceIds.find((id)=>id===`e2e/${suite?.file}`);if(!source)fail('raw report source mismatch');sources.push(source);walkSuite(suite,source,[],observed,true);} if(JSON.stringify([...sources].sort())!==JSON.stringify([...REPORTER.sourceIds].sort()))fail('raw report source mismatch'); return observed; }
// prettier-ignore
function walkSuite(suite,source,titles,observed,root=false) { if(!suite||!Array.isArray(suite.specs)||suite.suites!==undefined&&!Array.isArray(suite.suites))fail('raw report malformed'); const next=root?titles:[...titles,needString(suite.title)]; for(const spec of suite.specs){const id=[source,...next,needString(spec?.title)].join('::');if(observed.has(id))fail('duplicate observed test');const status=resolveStatus(spec?.tests);observed.set(id,{id,status,knownFailureCode:KNOWN_FAILURES[id]??null});} for(const child of suite.suites??[])walkSuite(child,source,next,observed); }
// prettier-ignore
function resolveStatus(tests) { if(!Array.isArray(tests)||tests.length!==1||!OUTCOMES.includes(tests[0]?.status)||!Array.isArray(tests[0]?.results))fail('raw report malformed'); const results=[...tests[0].results].sort((left,right)=>left.retry-right.retry); if(!results.length)return 'missing'; if(results.some((entry,index)=>!Number.isInteger(entry.retry)||entry.retry!==index||!RAW_STATUSES.includes(entry.status)))fail('raw report malformed'); const status=results.at(-1).status; return status==='passed'?'passed':['failed','timedOut'].includes(status)?'failed':'missing'; }
// prettier-ignore
function shaFromArtifact(repoRoot,artifactDirectory) { const relative=path.relative(repoRoot,path.dirname(artifactDirectory)).split(path.sep).join('/'), marker='<sha>', index=ROW.runRootTemplate.indexOf(marker), prefix=ROW.runRootTemplate.slice(0,index), suffix=ROW.runRootTemplate.slice(index+marker.length), sha=relative.slice(prefix.length,relative.length-suffix.length); if(index<0||relative!==`${prefix}${sha}${suffix}`||!/^[0-9a-f]{40}$/.test(sha))fail('artifact SHA binding mismatch'); return sha; }
function needString(value) {
  if (typeof value !== 'string' || !value) fail('raw report malformed');
  return value;
}
// prettier-ignore
function lstatIfPresent(value,io) { try{return io.lstatSync(value);}catch(error){if(error?.code==='ENOENT')return null;fail('raw report inspection failed',error);} }
// prettier-ignore
function inactive() { return Object.freeze({active:false,environment:Object.freeze({}),normalize:async()=>undefined}); }
function fail(message, cause) {
  throw new Camp01PlaywrightNormalizerError(message, { cause });
}

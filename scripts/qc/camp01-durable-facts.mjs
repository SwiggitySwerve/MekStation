import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  Camp01FactsError,
  createAnchorAuthority,
} from './camp01-anchor-authority.mjs';
import {
  REPOSITORY_IDENTITY,
  WAVE_CONTRACTS,
} from './camp01-authority-receipt.contract.mjs';
import {
  artifactDigest,
  canonicalBytes,
  validateArtifact,
} from './camp01-authority-receipt.schemas.mjs';
import { createCleanupAuthority } from './camp01-cleanup-authority.mjs';
import { createDurableExport } from './camp01-durable-export.mjs';
import {
  createBareSession,
  fetchAndVerifyOids,
  invokeGit,
  resolveVerifiedGit,
} from './camp01-git-trust.mjs';
import {
  createGitHubProvenance,
  fetchGitHubResource,
} from './camp01-github-provenance.mjs';
import { createProofEnvironment } from './camp01-proof-environment.mjs';
import { createRepairRegistry } from './camp01-repair-registry.mjs';
import {
  createProofTarget,
  inspectOwnedTarget,
  observeCleanState,
  resolveTargetFacts,
} from './camp01-target-authority.mjs';
import { createFileStateStore } from './run-camp01-authority-receipt.mjs';

const VALIDATOR = fileURLToPath(
    new URL('./validate-camp01-authority-receipt.mjs', import.meta.url),
  ),
  SHA = /^[0-9a-f]{40}$/,
  RUN = /^camp01-[0-9a-f]{32}$/;
const ROWS = Object.values(WAVE_CONTRACTS),
  VIRTUAL = '-required-repairs';

export { Camp01FactsError };

// All JSON reads below are candidate reads only. A record enters the returned
// index solely after the public validator accepts its exact path identity.
export function createDurableFacts(options = {}, dependencies = {}) {
  const initiatingRoot = canonicalRoot(options.initiatingRoot ?? process.cwd()),
    evidenceRoot = path.join(
      initiatingRoot,
      '.sisyphus',
      'evidence',
      'playtest',
    ),
    cleanupRoot =
      options.cleanupRoot ?? path.join(evidenceRoot, '.camp01-cleanups'),
    bootstrapFile =
      options.bootstrapFile ??
      path.join(evidenceRoot, '.camp01-bootstrap.json'),
    contexts = new Map(),
    repairRegistry =
      dependencies.repairRegistry ?? createRepairRegistry({ initiatingRoot });
  assertConfined(evidenceRoot, cleanupRoot);
  assertConfined(evidenceRoot, bootstrapFile);
  // prettier-ignore
  async function readIndex() { try{ensureDirectory(initiatingRoot,evidenceRoot); const registrations=repairRegistry.discover(), records=[]; for(const candidate of candidates(evidenceRoot,registrations)){const context=contextFor(candidate,records); await invokeValidator(candidate,context,dependencies); await invokeAnchor(candidate,dependencies); bindCandidate(candidate,records); records.push(Object.freeze({...candidate,receiptId:receiptId(candidate.manifest),manifestDigest:artifactDigest(candidate.manifest),context}));} for(const row of [...ROWS,...registrations.map((entry)=>entry.row)])for(const mode of ['reviewed-head','exact-main'])one(records,row.wave,mode); const cleanups=readCleanups(cleanupRoot,records); consumeBootstrap(bootstrapFile,records); return Object.freeze({records:Object.freeze(records),cleanups:Object.freeze(cleanups),registrations});}catch(error){if(error instanceof Camp01FactsError)throw error;fail('durable index unreadable');} }
  // prettier-ignore
  async function resolvePreflightFacts(input) { const index=await readIndex(), {row,arguments:arguments_}=input??{}; if(!row||!arguments_) fail('preflight input missing'); if(row.wave==='camp-proof'&&arguments_.mode==='reviewed-head') admitBootstrap(bootstrapFile,arguments_.sha,index.records); const concrete=row.predecessors.filter((wave)=>!wave.endsWith(VIRTUAL)); for(const wave of concrete){const record=one(index.records,wave,'exact-main'); if(!record) fail(`predecessor receipt missing: ${wave}`); if(!index.cleanups.some((entry)=>entry.wave===wave&&entry.runId===record.runId)) fail(`predecessor cleanup missing: ${wave}`);} const repairGates=row.predecessors.filter((wave)=>wave.endsWith(VIRTUAL)).map((gate)=>repairGate(gate,index)), target=row.capSubject==='none'?{treeSha:arguments_.sha,capProvenance:null}:await targetFacts(input,dependencies); contexts.set(key(row.wave,arguments_.mode,arguments_.sha),writerContext(input,index,target)); return {programSpecChanges:(arguments_.programSpecs??[]).map((value)=>String(value).split('|')[0]),predecessorReceiptWaves:concrete,predecessorCleanupWaves:concrete,repairGates,cap:target.capProvenance===null?null:{subject:target.capProvenance.subject,fileCount:target.capProvenance.fileCount,changedLineCount:target.capProvenance.changedLineCount,binaryEntries:target.capProvenance.binaryEntries}}; }
  // prettier-ignore
  async function resolveWriterInputs(input) { const index=await readIndex(), target=await targetFacts(input,dependencies), value=writerContext(input,index,target); contexts.set(key(input.row.wave,input.arguments.mode,input.arguments.sha),value); return value; }
  // prettier-ignore
  async function resolveRepairSource({wave,declaration}) { const index=await readIndex(), sources=repairSources(index), found=sources.find((entry)=>entry.repairRowId===wave), disposition=declaration?.row?.sourceDisposition, proof=wave.startsWith('proof-02-repair-'), failedId=proof?null:found?.failedReportObservationId??null, failedFingerprint=proof?null:found?.failedReportFingerprint??null; if(!found||found.kind!==(proof?'proof':'h')||found.receiptId!==disposition?.receiptId||found.observationId!==disposition.observationId||failedId!==disposition.failedReportObservationId||failedFingerprint!==disposition.failedReportFingerprint||found.causeFingerprint!==disposition.causeFingerprint) fail('declared repair source absent from durable receipts'); const base=proof?['proof-02-triage']:['camp-01g','proof-02-triage','proof-02-required-repairs'], requiredRowIds=sources.filter((entry)=>entry.kind===(proof?'proof':'h')).map((entry)=>entry.repairRowId).sort(), source={kind:proof?'proof':'h',childChange:declaration.row.childChange,causeFingerprint:found.causeFingerprint,sourceDisposition:disposition,reporterContracts:declaration.row.reporterContracts,explicitDependencies:declaration.row.predecessors.slice(base.length)}; repairRegistry.register({wave,declaration,source}); return {source,registrySet:{requiredRowIds,registeredRowIds:registeredRows(repairRegistry.discover(),proof)}}; }
  return Object.freeze({
    readIndex,
    resolvePreflightFacts,
    resolveWriterInputs,
    resolveRepairSource,
    validationContext: (input) =>
      contexts.get(key(input.wave, input.mode, input.sha)) ??
      fail('writer validation context missing'),
  });
}

// Composition is deliberately late-bound around each proof target because the
// merged exporter owns one transient root while the controller creates it later.
export async function createProductionDependencies(
  options = {},
  dependencies = {},
) {
  const initiatingRoot = canonicalRoot(options.initiatingRoot ?? process.cwd()),
    git =
      dependencies.git ??
      (await resolveVerifiedGit(
        { cwd: initiatingRoot },
        dependencies.gitDependencies ?? {},
      )),
    anchor = productionAnchor({ git, initiatingRoot }, dependencies),
    evidenceRoot = path.join(
      initiatingRoot,
      '.sisyphus',
      'evidence',
      'playtest',
    ),
    repairRegistry =
      dependencies.repairRegistry ?? createRepairRegistry({ initiatingRoot });
  ensureDirectory(initiatingRoot, evidenceRoot);
  const targetDeps = {
      git,
      repositoryRoot: initiatingRoot,
      ...(options.proofRoot ? { proofRoot: options.proofRoot } : {}),
      ...(dependencies.targetDependencies ?? {}),
    },
    facts = createDurableFacts(
      { ...options, initiatingRoot },
      {
        ...dependencies,
        anchor,
        targetDependencies: targetDeps,
        repairRegistry,
      },
    ),
    stateStore = createFileStateStore(initiatingRoot),
    active = new Map(),
    writerContexts = new Map();
  const provenance = createGitHubProvenance({
    ...dependencies,
    sessionDirectory:
      dependencies.sessionDirectory ??
      (() => fs.mkdtempSync(path.join(os.tmpdir(), 'mekstation-camp01-git-'))),
    resolvePreflightFacts: facts.resolvePreflightFacts,
    resolveWriterInputs: facts.resolveWriterInputs,
    resolveRepairSource: facts.resolveRepairSource,
    git,
  });
  const createTarget = async (input) => {
    const target = await createProofTarget(input, targetDeps),
      registration = Object.hasOwn(WAVE_CONTRACTS, input.wave)
        ? null
        : repairRegistry.require(input.wave),
      exporter = createDurableExport(
        {
          initiatingRoot,
          transientRoot: target.canonicalPath,
          validationContext: (value) =>
            writerContexts.get(key(value.wave, value.mode, value.sha)) ??
            facts.validationContext(value),
          repairRegistration: registration,
        },
        dependencies.exportDependencies ?? {},
      );
    active.set(key(input.wave, input.mode, input.sha), exporter);
    return target;
  };
  // prettier-ignore
  const invokePublicValidator = async (input) => { const exporter=active.get(key(input?.wave,input?.mode,input?.sha)); if(exporter)return exporter.invokePublicValidator(input); const keys=['entry','stage','wave','mode','sha','runRoot','runId']; if(!input||JSON.stringify(Object.keys(input))!==JSON.stringify(keys)||input.stage!=='durable'||typeof input.entry!=='string'||path.resolve(input.entry)!==path.resolve(VALIDATOR))fail('proof target validator missing'); const index=await facts.readIndex(), candidate=index.records.find((entry)=>['wave','mode','sha','runRoot','runId'].every((name)=>entry[name]===input[name])); if(!candidate)fail('durable validator identity missing'); await invokeValidator(candidate,candidate.context,dependencies); return {validated:true}; },
    resolveWriterContext = async (input) => {
      const state = stateStore.load(input?.row?.wave);
      if (input?.row?.capSubject !== 'none' && !state?.ownedTarget)
        fail('owned target state missing');
      const base = await provenance.resolveWriterContext({ ...input, state }),
        registration = Object.hasOwn(WAVE_CONTRACTS, input.row.wave)
          ? null
          : repairRegistry.require(input.row.wave),
        value = registration
          ? {
              ...base,
              repairDeclaration: registration.declaration,
              repairSource: registration.source,
            }
          : base;
      writerContexts.set(
        key(input.row.wave, input.arguments.mode, input.arguments.sha),
        {
          registryContext: value.registryContext,
            reviewedHead: value.reviewedHead,
            ...(value.reproduction ? { reproduction: value.reproduction } : {}),
            ...(value.repairs ? { repairs: value.repairs } : {}),
            ...(registration
              ? {
                  repairDeclaration: registration.declaration,
                  repairSource: registration.source,
                }
              : {}),
        },
      );
      return value;
    },
    environment = createProofEnvironment({
      ...dependencies,
      resolveWriterContext,
      resolveVerifiedGit: () => git,
    });
  const initiatingTarget =
      options.initiatingTarget ??
      (await inspectInitiating(
        initiatingRoot,
        git,
        dependencies.targetDependencies ?? {},
      )),
    cleanup = createCleanupAuthority(
      {
        git,
        initiatingTarget,
        cleanupRoot:
          options.cleanupRoot ?? path.join(evidenceRoot, '.camp01-cleanups'),
        failedCreationTargets: options.failedCreationTargets ?? [],
      },
      { ...(dependencies.cleanupDependencies ?? {}), invokePublicValidator },
    );
  return Object.freeze({
    stateStore,
    inspectOwnedTarget: (input) => inspectOwnedTarget(input, targetDeps),
    inspectRowRoot: (input) => inspectRowRoot(initiatingRoot, input),
    verifyPreflight: provenance.verifyPreflight,
    resolveWriterContext,
    resolveRepairRegistration: provenance.resolveRepairRegistration,
    createProofTarget: createTarget,
    prepareEnvironment: environment.prepareEnvironment,
    observeCleanState: (input) => observeCleanState(input, targetDeps),
    executeReceipt: environment.executeReceipt,
    invokePublicValidator,
    exportReceipt: (input) =>
      active
        .get(key(input.row.wave, input.arguments.mode, input.arguments.sha))
        ?.exportReceipt(input) ?? fail('proof target exporter missing'),
    cleanupTargets: cleanup.cleanupTargets,
  });
}

// Composes the mandatory production authority while preserving explicit test fakes.
function productionAnchor({ git, initiatingRoot }, dependencies) {
  if (Object.hasOwn(dependencies, 'anchor')) {
    if (typeof dependencies.anchor !== 'function')
      fail('anchor dependency invalid');
    return dependencies.anchor;
  }
  const authority = createAnchorAuthority(
    { git, cwd: initiatingRoot },
    dependencies.anchorDependencies ?? {},
  );
  // Supplies freshly fetched main only to exact-main records that require A2.
  return async (candidate) =>
    authority(candidate, {
      fetchedMainOid:
        candidate.mode === 'exact-main'
          ? await resolveFetchedMainOid(candidate, git, dependencies)
          : null,
    });
}

// Reuses the 3C1 fetch-equality route so the anchor consumes, but never fetches, main.
async function resolveFetchedMainOid(candidate, git, dependencies) {
  try {
    const transport = dependencies.fetchGitHubResource ?? fetchGitHubResource,
      branch = await transport({
        resource: 'branch',
        parameters: { branch: REPOSITORY_IDENTITY.baseRef },
      }),
      mainOid = branch?.commit?.sha,
      configured = dependencies.sessionDirectory,
      directory =
        typeof configured === 'function'
          ? await configured({
              operation: `anchor-${candidate.wave}-${candidate.sha}`,
              wave: candidate.wave,
            })
          : (configured ??
            fs.mkdtempSync(
              path.join(os.tmpdir(), 'mekstation-camp01-anchor-'),
            )),
      gitDependencies = {
        ...(dependencies.gitDependencies ?? {}),
        ...(dependencies.testOnlyAllowLocalRemote === true
          ? { testOnlyAllowLocalRemote: true }
          : {}),
      };
    if (
      branch?.name !== REPOSITORY_IDENTITY.baseRef ||
      !SHA.test(mainOid) ||
      typeof directory !== 'string' ||
      !path.isAbsolute(directory)
    )
      fail('anchor main reachability drift');
    const session = await createBareSession(
        { git, directory },
        gitDependencies,
      ),
      verified = await fetchAndVerifyOids(
        {
          session,
          remoteUrl:
            dependencies.testOnlyRemoteUrl ?? REPOSITORY_IDENTITY.fetchUrl,
          headOid: mainOid,
          mainOid,
        },
        gitDependencies,
      );
    return verified.mainOid;
  } catch (error) {
    if (error instanceof Camp01FactsError) throw error;
    fail('anchor main reachability drift');
  }
}

// Invokes optional hermetic anchors but rejects malformed present dependencies.
async function invokeAnchor(candidate, dependencies) {
  if (!Object.hasOwn(dependencies, 'anchor')) return;
  if (typeof dependencies.anchor !== 'function')
    fail('anchor dependency invalid');
  await dependencies.anchor(candidate);
}

// prettier-ignore
function candidates(evidenceRoot,registrations) { const found=[], initiatingRoot=path.resolve(evidenceRoot,'..','..','..'), rows=[...ROWS,...registrations.map((entry)=>entry.row)]; for(const entry of fs.readdirSync(evidenceRoot,{withFileTypes:true})){if(!entry.isDirectory()||entry.isSymbolicLink()||entry.name.startsWith('.'))continue; const matches=rows.filter((row)=>{const prefix=path.basename(row.runRootTemplate).replace('<sha>','');return entry.name.startsWith(prefix)&&SHA.test(entry.name.slice(prefix.length));}); if(matches.length!==1)continue; const row=matches[0], registration=registrations.find((value)=>value.wave===row.wave)??null, prefix=path.basename(row.runRootTemplate).replace('<sha>',''), sha=entry.name.slice(prefix.length), runRoot=row.runRootTemplate.replace('<sha>',sha), root=path.join(evidenceRoot,entry.name), children=fs.readdirSync(root,{withFileTypes:true}); if(children.length!==1||!children[0].isDirectory()||children[0].isSymbolicLink()||!RUN.test(children[0].name))fail('durable run root identity drift'); const directory=path.join(root,children[0].name), command=readJson(path.join(directory,'command-result.json')), manifest=readJson(path.join(directory,'receipt-manifest.json')); if(!command||!manifest||!Array.isArray(manifest.entries))fail('durable receipt identity drift'); const artifacts=Object.fromEntries(row.artifacts.filter((name)=>name.endsWith('.json')&&!['command-result.json','receipt-manifest.json'].includes(name)).map((name)=>[name,readCandidateJson(path.join(directory,...name.split('/')))])); if(command.wave!==row.wave||command.sha!==sha||command.runId!==children[0].name||manifest.wave!==row.wave||manifest.runId!==command.runId||!['reviewed-head','exact-main'].includes(command.mode))fail('durable receipt identity drift'); found.push({wave:row.wave,row,mode:command.mode,sha,runRoot,runId:command.runId,directory,initiatingRoot,command,manifest,artifacts,registration});} return found.sort((a,b)=>rows.indexOf(a.row)-rows.indexOf(b.row)||(a.mode==='reviewed-head'?-1:1)); }
// prettier-ignore
function contextFor(candidate,records) { const row=candidate.row, command=candidate.command, reviewed=command.mode==='exact-main'?records.find((entry)=>entry.wave===candidate.wave&&entry.mode==='reviewed-head'&&entry.receiptId===command.capProvenance?.reviewedHeadReceiptId):null, predecessors=row.predecessors.map((wave,index)=>({wave,id:command.provenance?.predecessorReceiptIds?.[index],record:wave.endsWith(VIRTUAL)?null:one(records,wave,'exact-main')})); const provenance=[...records.flatMap((entry)=>entry.context.registryContext.provenance),{id:command.provenance.specTupleId,sourceKind:'spec-tuple',wave:row.wave,subject:row.capSubject},...command.provenance.ownedPrTupleId?[{id:command.provenance.ownedPrTupleId,sourceKind:'owned-pr-tuple',wave:row.wave,subject:row.capSubject}]:[],...predecessors.map((entry)=>({id:entry.id,sourceKind:'predecessor-receipt',wave:entry.wave,subject:WAVE_CONTRACTS[entry.wave]?.capSubject??'product-pr'})),...reviewed?[{id:reviewed.receiptId,sourceKind:'reviewed-head-receipt',wave:row.wave,subject:row.capSubject}]:[]]; const evidence=predecessors.flatMap(({record})=>record?record.row.reporterContracts.filter((entry)=>!entry.witnessLabel).map((entry)=>({sourceKind:'execution',sourceKey:entry.invocationId,runId:record.runId,wave:record.wave,label:null})):[]), refs=(command.identityRegistry?.refs??[]).map((entry)=>({...entry,sourceWave:provenance.find((value)=>value.id===entry.validationProvenanceId)?.wave??row.wave})), capturePolicies=command.captureAttestations?.length?[{wave:row.wave,sha:command.sha,fixtureAllowlistDigest:command.captureAttestations[0].fixtureAllowlistDigest,barrierPolicyDigest:command.captureAttestations[0].barrierPolicyDigest}]:[]; return {registryContext:{evidence:unique(evidence,'sourceKey'),provenance:unique(provenance,'id'),refs:unique(refs,'ref'),capturePolicies,repairSources:repairSources({records:[...records,candidate]}).map(({repairRowId,failedReportObservationId,failedReportFingerprint,causeFingerprint})=>({repairRowId,failedReportObservationId,failedReportFingerprint,causeFingerprint}))},reviewedHead:reviewed?{receiptId:reviewed.receiptId,manifestDigest:reviewed.manifestDigest,command:reviewed.command,manifest:reviewed.manifest}:null,...candidate.registration?{repairDeclaration:candidate.registration.declaration,repairSource:candidate.registration.source}:{},...row.wave==='proof-02-triage'?{reproduction:readArtifact(one(records,'proof-02-reproduction','exact-main'),'proof02-reproduction.json')}:{}}; }
// prettier-ignore
function bindCandidate(candidate,records) { const ids=candidate.command.provenance?.predecessorReceiptIds??[]; candidate.row.predecessors.forEach((wave,index)=>{if(wave.endsWith(VIRTUAL))return;const prior=one(records,wave,'exact-main');if(!prior||ids[index]!==prior.receiptId)fail('predecessor receipt identity drift');}); if(candidate.mode==='exact-main'&&candidate.command.capProvenance!==null){const reviewed=records.find((entry)=>entry.wave===candidate.wave&&entry.mode==='reviewed-head'&&entry.receiptId===candidate.command.capProvenance?.reviewedHeadReceiptId);if(!reviewed||candidate.command.capProvenance.reviewedHeadReceiptManifestDigest!==reviewed.manifestDigest)fail('reviewed-head receipt identity drift');} }
// prettier-ignore
function writerContext(input,index,target) {
  const {row,arguments:arguments_}=input, predecessors=row.predecessors.map((wave)=>wave.endsWith(VIRTUAL)?gateReceiptId(repairGate(wave,index)):one(index.records,wave,'exact-main')?.receiptId??fail(`predecessor receipt missing: ${wave}`)), reviewed=arguments_.mode==='exact-main'?index.records.find((entry)=>entry.wave===row.wave&&entry.mode==='reviewed-head'&&entry.command.sha===target.capProvenance?.headSha):null; if(arguments_.mode==='exact-main'&&row.capSubject!=='none'&&!reviewed)fail('reviewed-head receipt missing');
  const sources=[...row.predecessors.filter((wave)=>!wave.endsWith(VIRTUAL)).map((wave)=>one(index.records,wave,'exact-main')),...reviewed?[reviewed]:[]].filter(Boolean), triage=row.wave==='proof-02-triage'?triageInputs(arguments_,predecessors[0],tupleId(input.provenance?.owned)):null, repairs=row.wave==='camp-01h'?repairInputs(arguments_,index):null, triageRefs=triage?.dispositions.flatMap((entry)=>[entry.resolutionRef,entry.auditAnchor,...entry.blockerRef?[entry.blockerRef]:[]]).map((ref)=>{const kind=triage.dispositions.some((entry)=>entry.auditAnchor===ref)?'audit':triage.dispositions.some((entry)=>entry.blockerRef===ref)?'github-issue':'receipt';return {ref,kind,targetDigest:artifactDigest(ref),validationProvenanceId:kind==='audit'?triage.auditTupleId:kind==='receipt'?predecessors[0]:tupleId(ref)};})??[], provenance=unique([...sources.flatMap((entry)=>entry.context.registryContext.provenance),...row.predecessors.map((wave,index_)=>({id:predecessors[index_],sourceKind:'predecessor-receipt',wave,subject:WAVE_CONTRACTS[wave]?.capSubject??'product-pr'})),...reviewed?[{id:reviewed.receiptId,sourceKind:'reviewed-head-receipt',wave:row.wave,subject:row.capSubject}]:[],...triageRefs.filter((entry)=>entry.kind==='github-issue').map((entry)=>({id:entry.validationProvenanceId,sourceKind:'ref-validation',wave:row.wave,subject:row.capSubject})),...repairs?.repairs.flatMap((entry)=>[{id:entry.repairReceiptId,sourceKind:'repair-receipt',wave:entry.repairRowId,subject:'product-pr'},{id:entry.cleanupReceiptId,sourceKind:'cleanup-receipt',wave:entry.repairRowId,subject:'product-pr'}])??[]],'id'), refs=unique([...sources.flatMap((entry)=>entry.command.identityRegistry.refs),...triageRefs],'ref'), entities=sources.flatMap((entry)=>entry.command.identityRegistry.entities), repair=[...repairSources(index),...triage?.dispositions.filter((entry)=>entry.repairRowId).map((entry)=>({kind:'proof',repairRowId:entry.repairRowId,receiptId:null,observationId:entry.observationId,failedReportObservationId:entry.observationId,failedReportFingerprint:entry.failureFingerprint,causeFingerprint:entry.causeFingerprint}))??[]];
  const cap=target.capProvenance===null?null:{...target.capProvenance,reviewedHeadReceiptId:reviewed?.receiptId??null,reviewedHeadReceiptManifestDigest:reviewed?.manifestDigest??null}, registryContext={evidence:sources.flatMap((record)=>record.row.reporterContracts.filter((entry)=>!entry.witnessLabel).map((entry)=>({sourceKind:'execution',sourceKey:entry.invocationId,runId:record.runId,wave:record.wave,label:null}))),provenance,refs:unique(refs.map((entry)=>({...entry,sourceWave:provenance.find((value)=>value.id===entry.validationProvenanceId)?.wave??row.wave})),'ref'),capturePolicies:[],repairSources:unique(repair.map(({repairRowId,failedReportObservationId,failedReportFingerprint,causeFingerprint})=>({repairRowId,failedReportObservationId,failedReportFingerprint,causeFingerprint})),'repairRowId')}; return {treeSha:target.treeSha,capProvenance:cap,identityRegistry:{schema:'camp01-identity-registry/v1',entities:unique(entities,'digest'),refs},registryContext,predecessorReceiptIds:predecessors,reviewedHead:reviewed?{receiptId:reviewed.receiptId,manifestDigest:reviewed.manifestDigest,command:reviewed.command,manifest:reviewed.manifest}:null,...repairs?{repairs}:{},...triage?{reproduction:readArtifact(one(index.records,'proof-02-reproduction','exact-main'),'proof02-reproduction.json'),triage}:{}};
}
// prettier-ignore
async function targetFacts(input,dependencies) { if(input.row.capSubject!=='none'){const resolver=dependencies.resolveTargetFacts??resolveTargetFacts, spec=input.state?.registration?.spec??input.provenance?.spec; return resolver({ownedTarget:input.state?.ownedTarget,spec,row:input.row},dependencies.targetDependencies??{});} const clean=await (dependencies.observeCleanState??observeCleanState)({target:input.proofTarget??input.state?.proofTarget,phase:'baseline',runRoot:input.arguments.runRoot},dependencies.targetDependencies??{}); return {treeSha:clean.treeSha,capProvenance:null}; }
// prettier-ignore
function repairSources(index) { const result=new Map(); for(const record of index.records??[]){if(record.wave==='proof-02-triage'){for(const entry of record.artifacts['proof02-triage.json']?.dispositions??[])if(entry.repairRowId)result.set(entry.repairRowId,{kind:'proof',repairRowId:entry.repairRowId,receiptId:record.receiptId,observationId:entry.observationId,failedReportObservationId:entry.observationId,failedReportFingerprint:entry.failureFingerprint,causeFingerprint:entry.causeFingerprint});} if(record.wave==='camp-01h')for(const [name,value] of Object.entries(record.artifacts))if(name.endsWith('/experience.json'))for(const finding of value?.findings??[])if(finding.disposition?.repairRowId){const observation=finding.failedReportObservationIds[0], report=Object.values(record.artifacts).find((entry)=>entry?.observations?.some?.((item)=>item.id===observation)), failure=report?.observations.find((entry)=>entry.id===observation);result.set(finding.disposition.repairRowId,{kind:'h',repairRowId:finding.disposition.repairRowId,receiptId:record.receiptId,observationId:finding.id,failedReportObservationId:observation,failedReportFingerprint:failure?.failureFingerprint,causeFingerprint:finding.causeFingerprint});}} return [...result.values()].sort((a,b)=>a.repairRowId.localeCompare(b.repairRowId)); }
// prettier-ignore
function repairGate(gate,index) { const proof=gate.startsWith('proof-02-'), kind=proof?'proof':'h', requiredRowIds=repairSources(index).filter((entry)=>entry.kind===kind).map((entry)=>entry.repairRowId), modes=(mode)=>index.records.filter((entry)=>requiredRowIds.includes(entry.wave)&&entry.mode===mode).map((entry)=>entry.wave); return {gate,requiredRowIds,registeredRowIds:registeredRows(index.registrations,proof),reviewedHeadRowIds:modes('reviewed-head'),exactMainRowIds:modes('exact-main'),cleanupRowIds:index.cleanups.filter((entry)=>requiredRowIds.includes(entry.wave)).map((entry)=>entry.wave)}; }
// prettier-ignore
function readCleanups(root,records) { if(!fs.existsSync(root))return [];assertNonReparse(root); return fs.readdirSync(root).filter((name)=>name.endsWith('-wave-cleanup.json')).map((name)=>{const file=path.join(root,name), stat=fs.lstatSync(file);if(stat.isSymbolicLink()||!stat.isFile())fail('cleanup receipt reparse rejected');const value=readJson(file);try{validateArtifact(value);}catch{fail('cleanup receipt invalid');}const record=records.find((entry)=>entry.wave===value.wave&&entry.runId===value.runId&&entry.mode==='exact-main');if(!record||record.manifestDigest!==value.receiptDigest)fail('cleanup receipt identity drift');return value;}).sort((a,b)=>a.wave.localeCompare(b.wave)); }
// prettier-ignore
async function invokeValidator(candidate,context,dependencies) { const args=[VALIDATOR,`--wave=${candidate.wave}`,`--run-root=${candidate.runRoot}`,`--expected-sha=${candidate.sha}`,`--mode=${candidate.mode}`,...candidate.registration?[`--repair-registration=${candidate.registration.reference}`]:[]], spawn=dependencies.validatorSpawn??spawnSync, result=await spawn(process.execPath,args,{cwd:candidate.initiatingRoot,encoding:'utf8',env:{...process.env,CAMP01_VALIDATION_CONTEXT:JSON.stringify(context),CAMP01_REPAIR_REGISTRY_ROOT:candidate.initiatingRoot},shell:false}); if(!result||result.status!==0)fail('public validator rejected durable receipt'); }
// prettier-ignore
function registeredRows(registrations,proof) { return registrations.filter((entry)=>entry.wave.startsWith(proof?'proof-02-repair-':'camp-01h-repair-')).map((entry)=>entry.wave).sort(); }
// prettier-ignore
function inspectRowRoot(root,{runRoot,row,sha}) { if(runRoot!==row.runRootTemplate.replace('<sha>',sha))fail('row root identity drift'); const target=path.resolve(root,...runRoot.split('/')), reparsePoints=[]; let current=root; for(const part of runRoot.split('/')){current=path.join(current,part);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())reparsePoints.push(path.relative(root,current).replace(/\\/g,'/'));} return {repoRelativePath:runRoot,reparsePoints}; }
// prettier-ignore
async function inspectInitiating(root,git,targetDependencies) { const head=(await invokeGit({git,args:['rev-parse','--verify','HEAD^{commit}'],cwd:root},targetDependencies.gitDependencies??{})).stdout.trim(), raw=await inspectOwnedTarget({wave:'camp-proof',subject:'product',worktree:root,spec:{mergeSha:head},row:WAVE_CONTRACTS['camp-proof'],headSha:head},{git,...targetDependencies}); return {...raw,initiating:true}; }
// prettier-ignore
function receiptId(manifest) { return `receipt-${artifactDigest(manifest).slice(7,39)}`; }
// prettier-ignore
function gateReceiptId(gate) { return `receipt-${artifactDigest(gate).slice(7,39)}`; }
// prettier-ignore
function tupleId(value) { return `tuple-${createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,32)}`; }
// prettier-ignore
function triageInputs(arguments_,reproductionReceiptId,auditTupleId) { const dispositions=(arguments_.dispositions??[]).map((value)=>{const [observationId,failureFingerprint,severity,outcome,causeFingerprint,resolutionRef,blocker,rank,auditAnchor]=value.split('|');return {observationId,failureFingerprint,severity,outcome,causeFingerprint,resolutionRef,blockerRef:blocker==='none'?null:blocker,backlogRank:rank==='none'?null:Number(rank),auditAnchor,primaryObservationId:null,repairRowId:outcome==='repair-required'?`proof-02-repair-${causeFingerprint.replace(/^sha256:/,'')}`:null};}), groups=Object.groupBy(dispositions,(entry)=>entry.causeFingerprint); for(const entries of Object.values(groups)){entries.sort((a,b)=>a.observationId.localeCompare(b.observationId));for(const entry of entries.slice(1)){entry.primaryObservationId=entries[0].observationId;entry.outcome='not-distinct-cause';entry.repairRowId=null;}} return {reproductionReceiptId,auditTupleId,dispositions:dispositions.sort((a,b)=>a.observationId.localeCompare(b.observationId))}; }
// prettier-ignore
export function repairInputs(arguments_,index) { const triage=one(index.records,'proof-02-triage','exact-main')??fail('triage receipt missing'), repairs=(arguments_.repairs??[]).map((value)=>{const tuple17=value.split('|'), repairRowId=`proof-02-repair-${tuple17[1].replace(/^sha256:/,'')}`, repair=one(index.records,repairRowId,'exact-main')??fail('repair receipt missing'), cleanup=index.cleanups.find((entry)=>entry.wave===repairRowId&&entry.runId===repair.runId)??fail('repair cleanup missing'); return {repairRowId,repairReceiptId:repair.receiptId,cleanupReceiptId:receiptId(cleanup),tuple17};}); return {parentRunId:triage.runId,triageReceiptId:triage.receiptId,repairs:repairs.sort((a,b)=>a.repairRowId.localeCompare(b.repairRowId))}; }
// prettier-ignore
function key(wave,mode,sha) { return `${wave}\0${mode}\0${sha}`; }
// prettier-ignore
function one(records,wave,mode) { const found=records.filter((entry)=>entry.wave===wave&&entry.mode===mode);if(found.length>1)fail(`duplicate durable receipt: ${wave}/${mode}`);return found[0]??null; }
// prettier-ignore
function readArtifact(record,name) { if(!record)fail(`durable artifact missing: ${name}`);return record.artifacts?.[name]??readJson(path.join(record.directory,...name.split('/'))); }
// prettier-ignore
function readJson(file) { try{const stat=fs.lstatSync(file);if(stat.isSymbolicLink()||!stat.isFile())fail('durable artifact unreadable');return JSON.parse(fs.readFileSync(file,'utf8'));}catch{fail('durable artifact unreadable');} }
// prettier-ignore
function readCandidateJson(file) { try{const stat=fs.lstatSync(file);if(stat.isSymbolicLink()||!stat.isFile())return null;return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;} }
// prettier-ignore
function unique(values,key_) { const sorted=[...values].sort((a,b)=>String(a[key_]).localeCompare(String(b[key_]))), out=[];for(const value of sorted){const prior=out.at(-1);if(prior?.[key_]===value[key_]&&JSON.stringify(prior)!==JSON.stringify(value))fail('durable registry identity drift');if(prior?.[key_]!==value[key_])out.push(value);}return out; }
// prettier-ignore
function canonicalRoot(value) { try{const requested=path.resolve(value), root=fs.realpathSync.native(requested);if(root!==requested||!fs.statSync(root).isDirectory())fail('initiating root unavailable');assertNonReparse(root);return root;}catch(error){if(error instanceof Camp01FactsError)throw error;fail('initiating root unavailable');} }
// prettier-ignore
function assertConfined(root,target) { const relative=path.relative(root,path.resolve(target));if(relative.startsWith('..')||path.isAbsolute(relative))fail('durable path escaped initiating tree'); }
// prettier-ignore
function ensureDirectory(root,target) { assertConfined(root,target);let current=path.resolve(root);for(const part of path.relative(root,target).split(path.sep).filter(Boolean)){current=path.join(current,part);if(fs.existsSync(current)){const stat=fs.lstatSync(current);if(stat.isSymbolicLink()||!stat.isDirectory())fail('durable path reparse rejected');}else fs.mkdirSync(current);} }
// prettier-ignore
function assertNonReparse(value) { const absolute=path.resolve(value), parsed=path.parse(absolute);let current=parsed.root;for(const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)){current=path.join(current,part);if(fs.lstatSync(current).isSymbolicLink())fail('durable path reparse rejected');} }
// prettier-ignore
function admitBootstrap(file,sha,records) { if(!SHA.test(sha))fail('bootstrap reviewed head invalid');fs.mkdirSync(path.dirname(file),{recursive:true});if(records.some((entry)=>entry.wave==='camp-proof'))fail('bootstrap consumed');if(fs.existsSync(file)){const value=readJson(file);if(value.sha!==sha)fail('bootstrap already admitted');if(value.status!=='admitted')fail('bootstrap consumed');return;}const value={schema:'camp01-bootstrap/v1',wave:'camp-proof',mode:'reviewed-head',sha,status:'admitted'};try{fs.writeFileSync(file,canonicalBytes(value),{flag:'wx'});}catch{fail('bootstrap already admitted');} }
// prettier-ignore
function consumeBootstrap(file,records) { if(!fs.existsSync(file))return;const value=readJson(file);if(JSON.stringify(Object.keys(value))!==JSON.stringify(['schema','wave','mode','sha','status'])||value.schema!=='camp01-bootstrap/v1'||value.wave!=='camp-proof'||value.mode!=='reviewed-head'||!SHA.test(value.sha)||!['admitted','consumed'].includes(value.status))fail('bootstrap record invalid');if(value.status==='admitted'){const receipt=records.find((entry)=>entry.wave==='camp-proof'&&entry.mode==='reviewed-head'&&entry.sha===value.sha);if(receipt)fs.writeFileSync(file,canonicalBytes({...value,status:'consumed'}));} }
// prettier-ignore
function fail(message) { throw new Camp01FactsError(message); }

import { createHash } from 'node:crypto';
import * as https from 'node:https';
import * as path from 'node:path';

import {
  REPOSITORY_IDENTITY,
  assertRepairDeclaration,
} from './camp01-authority-receipt.contract.mjs';
import {
  Camp01GitError,
  createBareSession,
  fetchAndVerifyOids,
  invokeGit,
  resolveVerifiedGit,
} from './camp01-git-trust.mjs';

const OID = /^[0-9a-f]{40}$/,
  CHANGE = /^[a-z0-9][a-z0-9-]{0,127}$/,
  ALLOWED_PERMISSIONS = new Set(['WRITE', 'MAINTAIN', 'ADMIN']);

export class Camp01ProvenanceError extends Error {
  constructor(message) {
    super(`CAMP01_PROVENANCE_INVALID: ${message}`);
    this.name = 'Camp01ProvenanceError';
  }
}

// Production uses the GitHub REST API directly. Tests inject the one transport
// seam below and never call this function.
export async function fetchGitHubResource({ resource, parameters = {} }) {
  const endpoint = resourceEndpoint(resource, parameters),
    token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: 'api.github.com',
        path: endpoint,
        method: 'GET',
        signal: AbortSignal.timeout(30_000),
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'mekstation-camp01-proof',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
          if (body.length > 2_000_000) request.destroy();
        });
        response.on('end', () => {
          if (response.statusCode !== 200)
            return reject(new Camp01ProvenanceError('GitHub transport failed'));
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Camp01ProvenanceError('GitHub response invalid'));
          }
        });
      },
    );
    request.on('error', (error) =>
      reject(
        error instanceof Camp01ProvenanceError
          ? error
          : new Camp01ProvenanceError('GitHub transport failed'),
      ),
    );
    request.end();
  });
}

export function createGitHubProvenance(dependencies = {}) {
  const verified = new Map();
  return Object.freeze({
    resolveRepairRegistration: (input) =>
      resolveRepairRegistration(input, dependencies),
    verifyPreflight: async (input) => {
      const result = await verifyPreflightInternal(input, dependencies);
      verified.set(contextKey(input), result.context);
      return result.preflight;
    },
    resolveWriterContext: (input) =>
      resolveWriterContext(input, {
        ...dependencies,
        verifiedContext: verified.get(contextKey(input)),
      }),
  });
}

export async function verifyGitHubCitation(citation, dependencies = {}) {
  const repository = await resource('repository', {}, dependencies);
  assertRepository(repository);
  return verifyCitation(citation, repository, dependencies);
}

export async function verifyPreflight(input, dependencies = {}) {
  return (await verifyPreflightInternal(input, dependencies)).preflight;
}

// prettier-ignore
export async function resolveRepairRegistration({wave,spec},dependencies={}) {
  const citation=specCitation(spec,wave), repository=await openRepository({operation:`repair-${wave}`,wave},dependencies); await verifyCitation(citation,repository.api,dependencies); await verifyLedgeredSpec(citation,repository,dependencies);
  const file=`openspec/changes/${citation.childChange}/camp01-repair-row.json`; let bytes,declaration;
  try { bytes=await readRepositoryFile({repository,sha:citation.mergeSha,file},dependencies); declaration=JSON.parse(bytes); } catch { fail('repair declaration missing'); }
  if(bytes!==`${JSON.stringify(declaration)}\n`||declaration?.row?.wave!==wave) fail('repair declaration drift'); const resolver=dependencies.resolveRepairSource; if(typeof resolver!=='function') fail('validated repair source missing'); const resolved=await resolver({wave,spec:citation,declaration});
  if(!resolved||!resolved.source||!resolved.registrySet) fail('validated repair source missing'); try { assertRepairDeclaration(declaration,resolved.source); } catch { fail('repair declaration drift'); }
  return {declaration,source:resolved.source,registrySet:resolved.registrySet};
}

// prettier-ignore
export async function resolveWriterContext(input,dependencies={}) {
  const context=dependencies.verifiedContext; if(!context||context.provenance!==JSON.stringify(input.provenance)) fail('verified preflight context missing'); const resolver=dependencies.resolveWriterInputs; if(typeof resolver!=='function') fail('validated writer inputs missing'); const facts=await resolver(input), triage=input.row?.wave==='proof-02-triage', keys=['treeSha','capProvenance','identityRegistry','registryContext','predecessorReceiptIds','reviewedHead',...(triage?['reproduction','triage']:[])];
  if(!facts||JSON.stringify(Object.keys(facts))!==JSON.stringify(keys)||!OID.test(facts.treeSha)||!Array.isArray(facts.predecessorReceiptIds)||facts.predecessorReceiptIds.length!==input.row.predecessors.length||!facts.identityRegistry||!facts.registryContext||!Array.isArray(facts.registryContext.provenance)) fail('validated writer inputs missing');
  const specTupleId=tupleId(input.provenance.spec), ownedPrTupleId=input.provenance.owned===null?null:tupleId(input.provenance.owned), additions=[{id:specTupleId,sourceKind:'spec-tuple',wave:input.row.wave,subject:input.row.capSubject},...(ownedPrTupleId===null?[]:[{id:ownedPrTupleId,sourceKind:'owned-pr-tuple',wave:input.row.wave,subject:input.row.capSubject}])];
  for(const entry of additions){const prior=facts.registryContext.provenance.find(({id})=>id===entry.id); if(prior&&JSON.stringify(prior)!==JSON.stringify(entry)) fail('writer provenance registry drift');}
  const registryContext={...facts.registryContext,provenance:[...facts.registryContext.provenance.filter((entry)=>!additions.some(({id})=>id===entry.id)),...additions].sort((left,right)=>left.id.localeCompare(right.id))}, provenance={subject:input.row.capSubject,specTupleId,ownedPrTupleId,predecessorReceiptIds:facts.predecessorReceiptIds};
  return {treeSha:facts.treeSha,provenance,capProvenance:facts.capProvenance,identityRegistry:facts.identityRegistry,registryContext,reviewedHead:facts.reviewedHead,...(triage?{reproduction:facts.reproduction,triage:facts.triage}:{})};
}

// prettier-ignore
async function verifyPreflightInternal(input,dependencies) {
  if(!input?.row||!input.arguments||!input.provenance) fail('preflight input missing'); const repository=await openRepository({operation:`preflight-${input.row.wave}-${input.arguments.mode}`,wave:input.row.wave},dependencies), specs=[specCitation(input.provenance.spec,input.row.wave),...(input.arguments.programSpecs??[]).map((value)=>specCitation(parseSpecTuple(value),input.row.wave))];
  for(const citation of specs){await verifyCitation(citation,repository.api,dependencies); await verifyLedgeredSpec(citation,repository,dependencies);} const owned=input.provenance.owned===null?null:ownedCitation(input.provenance.owned,input.row.wave,input.row.capSubject); if(owned){await verifyCitation(owned,repository.api,dependencies); const comparison=await resource('compare',{base:specs[0].mergeSha,head:owned.headSha},dependencies); if(!['ahead','identical'].includes(comparison?.status)) fail('owned head does not descend from cited spec merge');}
  assertReceiptIdentity({arguments_:input.arguments,row:input.row,owned,mainOid:repository.mainOid}); if(owned?.mergeSha) await verifyAncestor(owned.mergeSha,repository,dependencies); const resolver=dependencies.resolvePreflightFacts; if(typeof resolver!=='function') fail('validated preflight facts missing'); const facts=await resolver(input); if(!facts) fail('validated preflight facts missing');
  const preflight={programSpecChanges:(input.arguments.programSpecs??[]).map((value)=>parseSpecTuple(value).childChange),predecessorReceiptWaves:facts.predecessorReceiptWaves,predecessorCleanupWaves:facts.predecessorCleanupWaves,repairGates:facts.repairGates,cap:facts.cap}; return {preflight,context:{provenance:JSON.stringify(input.provenance),repository,specs,owned}};
}

// prettier-ignore
async function openRepository({operation,wave},dependencies) {
  const api=await resource('repository',{},dependencies); assertRepository(api); const branch=await resource('branch',{branch:REPOSITORY_IDENTITY.baseRef},dependencies), mainOid=branch?.commit?.sha; if(branch?.name!==REPOSITORY_IDENTITY.baseRef||!OID.test(mainOid)) fail('canonical main identity drift'); const configured=dependencies.sessionDirectory, directory=typeof configured==='function'?await configured({operation,wave}):configured; if(typeof directory!=='string'||!path.isAbsolute(directory)) fail('bare session input missing');
  let git=dependencies.git; try { git??=await resolveVerifiedGit({cwd:dependencies.gitCwd??process.cwd()},dependencies.gitDependencies??{}); const session=await createBareSession({git,directory},dependencies.gitDependencies??{}), verified=await fetchAndVerifyOids({session,remoteUrl:dependencies.testOnlyRemoteUrl??REPOSITORY_IDENTITY.fetchUrl,headOid:mainOid,mainOid},gitDependencies(dependencies)); return {...verified,api,mainOid}; } catch(error) { if(error instanceof Camp01ProvenanceError) throw error; fail('verified Git repository unavailable'); }
}

// prettier-ignore
async function verifyCitation(citation,repository,dependencies) {
  const pull=await resource('pull-request',{number:citation.prNumber},dependencies); assertPullOrigin(pull,repository); if(pull.base.ref!==REPOSITORY_IDENTITY.baseRef) fail('repository base branch drift'); if(citation.headSha!==null&&pull.head?.sha!==citation.headSha) fail('pull request head SHA drift'); if(citation.mergeSha!==null&&pull.merge_commit_sha!==citation.mergeSha) fail('pull request merge SHA drift');
  // The sentinel stays available only while independent review is impossible.
  if(citation.approvalId==='solo-maintainer'){const collaborators=await resource('collaborators',{},dependencies); if(!Array.isArray(collaborators)||collaborators.length!==1||collaborators[0]?.login!==citation.reviewer) fail('solo maintainer reduction unavailable'); if(pull.user?.login!==citation.reviewer) fail('solo provenance author drift'); if(citation.mergeSha!==null&&pull.merged_by?.login!==citation.reviewer) fail('solo provenance merger drift'); const permission=await resource('permission',{login:citation.reviewer},dependencies), level=String(permission?.permission??'').toUpperCase(); if(permission?.user?.login!==citation.reviewer||level!=='ADMIN') fail('reviewer permission drift'); return Object.freeze({prNumber:citation.prNumber,headSha:pull.head.sha,mergeSha:citation.mergeSha,reviewId:'solo-maintainer',reviewer:citation.reviewer,permission:level});}
  const reviews=await allReviews(citation.prNumber,dependencies), review=reviews.find((entry)=>String(entry?.id)===citation.approvalId); if(!review||review.user?.login!==citation.reviewer) fail('approval reviewer drift'); if(review.state!=='APPROVED'||review.dismissed_at!==null&&review.dismissed_at!==undefined) fail('approval dismissed'); if(review.commit_id!==pull.head.sha) fail('approval head SHA drift'); if(review.user.login===pull.user?.login) fail('self approval rejected'); const permission=await resource('permission',{login:review.user.login},dependencies), level=String(permission?.permission??'').toUpperCase(); if(permission?.user?.login!==review.user.login||!ALLOWED_PERMISSIONS.has(level)) fail('reviewer permission drift');
  return Object.freeze({prNumber:citation.prNumber,headSha:pull.head.sha,mergeSha:citation.mergeSha,reviewId:citation.approvalId,reviewer:review.user.login,permission:level});
}

// prettier-ignore
async function verifyLedgeredSpec(citation,repository,dependencies) {
  await verifyAncestor(citation.mergeSha,repository,dependencies); let ledger;
  try { ledger=JSON.parse(await readRepositoryFile({repository,sha:citation.mergeSha,file:'openspec/active-change-ledger.json'},dependencies)); await readRepositoryFile({repository,sha:citation.mergeSha,file:`openspec/changes/${citation.childChange}/tasks.md`},dependencies); } catch { fail('cited spec is not ledger-accounted at merge SHA'); }
  if(!Array.isArray(ledger?.allowedActiveChanges)||!ledger.allowedActiveChanges.some((entry)=>entry?.name===citation.childChange)) fail('cited spec is not ledger-accounted at merge SHA');
}

// prettier-ignore
async function verifyAncestor(mergeSha,repository,dependencies) { try { await invokeGit({git:{executable:repository.executable},args:['merge-base','--is-ancestor',mergeSha,repository.mainOid],cwd:repository.directory},gitDependencies(dependencies)); } catch(error) { if(error instanceof Camp01GitError) fail('merge SHA is not an ancestor of verified main'); throw error; } }
// prettier-ignore
async function readRepositoryFile({repository,sha,file},dependencies) { const reader=dependencies.readRepositoryFile; if(reader) return String(await reader({session:repository,sha,file})); return (await invokeGit({git:{executable:repository.executable},args:['show',`${sha}:${file}`],cwd:repository.directory},gitDependencies(dependencies))).stdout; }

// prettier-ignore
async function allReviews(number,dependencies) { const reviews=[]; for(let page=1;page<=20;page++){const batch=await resource('reviews',{number,page},dependencies); if(!Array.isArray(batch)) fail('GitHub response invalid'); reviews.push(...batch); if(batch.length<100) return reviews;} fail('review pagination limit exceeded'); }
// prettier-ignore
async function resource(name,parameters,dependencies) { const transport=dependencies.fetchGitHubResource??fetchGitHubResource; try { const value=await transport({resource:name,parameters}); if(value===null||value===undefined) fail('GitHub response invalid'); return value; } catch(error) { if(error instanceof Camp01ProvenanceError) throw error; fail('GitHub transport failed'); } }

// prettier-ignore
function assertRepository(value) { if(value?.fork===true||value?.parent!=null||value?.source!=null||value?.owner?.login!=='SwiggitySwerve') fail('repository fork rejected'); if(value?.full_name!==REPOSITORY_IDENTITY.nameWithOwner) fail('repository origin drift'); if(value?.id!==REPOSITORY_IDENTITY.repositoryId||value?.node_id!==REPOSITORY_IDENTITY.nodeId) fail('repository API identity drift'); if(value?.default_branch!==REPOSITORY_IDENTITY.baseRef) fail('repository base branch drift'); }
// prettier-ignore
function assertPullOrigin(pull) { for(const candidate of [pull?.base?.repo,pull?.head?.repo]) if(candidate?.id!==REPOSITORY_IDENTITY.repositoryId||candidate?.node_id!==REPOSITORY_IDENTITY.nodeId||candidate?.full_name!==REPOSITORY_IDENTITY.nameWithOwner) fail('repository origin drift'); }
// prettier-ignore
function assertReceiptIdentity({arguments_,row,owned,mainOid}) { if(owned&&arguments_.mode==='reviewed-head'&&arguments_.sha!==owned.headSha) fail('pull request head SHA drift'); if(owned&&arguments_.mode==='exact-main'&&(owned.mergeSha===null||arguments_.sha!==owned.mergeSha||mainOid!==owned.mergeSha)) fail('pull request merge SHA drift'); if(!owned&&(arguments_.mode!=='exact-main'||arguments_.sha!==mainOid)) fail('exact-main provenance drift'); if((row.capSubject==='none')!==!owned) fail('provenance subject drift'); }

// prettier-ignore
function specCitation(value,wave) { if(!value||!CHANGE.test(value.childChange)||!/^[1-9][0-9]*$/.test(String(value.prNumber))||!OID.test(value.mergeSha)) fail('invalid spec citation'); return {kind:'spec',wave,subject:'spec',childChange:value.childChange,prNumber:String(value.prNumber),headSha:null,mergeSha:value.mergeSha,approvalId:String(value.approvalId),reviewer:String(value.reviewer)}; }
// prettier-ignore
function ownedCitation(value,wave,subject) { if(!value||!/^[1-9][0-9]*$/.test(String(value.prNumber))||!OID.test(value.headSha)||value.mergeSha!==null&&!OID.test(value.mergeSha)) fail('invalid owned citation'); return {kind:'owned',wave,subject,childChange:null,prNumber:String(value.prNumber),headSha:value.headSha,mergeSha:value.mergeSha,approvalId:String(value.approvalId),reviewer:String(value.reviewer)}; }
// prettier-ignore
function parseSpecTuple(value) { const fields=typeof value==='string'?value.split('|'):[]; if(fields.length!==5) fail('invalid spec citation'); return {childChange:fields[0],prNumber:fields[1],mergeSha:fields[2],approvalId:fields[3],reviewer:fields[4]}; }
function tupleId(value) {
  return `tuple-${createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 32)}`;
}
function contextKey(input) {
  return `${input?.row?.wave}\0${input?.arguments?.mode}\0${input?.arguments?.sha}`;
}
function gitDependencies(dependencies) {
  return {
    ...(dependencies.gitDependencies ?? {}),
    ...(dependencies.testOnlyAllowLocalRemote === true
      ? { testOnlyAllowLocalRemote: true }
      : {}),
  };
}

// prettier-ignore
function resourceEndpoint(resource,parameters) { const base='/repos/SwiggitySwerve/MekStation', number=String(parameters.number??''); if(resource==='repository') return base; if(resource==='collaborators') return `${base}/collaborators`; if(resource==='branch') return `${base}/branches/main`; if(resource==='check-runs'&&OID.test(parameters.sha)) return `${base}/commits/${parameters.sha}/check-runs`; if(!/^[1-9][0-9]*$/.test(number)&&['pull-request','reviews'].includes(resource)) fail('invalid GitHub resource parameters'); if(resource==='pull-request') return `${base}/pulls/${number}`; if(resource==='reviews') return `${base}/pulls/${number}/reviews?per_page=100&page=${Number(parameters.page??1)}`; if(resource==='permission'&&/^[A-Za-z0-9-]{1,39}$/.test(String(parameters.login??''))) return `${base}/collaborators/${encodeURIComponent(parameters.login)}/permission`; if(resource==='compare'&&OID.test(parameters.base)&&OID.test(parameters.head)) return `${base}/compare/${parameters.base}...${parameters.head}`; fail('invalid GitHub resource'); }
function fail(message) {
  throw new Camp01ProvenanceError(message);
}

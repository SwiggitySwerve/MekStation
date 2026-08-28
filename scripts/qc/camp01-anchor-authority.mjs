import * as path from 'node:path';

import {
  canonicalBytes,
  digestBytes,
} from './camp01-authority-receipt.schemas.mjs';
import { Camp01GitError, invokeGit } from './camp01-git-trust.mjs';
import { parseNumstat } from './camp01-target-authority.mjs';

const OID = /^[0-9a-f]{40}$/;

export class Camp01FactsError extends Error {
  // Keeps anchor failures in the durable-facts public error family.
  constructor(message) {
    super(`CAMP01_FACTS_INVALID: ${message}`);
    this.name = 'Camp01FactsError';
  }
}

// Creates one repository-bound authority so callers cannot swap Git per record.
export function createAnchorAuthority(options = {}, dependencies = {}) {
  const { git, cwd } = options,
    { fetchCheckRuns } = dependencies;
  // prettier-ignore
  if (!git||typeof git.executable!=='string'||!path.isAbsolute(git.executable)||typeof cwd!=='string'||!path.isAbsolute(cwd)||typeof fetchCheckRuns!=='function') fail('anchor dependency invalid');
  const gitDependencies = dependencies.gitDependencies ?? {};
  // Revalidates durable declarations against repository objects before admission.
  // prettier-ignore
  return async function anchor(candidate, inputs = {}) {
    const command=candidate?.command, cap=command?.capProvenance;
    if (!command || !OID.test(command.sha)) fail('anchor commit unresolvable');
    await callGit({git,cwd,args:['rev-parse','--verify',`${command.sha}^{commit}`]},gitDependencies,'anchor commit unresolvable');
    const commitTree=await callGit({git,cwd,args:['rev-parse','--verify',`${command.sha}^{tree}`]},gitDependencies,'anchor commit unresolvable');
    // exact-main sha is the merge commit; writer treeSha is the owned product head.
    const expectedTree=command.mode==='exact-main'&&cap!==null?await callGit({git,cwd,args:['rev-parse','--verify',`${cap.headSha}^{tree}`]},gitDependencies,'anchor tree drift'):commitTree;
    if (expectedTree !== command.treeSha) fail('anchor tree drift');
    if (command.mode === 'exact-main') {
      if (!OID.test(inputs.fetchedMainOid)) fail('anchor main reachability drift');
      await callGit({git,cwd,args:['merge-base','--is-ancestor',command.sha,inputs.fetchedMainOid]},gitDependencies,'anchor main reachability drift');
    }
    if (cap === null) return true;
    await callGit({git,cwd,args:['merge-base','--is-ancestor',cap.baseSha,cap.headSha]},gitDependencies,'anchor ancestry drift');
    let manifest;
    try {
      manifest=parseNumstat(await callGit({git,cwd,args:['diff','--numstat','-z','--no-renames',cap.baseSha,cap.headSha,'--']},gitDependencies,'anchor cap recomputation drift'));
    } catch (error) {
      if (error instanceof Camp01FactsError) throw error;
      fail('anchor cap recomputation drift');
    }
    const changedLineCount=manifest.reduce((sum,entry)=>sum+(entry.added??0)+(entry.deleted??0),0), matches=cap.fileCount===manifest.length&&cap.changedLineCount===changedLineCount&&cap.binaryEntries===manifest.some((entry)=>entry.binary)&&cap.changedTreeManifestDigest===digestBytes(canonicalBytes(manifest));
    if (!matches) fail('anchor cap recomputation drift');
    const checkRuns = await callCheckRuns(fetchCheckRuns, cap.headSha);
    // prettier-ignore
    if (!Array.isArray(checkRuns?.check_runs)||!checkRuns.check_runs.some((entry)=>entry?.status==='completed'&&entry?.conclusion==='success'&&entry?.head_sha===cap.headSha)) fail('anchor ci run drift');
    return true;
  };
}

// Maps hardened Git failures onto the stable anchor clause that owns the call.
async function callGit(input, dependencies, message) {
  try {
    return (await invokeGit(input, dependencies)).stdout.trim();
  } catch (error) {
    if (error instanceof Camp01GitError) fail(message);
    throw error;
  }
}

// Maps transport and response failures onto the stable A4 anchor clause.
async function callCheckRuns(fetchCheckRuns, sha) {
  try {
    return await fetchCheckRuns(sha);
  } catch (error) {
    if (error instanceof Camp01FactsError) throw error;
    fail('anchor ci run drift');
  }
}

// Emits the durable-facts error family consumed by all admission callers.
function fail(message) {
  throw new Camp01FactsError(message);
}

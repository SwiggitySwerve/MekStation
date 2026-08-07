import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = (file: string): string =>
  pathToFileURL(path.resolve(file)).href;
const harness = String.raw`
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { openCaptureTransaction, capturePolicyFor } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-capture-transaction.mjs'))};
import { createDurableExport } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-durable-export.mjs'))};
import { validateReceiptDirectory, writeReceipt } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-authority-receipt.mjs'))};
import { WAVE_CONTRACTS } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-authority-receipt.contract.mjs'))};
import { canonicalBytes, digestBytes } from ${JSON.stringify(moduleUrl('scripts/qc/camp01-authority-receipt.schemas.mjs'))};
const q=JSON.parse(fs.readFileSync(0,'utf8')), root=q.root, proof=path.join(root,'proof'), initiating=path.join(root,'initiating');
for(const directory of [proof,initiating]) fs.mkdirSync(directory,{recursive:true});
const row=WAVE_CONTRACTS['camp-01e'], sha='b'.repeat(40), digest='sha256:'+'a'.repeat(64), tuple=(digit)=>'tuple-'+digit.repeat(16), receipt=(digit)=>'receipt-'+digit.repeat(16), runRoot=row.runRootTemplate.replace('<sha>',sha), policy=capturePolicyFor(row.wave);
const registryContext={evidence:[],provenance:[{id:receipt('7'),sourceKind:'predecessor-receipt',wave:'camp-01d',subject:'product-pr'},{id:tuple('5'),sourceKind:'spec-tuple',wave:row.wave,subject:'product-pr'},{id:tuple('6'),sourceKind:'owned-pr-tuple',wave:row.wave,subject:'product-pr'}],refs:[],capturePolicies:[{wave:row.wave,sha,fixtureAllowlistDigest:policy.fixtureAllowlistDigest,barrierPolicyDigest:policy.barrierPolicyDigest}],repairSources:[]}, validationContext={registryContext,reviewedHead:null};
const assertions=Object.fromEntries(row.assertions.map((id)=>[id,true]).sort()), snapshot={fixtureIds:[...policy.fixtureIds],fixtureAliases:[...policy.fixtureAliases],nonFixtureSentinels:[],domState:{html:'fixture'},appState:{route:'/fixture'},counters:{domMutations:0,storageWrites:0,databaseWrites:0,networkWrites:0},barrierTripped:false};
try {
  const written=await writeReceipt({wave:row.wave,commandId:row.commandId,sha,treeSha:sha,runRoot:path.join(proof,...runRoot.split('/')),mode:'reviewed-head',executionEnvironmentDigest:digest,provenance:{subject:'product-pr',specTupleId:tuple('5'),ownedPrTupleId:tuple('6'),predecessorReceiptIds:[receipt('7')]},capProvenance:{subject:'product-pr',baseSha:sha,headSha:sha,fileCount:2,changedLineCount:20,binaryEntries:false,changedTreeManifestDigest:digest,reviewedHeadReceiptId:null,reviewedHeadReceiptManifestDigest:null},identityRegistry:{schema:'camp01-identity-registry/v1',entities:[],refs:[]},registryContext,reviewedHead:null},{randomBytes:()=>Buffer.from('8'.repeat(32),'hex'),runCommand:async(_argv,context)=>{
    fs.writeFileSync(context.artifactPath('wave-result.json'),canonicalBytes({schema:'camp01-wave-result/v1',wave:row.wave,runId:context.runId,status:'passed',assertions}));
    if(context.invocationId==='camp-01e-picker-browser') for(const artifactPath of ['mobile-390x844.png','desktop.png']){const transaction=openCaptureTransaction({wave:row.wave,invocationId:context.invocationId,commandSequenceIndex:1,artifactPath,artifactDirectory:path.dirname(context.artifactPath(artifactPath))},{instrumentation:{seedFixtures:async()=>undefined,arm:async()=>undefined,snapshot:async()=>structuredClone(snapshot)}});await transaction.prepare();await transaction.capture(async(file)=>fs.writeFileSync(file,Buffer.from(artifactPath)));await transaction.publish();}
    return {exitCode:0};
  }});
  const exporter=createDurableExport({initiatingRoot:initiating,transientRoot:proof,validationContext},{validatorSpawn:spawnSync}), exportInput={row,receipt:{runId:written.runId,phase:'final',finalizedPaths:[...row.artifacts]},arguments:{runRoot,sha,mode:'reviewed-head'},proofTarget:{canonicalPath:proof}}, exported=await exporter.exportReceipt(exportInput), validatorInput={entry:path.resolve('scripts/qc/validate-camp01-authority-receipt.mjs'),stage:'durable',wave:row.wave,mode:'reviewed-head',sha,runRoot,runId:written.runId}, cleanReopen=await exporter.invokePublicValidator(validatorInput);
  const transientRunRoot=path.join(proof,...runRoot.split('/'));fs.rmSync(transientRunRoot,{recursive:true,force:false});
  const durableRunRoot=path.join(initiating,...runRoot.split('/')), finalDirectory=path.join(durableRunRoot,written.runId), stage=path.join(durableRunRoot,'.reopen-'+written.runId);fs.renameSync(finalDirectory,stage);
  const commandFile=path.join(stage,'command-result.json'), manifestFile=path.join(stage,'receipt-manifest.json'), command=JSON.parse(fs.readFileSync(commandFile,'utf8'));
  if(q.mutation==='missing-entry') command.captureAttestations.pop();
  if(q.mutation==='extra-entry') command.captureAttestations.push({...command.captureAttestations.at(-1),artifactPath:'zz-extra.png'});
  if(q.mutation==='reordered-entries') command.captureAttestations.reverse();
  if(q.mutation==='substituted-digest') command.captureAttestations[0].pngDigest='sha256:'+'f'.repeat(64);
  if(q.mutation==='tampered-post-state') command.captureAttestations[0].postStateDigest='sha256:'+'e'.repeat(64);
  if(q.mutation==='tampered-post-counters') command.captureAttestations[0].postMutationCountersDigest='sha256:'+'e'.repeat(64);
  if(q.mutation==='tampered-fixture-allowlist') command.captureAttestations[0].fixtureAllowlistDigest='sha256:'+'e'.repeat(64);
  if(q.mutation==='tampered-barrier-policy') command.captureAttestations[0].barrierPolicyDigest='sha256:'+'e'.repeat(64);
  if(q.mutation==='malformed-state-digests'){command.captureAttestations[0].preStateDigest='x';command.captureAttestations[0].postStateDigest='x';}
  const commandBytes=q.mutation==='noncanonical-bytes'?Buffer.from(' '+JSON.stringify(command)+'\n'):Buffer.from(canonicalBytes(command));fs.writeFileSync(commandFile,commandBytes);
  const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8')), commandEntry=manifest.entries.find((entry)=>entry.path==='command-result.json');commandEntry.size=commandBytes.length;commandEntry.digest=digestBytes(commandBytes);fs.writeFileSync(manifestFile,canonicalBytes(manifest));
  let rejection=null, mutationReopened=false, durableReopenRejection=null;
  try { validateReceiptDirectory(stage,{...validationContext,expectedWave:row.wave,expectedSha:sha,expectedMode:'reviewed-head',expectedRunId:written.runId});mutationReopened=true;fs.renameSync(stage,finalDirectory); } catch(error) { rejection=error instanceof Error?error.message:String(error); }
  if(!mutationReopened){ fs.renameSync(stage,finalDirectory); try { await exporter.invokePublicValidator(validatorInput); } catch(error) { durableReopenRejection=error instanceof Error?error.message:String(error); } fs.renameSync(finalDirectory,stage); }
  process.stdout.write(JSON.stringify({ok:true,value:{exportedRunId:exported.runId,cleanReopen,mutationReopened,rejection,durableReopenRejection,transientReceiptExists:fs.existsSync(written.finalDirectory),finalizedReceiptExists:fs.existsSync(finalDirectory),finalizedCommandExists:fs.existsSync(path.join(finalDirectory,'command-result.json')),finalizedManifestExists:fs.existsSync(path.join(finalDirectory,'receipt-manifest.json')),quarantinedStageExists:fs.existsSync(stage)}}));
} catch(error) { process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.stack:String(error)}));process.exitCode=1; }`;

type Result = {
  readonly ok: boolean;
  readonly value?: {
    readonly exportedRunId: string;
    readonly cleanReopen: { readonly validated: boolean };
    readonly mutationReopened: boolean;
    readonly rejection: string | null;
    readonly durableReopenRejection: string | null;
    readonly transientReceiptExists: boolean;
    readonly finalizedReceiptExists: boolean;
    readonly finalizedCommandExists: boolean;
    readonly finalizedManifestExists: boolean;
    readonly quarantinedStageExists: boolean;
  };
  readonly error?: string;
};

function invoke(mutation: string): Result {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof5c-reopen-'));
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    { input: JSON.stringify({ mutation, root }), encoding: 'utf8' },
  );
  const value = result.stdout
    ? (JSON.parse(result.stdout) as Result)
    : { ok: false, error: result.stderr };
  fs.rmSync(root, { recursive: true, force: true });
  return value;
}

describe('CAMP-01 durable capture attestation reopen adversarial oracle', () => {
  it('control: the unmutated durable receipt reopens and publishes', () => {
    // Proves the five rejections below are caused by their mutations, not by a broken fixture or an unconditionally-rejecting call path.
    const result = invoke('none');
    expect(result.error).toBeUndefined();
    expect(result).toMatchObject({
      ok: true,
      value: {
        cleanReopen: { validated: true },
        mutationReopened: true,
        rejection: null,
        finalizedReceiptExists: true,
        quarantinedStageExists: false,
      },
    });
  });

  // prettier-ignore
  it.each([
    ['missing-entry','CAMP01_RECEIPT_INVALID: capture set drift'],
    ['extra-entry','CAMP01_RECEIPT_INVALID: capture set drift'],
    ['reordered-entries','CAMP01_RECEIPT_INVALID: capture attestations must be sorted and unique'],
    ['substituted-digest','CAMP01_RECEIPT_INVALID: capture digest drift'],
    ['noncanonical-bytes','CAMP01_WRITER_INVALID: non-canonical artifact bytes'],
    ['tampered-post-state','CAMP01_RECEIPT_INVALID: capture digest drift'],
    ['tampered-post-counters','CAMP01_RECEIPT_INVALID: capture digest drift'],
    ['tampered-fixture-allowlist','CAMP01_RECEIPT_INVALID: capture digest drift'],
    ['tampered-barrier-policy','CAMP01_RECEIPT_INVALID: capture digest drift'],
    ['malformed-state-digests','CAMP01_RECEIPT_INVALID: capture digest drift'],
  ])('rejects %s without a finalized publication', (mutation, message) => {
    // Given a real captured writer receipt exported and reopened durably, when its attestation set mutates, then validation quarantines it before final publication.
    const result = invoke(mutation);
    expect(result.error).toBeUndefined();
    expect(result).toMatchObject({
      ok: true,
      value: {
        exportedRunId: `camp01-${'8'.repeat(32)}`,
        cleanReopen: { validated: true },
        mutationReopened: false,
        transientReceiptExists: false,
        finalizedReceiptExists: false,
        finalizedCommandExists: false,
        finalizedManifestExists: false,
        quarantinedStageExists: true,
      },
    });
    expect(result.value?.rejection).toBe(message);
    // Production-owned gate: the durable public-validator reopen must also refuse the mutated destination
    // (subprocess boundary, so the export layer reports its own typed wrapper rather than the inner message).
    expect(result.value?.durableReopenRejection).toBe(
      'CAMP01_EXPORT_INVALID: public validator failed for durable stage',
    );
  });
});

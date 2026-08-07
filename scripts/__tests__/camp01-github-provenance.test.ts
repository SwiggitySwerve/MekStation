import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const provenanceUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-github-provenance.mjs'),
).href;
const trustUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-git-trust.mjs'),
).href;
const contractUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.contract.mjs'),
).href;
const controllerUrl = pathToFileURL(
  path.resolve('scripts/qc/run-camp01-authority-receipt.mjs'),
).href;
const schemasUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.schemas.mjs'),
).href;

const harness = `
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs'; import path from 'node:path';
import * as provenance from ${JSON.stringify(provenanceUrl)};
import * as trust from ${JSON.stringify(trustUrl)};
import { REPOSITORY_IDENTITY, WAVE_CONTRACTS, assertRepairDeclaration, commandSequenceDigest } from ${JSON.stringify(contractUrl)};
import { validatePreflight } from ${JSON.stringify(controllerUrl)};
import { validateWriteContext } from ${JSON.stringify(schemasUrl)};
const request=JSON.parse(fs.readFileSync(0,'utf8')), root=request.root, head='b'.repeat(40), merge='c'.repeat(40), ownedReviewer=request.drift==='self'?'author':'owned-reviewer', specReviewer='spec-reviewer', apiCalls=[];
const repo=()=>({id:REPOSITORY_IDENTITY.repositoryId,node_id:REPOSITORY_IDENTITY.nodeId,full_name:REPOSITORY_IDENTITY.nameWithOwner,default_branch:'main',fork:false,parent:null,source:null,owner:{login:'SwiggitySwerve'}});
function transportFixtures(specSha=head,ownedSha=head,mainSha=merge,ownedMergeSha=mainSha){
  return async ({resource,parameters})=>{ let value; apiCalls.push({resource,parameters});
    if(request.drift==='transport-failure'&&resource==='repository') throw new Error('transport failed');
    if(resource==='repository') value=repo();
    else if(resource==='branch') value={name:'main',commit:{sha:mainSha}};
    else if(resource==='pull-request'){const owned=String(parameters.number)==='201', sha=owned?ownedSha:specSha; value={number:Number(parameters.number),base:{ref:'main',repo:repo()},head:{sha,repo:repo()},merge_commit_sha:owned?ownedMergeSha:specSha,user:{login:'author'}};}
    else if(resource==='reviews'){
      const owned=String(parameters.number)==='201', sha=owned?ownedSha:specSha, reviewer=owned?ownedReviewer:specReviewer, approval={id:owned?401:301,state:'APPROVED',commit_id:sha,dismissed_at:null,user:{login:reviewer}};
      if(request.drift==='pagination-limit') value=Array.from({length:100},(_,index)=>({...approval,id:1000+index}));
      else if(request.drift==='approval-page-two'&&Number(parameters.page)===1) value=Array.from({length:100},(_,index)=>({...approval,id:1000+index}));
      else value=[approval];
    }
    else if(resource==='permission'){const login=String(parameters.login), expected=['spec-reviewer','owned-reviewer','author']; if(!expected.includes(login)) throw new Error('unexpected permission login '+login); value={permission:'write',user:{login}};}
    else if(resource==='compare'){if(parameters.base!==specSha||parameters.head!==ownedSha) throw new Error('unexpected compare tuple'); value={status:request.drift==='compare-behind'?'behind':request.drift==='compare-diverged'?'diverged':'ahead'};}
    else throw new Error('unexpected mock resource '+resource);
    if(request.drift==='fork'&&resource==='repository') value.parent={id:1};
    if(request.drift==='wrong-base'&&resource==='pull-request') value.base.ref='develop';
    if(request.drift==='retargeted-origin'&&resource==='repository') value.full_name='Other/MekStation';
    if(request.drift==='api-identity'&&resource==='repository') value.node_id='R_drift';
    if(request.drift==='wrong-merge'&&resource==='pull-request') value.merge_commit_sha='d'.repeat(40);
    if(request.drift==='wrong-head'&&resource==='pull-request') value.head.sha='e'.repeat(40);
    if(request.drift==='approval-head'&&resource==='reviews') value[0].commit_id='f'.repeat(40);
    if(request.drift==='dismissed'&&resource==='reviews') value[0].state='DISMISSED';
    if(request.drift==='unauthorized-reviewer'&&resource==='reviews') value[0].user.login='intruder';
    if(request.drift==='permission-drift'&&resource==='permission') value.permission='read';
    if(request.drift==='canonical-main-name'&&resource==='branch') value.name='develop';
    if(request.drift==='canonical-main-oid'&&resource==='branch') value.commit.sha='invalid';
    if(request.drift==='null-resource'&&resource==='repository') value=null;
    return structuredClone(value);
  };
}
const citation={kind:'owned',wave:'camp-01a',subject:'product-pr',prNumber:'201',headSha:head,mergeSha:merge,approvalId:'401',reviewer:ownedReviewer};
async function seedRepository(child,mode){
  const git={executable:request.git}, work=path.join(root,'source'), remote=path.join(root,'remote.git'); fs.mkdirSync(work);
  const run=(args,cwd=work)=>trust.invokeGit({git,args,cwd}); await run(['init','--initial-branch=main']);
  const cause='d'.repeat(64), repairWave='proof-02-repair-'+cause, sourceDisposition={receiptId:'receipt-'+'1'.repeat(16),observationId:'observation-a',failedReportObservationId:null,failedReportFingerprint:null,causeFingerprint:'sha256:'+cause}, sequence=[['@npm','test','--','--runInBand']];
  const repairRow={wave:repairWave,commandId:repairWave,childChange:child,runRootTemplate:'.sisyphus/evidence/playtest/'+repairWave+'-<sha>',commandSequence:sequence,canonicalArgvDigest:commandSequenceDigest(sequence),artifacts:['command-result.json','receipt-manifest.json','wave-result.json'],assertions:['repairVerified===true'],predecessors:['proof-02-triage'],sourceDisposition,capSubject:'product-pr',maxFiles:3,maxChangedLines:100,reporterContracts:[]};
  fs.mkdirSync(path.join(work,'openspec','changes',child),{recursive:true}); fs.writeFileSync(path.join(work,'openspec','changes',child,'tasks.md'),'# tasks\\n'); if(mode==='repair'&&request.drift!=='declaration-missing'){const bytes=JSON.stringify({schema:'camp01-repair-row/v1',row:repairRow})+'\\n'; fs.writeFileSync(path.join(work,'openspec','changes',child,'camp01-repair-row.json'),request.drift==='canonical-bytes-drift'?bytes+'\\n':bytes);}
  fs.mkdirSync(path.join(work,'openspec'),{recursive:true}); const ledger=(included)=>JSON.stringify({allowedActiveChanges:included?[{name:child,status:'proposed'}]:[]})+'\\n'; fs.writeFileSync(path.join(work,'openspec','active-change-ledger.json'),ledger(mode!=='unledgered'&&mode!=='post-sha'));
  await run(['add','.']); await run(['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid','commit','-m','spec']); const specSha=(await run(['rev-parse','HEAD'])).stdout.trim();
  if(mode==='post-sha'){fs.writeFileSync(path.join(work,'openspec','active-change-ledger.json'),ledger(true)); await run(['add','.']); await run(['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid','commit','-m','ledger-late']);}
  fs.writeFileSync(path.join(work,'product.txt'),'product\\n'); await run(['add','.']); await run(['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid','commit','-m','product']); const productSha=(await run(['rev-parse','HEAD'])).stdout.trim(), divergentSha=mode==='nonancestor'?(await run(['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid','commit-tree',productSha+'^{tree}','-m','divergent'])).stdout.trim():null;
  await trust.createBareSession({git,directory:remote}); await run(['push',remote,'HEAD:refs/heads/main',...(divergentSha?[divergentSha+':refs/heads/divergent']:[])]); return {git,remote,specSha,productSha,divergentSha,repairRow,cause};
}
try { let value;
  if(request.action==='citation') value=await provenance.verifyGitHubCitation(citation,{fetchGitHubResource:transportFixtures()});
  else if(request.action==='resource-guard') value=await provenance.fetchGitHubResource({resource:request.resource,parameters:request.parameters});
  else {
    const child=request.action==='repair'?'repair-child':'add-campaign-roster-source-readiness', seeded=await seedRepository(child,request.action), citedSha=request.action==='nonancestor'?seeded.divergentSha:seeded.specSha;
    const mainSha=request.drift==='api-main-oid-mismatch'?'e'.repeat(40):seeded.productSha, ownedMergeSha=request.identity==='main-merge'?'e'.repeat(40):mainSha;
    const transport=transportFixtures(citedSha,seeded.productSha,mainSha,ownedMergeSha), digest='sha256:'+'a'.repeat(64), predecessor='receipt-'+'4'.repeat(16);
    const spec={childChange:child,prNumber:'101',mergeSha:citedSha,approvalId:'301',reviewer:specReviewer}, owned={kind:'product',prNumber:'201',headSha:seeded.productSha,approvalId:'401',reviewer:ownedReviewer,mergeSha:null};
    const source={kind:'proof',childChange:child,causeFingerprint:'sha256:'+seeded.cause,sourceDisposition:seeded.repairRow.sourceDisposition,reporterContracts:[],explicitDependencies:[]};
    const dependencies={fetchGitHubResource:transport,git:seeded.git,gitDependencies:request.action==='nonancestor'?{spawn:(executable,args,options)=>{const result=spawnSync(executable,args,options), fetchIndex=args.indexOf('fetch'); if(result.status!==0||fetchIndex<0)return result; return spawnSync(executable,[...args.slice(0,fetchIndex),'fetch','--no-tags','--no-recurse-submodules',seeded.remote,'+refs/heads/divergent:refs/camp01/divergent'],options);}}:undefined,sessionDirectory:request.drift==='missing-session'?undefined:request.drift==='relative-session'?()=>'.camp01-relative':({operation})=>path.join(root,operation+'.git'),testOnlyRemoteUrl:seeded.remote,testOnlyAllowLocalRemote:true,
      resolvePreflightFacts:()=>({predecessorReceiptWaves:['camp-00'],predecessorCleanupWaves:['camp-00'],repairGates:[],cap:{subject:'product-pr',fileCount:1,changedLineCount:2,binaryEntries:false}}),
      resolveWriterInputs:request.action==='missing-writer-inputs'?undefined:(input)=>({treeSha:seeded.productSha,capProvenance:{subject:'product-pr',baseSha:seeded.specSha,headSha:seeded.productSha,fileCount:1,changedLineCount:2,binaryEntries:false,changedTreeManifestDigest:digest,reviewedHeadReceiptId:null,reviewedHeadReceiptManifestDigest:null},identityRegistry:{schema:'camp01-identity-registry/v1',entities:[],refs:[]},registryContext:{evidence:[],provenance:request.drift==='writer-registry-drift'?[{id:'tuple-'+createHash('sha256').update(JSON.stringify(input.provenance.spec)).digest('hex').slice(0,32),sourceKind:'drift',wave:'camp-00',subject:'none'}]:[{id:predecessor,sourceKind:'predecessor-receipt',wave:'camp-00',subject:'none'}],refs:[],capturePolicies:[],repairSources:[]},predecessorReceiptIds:request.drift==='malformed-writer-facts'?[]:[predecessor],reviewedHead:null}),
      resolveRepairSource:request.drift==='missing-repair-source'?undefined:()=>({source,registrySet:{requiredRowIds:[seeded.repairRow.wave],registeredRowIds:[seeded.repairRow.wave]}})};
    const seams=provenance.createGitHubProvenance(dependencies);
    if(request.action==='repair'){const registration=await seams.resolveRepairRegistration({wave:seeded.repairRow.wave,spec}); value={keys:Object.keys(registration),accepted:!!assertRepairDeclaration(registration.declaration,registration.source),registrySet:registration.registrySet};}
    else if(request.action==='identity'){
      const identity=request.identity, capSubject=['none-exact','none-reviewed','subject-extra'].includes(identity)?'none':'product-pr', identityOwned=['none-exact','none-reviewed','subject-missing'].includes(identity)?null:{...owned,mergeSha:identity==='exact-merge-null'?null:identity==='main-merge'?ownedMergeSha:null}, mode=['none-exact','subject-missing','exact-merge-null','main-merge'].includes(identity)?'exact-main':'reviewed-head', sha=identity==='reviewed-sha'?seeded.specSha:identity==='main-merge'?ownedMergeSha:seeded.productSha;
      value=await provenance.verifyPreflight({row:{wave:'identity-check',capSubject},arguments:{mode,wave:'identity-check',sha,programSpecs:[]},provenance:{subject:capSubject,spec,owned:identityOwned},state:{}},dependencies);
    }
    else if(request.action==='cross-run'){
      const audit=request.binding==='audit', row={wave:audit?'audit-binding':'none-binding',capSubject:audit?'audit-pr':'none'}, boundOwned=audit?{...owned,kind:'audit'}:null, mode=audit?'reviewed-head':'exact-main', arguments_={mode,wave:row.wave,sha:seeded.productSha,programSpecs:[]}, bound={subject:row.capSubject,spec,owned:boundOwned}, input={row,arguments:arguments_,provenance:bound,state:{}};
      await seams.verifyPreflight(input); value=await seams.resolveWriterContext({...input,provenance:{...bound,spec:{...spec,approvalId:'cross-run-approval'}}});
    }
    else {const row=WAVE_CONTRACTS['camp-01a'], exactMain=request.action==='exact-main', arguments_={mode:exactMain?'exact-main':'reviewed-head',wave:row.wave,sha:request.drift==='exact-main-sha-drift'?seeded.specSha:seeded.productSha,programSpecs:[]}, controllerProvenance={subject:'product-pr',spec,owned:{...owned,mergeSha:exactMain?seeded.productSha:null}}, input={row,arguments:arguments_,provenance:controllerProvenance,state:{}}; const preflight=await seams.verifyPreflight(input); const acceptedPreflight=validatePreflight(row,preflight);
      if(exactMain) value={preflight,acceptedPreflight};
      else {const writerProvenance=request.action==='writer-provenance-drift'?{...controllerProvenance,owned:{...controllerProvenance.owned,reviewer:'intruder'}}:controllerProvenance, writer=await seams.resolveWriterContext({row,arguments:arguments_,provenance:writerProvenance,proofTarget:{canonicalPath:root}}), acceptedWriter=validateWriteContext({wave:row.wave,commandId:row.commandId,sha:seeded.productSha,treeSha:writer.treeSha,executionEnvironmentDigest:digest,mode:'reviewed-head',provenance:writer.provenance,capProvenance:writer.capProvenance,identityRegistry:writer.identityRegistry},{row,registryContext:writer.registryContext,reviewedHead:writer.reviewedHead}); value={preflight,acceptedPreflight,writerKeys:Object.keys(writer),acceptedWriter,...request.action==='approval-transport'?{apiCalls}: {}};}}
  }
  process.stdout.write(JSON.stringify({ok:true,value}));
} catch(error) { process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error),name:error instanceof Error?error.name:null})); process.exitCode=1; }
`;

type Result = {
  ok: boolean;
  value?: Record<string, unknown>;
  error?: string;
  name?: string;
};
function invoke(request: Record<string, unknown>): Result {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    { input: JSON.stringify(request), encoding: 'utf8' },
  );
  return result.stdout
    ? JSON.parse(result.stdout)
    : { ok: false, error: result.stderr };
}
function findHostGit(): string | null {
  const result = spawnSync(
    process.platform === 'win32' ? 'where.exe' : 'which',
    ['git'],
    { shell: false, encoding: 'utf8' },
  );
  const candidate = (result.stdout ?? '').split(/\r?\n/).find(Boolean);
  return result.status === 0 && candidate ? path.resolve(candidate) : null;
}

const hostGit = findHostGit();
let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof3c2-'));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('CAMP-01 GitHub provenance', () => {
  it('accepts the frozen repository, exact PR, exact-head approval, and current writer permission through the injected transport', () => {
    // Given only a mock GitHub transport
    const result = invoke({ action: 'citation', root });
    // When the complete citation is verified, then no production network adapter runs
    expect(result).toMatchObject({
      ok: true,
      value: {
        prNumber: '201',
        reviewer: 'owned-reviewer',
        permission: 'WRITE',
      },
    });
  });

  it.each([
    ['approval-page-two', undefined],
    [
      'pagination-limit',
      'CAMP01_PROVENANCE_INVALID: review pagination limit exceeded',
    ],
  ])('enforces review pagination guard %s', (drift, error) => {
    // Given bounded/unbounded pages, when reviews load, then the pager decides exactly
    const result = invoke({ action: 'citation', drift, root });
    expect(result.error).toBe(error);
  });

  it.each([
    ['unknown', {}, 'invalid GitHub resource'],
    ['pull-request', { number: '0' }, 'invalid GitHub resource parameters'],
    ['permission', { login: 'bad/name' }, 'invalid GitHub resource'],
    [
      'compare',
      { base: 'a'.repeat(40), head: 'bad' },
      'invalid GitHub resource',
    ],
  ])(
    'rejects invalid production API resource %s %#',
    (resource, parameters, message) => {
      // Given invalid API parameters, when routing runs, then it rejects before network
      const result = invoke({
        action: 'resource-guard',
        root,
        resource,
        parameters,
      });
      expect(result).toEqual({
        ok: false,
        error: 'CAMP01_PROVENANCE_INVALID: ' + message,
        name: 'Camp01ProvenanceError',
      });
    },
  );

  it.each([
    ['transport-failure', 'GitHub transport failed'],
    ['null-resource', 'GitHub response invalid'],
  ])('collapses injected API failure %s', (drift, message) => {
    // Given a throw/null response, when the API boundary receives it, then the typed family is stable
    const result = invoke({ action: 'citation', drift, root });
    expect(result).toEqual({
      ok: false,
      error: 'CAMP01_PROVENANCE_INVALID: ' + message,
      name: 'Camp01ProvenanceError',
    });
  });

  it.each([
    ['fork', 'repository fork rejected'],
    ['wrong-base', 'repository base branch drift'],
    ['retargeted-origin', 'repository origin drift'],
    ['api-identity', 'repository API identity drift'],
    ['wrong-merge', 'pull request merge SHA drift'],
    ['wrong-head', 'pull request head SHA drift'],
    ['approval-head', 'approval head SHA drift'],
    ['dismissed', 'approval dismissed'],
    ['self', 'self approval rejected'],
    ['unauthorized-reviewer', 'approval reviewer drift'],
    ['permission-drift', 'reviewer permission drift'],
  ])('rejects P.2 drift %s with one exact message', (drift, message) => {
    // Given one named P.2 drift in an otherwise valid mock response
    const result = invoke({ action: 'citation', root, drift });
    // When verification runs, then the typed error identifies only that drift
    expect(result).toEqual({
      ok: false,
      error: `CAMP01_PROVENANCE_INVALID: ${message}`,
      name: 'Camp01ProvenanceError',
    });
  });

  const gitIt = hostGit ? it : it.skip;
  gitIt('uses distinct spec and owned approval transport identities', () => {
    // Given distinct approvals, when preflight resolves both, then transport identities never alias
    const result = invoke({
      action: 'approval-transport',
      root,
      git: hostGit,
    });
    expect(result.value?.apiCalls).toEqual(
      expect.arrayContaining([
        { resource: 'reviews', parameters: { number: '101', page: 1 } },
        { resource: 'reviews', parameters: { number: '201', page: 1 } },
        {
          resource: 'permission',
          parameters: { login: 'spec-reviewer' },
        },
        {
          resource: 'permission',
          parameters: { login: 'owned-reviewer' },
        },
      ]),
    );
  });

  gitIt.each([
    ['canonical-main-name', 'canonical main identity drift'],
    ['canonical-main-oid', 'canonical main identity drift'],
    ['missing-session', 'bare session input missing'],
    ['relative-session', 'bare session input missing'],
    ['api-main-oid-mismatch', 'verified Git repository unavailable'],
  ])('rejects open-repository guard %s', (drift, message) => {
    // Given an invalid repository input, when open runs, then provenance cannot begin
    const result = invoke({ action: 'preflight', drift, root, git: hostGit });
    expect(result).toEqual({
      ok: false,
      error: 'CAMP01_PROVENANCE_INVALID: ' + message,
      name: 'Camp01ProvenanceError',
    });
  });

  gitIt.each(['compare-behind', 'compare-diverged'])(
    'rejects owned-head comparison %s',
    (drift) => {
      // Given a non-ahead compare, when descent is checked, then the owned head rejects
      const result = invoke({ action: 'preflight', drift, root, git: hostGit });
      expect(result.error).toBe(
        'CAMP01_PROVENANCE_INVALID: owned head does not descend from cited spec merge',
      );
    },
  );

  gitIt('accepts no-PR provenance only at exact verified main', () => {
    // Given no owned PR and exact main, when identity is asserted, then none-subject passes
    const result = invoke({
      action: 'identity',
      identity: 'none-exact',
      root,
      git: hostGit,
    });
    expect(result.ok).toBe(true);
  });

  gitIt.each([
    ['none-reviewed', 'exact-main provenance drift'],
    ['subject-missing', 'provenance subject drift'],
    ['subject-extra', 'provenance subject drift'],
    ['reviewed-sha', 'pull request head SHA drift'],
    ['exact-merge-null', 'pull request merge SHA drift'],
    ['main-merge', 'pull request merge SHA drift'],
  ])('rejects receipt identity branch %s', (identity, message) => {
    // Given an identity contradiction, when receipt identity is asserted, then it fails closed
    const result = invoke({ action: 'identity', identity, root, git: hostGit });
    expect(result.error).toBe('CAMP01_PROVENANCE_INVALID: ' + message);
  });

  gitIt.each(['audit', 'none'])(
    'rejects %s spec tuple reuse across a verified context key',
    (binding) => {
      // Given a second spec tuple at one key, when writer resolution crosses runs, then it rejects
      const result = invoke({
        action: 'cross-run',
        binding,
        root,
        git: hostGit,
      });
      expect(result.error).toBe(
        'CAMP01_PROVENANCE_INVALID: verified preflight context missing',
      );
    },
  );

  gitIt(
    'assembles controller preflight and writer context accepted by their consumer assertions',
    () => {
      // Given a real local 3C1 bare fetch plus mock-only GitHub resources
      const result = invoke({ action: 'preflight', root, git: hostGit });
      // When both 3C2 consumer seams run, then the existing assertions accept each output
      expect(result).toMatchObject({
        ok: true,
        value: {
          acceptedPreflight: true,
          acceptedWriter: true,
          writerKeys: [
            'treeSha',
            'provenance',
            'capProvenance',
            'identityRegistry',
            'registryContext',
            'reviewedHead',
          ],
        },
      });
    },
  );

  gitIt.each([
    ['unledgered', 'cited spec is not ledger-accounted at merge SHA'],
    ['post-sha', 'cited spec is not ledger-accounted at merge SHA'],
    ['nonancestor', 'merge SHA is not an ancestor of verified main'],
  ])('rejects ledger/ancestry case %s exactly', (action, message) => {
    // Given verified API identities but invalid repository history
    const result = invoke({ action, root, git: hostGit });
    // When repository proof runs, then no post-SHA or non-ancestor citation is admitted
    expect(result.error).toBe(`CAMP01_PROVENANCE_INVALID: ${message}`);
  });

  gitIt(
    'loads a merged repair declaration and returns the controller contract shape',
    () => {
      // Given a canonical repair declaration at its approved ledgered merge
      const result = invoke({ action: 'repair', root, git: hostGit });
      // When registration resolves, then the existing contract accepts it and the registry sets are exact
      expect(result).toMatchObject({
        ok: true,
        value: {
          keys: ['declaration', 'source', 'registrySet'],
          accepted: true,
        },
      });
    },
  );

  gitIt.each([
    ['declaration-missing', 'repair declaration missing'],
    ['canonical-bytes-drift', 'repair declaration drift'],
    ['missing-repair-source', 'validated repair source missing'],
  ])('rejects repair registration drift %s exactly', (drift, message) => {
    // Given one invalid repair registration input
    const result = invoke({ action: 'repair', drift, root, git: hostGit });
    // When registration resolves, then the typed rejection names that input
    expect(result).toEqual({
      ok: false,
      error: 'CAMP01_PROVENANCE_INVALID: ' + message,
      name: 'Camp01ProvenanceError',
    });
  });

  gitIt('accepts exact-main receipt identity at the owned merge', () => {
    // Given owned merge, argument, and verified main SHAs all agree
    const result = invoke({ action: 'exact-main', root, git: hostGit });
    // When preflight checks exact-main identity, then its consumer accepts it
    expect(result).toMatchObject({
      ok: true,
      value: { acceptedPreflight: true },
    });
  });

  gitIt(
    'rejects exact-main receipt identity when the argument SHA drifts',
    () => {
      // Given an owned merge and verified main that agree but a stale argument SHA
      const result = invoke({
        action: 'exact-main',
        drift: 'exact-main-sha-drift',
        root,
        git: hostGit,
      });
      // When preflight checks exact-main identity, then the merge guard rejects it
      expect(result).toEqual({
        ok: false,
        error: 'CAMP01_PROVENANCE_INVALID: pull request merge SHA drift',
        name: 'Camp01ProvenanceError',
      });
    },
  );

  gitIt.each([
    [
      'writer-provenance-drift',
      undefined,
      'verified preflight context missing',
    ],
    ['missing-writer-inputs', undefined, 'validated writer inputs missing'],
    ['preflight', 'writer-registry-drift', 'writer provenance registry drift'],
    ['preflight', 'malformed-writer-facts', 'validated writer inputs missing'],
  ])('rejects writer boundary %s / %s exactly', (action, drift, message) => {
    // Given a verified preflight followed by one writer-boundary drift
    const result = invoke({ action, drift, root, git: hostGit });
    // When writer context resolves, then the typed rejection binds the exact seam
    expect(result).toEqual({
      ok: false,
      error: 'CAMP01_PROVENANCE_INVALID: ' + message,
      name: 'Camp01ProvenanceError',
    });
  });
});

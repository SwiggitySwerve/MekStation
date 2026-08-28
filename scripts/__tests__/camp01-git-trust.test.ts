import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-git-trust.mjs'),
).href;
const PINNED_VERSION = '2.54.0.windows.1';
const FETCH_URL = 'https://github.com/SwiggitySwerve/MekStation.git';
// prettier-ignore
const HARDENED_PREFIX=['--no-replace-objects','-c','credential.helper=','-c','credential.interactive=never','-c','core.askPass=','-c','http.proxy=','-c','https.proxy=','-c',`url.${FETCH_URL}.insteadOf=camp01-disabled-rewrite:`] as const;
const harness = `
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const request=JSON.parse(fs.readFileSync(0,'utf8')), trust=await import(${JSON.stringify(moduleUrl)}), root=request.root, calls=[];
const expectedHead='a'.repeat(40), expectedMain='b'.repeat(40);
const fakeDependencies={
  resolveExecutable:()=>{if(request.resolverFailure)throw new Error('resolver failed');return request.executable;},
  statFile:()=>{if(request.statFailure)throw new Error('stat failed');return {isFile:()=>request.file!==false};},
  spawn:(executable,args,options)=>{
    calls.push({executable,args,options}); if(request.spawnThrows)throw new Error('spawn failed'); if(request.spawnFailure)return {status:9,stdout:'',stderr:'failed'};
    if(args.includes('--version'))return {status:0,stdout:'git version '+(request.version??'2.54.0.windows.1')+'\\n',stderr:''};
    if(args.includes('rev-parse')){const head=String(args.at(-1)).includes('fetched-head'), oid=request.readbackMalformed?'not-an-oid':head?(request.actualHeadOid??expectedHead):(request.actualMainOid??expectedMain);return {status:0,stdout:oid+'\\n',stderr:''};}
    return {status:0,stdout:'',stderr:''};
  },
};
async function resolvedHostGit(){ return trust.resolveVerifiedGit({cwd:root},{resolveExecutable:()=>request.executable,spawn:()=>({status:0,stdout:'git version 2.54.0.windows.1\\n',stderr:''})}); }
async function seedRemote(git){ const work=path.join(root,'source'), remote=path.join(root,'source.git'); fs.mkdirSync(work); await trust.invokeGit({git,args:['init','--initial-branch=main'],cwd:work}); fs.writeFileSync(path.join(work,'seed.txt'),'seed\\n'); await trust.invokeGit({git,args:['add','seed.txt'],cwd:work}); await trust.invokeGit({git,args:['-c','user.name=CAMP01','-c','user.email=camp01@example.invalid','commit','-m','seed'],cwd:work}); const oid=(await trust.invokeGit({git,args:['rev-parse','HEAD'],cwd:work})).stdout.trim(); await trust.createBareSession({git,directory:remote}); await trust.invokeGit({git,args:['push',remote,'HEAD:refs/heads/main'],cwd:work}); return {remote,oid}; }
try { let value;
  if(request.action==='resolve') value=await trust.resolveVerifiedGit({cwd:root},fakeDependencies);
  else if(request.action==='production-resolve') value=await trust.resolveVerifiedGit({cwd:root});
  else if(request.action==='invoke') value=await trust.invokeGit({git:{executable:request.executable},args:['status;whoami'],cwd:root},fakeDependencies);
  else if(request.action==='invoke-contract') value=await trust.invokeGit({git:request.git,args:request.args,cwd:request.cwd},fakeDependencies);
  else if(request.action==='existing') { const directory=path.join(root,'session.git'); fs.mkdirSync(directory); if(request.nonEmpty) fs.writeFileSync(path.join(directory,'sentinel'),'owned'); value=await trust.createBareSession({git:{executable:request.executable},directory},fakeDependencies); }
  else if(request.action==='fetch-contract') value=await trust.fetchAndVerifyOids({session:request.session??{directory:path.join(root,'session.git'),executable:request.executable},remoteUrl:request.remoteUrl,headOid:request.headOid??expectedHead,mainOid:request.mainOid??expectedMain},fakeDependencies);
  else if(request.action==='remote-policy') value=await trust.fetchAndVerifyOids({session:{directory:path.join(root,'session.git'),executable:request.executable},remoteUrl:path.join(root,'local.git'),headOid:'a'.repeat(40),mainOid:'b'.repeat(40)},fakeDependencies);
  else if(request.action==='remote-policy-override') value=await trust.fetchAndVerifyOids({session:{directory:path.join(root,'session.git'),executable:request.executable},remoteUrl:'https://evil.example/x.git',headOid:'a'.repeat(40),mainOid:'b'.repeat(40)},{...fakeDependencies,testOnlyAllowLocalRemote:true});
  else { const git=await resolvedHostGit(), source=await seedRemote(git), session=await trust.createBareSession({git,directory:path.join(root,'session.git')}), headOid=request.headMismatch?'a'.repeat(40):source.oid, mainOid=request.mainMismatch?'b'.repeat(40):source.oid, remoteUrl=request.fetchFailure?path.join(root,'missing.git'):source.remote; value=await trust.fetchAndVerifyOids({session,remoteUrl,headOid,mainOid},{testOnlyAllowLocalRemote:true}); }
  process.stdout.write(JSON.stringify({ok:true,value,calls}));
} catch(error) { process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error),name:error instanceof Error?error.name:null,calls})); process.exitCode=1; }`;

type Invocation = {
  executable: string;
  args: string[];
  options: {
    shell: boolean;
    cwd: string;
    env: Record<string, string>;
  };
};
type Result = {
  ok: boolean;
  value?: Record<string, string>;
  error?: string;
  name?: string;
  calls: Invocation[];
};

function invoke(request: Record<string, unknown>): Result {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    { input: JSON.stringify(request), encoding: 'utf8' },
  );
  if (!result.stdout) return { ok: false, error: result.stderr, calls: [] };
  const parsed: unknown = JSON.parse(result.stdout);
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'ok' in parsed &&
    typeof parsed.ok === 'boolean' &&
    'calls' in parsed &&
    Array.isArray(parsed.calls)
  )
    return parsed;
  throw new TypeError('invalid Git trust harness result');
}

function findHostGit(): string | null {
  const locator = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(locator, ['git'], {
    shell: false,
    encoding: 'utf8',
  });
  const candidate = (result.stdout ?? '').split(/\r?\n/).find(Boolean);
  return result.status === 0 && candidate ? path.resolve(candidate) : null;
}

let root: string;
const fakeGit = path.resolve(
  os.tmpdir(),
  `camp01-fake-git${process.platform === 'win32' ? '.exe' : ''}`,
);
const hostGit = findHostGit();
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof3c1-'));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('cross-platform CAMP-01 Git trust foundation', () => {
  it('resolves exactly one absolute executable at the pinned version', () => {
    // Given an injected absolute candidate and pinned version response
    // When the verified resolver runs
    const result = invoke({ action: 'resolve', root, executable: fakeGit });
    // Then it returns the narrow consumer contract
    expect(result).toMatchObject({
      ok: true,
      value: { executable: fakeGit },
    });
    expect(Object.keys(result.value ?? {})).toEqual(['executable']);
  });

  it('resolves a runner-image Git build named on the allowlist', () => {
    // windows-2025 runner images ship 2.55.0.windows.4. The allowlist
    // exists so a DELIBERATELY named newer build resolves while an
    // unknown one still fails closed (the drift row below).
    const result = invoke({
      action: 'resolve',
      root,
      executable: fakeGit,
      version: '2.55.0.windows.4',
    });
    expect(result).toMatchObject({ ok: true, value: { executable: fakeGit } });
  });

  it('builds every invocation from hardened argv and a zero-base environment', () => {
    // Given ambient process state and a shell-shaped literal argument
    // When the invocation helper calls injected spawn
    const result = invoke({ action: 'invoke', root, executable: fakeGit });
    // Then the literal is not parsed and no ambient proxy or credentials survive
    expect(result.calls[0]).toEqual({
      executable: fakeGit,
      args: [...HARDENED_PREFIX, 'status;whoami'],
      options: {
        shell: false,
        cwd: root,
        env: {
          GCM_GUI_PROMPT: '0',
          GCM_INTERACTIVE: 'Never',
          GIT_ASKPASS: '',
          GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
          GIT_CONFIG_NOSYSTEM: '1',
          GIT_CONFIG_SYSTEM: process.platform === 'win32' ? 'NUL' : '/dev/null',
          GIT_TERMINAL_PROMPT: '0',
          PATH: path.dirname(fakeGit),
          SSH_ASKPASS: '',
        },
      },
    });
  });

  it('binds the verified executable and literal fetch URL to API-returned OIDs', () => {
    // Given API OIDs, when injected Git fetches, then the literal hardened transport returns exact equality
    const result = invoke({
      action: 'fetch-contract',
      root,
      executable: fakeGit,
      remoteUrl: FETCH_URL,
    });
    expect(result.value).toMatchObject({
      fetchUrl: FETCH_URL,
      headOid: 'a'.repeat(40),
      mainOid: 'b'.repeat(40),
    });
    expect(
      result.calls.every(
        ({ executable, options }) =>
          executable === fakeGit &&
          options.shell === false &&
          options.env.PATH === path.dirname(fakeGit),
      ),
    ).toBe(true);
    expect(
      result.calls.map(({ args }) => args.slice(HARDENED_PREFIX.length)),
    ).toEqual([
      [
        'fetch',
        '--no-tags',
        '--no-recurse-submodules',
        FETCH_URL,
        '+HEAD:refs/camp01/fetched-head',
        '+refs/heads/main:refs/camp01/fetched-main',
      ],
      ['rev-parse', '--verify', 'refs/camp01/fetched-head^{commit}'],
      ['rev-parse', '--verify', 'refs/camp01/fetched-main^{commit}'],
    ]);
  });

  it.each([
    ['actualHeadOid', 'fetched head OID mismatch'],
    ['actualMainOid', 'fetched main OID mismatch'],
  ])('rejects API/Git OID inequality at %s', (field, message) => {
    // Given unequal API/Git OIDs, when equality is checked, then the typed mismatch guard rejects
    const result = invoke({
      action: 'fetch-contract',
      root,
      executable: fakeGit,
      remoteUrl: FETCH_URL,
      [field]: 'c'.repeat(40),
    });
    expect(result).toMatchObject({
      ok: false,
      name: 'Camp01GitError',
      error: 'CAMP01_GIT_INVALID: ' + message,
    });
  });

  it.each(['headOid', 'mainOid'])(
    'rejects malformed API OID input %s before Git runs',
    (field) => {
      // Given a malformed API OID, when pins are validated, then Git never runs
      const result = invoke({
        action: 'fetch-contract',
        root,
        executable: fakeGit,
        remoteUrl: FETCH_URL,
        [field]: 'ABC',
      });
      expect(result.error).toBe('CAMP01_GIT_INVALID: invalid pinned OIDs');
      expect(result.calls).toEqual([]);
    },
  );

  it.each([
    [{ executable: fakeGit, extra: true }, ['status'], path.resolve('.')],
    [{ executable: fakeGit }, ['status'], 'relative'],
    [{ executable: fakeGit }, ['status', 1], path.resolve('.')],
  ])('rejects malformed invoke contract %#', (git, args, cwd) => {
    // Given a malformed invoke contract, when invocation starts, then injected spawn never runs
    const result = invoke({
      action: 'invoke-contract',
      root,
      executable: fakeGit,
      git,
      args,
      cwd,
    });
    expect(result.calls).toEqual([]);
  });

  it('rejects malformed fetched OID readback', () => {
    // Given malformed readback, when it is parsed, then it cannot satisfy the API pin
    const result = invoke({
      action: 'fetch-contract',
      root,
      executable: fakeGit,
      remoteUrl: FETCH_URL,
      readbackMalformed: true,
    });
    expect(result.error).toBe(
      'CAMP01_GIT_INVALID: fetched OID readback failed',
    );
  });

  it.each([
    [
      { executable: 'git' },
      'CAMP01_GIT_INVALID: Git executable must be absolute',
    ],
    [
      { executable: fakeGit, version: '2.53.0' },
      `CAMP01_GIT_INVALID: Git version drift; got 2.53.0, expected one of ${PINNED_VERSION}, 2.55.0.windows.4`,
    ],
    [
      { executable: fakeGit, spawnFailure: true },
      'CAMP01_GIT_INVALID: Git version probe failed',
    ],
  ])(
    'rejects invalid resolution with an exact typed error',
    (input, message) => {
      // Given an invalid resolver boundary
      // When verified resolution runs
      const result = invoke({ action: 'resolve', root, ...input });
      // Then it fails with the stable typed contract
      expect(result).toMatchObject({
        ok: false,
        name: 'Camp01GitError',
        error: message,
      });
    },
  );

  it.each([false, true])(
    'rejects a pre-existing session directory (non-empty=%s)',
    (nonEmpty) => {
      // Given a caller-supplied directory that already exists
      // When bare-session creation is attempted
      const result = invoke({
        action: 'existing',
        root,
        executable: fakeGit,
        nonEmpty,
      });
      // Then ownership is rejected before Git runs
      expect(result.error).toBe(
        'CAMP01_GIT_INVALID: session directory already exists',
      );
      expect(result.calls).toEqual([]);
    },
  );

  it('rejects a local remote unless the test-only override is injected', () => {
    // Given a local path at the production URL boundary
    // When no test-only dependency is supplied
    const result = invoke({
      action: 'remote-policy',
      root,
      executable: fakeGit,
    });
    // Then the frozen production URL remains mandatory
    expect(result.error).toBe('CAMP01_GIT_INVALID: fetch URL drift');
  });

  it('rejects a non-local remote even when the test-only override is injected', () => {
    // Given an https URL that is not the frozen production URL
    // When the test-only local-remote override is supplied
    const result = invoke({
      action: 'remote-policy-override',
      root,
      executable: fakeGit,
    });
    // Then the override never widens beyond local-path remotes
    expect(result.error).toBe('CAMP01_GIT_INVALID: fetch URL drift');
  });

  it('rejects a resolved executable that is not a file', () => {
    // Given a resolver result whose stat reports a non-file
    const result = invoke({
      action: 'resolve',
      root,
      executable: fakeGit,
      file: false,
    });
    // Then resolution fails closed before any version probe
    expect(result.error).toBe(
      'CAMP01_GIT_INVALID: verified Git executable unavailable',
    );
  });

  (hostGit ? it : it.skip)(
    'creates a real empty bare session and verifies fetched head/main OIDs',
    () => {
      // Given a real local repository reached through the injected host Git
      // When the hardened local-only fetch verifies API-pinned identities
      const result = invoke({
        action: 'integration',
        root,
        executable: hostGit,
      });
      // Then the verified record binds the local test remote and both OIDs
      expect(result.ok).toBe(true);
      expect(result.value).toMatchObject({
        directory: path.join(root, 'session.git'),
        executable: hostGit,
        fetchUrl: path.join(root, 'source.git'),
      });
      expect(result.value?.headOid).toMatch(/^[0-9a-f]{40}$/);
      expect(result.value?.mainOid).toBe(result.value?.headOid);
    },
  );

  (hostGit ? it : it.skip).each([
    ['headMismatch', 'CAMP01_GIT_INVALID: fetched head OID mismatch'],
    ['mainMismatch', 'CAMP01_GIT_INVALID: fetched main OID mismatch'],
    ['fetchFailure', 'CAMP01_GIT_INVALID: fetch failed'],
  ])('rejects real local fetch case %s exactly', (flag, message) => {
    // Given a real local fetch with one invalid trust input
    // When the session verification runs
    const result = invoke({
      action: 'integration',
      root,
      executable: hostGit,
      [flag]: true,
    });
    // Then it fails closed with the case-specific typed message
    expect(result.error).toBe(message);
    expect(result.name).toBe('Camp01GitError');
  });
});

(process.platform === 'win32' ? describe : describe.skip)(
  'windows-only CAMP-01 pinned Git discovery',
  () => {
    it('resolves the real well-known Git installation at the schema pin', () => {
      // Given the production well-known-path resolver
      // When real Windows Git discovery runs
      const result = invoke({ action: 'production-resolve', root });
      // Then a pinned absolute executable is returned
      expect(result.ok).toBe(true);
      expect(path.win32.isAbsolute(result.value?.executable ?? '')).toBe(true);
    });
  },
);

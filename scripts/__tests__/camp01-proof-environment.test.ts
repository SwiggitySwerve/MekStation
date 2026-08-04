import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const environmentUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-proof-environment.mjs'),
).href;
const contractUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.contract.mjs'),
).href;
const schemasUrl = pathToFileURL(
  path.resolve('scripts/qc/camp01-authority-receipt.schemas.mjs'),
).href;
const BASE_NAMES = [
  'APPDATA',
  'ComSpec',
  'LOCALAPPDATA',
  'NPM_CONFIG_GLOBALCONFIG',
  'NPM_CONFIG_USERCONFIG',
  'PATH',
  'SystemRoot',
  'TEMP',
  'TMP',
  'USERPROFILE',
] as const;
const harness = `
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { WAVE_CONTRACTS } from ${JSON.stringify(contractUrl)};
import { canonicalBytes, digestBytes } from ${JSON.stringify(schemasUrl)};
const request=JSON.parse(fs.readFileSync(0,'utf8')), row=WAVE_CONTRACTS['camp-proof'], root=request.root;
if(request.deleteSystemRoot) delete process.env.SystemRoot;
Object.assign(process.env,request.ambient??{});
const environment=await import(${JSON.stringify(environmentUrl)});
fs.mkdirSync(root,{recursive:true}); fs.writeFileSync(path.join(root,'package-lock.json'),'lock-v1');
const runtimeRoot=path.join(path.dirname(root),'.camp01-runtime-'+path.basename(root)), calls=[];
if(request.precreateRuntime) { fs.mkdirSync(runtimeRoot,{recursive:true}); fs.writeFileSync(path.join(runtimeRoot,'sentinel'),'owned elsewhere'); }
if(request.precreateOwnedRuntime) { fs.mkdirSync(runtimeRoot,{recursive:true}); fs.writeFileSync(path.join(runtimeRoot,'sentinel'),'retry residue'); fs.writeFileSync(path.join(runtimeRoot,'.camp01-runtime-owner.json'),canonicalBytes({schema:'camp01-runtime-root/v1',targetDigest:digestBytes(root)})); }
const versions={node:'22.22.0',npm:'11.6.2',git:'2.54.0.windows.1',...request.versions};
const gitExecutable=request.gitExecutable??'C:\\\\Program Files\\\\Git\\\\mingw64\\\\bin\\\\git.exe';
const dependencies={
  ...(request.realWindowsTools?{}:{platform:'win32',...(request.defaultSystemRoot?{}:{resolveSystemRoot:()=>request.systemRoot??'C:\\\\Windows'}),statFile:()=>({isFile:()=>true})}),
  rowEnvironment:request.rowEnvironment??{}, runtimeRoot,
  resolveVerifiedGit:()=>request.gitExtra?{executable:gitExecutable,unexpected:true}:{executable:gitExecutable},
  versionReporter:request.realToolIdentity?({tool,executable,args,cwd,env})=>tool==='git'?versions.git:spawnSync(executable,args,{shell:false,cwd,env,encoding:'utf8'}).stdout:({tool})=>versions[tool],
  fileDigester:request.realToolIdentity?(file)=>file===gitExecutable?digestBytes('verified-git'):digestBytes(fs.readFileSync(file)):(file)=>digestBytes('file:'+file.toLowerCase()),
  spawn:(executable,args,options)=>{ calls.push({executable,args,options:{shell:options.shell,cwd:options.cwd,env:options.env}}); if(request.bootstrap==='omitted') return undefined; if(request.bootstrap==='failed') return {status:9,stdout:'no',stderr:'failed'}; if(args.includes('ci')) { if(request.bootstrap==='mutated') options.env.NODE_OPTIONS='--inspect'; if(request.bootstrap==='config-mutated') fs.writeFileSync(options.env.NPM_CONFIG_USERCONFIG,'prefix=elsewhere'); return {status:0,stdout:'installed',stderr:''}; } if(request.breakWriterCommandEnv) options.env.CAMP01_ATTACK='1'; const artifact=options.env.CAMP01_ARTIFACT_DIR; fs.writeFileSync(path.join(artifact,'wave-result.json'),canonicalBytes({schema:'camp01-wave-result/v1',wave:'camp-proof',runId:options.env.CAMP01_RUN_ID,status:'passed',assertions:Object.fromEntries([...row.assertions].sort().map((id)=>[id,true]))})); return {status:0,stdout:'',stderr:''};},
};
if(request.git==='invalid') dependencies.resolveVerifiedGit=()=>null;
const sha='b'.repeat(40), digest='sha256:'+'a'.repeat(64), tuple=(n)=>'tuple-'+n.repeat(16);
const writerContext={treeSha:sha,provenance:{subject:'product-pr',specTupleId:tuple('2'),ownedPrTupleId:tuple('3'),predecessorReceiptIds:[]},capProvenance:{subject:'product-pr',baseSha:sha,headSha:sha,fileCount:2,changedLineCount:20,binaryEntries:false,changedTreeManifestDigest:digest,reviewedHeadReceiptId:null,reviewedHeadReceiptManifestDigest:null},identityRegistry:{schema:'camp01-identity-registry/v1',entities:[],refs:[]},registryContext:{evidence:[],provenance:[{id:tuple('2'),sourceKind:'spec-tuple',wave:'camp-proof',subject:'product-pr'},{id:tuple('3'),sourceKind:'owned-pr-tuple',wave:'camp-proof',subject:'product-pr'}],refs:[],capturePolicies:[],repairSources:[]},reviewedHead:null};
try { let value;
  if(request.action==='import') value={loaded:true};
  else if(request.action==='expand') value=environment.expandLogicalCommand(request.argv,{nodeExecutable:request.toolDrift??process.execPath,npmCli:path.join(path.dirname(process.execPath),'node_modules','npm','bin','npm-cli.js')});
  else { const proofTarget={canonicalPath:root}, prepared=request.skipPrepare?undefined:await environment.prepareEnvironment({row,proofTarget},dependencies);
    if(request.action==='prepare') value={prepared,bootstrap:calls[0],ownedResidueRemoved:request.precreateOwnedRuntime?!fs.existsSync(path.join(runtimeRoot,'sentinel')):undefined};
    else { if(!request.omitWriterContext) dependencies.resolveWriterContext=()=>writerContext; dependencies.randomBytes=()=>Buffer.from('4'.repeat(32),'hex'); value={result:await environment.executeReceipt({row,arguments:{mode:'reviewed-head',wave:'camp-proof',sha,runRoot:row.runRootTemplate.replace('<sha>',sha)},provenance:{subject:'product-pr'},environment:prepared,proofTarget},dependencies),calls,files:fs.readdirSync(path.join(root,row.runRootTemplate.replace('<sha>',sha),'camp01-'+'4'.repeat(32))).sort()}; }
  }
  process.stdout.write(JSON.stringify({ok:true,value}));
} catch(error) { process.stdout.write(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error),runtimePreserved:request.precreateRuntime?fs.existsSync(path.join(runtimeRoot,'sentinel')):undefined})); process.exitCode=1; }
finally { fs.rmSync(runtimeRoot,{recursive:true,force:true}); }`;

type Result = {
  ok: boolean;
  value?: {
    prepared?: { executionEnvironmentDigest: string };
    bootstrap?: { options: { env: Record<string, string> } };
    ownedResidueRemoved?: boolean;
    result?: { runId: string; phase: string; finalizedPaths: string[] };
    loaded?: boolean;
    calls?: Array<{
      executable: string;
      args: string[];
      options: { shell: boolean; cwd: string; env: Record<string, string> };
    }>;
    files?: string[];
  };
  error?: string;
  runtimePreserved?: boolean;
};
function invoke(request: Record<string, unknown>): Result {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness],
    { input: JSON.stringify(request), encoding: 'utf8' },
  );
  return result.stdout
    ? (JSON.parse(result.stdout) as Result)
    : { ok: false, error: result.stderr };
}

let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'camp-proof3b-'));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('cross-platform CAMP-01 pinned proof environment logic', () => {
  it('imports without touching the Windows-only runtime guard', () => {
    expect(invoke({ action: 'import', root })).toMatchObject({
      ok: true,
      value: { loaded: true },
    });
  });

  it('pins a deterministic digest for identical inputs', () => {
    const first = invoke({ action: 'prepare', root });
    const second = invoke({ action: 'prepare', root });
    expect(first.ok).toBe(true);
    expect(first.value?.prepared).toEqual(second.value?.prepared);
    expect(first.value?.prepared?.executionEnvironmentDigest).toMatch(
      /^sha256:[0-9a-f]{64}$/,
    );
  });

  it('expands only the @node and @npm logical executable tokens', () => {
    expect(
      invoke({ action: 'expand', root, argv: ['@node', '--version'] }),
    ).toMatchObject({
      ok: true,
      value: [process.execPath, '--version'],
    });
    const npm = invoke({ action: 'expand', root, argv: ['@npm', 'test'] });
    expect(npm.value?.[0]).toBe(process.execPath);
    expect(npm.value?.[1]).toMatch(/npm-cli\.js$/);
    for (const argv of [['node', '--version'], ['@git', '--version'], []])
      expect(invoke({ action: 'expand', root, argv }).error).toBe(
        'CAMP01_ENVIRONMENT_INVALID: unsupported logical executable token',
      );
    expect(
      invoke({
        action: 'expand',
        root,
        argv: ['@node'],
        toolDrift: path.join(root, 'node.exe'),
      }).error,
    ).toBe('CAMP01_ENVIRONMENT_INVALID: verified tool path drift');
  });

  it('builds the bootstrap environment from zero', () => {
    const result = invoke({
      action: 'prepare',
      root,
      ambient: {
        NODE_OPTIONS: '--inspect',
        NODE_PATH: 'attacker-modules',
        npm_config_userconfig: 'attacker.npmrc',
        AWS_SECRET_ACCESS_KEY: 'secret',
        HTTPS_PROXY: 'http://attacker.invalid',
        CI: 'false',
        PLAYWRIGHT_BROWSERS_PATH: 'elsewhere',
      },
    });
    const env = result.value?.bootstrap?.options.env ?? {};
    expect(result.ok).toBe(true);
    expect(Object.keys(env).sort()).toEqual(BASE_NAMES);
  });

  it('rejects undeclared product environment input', () => {
    expect(
      invoke({
        action: 'prepare',
        root,
        rowEnvironment: { MEKSTATION_ATTACK: '1' },
      }).error,
    ).toBe(
      'CAMP01_ENVIRONMENT_INVALID: undeclared environment input MEKSTATION_ATTACK',
    );
  });

  it('rejects an injected non-Windows system root', () => {
    expect(
      invoke({ action: 'prepare', root, systemRoot: 'E:\\NotWindows' }).error,
    ).toBe('CAMP01_ENVIRONMENT_INVALID: system root drift');
  });

  it('flows an injected Windows system root into the built environment', () => {
    const env =
      invoke({ action: 'prepare', root, systemRoot: 'E:\\Windows' }).value
        ?.bootstrap?.options.env ?? {};
    expect(env.SystemRoot).toBe('E:\\Windows');
    expect(env.ComSpec).toBe('E:\\Windows\\System32\\cmd.exe');
    expect(env.PATH).toBe(
      `${path.dirname(process.execPath)};E:\\Windows\\System32`,
    );
  });

  it('rejects version drift through the injected reporter', () => {
    expect(
      invoke({ action: 'prepare', root, versions: { npm: '11.6.1' } }).error,
    ).toBe('CAMP01_ENVIRONMENT_INVALID: npm version drift; expected 11.6.2');
  });

  it('fails closed when the PROOF-3C verified Git seam returns an invalid contract', () => {
    expect(invoke({ action: 'prepare', root, git: 'invalid' }).error).toBe(
      'CAMP01_ENVIRONMENT_INVALID: verified Git seam invalid',
    );
  });

  it.each([{ gitExtra: true }, { gitExecutable: 'git.exe' }])(
    'rejects an invalid verified Git seam',
    (request) => {
      expect(invoke({ action: 'prepare', root, ...request }).error).toBe(
        'CAMP01_ENVIRONMENT_INVALID: verified Git seam invalid',
      );
    },
  );

  it('rejects an unavailable default system root', () => {
    expect(
      invoke({
        action: 'prepare',
        root,
        defaultSystemRoot: true,
        deleteSystemRoot: true,
      }).error,
    ).toBe('CAMP01_ENVIRONMENT_INVALID: system root unavailable');
  });

  it.each([
    ['omitted', 'CAMP01_ENVIRONMENT_INVALID: bootstrap omitted'],
    ['failed', 'CAMP01_ENVIRONMENT_INVALID: bootstrap failed with exit code 9'],
  ])('rejects %s bootstrap', (bootstrap, message) => {
    expect(invoke({ action: 'prepare', root, bootstrap }).error).toBe(message);
  });

  it('rejects bootstrap environment mutation as typed ambient drift', () => {
    expect(
      invoke({ action: 'prepare', root, bootstrap: 'mutated' }).error,
    ).toBe('CAMP01_ENVIRONMENT_INVALID: bootstrap environment drift');
  });

  it('rejects npm config mutation during bootstrap', () => {
    expect(
      invoke({ action: 'prepare', root, bootstrap: 'config-mutated' }).error,
    ).toBe('CAMP01_ENVIRONMENT_INVALID: npm config drift');
  });

  it('preserves a pre-existing runtime path that it does not own', () => {
    expect(
      invoke({ action: 'prepare', root, precreateRuntime: true }),
    ).toMatchObject({
      ok: false,
      error: 'CAMP01_ENVIRONMENT_INVALID: writer runtime root is not exclusive',
      runtimePreserved: true,
    });
  });

  it('reclaims only marker-verified writer residue before a retry', () => {
    expect(
      invoke({ action: 'prepare', root, precreateOwnedRuntime: true }),
    ).toMatchObject({
      ok: true,
      value: { ownedResidueRemoved: true },
    });
  });

  it('rejects execution without the verified writer context seam', () => {
    expect(
      invoke({ action: 'execute', root, omitWriterContext: true }).error,
    ).toBe('CAMP01_ENVIRONMENT_INVALID: verified writer context seam missing');
  });

  it('rejects writer command child environment drift', () => {
    expect(
      invoke({ action: 'execute', root, breakWriterCommandEnv: true }).error,
    ).toBe('CAMP01_ENVIRONMENT_INVALID: child environment drift');
  });

  it('rejects execution when bootstrap preparation was omitted', () => {
    expect(invoke({ action: 'execute', root, skipPrepare: true }).error).toBe(
      'CAMP01_ENVIRONMENT_INVALID: bootstrap omitted',
    );
  });
});

(process.platform === 'win32' ? describe : describe.skip)(
  'windows-only CAMP-01 proof environment integration',
  () => {
    it('probes and digests the real pinned Node npm and cmd tools', () => {
      const result = invoke({
        action: 'prepare',
        root,
        realWindowsTools: true,
        realToolIdentity: true,
      });
      if (process.versions.node === '22.22.0') {
        expect(result.ok).toBe(true);
        expect(result.value?.prepared?.executionEnvironmentDigest).toMatch(
          /^sha256:[0-9a-f]{64}$/,
        );
      } else {
        expect(result.ok).toBe(false);
        expect(result.error).toContain('version drift');
      }
    });

    it('drives the real writer with absolute shell-free commands', () => {
      const result = invoke({
        action: 'execute',
        root,
        realWindowsTools: true,
      });
      expect(result.value?.result).toEqual({
        runId: `camp01-${'4'.repeat(32)}`,
        phase: 'final',
        finalizedPaths: [
          'command-result.json',
          'receipt-manifest.json',
          'wave-result.json',
        ],
      });
      expect(result.value?.files).toEqual([
        'command-result.json',
        'receipt-manifest.json',
        'wave-result.json',
      ]);
      const command = result.value?.calls?.[1];
      expect(command).toMatchObject({
        executable: process.execPath,
        options: { shell: false, cwd: root },
      });
      expect(command?.options.env.CAMP01_RUN_ID).toBe(
        `camp01-${'4'.repeat(32)}`,
      );
    });
  },
);

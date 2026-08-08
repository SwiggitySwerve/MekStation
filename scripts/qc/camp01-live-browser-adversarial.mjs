// allow: SIZE_OK — PROOF-5D5 is one registry-owned live-probe module with three closed probes.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as http from 'node:http';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const allHosts = Object.freeze({ gateId: 'all-hosts', platforms: [] });
// Capability gates name the hosts on which each capability is actually provisioned.
// The live workflow installs the Chromium binary on its Linux leg only, so a browser
// skip there is a regression while the same skip on Windows is the declared host gap.
// No leg provisions a CAMP production context yet: C09-L1 is honestly declared as
// provisioned nowhere, and the day credentials are wired in, `hosts` gains that leg.
// prettier-ignore
const chromiumBinaryHosts = Object.freeze({ gateId: 'playwright-chromium-binary-installed', hosts: ['linux'] });
// prettier-ignore
const productionContextHosts = Object.freeze({ gateId: 'camp01-production-context-provisioned', hosts: [] });
// prettier-ignore
const playwrightPackageHosts = Object.freeze({ gateId: 'playwright-test-package-installed', hosts: 'all' });
const cleanPngSentinels = [
  'CAMP01_NON_FIXTURE_SENTINEL',
  'CAMP01_PRIVATE_SENTINEL',
];
// prettier-ignore
const sentinelRows = Object.freeze([
  { row: 'C04-L1', phase: 'pre', kind: 'dom' },
  { row: 'C04-L2', phase: 'pre', kind: 'storage' },
  { row: 'C04-L3', phase: 'pre', kind: 'database' },
  { row: 'C04-L4', phase: 'post', kind: 'dom' },
  { row: 'C04-L5', phase: 'post', kind: 'storage' },
  { row: 'C04-L6', phase: 'post', kind: 'database' },
]);

// prettier-ignore
export const PROOF5D5_LIVE_PROBE_REGISTRATIONS = Object.freeze([
  { probeId: 'proof5d5-real-browser-capture-sentinels', hostGate: allHosts, capabilityGate: chromiumBinaryHosts, run: realBrowserCaptureProbe },
  { probeId: 'proof5d5-production-controller-routing', hostGate: allHosts, capabilityGate: productionContextHosts, run: productionControllerRoutingProbe },
  { probeId: 'proof5d5-playwright-failure-traversal', hostGate: allHosts, capabilityGate: playwrightPackageHosts, run: playwrightFailureTraversalProbe },
]);

async function realBrowserCaptureProbe({ scratchRoot }) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch (error) {
    return browserUnavailable(error);
  }
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
  } catch (error) {
    if (isBrowserUnavailable(error)) return browserUnavailable(error);
    throw error;
  }

  const server = await startRenderedPageServer();
  try {
    const { createBrowserCaptureInstrumentation, openCaptureTransaction } =
      await import('./camp01-capture-transaction.mjs');
    const rows = [];
    for (const row of sentinelRows) {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        await page.goto(server.url);
        rows.push(
          await runSentinelRow({
            context: row,
            createBrowserCaptureInstrumentation,
            openCaptureTransaction,
            page,
            scratchRoot,
          }),
        );
      } finally {
        await context.close();
      }
    }
    return {
      evidence: {
        browserName: 'chromium',
        browserVersion: browser.version(),
        productionInstrumentation: 'createBrowserCaptureInstrumentation',
        productionTransaction: 'openCaptureTransaction',
        rows,
      },
    };
  } finally {
    await server.close();
    await browser.close();
  }
}

async function runSentinelRow(options) {
  const {
    context,
    createBrowserCaptureInstrumentation,
    openCaptureTransaction,
    page,
    scratchRoot,
  } = options;
  const artifactDirectory = path.join(scratchRoot, context.row.toLowerCase());
  const pngPath = path.join(artifactDirectory, 'desktop.png');
  const attestationPath = path.join(
    artifactDirectory,
    '.capture-attestations.json',
  );
  const sentinel = `camp01-non-fixture-${context.row.toLowerCase()}`;
  const instrumentation = createBrowserCaptureInstrumentation(page);
  const transaction = openCaptureTransaction(
    {
      wave: 'camp-01e',
      invocationId: 'camp-01e-picker-browser',
      commandSequenceIndex: 1,
      artifactPath: 'desktop.png',
      artifactDirectory,
    },
    { instrumentation },
  );
  let cleanPngBytes = null;
  let rejection = null;
  let stateRestoredBeforeScreenshot = null;
  try {
    if (context.phase === 'pre')
      await setPageSentinel(page, context.kind, sentinel, true);
    await transaction.prepare();
    await transaction.capture(async (target) => {
      await setPageSentinel(page, context.kind, sentinel, true);
      await setPageSentinel(page, context.kind, sentinel, false);
      const restored = await instrumentation.snapshot();
      stateRestoredBeforeScreenshot = restored.nonFixtureSentinels.length === 0;
      await page.screenshot({ path: target });
      const bytes = await fs.readFile(target);
      cleanPngBytes = [sentinel, ...cleanPngSentinels].every(
        (value) => !bytes.includes(Buffer.from(value)),
      );
    });
    await transaction.publish();
  } catch (error) {
    rejection = error instanceof Error ? error.message : String(error);
  }

  const expectedRejection =
    context.phase === 'pre'
      ? 'CAMP01_CAPTURE_INVALID: non-fixture state detected'
      : 'CAMP01_CAPTURE_INVALID: capture mutation counter changed';
  const pngExists = await pathExists(pngPath);
  const attestationExists = await pathExists(attestationPath);
  if (
    rejection !== expectedRejection ||
    pngExists ||
    attestationExists ||
    (context.phase === 'post' &&
      (cleanPngBytes !== true || stateRestoredBeforeScreenshot !== true))
  )
    throw new Error(`PROOF-5D5 ${context.row} capture oracle failed`);
  return {
    row: context.row,
    sentinelKind: context.kind,
    injectionPhase: context.phase === 'pre' ? 'pre-guard' : 'post-arm',
    rejection,
    pngExists,
    attestationExists,
    ...(context.phase === 'post'
      ? { cleanPngBytes, stateRestoredBeforeScreenshot }
      : {}),
  };
}

async function setPageSentinel(page, kind, sentinel, present) {
  await page.evaluate(
    async ({ kind: sentinelKind, present: shouldExist, sentinel: value }) => {
      if (sentinelKind === 'dom') {
        const existing = document.querySelector(
          `[data-camp01-non-fixture="${value}"]`,
        );
        if (!shouldExist) {
          existing?.remove();
          return;
        }
        const element = document.createElement('aside');
        element.setAttribute('data-camp01-non-fixture', value);
        element.style.cssText =
          'display:block;position:fixed;inset:16px auto auto 16px;padding:12px;background:#fff;color:#000;z-index:99999';
        element.textContent = `Rendered ${value}`;
        document.body.appendChild(element);
        return;
      }
      if (sentinelKind === 'storage') {
        if (shouldExist) localStorage.setItem(value, 'visible');
        else localStorage.removeItem(value);
        return;
      }
      if (!shouldExist) {
        await new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase(value);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          request.onblocked = () =>
            reject(new Error('database deletion blocked'));
        });
        return;
      }
      await new Promise((resolve, reject) => {
        const request = indexedDB.open(value, 1);
        request.onupgradeneeded = () => {
          request.result
            .createObjectStore('sentinels', { keyPath: 'id' })
            .put({ id: 'visible' });
        };
        request.onsuccess = () => {
          request.result.close();
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    },
    { kind, present, sentinel },
  );
}

// prettier-ignore
async function productionControllerRoutingProbe() {
  const { REPOSITORY_IDENTITY }=await import('./camp01-authority-receipt.contract.mjs'), remote=await runProcess('git',['config','--get','remote.origin.url']), observedRemote=remote.exitCode===0?remote.stdout.trim():'', expectedIdentity=canonicalRemoteIdentity(REPOSITORY_IDENTITY.fetchUrl), observedIdentity=canonicalRemoteIdentity(observedRemote), tokenName=process.env.GH_TOKEN?'GH_TOKEN':process.env.GITHUB_TOKEN?'GITHUB_TOKEN':null, parsedArguments=parseProductionArguments(process.env.CAMP01_LIVE_PRODUCTION_ARGS);
  const preconditions = [
    {name:'originRemote',satisfied:observedIdentity!==null&&observedIdentity===expectedIdentity,expected:REPOSITORY_IDENTITY.fetchUrl,expectedIdentity,actual:observedRemote||null,actualIdentity:observedIdentity},
    {name:'githubCredentialEnvironment',satisfied:tokenName!==null,credentialVariable:tokenName},
    {name:'productionControllerArguments',satisfied:parsedArguments.valid,variable:'CAMP01_LIVE_PRODUCTION_ARGS',detail:parsedArguments.detail},
  ];
  const failedPreconditions=preconditions.filter(({satisfied})=>!satisfied).map(({name})=>name);
  if (failedPreconditions.length)
    return {status:'skipped-with-reason',reason:{code:'PRODUCTION_CONTEXT_UNAVAILABLE',failedPreconditions},evidence:{preconditions}};
  const result=await runProcess(process.execPath,[path.join(repoRoot,'scripts','qc','run-camp01-production.mjs'),...parsedArguments.argv],{env:process.env}), evidence={preconditions,argv:parsedArguments.argv,exitCode:result.exitCode,signal:result.signal,stdout:result.stdout.trim(),stderr:result.stderr.trim()};
  return result.exitCode === 0 && result.signal === null
    ? { evidence }
    : {status:'failed',reason:{code:'PRODUCTION_ROUTING_FAILED'},evidence};
}

// prettier-ignore
async function playwrightFailureTraversalProbe({ scratchRoot }) {
  const [{ WAVE_CONTRACTS }, writer] = await Promise.all([
    import('./camp01-authority-receipt.contract.mjs'),
    import('./camp01-authority-receipt.mjs'),
  ]);
  const row=WAVE_CONTRACTS['camp-01h'], invocationId='05-layout-helpers', commandIndex=row.reporterContracts.findIndex((entry)=>entry.invocationId===invocationId);
  if(commandIndex<0)throw new Error('PROOF-5D5 reporter contract missing');
  const shaResult=await runProcess('git',['rev-parse','--verify','HEAD']), sha=shaResult.stdout.trim();
  if(shaResult.exitCode!==0||!/^[0-9a-f]{40}$/.test(sha))throw new Error('PROOF-5D5 repository HEAD unavailable');
  const runId=`camp01-${randomBytes(16).toString('hex')}`, identity=writer.issuedCommandIdentity(row,commandIndex,runId), rowRoot=path.join(repoRoot,'.sisyphus','evidence','playtest',`camp01h-journey-${sha}`), artifactDirectory=path.join(rowRoot,`.stage-${runId}`), normalizedRelative='reports/05-layout-helpers.json', normalizedPath=path.join(artifactDirectory,...normalizedRelative.split('/'));
  await fs.mkdir(artifactDirectory, { recursive: true });
  let evidence;
  try {
    const require=createRequire(import.meta.url), playwrightTestPath=require.resolve('@playwright/test'), baseConfigPath=path.join(repoRoot,'playwright.config.ts'), testDirectory=path.join(scratchRoot,'e2e'), specDirectory=path.join(testDirectory,'layout-sweep'), configPath=path.join(scratchRoot,'playwright.config.ts');
    await fs.mkdir(specDirectory, { recursive: true });
    await fs.writeFile(path.join(specDirectory,'layout-helpers.selftest.spec.ts'),deliberatelyFailingSpec(playwrightTestPath),{flag:'wx'});
    await fs.writeFile(configPath,failingPlaywrightConfig(baseConfigPath,testDirectory),{flag:'wx'});
    const result=await runProcess(process.execPath,[path.join(repoRoot,'scripts','playwright','run-playwright.mjs'),'test',`--config=${configPath}`,'--project=chromium','--workers=1'],{env:{...process.env,CAMP01_RUN_ID:runId,CAMP01_ARTIFACT_DIR:artifactDirectory,CAMP01_INVOCATION_ID:identity.invocationId,CAMP01_EXECUTION_ID:identity.executionId,CAMP01_H_IDENTITIES:JSON.stringify(writer.issueHIdentities(runId))}});
    if(!await pathExists(normalizedPath))throw new Error(`PROOF-5D5 normalized report missing: ${result.stderr.trim()||result.stdout.trim()||'no launcher output'}`);
    const report=JSON.parse(await fs.readFile(normalizedPath,'utf8')), failed=report.observations.filter(({status})=>status==='failed'), publishedFiles=await listFiles(artifactDirectory), runtimePath=path.join(artifactDirectory,`.runtime-${identity.executionId}`), runtimeExists=await pathExists(runtimePath), partialPublication=JSON.stringify(publishedFiles)!==JSON.stringify([normalizedRelative]);
    if(result.exitCode!==1||result.signal!==null||report.complete!==true||failed.length!==1||runtimeExists||partialPublication)throw new Error('PROOF-5D5 Playwright failure oracle failed');
    evidence = {
      launcher: 'scripts/playwright/run-playwright.mjs',
      launcherExitCode: result.exitCode,
      launcherSignal: result.signal,
      ordinaryExitNormalized: true,
      normalizedResult: {schema:report.schema,complete:report.complete,observation:failed[0]},
      runnerCleanupObserved: !runtimeExists,
      runtimeExists,
      publishedFiles,
      partialPublication,
      stderrTail: result.stderr.trim().slice(-2000),
    };
  } finally {
    await fs.rm(artifactDirectory, { recursive: true, force: true });
    try { await fs.rmdir(rowRoot); }
    catch(error) { if(!['ENOENT','ENOTEMPTY'].includes(error?.code))throw error; }
  }
  return {evidence:{...evidence,artifactDirectoryExists:await pathExists(artifactDirectory)}};
}

// prettier-ignore
function deliberatelyFailingSpec(playwrightTestPath) { return `import playwrightTest from ${JSON.stringify(playwrightTestPath)};
const { expect, test } = playwrightTest;
test.describe('Layout sweep helpers self-test',()=>{test.describe('expectClickable',()=>{test('fails a display:none target',()=>expect('actual').toBe('expected'));});});\n`; }

function failingPlaywrightConfig(baseConfigPath, testDirectory) {
  return `import baseConfig from ${JSON.stringify(baseConfigPath)};
export default {
  ...baseConfig,
  testDir: ${JSON.stringify(testDirectory)},
  webServer: undefined,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  projects: [{ name: 'chromium' }],
};
`;
}

// prettier-ignore
function browserUnavailable(error) { return {status:'skipped-with-reason',reason:{code:'BROWSER_UNAVAILABLE',detail:error instanceof Error?error.message:String(error)},evidence:{browserName:'chromium'}}; }
// prettier-ignore
function isBrowserUnavailable(error) {
  const message=error instanceof Error?error.message:String(error); return /executable.*(?:doesn'?t exist|not found)|browser.*not installed/i.test(message);
}

// Detecting whether this checkout IS the canonical repository is not the same guard as
// deciding where a fetch may point (`camp01-git-trust.assertRemoteUrl` owns that and stays
// literal). Here the same repository legitimately arrives in several spellings — actions/
// checkout writes `https://github.com/SwiggitySwerve/MekStation` with no `.git`, a local
// clone keeps the suffix, and an SSH clone writes `git@github.com:...` — so the comparison
// runs over host plus repository path. It narrows nothing else: a different host, owner, or
// repository name still produces a different identity and still fails the precondition.
// prettier-ignore
function canonicalRemoteIdentity(value) {
  const trimmed=typeof value==='string'?value.trim():''; if(!trimmed)return null;
  const scp=/^(?:[^@\s/]+@)?([^\s/:]+):(?!\/)(.+)$/.exec(trimmed); let host, location;
  if(scp)[,host,location]=scp;
  else { try { const url=new URL(trimmed); if(!['git:','http:','https:','ssh:'].includes(url.protocol))return null; host=url.host; location=url.pathname; } catch { return null; } }
  const segments=location.replace(/\.git$/i,'').split('/').filter(Boolean);
  return segments.length?`${host.toLowerCase()}/${segments.join('/')}`:null;
}

// prettier-ignore
function parseProductionArguments(value) {
  if(!value)return {valid:false,argv:[],detail:'environment variable missing'};
  try {
    const parsed=JSON.parse(value), valid=Array.isArray(parsed)&&parsed.length>0&&parsed.every((entry)=>typeof entry==='string'&&entry.length>0); return {valid,argv:valid?parsed:[],detail:valid?'provided':'expected a non-empty JSON string array'};
  } catch { return {valid:false,argv:[],detail:'invalid JSON'}; }
}

// prettier-ignore
function startRenderedPageServer() {
  const server = http.createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><html><body><main id="app">CAMP-01 live browser probe</main></body></html>');
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address=server.address(); if(!address||typeof address==='string'){server.close();reject(new Error('PROOF-5D5 browser server address unavailable'));return;}
      resolve({url:`http://127.0.0.1:${address.port}/`,close:()=>new Promise((done)=>server.close(done))});
    });
  });
}

// prettier-ignore
function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child=spawn(command,args,{cwd:repoRoot,env:options.env??process.env,shell:false,stdio:['ignore','pipe','pipe']}); let stdout='', stderr='';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data',(chunk)=>{stdout+=chunk;}); child.stderr.on('data',(chunk)=>{stderr+=chunk;});
    child.once('error', reject);
    child.once('close',(exitCode,signal)=>resolve({exitCode:exitCode??1,signal,stdout,stderr}));
  });
}

// prettier-ignore
async function listFiles(root, current = root) {
  const files=[];
  for (const entry of await fs.readdir(current, { withFileTypes: true })) {
    const target=path.join(current,entry.name); if(entry.isDirectory())files.push(...await listFiles(root,target));
    else files.push(path.relative(root, target).split(path.sep).join('/'));
  }
  return files.sort();
}

// prettier-ignore
async function pathExists(target) {
  try { await fs.stat(target); return true; }
  catch(error) { if(error?.code==='ENOENT')return false; throw error; }
}

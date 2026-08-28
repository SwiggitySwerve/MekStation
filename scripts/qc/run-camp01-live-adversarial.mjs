import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  Camp01FactsError,
  createAnchorAuthority,
} from './camp01-anchor-authority.mjs';
import { resolveFetchedMainOid } from './camp01-durable-facts.mjs';
import {
  Camp01GitError,
  invokeGit,
  resolveVerifiedGit,
} from './camp01-git-trust.mjs';
import { fetchGitHubResource } from './camp01-github-provenance.mjs';
import { PROOF5D5_LIVE_PROBE_REGISTRATIONS } from './camp01-live-browser-adversarial.mjs';
import { PROOF5D6_LIVE_PROBE_REGISTRATIONS } from './camp01-live-os-adversarial.mjs';
import { invokeGh as runGh } from './report-camp01-live-status.mjs';

const schemaVersion = 'camp01-live-adversarial/v2';
const allHosts = Object.freeze({ gateId: 'all-hosts', platforms: [] });
// The shell's own probes exercise nothing a host can withhold, so every host is provisioned.
// prettier-ignore
const intrinsicCapability = Object.freeze({ gateId: 'live-shell-intrinsic', hosts: 'all' });

export class Camp01LiveAdversarialError extends Error {
  constructor(code, message, options = {}) {
    super(`CAMP01_LIVE_ADVERSARIAL_${code}: ${message}`, options);
    this.name = 'Camp01LiveAdversarialError';
    this.code = code;
  }
}

export async function publishJsonAtomic(artifactPath, value) {
  const directory = path.dirname(artifactPath);
  const token = `${process.pid}-${randomUUID()}`;
  // prettier-ignore
  const temporaryPath = path.join(directory, `.${path.basename(artifactPath)}.${token}.tmp`);
  const lockPath = `${artifactPath}.publication.lock`;
  await fs.mkdir(directory, { recursive: true });
  let lock;
  try {
    lock = await fs.open(lockPath, 'wx');
  } catch (error) {
    // prettier-ignore
    throw new Camp01LiveAdversarialError('PUBLICATION_BUSY', 'artifact publication is already active', { cause: error });
  }
  try {
    try {
      await fs.stat(artifactPath);
      // prettier-ignore
      throw new Camp01LiveAdversarialError('ARTIFACT_EXISTS', 'refusing to replace an existing artifact');
    } catch (error) {
      if (error instanceof Camp01LiveAdversarialError) throw error;
      if (error?.code !== 'ENOENT') throw error;
    }
    // prettier-ignore
    await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
    await fs.rename(temporaryPath, artifactPath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
    await lock.close();
    await fs.rm(lockPath, { force: true });
  }
}

async function selfCheckProbe({ scratchRoot }) {
  // prettier-ignore
  return { evidence: { registryEntries: LIVE_PROBE_REGISTRY.length, scratchRootCreated: (await fs.stat(scratchRoot)).isDirectory() } };
}

async function artifactAtomicityProbe({ scratchRoot }) {
  const artifactPath = path.join(scratchRoot, 'atomicity.json');
  const expectedBytes = `${JSON.stringify({ sentinel: 'first' }, null, 2)}\n`;
  await publishJsonAtomic(artifactPath, { sentinel: 'first' });
  let rejectedWith;
  try {
    await publishJsonAtomic(artifactPath, { sentinel: 'replacement' });
  } catch (error) {
    if (!(error instanceof Camp01LiveAdversarialError)) throw error;
    rejectedWith = error.code;
  }
  // prettier-ignore
  if (rejectedWith !== 'ARTIFACT_EXISTS') throw new Camp01LiveAdversarialError('SELF_CHECK_FAILED', 'exclusive publication guard did not reject replacement');
  // prettier-ignore
  return { evidence: { existingBytesPreserved: (await fs.readFile(artifactPath, 'utf8')) === expectedBytes, replacementRejectedWith: rejectedWith } };
}

async function envelopeAnchorProbe({ scratchRoot }) {
  const initiatingRoot = path.resolve(process.cwd());
  let git;
  try {
    git = await resolveVerifiedGit({ cwd: initiatingRoot });
  } catch (error) {
    // The resolver fails with a stage-naming message - executable
    // missing, version probe failed, version drift. Discarding it here
    // once cost two CI rounds of guessing which stage broke on a runner
    // nobody can shell into; the skip now carries the stage verbatim.
    return {
      status: 'skipped-with-reason',
      reason: {
        code: 'VERIFIED_GIT_UNAVAILABLE',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
  // prettier-ignore
  const gitOutput=async(args)=>(await invokeGit({git,args,cwd:initiatingRoot})).stdout.trim(), initiatingHeadSha=await gitOutput(['rev-parse','--verify','HEAD^{commit}']), initiatingTreeSha=await gitOutput(['rev-parse','--verify','HEAD^{tree}']), fetchedMainOid=await resolveFetchedMainOid({wave:'live-probe',sha:initiatingHeadSha,mode:'exact-main'},git,{sessionDirectory:path.join(scratchRoot,'fetched-main.git')}), fetchCheckRuns=(sha)=>fetchGitHubResource({resource:'check-runs',parameters:{sha}}), anchor=createAnchorAuthority({git,cwd:initiatingRoot},{fetchCheckRuns});
  let anchorSha = initiatingHeadSha,
    anchorTreeSha = initiatingTreeSha,
    anchorSource = 'initiating-head';
  // prettier-ignore
  const candidate=()=>({command:{sha:anchorSha,treeSha:anchorTreeSha,mode:'exact-main',capProvenance:null}});
  try {
    await anchor(candidate(), { fetchedMainOid });
  } catch (error) {
    // prettier-ignore
    if (!(error instanceof Camp01FactsError)||error.message!=='CAMP01_FACTS_INVALID: anchor main reachability drift') throw error;
    // Dev heads may be ahead of main; prefer fetched main, then its local merge-base.
    try {
      anchorSha = fetchedMainOid;
      anchorTreeSha = await gitOutput([
        'rev-parse',
        '--verify',
        `${anchorSha}^{tree}`,
      ]);
      anchorSource = 'fetched-main';
    } catch (fallbackError) {
      if (!(fallbackError instanceof Camp01GitError)) throw fallbackError;
      anchorSha = await gitOutput([
        'merge-base',
        initiatingHeadSha,
        fetchedMainOid,
      ]);
      anchorTreeSha = await gitOutput([
        'rev-parse',
        '--verify',
        `${anchorSha}^{tree}`,
      ]);
      anchorSource = 'merge-base';
    }
    await anchor(candidate(), { fetchedMainOid });
  }
  const priorShas = (
    await gitOutput(['rev-list', '--first-parent', '--max-count=10', 'HEAD~1'])
  ).split(/\r?\n/);
  for (let index = 0; index < priorShas.length; index += 1) {
    // prettier-ignore
    const sha=priorShas[index], response=runGh(['api',`repos/SwiggitySwerve/MekStation/commits/${sha}/check-runs`,'--header','Accept: application/vnd.github+json','--header','X-GitHub-Api-Version: 2022-11-28']),
      diagnostic = `${response?.error?.code ?? ''} ${response?.error?.name ?? ''} ${response?.stderr ?? ''}`;
    if (response?.status !== 0) {
      // prettier-ignore
      if (/(ENOTFOUND|ETIMEDOUT|ABORT|timed out|error connecting to api\.github\.com|network is unreachable|could not resolve host)/i.test(diagnostic)) return {status:'skipped-with-reason',reason:{code:'GITHUB_API_UNAVAILABLE'}};
      // prettier-ignore
      return {status:'failed',reason:{code:'GITHUB_CHECK_RUNS_HTTP_FAILED'},evidence:{anchorSha,fetchedMainOid,attemptedSha:sha}};
    }
    let checkRuns;
    try {
      checkRuns = JSON.parse(response.stdout || '');
    } catch {
      // prettier-ignore
      return {status:'failed',reason:{code:'GITHUB_CHECK_RUNS_RESPONSE_INVALID'},evidence:{anchorSha,fetchedMainOid,attemptedSha:sha}};
    }
    // prettier-ignore
    if (!Array.isArray(checkRuns?.check_runs)) return {status:'failed',reason:{code:'GITHUB_CHECK_RUNS_RESPONSE_INVALID'},evidence:{anchorSha,fetchedMainOid,attemptedSha:sha}};
    // prettier-ignore
    const successfulRunCount=checkRuns.check_runs.filter((entry)=>entry?.status==='completed'&&entry?.conclusion==='success'&&entry?.head_sha===sha).length;
    // prettier-ignore
    if (successfulRunCount>0) return {evidence:{initiatingHeadSha,fetchedMainOid,anchorSha,anchorSource,checkRunSha:sha,checkRunCount:checkRuns.check_runs.length,successfulRunCount,walkedCommitCount:index+1}};
  }
  // prettier-ignore
  return {status:'failed',reason:{code:'GITHUB_SUCCESSFUL_CHECK_RUN_NOT_FOUND'},evidence:{initiatingHeadSha,fetchedMainOid,anchorSha,anchorSource,walkedCommitCount:priorShas.length}};
}

// prettier-ignore
export const LIVE_PROBE_REGISTRY = Object.freeze([
  { probeId: 'proof5d4-live-shell-self-check', hostGate: allHosts, capabilityGate: intrinsicCapability, run: selfCheckProbe },
  { probeId: 'proof5d4-artifact-atomicity', hostGate: allHosts, capabilityGate: intrinsicCapability, run: artifactAtomicityProbe },
  { probeId: 'proof6a2-envelope-anchor-production', hostGate: allHosts, capabilityGate: { gateId: 'verified-git-windows', hosts: ['win32'] }, run: envelopeAnchorProbe },
  ...PROOF5D5_LIVE_PROBE_REGISTRATIONS,
  ...PROOF5D6_LIVE_PROBE_REGISTRATIONS,
]);

// A host gate says where a probe is ELIGIBLE to run; a capability gate says where the
// capability it exercises is actually provisioned (`hosts: 'all'`, or the exact host list).
// Skipping on a provisioned host is a capability loss wearing a legitimate host difference
// as a disguise, so it is recorded as an unexpected skip. Only a well-formed host array can
// mark a host unprovisioned: an absent or malformed declaration fails closed to provisioned,
// because a probe that never declared where its capability lives cannot certify its silence.
// prettier-ignore
function resolveCapabilityGate(probe, platform) {
  const declared=probe.capabilityGate, hosts=declared?.hosts;
  return Object.freeze({ gateId: declared?.gateId ?? 'capability-undeclared', platform, provisioned: !Array.isArray(hosts) || hosts.includes(platform) });
}

async function runProbe(probe, { clock, platform, runScratchRoot }) {
  const startedAt = clock();
  // prettier-ignore
  const hostGate = Object.freeze({ gateId: probe.hostGate.gateId, platform, eligible: probe.hostGate.platforms.length === 0 || probe.hostGate.platforms.includes(platform) });
  const scratchRoot = await fs.mkdtemp(
    path.join(runScratchRoot, `${probe.probeId}-`),
  );
  let status = 'passed';
  let reason;
  let evidence = {};
  try {
    if (!hostGate.eligible) {
      status = 'skipped-with-reason';
      reason = { code: 'HOST_GATE_NOT_SATISFIED', gateId: hostGate.gateId };
    } else if (!probe.run) {
      status = 'skipped-with-reason';
      reason = { code: 'OWNED_BY_LATER_SUB_SEAM', owner: probe.deferredTo };
    } else {
      const outcome = await probe.run({ scratchRoot });
      if (outcome.status) {
        if (
          !['passed', 'failed', 'skipped-with-reason'].includes(outcome.status)
        )
          throw new Camp01LiveAdversarialError(
            'PROBE_RESULT_INVALID',
            'probe returned an invalid status',
          );
        if ((outcome.status === 'passed') === Boolean(outcome.reason))
          throw new Camp01LiveAdversarialError(
            'PROBE_RESULT_INVALID',
            'probe reason did not match its status',
          );
        status = outcome.status;
        reason = outcome.reason;
      }
      evidence = outcome.evidence ?? {};
    }
  } catch (error) {
    status = 'failed';
    // prettier-ignore
    reason = { code: 'PROBE_FAILED', message: error instanceof Error ? error.message : String(error) };
  }
  try {
    await fs.rm(scratchRoot, { recursive: true, force: true });
    evidence = { ...evidence, scratchRootRemoved: true };
  } catch (error) {
    status = 'failed';
    // prettier-ignore
    reason = { code: 'SCRATCH_CLEANUP_FAILED', message: error instanceof Error ? error.message : String(error) };
    evidence = { ...evidence, scratchRootRemoved: false };
  }
  const capabilityGate = resolveCapabilityGate(probe, platform);
  // prettier-ignore
  const skipDisposition = status === 'skipped-with-reason' ? (capabilityGate.provisioned ? 'unexpected' : 'expected') : undefined;
  // prettier-ignore
  return Object.freeze({ probeId: probe.probeId, status, ...(reason ? { reason } : {}), ...(skipDisposition ? { skipDisposition } : {}), hostGate, capabilityGate, startedAt, finishedAt: clock(), evidence });
}

// prettier-ignore
export async function runCamp01LiveAdversarial({ artifactPath, clock = () => new Date().toISOString(), platform = process.platform, strictSkips = false } = {}) {
  // prettier-ignore
  const resolvedArtifactPath = path.resolve(artifactPath ?? 'artifacts/camp01-live-adversarial/camp01-live-adversarial.json');
  const startedAt = clock();
  const runScratchRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'camp01-live-adversarial-'));
  const probes = [];
  try {
    for (const probe of LIVE_PROBE_REGISTRY)
      probes.push(await runProbe(probe, { clock, platform, runScratchRoot }));
  } finally {
    await fs.rm(runScratchRoot, { recursive: true, force: true });
  }
  const failed = probes.filter(({ status }) => status === 'failed').length;
  // prettier-ignore
  const skipped = probes.filter(({ status }) => status === 'skipped-with-reason'), unexpectedSkips = Object.freeze(skipped.filter(({ skipDisposition }) => skipDisposition === 'unexpected').map(({ probeId }) => probeId));
  // The default stays an evidence publisher: only failures redden it. --strict-skips is the
  // opt-in that lets a caller treat a lost capability as the build failure it really is.
  // prettier-ignore
  const summary = Object.freeze({ passed: probes.filter(({ status }) => status === 'passed').length, failed, skippedWithReason: skipped.length, skippedAsExpected: skipped.length - unexpectedSkips.length, skippedUnexpectedly: unexpectedSkips.length, unexpectedSkips, strictSkips, exitCode: failed === 0 && (!strictSkips || unexpectedSkips.length === 0) ? 0 : 1 });
  // prettier-ignore
  const artifact = Object.freeze({ schemaVersion, startedAt, finishedAt: clock(), host: { platform, arch: process.arch, nodeVersion: process.version }, probes, summary });
  await publishJsonAtomic(resolvedArtifactPath, artifact);
  return Object.freeze({ artifactPath: resolvedArtifactPath, artifact, exitCode: summary.exitCode });
}

// prettier-ignore
function parseCliOptions(argv) {
  const options={artifactPath:undefined,strictSkips:false};
  for (let index = 0; index < argv.length; index += 1) {
    if(argv[index]==='--strict-skips'&&!options.strictSkips){options.strictSkips=true;continue;}
    if(argv[index]==='--artifact'&&options.artifactPath===undefined&&argv[index+1]&&!argv[index+1].startsWith('--')){options.artifactPath=argv[index+1];index+=1;continue;}
    throw new Camp01LiveAdversarialError('INVALID_ARGUMENT','expected [--artifact <path>] [--strict-skips]');
  }
  return options;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  runCamp01LiveAdversarial(parseCliOptions(process.argv.slice(2)))
    .then(({ artifactPath, artifact, exitCode }) => {
      process.stdout.write(
        `${JSON.stringify({ artifactPath, summary: artifact.summary })}\n`,
      );
      process.exitCode = exitCode;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}

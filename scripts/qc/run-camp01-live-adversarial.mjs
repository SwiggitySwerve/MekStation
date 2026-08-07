import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PROOF5D5_LIVE_PROBE_REGISTRATIONS } from './camp01-live-browser-adversarial.mjs';
import { PROOF5D6_LIVE_PROBE_REGISTRATIONS } from './camp01-live-os-adversarial.mjs';

const schemaVersion = 'camp01-live-adversarial/v1';
const allHosts = Object.freeze({ gateId: 'all-hosts', platforms: [] });

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

// prettier-ignore
export const LIVE_PROBE_REGISTRY = Object.freeze([
  { probeId: 'proof5d4-live-shell-self-check', hostGate: allHosts, run: selfCheckProbe },
  { probeId: 'proof5d4-artifact-atomicity', hostGate: allHosts, run: artifactAtomicityProbe },
  ...PROOF5D5_LIVE_PROBE_REGISTRATIONS,
  ...PROOF5D6_LIVE_PROBE_REGISTRATIONS,
]);

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
  // prettier-ignore
  return Object.freeze({ probeId: probe.probeId, status, ...(reason ? { reason } : {}), hostGate, startedAt, finishedAt: clock(), evidence });
}

// prettier-ignore
export async function runCamp01LiveAdversarial({ artifactPath, clock = () => new Date().toISOString(), platform = process.platform } = {}) {
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
  const summary = Object.freeze({ passed: probes.filter(({ status }) => status === 'passed').length, failed, skippedWithReason: probes.filter(({ status }) => status === 'skipped-with-reason').length, exitCode: failed === 0 ? 0 : 1 });
  // prettier-ignore
  const artifact = Object.freeze({ schemaVersion, startedAt, finishedAt: clock(), host: { platform, arch: process.arch, nodeVersion: process.version }, probes, summary });
  await publishJsonAtomic(resolvedArtifactPath, artifact);
  return Object.freeze({ artifactPath: resolvedArtifactPath, artifact, exitCode: summary.exitCode });
}

function parseArtifactPath(argv) {
  if (argv.length === 0) return undefined;
  if (argv.length === 2 && argv[0] === '--artifact' && argv[1]) return argv[1];
  throw new Camp01LiveAdversarialError(
    'INVALID_ARGUMENT',
    'expected --artifact <path>',
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  runCamp01LiveAdversarial({
    artifactPath: parseArtifactPath(process.argv.slice(2)),
  })
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

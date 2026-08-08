import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// The CAMP-01 live adversarial tier runs on pushes to main and on dispatch only.
// It has no `pull_request` trigger and is not a required status context, so
// nothing in this file can block a merge.
//
// Each matrix leg already reports its own probes, but no leg can see the other
// and a leg that dies before uploading reports nothing at all. This module is
// the only thing that reads BOTH legs together, which makes it the only place
// three otherwise-invisible reds can surface: a leg that never published, a leg
// whose artifact is unreadable, and a leg that exited zero while silently
// losing a capability the workflow provisions. It turns those into one verdict,
// annotations that name the leg and the probe, a job summary, and a non-zero
// exit so the workflow run itself carries the red on the Actions tab.
export class Camp01LiveSignalError extends Error {
  constructor(code, message) {
    super(`CAMP01_LIVE_SIGNAL_${code}: ${message}`);
    this.name = 'Camp01LiveSignalError';
    this.code = code;
  }
}

// prettier-ignore
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

// `degraded` annotates as a warning because the leg still exited zero and this
// tier is an evidence publisher; `failed` and `missing` annotate as errors. All
// three are alarming — the level is how loudly they read, not whether they count.
// prettier-ignore
const ANNOTATION_LEVEL = Object.freeze({ failed: 'error', missing: 'error', degraded: 'warning' });

// A leg is alarming in three distinguishable ways, and the distinction matters
// to whoever opens the run: `failed` names probes that broke, `degraded` names
// probes that silently lost a provisioned capability while the leg still exited
// zero, and `missing` means the leg never published assessable evidence at all.
export function assessLiveTierLeg(leg, artifact, unreadableReason) {
  const summary = artifact?.summary;
  // A missing leg reports no counts, so it carries no summary for a reader to
  // misread as real. Every other state is alarming exactly when it is not green.
  // prettier-ignore
  const record = (state, probes, detail) => Object.freeze({ leg, state, alarming: state !== 'green', probes: Object.freeze([...probes]), detail, summary: state === 'missing' ? null : summary });
  if (unreadableReason) return record('missing', [], unreadableReason);
  // prettier-ignore
  if (!summary || !isFiniteNumber(summary.failed) || !isFiniteNumber(summary.skippedUnexpectedly) || !isFiniteNumber(summary.exitCode))
    return record('missing', [], 'artifact summary is absent or malformed');
  // prettier-ignore
  if (summary.failed > 0)
    return record('failed', (artifact.probes ?? []).filter(({ status }) => status === 'failed').map(({ probeId }) => probeId), `${summary.failed} probe(s) failed`);
  // prettier-ignore
  if (summary.skippedUnexpectedly > 0)
    return record('degraded', summary.unexpectedSkips ?? [], `${summary.skippedUnexpectedly} provisioned-capability probe(s) skipped`);
  // prettier-ignore
  if (summary.exitCode !== 0)
    return record('failed', [], `runner reported exit code ${summary.exitCode}`);
  // prettier-ignore
  return record('green', [], `${summary.passed} passed, ${summary.skippedAsExpected} skipped as expected`);
}

// The expected leg list is supplied by the caller rather than discovered from
// whatever happens to be on disk. A leg that vanished must read as missing, and
// only an explicit expectation can tell "absent" from "never expected".
async function findLegArtifact(artifactsRoot, leg) {
  const target = `${leg}.json`;
  const pending = [artifactsRoot];
  while (pending.length > 0) {
    const directory = pending.pop();
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(candidate);
      else if (entry.name === target) return candidate;
    }
  }
  return null;
}

export async function collectLiveTierLegs({ artifactsRoot, expectedLegs }) {
  // prettier-ignore
  if (!Array.isArray(expectedLegs) || expectedLegs.length === 0)
    throw new Camp01LiveSignalError('INVALID_ARGUMENT', 'at least one expected leg is required');
  const legs = [];
  for (const leg of [...expectedLegs].sort()) {
    const artifactPath = await findLegArtifact(artifactsRoot, leg);
    if (!artifactPath) {
      legs.push(assessLiveTierLeg(leg, null, 'no artifact was published'));
      continue;
    }
    try {
      legs.push(
        assessLiveTierLeg(
          leg,
          JSON.parse(await fs.readFile(artifactPath, 'utf8')),
        ),
      );
    } catch (error) {
      // prettier-ignore
      legs.push(assessLiveTierLeg(leg, null, `artifact unreadable: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
  return Object.freeze(legs);
}

// prettier-ignore
const legTable = (legs) => [
  '| Leg | State | Probes |',
  '| --- | --- | --- |',
  ...legs.map(({ leg, state, probes, detail }) => `| \`${leg}\` | **${state}** | ${probes.length > 0 ? probes.map((probe) => `\`${probe}\``).join(', ') : detail} |`),
].join('\n');

export function buildLiveTierSignal(legs) {
  const alarming = legs.some((leg) => leg.alarming);
  // prettier-ignore
  const annotations = alarming
    ? legs.filter((leg) => leg.alarming).map(({ leg, state, probes, detail }) => `::${ANNOTATION_LEVEL[state]} title=CAMP-01 live tier (${leg})::${state} — ${probes.length > 0 ? probes.join(', ') : detail}`)
    : [`::notice title=CAMP-01 live tier::every leg green — ${legs.map(({ leg }) => leg).join(', ')}`];
  // prettier-ignore
  const summaryMarkdown = [
    '### CAMP-01 live adversarial tier',
    '',
    `Status: **${alarming ? 'NOT CLEAN' : 'green'}**`,
    '',
    legTable(legs),
    '',
    alarming
      ? 'This tier gates nothing — the red on this run is the whole point, so the failure stays visible on the Actions tab instead of depending on someone opening it. Reproduce locally with `npm run qc:camp01-live-status`.'
      : 'Check the tier any time with `npm run qc:camp01-live-status`.',
  ].join('\n');
  // prettier-ignore
  return Object.freeze({ alarming, legs, annotations: Object.freeze(annotations), summaryMarkdown });
}

// prettier-ignore
export async function runCamp01LiveSignal(
  { artifactsRoot, expectedLegs } = {},
  { write = (text) => process.stdout.write(text), summaryPath = process.env.GITHUB_STEP_SUMMARY } = {},
) {
  const legs = await collectLiveTierLegs({ artifactsRoot, expectedLegs });
  const signal = buildLiveTierSignal(legs);
  for (const annotation of signal.annotations) write(`${annotation}\n`);
  if (summaryPath) await fs.appendFile(summaryPath, `${signal.summaryMarkdown}\n\n`);
  write(`${JSON.stringify({ alarming: signal.alarming, legs: legs.map(({ leg, state, probes }) => ({ leg, state, probes })) })}\n`);
  return Object.freeze({ signal, exitCode: signal.alarming ? 1 : 0 });
}

function parseCliOptions(argv) {
  const usage = 'expected --artifacts <dir> --expect <leg,leg>';
  const options = { artifactsRoot: undefined, expectedLegs: undefined };
  for (let index = 0; index < argv.length; index += 2) {
    const value = argv[index + 1];
    // prettier-ignore
    if (!value || value.startsWith('--')) throw new Camp01LiveSignalError('INVALID_ARGUMENT', usage);
    if (argv[index] === '--artifacts') options.artifactsRoot = value;
    // prettier-ignore
    else if (argv[index] === '--expect')
      options.expectedLegs = value.split(',').filter(Boolean);
    else throw new Camp01LiveSignalError('INVALID_ARGUMENT', usage);
  }
  // prettier-ignore
  if (!options.artifactsRoot || !options.expectedLegs) throw new Camp01LiveSignalError('INVALID_ARGUMENT', usage);
  return options;
}

// prettier-ignore
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCamp01LiveSignal(parseCliOptions(process.argv.slice(2)))
    .then(({ exitCode }) => { process.exitCode = exitCode; })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}

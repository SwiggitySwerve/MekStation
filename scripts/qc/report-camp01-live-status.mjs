import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectLiveTierLegs } from './camp01-live-signal.mjs';

// Human-facing companion to the workflow signal: one command that answers
// "what is the CAMP-01 live adversarial tier doing?" without a multi-step
// `gh run list` / `gh run view` / `gh run download` dance. It assesses the same
// artifacts the workflow assesses, so the local answer and the Actions tab can
// never disagree. Purely informational and strictly read-only — it always
// exits 0 and only ever asks `gh` for data.
const WORKFLOW = 'camp01-live-adversarial.yml';
const EXPECTED_LEGS = Object.freeze(['Linux', 'Windows']);
const RUN_FIELDS =
  'databaseId,headBranch,headSha,displayTitle,status,conclusion,createdAt,url';

// The only transport seam. Production shells out to the preinstalled `gh`;
// tests inject a stand-in and no external process is ever spawned.
export function invokeGh(args) {
  return spawnSync('gh', args, {
    shell: false,
    encoding: 'utf8',
    maxBuffer: 8_000_000,
  });
}

// gh distinguishes "not installed" (spawn error) from "installed but cannot
// talk to GitHub" (non-zero exit). Both degrade to guidance rather than a
// stack trace, because this is a convenience command, not a gate.
function unavailableReason(result) {
  if (!result || result.error)
    return `\`gh\` is not available on PATH (${result?.error?.message ?? 'no result'})`;
  if (result.status !== 0)
    return (result.stderr || result.stdout || 'gh exited non-zero').trim();
  return null;
}

async function reportLatestRun(runId, runGh, note) {
  const scratch = await fs.mkdtemp(
    path.join(os.tmpdir(), 'camp01-live-status-'),
  );
  try {
    const downloaded = runGh([
      'run',
      'download',
      String(runId),
      '--dir',
      scratch,
    ]);
    if (downloaded?.status !== 0) {
      note(
        `  (artifacts unavailable — ${(downloaded?.stderr || 'download failed').trim()})`,
      );
      return;
    }
    const legs = await collectLiveTierLegs({
      artifactsRoot: scratch,
      expectedLegs: EXPECTED_LEGS,
    });
    for (const { leg, state, probes, detail, summary } of legs) {
      note(`  ${leg.padEnd(8)} ${state.toUpperCase()}`);
      if (summary)
        note(
          `    passed ${summary.passed} / failed ${summary.failed} / skipped-expected ${summary.skippedAsExpected} / skipped-unexpected ${summary.skippedUnexpectedly}`,
        );
      note(`    ${probes.length > 0 ? probes.join(', ') : detail}`);
    }
    note(
      legs.some(({ alarming }) => alarming)
        ? '  => NOT CLEAN. The workflow run above is red for the same reason.'
        : '  => every leg green.',
    );
  } finally {
    await fs.rm(scratch, { recursive: true, force: true });
  }
}

export async function reportCamp01LiveStatus(
  { limit = 5 } = {},
  { runGh = invokeGh, write = (text) => process.stdout.write(text) } = {},
) {
  const note = (text) => write(`${text}\n`);
  const listed = runGh([
    'run',
    'list',
    '--workflow',
    WORKFLOW,
    '--limit',
    String(limit),
    '--json',
    RUN_FIELDS,
  ]);
  const reason = unavailableReason(listed);
  if (reason) {
    note(`CAMP-01 live tier status unavailable: ${reason}`);
    note('Authenticate with `gh auth login`, then re-run this command.');
    note(
      `Web view: https://github.com/SwiggitySwerve/MekStation/actions/workflows/${WORKFLOW}`,
    );
    return;
  }
  const runs = JSON.parse(listed.stdout || '[]');
  if (runs.length === 0) {
    note(`No runs found for ${WORKFLOW}.`);
    return;
  }
  note(`CAMP-01 live adversarial tier — last ${runs.length} run(s)`);
  for (const run of runs)
    note(
      `  ${run.createdAt}  ${(run.conclusion || run.status || '?').padEnd(10)} ${run.headBranch} ${String(run.headSha).slice(0, 8)}  ${run.url}`,
    );
  const latest = runs.find(({ status }) => status === 'completed') ?? runs[0];
  note('');
  note(`Latest completed run ${latest.databaseId} (${latest.displayTitle}):`);
  await reportLatestRun(latest.databaseId, runGh, note);
}

function parseCliOptions(argv) {
  let limit = 5;
  for (let index = 0; index < argv.length; index += 1) {
    if (
      argv[index] === '--limit' &&
      /^[1-9][0-9]?$/.test(argv[index + 1] ?? '')
    ) {
      limit = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    throw new Error('expected [--limit <1-99>]');
  }
  return { limit };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  reportCamp01LiveStatus(parseCliOptions(process.argv.slice(2))).catch(
    (error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    },
  );
}

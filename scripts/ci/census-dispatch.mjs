// The lane wrapper for the hosted per-family census (parity-census.yml):
//   node scripts/ci/census-dispatch.mjs --ref <branch> --families <all|a,b> --measures <load|reopen|both>
//     [--repo owner/name] [--poll-seconds 30] [--wait-minutes 120]
// It refuses when the ref already has a parity-census run in flight, or when this dispatch would put more than
// MAX_IN_FLIGHT runs in flight repo-wide (2 runs x 5 jobs leaves at least 10 of the 20 hosted jobs for PR runs).
// It dispatches, takes the run id from the URL `gh workflow run` prints (never from `gh run list`, which can name
// another lane's run), waits, then prints each job's conclusion, its gate summary and the run's artifact names.
// Before dispatching, when this checkout is the ref head, it compares the fingerprint of facts.mjs (the gate owner,
// factsDeriverBlob) with each enabled family baseline header and prints a plain message on a mismatch. It never refuses.
// Exit: 0 the run succeeded; 1 it failed, the wait timed out or gh failed; 2 refused before dispatching.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { factsDeriverBlob } from '../lib/runtime-parity/facts-provenance.mjs';
import {
  DERIVER_FIELDS,
  MEASURES,
  deriverChangedMessage,
  enabledFamilies,
  parityRuntimeNames,
  planCensus,
  readRegistry,
} from './parity-runtime-families.mjs';
import { renderRuntimeSummary } from './parity-runtime-summary.mjs';

export const CENSUS_WORKFLOW = 'parity-census.yml';
/** Census runs allowed in flight repo-wide, this dispatch included. */
export const MAX_IN_FLIGHT = 2;
const DONE = 'completed';

export class Refusal extends Error {}

function realGh(args) {
  const result = spawnSync('gh', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `gh ${args.slice(0, 2).join(' ')} failed: ${(result.stderr || result.stdout).trim()}`,
    );
  return { stdout: result.stdout, stderr: result.stderr };
}

const json = (gh, args) => JSON.parse(gh(args).stdout);

/** The run id from `gh workflow run` output (gh prints https://github.com/<repo>/actions/runs/<id>). */
export function runIdFromDispatch(output) {
  const match = /\/actions\/runs\/(\d+)\b/.exec(output);
  if (!match)
    throw new Error(
      `gh workflow run printed no run URL, so the dispatched run can't be identified (it is never guessed from gh run list); find it in the Actions tab. Output: ${output.trim() || '(none)'}`,
    );
  return Number(match[1]);
}

/** Throws Refusal when the ref already has a census in flight or the repo-wide limit is reached. */
export function checkInFlight(runs, ref) {
  const active = runs.filter((run) => run.status !== DONE);
  const same = active.filter((run) => run.headBranch === ref);
  if (same.length)
    throw new Refusal(
      `${ref} already has a parity-census run in flight (${same.map((run) => run.url ?? run.databaseId).join(', ')}); wait for it`,
    );
  if (active.length >= MAX_IN_FLIGHT)
    throw new Refusal(
      `${active.length} parity-census runs are already in flight repo-wide (limit ${MAX_IN_FLIGHT}): ${active.map((run) => `${run.headBranch} ${run.url ?? run.databaseId}`).join(', ')}`,
    );
}

/**
 * Before dispatching: does this checkout's deriver fingerprint (the gate's owner, factsDeriverBlob) still match every
 * enabled family's committed baselines? A mismatch means each gate will fail closed with FACTS_DERIVER_CHANGED, so the
 * plain message is printed up front. A baseline header without the field (a post-split one) claims nothing here.
 * Returns the message, or null when every fingerprint matches.
 */
export function deriverPrecheck({
  registry,
  root = process.cwd(),
  current = factsDeriverBlob(),
}) {
  const stale = [];
  for (const family of enabledFamilies(registry))
    for (const measure of MEASURES) {
      const file = registry.families[family].baselines[measure].main;
      const baselined = JSON.parse(
        fs.readFileSync(path.join(root, file), 'utf8'),
      )[DERIVER_FIELDS.legacy];
      if (baselined && baselined !== current)
        stale.push(`${family} ${measure} ${baselined}`);
    }
  return stale.length
    ? `${deriverChangedMessage(registry)} This checkout's facts.mjs is ${current}; the baselines were derived with: ${stale.join(', ')}.`
    : null;
}

function gitHead(root) {
  const result = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

export async function censusDispatch({
  ref,
  families,
  measures,
  repo,
  gh = realGh,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log = console.log,
  pollSeconds = 30,
  waitMinutes = 120,
  registry = readRegistry(),
  workDir,
  root = process.cwd(),
  localHead = () => gitHead(root),
  precheck = () => deriverPrecheck({ registry, root }),
}) {
  if (!ref) throw new Refusal('--ref <branch> is required');
  // The same planner as the workflow's plan job: an unknown or disabled family is refused before dispatching.
  let plan;
  try {
    plan = planCensus(registry, { families, measures }).include;
  } catch (error) {
    throw new Refusal(error.message);
  }
  const repoArgs = repo ? ['--repo', repo] : [];
  const runs = json(gh, [
    'run',
    'list',
    '--workflow',
    CENSUS_WORKFLOW,
    '--limit',
    '100',
    '--json',
    'databaseId,status,headBranch,url',
    ...repoArgs,
  ]);
  checkInFlight(runs, ref);

  // The fingerprint pre-check reads this checkout, so it speaks for the ref only when this checkout is the ref's head.
  // It informs and never refuses: the hosted gate is the judge.
  const refHead = json(gh, [
    'api',
    `repos/${repo ?? '{owner}/{repo}'}/commits/${encodeURIComponent(ref)}`,
  ]).sha;
  if (localHead() === refHead) {
    const changed = precheck();
    log(
      changed ?? `deriver fingerprint matches every enabled family's baselines`,
    );
  } else
    log(
      `deriver fingerprint not pre-checked: this checkout is not ${ref}'s head (${refHead}); the job summaries will say if it changed`,
    );

  const dispatched = gh([
    'workflow',
    'run',
    CENSUS_WORKFLOW,
    '--ref',
    ref,
    '-f',
    `families=${families}`,
    '-f',
    `measures=${measures}`,
    ...repoArgs,
  ]);
  const runId = runIdFromDispatch(`${dispatched.stdout}\n${dispatched.stderr}`);
  log(
    `dispatched ${CENSUS_WORKFLOW} run ${runId} on ${ref}: ${plan.map((leg) => `${leg.family} ${leg.measure}`).join(', ')}`,
  );

  const deadline = Date.now() + waitMinutes * 60 * 1000;
  let view;
  let last = '';
  let failures = 0;
  for (;;) {
    try {
      view = json(gh, [
        'run',
        'view',
        String(runId),
        '--json',
        'status,conclusion,url,jobs',
        ...repoArgs,
      ]);
      failures = 0;
    } catch (error) {
      // A long wait outlives an API blip; five in a row is not a blip.
      failures += 1;
      if (failures >= 5) throw error;
      log(`run ${runId}: view failed (${error.message}); retrying`);
      await sleep(pollSeconds * 1000);
      continue;
    }
    if (view.status !== last) {
      log(`run ${runId}: ${view.status}`);
      last = view.status;
    }
    if (view.status === DONE) break;
    if (Date.now() >= deadline) {
      log(
        `stopped waiting after ${waitMinutes} min; run ${runId} is still ${view.status}: ${view.url}`,
      );
      return { runId, exitCode: 1, conclusion: null };
    }
    await sleep(pollSeconds * 1000);
  }

  const artifacts = json(gh, [
    'api',
    `repos/${repo ?? '{owner}/{repo}'}/actions/runs/${runId}/artifacts?per_page=100`,
  ]).artifacts.map((artifact) => artifact.name);
  const temporary =
    workDir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'census-dispatch-'));
  try {
    for (const job of view.jobs.filter(
      (item) => !/Parity Runtime /.test(item.name),
    ))
      log(`job ${job.name}: ${job.conclusion}`);
    for (const leg of plan) {
      const names = parityRuntimeNames(leg.family, leg.measure);
      const job = view.jobs.find((item) =>
        item.name.endsWith(`Parity Runtime ${leg.family} ${leg.measure}`),
      );
      log(
        '',
        `job ${leg.family} ${leg.measure}: ${job?.conclusion ?? 'not run'}${job?.url ? ` ${job.url}` : ''}`,
      );
      if (!artifacts.includes(names.census)) {
        log(`no ${names.census} artifact, so no gate summary`);
        continue;
      }
      const destination = path.join(temporary, names.census);
      gh([
        'run',
        'download',
        String(runId),
        '--name',
        names.census,
        '--dir',
        destination,
        ...repoArgs,
      ]);
      const read = (name) =>
        JSON.parse(fs.readFileSync(path.join(destination, name), 'utf8'));
      let retrieval = { reason: 'retrieval unavailable' };
      try {
        retrieval = read('previous/retrieval.json');
      } catch {
        /* The optional lookup may have failed before writing it. */
      }
      try {
        log(
          renderRuntimeSummary(
            read('gate/gate-report.json'),
            read('summary.json'),
            retrieval,
            { family: leg.family, registry },
          ),
        );
      } catch (error) {
        log(`no gate summary in ${names.census}: ${error.message}`);
      }
    }
  } finally {
    if (!workDir) fs.rmSync(temporary, { recursive: true, force: true });
  }
  log('', `artifacts: ${artifacts.length ? artifacts.join(', ') : 'none'}`);
  log(`run ${runId} ${view.conclusion}: ${view.url}`);
  return {
    runId,
    conclusion: view.conclusion,
    exitCode: view.conclusion === 'success' ? 0 : 1,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({
      options: {
        ref: { type: 'string' },
        families: { type: 'string' },
        measures: { type: 'string', default: 'both' },
        repo: { type: 'string' },
        'poll-seconds': { type: 'string', default: '30' },
        'wait-minutes': { type: 'string', default: '120' },
      },
    });
    const result = await censusDispatch({
      ref: values.ref,
      families: values.families,
      measures: values.measures,
      repo: values.repo,
      pollSeconds: Number(values['poll-seconds']),
      waitMinutes: Number(values['wait-minutes']),
    });
    process.exitCode = result.exitCode;
  } catch (error) {
    const refused = error instanceof Refusal;
    console.error(
      refused
        ? `refused: ${error.message}`
        : `census-dispatch: ${error.message}`,
    );
    process.exitCode = refused ? 2 : 1;
  }
}

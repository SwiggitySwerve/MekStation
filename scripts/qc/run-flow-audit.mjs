/**
 * Flow-Audit Runner
 *
 * Single-command, per-flow UX audit: drives exactly one named flow from
 * `e2e/flows/manifest.ts` through `e2e/flow-audits.spec.ts`, cataloguing every
 * checkpoint's screenshot/route/console-error evidence into a fresh per-run
 * directory, then reuses `scripts/qc/run-ux-walkthrough.mjs`'s catalog
 * generation (manifest.json / index.html / REVIEW.md — design D6) so flow
 * audits and the umbrella UX walkthrough produce byte-identical review
 * artifacts. On top of that shared catalog this runner also writes a flow-
 * specific `summary.json` and prints a machine-readable pointer line (D4).
 *
 * Usage:
 *   npm run qc:flow -- <flow-id>                       run a flow (desktop viewport, isolated DB)
 *   npm run qc:flow -- --list                            enumerate flows/checkpoints, no browser
 *   npm run qc:flow -- <flow-id> --until <checkpoint>     stop after a checkpoint
 *   npm run qc:flow -- <flow-id> --viewport mobile        preset (mobile|tablet|desktop) or WxH
 *   npm run qc:flow -- <flow-id> --hold                   target the dev server, leave state in place
 *
 * Hold mode (design D3) targets an already-running `node server.js` dev
 * server instead of spawning/killing one. Start it first with:
 *   NEXT_PUBLIC_E2E_MODE=true PLAYWRIGHT_E2E_RUN_ID=mekstation-flow-hold npm run dev
 * (must be the `node server.js` dev script, not `npm run dev:e2e`, which
 * bypasses the custom readiness handler entirely). The runner probes that
 * exact readiness token before spawning Playwright so `reuseExistingServer`
 * in playwright.config.ts is guaranteed to skip its `command` (which would
 * otherwise `kill-port 3600` first) — see design D3 + proposal.md's
 * `reuseExistingServer` risk note.
 *
 * Output: .sisyphus/evidence/flow-audit/<runId>/
 *   manifest.json    aggregated run manifest (one journey: the selected flow)
 *   index.html       reviewable contact sheet (open in a browser)
 *   REVIEW.md         reviewer skeleton
 *   summary.json      machine-readable run summary (spec: Machine-Readable Run Summary)
 *   journeys/*.json   raw per-flow record written by WalkthroughRecorder
 *   <flow-id>/NN-*.png  checkpoint/step screenshots
 *
 * The Playwright exit code is propagated AFTER the catalog is generated,
 * mirroring run-ux-walkthrough.mjs exactly — graded findings (tolerant
 * checkpoints + structured findings, implemented in flow-audits.spec.ts) exit
 * 0; only infra errors (bad args, missing dev server, Playwright crash) exit
 * non-zero (spec: Flow Audits Are Evidence, Never CI Gates; design D3 Risks).
 */

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Reuse the umbrella walkthrough runner's catalog generation directly (design
// D6 "prefer direct import over extraction" — these three exports are pure
// and options-overridable; importing them does not spawn a child process or
// touch the filesystem because run-ux-walkthrough.mjs only acts inside its
// own `isDirectRun` guard).
import {
  aggregateManifest,
  writeIndexHtml,
  writeReviewSkeleton,
} from './run-ux-walkthrough.mjs';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const modulePath = fileURLToPath(import.meta.url);
const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === modulePath;

// Fixed hold-mode readiness token (design D3 / holdModeNotes): using a stable
// token instead of a random per-run one lets the runner's probe match an
// already-running dev server's own `e2eReadyURL` query, so Playwright's
// `reuseExistingServer` skips spawning `npm run dev` (which would otherwise
// `kill-port 3600` the developer's server first).
const HOLD_RUN_ID = 'mekstation-flow-hold';
const HOLD_PORT = 3600;
const HOLD_READY_URL = `http://localhost:${HOLD_PORT}/__playwright_e2e_ready__?runId=${encodeURIComponent(HOLD_RUN_ID)}`;

const spec = 'e2e/flow-audits.spec.ts';

if (isDirectRun) {
  run().catch((error) => {
    console.error('[qc:flow] fatal:', error);
    process.exit(1);
  });
}

/**
 * Parse the runner's own CLI args, forwarding anything unrecognized to
 * Playwright. `--until`/`--viewport` as the final argv token (no value
 * follows) is reported via `untilMissing`/`viewportMissing` instead of
 * silently falling back to `null` — the caller fails loud on those once the
 * flow is resolved, rather than treating "typo'd the flag" the same as
 * "didn't pass the flag at all".
 */
function parseArgs(argv) {
  let flowId = null;
  let list = false;
  let until = null;
  let untilMissing = false;
  let hold = false;
  let viewport = null;
  let viewportMissing = false;
  const forward = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--list') {
      list = true;
    } else if (arg === '--hold') {
      hold = true;
    } else if (arg === '--until') {
      if (i + 1 >= argv.length) {
        untilMissing = true;
      } else {
        until = argv[(i += 1)];
      }
    } else if (arg.startsWith('--until=')) {
      until = arg.slice('--until='.length);
    } else if (arg === '--viewport') {
      if (i + 1 >= argv.length) {
        viewportMissing = true;
      } else {
        viewport = argv[(i += 1)];
      }
    } else if (arg.startsWith('--viewport=')) {
      viewport = arg.slice('--viewport='.length);
    } else if (!flowId && !arg.startsWith('--')) {
      flowId = arg;
    } else {
      forward.push(arg);
    }
  }
  return {
    flowId,
    list,
    until,
    untilMissing,
    hold,
    viewport,
    viewportMissing,
    forward,
  };
}

/**
 * Read `FLOW_MANIFEST` out of the TypeScript manifest via the `list-flow-
 * audit.ts` sidecar (design D6 — `--list` reads the manifest via a tiny tsx
 * entrypoint rather than the runner importing TypeScript directly). Runs
 * synchronously and never launches a browser, satisfying "Registry enumerates
 * flows and checkpoints" and the pre-flight id/until validation in one path.
 */
function loadManifest() {
  const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const listScript = path.join(repoRoot, 'scripts', 'qc', 'list-flow-audit.ts');
  const result = spawnSync(process.execPath, [tsxCli, listScript], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.error) {
    throw new Error(
      `[qc:flow] failed to read flow manifest: ${result.error.message}`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `[qc:flow] flow manifest failed to load (exit ${result.status}):\n${result.stderr || result.stdout}`,
    );
  }
  return JSON.parse(result.stdout);
}

/** Human-readable `--list` output (spec: "Registry enumerates flows and checkpoints"). */
function printManifest(manifest) {
  console.log(`[qc:flow] ${manifest.length} registered flow(s):`);
  for (const flow of manifest) {
    console.log('');
    console.log(`  ${flow.id}`);
    console.log(`    ${flow.description}`);
    console.log(`    subsystems: ${flow.subsystems.join(', ')}`);
    console.log(
      `    checkpoints: ${flow.checkpoints.map((cp) => (cp.holdSafe ? cp.name : `${cp.name} (not hold-safe)`)).join(' -> ')}`,
    );
  }
}

/**
 * Probe the fixed hold-mode readiness URL before spawning Playwright.
 * Distinguishes "nothing is listening" from "something is listening but not
 * in flow-audit hold mode" (holdModeNotes) so the failure message tells the
 * developer exactly what to run instead of silently letting Playwright's
 * webServer kill whatever is on port 3600.
 */
function probeHoldServer() {
  return new Promise((resolve, reject) => {
    const request = http.get(HOLD_READY_URL, { timeout: 5_000 }, (res) => {
      res.resume();
      if (res.statusCode === 204) {
        resolve();
        return;
      }
      reject(
        new Error(
          `[qc:flow] --hold refused: a server is running on port ${HOLD_PORT} but not in flow-audit hold mode ` +
            `(readiness check returned ${res.statusCode}). Restart it with:\n` +
            `  NEXT_PUBLIC_E2E_MODE=true PLAYWRIGHT_E2E_RUN_ID=${HOLD_RUN_ID} npm run dev`,
        ),
      );
    });
    request.on('timeout', () => {
      request.destroy();
      reject(
        new Error(
          `[qc:flow] --hold refused: timed out probing port ${HOLD_PORT}. Is the dev server responsive?`,
        ),
      );
    });
    request.on('error', () => {
      reject(
        new Error(
          `[qc:flow] --hold refused: no dev server is reachable on port ${HOLD_PORT}. Start it first with:\n` +
            `  NEXT_PUBLIC_E2E_MODE=true PLAYWRIGHT_E2E_RUN_ID=${HOLD_RUN_ID} npm run dev`,
        ),
      );
    });
  });
}

// Filesystem-safe local-time run id, e.g. 2026-07-10T18-22-33 (matches
// run-ux-walkthrough.mjs's own localRunId; duplicated rather than exported
// since it is a private ~6-line helper with no other shared surface).
function localRunId() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  );
}

/**
 * Normalize the raw `--viewport` CLI string to the same label
 * `resolveViewport()` in `e2e/flow-audits.spec.ts` resolves it to: a known
 * preset name is matched case-insensitively and reported lowercase (e.g.
 * `--viewport MOBILE` -> `mobile`), matching the spec's `label: 'mobile'`
 * literal; anything else (a WxH string, or no `--viewport` at all) is kept
 * as-is, matching the spec's `label: raw` fallback. `flow.viewports` is the
 * manifest's own preset list rather than a second hardcoded copy, so this
 * can't drift from the spec's `VIEWPORT_PRESETS` keys.
 */
function normalizeViewportLabel(raw, presetIds) {
  if (!raw) return 'desktop';
  const lower = raw.toLowerCase();
  return presetIds.includes(lower) ? lower : raw;
}

/**
 * Build `summary.json` (spec: Machine-Readable Run Summary) by joining the
 * single flow journey's checkpoints (name/stepIndex/status) against its steps
 * (console/page errors, duration) — the checkpoint record itself only carries
 * the step index, not the evidence, so callers need both.
 */
function buildSummary({ runDir, catalog, flow, viewportLabel, hold }) {
  const journey = catalog.journeys.find((j) => j.journey === flow.id) ?? null;
  const stepByIndex = new Map(
    (journey?.steps ?? []).map((step) => [step.index, step]),
  );
  const checkpoints = (journey?.checkpoints ?? []).map((checkpoint) => {
    const step =
      checkpoint.stepIndex !== null
        ? stepByIndex.get(checkpoint.stepIndex)
        : undefined;
    return {
      name: checkpoint.name,
      status: checkpoint.status,
      // Per-checkpoint viewport (spec: Viewport Selection) — sourced straight
      // from the recorder's checkpoint record so a checkpoint object read on
      // its own (e.g. extracted from summary.json) is self-describing.
      viewport: checkpoint.viewport ?? null,
      consoleErrors: step?.consoleErrors ?? [],
      pageErrors: step?.pageErrors ?? [],
      durationMs: step?.durationMs ?? null,
    };
  });
  return {
    flowId: flow.id,
    catalogDir: runDir,
    viewport: viewportLabel,
    ...(hold ? { holdUrls: journey?.holdUrls ?? [] } : {}),
    ...(hold ? { entityIds: journey?.entityIds ?? [] } : {}),
    checkpoints,
  };
}

/**
 * Runner entry point: parse args, resolve + validate the flow/checkpoint/
 * viewport selection, spawn Playwright against the dedicated `flow-audit`
 * project, then generate the shared catalog and flow-specific summary.json
 * from whatever the child process left behind. Split into helpers above and
 * a single flat `async function` here (rather than a class) because every
 * step is sequential and there is exactly one call site (isDirectRun).
 */
async function run() {
  const {
    flowId,
    list,
    until,
    untilMissing,
    hold,
    viewport,
    viewportMissing,
    forward,
  } = parseArgs(process.argv.slice(2));
  const manifest = loadManifest();

  if (list) {
    printManifest(manifest);
    process.exit(0);
  }

  if (!flowId) {
    console.error(
      '[qc:flow] missing <flow-id>. Pass --list to see the registered flows.',
    );
    process.exit(1);
  }

  const flow = manifest.find((entry) => entry.id === flowId);
  if (!flow) {
    console.error(`[qc:flow] unknown flow id "${flowId}".`);
    console.error(
      `[qc:flow] valid flow ids: ${manifest.map((entry) => entry.id).join(', ')}`,
    );
    process.exit(1);
  }

  // A bare trailing `--until`/`--viewport` (no value follows) must fail loud
  // rather than silently behave like the flag was never passed — same
  // "before any browser launches" placement as the unknown-checkpoint check
  // below, and reported here (not in parseArgs) because the --until message
  // needs the resolved flow's checkpoint list.
  if (untilMissing) {
    console.error('[qc:flow] --until requires a checkpoint value.');
    console.error(
      `[qc:flow] valid checkpoints: ${flow.checkpoints.map((cp) => cp.name).join(', ')}`,
    );
    process.exit(1);
  }
  if (viewportMissing) {
    console.error(
      '[qc:flow] --viewport requires a value (mobile|tablet|desktop or WxH).',
    );
    process.exit(1);
  }

  // Until validation happens here, before any browser launches (spec: "Unknown
  // checkpoint fails loud" — "exits non-zero before launching a browser").
  if (until && !flow.checkpoints.some((cp) => cp.name === until)) {
    console.error(
      `[qc:flow] unknown --until checkpoint "${until}" for flow "${flow.id}".`,
    );
    console.error(
      `[qc:flow] valid checkpoints: ${flow.checkpoints.map((cp) => cp.name).join(', ')}`,
    );
    process.exit(1);
  }

  if (hold) {
    // holdSafe enforcement happens on the *stop* checkpoint — the last
    // checkpoint reached, whether that is the flow's final checkpoint or the
    // `--until` one (spec: Hold Mode for Local Inspection).
    const stopCheckpointName =
      until ?? flow.checkpoints[flow.checkpoints.length - 1].name;
    const stopCheckpoint = flow.checkpoints.find(
      (cp) => cp.name === stopCheckpointName,
    );
    if (!stopCheckpoint.holdSafe) {
      console.error(
        `[qc:flow] --hold refused: checkpoint "${stopCheckpointName}" is not hold-safe — the state reached ` +
          'there is browser-only (not server-persisted), so a dev server would not show anything meaningful.',
      );
      console.error(
        `[qc:flow] hold-safe checkpoints for "${flow.id}": ${
          flow.checkpoints
            .filter((cp) => cp.holdSafe)
            .map((cp) => cp.name)
            .join(', ') || '(none)'
        }`,
      );
      process.exit(1);
    }

    try {
      await probeHoldServer();
    } catch (error) {
      console.error(String(error.message ?? error));
      process.exit(1);
    }
  }

  const runId = localRunId();
  const runDir = path.join(
    repoRoot,
    '.sisyphus',
    'evidence',
    'flow-audit',
    runId,
  );
  fs.mkdirSync(runDir, { recursive: true });

  console.log(
    `[qc:flow] run ${runId} flow=${flow.id}${until ? ` until=${until}` : ''}${hold ? ' (hold mode)' : ''}`,
  );
  console.log(`[qc:flow] catalog: ${path.relative(repoRoot, runDir)}`);

  const runnerArgs = [
    path.join(repoRoot, 'scripts', 'playwright', 'run-playwright.mjs'),
    'test',
    // flow-audits.spec.ts is `testIgnore`d on chromium (the sole default
    // project now that add-viewport-layout-sweep design D2 has deleted the
    // per-breakpoint responsive projects) so plain `npm run test:e2e` / CI
    // sweeps never run all 6 flows unfiltered — this runner targets the
    // dedicated `flow-audit` project instead, per the spec file's own header
    // comment and playwright.config.ts's project doc.
    '--project=flow-audit',
    spec,
    '--workers=1',
    ...forward,
  ];

  const child = spawn(process.execPath, runnerArgs, {
    cwd: repoRoot,
    env: {
      ...process.env,
      MEKSTATION_UX_WALKTHROUGH_RUN_DIR: runDir,
      MEKSTATION_FLOW_ID: flow.id,
      MEKSTATION_FLOW_UNTIL: until ?? '',
      MEKSTATION_FLOW_VIEWPORT: viewport ?? '',
      MEKSTATION_FLOW_HOLD: hold ? '1' : '',
      // Reaching this env into playwright.config.ts's OWN process (not just
      // the browser) is what makes e2eRunId equal HOLD_RUN_ID, so the
      // readiness check 204s immediately and `reuseExistingServer` skips
      // `command` entirely — port 3600 is never touched (design D3 /
      // holdModeNotes point 4).
      ...(hold
        ? { PLAYWRIGHT_E2E_RUN_ID: HOLD_RUN_ID, NEXT_PUBLIC_E2E_MODE: 'true' }
        : {}),
    },
    stdio: 'inherit',
  });

  child.on('error', (error) => {
    console.error(error);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    let exitCode = signal ? 1 : (code ?? 1);
    try {
      const catalog = aggregateManifest({ runDir, runId, prod: false });
      writeIndexHtml(catalog, { runDir });
      writeReviewSkeleton(catalog, { runDir });
      const summary = buildSummary({
        runDir,
        catalog,
        flow,
        viewportLabel: normalizeViewportLabel(viewport, flow.viewports),
        hold,
      });
      const summaryPath = path.join(runDir, 'summary.json');
      fs.writeFileSync(
        summaryPath,
        `${JSON.stringify(summary, null, 2)}\n`,
        'utf8',
      );
      printSummary(catalog, summary);
      // Last stdout line, machine-readable pointer (spec: Machine-Readable
      // Run Summary; design D4). Printed after the human-readable summary so
      // an agent can `.split('\n').pop()` this exact line unambiguously.
      console.log(`FLOW_AUDIT_SUMMARY=${summaryPath}`);
    } catch (error) {
      console.error('[qc:flow] catalog generation failed:', error);
      exitCode = exitCode || 1;
    }
    process.exit(exitCode);
  });
}

/** Human-readable run summary printed to stdout ahead of the machine-readable FLOW_AUDIT_SUMMARY pointer line, so a developer scanning the terminal gets the headline numbers without opening summary.json. */
function printSummary(catalog, summary) {
  const { totals } = catalog;
  console.log(
    `[qc:flow] flow=${summary.flowId} viewport=${summary.viewport} ` +
      `checkpoints=${summary.checkpoints.length} steps=${totals.steps} (${totals.failedSteps} failed, ` +
      `${totals.stepsWithConsoleErrors} with console errors) findings=${totals.findings}`,
  );
  if (summary.holdUrls?.length) {
    console.log('[qc:flow] hold URL(s):');
    for (const entry of summary.holdUrls) {
      console.log(`  - ${entry.label}: ${entry.url}`);
    }
  }
  if (summary.entityIds?.length) {
    console.log('[qc:flow] created entity id(s):');
    for (const entry of summary.entityIds) {
      console.log(`  - ${entry.kind}: ${entry.id}`);
    }
  }
  console.log(
    `[qc:flow] review: ${path.join(path.relative(repoRoot, summary.catalogDir), 'index.html')}`,
  );
}

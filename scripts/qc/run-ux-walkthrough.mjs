/**
 * UX Walkthrough Audit Runner
 *
 * Single-command, repeatable UX audit: drives the normal-user journeys in
 * e2e/ux-walkthrough-audit.spec.ts and the deep-play journeys in
 * e2e/ux-deep-play-audit.spec.ts, cataloguing every step's screenshot into a
 * fresh per-run directory, then aggregates the per-journey JSON records into
 * manifest.json and a self-contained index.html contact sheet for review.
 *
 * Usage:
 *   npm run qc:ux-audit            # dev server capture
 *   npm run qc:ux-audit:deep      # deep-play journeys only
 *   npm run qc:ux-audit:prod      # production standalone-server capture
 *   npm run qc:ux-audit -- -g "sp campaign"
 *                                  # pass Playwright grep through to one journey
 *
 * Output: .sisyphus/evidence/ux-walkthrough/<runId>/
 *   manifest.json    aggregated run manifest (journeys -> steps)
 *   index.html       reviewable contact sheet (open in a browser)
 *   journeys/*.json  raw per-journey records
 *   <journey>/NN-*.png  step screenshots
 *
 * The Playwright exit code is propagated AFTER the catalog is generated — a
 * failing journey is itself an audit finding, and the reviewer needs the
 * partial catalog to see where the user path broke.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const rawArgs = process.argv.slice(2);
const prod = rawArgs.includes('--prod');
const deep = rawArgs.includes('--deep');
const extraArgs = rawArgs.filter((arg) => arg !== '--prod' && arg !== '--deep');
const modulePath = fileURLToPath(import.meta.url);
const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === modulePath;
const shellSpec = 'e2e/ux-walkthrough-audit.spec.ts';
const deepSpec = 'e2e/ux-deep-play-audit.spec.ts';
const specArgs = deep ? [deepSpec] : [shellSpec, deepSpec];

// Filesystem-safe local-time run id, e.g. 2026-07-04T18-22-33.
const runId = localRunId();
const runDir = path.join(
  repoRoot,
  '.sisyphus',
  'evidence',
  'ux-walkthrough',
  runId,
);

const runnerArgs = [
  path.join(repoRoot, 'scripts', 'playwright', 'run-playwright.mjs'),
  'test',
  '--project=chromium',
  ...specArgs,
  '--workers=1',
  ...(prod ? ['--prod-evidence'] : []),
  ...extraArgs,
];

if (isDirectRun) {
  run();
}

function run() {
  fs.mkdirSync(runDir, { recursive: true });

  console.log(
    `[qc:ux-audit] run ${runId} (${prod ? 'production' : 'dev'} build${deep ? ', deep-only' : ''})`,
  );
  console.log(`[qc:ux-audit] catalog: ${path.relative(repoRoot, runDir)}`);

  const child = spawn(process.execPath, runnerArgs, {
    cwd: repoRoot,
    env: {
      ...process.env,
      MEKSTATION_UX_WALKTHROUGH_RUN_DIR: runDir,
      MEKSTATION_UX_WALKTHROUGH_BUILD_MODE: prod ? 'production' : 'development',
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
      const manifest = aggregateManifest();
      writeIndexHtml(manifest);
      writeReviewSkeleton(manifest);
      printSummary(manifest);
    } catch (error) {
      console.error('[qc:ux-audit] catalog generation failed:', error);
      exitCode = exitCode || 1;
    }
    process.exit(exitCode);
  });
}

function localRunId() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  );
}

export function aggregateManifest(options = {}) {
  const targetRunDir = options.runDir ?? runDir;
  const targetRunId = options.runId ?? runId;
  const targetProd = options.prod ?? prod;
  const journeysDir = path.join(targetRunDir, 'journeys');
  const journeys = [];
  if (fs.existsSync(journeysDir)) {
    for (const entry of fs.readdirSync(journeysDir).sort()) {
      if (!entry.endsWith('.json')) continue;
      try {
        journeys.push(
          JSON.parse(fs.readFileSync(path.join(journeysDir, entry), 'utf8')),
        );
      } catch (error) {
        console.error(
          `[qc:ux-audit] unreadable journey record ${entry}:`,
          error,
        );
      }
    }
  }
  const steps = journeys.flatMap((journey) => journey.steps ?? []);
  const findings = journeys.flatMap((journey) => journey.findings ?? []);
  const manifest = {
    schemaVersion: 1,
    runId: targetRunId,
    buildMode: targetProd ? 'production' : 'development',
    baseUrl: 'http://localhost:3600',
    startedAt: journeys.length
      ? journeys.map((j) => j.startedAt).sort()[0]
      : new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    totals: {
      journeys: journeys.length,
      failedJourneys: journeys.filter((j) => j.status === 'failed').length,
      steps: steps.length,
      failedSteps: steps.filter((s) => s.status === 'failed').length,
      findings: findings.length,
      stepsWithConsoleErrors: steps.filter(
        (s) => (s.consoleErrors?.length ?? 0) + (s.pageErrors?.length ?? 0) > 0,
      ).length,
    },
    journeys,
  };
  fs.writeFileSync(
    path.join(targetRunDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
  return manifest;
}

function printSummary(manifest) {
  const { totals } = manifest;
  console.log(
    `[qc:ux-audit] journeys=${totals.journeys} (${totals.failedJourneys} failed) ` +
      `steps=${totals.steps} (${totals.failedSteps} failed, ` +
      `${totals.stepsWithConsoleErrors} with console errors) ` +
      `findings=${totals.findings}`,
  );
  console.log(
    `[qc:ux-audit] review: ${path.join(path.relative(repoRoot, runDir), 'index.html')}`,
  );
  console.log(
    `[qc:ux-audit] skeleton: ${path.join(path.relative(repoRoot, runDir), 'REVIEW.md')}`,
  );
}

/**
 * Self-contained review page: journey sections with step cards, screenshots
 * inlined by relative path, console errors surfaced loudly. No external
 * assets so the file works from disk and inside CI artifact bundles.
 */
export function writeIndexHtml(manifest, options = {}) {
  const targetRunDir = options.runDir ?? runDir;
  const sections = manifest.journeys
    .map((journey) => {
      const cards = journey.steps
        .map((step) => {
          const errors = [
            ...(step.consoleErrors ?? []),
            ...(step.pageErrors ?? []),
          ];
          return `
      <div class="card ${step.status}" id="${stepAnchorId(journey, step.index)}">
        <div class="card-head">
          <span class="step-no">${step.index}</span>
          <strong>${escapeHtml(step.title)}</strong>
          <span class="badge ${step.status}">${step.status}</span>
          <span class="surface">${escapeHtml(step.surface ?? 'default')}</span>
          <span class="ms">${step.durationMs} ms</span>
        </div>
        <div class="route">${escapeHtml(stripOrigin(step.route))}</div>
        ${
          step.screenshot
            ? `<a href="${step.screenshot}" target="_blank"><img loading="lazy" src="${step.screenshot}" alt="${escapeHtml(step.title)}"></a>`
            : '<div class="no-shot">no screenshot captured</div>'
        }
        ${step.failure ? `<div class="failure">${escapeHtml(step.failure)}</div>` : ''}
        ${
          errors.length
            ? `<details class="errors"><summary>${errors.length} console/page error(s)</summary><pre>${escapeHtml(errors.join('\n\n'))}</pre></details>`
            : ''
        }
        ${
          step.notes?.length
            ? `<div class="notes">${step.notes.map((n) => `<div>📝 ${escapeHtml(n)}</div>`).join('')}</div>`
            : ''
        }
      </div>`;
        })
        .join('\n');
      const findings = renderFindingsHtml(journey);
      return `
    <section>
      <h2 id="${journeyAnchorId(journey)}">${escapeHtml(journey.journey)} <span class="badge ${journey.status}">${journey.status}</span>
        <span class="meta">${escapeHtml(journey.persona)} · ${journey.viewport.width}×${journey.viewport.height} · ${journey.steps.length} steps</span>
      </h2>
      ${findings}
      <div class="grid">${cards}</div>
    </section>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UX Walkthrough ${manifest.runId}</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 24px; background: #0f1115; color: #e6e6e6; font: 14px/1.5 system-ui, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 32px 0 12px; border-bottom: 1px solid #2a2e38; padding-bottom: 6px; }
  .meta { color: #8a92a6; font-weight: normal; font-size: 12px; margin-left: 8px; }
  .summary { color: #8a92a6; margin-bottom: 8px; }
  .toc a { color: #7aa2f7; margin-right: 14px; text-decoration: none; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px; }
  .card { background: #171a21; border: 1px solid #2a2e38; border-radius: 8px; padding: 10px; }
  .card.failed { border-color: #b3455a; }
  .card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .step-no { background: #2a2e38; border-radius: 4px; padding: 0 6px; font-size: 12px; }
  .surface { color: #c7cdda; background: #242936; border-radius: 4px; padding: 1px 6px; font-size: 11px; }
  .ms { margin-left: auto; color: #8a92a6; font-size: 12px; }
  .badge { font-size: 11px; border-radius: 4px; padding: 1px 6px; text-transform: uppercase; }
  .badge.ok { background: #1f3d2b; color: #7ce38b; }
  .badge.failed { background: #46222b; color: #ff8097; }
  .badge.critical { background: #5b1f2d; color: #ff9aaa; }
  .badge.major { background: #4c2d18; color: #ffbe7a; }
  .badge.moderate { background: #3d3515; color: #f2d56b; }
  .badge.minor { background: #20384d; color: #8ecbff; }
  .route { color: #8a92a6; font-size: 12px; word-break: break-all; margin-bottom: 6px; }
  img { width: 100%; border-radius: 4px; border: 1px solid #2a2e38; display: block; }
  .failure { background: #46222b; color: #ffb3c0; border-radius: 4px; padding: 6px 8px; margin-top: 6px; font-size: 12px; white-space: pre-wrap; word-break: break-word; }
  .errors { margin-top: 6px; }
  .errors summary { color: #f0b429; cursor: pointer; font-size: 12px; }
  .errors pre { background: #101318; padding: 8px; border-radius: 4px; overflow-x: auto; font-size: 11px; }
  .notes { margin-top: 6px; color: #c7cdda; font-size: 12px; }
  .no-shot { color: #8a92a6; font-style: italic; padding: 20px; text-align: center; }
  .findings { background: #151922; border: 1px solid #30384a; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; }
  .findings.empty { color: #8a92a6; }
  .findings h3 { font-size: 13px; margin: 0 0 8px; }
  .finding { border-top: 1px solid #2a2e38; padding-top: 8px; margin-top: 8px; }
  .finding:first-of-type { border-top: 0; padding-top: 0; margin-top: 0; }
  .finding-title { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .evidence { color: #c7cdda; font-size: 12px; }
  .evidence a { color: #7aa2f7; margin-right: 8px; text-decoration: none; }
  .missing-evidence { color: #ffb3c0; margin-right: 8px; }
</style>
</head>
<body>
<h1>UX Walkthrough Audit — ${manifest.runId}</h1>
<div class="summary">build: ${manifest.buildMode} · journeys: ${manifest.totals.journeys} (${manifest.totals.failedJourneys} failed) · steps: ${manifest.totals.steps} (${manifest.totals.failedSteps} failed, ${manifest.totals.stepsWithConsoleErrors} with console errors) · findings: ${manifest.totals.findings}</div>
<div class="toc">${manifest.journeys.map((j) => `<a href="#${journeyAnchorId(j)}">${escapeHtml(j.journey)}</a>`).join('')}</div>
${sections}
</body>
</html>
`;
  fs.writeFileSync(path.join(targetRunDir, 'index.html'), html, 'utf8');
}

export function writeReviewSkeleton(manifest, options = {}) {
  const targetRunDir = options.runDir ?? runDir;
  const lines = [
    `# UX Walkthrough Review - ${manifest.runId}`,
    '',
    '## TL;DR',
    '',
    '- Reviewer summary: ___',
    '- Release/blocker call: ___',
    '- Follow-up owner: ___',
    '',
    '## Run Summary',
    '',
    `- Build mode: ${manifest.buildMode}`,
    `- Started: ${manifest.startedAt}`,
    `- Finished: ${manifest.finishedAt}`,
    `- Journeys: ${manifest.totals.journeys} (${manifest.totals.failedJourneys} failed)`,
    `- Steps: ${manifest.totals.steps} (${manifest.totals.failedSteps} failed, ${manifest.totals.stepsWithConsoleErrors} with console/page errors)`,
    `- Findings: ${manifest.totals.findings}`,
    '',
    '## Journeys',
    '',
  ];

  if (manifest.journeys.length === 0) {
    lines.push('_No journey records were written for this run._', '');
  }

  for (const journey of manifest.journeys) {
    lines.push(
      `### ${markdownText(journey.journey)} (${markdownText(journey.status)})`,
      '',
      `- Persona: ${markdownText(journey.persona)}`,
      `- Viewport: ${journey.viewport.width}x${journey.viewport.height}`,
      `- Started: ${journey.startedAt}`,
      `- Finished: ${journey.finishedAt}`,
      '',
      '#### Steps',
      '',
    );

    const steps = journey.steps ?? [];
    if (steps.length === 0) {
      lines.push('- _No steps recorded._');
    } else {
      for (const step of steps) {
        const errors = [
          ...(step.consoleErrors ?? []),
          ...(step.pageErrors ?? []),
        ];
        lines.push(
          `- [${markdownText(step.status)}] ${step.index}. ${markdownText(step.title)} (${markdownText(step.surface ?? 'default')})`,
          `  - Route: ${markdownText(stripOrigin(step.route) || '_unknown_')}`,
          `  - Screenshot: ${step.screenshot ? markdownText(step.screenshot) : '_none captured_'}`,
          `  - Duration: ${step.durationMs} ms`,
        );
        if (step.failure) {
          lines.push(`  - Failure: ${markdownText(step.failure)}`);
        }
        if (errors.length > 0) {
          lines.push(`  - Console/page errors: ${errors.length}`);
        }
        if (step.notes?.length) {
          lines.push(`  - Notes: ${step.notes.map(markdownText).join('; ')}`);
        }
      }
    }

    lines.push('', '#### Findings', '');
    const findings = journey.findings ?? [];
    if (findings.length === 0) {
      lines.push('- _No findings recorded._');
    } else {
      for (const finding of findings) {
        lines.push(
          `- ${markdownText(finding.id)} (${markdownText(finding.severity)}): ${markdownText(finding.summary)}`,
          `  - Evidence: ${findingEvidenceMarkdown(journey, finding)}`,
          '  - Reviewer verdict: ___ (confirmed / not reproducible / fixed)',
          '  - Reviewer notes: ___',
        );
      }
    }
    lines.push('');
  }

  fs.writeFileSync(
    path.join(targetRunDir, 'REVIEW.md'),
    `${lines.join('\n')}\n`,
    'utf8',
  );
}

function renderFindingsHtml(journey) {
  const findings = journey.findings ?? [];
  if (findings.length === 0) {
    return '<div class="findings empty"><h3>Findings</h3><div>No findings recorded.</div></div>';
  }

  return `
      <div class="findings">
        <h3>Findings (${findings.length})</h3>
        ${findings.map((finding) => renderFindingHtml(journey, finding)).join('\n')}
      </div>`;
}

function renderFindingHtml(journey, finding) {
  const severity = anchorSlug(finding.severity);
  return `
        <div class="finding">
          <div class="finding-title">
            <strong>${escapeHtml(finding.id)}</strong>
            <span class="badge ${severity}">${escapeHtml(finding.severity)}</span>
            <span>${escapeHtml(finding.summary)}</span>
          </div>
          <div class="evidence">Evidence: ${findingEvidenceHtml(journey, finding)}</div>
        </div>`;
}

function findingEvidenceHtml(journey, finding) {
  const stepMap = new Map(
    (journey.steps ?? []).map((step) => [step.index, step]),
  );
  const evidenceSteps = finding.steps ?? [];
  if (evidenceSteps.length === 0) {
    return '<span class="missing-evidence">no step evidence recorded</span>';
  }
  return evidenceSteps
    .map((stepIndex) => {
      const step = stepMap.get(stepIndex);
      if (!step) {
        return `<span class="missing-evidence">step ${escapeHtml(stepIndex)} missing</span>`;
      }
      const stepLink = `<a href="#${stepAnchorId(journey, step.index)}">step ${step.index}</a>`;
      const shotLink = step.screenshot
        ? `<a href="${escapeHtml(step.screenshot)}" target="_blank">screenshot</a>`
        : '<span class="missing-evidence">no screenshot</span>';
      return `${stepLink}${shotLink}`;
    })
    .join('');
}

function findingEvidenceMarkdown(journey, finding) {
  const stepMap = new Map(
    (journey.steps ?? []).map((step) => [step.index, step]),
  );
  const evidenceSteps = finding.steps ?? [];
  if (evidenceSteps.length === 0) {
    return '_No step evidence recorded._';
  }
  return evidenceSteps
    .map((stepIndex) => {
      const step = stepMap.get(stepIndex);
      if (!step) {
        return `step ${stepIndex}: missing step record`;
      }
      const title = markdownText(step.title);
      const screenshot = step.screenshot
        ? markdownText(step.screenshot)
        : 'no screenshot captured';
      return `step ${step.index} (${title}): ${screenshot}`;
    })
    .join('; ');
}

function journeyAnchorId(journey) {
  return `journey-${anchorSlug(journey.journey)}`;
}

function stepAnchorId(journey, stepIndex) {
  return `${journeyAnchorId(journey)}-step-${stepIndex}`;
}

function anchorSlug(value) {
  const slug = String(value ?? 'journey')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'journey';
}

function markdownText(text) {
  return String(text ?? '')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripOrigin(url) {
  return url ? url.replace(/^https?:\/\/[^/]+/, '') : '';
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

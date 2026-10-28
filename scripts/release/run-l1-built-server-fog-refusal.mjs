#!/usr/bin/env node
/**
 * L1-SMOKE-B combined proof and the Step 3 done-test: node scripts/release/run-l1-built-server-fog-refusal.mjs --build
 * Runs A2 (A1 + A2M + co-op) then the fog rows on one image. The frozen argv has no SHA or output:
 * they default to the clean checkout HEAD and a new temp directory. Optional: --expected-sha --output --repo-root.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { B_REQUIRED_CASES, runFogCases } from './l1-built-server-fog-cases.mjs';
import {
  A2_REQUIRED_CASES,
  runA2Cases,
} from './l1-built-server-spectator-cases.mjs';
import { runHarness } from './run-l1-built-server-smoke.mjs';

/** Predecessor rows first, then the refusals; the harness fails on any missing or extra id. */
export const COMBINED_REQUIRED_CASES = Object.freeze([
  ...A2_REQUIRED_CASES,
  ...B_REQUIRED_CASES,
]);
/** One run holds the matrix, co-op restart and refusals; the A1 600 s default is raised to the 30 min A2M and A2 use. */
export const LIMITS = Object.freeze({ casesMs: 1_800_000 });

export async function runCombined(
  ctx,
  steps = { a2: runA2Cases, fog: runFogCases },
) {
  await steps.a2(ctx);
  await steps.fog(ctx);
}

function headSha(repoRoot) {
  const head = spawnSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (head.status !== 0) throw new Error(`git rev-parse failed in ${repoRoot}`);
  return head.stdout.trim();
}

export async function runFogRefusal(argv, deps = {}) {
  const { harness = runHarness, steps } = deps;
  const arg = (name) =>
    argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const repoRoot = path.resolve(arg('repo-root') ?? process.cwd());
  const options = {
    build: argv.includes('--build'),
    expectedSha: arg('expected-sha') ?? headSha(repoRoot),
    output:
      arg('output') ??
      path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'l1-smoke-b-')), 'run'),
    repoRoot,
    requiredCases: COMBINED_REQUIRED_CASES,
    limits: LIMITS,
  };
  const summary = await harness(options, (ctx) => runCombined(ctx, steps));
  return {
    verdict: summary.verdict,
    headSha: options.expectedSha,
    buildId: summary.manifest.image.buildId,
    required: summary.required.length,
    passed: summary.passed,
    output: options.output,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  runFogRefusal(process.argv.slice(2)).then(
    (result) => console.log(JSON.stringify(result)),
    (error) => {
      console.error(error.message);
      process.exitCode = 1;
    },
  );
}

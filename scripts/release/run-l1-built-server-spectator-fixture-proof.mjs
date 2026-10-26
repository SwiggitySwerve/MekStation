#!/usr/bin/env node
/**
 * L1-SMOKE-A2FP runner: ordinary provisioning and read-only reachability of an
 * accepted Move, Attack and Physical declaration on the built production image.
 *   node scripts/release/run-l1-built-server-spectator-fixture-proof.mjs --build --expected-sha=<sha> --output=<abs-new-dir> [--repo-root=<abs>]
 * F, M and A2 import FP_REQUIRED_CASES and runReachabilityCases read-only.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COMMANDS,
  accepted,
  commandFor,
  phaseReady,
  provision,
  witness,
} from './l1-built-server-spectator-context.mjs';
import { runHarness } from './run-l1-built-server-smoke.mjs';

export const FP_REQUIRED_CASES = Object.freeze(
  COMMANDS.map((command) => `accepted-${command.kind}`),
);

export async function runReachabilityCases(ctx) {
  for (const command of COMMANDS) {
    const state = await provision(ctx, `reach-${command.kind}`);
    const ready = await phaseReady(ctx, state, command);
    const intent = commandFor(command, ready);
    const result = await accepted(ctx, state, ready, intent, command.type);
    const extra = {
      intent,
      intentId: result.intentId,
      ready: { count: ready.eventCount, sha256: ready.eventsSha256 },
    };
    const durable = await witness(ctx, state, 'declared', command, extra);
    ctx.check(
      durable.declaration.id === result.reply.event.id,
      state.label,
      'durable declaration is not the one the wire accepted',
      { durable, ready },
    );
    ctx.pass(`accepted-${command.kind}`, {
      ready,
      declaration: result.reply.event,
      durable,
    });
  }
}

/** Direct-run entry shared by the FP, F, M and A2 runners; a no-op when imported. */
export function runDirect(moduleUrl, requiredCases, runCases, defaults = {}) {
  if (
    !process.argv[1] ||
    path.resolve(process.argv[1]) !== fileURLToPath(moduleUrl)
  )
    return;
  const arg = (name) =>
    process.argv
      .find((a) => a.startsWith(`--${name}=`))
      ?.slice(name.length + 3);
  const options = {
    ...defaults,
    build: process.argv.includes('--build'),
    expectedSha: arg('expected-sha'),
    output: arg('output'),
    repoRoot: arg('repo-root'),
    requiredCases,
  };
  runHarness(options, runCases).then(
    (summary) =>
      console.log(
        JSON.stringify({
          verdict: summary.verdict,
          passed: summary.passed,
          output: options.output,
        }),
      ),
    (error) => {
      console.error(error.message);
      process.exitCode = 1;
    },
  );
}

runDirect(import.meta.url, FP_REQUIRED_CASES, runReachabilityCases);

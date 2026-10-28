#!/usr/bin/env node
/**
 * L1-SMOKE-A2M runner: the A1 baseline exactly once, then the nine-row spectator
 * privacy matrix and its three non-spectating-GM controls, in one image and DB.
 *   node scripts/release/run-l1-built-server-spectator-privacy.mjs --build --expected-sha=<sha> --output=<abs-new-dir> [--repo-root=<abs>]
 * A2 imports A2M_REQUIRED_CASES and runMatrixCases (no A1 inside) read-only.
 */
import {
  A1_REQUIRED_CASES,
  runA1Cases,
} from './l1-built-server-socket-cases.mjs';
import {
  A2M_REQUIRED_CASES,
  runMatrixCases,
} from './l1-built-server-spectator-privacy-cases.mjs';
import { runDirect } from './run-l1-built-server-spectator-fixture-proof.mjs';

export const A2M_DIRECT_CASES = Object.freeze([
  ...A1_REQUIRED_CASES,
  ...A2M_REQUIRED_CASES,
]);
export async function runA2MCases(ctx) {
  await runA1Cases(ctx);
  await runMatrixCases(ctx);
}

runDirect(import.meta.url, A2M_DIRECT_CASES, runA2MCases, {
  limits: { casesMs: 1_800_000 },
});

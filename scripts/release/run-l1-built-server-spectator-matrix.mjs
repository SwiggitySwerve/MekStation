#!/usr/bin/env node
/**
 * L1-SMOKE-A2 runner: the A1 baseline, the frozen A2M matrix, concurrent first
 * sockets and the co-op mission restart with captured rolls on one built image.
 *   node scripts/release/run-l1-built-server-spectator-matrix.mjs --build --expected-sha=<sha> --output=<abs-new-dir> [--repo-root=<abs>]
 * B imports A2_REQUIRED_CASES and runA2Cases from the cases leaf, read-only.
 */
import {
  A2_REQUIRED_CASES,
  runA2Cases,
} from './l1-built-server-spectator-cases.mjs';
import { runDirect } from './run-l1-built-server-spectator-fixture-proof.mjs';

/** The default 600 s case window cannot hold A1, the matrix and the co-op restart; same 30 min as A2M. */
runDirect(import.meta.url, A2_REQUIRED_CASES, runA2Cases, {
  limits: { casesMs: 1_800_000 },
});

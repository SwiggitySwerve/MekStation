#!/usr/bin/env npx tsx
/**
 * Flow-Audit Manifest Reader
 *
 * Tiny typed sidecar that lets the JS flow-audit runner
 * (`scripts/qc/run-flow-audit.mjs`) read `e2e/flows/manifest.ts` — a plain
 * TypeScript module with no JSON mirror — without the runner ever importing
 * TypeScript directly. This is the ONLY code path that touches the manifest's
 * types, so `--list` output and the runner's pre-flight id/until validation
 * both go through the same data (design D6).
 *
 * Usage:
 *   npx tsx scripts/qc/list-flow-audit.ts          # FLOW_MANIFEST as JSON
 */
import { FLOW_MANIFEST } from '../../e2e/flows/manifest';

// Importing FLOW_MANIFEST also runs validateFlowManifest() at module load
// (e2e/flows/manifest.ts's own guard), so a malformed registry throws before
// any JSON reaches stdout — the runner's pre-flight check inherits that
// fail-loud behavior for free.
process.stdout.write(JSON.stringify(FLOW_MANIFEST));

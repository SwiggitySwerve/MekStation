#!/usr/bin/env node
/**
 * Scenario Pack Nightly Recapture — CLI entry point (task 6.1, design D7
 * layer 4: "CI re-capture with invariant-level comparison").
 *
 * Thin dispatcher, mirroring `scripts/qc/run-flow-audit.mjs` /
 * `validate-flow-audit.mjs`'s own tsx-subprocess pattern: the real logic
 * (zod schema/pin re-validation, re-mint orchestration, per-genesis-class
 * invariant comparison) lives in the typed sidecar
 * `recapture-scenario-packs-core.ts` so it can import the pack library's
 * real schemas/types/comparator directly instead of duplicating them in
 * plain JS. This file only resolves the local `tsx` CLI and forwards
 * argv/stdio/exit code.
 *
 * Triage-only, nightly job (design: non-goal "NO PR-gate or required-check
 * wiring") — see `.github/workflows/nightly-validation.yml`'s
 * `scenario-pack-recapture` job (task 6.2). Never wired into `pr-checks.yml`
 * or any required check.
 *
 * Usage:
 *   node scripts/qc/recapture-scenario-packs.mjs [--pack <id>[,<id>...]] [--json]
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D7, R6, R9)
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const corePath = path.join(__dirname, 'recapture-scenario-packs-core.ts');

const result = spawnSync(
  process.execPath,
  [tsxCli, corePath, ...process.argv.slice(2)],
  { cwd: repoRoot, stdio: 'inherit' },
);

if (result.error) {
  console.error('[recapture-scenario-packs] fatal:', result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);

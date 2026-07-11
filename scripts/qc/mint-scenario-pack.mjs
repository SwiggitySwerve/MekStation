/**
 * Scenario Pack Minter CLI — spawns the `scenario-pack-mint` Playwright
 * project against `e2e/scenario-pack-minting.spec.ts` (task 3.2). Mirrors
 * `scripts/qc/run-flow-audit.mjs`'s spawn pattern (env-var selection into a
 * dedicated, gated project) without that runner's catalog-generation tail
 * — minting has no checkpoints/screenshots to catalog, only a payload +
 * provenance sidecar to write (done inside the spec itself).
 *
 * Usage:
 *   node scripts/qc/mint-scenario-pack.mjs <pack-id>
 *   node scripts/qc/mint-scenario-pack.mjs --list
 *
 * @spec openspec/changes/add-scenario-packs/specs/scenario-packs/spec.md
 * @spec openspec/changes/add-scenario-packs/design.md (D7 layer 1)
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const modulePath = fileURLToPath(import.meta.url);
const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === modulePath;

// Kept in sync with `e2e/scenario-pack-minting.spec.ts`'s `MINT_MODES` keys
// by hand (the same duplication `run-flow-audit.mjs` accepts for its own
// `--list` printer vs. the TS-side FLOW_MANIFEST — this list is only used
// for the CLI's own arg validation, never fed into a test).
const KNOWN_PACK_IDS = [
  'navigation-briefing',
  'personnel-roster',
  'experience-pilot',
];

if (isDirectRun) {
  run().catch((error) => {
    console.error('[mint-scenario-pack] fatal:', error);
    process.exit(1);
  });
}

async function run() {
  const args = process.argv.slice(2);
  if (args.includes('--list') || args.length === 0) {
    console.log('[mint-scenario-pack] known pack ids:');
    for (const id of KNOWN_PACK_IDS) console.log(`  - ${id}`);
    process.exit(args.length === 0 ? 1 : 0);
  }

  const packId = args[0];
  if (!KNOWN_PACK_IDS.includes(packId)) {
    console.error(`[mint-scenario-pack] unknown pack id "${packId}".`);
    console.error(
      `[mint-scenario-pack] known pack ids: ${KNOWN_PACK_IDS.join(', ')}`,
    );
    process.exit(1);
  }

  console.log(`[mint-scenario-pack] minting "${packId}"...`);

  const runnerArgs = [
    path.join(repoRoot, 'scripts', 'playwright', 'run-playwright.mjs'),
    'test',
    // Registered ONLY when MEKSTATION_MINT_PACK_ID is set — the same
    // env-var-gated-project pattern `flow-audit` uses (playwright.config.ts).
    '--project=scenario-pack-mint',
    'e2e/scenario-pack-minting.spec.ts',
    '--workers=1',
    ...args.slice(1),
  ];

  const child = spawn(process.execPath, runnerArgs, {
    cwd: repoRoot,
    env: {
      ...process.env,
      MEKSTATION_MINT_PACK_ID: packId,
    },
    stdio: 'inherit',
  });

  child.on('error', (error) => {
    console.error(error);
    process.exit(1);
  });
  child.on('exit', (code, signal) => {
    process.exit(signal ? 1 : (code ?? 1));
  });
}

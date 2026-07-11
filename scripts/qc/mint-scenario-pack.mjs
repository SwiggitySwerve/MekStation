/**
 * Scenario Pack Minter CLI — dispatches by pack id to one of two minter
 * transports:
 *
 *  - **Playwright** (flow-checkpoint + capture-matchlog modes, tasks
 *    3.2/4.2): spawns the `scenario-pack-mint` project against
 *    `e2e/scenario-pack-minting.spec.ts`. Mirrors
 *    `scripts/qc/run-flow-audit.mjs`'s spawn pattern (env-var selection
 *    into a dedicated, gated project) without that runner's
 *    catalog-generation tail — minting has no checkpoints/screenshots to
 *    catalog, only a payload + provenance sidecar to write (done inside
 *    the spec itself).
 *  - **jest** (mint-from-fast-forward mode, task 5.1): spawns
 *    `npm test -- --runTestsByPath src/lib/scenarioPacks/__tests__/
 *    mintFastForwardPack.test.ts` with `MEKSTATION_MINT_FASTFORWARD_
 *    PACK_ID` set — `fastForwardCampaign()` runs fully headless (no
 *    Playwright browser/dev-server needed), so the jest-side env-gated
 *    `it.skip` pattern (mirroring the Playwright spec's own
 *    `test.skip(MEKSTATION_MINT_PACK_ID !== packId, ...)`) is the
 *    correct transport rather than routing through a browser.
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
const PLAYWRIGHT_PACK_IDS = [
  'navigation-briefing',
  'personnel-roster',
  'experience-pilot',
  // W2-gated capture-matchlog mode (add-scenario-packs, task 4.2) — only
  // added once the gate check (task 4.0) verifies the W2 implementation
  // artifacts (`e2e/helpers/matchLogSeeding.ts`,
  // `e2e/seam-fresh-construction-no-instant-defeat.spec.ts`) exist.
  'combat-midbattle',
];

// W3-gated mint-from-fast-forward modes (add-scenario-packs, task 5.1) —
// only added once the gate check (task 5.0) verifies the W3 implementation
// artifacts (`src/lib/campaign/fastForward/` exports `fastForwardCampaign`).
// Kept in sync with `mintFastForwardPack.test.ts`'s `ECONOMY_PACK_ID` /
// `MAINTENANCE_PACK_ID` constants by hand — same duplication rationale as
// `PLAYWRIGHT_PACK_IDS` above.
const JEST_PACK_IDS = ['economy-midcampaign', 'maintenance-repairbay'];

const KNOWN_PACK_IDS = [...PLAYWRIGHT_PACK_IDS, ...JEST_PACK_IDS];

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

  if (JEST_PACK_IDS.includes(packId)) {
    return runJestMint(packId, args.slice(1));
  }
  return runPlaywrightMint(packId, args.slice(1));
}

/** jest transport (mint-from-fast-forward, task 5.1) — see module doc. */
async function runJestMint(packId, extraArgs) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const npmArgs = [
    'test',
    '--',
    '--watchAll=false',
    '--runTestsByPath',
    'src/lib/scenarioPacks/__tests__/mintFastForwardPack.test.ts',
    '--runInBand',
    ...extraArgs,
  ];

  const child = spawn(npmCommand, npmArgs, {
    cwd: repoRoot,
    env: {
      ...process.env,
      MEKSTATION_MINT_FASTFORWARD_PACK_ID: packId,
    },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('error', (error) => {
    console.error(error);
    process.exit(1);
  });
  child.on('exit', (code, signal) => {
    process.exit(signal ? 1 : (code ?? 1));
  });
}

/** Playwright transport (flow-checkpoint + capture-matchlog, tasks 3.2/4.2) — see module doc. */
async function runPlaywrightMint(packId, extraArgs) {
  const runnerArgs = [
    path.join(repoRoot, 'scripts', 'playwright', 'run-playwright.mjs'),
    'test',
    // Registered ONLY when MEKSTATION_MINT_PACK_ID is set — the same
    // env-var-gated-project pattern `flow-audit` uses (playwright.config.ts).
    '--project=scenario-pack-mint',
    'e2e/scenario-pack-minting.spec.ts',
    '--workers=1',
    ...extraArgs,
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

#!/usr/bin/env npx tsx
/**
 * MekStation Simulation Runner
 *
 * Two operating modes:
 *
 *   Preset mode  (legacy, unchanged):
 *     npx tsx scripts/run-simulation.ts [--count=N] [--seed=N] [--preset=P] [--output=DIR]
 *
 *   Swarm mode  (Phase 5 — add-encounter-swarm-harness):
 *     npx tsx scripts/run-simulation.ts --config=<path.json> [overrides…]
 *
 * Swarm mode override flags (any of these may be combined with --config):
 *   --runs=N           Total simulations to run
 *   --seed=N           Base RNG seed (run i receives seed+i)
 *   --bv-budget=N      BV budget applied to BOTH sides (shorthand)
 *   --era=STR          Era year string, e.g. "3050"
 *   --tech-base=STR    "IS" | "Clan" | "Mixed"
 *   --ai-side-a=STR    AI variant for side A
 *   --ai-side-b=STR    AI variant for side B
 *   --pilots=STR             Pilot strategy: vault | template
 *   --pilot-skill-band=STR   Pilot skill band: green | regular | veteran | elite
 *   --map-radius=N     Hex grid radius
 *   --terrain-biome=S  Biome key (default "none")
 *   --output=PATH      Output file path for swarm-output JSON
 *
 * @spec openspec/changes/add-encounter-swarm-harness/specs/quick-session/spec.md
 * @design D9 (JSON config primary), D10 (sequential, no worker_threads)
 */

import * as fs from 'fs';
import * as path from 'path';

import type { UnitHydrationMap } from '../src/simulation/runner/SimulationRunnerState';
import type { IUnitIndexEntry } from '../src/types/unit/UnitIndex';

import { appendManifestEntry } from '../src/replay-library';
import { prewarmCatalogBV } from '../src/services/encounter/bvCatalogPrewarmer';
import { generateRandomForce } from '../src/services/encounter/randomForceGenerator';
import { generateRandomPilots } from '../src/services/encounter/randomPilotGenerator';
import {
  SwarmConfig,
  SwarmConfigSchema,
} from '../src/services/encounter/swarmConfigSchema';
import { getNodeCanonicalUnitService } from '../src/services/units/NodeCanonicalUnitService';
import {
  getBehaviorVariant,
  AIVariantName,
} from '../src/simulation/ai/behaviorVariants';
import { BotPlayer } from '../src/simulation/ai/BotPlayer';
import { SideKeyedAIPlayer } from '../src/simulation/ai/SideKeyedAIPlayer';
import { SeededRandom } from '../src/simulation/core/SeededRandom';
import { ISimulationConfig } from '../src/simulation/core/types';
import { STANDARD_LANCE } from '../src/simulation/generator/presets';
import { defaultTurnLimit } from '../src/simulation/generator/ScenarioGenerator';
import { createDefaultInvariantRunner } from '../src/simulation/invariants/createDefaultInvariantRunner';
import { MetricsCollector } from '../src/simulation/metrics/MetricsCollector';
import { ReportGenerator } from '../src/simulation/reporting/ReportGenerator';
import { BatchRunner } from '../src/simulation/runner/BatchRunner';
import { writeSwarmEventLog } from '../src/simulation/runner/eventLogPersistence';
import { SimulationRunner } from '../src/simulation/runner/SimulationRunner';
import { buildSwarmManifestEntry } from '../src/simulation/runner/swarmManifestEntry';
import { deriveSwarmUnitCounts } from '../src/simulation/runner/swarmUnitCounts';
import {
  IParticipant,
  ISimulationRunResult,
} from '../src/simulation/runner/types';
import {
  buildWeaponLookupFromCatalogFiles,
  hydrateAIWeaponsFromFullUnit,
  type IHydratedUnitData,
} from '../src/simulation/runner/UnitHydration';
import { SnapshotManager } from '../src/simulation/snapshot/SnapshotManager';
import { PilotSkillTemplate } from '../src/types/encounter/EncounterInterfaces';
import { GameSide } from '../src/types/gameplay';
import { WEAPON_CATALOG_FILES } from '../src/utils/construction/equipmentBVCatalogData';

// =============================================================================
// Preset mode (legacy path)
// =============================================================================

function parseArgs(): {
  count: number;
  seed: number;
  preset: string;
  outputDir: string;
} {
  const args = process.argv.slice(2);

  let count = 10;
  let seed = Date.now();
  let preset = 'standard';
  let outputDir = 'simulation-reports';

  for (const arg of args) {
    if (arg.startsWith('--count=')) {
      count = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--seed=')) {
      seed = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--preset=')) {
      preset = arg.split('=')[1];
    } else if (arg.startsWith('--output=')) {
      outputDir = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return { count, seed, preset, outputDir };
}

function printHelp(): void {
  console.log(`
MekStation Simulation Runner

Usage: npx tsx scripts/run-simulation.ts [options]

Preset mode (legacy):
  --count=N     Number of simulations to run (default: 10)
  --seed=N      Base random seed (default: current timestamp)
  --preset=P    Scenario preset: standard, light, stress (default: standard)
  --output=DIR  Output directory for reports (default: simulation-reports)
  --help, -h    Show this help message

Swarm mode (Phase 5):
  --config=PATH        Path to JSON swarm config file (enables swarm mode)
  --runs=N             Override: total simulation count
  --seed=N             Override: base RNG seed
  --bv-budget=N        Override: BV budget for both sides
  --era=STR            Override: era year filter (e.g. "3050")
  --tech-base=STR      Override: tech base filter (IS | Clan | Mixed)
  --ai-side-a=STR      Override: AI variant for side A
  --ai-side-b=STR      Override: AI variant for side B
  --pilots=STR             Override: pilot strategy (vault|template)
  --pilot-skill-band=STR   Override: pilot skill band (green|regular|veteran|elite)
  --map-radius=N       Override: hex grid radius
  --terrain-biome=STR  Override: terrain biome key
  --output=PATH        Override: output JSON file path

Examples:
  npx tsx scripts/run-simulation.ts --count=100 --seed=12345
  npx tsx scripts/run-simulation.ts --preset=light --count=50
  npx tsx scripts/run-simulation.ts --config=scripts/swarm-configs/duel-3kbv-temperate.json
  npx tsx scripts/run-simulation.ts --config=scripts/swarm-configs/duel-3kbv-temperate.json --runs=50
`);
}

function getPresetConfig(preset: string, seed: number): ISimulationConfig {
  switch (preset) {
    case 'light':
      return {
        seed,
        turnLimit: 10,
        unitCount: { player: 2, opponent: 2 },
        mapRadius: 5,
      };
    case 'stress':
      return {
        seed,
        turnLimit: 50,
        unitCount: { player: 4, opponent: 4 },
        mapRadius: 10,
      };
    case 'standard':
    default:
      return { ...STANDARD_LANCE, seed };
  }
}

// =============================================================================
// Swarm mode (Phase 5)
// =============================================================================

/**
 * Raw override values extracted from CLI flags when --config is present.
 * Each field maps to a top-level or per-side SwarmConfig key.
 */
interface SwarmOverrides {
  runs?: number;
  seed?: number;
  bvBudget?: number;
  era?: string;
  techBase?: string;
  aiSideA?: string;
  aiSideB?: string;
  /**
   * Pilot strategy override (`--pilots=<vault|template>`). Per spec, this flag
   * controls how pilots are generated; the skill band lives on a separate flag.
   */
  pilotStrategy?: string;
  /** Pilot skill band override (`--pilot-skill-band=<green|regular|veteran|elite>`). */
  pilotSkillBand?: string;
  mapRadius?: number;
  terrainBiome?: string;
  output?: string;
}

/**
 * Parse the raw CLI args for swarm mode overrides.
 * Returns the config file path (or undefined) plus any override values found.
 */
function parseSwarmArgs(): {
  configPath: string | undefined;
  overrides: SwarmOverrides;
} {
  const args = process.argv.slice(2);
  let configPath: string | undefined;
  const overrides: SwarmOverrides = {};

  for (const arg of args) {
    if (arg.startsWith('--config=')) {
      configPath = arg.split('=').slice(1).join('=');
    } else if (arg.startsWith('--runs=')) {
      const n = parseInt(arg.split('=')[1], 10);
      if (!isNaN(n)) overrides.runs = n;
    } else if (arg.startsWith('--seed=')) {
      const n = parseInt(arg.split('=')[1], 10);
      if (!isNaN(n)) overrides.seed = n;
    } else if (arg.startsWith('--bv-budget=')) {
      const n = parseInt(arg.split('=')[1], 10);
      if (!isNaN(n)) overrides.bvBudget = n;
    } else if (arg.startsWith('--era=')) {
      overrides.era = arg.split('=').slice(1).join('=');
    } else if (arg.startsWith('--tech-base=')) {
      overrides.techBase = arg.split('=').slice(1).join('=');
    } else if (arg.startsWith('--ai-side-a=')) {
      overrides.aiSideA = arg.split('=').slice(1).join('=');
    } else if (arg.startsWith('--ai-side-b=')) {
      overrides.aiSideB = arg.split('=').slice(1).join('=');
    } else if (arg.startsWith('--pilot-skill-band=')) {
      overrides.pilotSkillBand = arg.split('=').slice(1).join('=');
    } else if (arg.startsWith('--pilots=')) {
      overrides.pilotStrategy = arg.split('=').slice(1).join('=');
    } else if (arg.startsWith('--map-radius=')) {
      const n = parseInt(arg.split('=')[1], 10);
      if (!isNaN(n)) overrides.mapRadius = n;
    } else if (arg.startsWith('--terrain-biome=')) {
      overrides.terrainBiome = arg.split('=').slice(1).join('=');
    } else if (arg.startsWith('--output=')) {
      overrides.output = arg.split('=').slice(1).join('=');
    }
  }

  return { configPath, overrides };
}

/**
 * Load and parse the JSON config file, then apply CLI overrides on top.
 * Overrides take precedence over config-file values (D9).
 */
function loadSwarmConfig(
  configPath: string,
  overrides: SwarmOverrides,
): SwarmConfig {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    throw new Error(`Failed to read swarm config at "${configPath}": ${err}`);
  }

  // Validate base config via Zod
  const parsed = SwarmConfigSchema.parse(raw);

  // Apply CLI overrides — each override replaces the config-file value when present
  const merged: SwarmConfig = {
    ...parsed,
    runs: overrides.runs ?? parsed.runs,
    seed: overrides.seed ?? parsed.seed,
    mapRadius: overrides.mapRadius ?? parsed.mapRadius,
    terrainBiome: overrides.terrainBiome ?? parsed.terrainBiome,
    output: overrides.output ?? parsed.output,
    sideA: {
      ...parsed.sideA,
      bvBudget: overrides.bvBudget ?? parsed.sideA.bvBudget,
      era: overrides.era ?? parsed.sideA.era,
      techBase:
        (overrides.techBase as SwarmConfig['sideA']['techBase']) ??
        parsed.sideA.techBase,
      aiVariant:
        (overrides.aiSideA as SwarmConfig['sideA']['aiVariant']) ??
        parsed.sideA.aiVariant,
      pilotStrategy:
        (overrides.pilotStrategy as SwarmConfig['sideA']['pilotStrategy']) ??
        parsed.sideA.pilotStrategy,
      pilotSkillBand:
        (overrides.pilotSkillBand as SwarmConfig['sideA']['pilotSkillBand']) ??
        parsed.sideA.pilotSkillBand,
    },
    sideB: {
      ...parsed.sideB,
      bvBudget: overrides.bvBudget ?? parsed.sideB.bvBudget,
      era: overrides.era ?? parsed.sideB.era,
      techBase:
        (overrides.techBase as SwarmConfig['sideB']['techBase']) ??
        parsed.sideB.techBase,
      aiVariant:
        (overrides.aiSideB as SwarmConfig['sideB']['aiVariant']) ??
        parsed.sideB.aiVariant,
      pilotStrategy:
        (overrides.pilotStrategy as SwarmConfig['sideB']['pilotStrategy']) ??
        parsed.sideB.pilotStrategy,
      pilotSkillBand:
        (overrides.pilotSkillBand as SwarmConfig['sideB']['pilotSkillBand']) ??
        parsed.sideB.pilotSkillBand,
    },
  };

  return merged;
}

/**
 * Map the pilotSkillBand string from SwarmSideConfig to the PilotSkillTemplate
 * enum value that generateRandomPilots expects.
 */
function pilotSkillBandToTemplate(
  band: SwarmConfig['sideA']['pilotSkillBand'],
): PilotSkillTemplate {
  switch (band) {
    case 'green':
      return PilotSkillTemplate.Green;
    case 'veteran':
      return PilotSkillTemplate.Veteran;
    case 'elite':
      return PilotSkillTemplate.Elite;
    case 'regular':
    default:
      return PilotSkillTemplate.Regular;
  }
}

/**
 * Swarm output envelope — schemaVersion:2 wrapper written to --output path.
 */
interface ISwarmOutputFile {
  readonly schemaVersion: 2;
  /** Resolved config used for this batch (after overrides applied). */
  readonly config: SwarmConfig;
  /** All run results in order (schemaVersion:2, each carries participants[]). */
  readonly runs: readonly ISimulationRunResult[];
  /**
   * Per `add-always-on-event-log` Phase 2: directory containing one
   * `<gameId>.jsonl` per encounter. All games of one CLI invocation
   * share this directory; the slug is the invocation-start ISO
   * timestamp.
   */
  readonly eventLogDir: string;
}

/**
 * Build the runner's `UnitHydrationMap` from the swarm's per-side
 * participants. Keys are the runner-internal IDs the runner generates
 * inside `createSideUnits` — `player-${1..N}` for side A,
 * `opponent-${1..N}` for side B. The participants array MUST be
 * 1-indexed in side order (which it is — the swarm builds side A
 * first, then side B).
 *
 * Each `IFullUnit` is fetched via the cached
 * `NodeCanonicalUnitService.getById`. A null result (catalog miss) is
 * treated as a fatal error — the random force generator only selects
 * unitIds that exist in the catalog index, so a miss here is a bug.
 */
async function buildSwarmHydration(
  participantsA: readonly IParticipant[],
  participantsB: readonly IParticipant[],
  catalogService: ReturnType<typeof getNodeCanonicalUnitService>,
  weaponLookup: ReturnType<typeof buildWeaponLookupFromCatalogFiles>,
): Promise<UnitHydrationMap> {
  const map = new Map<string, IHydratedUnitData>();

  // Side A → `player-1`, `player-2`, ...
  for (let idx = 0; idx < participantsA.length; idx++) {
    const participant = participantsA[idx];
    const fullUnit = await catalogService.getById(participant.unitId);
    if (!fullUnit) {
      throw new Error(
        `Catalog miss for participant unitId="${participant.unitId}" — ` +
          `random force generator selected an id not present in NodeCanonicalUnitService`,
      );
    }
    const runnerUnitId = `player-${idx + 1}`;
    const aiWeapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    map.set(runnerUnitId, {
      runnerUnitId,
      side: GameSide.Player,
      // Position is overridden by `createSideUnits` per the runner's spawn
      // formation; placeholder here keeps the IHydratedUnitData type happy.
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons,
      gunnery: participant.gunnery,
      piloting: participant.piloting,
    });
  }

  // Side B → `opponent-1`, `opponent-2`, ...
  for (let idx = 0; idx < participantsB.length; idx++) {
    const participant = participantsB[idx];
    const fullUnit = await catalogService.getById(participant.unitId);
    if (!fullUnit) {
      throw new Error(
        `Catalog miss for participant unitId="${participant.unitId}" — ` +
          `random force generator selected an id not present in NodeCanonicalUnitService`,
      );
    }
    const runnerUnitId = `opponent-${idx + 1}`;
    const aiWeapons = hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup);
    map.set(runnerUnitId, {
      runnerUnitId,
      side: GameSide.Opponent,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons,
      gunnery: participant.gunnery,
      piloting: participant.piloting,
    });
  }

  return map;
}

/**
 * Run the swarm simulation batch loop.
 *
 * Per D10: sequential only — no worker_threads. Each iteration:
 *   1. Derive run seed = config.seed + i.
 *   2. Instantiate SeededRandom(runSeed) for force/pilot generation.
 *   3. Generate random forces for sideA and sideB.
 *   4. Generate pilots for each side.
 *   5. Build IParticipant[] from force assignments + pilot skill values.
 *   6. Construct SideKeyedAIPlayer factory.
 *   7. Call BatchRunner.runBatch(1, simConfig, undefined, participants).
 *   8. Collect result.
 */
async function runSwarmMode(
  config: SwarmConfig,
  configPath: string,
): Promise<void> {
  console.log('='.repeat(60));
  console.log('MekStation Swarm Runner (Phase 5)');
  console.log('='.repeat(60));
  console.log(`Runs:          ${config.runs}`);
  console.log(`Base seed:     ${config.seed}`);
  console.log(`Map radius:    ${config.mapRadius}`);
  console.log(`Terrain biome: ${config.terrainBiome}`);
  console.log(
    `Side A — BV: ${config.sideA.bvBudget}, units: ${config.sideA.unitCount}, AI: ${config.sideA.aiVariant}, pilots: ${config.sideA.pilotSkillBand}`,
  );
  console.log(
    `Side B — BV: ${config.sideB.bvBudget}, units: ${config.sideB.unitCount}, AI: ${config.sideB.aiVariant}, pilots: ${config.sideB.pilotSkillBand}`,
  );
  console.log(`Output:        ${config.output}`);
  console.log('='.repeat(60));

  // Load catalog index once — NodeCanonicalUnitService caches after first read.
  console.log('\nLoading unit catalog...');
  const catalogService = getNodeCanonicalUnitService();
  const rawCatalog: readonly IUnitIndexEntry[] =
    await catalogService.getIndex();
  console.log(`  Loaded ${rawCatalog.length} units.`);

  // The on-disk catalog does NOT store precomputed BV — bvAdapter computes
  // it at runtime. randomForceGenerator filters on `entry.bv`, so we must
  // prewarm BV before the run loop or every entry looks like 0 BV and the
  // budget sanity check rejects everything (BudgetUnsatisfiableError).
  // First run is slow (~5–15s); subsequent runs hit the disk cache.
  console.log('Prewarming Battle Value cache...');
  const prewarmStart = Date.now();
  const prewarmResult = await prewarmCatalogBV(
    rawCatalog,
    catalogService,
    catalogService.getCatalogVersion(),
    {
      onProgress: (processed, total) => {
        // Inline carriage-return progress so we don't spam the log.
        process.stdout.write(`  ${processed}/${total} units processed\r`);
      },
    },
  );
  const prewarmMs = Date.now() - prewarmStart;
  process.stdout.write('\n');
  console.log(
    `  ${prewarmResult.populated} units have BV, ${prewarmResult.skipped} skipped ` +
      `(${prewarmResult.fromCache ? 'cache hit' : `cold rebuild in ${prewarmMs}ms`}).`,
  );
  const catalog = prewarmResult.catalog;

  // Validate AI variant names upfront so we fail fast before the loop.
  getBehaviorVariant(config.sideA.aiVariant as AIVariantName);
  getBehaviorVariant(config.sideB.aiVariant as AIVariantName);

  // Per `add-always-on-event-log` Phase 1: build the synchronous weapon
  // lookup once per CLI invocation. The catalog files are static JSON
  // imports so this is a pure data transform — re-running it inside the
  // loop is wasted allocation. The same `WeaponLookup` reference is
  // reused across every per-participant `hydrateAIWeaponsFromFullUnit`
  // call below.
  const weaponLookup = buildWeaponLookupFromCatalogFiles(
    WEAPON_CATALOG_FILES as readonly { items?: readonly unknown[] }[],
  );

  // Per `add-replay-library` PR 4 (replay-library spec — Filesystem Partition
  // Layout; quick-session spec — Per-Game Event Log Persistence MODIFIED):
  // event logs now live under `simulation-reports/swarm/<gameId>.jsonl`
  // (replaces the legacy flat `simulation-reports/games/<run-timestamp>/`
  // layout). The per-invocation timestamp is preserved as `batchTimestamp`
  // metadata on each manifest entry so consumers can still group runs by
  // CLI invocation. Pre-existing files at the legacy path remain readable
  // by the backfill scan from PR 3 — no destructive migration.
  const batchTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const swarmEventLogDir = path.resolve('simulation-reports', 'swarm');
  // Derive the canonical config name once so every manifest entry built in
  // the per-run loop uses the same value. `path.basename(p, ext)` strips
  // the `.json` suffix from `scripts/swarm-configs/duel-3kbv-temperate.json`.
  const configName = path.basename(configPath, path.extname(configPath));

  const batchRunner = new BatchRunner();
  const allResults: ISimulationRunResult[] = [];

  console.log(`\nRunning ${config.runs} simulation(s)...`);
  const startTime = Date.now();

  for (let i = 0; i < config.runs; i++) {
    const runSeed = config.seed + i;
    // Separate RNG for force/pilot generation vs simulation so they don't
    // interfere with each other's deterministic sequences.
    const forceRandom = new SeededRandom(runSeed);

    // --- Generate forces ---
    const forceA = generateRandomForce({
      bvBudget: config.sideA.bvBudget,
      count: config.sideA.unitCount,
      sideId: 'player',
      random: forceRandom,
      catalog,
      tonnageMin: config.sideA.tonnageMin,
      tonnageMax: config.sideA.tonnageMax,
      era: config.sideA.era,
      techBase: config.sideA.techBase,
    });

    const forceB = generateRandomForce({
      bvBudget: config.sideB.bvBudget,
      count: config.sideB.unitCount,
      sideId: 'opfor',
      random: forceRandom,
      catalog,
      tonnageMin: config.sideB.tonnageMin,
      tonnageMax: config.sideB.tonnageMax,
      era: config.sideB.era,
      techBase: config.sideB.techBase,
    });

    // --- Derive ACTUAL per-side unit counts from the generated forces ---
    // Per audit 2026-06-09 E-8: generateRandomForce may retry at count+1
    // (PT-010 widening) or fill short of count, so everything downstream —
    // pilot generation, simConfig.unitCount, and (transitively) the runner's
    // `player-${1..N}` / `opponent-${1..N}` unit creation — derives from
    // assignments.length, NOT the configured counts. Otherwise the runner
    // fields fewer units than participants[] describes (phantom
    // participants) and bvTotal includes BV that never fielded.
    const actualUnitCounts = deriveSwarmUnitCounts(forceA, forceB);

    // --- Generate pilots ---
    const pilotsA = generateRandomPilots({
      count: actualUnitCounts.player,
      strategy:
        config.sideA.pilotStrategy === 'vault'
          ? 'vault-sample'
          : 'template-synthesis',
      random: forceRandom,
      skillTemplate: pilotSkillBandToTemplate(config.sideA.pilotSkillBand),
      namePrefix: 'Player',
    });

    const pilotsB = generateRandomPilots({
      count: actualUnitCounts.opponent,
      strategy:
        config.sideB.pilotStrategy === 'vault'
          ? 'vault-sample'
          : 'template-synthesis',
      random: forceRandom,
      skillTemplate: pilotSkillBandToTemplate(config.sideB.pilotSkillBand),
      namePrefix: 'Opfor',
    });

    // --- Build IParticipant[] ---
    // forceA.assignments are the selected units; match with synthesized pilots by index.
    const participantsA: IParticipant[] = forceA.assignments.map(
      (assignment, idx) => {
        const unitEntry = catalog.find((e) => e.id === assignment.unitId);
        const pilot = pilotsA.pilots[idx];
        return {
          sideId: 'player',
          unitId: assignment.unitId,
          chassisId: unitEntry?.chassis ?? assignment.unitId,
          pilotId: pilot?.id ?? `synth-${i}-a-${idx}`,
          gunnery: pilot?.skills.gunnery ?? 4,
          piloting: pilot?.skills.piloting ?? 5,
          aiVariant: config.sideA.aiVariant,
        };
      },
    );

    const participantsB: IParticipant[] = forceB.assignments.map(
      (assignment, idx) => {
        const unitEntry = catalog.find((e) => e.id === assignment.unitId);
        const pilot = pilotsB.pilots[idx];
        return {
          sideId: 'opfor',
          unitId: assignment.unitId,
          chassisId: unitEntry?.chassis ?? assignment.unitId,
          pilotId: pilot?.id ?? `synth-${i}-b-${idx}`,
          gunnery: pilot?.skills.gunnery ?? 4,
          piloting: pilot?.skills.piloting ?? 5,
          aiVariant: config.sideB.aiVariant,
        };
      },
    );

    const participants: readonly IParticipant[] = [
      ...participantsA,
      ...participantsB,
    ];

    // --- Build hydration map keyed by runner-internal IDs ---
    // Per `add-always-on-event-log` Phase 1: the runner generates IDs as
    // `player-${1..N}` for side A and `opponent-${1..N}` for side B (see
    // `SimulationRunnerState.createSideUnits`). The participants array
    // order must match — side A first, then side B, both 1-indexed. We
    // resolve each `IFullUnit` synchronously via the same
    // `getNodeCanonicalUnitService()` instance the swarm already uses
    // (catalog reads are cached after the first run).
    const hydration: UnitHydrationMap = await buildSwarmHydration(
      participantsA,
      participantsB,
      catalogService,
      weaponLookup,
    );

    // --- Build per-side AI player via SideKeyedAIPlayer ---
    const behaviorA = getBehaviorVariant(
      config.sideA.aiVariant as AIVariantName,
    );
    const behaviorB = getBehaviorVariant(
      config.sideB.aiVariant as AIVariantName,
    );

    // Factory is called once per SimulationRunner.run() — SideKeyedAIPlayer
    // wraps two BotPlayer instances and dispatches by unitId prefix.
    // The `behavior` argument passed by SimulationRunner (DEFAULT_BEHAVIOR) is
    // intentionally ignored; we use the per-side variant from config instead.
    const aiFactory = (random: SeededRandom) =>
      new SideKeyedAIPlayer(
        new BotPlayer(random, behaviorA),
        new BotPlayer(random, behaviorB),
      );

    // --- Build ISimulationConfig ---
    // unitCount must match the actual force sizes — `actualUnitCounts` is
    // derived from assignments.length above (audit E-8), so the runner
    // fields exactly the units that participants[] / hydration describe.
    //
    // Per `polish-wave-6.2-gaps` (gap #12, closes PT-003): swarm runs no
    // longer hardcode `turnLimit: 50`. The default scales by map radius so
    // r20 maps don't draw at turn 50 before forces engage. Callers that
    // want a fixed turn limit can override via swarm config (future work).
    const simConfig: ISimulationConfig = {
      seed: runSeed,
      turnLimit: defaultTurnLimit(config.mapRadius),
      unitCount: actualUnitCounts,
      mapRadius: config.mapRadius,
    };

    // --- Run single simulation with this run's participants ---
    // BatchRunner does not support per-run aiFactory injection, so we use
    // SimulationRunner directly here. The aiFactory is injected via the
    // constructor so the SideKeyedAIPlayer routes by unitId prefix.
    // The 2nd positional arg wires the default invariant runner (audit
    // E-7) so the three registered state invariants actually execute each
    // turn — without it the runner defaults to an EMPTY InvariantRunner
    // and the "Total Violations" exit gate below can never fire.
    // The 6th positional `hydration` arg routes the runner away from the
    // synthetic single-medium-laser fallback at `createMinimalUnitState`
    // and into real catalog armor / structure / multi-mount AI weapons
    // (per `add-always-on-event-log` Phase 1, building on the P1 contract
    // in archived `add-combat-fidelity-suite`).
    const runner = new SimulationRunner(
      runSeed,
      createDefaultInvariantRunner(),
      undefined,
      aiFactory,
      undefined,
      hydration,
    );
    const rawResult = runner.run(simConfig);
    const stamped: ISimulationRunResult = {
      ...rawResult,
      schemaVersion: 2,
      participants,
    };

    // Per `add-replay-library` PR 4: persist this game's full event log to
    // `simulation-reports/swarm/<gameId>.jsonl` (partitioned layout) and
    // append an `ISwarmReplayManifestEntry` to the central
    // `simulation-reports/replay-index.json` so the in-app Replay Library
    // can list it without filename archaeology. Sequential (no `Promise.all`)
    // so file writes land in run order. `gameId` is canonically `sim-${seed}`
    // per `SimulationRunner.run` — match that here so the file basename
    // equals every event's `gameId` field (Phase 2 spec scenario).
    const eventGameId = rawResult.events[0]?.gameId ?? `sim-${runSeed}`;
    await writeSwarmEventLog(eventGameId, rawResult.events);

    // Manifest entry — derived from the event log + the per-run metadata
    // the events themselves don't carry (configName, runSeed, batch timestamp).
    // BV total comes from the generated forces' `stats.totalBV` (Momus MUST
    // RESOLVE #1: `IGameUnit` has no `bv` field for cheap access; the swarm
    // runner already has the actual fielded BV from force generation, so we
    // thread it in instead of re-summing on read).
    const manifestEntry = buildSwarmManifestEntry({
      gameId: eventGameId,
      runSeed,
      configName,
      batchTimestamp,
      events: rawResult.events,
      bvTotal: forceA.stats.totalBV + forceB.stats.totalBV,
      createdAt: new Date().toISOString(),
    });
    await appendManifestEntry(manifestEntry);

    allResults.push(stamped);

    // Progress indicator every 10% or at minimum every 10 runs.
    if (
      (i + 1) % Math.max(1, Math.floor(config.runs / 10)) === 0 ||
      i + 1 === config.runs
    ) {
      const pct = Math.round(((i + 1) / config.runs) * 100);
      process.stdout.write(`\r  Progress: ${pct}% (${i + 1}/${config.runs})`);
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(`\r  Progress: 100% (${config.runs}/${config.runs})    `);
  console.log(
    `\nCompleted in ${elapsed}ms (${(elapsed / config.runs).toFixed(2)}ms per simulation)`,
  );

  // --- Write output JSON ---
  const output: ISwarmOutputFile = {
    schemaVersion: 2,
    config,
    runs: allResults,
    eventLogDir: swarmEventLogDir,
  };

  const outputPath = config.output;
  const outputDir = path.dirname(outputPath);
  if (outputDir && outputDir !== '.' && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  // --- Summary ---
  let playerWins = 0;
  let opponentWins = 0;
  let draws = 0;
  let incomplete = 0;
  let totalTurns = 0;
  let totalViolations = 0;

  for (const r of allResults) {
    totalTurns += r.turns;
    totalViolations += r.violations.length;
    if (r.winner === 'player') playerWins++;
    else if (r.winner === 'opponent') opponentWins++;
    else if (r.winner === 'draw') draws++;
    else incomplete++;
  }

  const n = allResults.length || 1;
  console.log('\n' + '-'.repeat(60));
  console.log('Results Summary');
  console.log('-'.repeat(60));
  console.log(`Total Runs:       ${allResults.length}`);
  console.log(
    `Player Wins:      ${playerWins} (${((playerWins / n) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Opponent Wins:    ${opponentWins} (${((opponentWins / n) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Draws:            ${draws} (${((draws / n) * 100).toFixed(1)}%)`,
  );
  console.log(`Incomplete:       ${incomplete}`);
  console.log(`Average Turns:    ${(totalTurns / n).toFixed(1)}`);
  console.log(`Total Violations: ${totalViolations}`);
  console.log('-'.repeat(60));
  console.log(`Output written:   ${outputPath}`);
  console.log(
    `Event logs:       ${swarmEventLogDir} (batch ${batchTimestamp})`,
  );
  console.log('-'.repeat(60));

  process.exit(totalViolations > 0 ? 1 : 0);
}

// =============================================================================
// Legacy preset mode runner (unchanged)
// =============================================================================

async function runPresetMode(): Promise<void> {
  const { count, seed, preset, outputDir } = parseArgs();
  const config = getPresetConfig(preset, seed);

  console.log('='.repeat(60));
  console.log('MekStation Simulation Runner');
  console.log('='.repeat(60));
  console.log(`Simulations: ${count}`);
  console.log(`Base Seed:   ${seed}`);
  console.log(`Preset:      ${preset}`);
  console.log(`Output Dir:  ${outputDir}`);
  console.log(
    `Config:      ${config.unitCount.player}v${config.unitCount.opponent}, ${config.turnLimit} turn limit, radius ${config.mapRadius}`,
  );
  console.log('='.repeat(60));

  const batchRunner = new BatchRunner();
  const metricsCollector = new MetricsCollector();
  const snapshotManager = new SnapshotManager();

  console.log('\nRunning simulations...');
  const startTime = Date.now();

  let lastProgress = 0;
  // 5th arg wires the default invariant runner (audit E-7) so preset-mode
  // batches actually execute the registered state invariants — previously
  // BatchRunner constructed SimulationRunner with no invariant runner and
  // the violation exit gate below could never fire.
  const results = batchRunner.runBatch(
    count,
    config,
    (current, total) => {
      const progress = Math.floor((current / total) * 100);
      if (progress >= lastProgress + 10) {
        process.stdout.write(
          `\r  Progress: ${progress}% (${current}/${total})`,
        );
        lastProgress = progress;
      }
    },
    undefined,
    createDefaultInvariantRunner(),
  );

  const elapsed = Date.now() - startTime;
  console.log(`\r  Progress: 100% (${count}/${count})    `);
  console.log(
    `\nCompleted in ${elapsed}ms (${(elapsed / count).toFixed(2)}ms per simulation)`,
  );

  let failedCount = 0;
  for (const result of results) {
    metricsCollector.recordGame(result);

    if (result.violations.length > 0) {
      failedCount++;
      snapshotManager.saveFailedScenario(result, {
        ...config,
        seed: result.seed,
      });
    }
  }

  const aggregate = metricsCollector.getAggregate();

  console.log('\n' + '-'.repeat(60));
  console.log('Results Summary');
  console.log('-'.repeat(60));
  console.log(`Total Games:      ${aggregate.totalGames}`);
  console.log(
    `Player Wins:      ${aggregate.playerWins} (${aggregate.playerWinRate.toFixed(1)}%)`,
  );
  console.log(
    `Opponent Wins:    ${aggregate.opponentWins} (${aggregate.opponentWinRate.toFixed(1)}%)`,
  );
  console.log(
    `Draws:            ${aggregate.draws} (${aggregate.drawRate.toFixed(1)}%)`,
  );
  console.log(`Incomplete:       ${aggregate.incompleteGames}`);
  console.log(`Average Turns:    ${aggregate.avgTurns.toFixed(1)}`);
  console.log(`Total Violations: ${aggregate.totalViolations}`);
  console.log(`Failed Scenarios: ${failedCount}`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(
    outputDir,
    `simulation-report-${timestamp}.json`,
  );

  const reportGenerator = new ReportGenerator();
  reportGenerator.saveTo(
    metricsCollector.getMetrics(),
    aggregate,
    config,
    reportPath,
  );

  console.log('\n' + '-'.repeat(60));
  console.log(`Report saved: ${reportPath}`);

  if (failedCount > 0) {
    console.log(`Snapshots saved to: src/simulation/__snapshots__/failed/`);
  }

  console.log('-'.repeat(60));

  const exitCode = aggregate.totalViolations > 0 ? 1 : 0;
  process.exit(exitCode);
}

// =============================================================================
// Entry point — detect swarm mode vs preset mode
// =============================================================================

async function main(): Promise<void> {
  const { configPath, overrides } = parseSwarmArgs();

  if (configPath !== undefined) {
    // Swarm mode: --config was supplied
    const config = loadSwarmConfig(configPath, overrides);
    await runSwarmMode(config, configPath);
  } else {
    // Preset mode: legacy behavior unchanged
    await runPresetMode();
  }
}

main().catch((error) => {
  console.error('Simulation failed:', error);
  process.exit(1);
});

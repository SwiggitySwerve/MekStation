import * as fs from 'fs';
import * as path from 'path';

import type { UnitHydrationMap } from '../src/simulation/runner/SimulationRunnerState';
import type { IUnitIndexEntry } from '../src/types/unit/UnitIndex';

import { appendManifestEntry } from '../src/replay-library';
import { prewarmCatalogBV } from '../src/services/encounter/bvCatalogPrewarmer';
import { generateRandomForce } from '../src/services/encounter/randomForceGenerator';
import { generateRandomPilots } from '../src/services/encounter/randomPilotGenerator';
import { SwarmConfig } from '../src/services/encounter/swarmConfigSchema';
import { getNodeCanonicalUnitService } from '../src/services/units/NodeCanonicalUnitService';
import {
  getBehaviorVariant,
  AIVariantName,
} from '../src/simulation/ai/behaviorVariants';
import { BotPlayer } from '../src/simulation/ai/BotPlayer';
import { SideKeyedAIPlayer } from '../src/simulation/ai/SideKeyedAIPlayer';
import { SeededRandom } from '../src/simulation/core/SeededRandom';
import { ISimulationConfig } from '../src/simulation/core/types';
import { defaultTurnLimit } from '../src/simulation/generator/ScenarioGenerator';
import { createDefaultInvariantRunner } from '../src/simulation/invariants/createDefaultInvariantRunner';
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
import { GameSide } from '../src/types/gameplay';
import { WEAPON_CATALOG_FILES } from '../src/utils/construction/equipmentBVCatalogData';
import { pilotSkillBandToTemplate } from './run-simulation-cli';

interface ISwarmOutputFile {
  readonly schemaVersion: 2;
  readonly config: SwarmConfig;
  readonly runs: readonly ISimulationRunResult[];
  readonly eventLogDir: string;
}

export async function buildSwarmHydration(
  participantsA: readonly IParticipant[],
  participantsB: readonly IParticipant[],
  catalogService: ReturnType<typeof getNodeCanonicalUnitService>,
  weaponLookup: ReturnType<typeof buildWeaponLookupFromCatalogFiles>,
): Promise<UnitHydrationMap> {
  const map = new Map<string, IHydratedUnitData>();

  for (let idx = 0; idx < participantsA.length; idx++) {
    const participant = participantsA[idx];
    const fullUnit = await catalogService.getById(participant.unitId);
    if (!fullUnit) {
      throw new Error(
        `Catalog miss for participant unitId="${participant.unitId}" - ` +
          `random force generator selected an id not present in NodeCanonicalUnitService`,
      );
    }
    const runnerUnitId = `player-${idx + 1}`;
    map.set(runnerUnitId, {
      runnerUnitId,
      side: GameSide.Player,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons: hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup),
      gunnery: participant.gunnery,
      piloting: participant.piloting,
    });
  }

  for (let idx = 0; idx < participantsB.length; idx++) {
    const participant = participantsB[idx];
    const fullUnit = await catalogService.getById(participant.unitId);
    if (!fullUnit) {
      throw new Error(
        `Catalog miss for participant unitId="${participant.unitId}" - ` +
          `random force generator selected an id not present in NodeCanonicalUnitService`,
      );
    }
    const runnerUnitId = `opponent-${idx + 1}`;
    map.set(runnerUnitId, {
      runnerUnitId,
      side: GameSide.Opponent,
      position: { q: 0, r: 0 },
      fullUnit,
      aiWeapons: hydrateAIWeaponsFromFullUnit(fullUnit, weaponLookup),
      gunnery: participant.gunnery,
      piloting: participant.piloting,
    });
  }

  return map;
}

export async function runSwarmMode(
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
    `Side A - BV: ${config.sideA.bvBudget}, units: ${config.sideA.unitCount}, AI: ${config.sideA.aiVariant}, pilots: ${config.sideA.pilotSkillBand}`,
  );
  console.log(
    `Side B - BV: ${config.sideB.bvBudget}, units: ${config.sideB.unitCount}, AI: ${config.sideB.aiVariant}, pilots: ${config.sideB.pilotSkillBand}`,
  );
  console.log(`Output:        ${config.output}`);
  console.log('='.repeat(60));

  console.log('\nLoading unit catalog...');
  const catalogService = getNodeCanonicalUnitService();
  const rawCatalog: readonly IUnitIndexEntry[] =
    await catalogService.getIndex();
  console.log(`  Loaded ${rawCatalog.length} units.`);

  console.log('Prewarming Battle Value cache...');
  const prewarmStart = Date.now();
  const prewarmResult = await prewarmCatalogBV(
    rawCatalog,
    catalogService,
    catalogService.getCatalogVersion(),
    {
      onProgress: (processed, total) => {
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

  getBehaviorVariant(config.sideA.aiVariant as AIVariantName);
  getBehaviorVariant(config.sideB.aiVariant as AIVariantName);

  const weaponLookup = buildWeaponLookupFromCatalogFiles(
    WEAPON_CATALOG_FILES as readonly { items?: readonly unknown[] }[],
  );
  const batchTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const swarmEventLogDir = path.resolve('simulation-reports', 'swarm');
  const configName = path.basename(configPath, path.extname(configPath));
  const allResults: ISimulationRunResult[] = [];

  console.log(`\nRunning ${config.runs} simulation(s)...`);
  const startTime = Date.now();

  for (let i = 0; i < config.runs; i++) {
    const runSeed = config.seed + i;
    const forceRandom = new SeededRandom(runSeed);

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

    const actualUnitCounts = deriveSwarmUnitCounts(forceA, forceB);

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
    const hydration = await buildSwarmHydration(
      participantsA,
      participantsB,
      catalogService,
      weaponLookup,
    );

    const behaviorA = getBehaviorVariant(
      config.sideA.aiVariant as AIVariantName,
    );
    const behaviorB = getBehaviorVariant(
      config.sideB.aiVariant as AIVariantName,
    );
    const aiFactory = (random: SeededRandom) =>
      new SideKeyedAIPlayer(
        new BotPlayer(random, behaviorA),
        new BotPlayer(random, behaviorB),
      );

    const simConfig: ISimulationConfig = {
      seed: runSeed,
      turnLimit: defaultTurnLimit(config.mapRadius),
      unitCount: actualUnitCounts,
      mapRadius: config.mapRadius,
    };

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

    const eventGameId = rawResult.events[0]?.gameId ?? `sim-${runSeed}`;
    await writeSwarmEventLog(eventGameId, rawResult.events);
    await appendManifestEntry(
      buildSwarmManifestEntry({
        gameId: eventGameId,
        runSeed,
        configName,
        batchTimestamp,
        events: rawResult.events,
        bvTotal: forceA.stats.totalBV + forceB.stats.totalBV,
        createdAt: new Date().toISOString(),
      }),
    );

    allResults.push(stamped);

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

  writeSwarmOutput(config, allResults, swarmEventLogDir);
  printSwarmSummary(config, allResults, swarmEventLogDir, batchTimestamp);
}

function writeSwarmOutput(
  config: SwarmConfig,
  allResults: readonly ISimulationRunResult[],
  swarmEventLogDir: string,
): void {
  const output: ISwarmOutputFile = {
    schemaVersion: 2,
    config,
    runs: allResults,
    eventLogDir: swarmEventLogDir,
  };
  const outputDir = path.dirname(config.output);
  if (outputDir && outputDir !== '.' && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(config.output, JSON.stringify(output, null, 2), 'utf-8');
}

function printSwarmSummary(
  config: SwarmConfig,
  allResults: readonly ISimulationRunResult[],
  swarmEventLogDir: string,
  batchTimestamp: string,
): void {
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
  console.log(`Output written:   ${config.output}`);
  console.log(
    `Event logs:       ${swarmEventLogDir} (batch ${batchTimestamp})`,
  );
  console.log('-'.repeat(60));

  process.exit(totalViolations > 0 ? 1 : 0);
}

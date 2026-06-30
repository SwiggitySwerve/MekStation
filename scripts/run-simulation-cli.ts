import * as fs from 'fs';

import {
  SwarmConfig,
  SwarmConfigSchema,
} from '../src/services/encounter/swarmConfigSchema';
import { ISimulationConfig } from '../src/simulation/core/types';
import { STANDARD_LANCE } from '../src/simulation/generator/presets';
import { PilotSkillTemplate } from '../src/types/encounter/EncounterInterfaces';

export interface PresetArgs {
  count: number;
  seed: number;
  preset: string;
  outputDir: string;
}

export interface SwarmOverrides {
  runs?: number;
  seed?: number;
  bvBudget?: number;
  era?: string;
  techBase?: string;
  aiSideA?: string;
  aiSideB?: string;
  pilotStrategy?: string;
  pilotSkillBand?: string;
  mapRadius?: number;
  terrainBiome?: string;
  output?: string;
}

export interface SwarmArgs {
  configPath: string | undefined;
  overrides: SwarmOverrides;
}

export function parsePresetArgs(args = process.argv.slice(2)): PresetArgs {
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

export function printHelp(): void {
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

export function getPresetConfig(
  preset: string,
  seed: number,
): ISimulationConfig {
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

export function parseSwarmArgs(args = process.argv.slice(2)): SwarmArgs {
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

export function loadSwarmConfig(
  configPath: string,
  overrides: SwarmOverrides,
): SwarmConfig {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    throw new Error(`Failed to read swarm config at "${configPath}": ${err}`);
  }

  const parsed = SwarmConfigSchema.parse(raw);

  return {
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
}

export function pilotSkillBandToTemplate(
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

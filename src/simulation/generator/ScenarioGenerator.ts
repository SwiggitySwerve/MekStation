import type {
  IMapPreset,
  IObjectiveMarker,
} from '@/types/scenario/ScenarioInterfaces';

import {
  IGameSession,
  IGameState,
  IGameConfig,
  IGameUnit,
  IUnitGameState,
  GamePhase,
  GameStatus,
  GameSide,
  LockState,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  IHexGrid,
  IHex,
  IHexCoordinate,
  Facing,
  MovementType,
} from '@/types/gameplay/HexGridInterfaces';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import {
  BiomeType,
  ScenarioObjectiveType,
} from '@/types/scenario/ScenarioInterfaces';
import {
  deriveObjectivePlacementConfig,
  placeObjectives,
} from '@/utils/gameplay/objectives';
import {
  type BiomeType as TerrainBiomeType,
  generateTerrainMap,
} from '@/utils/gameplay/terrainGenerator';

import { SeededRandom } from '../core/SeededRandom';
import { ISimulationConfig } from '../core/types';
import { WeightedTable } from '../core/WeightedTable';
import { UNIT_TEMPLATES } from './templates';
import { IUnitTemplate, DEFAULT_GENERATION_OPTIONS } from './types';

/**
 * Per `polish-wave-6.2-gaps` (gap #12, closes PT-003): the default turn
 * limit for a scenario scales with map radius so larger maps don't hit
 * the static 50-turn draw cap before forces can engage. r12 stays at 50
 * (max-pinned); r20 becomes 80; r25 becomes 100.
 *
 * Callers that need a fixed `turnLimit` continue to pass it through
 * `ISimulationConfig.turnLimit` directly — this helper is only consumed
 * at the boundary where a caller has no opinion (the swarm runner, the
 * quick-game default, etc.).
 */
export function defaultTurnLimit(mapRadius: number): number {
  return Math.max(50, mapRadius * 4);
}

export function createDefaultUnitWeights(): WeightedTable<IUnitTemplate> {
  const table = new WeightedTable<IUnitTemplate>();
  table.add(40, UNIT_TEMPLATES[0]);
  table.add(30, UNIT_TEMPLATES[1]);
  table.add(20, UNIT_TEMPLATES[2]);
  table.add(10, UNIT_TEMPLATES[3]);
  return table;
}

export function createDefaultTerrainWeights(): WeightedTable<string> {
  const table = new WeightedTable<string>();
  table.add(80, 'clear');
  table.add(10, 'light_woods');
  table.add(5, 'heavy_woods');
  table.add(5, 'rough');
  return table;
}

const TERRAIN_BIOME_BY_SCENARIO_BIOME: Readonly<
  Partial<Record<BiomeType, TerrainBiomeType>>
> = {
  [BiomeType.Desert]: 'desert',
  [BiomeType.Volcanic]: 'desert',
  [BiomeType.Arctic]: 'arctic',
  [BiomeType.Urban]: 'urban',
  [BiomeType.Jungle]: 'jungle',
};

interface UnitRowPlacementContext {
  readonly units: readonly IGameUnit[];
  readonly targetR: number;
  readonly baseFacing: Facing;
  readonly radius: number;
  readonly random: SeededRandom;
  readonly occupiedPositions: Set<string>;
  readonly unitStates: Record<string, IUnitGameState>;
}

export class ScenarioGenerator {
  constructor(
    private readonly unitWeights: WeightedTable<IUnitTemplate>,
    private readonly terrainWeights: WeightedTable<string>,
  ) {}

  generate(config: ISimulationConfig, random: SeededRandom): IGameSession {
    const _options = DEFAULT_GENERATION_OPTIONS;
    const grid = this.generateMap(config.mapRadius, random, config);

    const playerUnits = this.generateForce(
      GameSide.Player,
      config.unitCount.player,
      random,
    );
    const opponentUnits = this.generateForce(
      GameSide.Opponent,
      config.unitCount.opponent,
      random,
    );

    const allUnits = [...playerUnits, ...opponentUnits];
    const gameUnits = this.createGameUnits(allUnits);

    const unitStates = this.placeUnits(gameUnits, grid, random);

    // Per `add-scenario-objective-engine` (task 2): place objective
    // hexes for a non-`destroy` scenario. Placement is seeded from the
    // scenario seed so identical seeds yield identical objective maps.
    const objectives = this.placeScenarioObjectives(config);

    const objectiveType = config.objectiveType ?? ScenarioObjectiveType.Destroy;
    const gameConfig: IGameConfig = {
      mapRadius: config.mapRadius,
      turnLimit: config.turnLimit,
      victoryConditions: [
        objectiveType === ScenarioObjectiveType.Destroy
          ? 'destruction'
          : objectiveType,
      ],
      optionalRules: [],
    };

    const gameState: IGameState = {
      gameId: `sim-${config.seed}`,
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Initiative,
      activationIndex: 0,
      units: unitStates,
      turnEvents: [],
      ...(Object.keys(objectives).length > 0 ? { objectives } : {}),
    };

    const now = new Date().toISOString();

    return {
      id: `sim-${config.seed}`,
      createdAt: now,
      updatedAt: now,
      config: gameConfig,
      units: gameUnits,
      events: [],
      currentState: gameState,
    };
  }

  /**
   * Per `add-scenario-objective-engine` (task 2 + 2.2): derives the
   * objective placement config from the scenario objective type +
   * victory conditions, then places objective hexes deterministically
   * from the scenario seed. Returns an empty map for a markerless
   * (`destroy` / unset) scenario.
   *
   * Deployment rows mirror `placeUnits`: the player occupies
   * `-(radius - 1)` and the opponent occupies `radius - 1`.
   */
  private placeScenarioObjectives(
    config: ISimulationConfig,
  ): Record<string, IObjectiveMarker> {
    const objectiveType = config.objectiveType;
    if (
      objectiveType === undefined ||
      objectiveType === ScenarioObjectiveType.Destroy
    ) {
      return {};
    }

    const placementConfig = deriveObjectivePlacementConfig(
      objectiveType,
      config.victoryConditions ?? [],
    );
    if (placementConfig === null) return {};

    const radius = config.mapRadius;
    return placeObjectives(
      placementConfig,
      {
        radius,
        playerRow: -(radius - 1),
        opponentRow: radius - 1,
      },
      config.seed,
    );
  }

  /**
   * Build the hex grid. When the simulation config supplies a `mapPreset`
   * (`add-procedural-map-variety`), terrain is generated procedurally with
   * the preset's feature directives overlaid on base biome generation, so
   * the map carries clustered woods, buildings, roads, and pavement. Terrain
   * is seeded from `config.seed`, keeping the map a deterministic function of
   * the simulation seed. Without a preset the legacy weighted-table terrain
   * is used unchanged.
   */
  private generateMap(
    radius: number,
    random: SeededRandom,
    config: ISimulationConfig,
  ): IHexGrid {
    const hexes = new Map<string, IHex>();
    const presetTerrain = config.mapPreset
      ? this.generatePresetTerrain(radius, config.mapPreset, config.seed)
      : null;

    for (let q = -radius; q <= radius; q++) {
      for (let r = -radius; r <= radius; r++) {
        if (Math.abs(q + r) <= radius) {
          const key = `${q},${r}`;
          const terrain =
            presetTerrain?.get(key) ??
            this.terrainWeights.select(() => random.next()) ??
            'clear';
          hexes.set(key, {
            coord: { q, r },
            occupantId: null,
            terrain,
            elevation: 0,
          });
        }
      }
    }

    return {
      config: { radius },
      hexes,
    };
  }

  /**
   * Generate procedural terrain for a hex-radius map from a map preset and
   * return it keyed by `"q,r"`. The preset describes a hex-radius scenario
   * map; the terrain generator works on a rectangular grid, so a `radius` of
   * `R` is generated as a `(2R + 1) × (2R + 1)` grid and each axial hex
   * `(q, r)` maps to grid index `(q + R, r + R)`.
   *
   * Exposed (not `private`) as a deterministic, terrain-inspectable seam for
   * tests — the assembled `IGameSession` does not surface the hex grid.
   */
  generatePresetTerrain(
    radius: number,
    preset: IMapPreset,
    seed: number,
  ): Map<string, string> {
    const dimension = radius * 2 + 1;
    const { grid } = generateTerrainMap(preset, {
      width: dimension,
      height: dimension,
      biome: this.toTerrainBiome(preset.biome),
      seed,
    });

    const terrainByKey = new Map<string, string>();
    for (const hex of grid) {
      // Rectangular grid index -> axial coordinate.
      const q = hex.coordinate.q - radius;
      const r = hex.coordinate.r - radius;
      const type = hex.features[0]?.type ?? TerrainType.Clear;
      terrainByKey.set(`${q},${r}`, type);
    }
    return terrainByKey;
  }

  /**
   * Map a scenario `BiomeType` to the terrain generator's biome vocabulary.
   * The terrain generator recognises five base biomes; scenario biomes with
   * no direct base-pass analogue fall back to the closest match. The preset
   * feature overlay carries the scenario-specific character regardless.
   */
  private toTerrainBiome(biome: BiomeType): TerrainBiomeType {
    return TERRAIN_BIOME_BY_SCENARIO_BIOME[biome] ?? 'temperate';
  }

  private generateForce(
    side: GameSide,
    count: number,
    random: SeededRandom,
  ): { template: IUnitTemplate; side: GameSide }[] {
    const units: { template: IUnitTemplate; side: GameSide }[] = [];

    for (let i = 0; i < count; i++) {
      const template = this.unitWeights.select(() => random.next());
      if (template) {
        units.push({ template, side });
      }
    }

    return units;
  }

  private createGameUnits(
    unitData: { template: IUnitTemplate; side: GameSide }[],
  ): IGameUnit[] {
    return unitData.map((data, index) => {
      const id = `${data.side}-unit-${index + 1}`;
      return {
        id,
        name: data.template.name,
        side: data.side,
        unitRef: data.template.name.toLowerCase().replace(/\s+/g, '-'),
        pilotRef: `pilot-${id}`,
        gunnery: 4,
        piloting: 5,
      };
    });
  }

  private placeUnits(
    gameUnits: IGameUnit[],
    grid: IHexGrid,
    random: SeededRandom,
  ): Record<string, IUnitGameState> {
    const unitStates: Record<string, IUnitGameState> = {};
    const occupiedPositions = new Set<string>();
    const radius = grid.config.radius;

    const playerUnits = gameUnits.filter((u) => u.side === GameSide.Player);
    const opponentUnits = gameUnits.filter((u) => u.side === GameSide.Opponent);

    const playerRow = -(radius - 1);
    const opponentRow = radius - 1;

    this.placeUnitsOnRow({
      units: playerUnits,
      targetR: playerRow,
      baseFacing: Facing.South,
      radius,
      random,
      occupiedPositions,
      unitStates,
    });

    this.placeUnitsOnRow({
      units: opponentUnits,
      targetR: opponentRow,
      baseFacing: Facing.North,
      radius,
      random,
      occupiedPositions,
      unitStates,
    });

    return unitStates;
  }

  private placeUnitsOnRow(context: UnitRowPlacementContext): void {
    const {
      baseFacing,
      occupiedPositions,
      radius,
      random,
      targetR,
      units,
      unitStates,
    } = context;
    const availablePositions = this.getPositionsAtRow(targetR, radius);

    for (const unit of units) {
      const template = this.findTemplateByName(unit.name);
      let position: IHexCoordinate | null = null;

      const shuffled = this.shuffleArray([...availablePositions], random);
      for (const pos of shuffled) {
        const key = `${pos.q},${pos.r}`;
        if (!occupiedPositions.has(key)) {
          position = pos;
          occupiedPositions.add(key);
          break;
        }
      }

      if (!position) {
        position = { q: 0, r: targetR };
      }

      const facingVariation = random.nextInt(3) - 1;
      const facing = ((baseFacing + facingVariation + 6) % 6) as Facing;

      unitStates[unit.id] = this.createUnitGameState(
        unit,
        position,
        facing,
        template,
      );
    }
  }

  private getPositionsAtRow(r: number, radius: number): IHexCoordinate[] {
    const positions: IHexCoordinate[] = [];
    for (let q = -radius; q <= radius; q++) {
      if (Math.abs(q + r) <= radius) {
        positions.push({ q, r });
      }
    }
    return positions;
  }

  private shuffleArray<T>(array: T[], random: SeededRandom): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = random.nextInt(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  private findTemplateByName(name: string): IUnitTemplate | null {
    return UNIT_TEMPLATES.find((t) => t.name === name) || null;
  }

  private createUnitGameState(
    unit: IGameUnit,
    position: IHexCoordinate,
    facing: Facing,
    template: IUnitTemplate | null,
  ): IUnitGameState {
    const defaultArmor: Record<string, number> = {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    };

    const defaultStructure: Record<string, number> = {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    };

    return {
      id: unit.id,
      side: unit.side,
      position,
      facing,
      heat: 0,
      movementThisTurn: MovementType.Stationary,
      hexesMovedThisTurn: 0,
      armor: template ? { ...template.armor } : defaultArmor,
      structure: template ? { ...template.structure } : defaultStructure,
      destroyedLocations: [],
      destroyedEquipment: [],
      ammo: {},
      pilotWounds: 0,
      pilotConscious: true,
      destroyed: false,
      hasRetreated: false,
      hasEjected: false,
      lockState: LockState.Pending,
    };
  }
}

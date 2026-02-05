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

import { SeededRandom } from '../core/SeededRandom';
import { ISimulationConfig } from '../core/types';
import { WeightedTable } from '../core/WeightedTable';
import { UNIT_TEMPLATES } from './templates';
import {
  IUnitTemplate,
  DEFAULT_GENERATION_OPTIONS,
  IGenerationOptions,
} from './types';

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

export class ScenarioGenerator {
  constructor(
    private readonly unitWeights: WeightedTable<IUnitTemplate>,
    private readonly terrainWeights: WeightedTable<string>,
  ) {}

  generate(config: ISimulationConfig, random: SeededRandom): IGameSession {
    const options = DEFAULT_GENERATION_OPTIONS;
    const grid = this.generateMap(config.mapRadius, random);

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

    const gameConfig: IGameConfig = {
      mapRadius: config.mapRadius,
      turnLimit: config.turnLimit,
      victoryConditions: ['destruction'],
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

  private generateMap(radius: number, random: SeededRandom): IHexGrid {
    const hexes = new Map<string, IHex>();

    for (let q = -radius; q <= radius; q++) {
      for (let r = -radius; r <= radius; r++) {
        if (Math.abs(q + r) <= radius) {
          const key = `${q},${r}`;
          const terrain =
            this.terrainWeights.select(() => random.next()) || 'clear';
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

    this.placeUnitsOnRow(
      playerUnits,
      playerRow,
      Facing.South,
      radius,
      random,
      occupiedPositions,
      unitStates,
    );

    this.placeUnitsOnRow(
      opponentUnits,
      opponentRow,
      Facing.North,
      radius,
      random,
      occupiedPositions,
      unitStates,
    );

    return unitStates;
  }

  private placeUnitsOnRow(
    units: IGameUnit[],
    targetR: number,
    baseFacing: Facing,
    radius: number,
    random: SeededRandom,
    occupiedPositions: Set<string>,
    unitStates: Record<string, IUnitGameState>,
  ): void {
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
      lockState: LockState.Pending,
    };
  }
}

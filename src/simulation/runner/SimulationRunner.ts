import { SeededRandom } from '../core/SeededRandom';
import { ISimulationConfig } from '../core/types';
import { InvariantRunner } from '../invariants/InvariantRunner';
import { IViolation } from '../invariants/types';
import { BotPlayer } from '../ai/BotPlayer';
import type { IAIUnitState, IWeapon } from '../ai/types';
import { ISimulationRunResult } from './types';
import {
  GamePhase,
  GameSide,
  GameStatus,
  IGameState,
  IUnitGameState,
  IGameEvent,
  LockState,
} from '@/types/gameplay';
import {
  Facing,
  MovementType,
  IHexCoordinate,
  IHexGrid,
  IHex,
  IMovementCapability,
} from '@/types/gameplay';

const MAX_TURNS = 10;

function createMinimalGrid(radius: number): IHexGrid {
  const hexes = new Map<string, IHex>();
  
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        const key = `${q},${r}`;
        hexes.set(key, {
          coord: { q, r },
          occupantId: null,
          terrain: 'clear',
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

function createMinimalWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function createMinimalUnitState(
  id: string,
  side: GameSide,
  position: IHexCoordinate
): IUnitGameState {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.South : Facing.North,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
  };
}

function toAIUnitState(unit: IUnitGameState): IAIUnitState {
  return {
    unitId: unit.id,
    position: unit.position,
    facing: unit.facing,
    heat: unit.heat,
    weapons: [createMinimalWeapon(`${unit.id}-weapon-1`)],
    ammo: {},
    destroyed: unit.destroyed,
    gunnery: 4,
    movementType: unit.movementThisTurn,
    hexesMoved: unit.hexesMovedThisTurn,
  };
}

function createMovementCapability(): IMovementCapability {
  return {
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

export class SimulationRunner {
  private readonly random: SeededRandom;
  private readonly invariantRunner: InvariantRunner;
  
  constructor(seed: number, invariantRunner?: InvariantRunner) {
    this.random = new SeededRandom(seed);
    this.invariantRunner = invariantRunner ?? new InvariantRunner();
  }
  
  run(config: ISimulationConfig): ISimulationRunResult {
    const startTime = Date.now();
    const violations: IViolation[] = [];
    const events: IGameEvent[] = [];
    
    const grid = createMinimalGrid(config.mapRadius);
    const state = this.createInitialState(config);
    const botPlayer = new BotPlayer(this.random);
    
    let currentState = state;
    let turn = 1;
    const turnLimit = config.turnLimit > 0 ? Math.min(config.turnLimit, MAX_TURNS) : MAX_TURNS;
    
    while (turn <= turnLimit) {
      currentState = { ...currentState, turn };
      
      currentState = this.runMovementPhase(currentState, botPlayer, grid, violations);
      currentState = this.runAttackPhase(currentState, botPlayer, violations);
      
      if (this.isGameOver(currentState)) {
        break;
      }
      
      currentState = { ...currentState, phase: GamePhase.End };
      violations.push(...this.invariantRunner.runAll(currentState));
      
      turn++;
    }
    
    const durationMs = Date.now() - startTime;
    const winner = this.determineWinner(currentState);
    
    return {
      seed: config.seed,
      winner,
      turns: currentState.turn,
      durationMs,
      events,
      violations,
    };
  }
  
  private runMovementPhase(
    state: IGameState,
    botPlayer: BotPlayer,
    grid: IHexGrid,
    violations: IViolation[]
  ): IGameState {
    let currentState = { ...state, phase: GamePhase.Movement };
    violations.push(...this.invariantRunner.runAll(currentState));
    
    for (const unitId of Object.keys(currentState.units)) {
      const unit = currentState.units[unitId];
      if (unit.destroyed) continue;
      
      const aiUnit = toAIUnitState(unit);
      const capability = createMovementCapability();
      const moveEvent = botPlayer.playMovementPhase(aiUnit, grid, capability);
      
      if (moveEvent) {
        currentState = this.applyMovementEvent(currentState, unitId, moveEvent.payload);
      }
    }
    violations.push(...this.invariantRunner.runAll(currentState));
    
    return currentState;
  }
  
  private runAttackPhase(
    state: IGameState,
    botPlayer: BotPlayer,
    violations: IViolation[]
  ): IGameState {
    let currentState = { ...state, phase: GamePhase.WeaponAttack };
    violations.push(...this.invariantRunner.runAll(currentState));
    
    const allAIUnits = Object.values(currentState.units).map(toAIUnitState);
    for (const unitId of Object.keys(currentState.units)) {
      const unit = currentState.units[unitId];
      if (unit.destroyed) continue;
      
      const aiUnit = toAIUnitState(unit);
      const enemyUnits = allAIUnits.filter(
        u => !u.destroyed && currentState.units[u.unitId].side !== unit.side
      );
      
      const attackEvent = botPlayer.playAttackPhase(aiUnit, enemyUnits);
      
      if (attackEvent) {
        currentState = this.applySimpleDamage(currentState, attackEvent.payload.targetId);
      }
    }
    violations.push(...this.invariantRunner.runAll(currentState));
    
    return currentState;
  }
  
  private createSideUnits(
    units: Record<string, IUnitGameState>,
    config: ISimulationConfig,
    side: GameSide,
    rowPosition: number
  ): void {
    const count = side === GameSide.Player ? config.unitCount.player : config.unitCount.opponent;
    const prefix = side === GameSide.Player ? 'player' : 'opponent';
    
    for (let i = 0; i < count; i++) {
      const id = `${prefix}-${i + 1}`;
      const position: IHexCoordinate = { q: i - 1, r: rowPosition };
      units[id] = createMinimalUnitState(id, side, position);
    }
  }
  
  private createInitialState(config: ISimulationConfig): IGameState {
    const units: Record<string, IUnitGameState> = {};
    
    this.createSideUnits(units, config, GameSide.Player, -config.mapRadius + 1);
    this.createSideUnits(units, config, GameSide.Opponent, config.mapRadius - 1);
    
    return {
      gameId: `sim-${config.seed}`,
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Initiative,
      activationIndex: 0,
      units,
      turnEvents: [],
    };
  }
  
  private applyMovementEvent(
    state: IGameState,
    unitId: string,
    payload: { to: { q: number; r: number }; facing: number; movementType: MovementType; mpUsed: number }
  ): IGameState {
    const unit = state.units[unitId];
    if (!unit) return state;
    
    const updatedUnit: IUnitGameState = {
      ...unit,
      position: payload.to,
      facing: payload.facing as Facing,
      movementThisTurn: payload.movementType,
      hexesMovedThisTurn: payload.mpUsed,
    };
    
    return {
      ...state,
      units: {
        ...state.units,
        [unitId]: updatedUnit,
      },
    };
  }
  
  private applySimpleDamage(state: IGameState, targetId: string): IGameState {
    const target = state.units[targetId];
    if (!target || target.destroyed) return state;
    
    const SIMPLE_DAMAGE = 5;
    const newArmor = { ...target.armor };
    const ctArmor = newArmor.center_torso ?? 0;
    newArmor.center_torso = Math.max(0, ctArmor - SIMPLE_DAMAGE);
    
    const totalStructure = Object.values(target.structure).reduce((sum, v) => sum + v, 0);
    const ctBreached = newArmor.center_torso === 0 && (target.structure.center_torso ?? 0) <= SIMPLE_DAMAGE;
    const destroyed = totalStructure <= 0 || ctBreached;
    
    const updatedUnit: IUnitGameState = {
      ...target,
      armor: newArmor,
      destroyed,
    };
    
    return {
      ...state,
      units: {
        ...state.units,
        [targetId]: updatedUnit,
      },
    };
  }
  
  private isGameOver(state: IGameState): boolean {
    const playerUnits = Object.values(state.units).filter(
      u => u.side === GameSide.Player && !u.destroyed
    );
    const opponentUnits = Object.values(state.units).filter(
      u => u.side === GameSide.Opponent && !u.destroyed
    );
    return playerUnits.length === 0 || opponentUnits.length === 0;
  }
  
  private determineWinner(state: IGameState): 'player' | 'opponent' | 'draw' | null {
    const playerUnits = Object.values(state.units).filter(
      u => u.side === GameSide.Player && !u.destroyed
    );
    const opponentUnits = Object.values(state.units).filter(
      u => u.side === GameSide.Opponent && !u.destroyed
    );
    
    if (playerUnits.length === 0 && opponentUnits.length === 0) return 'draw';
    if (playerUnits.length === 0) return 'opponent';
    if (opponentUnits.length === 0) return 'player';
    return null;
  }
}

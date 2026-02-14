import type { IUnitDamageState } from '@/utils/gameplay/damage';

import { GamePhase, GameSide, GameStatus } from '@/types/gameplay';
import { CombatLocation, IGameState, IUnitGameState } from '@/types/gameplay';

import type { ISimulationConfig } from '../core/types';

import { createMinimalUnitState } from './SimulationRunnerSupport';

function createSideUnits(
  units: Record<string, IUnitGameState>,
  config: ISimulationConfig,
  side: GameSide,
  rowPosition: number,
): void {
  const count =
    side === GameSide.Player
      ? config.unitCount.player
      : config.unitCount.opponent;
  const prefix = side === GameSide.Player ? 'player' : 'opponent';

  for (let i = 0; i < count; i++) {
    const id = `${prefix}-${i + 1}`;
    const position = { q: i - 1, r: rowPosition };
    units[id] = createMinimalUnitState(id, side, position);
  }
}

export function createInitialState(config: ISimulationConfig): IGameState {
  const units: Record<string, IUnitGameState> = {};

  createSideUnits(units, config, GameSide.Player, -config.mapRadius + 1);
  createSideUnits(units, config, GameSide.Opponent, config.mapRadius - 1);

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

export function resetTurnState(state: IGameState): IGameState {
  const updatedUnits: Record<string, IUnitGameState> = {};
  for (const [id, unit] of Object.entries(state.units)) {
    updatedUnits[id] = {
      ...unit,
      damageThisPhase: 0,
      weaponsFiredThisTurn: [],
      pendingPSRs: [],
    };
  }

  return { ...state, units: updatedUnits };
}

export function applyMovementEvent(
  state: IGameState,
  unitId: string,
  payload: {
    to: { q: number; r: number };
    facing: number;
    movementType: IUnitGameState['movementThisTurn'];
    mpUsed: number;
  },
): IGameState {
  const unit = state.units[unitId];
  if (!unit) return state;

  const updatedUnit: IUnitGameState = {
    ...unit,
    position: payload.to,
    facing: payload.facing,
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

export function buildDamageState(unit: IUnitGameState): IUnitDamageState {
  const armorRecord = unit.armor as Record<CombatLocation, number>;
  const rearArmor: Record<
    'center_torso' | 'left_torso' | 'right_torso',
    number
  > = {
    center_torso: armorRecord.center_torso_rear ?? 10,
    left_torso: armorRecord.left_torso_rear ?? 7,
    right_torso: armorRecord.right_torso_rear ?? 7,
  };

  return {
    armor: armorRecord,
    rearArmor,
    structure: unit.structure as Record<CombatLocation, number>,
    destroyedLocations: unit.destroyedLocations as CombatLocation[],
    pilotWounds: unit.pilotWounds,
    pilotConscious: unit.pilotConscious,
    destroyed: unit.destroyed,
  };
}

export function applyDamageResultToState(
  state: IGameState,
  targetId: string,
  damageState: IUnitDamageState,
  damageResult: {
    readonly locationDamages: readonly {
      readonly location: CombatLocation;
      readonly armorRemaining: number;
      readonly structureRemaining: number;
      readonly destroyed: boolean;
    }[];
    readonly unitDestroyed: boolean;
  },
): IGameState {
  const target = state.units[targetId];
  if (!target) return state;

  const newArmor = { ...target.armor };
  const newStructure = { ...target.structure };
  const newDestroyedLocations = [...target.destroyedLocations];

  for (const locDamage of damageResult.locationDamages) {
    newArmor[locDamage.location] = locDamage.armorRemaining;
    newStructure[locDamage.location] = locDamage.structureRemaining;
    if (
      locDamage.destroyed &&
      !newDestroyedLocations.includes(locDamage.location)
    ) {
      newDestroyedLocations.push(locDamage.location);
      if (
        locDamage.location === 'left_torso' &&
        !newDestroyedLocations.includes('left_arm')
      ) {
        newDestroyedLocations.push('left_arm');
        newArmor.left_arm = 0;
        newStructure.left_arm = 0;
      }
      if (
        locDamage.location === 'right_torso' &&
        !newDestroyedLocations.includes('right_arm')
      ) {
        newDestroyedLocations.push('right_arm');
        newArmor.right_arm = 0;
        newStructure.right_arm = 0;
      }
    }
  }

  const updatedUnit: IUnitGameState = {
    ...target,
    armor: newArmor,
    structure: newStructure,
    destroyedLocations: newDestroyedLocations,
    pilotWounds: damageState.pilotWounds,
    pilotConscious: damageState.pilotConscious,
    destroyed: damageResult.unitDestroyed,
  };

  return {
    ...state,
    units: {
      ...state.units,
      [targetId]: updatedUnit,
    },
  };
}

export function isUnitOperable(unit: IUnitGameState): boolean {
  return !unit.destroyed && unit.pilotConscious !== false;
}

export function isGameOver(state: IGameState): boolean {
  const playerAlive = Object.values(state.units).some(
    (unit) => unit.side === GameSide.Player && isUnitOperable(unit),
  );
  const opponentAlive = Object.values(state.units).some(
    (unit) => unit.side === GameSide.Opponent && isUnitOperable(unit),
  );
  return !playerAlive || !opponentAlive;
}

export function determineWinner(
  state: IGameState,
): 'player' | 'opponent' | 'draw' | null {
  const playerAlive = Object.values(state.units).some(
    (unit) => unit.side === GameSide.Player && isUnitOperable(unit),
  );
  const opponentAlive = Object.values(state.units).some(
    (unit) => unit.side === GameSide.Opponent && isUnitOperable(unit),
  );

  if (!playerAlive && !opponentAlive) return 'draw';
  if (!playerAlive) return 'opponent';
  if (!opponentAlive) return 'player';
  return null;
}

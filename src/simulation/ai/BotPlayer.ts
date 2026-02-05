import type {
  IHexGrid,
  IMovementCapability,
  IUnitPosition,
} from '@/types/gameplay';

import { GameEventType, MovementType } from '@/types/gameplay';

import type { SeededRandom } from '../core/SeededRandom';
import type { IBotBehavior, IAIUnitState, IMove } from './types';

import { AttackAI } from './AttackAI';
import { MoveAI } from './MoveAI';
import { DEFAULT_BEHAVIOR } from './types';

export interface IMovementEvent {
  type: GameEventType.MovementDeclared;
  payload: {
    unitId: string;
    from: { q: number; r: number };
    to: { q: number; r: number };
    facing: number;
    movementType: MovementType;
    mpUsed: number;
    heatGenerated: number;
  };
}

export interface IAttackEvent {
  type: GameEventType.AttackDeclared;
  payload: {
    attackerId: string;
    targetId: string;
    weapons: readonly string[];
  };
}

export type BotGameEvent = IMovementEvent | IAttackEvent;

export class BotPlayer {
  private readonly moveAI: MoveAI;
  private readonly attackAI: AttackAI;
  private readonly random: SeededRandom;

  constructor(random: SeededRandom, behavior: IBotBehavior = DEFAULT_BEHAVIOR) {
    this.random = random;
    this.moveAI = new MoveAI(behavior);
    this.attackAI = new AttackAI();
  }

  playMovementPhase(
    unit: IAIUnitState,
    grid: IHexGrid,
    capability: IMovementCapability,
  ): IMovementEvent | null {
    if (unit.destroyed) {
      return null;
    }

    const position: IUnitPosition = {
      unitId: unit.unitId,
      coord: unit.position,
      facing: unit.facing,
      prone: false,
    };

    const movementType = this.selectMovementType(capability);
    const moves = this.moveAI.getValidMoves(
      grid,
      position,
      movementType,
      capability,
    );

    const nonStationaryMoves = moves.filter(
      (m: IMove) =>
        m.destination.q !== unit.position.q ||
        m.destination.r !== unit.position.r,
    );

    if (nonStationaryMoves.length === 0) {
      return null;
    }

    const selectedMove = this.moveAI.selectMove(
      nonStationaryMoves,
      this.random,
    );
    if (!selectedMove) {
      return null;
    }

    return {
      type: GameEventType.MovementDeclared,
      payload: {
        unitId: unit.unitId,
        from: unit.position,
        to: selectedMove.destination,
        facing: selectedMove.facing,
        movementType: selectedMove.movementType,
        mpUsed: selectedMove.mpCost,
        heatGenerated: selectedMove.heatGenerated,
      },
    };
  }

  playAttackPhase(
    attacker: IAIUnitState,
    allUnits: readonly IAIUnitState[],
  ): IAttackEvent | null {
    if (attacker.destroyed) {
      return null;
    }

    const validTargets = this.attackAI.getValidTargets(attacker, allUnits);
    if (validTargets.length === 0) {
      return null;
    }

    const target = this.attackAI.selectTarget(validTargets, this.random);
    if (!target) {
      return null;
    }

    const weapons = this.attackAI.selectWeapons(attacker, target);
    if (weapons.length === 0) {
      return null;
    }

    return {
      type: GameEventType.AttackDeclared,
      payload: {
        attackerId: attacker.unitId,
        targetId: target.unitId,
        weapons: weapons.map((w) => w.id),
      },
    };
  }

  private selectMovementType(capability: IMovementCapability): MovementType {
    if (capability.walkMP === 0 && capability.jumpMP === 0) {
      return MovementType.Stationary;
    }

    const roll = this.random.next();
    if (capability.jumpMP > 0 && roll < 0.2) {
      return MovementType.Jump;
    }
    if (roll < 0.6) {
      return MovementType.Run;
    }
    return MovementType.Walk;
  }
}

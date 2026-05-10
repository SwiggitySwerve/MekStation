import type { IWeapon } from '@/simulation/ai/types';
import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';

import { BotPlayer } from '@/simulation/ai/BotPlayer';
import { hasReachedEdge } from '@/simulation/ai/RetreatAI';
import {
  GamePhase,
  GameSide,
  type IGameEvent,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  Facing,
  RangeBracket,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import {
  createRetreatTriggeredEvent,
  createUnitRetreatedEvent,
} from '@/utils/gameplay/gameEvents';
import {
  declareAttack,
  declareMovement,
  declarePhysicalAttack,
  lockAttack,
  lockMovement,
} from '@/utils/gameplay/gameSession';
import {
  buildMovementEventPath,
  maxMovementCostForCapability,
} from '@/utils/gameplay/movement/eventPath';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';

import { toAIUnitState } from './GameEngine.helpers';

export interface IInteractiveSessionAIContext {
  readonly side: GameSide;
  readonly getSession: () => IGameSession;
  readonly setSession: (session: IGameSession) => void;
  readonly appendAndPersistEvent: (event: IGameEvent) => void;
  readonly weaponsByUnit: Map<string, readonly IWeapon[]>;
  readonly movementByUnit: Map<string, IMovementCapability>;
  readonly gunneryByUnit: Map<string, number>;
  readonly pilotingByUnit: Map<string, number>;
  readonly tonnageByUnit: Map<string, number>;
  readonly grid: IHexGrid;
  readonly botPlayer: BotPlayer;
}

export function runInteractiveSessionAITurn(
  context: IInteractiveSessionAIContext,
): void {
  let session = context.getSession();
  const { phase } = session.currentState;
  const sortedEntries = Object.entries(session.currentState.units).sort(
    ([a], [b]) => a.localeCompare(b),
  );

  const setSession = (next: IGameSession): void => {
    session = next;
    context.setSession(next);
  };

  for (const [unitId, unit] of sortedEntries) {
    if (unit.side !== context.side || unit.destroyed) continue;

    const weapons = context.weaponsByUnit.get(unitId) ?? [];
    const gunnery = context.gunneryByUnit.get(unitId) ?? 4;
    const cap = context.movementByUnit.get(unitId) ?? {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
    };

    if (phase === GamePhase.Movement) {
      emitRetreatIfNeeded(context, unitId, weapons, gunnery);
      session = context.getSession();
      const refreshedUnit = session.currentState.units[unitId];
      const aiUnit = toAIUnitState(refreshedUnit, weapons, gunnery);
      const moveEvt = context.botPlayer.playMovementPhase(
        aiUnit,
        context.grid,
        cap,
      );
      if (moveEvt) {
        const eventPath = buildMovementEventPath({
          grid: context.grid,
          from: refreshedUnit.position,
          to: moveEvt.payload.to,
          movementType: moveEvt.payload.movementType,
          maxCost: maxMovementCostForCapability(
            cap,
            moveEvt.payload.movementType,
          ),
        });
        setSession(
          declareMovement(
            session,
            unitId,
            refreshedUnit.position,
            moveEvt.payload.to,
            moveEvt.payload.facing as Facing,
            moveEvt.payload.movementType,
            moveEvt.payload.mpUsed,
            moveEvt.payload.heatGenerated,
            eventPath,
          ),
        );
      }
      setSession(lockMovement(session, unitId));
      emitUnitRetreatedIfNeeded(context, unitId);
    } else if (phase === GamePhase.WeaponAttack) {
      emitRetreatIfNeeded(context, unitId, weapons, gunnery);
      session = context.getSession();
      const refreshedUnit = session.currentState.units[unitId];
      const aiUnit = toAIUnitState(refreshedUnit, weapons, gunnery);
      const enemies = buildEnemyAIUnits(context, context.side);
      const atkEvt = context.botPlayer.playAttackPhase(aiUnit, enemies);
      if (atkEvt) {
        const weaponAttacks: IWeaponAttack[] = buildWeaponAttacks(
          atkEvt.payload.weapons,
          weapons,
          unitId,
        );
        setSession(
          declareAttack(
            session,
            unitId,
            atkEvt.payload.targetId,
            weaponAttacks,
            3,
            RangeBracket.Short,
          ),
        );
      }
      setSession(lockAttack(session, unitId));
    } else if (phase === GamePhase.PhysicalAttack) {
      const aiUnit = toAIUnitState(unit, weapons, gunnery);
      const enemies = buildEnemyAIUnits(context, context.side);
      const physEvt = context.botPlayer.playPhysicalAttackPhase(
        aiUnit,
        enemies,
      );
      if (physEvt) {
        setSession(
          declarePhysicalAttack(
            session,
            physEvt.payload.attackerId,
            physEvt.payload.targetId,
            physEvt.payload.attackType,
            {
              attackerTonnage: context.tonnageByUnit.get(unitId) ?? 65,
              pilotingSkill: context.pilotingByUnit.get(unitId) ?? 5,
              hexesMoved: unit.hexesMovedThisTurn,
            },
          ),
        );
      }
    }
  }
}

function emitRetreatIfNeeded(
  context: IInteractiveSessionAIContext,
  unitId: string,
  weapons: readonly IWeapon[],
  gunnery: number,
): void {
  const session = context.getSession();
  const unit = session.currentState.units[unitId];
  if (!unit) return;
  const aiUnit = toAIUnitState(unit, weapons, gunnery);
  const evt = context.botPlayer.evaluateRetreat(aiUnit, session);
  if (!evt) return;
  const sequence = session.events.length;
  const { turn, phase } = session.currentState;
  context.appendAndPersistEvent(
    createRetreatTriggeredEvent(
      session.id,
      sequence,
      turn,
      phase,
      evt.payload.unitId,
      evt.payload.edge,
      evt.payload.reason,
    ),
  );
}

function emitUnitRetreatedIfNeeded(
  context: IInteractiveSessionAIContext,
  unitId: string,
): void {
  const session = context.getSession();
  const postMoveUnit = session.currentState.units[unitId];
  if (
    !postMoveUnit ||
    postMoveUnit.destroyed ||
    !postMoveUnit.isRetreating ||
    postMoveUnit.hasRetreated ||
    !postMoveUnit.retreatTargetEdge ||
    !hasReachedEdge(
      postMoveUnit.position,
      postMoveUnit.retreatTargetEdge,
      session.config.mapRadius,
    )
  ) {
    return;
  }

  const sequence = session.events.length;
  const { turn, phase } = session.currentState;
  context.appendAndPersistEvent(
    createUnitRetreatedEvent(
      session.id,
      sequence,
      turn,
      phase,
      unitId,
      postMoveUnit.retreatTargetEdge,
    ),
  );
}

function buildEnemyAIUnits(
  context: IInteractiveSessionAIContext,
  side: GameSide,
) {
  const session = context.getSession();
  return Object.keys(session.currentState.units)
    .map((uid) => {
      const unit = session.currentState.units[uid];
      return toAIUnitState(
        unit,
        context.weaponsByUnit.get(uid) ?? [],
        context.gunneryByUnit.get(uid) ?? 4,
      );
    })
    .filter(
      (unit) =>
        !unit.destroyed &&
        session.currentState.units[unit.unitId].side !== side,
    );
}

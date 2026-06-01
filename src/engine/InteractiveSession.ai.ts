import type { IWeapon } from '@/simulation/ai/types';
import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';

import { BotPlayer } from '@/simulation/ai/BotPlayer';
import { hasReachedEdge } from '@/simulation/ai/RetreatAI';
import {
  GamePhase,
  GameSide,
  LockState,
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
  declarePhysicalAttack,
  lockAttack,
  lockMovement,
} from '@/utils/gameplay/gameSession';
import {
  hullDownLegWeaponBlockedReason,
  hullDownVehicleFrontWeaponBlockedReason,
  isRepresentedVehicleAttacker,
} from '@/utils/gameplay/hullDownRestrictions';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';
import { buildPhysicalElevationContext } from '@/utils/gameplay/physicalAttacks/elevation';
import { buildPhysicalTerrainContext } from '@/utils/gameplay/physicalAttacks/terrain';
import {
  gameUnitUsesMekHorizontalCover,
  gameUnitUsesMekWaterCover,
  getTargetCoverInfo,
} from '@/utils/gameplay/terrainCover';
import { calculateTargetTerrainModifierFromHex } from '@/utils/gameplay/toHit';
import { weaponPassesRepresentedWaterAttackRules } from '@/utils/gameplay/underwaterAttacks';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';

import { toAIUnitState } from './GameEngine.helpers';
import { applyInteractiveSessionMovement } from './InteractiveSession.actions';

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
        setSession(
          applyInteractiveSessionMovement({
            session,
            grid: context.grid,
            movementByUnit: context.movementByUnit,
            unitId,
            to: moveEvt.payload.to,
            facing: moveEvt.payload.facing as Facing,
            movementType: moveEvt.payload.movementType,
          }),
        );
        session = context.getSession();
      }
      if (session.currentState.units[unitId]?.lockState !== LockState.Locked) {
        setSession(lockMovement(session, unitId));
      }
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
        const targetHex =
          session.currentState.units[atkEvt.payload.targetId]?.position;
        const attackerGameUnit = session.units.find(
          (entry) => entry.id === unitId,
        );
        const attackerIsRepresentedVehicle = isRepresentedVehicleAttacker({
          unitType: attackerGameUnit?.unitType,
          combatStateKind: refreshedUnit?.combatState?.kind,
        });
        const usableWeaponAttacks = targetHex
          ? weaponAttacks.filter(
              (weapon) =>
                weaponPassesRepresentedWaterAttackRules({
                  grid: context.grid,
                  attackerPosition: refreshedUnit?.position ?? unit.position,
                  targetPosition: targetHex,
                  weapon,
                }) &&
                !hullDownLegWeaponBlockedReason(
                  refreshedUnit?.hullDown,
                  weapon,
                ) &&
                !hullDownVehicleFrontWeaponBlockedReason(
                  refreshedUnit?.hullDown,
                  attackerIsRepresentedVehicle,
                  weapon,
                ),
            )
          : weaponAttacks.filter(
              (weapon) =>
                !hullDownLegWeaponBlockedReason(
                  refreshedUnit?.hullDown,
                  weapon,
                ) &&
                !hullDownVehicleFrontWeaponBlockedReason(
                  refreshedUnit?.hullDown,
                  attackerIsRepresentedVehicle,
                  weapon,
                ),
            );
        if (usableWeaponAttacks.length === 0) continue;
        const targetPartialCover = targetHex
          ? getTargetCoverInfo(
              context.grid,
              refreshedUnit?.position ?? unit.position,
              targetHex,
              {
                horizontalCoverEligible: gameUnitUsesMekHorizontalCover(
                  session.units.find(
                    (entry) => entry.id === atkEvt.payload.targetId,
                  ),
                ),
                targetHexWaterCoverEligible: gameUnitUsesMekWaterCover(
                  session.units.find(
                    (entry) => entry.id === atkEvt.payload.targetId,
                  ),
                ),
              },
            ).partialCover
          : false;
        const targetTerrainModifier = targetHex
          ? calculateTargetTerrainModifierFromHex(
              context.grid.hexes.get(`${targetHex.q},${targetHex.r}`),
            )
          : null;
        const directLos = targetHex
          ? calculateLOS(
              refreshedUnit?.position ?? unit.position,
              targetHex,
              context.grid,
            )
          : undefined;
        setSession(
          declareAttack(
            session,
            unitId,
            atkEvt.payload.targetId,
            usableWeaponAttacks,
            3,
            RangeBracket.Short,
            undefined,
            targetHex,
            targetPartialCover,
            directLos?.hasLOS ? directLos.interveningTerrainEffects : [],
            targetTerrainModifier,
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
        const targetState =
          session.currentState.units[physEvt.payload.targetId] ?? null;
        const attackerBinding = session.units.find(
          (entry) => entry.id === physEvt.payload.attackerId,
        );
        const targetBinding = session.units.find(
          (entry) => entry.id === physEvt.payload.targetId,
        );
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
              attackerUnitType: attackerBinding?.unitType,
              attackerMovementMode: attackerBinding?.movementMode,
              optionalRules: session.config.optionalRules,
              targetUnitType: targetBinding?.unitType,
              elevationContext: targetState
                ? buildPhysicalElevationContext(unit, targetState, context.grid)
                : undefined,
              terrainContext: targetState
                ? buildPhysicalTerrainContext(unit, targetState, context.grid)
                : undefined,
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

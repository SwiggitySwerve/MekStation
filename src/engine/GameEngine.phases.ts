import type { IWeapon } from '@/simulation/ai/types';
import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';

import { BotPlayer } from '@/simulation/ai/BotPlayer';
import {
  GameSide,
  GamePhase,
  LockState,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  Facing,
  RangeBracket,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import { calculateFiringArc } from '@/utils/gameplay/firingArc';
import {
  rollInitiative,
  advancePhase,
  declareMovement,
  lockMovement,
  declareAttack,
  lockAttack,
  resolveAllAttacks,
  resolveHeatPhase,
} from '@/utils/gameplay/gameSession';

import { toAIUnitState } from './GameEngine.helpers';

export function runMovementPhase(
  session: IGameSession,
  grid: IHexGrid,
  botPlayer: BotPlayer,
  weaponsByUnit: Map<string, readonly IWeapon[]>,
  movementByUnit: Map<string, IMovementCapability>,
  gunneryByUnit: Map<string, number>,
): IGameSession {
  let updatedSession = session;

  for (const unitId of Object.keys(updatedSession.currentState.units)) {
    const unit = updatedSession.currentState.units[unitId];
    if (unit.destroyed) {
      updatedSession = lockMovement(updatedSession, unitId);
      continue;
    }

    const weapons = weaponsByUnit.get(unitId) ?? [];
    const gunnery = gunneryByUnit.get(unitId) ?? 4;
    const cap = movementByUnit.get(unitId) ?? {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
    };
    const aiUnit = toAIUnitState(unit, weapons, gunnery);
    const moveEvt = botPlayer.playMovementPhase(aiUnit, grid, cap);

    if (moveEvt) {
      updatedSession = declareMovement(
        updatedSession,
        unitId,
        unit.position,
        moveEvt.payload.to,
        moveEvt.payload.facing as Facing,
        moveEvt.payload.movementType,
        moveEvt.payload.mpUsed,
        moveEvt.payload.heatGenerated,
      );
    }
    updatedSession = lockMovement(updatedSession, unitId);
  }

  return updatedSession;
}

export function runAttackPhase(
  session: IGameSession,
  botPlayer: BotPlayer,
  weaponsByUnit: Map<string, readonly IWeapon[]>,
  gunneryByUnit: Map<string, number>,
): IGameSession {
  let updatedSession = session;

  const allAIUnits = Object.keys(updatedSession.currentState.units).map(
    (uid) => {
      const u = updatedSession.currentState.units[uid];
      const w = weaponsByUnit.get(uid) ?? [];
      const g = gunneryByUnit.get(uid) ?? 4;
      return toAIUnitState(u, w, g);
    },
  );

  for (const unitId of Object.keys(updatedSession.currentState.units)) {
    const unit = updatedSession.currentState.units[unitId];
    if (unit.destroyed) {
      updatedSession = lockAttack(updatedSession, unitId);
      continue;
    }

    const weapons = weaponsByUnit.get(unitId) ?? [];
    const gunnery = gunneryByUnit.get(unitId) ?? 4;
    const aiUnit = toAIUnitState(unit, weapons, gunnery);
    const enemies = allAIUnits.filter(
      (a) =>
        !a.destroyed &&
        updatedSession.currentState.units[a.unitId].side !== unit.side,
    );

    const atkEvt = botPlayer.playAttackPhase(aiUnit, enemies);
    if (atkEvt) {
      const weaponAttacks: IWeaponAttack[] = atkEvt.payload.weapons.map(
        (wId) => {
          const wData = weapons.find((w) => w.id === wId);
          return {
            weaponId: wId,
            weaponName: wData?.name ?? wId,
            damage: wData?.damage ?? 5,
            heat: wData?.heat ?? 3,
            category: 'energy' as never,
            minRange: wData?.minRange ?? 0,
            shortRange: wData?.shortRange ?? 3,
            mediumRange: wData?.mediumRange ?? 6,
            longRange: wData?.longRange ?? 9,
            isCluster: false,
          };
        },
      );

      const targetUnit =
        updatedSession.currentState.units[atkEvt.payload.targetId];
      const firingArc = calculateFiringArc(
        unit.position,
        targetUnit.position,
        targetUnit.facing,
      );

      updatedSession = declareAttack(
        updatedSession,
        unitId,
        atkEvt.payload.targetId,
        weaponAttacks,
        3,
        RangeBracket.Short,
        firingArc,
      );
    }
    updatedSession = lockAttack(updatedSession, unitId);
  }

  return updatedSession;
}

export function runInteractivePhaseAdvance(
  session: IGameSession,
): IGameSession {
  let updatedSession = session;
  const { phase } = updatedSession.currentState;

  if (phase === GamePhase.Initiative) {
    updatedSession = rollInitiative(updatedSession);
    updatedSession = advancePhase(updatedSession);
  } else if (phase === GamePhase.Movement) {
    for (const unitId of Object.keys(updatedSession.currentState.units)) {
      const u = updatedSession.currentState.units[unitId];
      if (
        u.lockState !== LockState.Locked &&
        u.lockState !== LockState.Resolved
      ) {
        updatedSession = lockMovement(updatedSession, unitId);
      }
    }
    updatedSession = advancePhase(updatedSession);
  } else if (phase === GamePhase.WeaponAttack) {
    for (const unitId of Object.keys(updatedSession.currentState.units)) {
      const u = updatedSession.currentState.units[unitId];
      if (
        u.lockState !== LockState.Locked &&
        u.lockState !== LockState.Resolved
      ) {
        updatedSession = lockAttack(updatedSession, unitId);
      }
    }
    updatedSession = resolveAllAttacks(updatedSession);
    updatedSession = advancePhase(updatedSession);
  } else if (phase === GamePhase.PhysicalAttack) {
    updatedSession = advancePhase(updatedSession);
  } else if (phase === GamePhase.Heat) {
    updatedSession = resolveHeatPhase(updatedSession);
    updatedSession = advancePhase(updatedSession);
  } else if (phase === GamePhase.End) {
    updatedSession = advancePhase(updatedSession);
  }

  return updatedSession;
}

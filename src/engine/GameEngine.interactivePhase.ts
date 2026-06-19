import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type { IHexGrid } from '@/types/gameplay/HexGridInterfaces';

import { GamePhase, LockState } from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  checkAndQueueDamagePSRs,
  lockAttack,
  lockMovement,
  resolveAllAttacks,
  resolveHeatPhase,
  resolvePendingPSRs,
  rollInitiative,
} from '@/utils/gameplay/gameSession';
import { getGridTerrainHeatEffect } from '@/utils/gameplay/heat';
import { waterDepthAtPosition } from '@/utils/gameplay/waterDepth';

import { runEngineMoraleAndWithdrawalPass } from './GameEngine.morale';

export function runInteractivePhaseAdvance(
  session: IGameSession,
  grid?: IHexGrid,
): IGameSession {
  let updatedSession = session;
  const { phase } = updatedSession.currentState;

  if (phase === GamePhase.Initiative) {
    updatedSession = rollInitiative(updatedSession);
    updatedSession = advancePhase(updatedSession);
    return updatedSession;
  }

  if (phase === GamePhase.Movement) {
    for (const unitId of Object.keys(updatedSession.currentState.units)) {
      const u = updatedSession.currentState.units[unitId];
      if (
        u.lockState !== LockState.Locked &&
        u.lockState !== LockState.Resolved
      ) {
        updatedSession = lockMovement(updatedSession, unitId);
      }
    }
    updatedSession = runEngineMoraleAndWithdrawalPass(updatedSession);
    updatedSession = advancePhase(updatedSession);
    return updatedSession;
  }

  if (phase === GamePhase.WeaponAttack) {
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
    // Queue damage-driven PSRs after weapon damage is final.
    updatedSession = checkAndQueueDamagePSRs(updatedSession);
    updatedSession = runEngineMoraleAndWithdrawalPass(updatedSession);
    updatedSession = advancePhase(updatedSession);
    return updatedSession;
  }

  if (phase === GamePhase.PhysicalAttack) {
    // Queue physical-attack PSRs before the phase advances.
    updatedSession = checkAndQueueDamagePSRs(updatedSession);
    updatedSession = runEngineMoraleAndWithdrawalPass(updatedSession);
    updatedSession = advancePhase(updatedSession);
    return updatedSession;
  }

  if (phase === GamePhase.Heat) {
    // Thread terrain water/environment heat when a grid is available.
    const heatOptions =
      grid !== undefined
        ? {
            getWaterDepth: (
              unitId: string,
              _position: import('@/types/gameplay').IHexCoordinate,
            ) => {
              const unit = updatedSession.currentState.units[unitId];
              return unit ? waterDepthAtPosition(grid, unit.position) : 0;
            },
            getEnvironmentHeatEffect: (
              unitId: string,
              _position: import('@/types/gameplay').IHexCoordinate,
            ) => {
              const unit = updatedSession.currentState.units[unitId];
              return unit ? getGridTerrainHeatEffect(grid, unit.position) : 0;
            },
          }
        : undefined;
    updatedSession = resolveHeatPhase(updatedSession, undefined, heatOptions);
    updatedSession = runEngineMoraleAndWithdrawalPass(updatedSession);
    updatedSession = advancePhase(updatedSession);
    return updatedSession;
  }

  if (phase === GamePhase.End) {
    // Drain pending PSRs at end of turn.
    updatedSession = resolvePendingPSRs(updatedSession);
    updatedSession = runEngineMoraleAndWithdrawalPass(updatedSession);
    updatedSession = advancePhase(updatedSession);
    return updatedSession;
  }

  return updatedSession;
}

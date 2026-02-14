import { IHexCoordinate } from '@/types/gameplay';

import { calculateECCMCountering } from './countering';
import {
  getEnemyECMSources,
  getFriendlyECCMSources,
  getFriendlyECMSources,
} from './ecmSources';
import { canBAPCounterECM } from './probes';
import { IECMStatus, IElectronicWarfareState } from './types';

export function resolveECMStatus(
  position: IHexCoordinate,
  teamId: string,
  entityId: string,
  ewState: IElectronicWarfareState,
): IECMStatus {
  const friendlyECMs = getFriendlyECMSources(position, teamId, ewState);
  const enemyECMs = getEnemyECMSources(position, teamId, ewState);
  const friendlyECCMs = getFriendlyECCMSources(position, teamId, ewState);

  const { uncounteredEnemyECMs } = calculateECCMCountering(
    enemyECMs,
    friendlyECCMs,
  );

  const unitProbes = ewState.activeProbes.filter(
    (probe) => probe.entityId === entityId && probe.operational,
  );

  const bapCountered = new Set<string>();
  for (const probe of unitProbes) {
    for (const enemyECM of uncounteredEnemyECMs) {
      if (canBAPCounterECM(probe, enemyECM)) {
        bapCountered.add(enemyECM.entityId);
      }
    }
  }

  const finalUncountered = uncounteredEnemyECMs.filter(
    (ecm) => !bapCountered.has(ecm.entityId),
  );

  const ecmProtected = friendlyECMs.length > 0;
  const ecmDisrupted = finalUncountered.length > 0;
  const electronicsNullified = ecmDisrupted;

  return {
    ecmProtected,
    ecmDisrupted,
    electronicsNullified,
    friendlyECMSources: friendlyECMs.map((ecm) => ecm.entityId),
    enemyECMSources: finalUncountered.map((ecm) => ecm.entityId),
    eccmSources: friendlyECCMs.map((ecm) => ecm.entityId),
    bapCounterSources: unitProbes
      .filter((probe) =>
        uncounteredEnemyECMs.some((ecm) => canBAPCounterECM(probe, ecm)),
      )
      .map((probe) => probe.entityId),
  };
}

export function areElectronicsNullified(
  targetPosition: IHexCoordinate,
  attackerTeamId: string,
  targetEntityId: string,
  ewState: IElectronicWarfareState,
): boolean {
  const status = resolveECMStatus(
    targetPosition,
    attackerTeamId,
    targetEntityId,
    ewState,
  );

  return status.ecmProtected;
}

export function isAttackECMProtected(
  attackerPosition: IHexCoordinate,
  attackerTeamId: string,
  attackerEntityId: string,
  targetPosition: IHexCoordinate,
  targetTeamId: string,
  _targetEntityId: string,
  ewState: IElectronicWarfareState,
): boolean {
  const targetFriendlyECMs = getFriendlyECMSources(
    targetPosition,
    targetTeamId,
    ewState,
  );

  if (targetFriendlyECMs.length === 0) {
    return false;
  }

  const attackerECCMs = getFriendlyECCMSources(
    attackerPosition,
    attackerTeamId,
    ewState,
  );

  const { uncounteredEnemyECMs } = calculateECCMCountering(
    targetFriendlyECMs,
    attackerECCMs,
  );

  if (uncounteredEnemyECMs.length === 0) {
    return false;
  }

  const attackerProbes = ewState.activeProbes.filter(
    (probe) => probe.entityId === attackerEntityId && probe.operational,
  );

  for (const enemyECM of uncounteredEnemyECMs) {
    let countered = false;
    for (const probe of attackerProbes) {
      if (canBAPCounterECM(probe, enemyECM)) {
        countered = true;
        break;
      }
    }

    if (!countered) {
      return true;
    }
  }

  return false;
}

export function getECMProtectedFlag(
  attackerPosition: IHexCoordinate,
  attackerTeamId: string,
  attackerEntityId: string,
  targetPosition: IHexCoordinate,
  targetTeamId: string,
  targetEntityId: string,
  ewState: IElectronicWarfareState,
): boolean {
  return isAttackECMProtected(
    attackerPosition,
    attackerTeamId,
    attackerEntityId,
    targetPosition,
    targetTeamId,
    targetEntityId,
    ewState,
  );
}

export function resolveC3ECMDisruption(
  members: readonly {
    readonly entityId: string;
    readonly teamId: string;
    readonly position: IHexCoordinate;
  }[],
  ewState: IElectronicWarfareState,
): ReadonlyMap<string, boolean> {
  const result = new Map<string, boolean>();

  for (const member of members) {
    const status = resolveECMStatus(
      member.position,
      member.teamId,
      member.entityId,
      ewState,
    );
    result.set(member.entityId, status.ecmDisrupted);
  }

  return result;
}

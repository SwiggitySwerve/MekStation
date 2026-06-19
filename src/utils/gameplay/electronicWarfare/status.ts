import type { IHexCoordinate } from '@/types/gameplay';

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

type AttackECMProtectionArgs = readonly [
  attackerPosition: IHexCoordinate,
  attackerTeamId: string,
  attackerEntityId: string,
  targetPosition: IHexCoordinate,
  targetTeamId: string,
  targetEntityId: string,
  ewState: IElectronicWarfareState,
];

interface IAttackECMProtectionContext {
  readonly attackerPosition: IHexCoordinate;
  readonly attackerTeamId: string;
  readonly attackerEntityId: string;
  readonly targetPosition: IHexCoordinate;
  readonly targetTeamId: string;
  readonly ewState: IElectronicWarfareState;
}

function toAttackECMProtectionContext(
  args: AttackECMProtectionArgs,
): IAttackECMProtectionContext {
  const [
    attackerPosition,
    attackerTeamId,
    attackerEntityId,
    targetPosition,
    targetTeamId,
    ,
    ewState,
  ] = args;

  return {
    attackerPosition,
    attackerTeamId,
    attackerEntityId,
    targetPosition,
    targetTeamId,
    ewState,
  };
}

function resolveAttackECMProtection(
  context: IAttackECMProtectionContext,
): boolean {
  const targetFriendlyECMs = getFriendlyECMSources(
    context.targetPosition,
    context.targetTeamId,
    context.ewState,
  );

  if (targetFriendlyECMs.length === 0) {
    return false;
  }

  const attackerECCMs = getFriendlyECCMSources(
    context.attackerPosition,
    context.attackerTeamId,
    context.ewState,
  );

  const { uncounteredEnemyECMs } = calculateECCMCountering(
    targetFriendlyECMs,
    attackerECCMs,
  );

  if (uncounteredEnemyECMs.length === 0) {
    return false;
  }

  const attackerProbes = context.ewState.activeProbes.filter(
    (probe) => probe.entityId === context.attackerEntityId && probe.operational,
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

export const isAttackECMProtected = (
  ...args: AttackECMProtectionArgs
): boolean => resolveAttackECMProtection(toAttackECMProtectionContext(args));

export const getECMProtectedFlag = (
  ...args: AttackECMProtectionArgs
): boolean => isAttackECMProtected(...args);

export function resolveC3ECMDisruption(
  members: readonly {
    readonly entityId: string;
    readonly teamId: string;
    readonly position: IHexCoordinate;
    readonly iNarcPods?: readonly {
      readonly teamId?: string;
      readonly podType: string;
    }[];
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
    const hasINarcECMPod =
      member.iNarcPods?.some((pod) => pod.podType === 'ecm') === true;
    result.set(member.entityId, status.ecmDisrupted || hasINarcECMPod);
  }

  return result;
}

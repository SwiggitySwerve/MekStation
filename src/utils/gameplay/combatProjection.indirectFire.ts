import type {
  IGameState,
  IHexCoordinate,
  IHexGrid,
  IndirectFireBasis,
  IUnitToken,
} from '@/types/gameplay';
import type { ILOSInterveningTerrainEffect } from '@/utils/gameplay/lineOfSight';

import { MovementType } from '@/types/gameplay';

import { isGroundToAirAerospaceAttack } from './aerospace/groundToAir';
import { isAirborneGameUnit } from './groundToGround';
import {
  isIndirectFireCapable,
  resolveIndirectFireWithSemiGuided,
  semiGuidedTagIndirectFireBlockedReason,
  type IAirborneAeroSpottingEquipment,
  type ISpotterCandidate,
} from './indirectFire';

export interface IIndirectFireProjection {
  readonly available: true;
  readonly spotterId: string | null;
  readonly basis: IndirectFireBasis;
  readonly toHitPenalty: number;
  readonly spotterAttackedThisTurn?: boolean;
  readonly forwardObserverApplied?: boolean;
  readonly commImplantApplied?: boolean;
  readonly penaltyCancelled?: number;
  readonly reason: string;
  readonly interveningTerrainEffects: readonly ILOSInterveningTerrainEffect[];
}

type AirborneAeroSpottingUnitState = IGameState['units'][string] & {
  readonly airborneAeroSpottingEquipment?: IAirborneAeroSpottingEquipment;
};

type BeaconUnitState = IGameState['units'][string] & {
  readonly narcMarkedByTeams?: readonly string[];
  readonly iNarcMarkedByTeams?: readonly string[];
  readonly ecmProtected?: boolean;
};

function getAirborneAeroSpottingEquipment(
  unit: IGameState['units'][string],
): IAirborneAeroSpottingEquipment | undefined {
  return (unit as AirborneAeroSpottingUnitState).airborneAeroSpottingEquipment;
}

function formatIndirectFireReason({
  basis,
  spotterId,
  toHitPenalty,
  spotterAttackedThisTurn,
  forwardObserverApplied,
  commImplantApplied,
}: {
  readonly basis: IndirectFireBasis;
  readonly spotterId?: string | null;
  readonly toHitPenalty: number;
  readonly spotterAttackedThisTurn?: boolean;
  readonly forwardObserverApplied?: boolean;
  readonly commImplantApplied?: boolean;
}): string {
  if (basis === 'los') {
    const details = [
      spotterAttackedThisTurn === true
        ? 'spotter attacked this turn adds +1'
        : undefined,
      forwardObserverApplied
        ? 'Forward Observer cancels walked spotter penalty'
        : undefined,
      commImplantApplied
        ? 'Comm Implant reduces indirect spotter penalty by 1'
        : undefined,
    ].filter((detail): detail is string => detail !== undefined);
    const reason = `Indirect fire via spotter ${spotterId ?? 'unknown'} (+${toHitPenalty})`;
    return details.length > 0 ? `${reason}; ${details.join('; ')}` : reason;
  }
  if (basis === 'semi-guided-tag') {
    return 'Semi-guided indirect fire via TAG (no indirect penalty)';
  }
  return `Indirect fire via ${basis.toUpperCase()} beacon (+${toHitPenalty})`;
}

function buildSpotterCandidates(
  combatState: IGameState,
): readonly ISpotterCandidate[] {
  return Object.entries(combatState.units).map(([unitId, unit]) => ({
    entityId: unitId,
    teamId: unit.side as string,
    position: unit.position,
    movementType: unit.movementThisTurn ?? MovementType.Stationary,
    isInfantry:
      unit.combatState?.kind === 'platoon' ||
      unit.combatState?.kind === 'squad',
    isOperational: !unit.destroyed && !unit.shutdown && !unit.hasRetreated,
    isAirborneAerospace: isAirborneGameUnit(unit),
    airborneAeroSpottingEquipment: getAirborneAeroSpottingEquipment(unit),
    pilotSpas: unit.pilotSpas ?? unit.abilities,
    attackedThisTurn: (unit.weaponsFiredThisTurn?.length ?? 0) > 0,
  }));
}

function targetIndirectStatus(
  combatState: IGameState,
  targetUnitId: string | undefined,
): {
  readonly narcMarkedByTeams: readonly string[];
  readonly inarcMarkedByTeams: readonly string[];
  readonly tagDesignated: boolean;
  readonly ecmProtected: boolean;
} {
  if (!targetUnitId) {
    return {
      narcMarkedByTeams: [],
      inarcMarkedByTeams: [],
      tagDesignated: false,
      ecmProtected: false,
    };
  }
  const targetUnit = combatState.units[targetUnitId] as
    | BeaconUnitState
    | undefined;
  return {
    narcMarkedByTeams: targetUnit?.narcMarkedByTeams ?? [],
    inarcMarkedByTeams: targetUnit?.iNarcMarkedByTeams ?? [],
    tagDesignated: targetUnit?.tagDesignated === true,
    ecmProtected: targetUnit?.ecmProtected === true,
  };
}

export function deriveIndirectFireProjection({
  attacker,
  combatState,
  targetHex,
  targetUnitId,
  weaponIdsAvailable,
  directLosBlocked,
  grid,
}: {
  readonly attacker: IUnitToken;
  readonly combatState?: IGameState | null;
  readonly targetHex: IHexCoordinate;
  readonly targetUnitId?: string;
  readonly weaponIdsAvailable: readonly string[];
  readonly directLosBlocked: boolean;
  readonly grid: IHexGrid;
}): IIndirectFireProjection | undefined {
  if (!directLosBlocked || !combatState) return undefined;

  const attackerUnit = combatState.units[attacker.unitId];
  if (!attackerUnit) return undefined;
  const targetUnit = targetUnitId ? combatState.units[targetUnitId] : undefined;
  if (targetUnit && isGroundToAirAerospaceAttack(attackerUnit, targetUnit)) {
    return undefined;
  }

  const indirectWeaponId = weaponIdsAvailable.find(isIndirectFireCapable);
  if (!indirectWeaponId) return undefined;

  const attackerTeamId = attackerUnit.side as string;
  const targetStatus = targetIndirectStatus(combatState, targetUnitId);
  const result = resolveIndirectFireWithSemiGuided(
    {
      attackerEntityId: attacker.unitId,
      attackerTeamId,
      attackerPosition: attackerUnit.position,
      targetPosition: targetHex,
      weaponId: indirectWeaponId,
      attackerHasLOS: false,
      attackerAirborne: isAirborneGameUnit(attackerUnit),
      attackerPilotSpas: attackerUnit.pilotSpas ?? attackerUnit.abilities,
      spotterCandidates: buildSpotterCandidates(combatState),
      grid,
      targetNarcMarkedByTeam:
        targetStatus.narcMarkedByTeams.includes(attackerTeamId),
      targetINarcMarkedByTeam:
        targetStatus.inarcMarkedByTeams.includes(attackerTeamId),
    },
    {
      weaponId: indirectWeaponId,
      equipment: { isSemiGuided: false },
      targetStatus: {
        tagDesignated: targetStatus.tagDesignated,
        ecmProtected: targetStatus.ecmProtected,
      },
    },
  );

  if (!result.permitted || !result.isIndirect || !result.basis) {
    return undefined;
  }

  const spotterId = result.spotter?.entityId ?? null;
  return {
    available: true,
    spotterId,
    basis: result.basis,
    toHitPenalty: result.toHitPenalty,
    spotterAttackedThisTurn: result.spotterAttackedThisTurn,
    forwardObserverApplied: result.forwardObserverApplied,
    commImplantApplied: result.commImplantApplied,
    penaltyCancelled: result.spotterMovementPenaltyCancelled,
    interveningTerrainEffects:
      result.spotterLOS?.interveningTerrainEffects ?? [],
    reason: formatIndirectFireReason({
      basis: result.basis,
      spotterId,
      toHitPenalty: result.toHitPenalty,
      spotterAttackedThisTurn: result.spotterAttackedThisTurn,
      forwardObserverApplied: result.forwardObserverApplied,
      commImplantApplied: result.commImplantApplied,
    }),
  };
}

export function deriveIndirectFireUnavailableReason({
  combatState,
  targetUnitId,
  weaponIdsAvailable,
}: {
  readonly combatState?: IGameState | null;
  readonly targetUnitId?: string;
  readonly weaponIdsAvailable: readonly string[];
}): string | undefined {
  if (!combatState) return undefined;
  const indirectWeaponId = weaponIdsAvailable.find(isIndirectFireCapable);
  if (!indirectWeaponId) return undefined;

  const targetStatus = targetIndirectStatus(combatState, targetUnitId);
  return semiGuidedTagIndirectFireBlockedReason({
    weaponId: indirectWeaponId,
    equipment: { isSemiGuided: false },
    targetStatus: {
      tagDesignated: targetStatus.tagDesignated,
      ecmProtected: targetStatus.ecmProtected,
    },
  });
}

import type {
  IGameState,
  IHexCoordinate,
  IHexGrid,
  IndirectFireBasis,
  IToHitModifier,
  IToHitModifierDetail,
  IUnitToken,
  IWeaponStatus,
} from '@/types/gameplay';
import type { ILOSInterveningTerrainEffect } from '@/utils/gameplay/lineOfSight';

import { DEFAULT_GUNNERY } from '@/constants/PilotConstants';
import { MovementType, RangeBracket } from '@/types/gameplay';

import { isRepresentedTargetImmobile } from './combatImmobility';
import { minimumRangeForWeapons } from './combatProjection.targeting';
import {
  isAirborneGameUnit,
  isGroundToGroundGameAttack,
} from './groundToGround';
import {
  isIndirectFireCapable,
  resolveIndirectFireWithSemiGuided,
  type IAirborneAeroSpottingEquipment,
  type ISpotterCandidate,
} from './indirectFire';
import { calculateToHit } from './toHit/calculate';
import { calculateInterveningTerrainModifier } from './toHit/environmentModifiers';

type AirborneAeroSpottingUnitState = IGameState['units'][string] & {
  readonly airborneAeroSpottingEquipment?: IAirborneAeroSpottingEquipment;
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
}: {
  readonly basis: IndirectFireBasis;
  readonly spotterId?: string | null;
  readonly toHitPenalty: number;
}): string {
  if (basis === 'los') {
    return `Indirect fire via spotter ${spotterId ?? 'unknown'} (+${toHitPenalty})`;
  }
  if (basis === 'semi-guided-tag') {
    return 'Semi-guided indirect fire via TAG (no indirect penalty)';
  }
  return `Indirect fire via ${basis.toUpperCase()} beacon (+${toHitPenalty})`;
}

function formatToHitReason(
  toHitNumber: number,
  modifiers: readonly IToHitModifier[],
): string {
  return `To-hit ${toHitNumber}: ${modifiers
    .map(
      (modifier) =>
        `${modifier.name} ${modifier.value >= 0 ? '+' : ''}${modifier.value}`,
    )
    .join(', ')}`;
}

export function deriveToHitProjection({
  attacker,
  targetUnitId,
  combatState,
  rangeBracket,
  distance,
  weapons,
  targetPartialCover,
  targetTerrainModifier,
  interveningTerrainEffects = [],
  indirectFire,
}: {
  readonly attacker: IUnitToken;
  readonly targetUnitId?: string;
  readonly combatState?: IGameState | null;
  readonly rangeBracket: RangeBracket;
  readonly distance: number;
  readonly weapons: readonly IWeaponStatus[];
  readonly targetPartialCover: boolean;
  readonly targetTerrainModifier?: IToHitModifierDetail | null;
  readonly interveningTerrainEffects?: readonly ILOSInterveningTerrainEffect[];
  readonly indirectFire?: ReturnType<typeof deriveIndirectFireProjection>;
}):
  | {
      readonly toHitNumber: number;
      readonly toHitModifiers: readonly IToHitModifier[];
      readonly toHitReason: string;
    }
  | undefined {
  if (!combatState || !targetUnitId || weapons.length === 0) return undefined;
  if (rangeBracket === RangeBracket.OutOfRange || distance === 0) {
    return undefined;
  }

  const attackerUnit = combatState.units[attacker.unitId];
  const targetUnit = combatState.units[targetUnitId];
  if (!attackerUnit || !targetUnit) return undefined;
  const interveningTerrainModifier = calculateInterveningTerrainModifier(
    interveningTerrainEffects,
  );
  const terrainModifiers = [
    interveningTerrainModifier,
    targetTerrainModifier,
  ].filter(
    (modifier): modifier is IToHitModifierDetail =>
      modifier !== null && modifier !== undefined,
  );

  const toHitCalc = calculateToHit(
    {
      gunnery: attackerUnit.gunnery ?? DEFAULT_GUNNERY,
      movementType: attackerUnit.movementThisTurn ?? MovementType.Stationary,
      heat: attackerUnit.heat ?? 0,
      damageModifiers: terrainModifiers,
      prone: attackerUnit.prone ?? false,
    },
    {
      movementType: targetUnit.movementThisTurn ?? MovementType.Stationary,
      hexesMoved: targetUnit.hexesMovedThisTurn ?? 0,
      prone: targetUnit.prone ?? false,
      immobile: isRepresentedTargetImmobile(targetUnit),
      partialCover: targetPartialCover,
    },
    rangeBracket,
    distance,
    minimumRangeForWeapons(
      weapons,
      distance,
      isGroundToGroundGameAttack(attackerUnit, targetUnit),
    ),
  );
  const modifiers: IToHitModifier[] = toHitCalc.modifiers.map((modifier) => ({
    name: modifier.name,
    value: modifier.value,
    source: modifier.source,
  }));
  let toHitNumber = toHitCalc.finalToHit;

  if (indirectFire?.available === true && indirectFire.toHitPenalty > 0) {
    modifiers.push({
      name: 'Indirect fire',
      value: indirectFire.toHitPenalty,
      source: 'other',
    });
    toHitNumber += indirectFire.toHitPenalty;
  }

  return {
    toHitNumber,
    toHitModifiers: modifiers,
    toHitReason: formatToHitReason(toHitNumber, modifiers),
  };
}

function buildSpotterCandidates(
  combatState: IGameState,
): readonly ISpotterCandidate[] {
  return Object.entries(combatState.units).map(([unitId, unit]) => ({
    entityId: unitId,
    teamId: unit.side as string,
    position: unit.position,
    movementType: unit.movementThisTurn ?? MovementType.Stationary,
    isOperational: !unit.destroyed && !unit.shutdown && !unit.hasRetreated,
    isAirborneAerospace: isAirborneGameUnit(unit),
    airborneAeroSpottingEquipment: getAirborneAeroSpottingEquipment(unit),
    spotterGunnery: unit.gunnery,
  }));
}

type BeaconUnitState = IGameState['units'][string] & {
  readonly narcMarkedByTeams?: readonly string[];
  readonly iNarcMarkedByTeams?: readonly string[];
  readonly ecmProtected?: boolean;
};

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
  losTokens,
}: {
  readonly attacker: IUnitToken;
  readonly combatState?: IGameState | null;
  readonly targetHex: IHexCoordinate;
  readonly targetUnitId?: string;
  readonly weaponIdsAvailable: readonly string[];
  readonly directLosBlocked: boolean;
  readonly grid: IHexGrid;
  readonly losTokens: readonly IUnitToken[];
}):
  | {
      readonly available: true;
      readonly spotterId: string | null;
      readonly basis: IndirectFireBasis;
      readonly toHitPenalty: number;
      readonly reason: string;
      readonly interveningTerrainEffects: readonly ILOSInterveningTerrainEffect[];
    }
  | undefined {
  if (!directLosBlocked || !combatState) return undefined;

  const attackerUnit = combatState.units[attacker.unitId];
  if (!attackerUnit) return undefined;

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
      spotterCandidates: buildSpotterCandidates(combatState),
      grid,
      losTokens,
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
    interveningTerrainEffects:
      result.spotterLOS?.interveningTerrainEffects ?? [],
    reason: formatIndirectFireReason({
      basis: result.basis,
      spotterId,
      toHitPenalty: result.toHitPenalty,
    }),
  };
}

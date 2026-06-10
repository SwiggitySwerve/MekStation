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

import {
  calculateGroundToAirAltitudeModifier,
  isGroundToAirAerospaceAttack,
} from './aerospace/groundToAir';
import { minimumRangeForWeapons } from './combatProjection.targeting';
import {
  isAirborneGameUnit,
  isGroundToGroundGameAttack,
} from './groundToGround';
import {
  isIndirectFireCapable,
  resolveIndirectFireWithSemiGuided,
  semiGuidedTagIndirectFireBlockedReason,
  type IAirborneAeroSpottingEquipment,
  type ISpotterCandidate,
} from './indirectFire';
import { calculateToHitWithC3, selectC3RangeBracket } from './toHit/c3';
import { calculateToHit } from './toHit/calculate';
import { calculateInterveningTerrainModifier } from './toHit/environmentModifiers';
import {
  buildWeaponAttackAttackerToHitState,
  buildWeaponAttackTargetToHitState,
} from './toHit/stateHydration';
import { deriveVehicleToHitContext } from './vehicleToHitContext';

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
  spotterAttackedThisTurn,
  forwardObserverApplied,
}: {
  readonly basis: IndirectFireBasis;
  readonly spotterId?: string | null;
  readonly toHitPenalty: number;
  readonly spotterAttackedThisTurn?: boolean;
  readonly forwardObserverApplied?: boolean;
}): string {
  if (basis === 'los') {
    const details = [
      // Audit C-5: the spotter detail is the +1 spotter-attacking modifier
      // (MegaMek ComputeToHit.java L1540-1544); the pre-fix spotter-gunnery
      // detail described an artillery-only rule misapplied to LRMs.
      spotterAttackedThisTurn === true
        ? 'spotter attacked this turn adds +1'
        : undefined,
      forwardObserverApplied
        ? 'Forward Observer cancels walked spotter penalty'
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
      readonly rangeBracket: RangeBracket;
      readonly toHitNumber: number;
      readonly toHitModifiers: readonly IToHitModifier[];
      readonly toHitReason: string;
      readonly c3BenefitApplied?: boolean;
      readonly c3SpotterId?: string | null;
      readonly c3SpotterRange?: number | null;
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
  const groundToAirAltitudeModifier = calculateGroundToAirAltitudeModifier(
    attackerUnit,
    targetUnit,
  );
  const attackContextModifiers = [
    interveningTerrainModifier,
    targetTerrainModifier,
    groundToAirAltitudeModifier,
  ].filter(
    (modifier): modifier is IToHitModifierDetail =>
      modifier !== null && modifier !== undefined,
  );

  // Audit B-1 (W1.1): hydrate attacker/target to-hit state through the SAME
  // builders the engine commit path uses (declareAttack in gameSessionCore and
  // the simulation runner both call them). Hand-building the state here is
  // what dropped pilot wounds, sensor hits, actuator damage, SPAs, quirks,
  // and target evasion/sprint/dodge from the preview — and, because the
  // interactive commit path stamps the projection's number onto the
  // AttackDeclared payload, from resolution too. Projection-only context
  // (intervening terrain, target-hex terrain, ground-to-air altitude, vehicle
  // turret context) merges INTO the hydrated state rather than replacing it.
  const primaryWeapon = weapons[0];
  const attackerState = {
    ...buildWeaponAttackAttackerToHitState(
      attackerUnit,
      attackerUnit.gunnery ?? DEFAULT_GUNNERY,
      primaryWeapon
        ? { id: primaryWeapon.id, name: primaryWeapon.name }
        : undefined,
      targetUnitId,
      undefined,
      // Audit B-5 (W1.2): named called-shot options shared with declareAttack;
      // the local ability reduction stays on its default (true) on BOTH paths.
      {
        calledShot: weapons.some((weapon) => weapon.calledShot === true),
        teammateCalledShot: weapons.some(
          (weapon) => weapon.teammateCalledShot === true,
        ),
      },
    ),
    damageModifiers: attackContextModifiers,
    ...deriveVehicleToHitContext(attackerUnit, weapons),
  };
  const targetState = buildWeaponAttackTargetToHitState(
    targetUnit,
    targetPartialCover,
  );
  const minimumRange = minimumRangeForWeapons(
    weapons,
    distance,
    isGroundToGroundGameAttack(attackerUnit, targetUnit),
  );
  const weaponRangeProfiles = weapons.map((weapon) => ({
    short: weapon.ranges.short,
    medium: weapon.ranges.medium,
    long: weapon.ranges.long,
    extreme: weapon.ranges.extreme,
    minimum: weapon.ranges.minimum,
  }));
  const c3State = combatState.c3State;
  const c3Selection =
    indirectFire?.available === true || !c3State
      ? undefined
      : selectC3RangeBracket({
          attackerEntityId: attacker.unitId,
          targetPosition: targetUnit.position,
          weaponRangeProfiles,
          directRangeBracket: rangeBracket,
          c3State,
        });
  const c3WeaponRangeProfile =
    c3Selection !== undefined
      ? weaponRangeProfiles[c3Selection.weaponIndex]
      : undefined;
  let c3Result: ReturnType<typeof calculateToHitWithC3>['c3Result'] | undefined;
  const toHitCalc =
    c3Selection !== undefined && c3WeaponRangeProfile !== undefined && c3State
      ? (() => {
          const c3ToHit = calculateToHitWithC3(
            attackerState,
            targetState,
            rangeBracket,
            distance,
            {
              attackerEntityId: attacker.unitId,
              targetPosition: targetUnit.position,
              weaponRangeProfile: c3WeaponRangeProfile,
              c3State,
            },
            minimumRange,
            // Weapon id keeps weapon-quirk modifiers (Accurate/Inaccurate/
            // Stable) in agreement with the engine, which passes the primary
            // weapon id into calculateToHit (gameSessionCore declareAttack).
            primaryWeapon?.id,
          );
          c3Result = c3ToHit.c3Result.benefitApplied
            ? c3ToHit.c3Result
            : undefined;
          return c3ToHit;
        })()
      : calculateToHit(
          attackerState,
          targetState,
          rangeBracket,
          distance,
          minimumRange,
          // Weapon id keeps weapon-quirk modifiers in agreement with the
          // engine commit path (see declareAttack in gameSessionCore).
          primaryWeapon?.id,
        );
  const modifiers: IToHitModifier[] = toHitCalc.modifiers.map((modifier) => ({
    name: modifier.name,
    value: modifier.value,
    source: modifier.source,
    description: modifier.description,
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
    rangeBracket: c3Result?.bestBracket ?? rangeBracket,
    toHitNumber,
    toHitModifiers: modifiers,
    toHitReason: formatToHitReason(toHitNumber, modifiers),
    c3BenefitApplied: c3Result?.benefitApplied,
    c3SpotterId: c3Result?.spotterId,
    c3SpotterRange: c3Result?.spotterRange,
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
    isInfantry:
      unit.combatState?.kind === 'platoon' ||
      unit.combatState?.kind === 'squad',
    isOperational: !unit.destroyed && !unit.shutdown && !unit.hasRetreated,
    isAirborneAerospace: isAirborneGameUnit(unit),
    airborneAeroSpottingEquipment: getAirborneAeroSpottingEquipment(unit),
    pilotSpas: unit.pilotSpas ?? unit.abilities,
    // Audit C-5: the projection mirrors the engine's spotter-attacked signal
    // (per-turn weaponsFiredThisTurn state) so preview and commit paths agree
    // on the +1 spotter-attacking modifier (ComputeToHit.java L1540-1544).
    attackedThisTurn: (unit.weaponsFiredThisTurn?.length ?? 0) > 0,
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
}: {
  readonly attacker: IUnitToken;
  readonly combatState?: IGameState | null;
  readonly targetHex: IHexCoordinate;
  readonly targetUnitId?: string;
  readonly weaponIdsAvailable: readonly string[];
  readonly directLosBlocked: boolean;
  readonly grid: IHexGrid;
}):
  | {
      readonly available: true;
      readonly spotterId: string | null;
      readonly basis: IndirectFireBasis;
      readonly toHitPenalty: number;
      readonly spotterAttackedThisTurn?: boolean;
      readonly forwardObserverApplied?: boolean;
      readonly penaltyCancelled?: number;
      readonly reason: string;
      readonly interveningTerrainEffects: readonly ILOSInterveningTerrainEffect[];
    }
  | undefined {
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
    penaltyCancelled: result.spotterMovementPenaltyCancelled,
    interveningTerrainEffects:
      result.spotterLOS?.interveningTerrainEffects ?? [],
    reason: formatIndirectFireReason({
      basis: result.basis,
      spotterId,
      toHitPenalty: result.toHitPenalty,
      spotterAttackedThisTurn: result.spotterAttackedThisTurn,
      forwardObserverApplied: result.forwardObserverApplied,
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
